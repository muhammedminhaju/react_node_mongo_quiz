'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
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
    localStorage.setItem('selectedTopic', topicName);
    localStorage.removeItem('quizTempState');
    router.push('/quiz');
  }

  function handleStartQuickQuiz() {
    const fallbackTopic = localStorage.getItem('selectedTopic') || 'history';
    localStorage.setItem('selectedTopic', fallbackTopic);
    router.push('/quiz');
  }

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

      <div className={`toast${message ? ' show' : ''}`}>{message}</div>
    </AppShell>
  );
}
