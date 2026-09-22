'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import Modal from '@/components/Modal';
import { fetchTopics } from '@/lib/api';
import { getLocalHistory } from '@/lib/storage';
import { useToast } from '@/lib/useToast';

export default function DashboardPage() {
  const router = useRouter();
  const { message, showToast } = useToast();
  const [topics, setTopics] = useState([]);
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    totalAnswered: 0,
    average: 0,
    best: 0,
    uniqueTopics: 0
  });
  const [recent, setRecent] = useState([]);
  const [timerModalTopic, setTimerModalTopic] = useState(null);
  const [timerInput, setTimerInput] = useState('');

  useEffect(() => {
    fetchTopics()
      .then(setTopics)
      .catch((error) => showToast(error.message || 'Unable to load topics.'));

    const history = getLocalHistory();
    setRecent(history.slice(0, 4));

    const totalQuizzes = history.length;
    const totalAnswered = history.reduce((sum, item) => sum + Number(item.correct || 0) + Number(item.wrong || 0), 0);
    const average = totalQuizzes
      ? Math.round(history.reduce((sum, item) => sum + Number(item.percentage || 0), 0) / totalQuizzes)
      : 0;
    const best = history.length ? Math.max(...history.map((item) => Number(item.percentage || 0))) : 0;
    const uniqueTopics = new Set(history.map((item) => item.topic)).size;

    setStats({ totalQuizzes, totalAnswered, average, best, uniqueTopics });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTopicClick(topicName) {
    setTimerModalTopic(topicName);
    setTimerInput('');
  }

  function handleStartQuickQuiz() {
    const fallbackTopic = localStorage.getItem('selectedTopic') || 'history';
    setTimerModalTopic(fallbackTopic);
    setTimerInput('');
  }

  function closeTimerModal() {
    setTimerModalTopic(null);
    setTimerInput('');
  }

  function confirmStartQuiz() {
    const topicName = timerModalTopic;
    const trimmed = timerInput.trim();
    const minutes = trimmed ? Math.max(1, Math.round(Number(trimmed))) : null;

    localStorage.setItem('selectedTopic', topicName);
    localStorage.removeItem('quizTempState');
    if (minutes) {
      localStorage.setItem('quizTimerMinutes', String(minutes));
    } else {
      localStorage.removeItem('quizTimerMinutes');
    }

    router.push('/quiz');
  }

  const timerModalLabel = topics.find((topic) => topic.name === timerModalTopic)?.label || timerModalTopic;

  return (
    <AppShell
      title="Dashboard"
      actions={
        <button className="btn btn-primary" onClick={handleStartQuickQuiz}>
          Start Quiz
        </button>
      }
    >
      <section className="dashboard-grid">
        <div className="stat-card">
          <div className="label">Total Quizzes Taken</div>
          <div className="value">{stats.totalQuizzes}</div>
        </div>
        <div className="stat-card">
          <div className="label">Questions Answered</div>
          <div className="value">{stats.totalAnswered}</div>
        </div>
        <div className="stat-card">
          <div className="label">Average Score</div>
          <div className="value">{stats.average}%</div>
        </div>
        <div className="stat-card">
          <div className="label">Best Score</div>
          <div className="value">{stats.best}%</div>
        </div>
        <div className="stat-card">
          <div className="label">Topics Practiced</div>
          <div className="value">{stats.uniqueTopics}</div>
        </div>
      </section>

      <section className="content-card">
        <div className="section-header">
          <h3>Recent Attempts</h3>
        </div>
        <div>
          {recent.length === 0 ? (
            <div className="empty-state">No quiz attempts yet.</div>
          ) : (
            recent.map((item) => (
              <div className="attempt-row" key={item.id}>
                <span>{item.topic}</span>
                <strong>{item.percentage}%</strong>
                <small>{item.date ? new Date(item.date).toLocaleDateString() : 'Recently'}</small>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="content-card">
        <div className="section-header">
          <h3>Select Quiz Topic</h3>
        </div>
        <div className="topic-list">
          {topics.map((topic) => (
            <button key={topic.name} className="topic-card" onClick={() => handleTopicClick(topic.name)}>
              <span>{topic.label}</span>
            </button>
          ))}
        </div>
      </section>

      <Modal open={Boolean(timerModalTopic)}>
        <h3>Start Quiz</h3>
        <p>
          Topic: <strong>{timerModalLabel}</strong>
        </p>
        <div className="field-group">
          <label>Timer (minutes)</label>
          <input
            type="number"
            min="1"
            placeholder="No timer"
            value={timerInput}
            onChange={(event) => setTimerInput(event.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={closeTimerModal}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={confirmStartQuiz}>
            Start Quiz
          </button>
        </div>
      </Modal>

      <div className={`toast${message ? ' show' : ''}`}>{message}</div>
    </AppShell>
  );
}
