'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import Modal from '@/components/Modal';
import { createTopic, deleteTopic, fetchTopics, importTopic, renameTopic } from '@/lib/api';
import { slugifyTopicLabel } from '@/lib/quizUtils';
import { useToast } from '@/lib/useToast';

function labelFromFileName(fileName) {
  const base = fileName.replace(/\.json$/i, '');
  return base
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function TopicsPage() {
  const { message, showToast } = useToast();
  const [topics, setTopics] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [fileInput, setFileInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importLabel, setImportLabel] = useState('');
  const [importing, setImporting] = useState(false);

  async function loadTopics() {
    try {
      const data = await fetchTopics();
      setTopics(data);
    } catch (error) {
      setTopics([]);
      showToast('Unable to load topics.');
    }
  }

  useEffect(() => {
    loadTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(topicName) {
    const confirmed = window.confirm(`Delete the "${topicName}" topic and its question file?`);
    if (!confirmed) return;

    try {
      await deleteTopic(topicName);
      showToast('Topic deleted.');
      loadTopics();
    } catch (error) {
      showToast(error.message || 'Unable to delete topic.');
    }
  }

  async function handleRename(topicName) {
    const currentLabel = topicName.replace(/_/g, ' ');
    const newLabel = window.prompt('Rename topic to:', currentLabel);
    if (newLabel === null) return;

    const trimmedLabel = newLabel.trim();
    if (!trimmedLabel) {
      showToast('Topic name cannot be empty.');
      return;
    }

    const suggestedFile = `${slugifyTopicLabel(trimmedLabel)}.json`;
    const fileNameInput = window.prompt('New JSON file name (optional):', suggestedFile);
    const finalFileName = (fileNameInput || '').trim();

    try {
      await renameTopic(topicName, { newName: trimmedLabel, fileName: finalFileName || suggestedFile });
      showToast('Topic renamed.');
      loadTopics();
    } catch (error) {
      showToast(error.message || 'Unable to rename topic.');
    }
  }

  async function handleCreateSubmit(event) {
    event.preventDefault();
    const name = nameInput.trim();
    const fileName = fileInput.trim();

    if (!name || !fileName) {
      showToast('Topic name and file name are required.');
      return;
    }

    try {
      await createTopic({ name, fileName });
      setModalOpen(false);
      setNameInput('');
      setFileInput('');
      showToast('Topic created.');
      loadTopics();
    } catch (error) {
      showToast(error.message || 'Unable to create topic.');
    }
  }

  function readTopicFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) {
      showToast('Please drop a .json file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch (error) {
        showToast('That file is not valid JSON.');
        return;
      }

      if (!Array.isArray(parsed) || !parsed.length) {
        showToast('The file must contain a non-empty array of questions.');
        return;
      }

      setImportPreview(parsed);
      setImportLabel(labelFromFileName(file.name));
    };
    reader.onerror = () => showToast('Unable to read the file.');
    reader.readAsText(file);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragOver(false);
    readTopicFile(event.dataTransfer.files?.[0]);
  }

  function handleFilePick(event) {
    readTopicFile(event.target.files?.[0]);
    event.target.value = '';
  }

  function cancelImport() {
    setImportPreview(null);
    setImportLabel('');
  }

  async function confirmImport() {
    const label = importLabel.trim();
    if (!label) {
      showToast('Topic name is required.');
      return;
    }

    setImporting(true);
    try {
      const result = await importTopic({ name: label, questions: importPreview });
      showToast(result.message || `Imported ${result.count} questions.`);
      cancelImport();
      loadTopics();
    } catch (error) {
      showToast(error.message || 'Unable to import topic.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <AppShell
      title="Topics"
      actions={
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          + Add Topic
        </button>
      }
    >
      <section className="content-card">
        <div className="section-header">
          <h3>Import Topic from JSON</h3>
        </div>
        <label
          className={`dropzone${isDragOver ? ' dragover' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <input type="file" accept=".json,application/json" onChange={handleFilePick} hidden />
          <span>Drag &amp; drop a topic .json file here, or click to browse</span>
          <small>Saved to a JSON file, and mirrored into MongoDB automatically when it's connected.</small>
        </label>
      </section>

      <section className="content-card">
        <div className="topic-list">
          {topics === null ? null : topics.length === 0 ? (
            <div className="empty-state">No topics available yet.</div>
          ) : (
            topics.map((topic) => (
              <div className="topic-card" key={topic.name}>
                <div className="topic-card-body">
                  <span>{topic.label}</span>
                  <div className="topic-actions">
                    <button type="button" className="table-action" onClick={() => handleRename(topic.name)}>
                      Rename
                    </button>
                    <button type="button" className="table-action delete" onClick={() => handleDelete(topic.name)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <Modal open={modalOpen}>
        <h3>Create Topic</h3>
        <form onSubmit={handleCreateSubmit}>
          <div className="field-group">
            <label>Topic Name</label>
            <input
              type="text"
              placeholder="Geography"
              required
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
            />
          </div>
          <div className="field-group">
            <label>JSON File</label>
            <input
              type="text"
              placeholder="geography.json"
              required
              value={fileInput}
              onChange={(event) => setFileInput(event.target.value)}
            />
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setModalOpen(false);
                setNameInput('');
                setFileInput('');
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Topic
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(importPreview)}>
        <h3>Import Topic</h3>
        <p>{importPreview?.length || 0} questions found in the file.</p>
        <div className="field-group">
          <label>Topic Name</label>
          <input
            type="text"
            placeholder="Geography"
            value={importLabel}
            onChange={(event) => setImportLabel(event.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={cancelImport} disabled={importing}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={confirmImport} disabled={importing}>
            {importing ? 'Importing...' : 'Import to MongoDB'}
          </button>
        </div>
      </Modal>

      <div className={`toast${message ? ' show' : ''}`}>{message}</div>
    </AppShell>
  );
}
