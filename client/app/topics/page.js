'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import Modal from '@/components/Modal';
import { createTopic, deleteTopic, fetchTopics, renameTopic } from '@/lib/api';
import { slugifyTopicLabel } from '@/lib/quizUtils';
import { useToast } from '@/lib/useToast';

export default function TopicsPage() {
  const { message, showToast } = useToast();
  const [topics, setTopics] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [fileInput, setFileInput] = useState('');

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

      <div className={`toast${message ? ' show' : ''}`}>{message}</div>
    </AppShell>
  );
}
