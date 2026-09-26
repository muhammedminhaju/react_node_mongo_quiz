'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import Modal from '@/components/Modal';
import { deleteReview, fetchReviewTopics, fetchReviews } from '@/lib/api';
import { formatDuration } from '@/lib/quizUtils';
import { useToast } from '@/lib/useToast';

export default function TopicReviewsPage() {
  const { message, showToast } = useToast();
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [detailReview, setDetailReview] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  function statusOf(question) {
    if (!question.selectedAnswer) return 'unanswered';
    return question.selectedAnswer === question.answer ? 'correct' : 'wrong';
  }

  const detailTotals = { correct: 0, wrong: 0, unanswered: 0 };
  (detailReview?.questions || []).forEach((q) => {
    detailTotals[statusOf(q)] += 1;
  });

  useEffect(() => {
    fetchReviewTopics()
      .then(setTopics)
      .catch((err) => setError(err.message || 'Unable to load topic reviews.'));
  }, []);

  function openTopic(topic) {
    setSelectedTopic(topic);
    setLoadingReviews(true);
    fetchReviews(topic)
      .then(setReviews)
      .catch((err) => showToast(err.message || 'Unable to load reviews.'))
      .finally(() => setLoadingReviews(false));
  }

  function backToTopics() {
    setSelectedTopic(null);
    setReviews([]);
  }

  function confirmDelete() {
    if (!deleteId) return;
    deleteReview(deleteId)
      .then(() => {
        setReviews((prev) => prev.filter((item) => item._id !== deleteId));
        showToast('Review deleted.');
      })
      .catch((err) => showToast(err.message || 'Unable to delete review.'))
      .finally(() => setDeleteId(null));
  }

  return (
    <AppShell title="Topic Reviews">
      {!selectedTopic ? (
        <section className="content-card">
          <div className="section-header">
            <h3>Select a Topic</h3>
          </div>
          {error ? (
            <div className="empty-state">{error}</div>
          ) : topics.length === 0 ? (
            <div className="empty-state">No saved reviews yet. Complete a quiz to see it here.</div>
          ) : (
            <div className="topic-list">
              {topics.map((item) => (
                <button key={item.topic} className="topic-card" onClick={() => openTopic(item.topic)}>
                  <div className="topic-card-body">
                    <span>{item.topic}</span>
                    <small>
                      {item.attempts} attempt{item.attempts === 1 ? '' : 's'} &middot; avg {item.averagePercentage}%
                    </small>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="content-card">
          <div className="section-header">
            <h3>{selectedTopic} &mdash; Attempts</h3>
            <button className="btn btn-secondary" onClick={backToTopics}>
              Back to Topics
            </button>
          </div>
          {loadingReviews ? (
            <div className="empty-state">Loading reviews...</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Time Taken</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-state">
                      No attempts recorded for this topic.
                    </td>
                  </tr>
                ) : (
                  reviews.map((review) => (
                    <tr key={review._id}>
                      <td>{new Date(review.date).toLocaleString()}</td>
                      <td>
                        {review.correct}/{review.totalQuestions}
                      </td>
                      <td>{review.percentage}%</td>
                      <td>{formatDuration(review.timeTakenSeconds)}</td>
                      <td>
                        <button className="table-action view" onClick={() => {
                            setFilter('all');
                            setDetailReview(review);
                          }}>
                          View
                        </button>
                        <button className="table-action delete" onClick={() => setDeleteId(review._id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </section>
      )}

      <Modal open={Boolean(detailReview)} wide onClose={() => setDetailReview(null)}>
        <h3>Attempt Review</h3>
        {detailReview && (
          <div className="preset-group">
            {[
              { key: 'all', label: `All (${detailReview.questions.length})` },
              { key: 'wrong', label: `Wrong (${detailTotals.wrong})` },
              { key: 'correct', label: `Not Wrong (${detailTotals.correct + detailTotals.unanswered})` }
            ].map((f) => (
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
        )}
        {detailReview && (
          <p>
            <strong>Marks:</strong> {(Math.round((detailTotals.correct - detailTotals.wrong / 3) * 100) / 100).toFixed(2)} /{' '}
            {detailReview.questions.length} &nbsp;(+1 correct, −1/3 wrong, 0 unanswered)
          </p>
        )}
        {detailReview && (
          <div className="detail-box">
            {detailReview.questions.map((question, index) => {
              const status = statusOf(question);
              if (filter === 'wrong' && status !== 'wrong') return null;
              if (filter === 'correct' && status === 'wrong') return null;
              const isCorrect = status === 'correct';
              const explanation = question.explanation || 'No explanation provided.';
              return (
                <div className={`review-item ${isCorrect ? 'correct' : 'incorrect'}`} key={question.id ?? index}>
                  <h3>Question {index + 1}</h3>
                  <p>{question.question}</p>
                  <p>
                    <strong>Your Answer:</strong> {question.selectedAnswer || 'Unanswered'}
                  </p>
                  <p>
                    <strong>Correct Answer:</strong> {question.answer}
                  </p>
                  <p>
                    <strong>Status:</strong> {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </p>
                  <p>
                    <strong>Mark:</strong> {status === 'correct' ? '+1' : status === 'wrong' ? '−0.33' : '0'}
                  </p>
                  <p>
                    <strong>Time Spent:</strong> {formatDuration(question.timeSpentSeconds || 0)}
                  </p>
                  <p>
                    <strong>Explanation:</strong> {explanation}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setDetailReview(null)}>
            Close
          </button>
        </div>
      </Modal>

      <Modal open={Boolean(deleteId)}>
        <h3>Delete Review?</h3>
        <p>Are you sure you want to delete this saved review?</p>
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
