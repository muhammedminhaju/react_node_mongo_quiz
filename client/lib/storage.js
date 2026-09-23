export const STORAGE_KEYS = {
  HISTORY: 'quizHistory',
  SETTINGS: 'quizSettings',
  TEMP_QUIZ: 'quizTempState',
  RESULTS: 'quizResults'
};

export const defaultSettings = {
  questionCount: 20,
  useAllQuestions: false,
  shuffleQuestions: true,
  shuffleOptions: true,
  showExplanation: true,
  darkMode: false,
  confirmSubmit: true
};

export function loadSettings() {
  if (typeof window === 'undefined') return { ...defaultSettings };
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : { ...defaultSettings };
  } catch (error) {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

export function getLocalHistory() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
  } catch (error) {
    return [];
  }
}

export function setLocalHistory(history) {
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
}

export function saveResultToHistory(result) {
  const history = getLocalHistory();
  const updated = [result, ...history].slice(0, 50);
  setLocalHistory(updated);
}

export function getLatestResult() {
  const history = getLocalHistory();
  return history[0] || null;
}

export function prepareQuizState({ topic, questions, mode = 'standard', selectedTopics = [] }) {
  const state = {
    topic,
    mode,
    selectedTopics,
    questions: questions.map((question) => ({
      ...question,
      options: Array.isArray(question.options) ? [...question.options] : []
    })),
    currentIndex: 0,
    selectedAnswers: {},
    startedAt: new Date().toISOString()
  };

  localStorage.setItem(STORAGE_KEYS.TEMP_QUIZ, JSON.stringify(state));
  return state;
}

export function loadTemporaryQuizState() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TEMP_QUIZ) || 'null');
  } catch (error) {
    return null;
  }
}

export function clearTemporaryQuizState() {
  localStorage.removeItem(STORAGE_KEYS.TEMP_QUIZ);
}
