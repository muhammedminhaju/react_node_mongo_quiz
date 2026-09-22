'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import Modal from '@/components/Modal';
import { createQuestion, deleteQuestion, fetchQuestions, fetchTopics, importQuestions, updateQuestion } from '@/lib/api';
import { useToast } from '@/lib/useToast';

const emptyForm = { question: '', optionA: '', optionB: '', optionC: '', optionD: '', explanation: '', answer: '' };
const OPTION_LABELS = ['Option A', 'Option B', 'Option C', 'Option D'];

function buildAnswerOptions(form) {
  const chosen = [form.optionA, form.optionB, form.optionC, form.optionD].filter((value) => value.trim());
  return OPTION_LABELS.map((label, index) => {
    const value = chosen[index] || label;
    return { value, text: `${label}: ${value || '(empty)'}` };
  });
}

export default function QuestionsPage() {
  const { message, showToast } = useToast();
  const [topics, setTopics] = useState([]);
  const [topicFilter, setTopicFilter] = useState('');
  const [rows, setRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [currentEditId, setCurrentEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formTopic, setFormTopic] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchTopics();
        setTopics(data);
        if (data.length) {
          setTopicFilter(data[0].name);
          setFormTopic(data[0].name);
        }
      } catch (error) {
        showToast('Unable to load topic data.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!topicFilter) {
      setRows([]);
      return;
    }
    fetchQuestions(topicFilter)
      .then(setRows)
      .catch(() => setRows([]));
  }, [topicFilter]);

  const filteredRows = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return rows;
    return rows.filter((question) => {
      const searchable = [String(question.id), question.question, ...(question.options || [])].join(' ').toLowerCase();
      return searchable.includes(term);
    });
  }, [rows, searchTerm]);

  const answerOptions = buildAnswerOptions(form);

  function openAddModal() {
    setModalMode('add');
    setCurrentEditId(null);
    setForm(emptyForm);
    setFormTopic(topicFilter);
    setModalOpen(true);
  }

  function openEditModal(question) {
    const options = question.options || [];
    setModalMode('edit');
    setCurrentEditId(question.id);
    setForm({
      question: question.question || '',
      optionA: options[0] || '',
      optionB: options[1] || '',
      optionC: options[2] || '',
      optionD: options[3] || '',
      explanation: question.explanation || '',
      answer: question.answer || options[0] || ''
    });
    setFormTopic(topicFilter);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setForm(emptyForm);
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const payload = {
      question: form.question.trim(),
      options: [form.optionA.trim(), form.optionB.trim(), form.optionC.trim(), form.optionD.trim()],
      answer: form.answer,
      explanation: form.explanation.trim()
    };

    if (!formTopic) {
      showToast('Please select a topic.');
      return;
    }
    if (!payload.question) {
      showToast('Question is required.');
      return;
    }
    if (payload.options.some((option) => !option)) {
      showToast('All options must be filled.');
      return;
    }
    if (new Set(payload.options).size !== 4) {
      showToast('Options must be unique.');
      return;
    }
    if (!payload.options.includes(payload.answer)) {
      showToast('Correct answer must match one of the options.');
      return;
    }

    try {
      if (currentEditId) {
        await updateQuestion(formTopic, currentEditId, payload);
        showToast('Question updated.');
      } else {
        await createQuestion(formTopic, payload);
        showToast('Question added.');
      }
      closeModal();
      const refreshed = await fetchQuestions(topicFilter);
      setRows(refreshed);
    } catch (error) {
      showToast(error.message || 'Unable to save question.');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteQuestion(deleteTarget.topic, deleteTarget.id);
      showToast('Question deleted.');
      setDeleteTarget(null);
      const refreshed = await fetchQuestions(topicFilter);
      setRows(refreshed);
    } catch (error) {
      showToast(error.message || 'Unable to delete question.');
    }
  }

  function readImportFile(file) {
    if (!file) return;
    if (!topicFilter) {
      showToast('Select a topic first.');
      return;
    }
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
    };
    reader.onerror = () => showToast('Unable to read the file.');
    reader.readAsText(file);
  }

  function handleImportDrop(event) {
    event.preventDefault();
    setIsDragOver(false);
    readImportFile(event.dataTransfer.files?.[0]);
  }

  function handleImportFilePick(event) {
    readImportFile(event.target.files?.[0]);
    event.target.value = '';
  }

  async function confirmImportAppend() {
    setImporting(true);
    try {
      const result = await importQuestions(topicFilter, importPreview);
      showToast(result.message || `Appended ${result.added} questions.`);
      setImportPreview(null);
      const refreshed = await fetchQuestions(topicFilter);
      setRows(refreshed);
    } catch (error) {
      showToast(error.message || 'Unable to import questions.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <AppShell
      title="Question Management"
      actions={
        <button className="btn btn-primary" onClick={openAddModal}>
          + Add Question
        </button>
      }
    >
      <section className="content-card">
        <div className="toolbar-row">
          <div className="field-group">
            <label htmlFor="topicFilter">Topic:</label>
            <select id="topicFilter" value={topicFilter} onChange={(event) => setTopicFilter(event.target.value)}>
              {topics.length === 0 ? (
                <option value="">No topics available</option>
              ) : (
                topics.map((topic) => (
                  <option key={topic.name} value={topic.name}>
                    {topic.label}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="field-group search-field">
            <label htmlFor="searchInput">Search:</label>
            <input
              id="searchInput"
              type="text"
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>

        <label
          className={`dropzone${isDragOver ? ' dragover' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleImportDrop}
        >
          <input type="file" accept=".json,application/json" onChange={handleImportFilePick} hidden />
          <span>Drag &amp; drop a .json file to append questions to this topic, or click to browse</span>
          <small>Saved to the JSON file, and mirrored into MongoDB automatically when it's connected.</small>
        </label>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Question</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((question) => (
                <tr key={question.id}>
                  <td>{question.id}</td>
                  <td>{question.question}</td>
                  <td>
                    <button className="table-action" onClick={() => openEditModal(question)}>
                      Edit
                    </button>
                    <button
                      className="table-action delete"
                      onClick={() => setDeleteTarget({ topic: topicFilter, id: question.id })}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={modalOpen} wide>
        <h3>{modalMode === 'add' ? 'Add Question' : 'Edit Question'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label>Topic</label>
            <select required value={formTopic} onChange={(event) => setFormTopic(event.target.value)}>
              {topics.map((topic) => (
                <option key={topic.name} value={topic.name}>
                  {topic.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label>Question</label>
            <textarea
              rows={3}
              required
              value={form.question}
              onChange={(event) => updateField('question', event.target.value)}
            />
          </div>

          <div className="form-grid">
            <div className="field-group">
              <label>Option A</label>
              <input required value={form.optionA} onChange={(event) => updateField('optionA', event.target.value)} />
            </div>
            <div className="field-group">
              <label>Option B</label>
              <input required value={form.optionB} onChange={(event) => updateField('optionB', event.target.value)} />
            </div>
            <div className="field-group">
              <label>Option C</label>
              <input required value={form.optionC} onChange={(event) => updateField('optionC', event.target.value)} />
            </div>
            <div className="field-group">
              <label>Option D</label>
              <input required value={form.optionD} onChange={(event) => updateField('optionD', event.target.value)} />
            </div>
          </div>

          <div className="field-group">
            <label>Correct Answer</label>
            <select value={form.answer} onChange={(event) => updateField('answer', event.target.value)}>
              {answerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.text}
                </option>
              ))}
            </select>
          </div>

          <div className="field-group">
            <label>Explanation</label>
            <textarea
              rows={3}
              value={form.explanation}
              onChange={(event) => updateField('explanation', event.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {modalMode === 'add' ? 'Save Question' : 'Update Question'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(deleteTarget)}>
        <h3>Delete Question?</h3>
        <p>Are you sure you want to permanently delete this question?</p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={confirmDelete}>
            Delete
          </button>
        </div>
      </Modal>

      <Modal open={Boolean(importPreview)}>
        <h3>Append Questions</h3>
        <p>
          {importPreview?.length || 0} questions found in the file. They will be appended to{' '}
          <strong>{topics.find((topic) => topic.name === topicFilter)?.label || topicFilter}</strong>.
        </p>
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setImportPreview(null)}
            disabled={importing}
          >
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={confirmImportAppend} disabled={importing}>
            {importing ? 'Importing...' : 'Append Questions'}
          </button>
        </div>
      </Modal>

      <div className={`toast${message ? ' show' : ''}`}>{message}</div>
    </AppShell>
  );
}
