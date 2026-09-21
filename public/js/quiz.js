const quizStateKey = 'quizTempState';

function loadQuizState() {
  try {
    return JSON.parse(localStorage.getItem(quizStateKey) || 'null');
  } catch (error) {
    return null;
  }
}

function saveQuizState(state) {
  localStorage.setItem(quizStateKey, JSON.stringify(state));
}

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem('quizSettings') || '{}');
  } catch (error) {
    return {};
  }
}

function fisherYates(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function fetchQuestions(topic) {
  const response = await fetch(`/api/questions/${encodeURIComponent(topic)}`);
  if (!response.ok) throw new Error('Unable to load questions.');
  return response.json();
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
  const savedState = loadQuizState();
  if (savedState && Array.isArray(savedState.questions) && savedState.questions.length) {
    return savedState;
  }

  const selected = localStorage.getItem('selectedTopic') || 'history';
  const settings = loadSettings();
  const totalQuestions = Number(settings.questionCount) || 20;

  const revisionData = JSON.parse(localStorage.getItem('revisionQuizData') || '{}');
  if (revisionData && Array.isArray(revisionData.questions) && revisionData.questions.length) {
    const questions = revisionData.questions.map(normalizeQuestion);
    const finalQuestions = settings.shuffleQuestions ? fisherYates(questions) : questions;
    const state = {
      topic: 'Revision',
      questions: finalQuestions.slice(0, totalQuestions || finalQuestions.length),
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
    const prepared = shuffled.map((question) => ({
      ...question,
      options: settings.shuffleOptions ? fisherYates(question.options || []) : [...(question.options || [])]
    })).slice(0, totalQuestions);

    const state = {
      topic: selected,
      questions: prepared,
      currentIndex: 0,
      selectedAnswers: {},
      startedAt: new Date().toISOString(),
      mode: 'standard'
    };
    saveQuizState(state);
    return state;
  } catch (error) {
    const fallback = {
      topic: selected,
      questions: [{
        id: 1,
        question: 'No questions available.',
        options: ['Please choose another topic.'],
        answer: 'Please choose another topic.',
        explanation: 'No data is available for the selected topic.'
      }],
      currentIndex: 0,
      selectedAnswers: {},
      startedAt: new Date().toISOString(),
      mode: 'standard'
    };
    saveQuizState(fallback);
    return fallback;
  }
}

async function initQuizPage() {
  const state = await ensureQuizLoaded();
  const settings = loadSettings();

  if (!state || !Array.isArray(state.questions) || !state.questions.length) {
    return;
  }

  const quizTitle = document.getElementById('quizTitle');
  const questionCounter = document.getElementById('questionCounter');
  const questionText = document.getElementById('questionText');
  const optionsContainer = document.getElementById('optionsContainer');
  const progressFill = document.getElementById('progressFill');
  const currentScorePill = document.getElementById('currentScorePill');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  const submitModal = document.getElementById('submitModal');
  const submitSummary = document.getElementById('submitSummary');
  const cancelSubmitBtn = document.getElementById('cancelSubmitBtn');
  const confirmSubmitBtn = document.getElementById('confirmSubmitBtn');

  function renderQuestion() {
    const currentIndex = state.currentIndex;
    const question = state.questions[currentIndex];
    if (!question) return;

    const total = state.questions.length;
    if (quizTitle) quizTitle.textContent = `${state.topic || 'Quiz'} Quiz`;
    if (questionCounter) questionCounter.textContent = `Question ${currentIndex + 1} / ${total}`;
    if (questionText) questionText.textContent = question.question;

    const answeredValue = state.selectedAnswers[currentIndex];
    const score = Object.keys(state.selectedAnswers).length;
    if (currentScorePill) currentScorePill.textContent = `Score: ${score}`;

    if (progressFill) {
      progressFill.style.width = `${((currentIndex + 1) / total) * 100}%`;
    }

    if (optionsContainer) {
      optionsContainer.innerHTML = '';
      (question.options || []).forEach((option) => {
        const optionButton = document.createElement('button');
        optionButton.type = 'button';
        optionButton.className = 'option-btn';
        if (answeredValue === option) optionButton.classList.add('selected');
        optionButton.textContent = option;
        optionButton.addEventListener('click', () => {
          state.selectedAnswers[currentIndex] = option;
          saveQuizState(state);
          renderQuestion();
        });
        optionsContainer.appendChild(optionButton);
      });
    }

    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) nextBtn.textContent = currentIndex === total - 1 ? 'Finish' : 'Next';
  }

  prevBtn?.addEventListener('click', () => {
    if (state.currentIndex > 0) {
      state.currentIndex -= 1;
      saveQuizState(state);
      renderQuestion();
    }
  });

  nextBtn?.addEventListener('click', () => {
    if (state.currentIndex < state.questions.length - 1) {
      state.currentIndex += 1;
      saveQuizState(state);
      renderQuestion();
    } else {
      finishQuiz();
    }
  });

  submitBtn?.addEventListener('click', () => {
    const answered = Object.keys(state.selectedAnswers).length;
    const unanswered = state.questions.length - answered;
    if (settings.confirmSubmit !== false) {
      submitSummary.textContent = `Answered: ${answered} / ${state.questions.length}\nUnanswered: ${unanswered}`;
      submitModal.classList.remove('hidden');
    } else {
      finishQuiz();
    }
  });

  cancelSubmitBtn?.addEventListener('click', () => submitModal.classList.add('hidden'));
  confirmSubmitBtn?.addEventListener('click', () => {
    submitModal.classList.add('hidden');
    finishQuiz();
  });

  function finishQuiz() {
    const totalQuestions = state.questions.length;
    const correct = state.questions.reduce((count, question, index) => {
      const chosen = state.selectedAnswers[index];
      if (chosen && chosen === question.answer) {
        return count + 1;
      }
      return count;
    }, 0);
    const wrong = state.questions.reduce((count, question, index) => {
      const chosen = state.selectedAnswers[index];
      if (chosen && chosen !== question.answer) {
        return count + 1;
      }
      return count;
    }, 0);
    const unanswered = totalQuestions - correct - wrong;
    const percentage = totalQuestions ? Math.round((correct / totalQuestions) * 100) : 0;

    const result = {
      id: crypto.randomUUID(),
      topic: state.topic || 'Quiz',
      date: new Date().toISOString(),
      totalQuestions,
      correct,
      wrong,
      unanswered,
      percentage,
      score: `${correct}/${totalQuestions}`
    };

    const reviewData = {
      topic: state.topic || 'Quiz',
      questions: state.questions,
      selectedAnswers: state.selectedAnswers,
      result
    };

    const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
    history.unshift(result);
    localStorage.setItem('quizHistory', JSON.stringify(history));
    localStorage.setItem('lastQuizResult', JSON.stringify(result));
    localStorage.setItem('lastReviewData', JSON.stringify(reviewData));
    localStorage.removeItem(quizStateKey);
    localStorage.removeItem('revisionQuizData');
    window.location.href = '/result';
  }

  renderQuestion();
}

window.addEventListener('DOMContentLoaded', initQuizPage);
