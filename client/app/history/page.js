'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import Modal from '@/components/Modal';
import { getLocalHistory, setLocalHistory } from '@/lib/storage';
import { formatDuration } from '@/lib/quizUtils';
import { useToast } from '@/lib/useToast';

export default function HistoryPage() {
  const { message, showToast } = useToast();
  const [history, setHistory] = useState([]);
  const [detailEntry, setDetailEntry] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    setHistory(getLocalHistory());
  }, []);

  function persist(next) {
    setLocalHistory(next);
    setHistory(next);
  }

  function handleClearAll() {
    if (!history.length) {
      showToast('No history to clear.');
      return;
    }
    if (confirm('Are you sure you want to clear all history?')) {
      persist([]);
    }
  }

  function confirmDelete() {
    if (!deleteId) return;
    persist(history.filter((item) => item.id !== deleteId));
    setDeleteId(null);
  }

  return (
    <AppShell
      title="Quiz History"
      actions={
        <button className="btn btn-danger" onClick={handleClearAll}>
          Clear All History
        </button>
      }
    >
      <section className="content-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Topic</th>
              <th>Date</th>
              <th>Score</th>
              <th>Percentage</th>
              <th>Time Taken</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-state">
                  No quiz history yet.
                </td>
              </tr>
            ) : (
              history.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.topic}</td>
                  <td>{new Date(entry.date).toLocaleDateString()}</td>
                  <td>
                    {entry.correct}/{entry.totalQuestions}
                  </td>
                  <td>{entry.percentage}%</td>
                  <td>{formatDuration(entry.timeTakenSeconds)}</td>
                  <td>
                    <button className="table-action view" onClick={() => setDetailEntry(entry)}>
                      View
                    </button>
                    <button className="table-action delete" onClick={() => setDeleteId(entry.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <Modal open={Boolean(detailEntry)} wide>
        <h3>Quiz Result Details</h3>
        {detailEntry && (
          <div className="detail-box">
            <p>
              <strong>Topic:</strong> {detailEntry.topic}
            </p>
            <p>
              <strong>Date:</strong> {new Date(detailEntry.date).toLocaleString()}
            </p>
            <p>
              <strong>Score:</strong> {detailEntry.correct}/{detailEntry.totalQuestions}
            </p>
            <p>
              <strong>Percentage:</strong> {detailEntry.percentage}%
            </p>
            <p>
              <strong>Correct:</strong> {detailEntry.correct}
            </p>
            <p>
              <strong>Wrong:</strong> {detailEntry.wrong}
            </p>
            <p>
              <strong>Unanswered:</strong> {detailEntry.unanswered}
            </p>
            <p>
              <strong>Time Taken:</strong> {formatDuration(detailEntry.timeTakenSeconds)}
              {detailEntry.timerMinutes ? ` (limit: ${detailEntry.timerMinutes} min)` : ''}
            </p>
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setDetailEntry(null)}>
            Close
          </button>
        </div>
      </Modal>

      <Modal open={Boolean(deleteId)}>
        <h3>Delete Result?</h3>
        <p>Are you sure you want to delete this result?</p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={confirmDelete}>
            Delete
          </button>
        </div>
      </Modal>

      <div className={`toast${message ? ' show' : ''}`}>{message}</div>
    </AppShell>
  );
}
