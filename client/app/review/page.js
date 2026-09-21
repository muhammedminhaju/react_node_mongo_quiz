'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';

export default function ReviewPage() {
  const [reviewData, setReviewData] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      setReviewData(JSON.parse(localStorage.getItem('lastReviewData') || 'null'));
    } catch (error) {
      setReviewData(null);
    }
    setLoaded(true);
  }, []);

  const hasData = reviewData && Array.isArray(reviewData.questions);

  return (
    <AppShell title="Review Answers">
      <section className="content-card">
        {!loaded ? null : !hasData ? (
          <div className="empty-state">No review data available.</div>
        ) : (
          reviewData.questions.map((question, index) => {
            const userAnswer = reviewData.selectedAnswers[index];
            const isCorrect = userAnswer === question.answer;
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
