'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';

const emptyResult = { score: '0 / 0', correct: 0, wrong: 0, unanswered: 0, percentage: 0, totalQuestions: 0 };

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState(null);

  useEffect(() => {
    try {
      setResult(JSON.parse(localStorage.getItem('lastQuizResult') || 'null'));
    } catch (error) {
      setResult(null);
    }
  }, []);

  const data = result || emptyResult;

  return (
    <AppShell title="Quiz Result">
      <section className="content-card">
        <div className="result-header">
          <h2>Quiz Completed</h2>
          <div className="score-large">
            {result ? `${result.correct} / ${result.totalQuestions}` : '0 / 0'}
          </div>
          <div>{data.percentage}%</div>
        </div>

        <div className="result-stats">
          <div>
            <strong>Correct:</strong> <span>{data.correct}</span>
          </div>
          <div>
            <strong>Wrong:</strong> <span>{data.wrong}</span>
          </div>
          <div>
            <strong>Unanswered:</strong> <span>{data.unanswered}</span>
          </div>
        </div>

        <div className="result-actions">
          <button className="btn btn-primary" onClick={() => router.push('/review')}>
            Review Answers
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              const topic = localStorage.getItem('selectedTopic') || 'history';
              localStorage.setItem('selectedTopic', topic);
              router.push('/quiz');
            }}
          >
            Try Again
          </button>
          <button className="btn btn-dark" onClick={() => router.push('/')}>
            Back to Topics
          </button>
        </div>
      </section>
    </AppShell>
  );
}
