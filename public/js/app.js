const STORAGE_KEYS = {
  HISTORY: 'quizHistory',
  SETTINGS: 'quizSettings',
  TEMP_QUIZ: 'quizTempState',
  RESULTS: 'quizResults'
};

const defaultSettings = {
  questionCount: 20,
  shuffleQuestions: true,
  shuffleOptions: true,
  showExplanation: true,
  darkMode: false,
  confirmSubmit: true
};

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function loadSettings() {
  const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  return saved ? { ...defaultSettings, ...JSON.parse(saved) } : { ...defaultSettings };
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

function getLocalHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
  } catch (error) {
    return [];
  }
}

function setLocalHistory(history) {
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function getTopicLabels(topicNames) {
  return topicNames.map((name) => {
    const text = String(name || '').replace(/_/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  });
}

function normalizeTopics(rawTopics) {
  return (rawTopics || []).map((topic) => {
    if (typeof topic === 'string') {
      return {
        name: topic,
        label: topic
          .split('_')
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ')
      };
    }
    return {
      name: topic.name || topic.value || topic.id || '',
      label: topic.label || topic.name || topic.value || topic.id || ''
    };
  }).filter((topic) => topic.name);
}

async function fetchTopics() {
  const response = await fetch('/api/topics');
  if (!response.ok) throw new Error('Unable to load topics.');
  const data = await response.json();
  return normalizeTopics(data);
}

async function fetchQuestions(topic) {
  const response = await fetch(`/api/questions/${encodeURIComponent(topic)}`);
  if (!response.ok) throw new Error('Unable to load questions for this topic.');
  return response.json();
}

function fisherYates(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function shuffleOptionsForQuestion(question) {
  const copy = {
    ...question,
    options: fisherYates(question.options || [])
  };
  return copy;
}

function buildTopicCards(topics) {
  const list = document.getElementById('topicList');
  if (!list) return;

  list.innerHTML = topics
    .map((topic) => `
      <button class="topic-card" data-topic="${topic.name}">
        <span>${topic.label}</span>
      </button>
    `)
    .join('');

  list.querySelectorAll('.topic-card').forEach((button) => {
    button.addEventListener('click', () => {
      const topic = button.getAttribute('data-topic');
      if (!topic) return;
      localStorage.setItem('selectedTopic', topic);
      localStorage.removeItem('quizTempState');
      window.location.href = '/quiz';
    });
  });
}

function renderDashboard() {
  const history = getLocalHistory();
  const recent = history.slice(0, 4);

  const totalQuizzes = history.length;
  const totalAnswered = history.reduce((sum, item) => sum + Number(item.correct || 0) + Number(item.wrong || 0), 0);
  const average = totalQuizzes ? Math.round(history.reduce((sum, item) => sum + Number(item.percentage || 0), 0) / totalQuizzes) : 0;
  const best = history.length ? Math.max(...history.map((item) => Number(item.percentage || 0))) : 0;
  const uniqueTopics = new Set(history.map((item) => item.topic)).size;

  const totalQuizzesEl = document.getElementById('totalQuizzesTaken');
  const answeredEl = document.getElementById('questionsAnswered');
  const averageEl = document.getElementById('averageScore');
  const bestEl = document.getElementById('bestScore');
  const topicsEl = document.getElementById('topicsPracticed');

  if (totalQuizzesEl) totalQuizzesEl.textContent = totalQuizzes;
  if (answeredEl) answeredEl.textContent = totalAnswered;
  if (averageEl) averageEl.textContent = `${average}%`;
  if (bestEl) bestEl.textContent = `${best}%`;
  if (topicsEl) topicsEl.textContent = uniqueTopics;

  const recentAttempts = document.getElementById('recentAttempts');
  if (!recentAttempts) return;

  if (!recent.length) {
    recentAttempts.innerHTML = '<div class="empty-state">No quiz attempts yet.</div>';
    return;
  }

  recentAttempts.innerHTML = recent
    .map((item) => {
      const timeLabel = item.date ? new Date(item.date).toLocaleDateString() : 'Recently';
      return `
        <div class="attempt-row">
          <span>${item.topic}</span>
          <strong>${item.percentage}%</strong>
          <small>${timeLabel}</small>
        </div>
      `;
    })
    .join('');
}

async function initDashboard() {
  try {
    const topics = await fetchTopics();
    buildTopicCards(topics);
  } catch (error) {
    showToast(error.message || 'Unable to load topics.');
  }
  renderDashboard();

  const quickBtn = document.getElementById('startQuickQuizBtn');
  if (quickBtn) {
    quickBtn.addEventListener('click', () => {
      const fallbackTopic = localStorage.getItem('selectedTopic') || 'history';
      localStorage.setItem('selectedTopic', fallbackTopic);
      window.location.href = '/quiz';
    });
  }
}

function applySettingsTheme() {
  const settings = loadSettings();
  document.body.classList.toggle('dark-mode', Boolean(settings.darkMode));
}

function renderRevisionOptions() {
  const container = document.getElementById('revisionTopics');
  if (!container) return;

  fetchTopics()
    .then((topics) => {
      container.innerHTML = topics.map((topic) => `
        <label class="checkbox-row">
          <input type="checkbox" value="${topic.name}" checked />
          <span>${topic.label}</span>
        </label>
      `).join('');
    })
    .catch(() => {
      container.innerHTML = '<div class="empty-state">No topics available.</div>';
    });
}

function saveResultToHistory(result) {
  const history = getLocalHistory();
  const updated = [result, ...history].slice(0, 50);
  setLocalHistory(updated);
}

function getLatestResult() {
  const history = getLocalHistory();
  return history[0] || null;
}

function initSettingsPage() {
  const settings = loadSettings();
  const questionCountField = document.getElementById('settingQuestionCount');
  const shuffleQuestionsField = document.getElementById('shuffleQuestionsSetting');
  const shuffleOptionsField = document.getElementById('shuffleOptionsSetting');
  const showExplanationField = document.getElementById('showExplanationSetting');
  const darkModeField = document.getElementById('darkModeSetting');
  const confirmSubmitField = document.getElementById('confirmSubmitSetting');
  const saveBtn = document.getElementById('saveSettingsBtn');

  if (!questionCountField) return;

  questionCountField.value = settings.questionCount;
  shuffleQuestionsField.checked = settings.shuffleQuestions;
  shuffleOptionsField.checked = settings.shuffleOptions;
  showExplanationField.checked = settings.showExplanation;
  darkModeField.checked = settings.darkMode;
  confirmSubmitField.checked = settings.confirmSubmit;

  saveBtn.addEventListener('click', () => {
    const nextSettings = {
      ...settings,
      questionCount: Number(questionCountField.value) || 20,
      shuffleQuestions: shuffleQuestionsField.checked,
      shuffleOptions: shuffleOptionsField.checked,
      showExplanation: showExplanationField.checked,
      darkMode: darkModeField.checked,
      confirmSubmit: confirmSubmitField.checked
    };
    saveSettings(nextSettings);
    document.body.classList.toggle('dark-mode', nextSettings.darkMode);
    showToast('Settings saved.');
  });
}

function initRevisionPage() {
  renderRevisionOptions();
  const btn = document.getElementById('startRevisionBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const checked = [...document.querySelectorAll('#revisionTopics input:checked')].map((input) => input.value);
    if (!checked.length) {
      showToast('Please select at least one topic.');
      return;
    }

    const countSelect = document.getElementById('revisionCountSelect');
    const countValue = countSelect.value;

    const selections = [];
    for (const topic of checked) {
      const questions = await fetchQuestions(topic);
      selections.push(...questions.map((q) => ({ ...q, topic })));
    }

    if (!selections.length) {
      showToast('No questions available in the selected topics.');
      return;
    }

    const questionsToUse = countValue === 'all' ? selections : selections.slice(0, Number(countValue));
    const shuffled = fisherYates(questionsToUse);
    const serialized = { topic: checked.join(','), questions: shuffled, revisionMode: true, selectedTopics: checked };
    localStorage.setItem('quizTempState', JSON.stringify({
      topic: 'Revision',
      questions: shuffled,
      currentIndex: 0,
      selectedAnswers: {},
      startedAt: new Date().toISOString(),
      mode: 'revision',
      revisionSelectedTopics: checked
    }));
    localStorage.setItem('revisionQuizData', JSON.stringify(serialized));
    window.location.href = '/quiz';
  });
}

function prepareQuizState({ topic, questions, mode = 'standard', selectedTopics = [] }) {
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

function loadTemporaryQuizState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TEMP_QUIZ) || 'null');
  } catch (error) {
    return null;
  }
}

function clearTemporaryQuizState() {
  localStorage.removeItem(STORAGE_KEYS.TEMP_QUIZ);
}

async function startQuizForTopic(selectedTopic) {
  const saved = loadSettings();
  try {
    const questions = await fetchQuestions(selectedTopic);
    const rngQuestions = saved.shuffleQuestions ? fisherYates(questions) : [...questions];
    const prepared = rngQuestions.map((question) => ({
      ...question,
      options: saved.shuffleOptions ? fisherYates(question.options || []) : [...(question.options || [])],
      originalAnswer: question.answer,
      displayAnswer: question.answer
    }));

    prepareQuizState({ topic: selectedTopic, questions: prepared, mode: 'standard', selectedTopics: [selectedTopic] });
    window.location.href = '/quiz';
  } catch (error) {
    showToast(error.message || 'Unable to start quiz.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applySettingsTheme();

  if (document.getElementById('topicList')) {
    initDashboard();
  }

  if (document.getElementById('saveSettingsBtn')) {
    initSettingsPage();
  }

  if (document.getElementById('startRevisionBtn')) {
    initRevisionPage();
  }

  const menuButton = document.querySelector('.mobile-menu');
  if (menuButton) {
    menuButton.addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('mobile-open');
    });
  }
});

window.appUtility = {
  fetchTopics,
  fetchQuestions,
  fisherYates,
  loadSettings,
  saveSettings,
  saveResultToHistory,
  getLocalHistory,
  getLatestResult,
  getTopicLabels,
  startQuizForTopic,
  clearTemporaryQuizState,
  loadTemporaryQuizState,
  prepareQuizState,
  showToast
};
