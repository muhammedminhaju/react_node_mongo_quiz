'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import Modal from '@/components/Modal';
import { createReview, fetchQuestions } from '@/lib/api';
import { fisherYates, formatDuration, generateId } from '@/lib/quizUtils';
import { loadSettings } from '@/lib/storage';

const QUIZ_STATE_KEY = 'quizTempState';

function loadQuizState() {
  try {
    return JSON.parse(localStorage.getItem(QUIZ_STATE_KEY) || 'null');
  } catch (error) {
    return null;
  }
}

function saveQuizState(state) {
  localStorage.setItem(QUIZ_STATE_KEY, JSON.stringify(state));
}

function normalizeQuestion(question) {
  const safeQuestion = { ...question };
  safeQuestion.options = Array.isArray(question.options) ? question.options.map((item) => String(item)) : [];
  if (!safeQuestion.answer) {
    safeQuestion.answer = safeQuestion.options[0] || '';
  }
  return safeQuestion;
}

async function ensureQuizLoaded() {
  const timerMinutesRaw = localStorage.getItem('quizTimerMinutes');
  localStorage.removeItem('quizTimerMinutes');
  const requestedTimerMinutes = timerMinutesRaw ? Number(timerMinutesRaw) : null;

  const savedState = loadQuizState();
  if (savedState && Array.isArray(savedState.questions) && savedState.questions.length) {
    return savedState;
  }

  const selected = localStorage.getItem('selectedTopic') || 'history';
  const settings = loadSettings();
  const totalQuestions = settings.useAllQuestions ? undefined : Number(settings.questionCount) || 20;

  const revisionData = JSON.parse(localStorage.getItem('revisionQuizData') || '{}');
  if (revisionData && Array.isArray(revisionData.questions) && revisionData.questions.length) {
    const questions = revisionData.questions.map(normalizeQuestion);
    const finalQuestions = settings.shuffleQuestions ? fisherYates(questions) : questions;
    const state = {
      topic: 'Revision',
      questions: finalQuestions.slice(0, totalQuestions),
      currentIndex: 0,
      selectedAnswers: {},
      startedAt: new Date().toISOString(),
      mode: 'revision'
    };
    saveQuizState(state);
    return state;
  }

  try {
    const questions = await fetchQuestions(selected);
    const normalized = (questions || []).map(normalizeQuestion);
    const shuffled = settings.shuffleQuestions ? fisherYates(normalized) : normalized;
    const prepared = shuffled
      .map((question) => ({
        ...question,
        options: settings.shuffleOptions ? fisherYates(question.options || []) : [...(question.options || [])]
      }))
      .slice(0, totalQuestions);

    const timerEndsAt = requestedTimerMinutes
      ? new Date(Date.now() + requestedTimerMinutes * 60000).toISOString()
      : null;

    const state = {
      topic: selected,
      questions: prepared,
      currentIndex: 0,
      selectedAnswers: {},
      startedAt: new Date().toISOString(),
      mode: 'standard',
      timerMinutes: requestedTimerMinutes,
      timerEndsAt
    };
    saveQuizState(state);
    return state;
  } catch (error) {
    const fallback = {
      topic: selected,
      questions: [
        {
          id: 1,
          question: 'No questions available.',
          options: ['Please choose another topic.'],
          answer: 'Please choose another topic.',
          explanation: 'No data is available for the selected topic.'
        }
      ],
      currentIndex: 0,
      selectedAnswers: {},
      startedAt: new Date().toISOString(),
      mode: 'standard'
    };
    saveQuizState(fallback);
    return fallback;
  }
}

export default function QuizPage() {
  const router = useRouter();
  const [state, setState] = useState(null);
  const [settings, setSettings] = useState({});
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const autoSubmittedRef = useRef(false);
  const finishQuizRef = useRef(() => {});
  const initializedRef = useRef(false);
  const questionStartRef = useRef(Date.now());

  useEffect(() => {
    setSettings(loadSettings());
    if (initializedRef.current) return;
    initializedRef.current = true;
    ensureQuizLoaded().then((loaded) => {
      questionStartRef.current = Date.now();
      setState(loaded);
    });
  }, []);

  useEffect(() => {
    finishQuizRef.current = finishQuiz;
  });

  useEffect(() => {
    if (!state?.timerEndsAt) {
      setRemainingSeconds(null);
      return undefined;
    }

    autoSubmittedRef.current = false;

    function tick() {
      const secondsLeft = Math.round((new Date(state.timerEndsAt).getTime() - Date.now()) / 1000);
      setRemainingSeconds(Math.max(0, secondsLeft));
      if (secondsLeft <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        finishQuizRef.current();
      }
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [state?.timerEndsAt]);

  if (!state || !Array.isArray(state.questions) || !state.questions.length) {
    return (
      <AppShell title="Quiz">
        <section className="content-card quiz-card">
          <div className="empty-state">Loading quiz...</div>
        </section>
      </AppShell>
    );
  }

  const { currentIndex, questions, selectedAnswers } = state;
  const question = questions[currentIndex];
  const total = questions.length;
  const answeredValue = selectedAnswers[currentIndex];
  const score = Object.keys(selectedAnswers).length;
  const errorCount = question.errorCount || 0;
  const warningLevel = errorCount >= 6 ? 'high' : errorCount >= 3 ? 'medium' : errorCount >= 1 ? 'low' : null;

  function updateState(nextState) {
    saveQuizState(nextState);
    setState(nextState);
  }

  // Adds the time spent since the last commit to the current question's
  // running total, and resets the clock. Called on every navigation and
  // right before finishing, so the in-progress question always gets counted.
  function commitCurrentTime() {
    const elapsed = Math.max(0, Math.round((Date.now() - questionStartRef.current) / 1000));
    questionStartRef.current = Date.now();
    const prev = state.questionTimeSeconds || {};
    return { ...prev, [state.currentIndex]: (prev[state.currentIndex] || 0) + elapsed };
  }

  function selectOption(option) {
    const nextAnswers = { ...state.selectedAnswers };
    if (nextAnswers[currentIndex] === option) {
      delete nextAnswers[currentIndex];
    } else {
      nextAnswers[currentIndex] = option;
    }
    updateState({ ...state, selectedAnswers: nextAnswers });
  }

  function goPrev() {
    if (state.currentIndex > 0) {
      const questionTimeSeconds = commitCurrentTime();
      updateState({ ...state, questionTimeSeconds, currentIndex: state.currentIndex - 1 });
    }
  }

  function goNext() {
    if (state.currentIndex < state.questions.length - 1) {
      const questionTimeSeconds = commitCurrentTime();
      updateState({ ...state, questionTimeSeconds, currentIndex: state.currentIndex + 1 });
    } else {
      handleSubmitClick();
    }
  }

  function handleSubmitClick() {
    if (settings.confirmSubmit !== false) {
      setSubmitModalOpen(true);
    } else {
      finishQuiz();
    }
  }

  function finishQuiz() {
    const questionTimeSeconds = commitCurrentTime();
    const s = { ...state, questionTimeSeconds };

    const totalQuestions = s.questions.length;
    const correct = s.questions.reduce((count, q, index) => {
      const chosen = s.selectedAnswers[index];
      return chosen && chosen === q.answer ? count + 1 : count;
    }, 0);
    const wrong = s.questions.reduce((count, q, index) => {
      const chosen = s.selectedAnswers[index];
      return chosen && chosen !== q.answer ? count + 1 : count;
    }, 0);
    const unanswered = totalQuestions - correct - wrong;
    const percentage = totalQuestions ? Math.round((correct / totalQuestions) * 100) : 0;
    const timeTakenSeconds = s.startedAt
      ? Math.max(0, Math.round((Date.now() - new Date(s.startedAt).getTime()) / 1000))
      : null;

    const result = {
      id: generateId(),
      topic: s.topic || 'Quiz',
      date: new Date().toISOString(),
      totalQuestions,
      correct,
      wrong,
      unanswered,
      percentage,
      score: `${correct}/${totalQuestions}`,
      timeTakenSeconds,
      timerMinutes: s.timerMinutes || null
    };

    const reviewData = {
      topic: s.topic || 'Quiz',
      questions: s.questions,
      selectedAnswers: s.selectedAnswers,
      questionTimeSeconds,
      result
    };

    const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
    history.unshift(result);
    localStorage.setItem('quizHistory', JSON.stringify(history));
    localStorage.setItem('lastQuizResult', JSON.stringify(result));
    localStorage.setItem('lastReviewData', JSON.stringify(reviewData));
    localStorage.removeItem(QUIZ_STATE_KEY);
    localStorage.removeItem('revisionQuizData');

    const reviewQuestions = s.questions
      .map((q, index) => ({ q, index }))
      .filter(({ q }) => q._id)
      .map(({ q, index }) => ({
        questionId: q._id,
        selectedAnswer: s.selectedAnswers[index] ?? null,
        answer: q.answer,
        timeSpentSeconds: questionTimeSeconds[index] || 0
      }));

    if (reviewQuestions.length) {
      createReview({
        topic: result.topic,
        totalQuestions,
        correct,
        wrong,
        unanswered,
        percentage,
        timeTakenSeconds,
        timerMinutes: result.timerMinutes,
        questions: reviewQuestions
      }).catch(() => {});
    }

    router.push('/result');
  }

  const answered = Object.keys(state.selectedAnswers).length;
  const unanswered = state.questions.length - answered;

  return (
    <AppShell
      title={`${state.topic || 'Quiz'} Quiz`}
      actions={
        <>
          {remainingSeconds !== null && (
            <span className={`timer-pill${remainingSeconds <= 30 ? ' low' : ''}`}>⏱ {formatDuration(remainingSeconds)}</span>
          )}
          <span className="score-pill">Score: {score}</span>
        </>
      }
    >
      <section className="content-card quiz-card">
        <div className="quiz-meta">
          <div>
            Question {currentIndex + 1} / {total}
          </div>
          <div className="progress-bar">
            <span style={{ width: `${((currentIndex + 1) / total) * 100}%` }} />
          </div>
        </div>

        <div className={`question-wrap${warningLevel ? ` warn-${warningLevel}` : ''}`}>
          {warningLevel && (
            <div className={`error-warning warn-${warningLevel}`}>
              ⚠ You've missed this {errorCount} time{errorCount === 1 ? '' : 's'} before
            </div>
          )}
          <h2>{question.question}</h2>
          <div className="options">
            {(question.options || []).map((option) => (
              <button
                key={option}
                type="button"
                className={`option-btn${answeredValue === option ? ' selected' : ''}`}
                onClick={() => selectOption(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="quiz-controls">
          <button className="btn btn-secondary" onClick={goPrev} disabled={currentIndex === 0}>
            Previous
          </button>
          <button className="btn btn-primary" onClick={goNext}>
            {currentIndex === total - 1 ? 'Finish' : 'Next'}
          </button>
          <button className="btn btn-danger" onClick={handleSubmitClick}>
            Submit Quiz
          </button>
        </div>
      </section>

      <Modal open={submitModalOpen}>
        <h3>Submit Quiz?</h3>
        <p style={{ whiteSpace: 'pre-line' }}>
          {`Answered: ${answered} / ${state.questions.length}\nUnanswered: ${unanswered}`}
        </p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setSubmitModalOpen(false)}>
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              setSubmitModalOpen(false);
              finishQuiz();
            }}
          >
            Submit
          </button>
        </div>
      </Modal>
    </AppShell>
  );
}
