'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { formatDuration } from '@/lib/quizUtils';

export default function ReviewPage() {
  const [reviewData, setReviewData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    try {
      setReviewData(JSON.parse(localStorage.getItem('lastReviewData') || 'null'));
    } catch (error) {
      setReviewData(null);
    }
    setLoaded(true);
  }, []);

  const hasData = reviewData && Array.isArray(reviewData.questions);

  function statusOf(index, question) {
    const userAnswer = reviewData.selectedAnswers[index];
    if (!userAnswer) return 'unanswered';
    return userAnswer === question.answer ? 'correct' : 'wrong';
  }

  const totals = { correct: 0, wrong: 0, unanswered: 0 };
  if (hasData) {
    reviewData.questions.forEach((q, i) => {
      totals[statusOf(i, q)] += 1;
    });
  }
  const totalMarks = totals.correct - totals.wrong / 3;
  const marksText = (Math.round(totalMarks * 100) / 100).toFixed(2);

  const filters = [
    { key: 'all', label: `All (${hasData ? reviewData.questions.length : 0})` },
    { key: 'wrong', label: `Wrong (${totals.wrong})` },
    { key: 'correct', label: `Not Wrong (${totals.correct + totals.unanswered})` }
  ];

  return (
    <AppShell title="Review Answers">
      {hasData && (
        <section className="content-card">
          <div className="preset-group">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`preset-btn${filter === f.key ? ' active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p>
            <strong>Marks:</strong> {marksText} / {reviewData.questions.length} &nbsp;(+1 correct, −1/3 wrong, 0
            unanswered)
          </p>
        </section>
      )}
      <section className="content-card">
        {!loaded ? null : !hasData ? (
          <div className="empty-state">No review data available.</div>
        ) : (
          reviewData.questions.map((question, index) => {
            const status = statusOf(index, question);
            if (filter === 'wrong' && status !== 'wrong') return null;
            if (filter === 'correct' && status === 'wrong') return null;
            const userAnswer = reviewData.selectedAnswers[index];
            const isCorrect = status === 'correct';
            const mark = status === 'correct' ? '+1' : status === 'wrong' ? '−0.33' : '0';
            const explanation = question.explanation || 'No explanation provided.';
            return (
              <div className={`review-item ${isCorrect ? 'correct' : 'incorrect'}`} key={question.id ?? index}>
                <h3>Question {index + 1}</h3>
                <p>{question.question}</p>
                <p>
                  <strong>Your Answer:</strong> {userAnswer || 'Unanswered'}
                </p>
                <p>
                  <strong>Correct Answer:</strong> {question.answer}
                </p>
                <p>
                  <strong>Status:</strong> {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                </p>
                <p>
                  <strong>Mark:</strong> {mark}
                </p>
                <p>
                  <strong>Time Spent:</strong> {formatDuration((reviewData.questionTimeSeconds || {})[index] || 0)}
                </p>
                <p>
                  <strong>Explanation:</strong> {explanation}
                </p>
              </div>
            );
          })
        )}
      </section>
    </AppShell>
  );
}
