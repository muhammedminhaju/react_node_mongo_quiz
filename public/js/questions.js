const questionModal = document.getElementById('questionModal');
const deleteQuestionModal = document.getElementById('deleteQuestionModal');
const topicFilter = document.getElementById('topicFilter');
const questionTopic = document.getElementById('questionTopic');
const correctAnswerSelect = document.getElementById('correctAnswerSelect');
const searchInput = document.getElementById('searchInput');
let currentEditId = null;
let pendingDelete = null;

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

async function fetchTopics() {
  const response = await fetch('/api/topics');
  if (!response.ok) throw new Error('Unable to load topics.');
  return response.json();
}

async function loadQuestions(topic) {
  const response = await fetch(`/api/questions/${encodeURIComponent(topic)}`);
  if (!response.ok) {
    return [];
  }
  return response.json();
}

function updateCorrectAnswerOptions() {
  const options = ['Option A', 'Option B', 'Option C', 'Option D'];
  const chosen = [
    document.getElementById('optionA').value,
    document.getElementById('optionB').value,
    document.getElementById('optionC').value,
    document.getElementById('optionD').value
  ].filter((value) => value.trim());

  correctAnswerSelect.innerHTML = options.map((label, index) => {
    const value = chosen[index] || label;
    return `<option value="${value}">${label}: ${value || '(empty)'}</option>`;
  }).join('');
}

function fillQuestionForm(fields) {
  document.getElementById('questionTextInput').value = fields.question || '';
  document.getElementById('optionA').value = fields.options?.[0] || '';
  document.getElementById('optionB').value = fields.options?.[1] || '';
  document.getElementById('optionC').value = fields.options?.[2] || '';
  document.getElementById('optionD').value = fields.options?.[3] || '';
  document.getElementById('questionExplanation').value = fields.explanation || '';
  document.getElementById('questionTopic').value = fields.topic || document.getElementById('questionTopic').value;
  updateCorrectAnswerOptions();
  const answerValue = fields.answer || document.getElementById('optionA').value;
  const optionValues = [
    document.getElementById('optionA').value,
    document.getElementById('optionB').value,
    document.getElementById('optionC').value,
    document.getElementById('optionD').value
  ];
  const correctIndex = optionValues.indexOf(answerValue);
  if (correctIndex >= 0) {
    correctAnswerSelect.value = optionValues[correctIndex];
  }
}

async function renderTopicOptions() {
  const topics = await fetchTopics();
  const selectHtml = topics.map((topic) => `<option value="${topic.name}">${topic.label}</option>`).join('');
  topicFilter.innerHTML = selectHtml;
  questionTopic.innerHTML = selectHtml;

  if (topics.length) {
    topicFilter.value = topics[0].name;
    questionTopic.value = topics[0].name;
    loadQuestionsGrid(topics[0].name);
  }

  topicFilter.addEventListener('change', () => loadQuestionsGrid(topicFilter.value));
  questionTopic.addEventListener('change', () => updateCorrectAnswerOptions());
  document.getElementById('optionA').addEventListener('input', updateCorrectAnswerOptions);
  document.getElementById('optionB').addEventListener('input', updateCorrectAnswerOptions);
  document.getElementById('optionC').addEventListener('input', updateCorrectAnswerOptions);
  document.getElementById('optionD').addEventListener('input', updateCorrectAnswerOptions);
}

async function loadQuestionsGrid(topic) {
  const rows = await loadQuestions(topic);
  const filtered = rows.filter((question) => {
    const term = (searchInput?.value || '').toLowerCase();
    if (!term) return true;
    const searchable = [String(question.id), question.question, ...(question.options || [])].join(' ').toLowerCase();
    return searchable.includes(term);
  });

  const tableBody = document.getElementById('questionsTableBody');
  tableBody.innerHTML = filtered.map((question) => `
    <tr>
      <td>${question.id}</td>
      <td>${question.question}</td>
      <td>
        <button class="table-action" data-edit-id="${question.id}" data-topic="${topic}">Edit</button>
        <button class="table-action delete" data-delete-id="${question.id}" data-topic="${topic}">Delete</button>
      </td>
    </tr>
  `).join('');

  tableBody.querySelectorAll('[data-edit-id]').forEach((button) => {
    button.addEventListener('click', () => openEditQuestion(button.dataset.topic, Number(button.dataset.editId)));
  });

  tableBody.querySelectorAll('[data-delete-id]').forEach((button) => {
    button.addEventListener('click', () => openDeleteQuestion(button.dataset.topic, Number(button.dataset.deleteId)));
  });
}

function openQuestionModal(mode = 'add', topic = '', question = null) {
  questionModal?.classList.remove('hidden');
  document.getElementById('questionModalTitle').textContent = mode === 'add' ? 'Add Question' : 'Edit Question';
  document.getElementById('saveQuestionBtn').textContent = mode === 'add' ? 'Save Question' : 'Update Question';

  if (mode === 'add') {
    document.getElementById('questionForm').reset();
    questionTopic.value = topic || topicFilter.value;
    currentEditId = null;
    updateCorrectAnswerOptions();
    return;
  }

  fillQuestionForm({
    ...question,
    topic: topic || questionTopic.value
  });
  currentEditId = question.id;
}

function closeQuestionModal() {
  questionModal?.classList.add('hidden');
  document.getElementById('questionForm')?.reset();
}

function openDeleteQuestion(topic, id) {
  pendingDelete = { topic, id };
  deleteQuestionModal?.classList.remove('hidden');
}

async function submitQuestion(event) {
  event.preventDefault();

  const topic = document.getElementById('questionTopic').value;
  const payload = {
    question: document.getElementById('questionTextInput').value.trim(),
    options: [
      document.getElementById('optionA').value.trim(),
      document.getElementById('optionB').value.trim(),
      document.getElementById('optionC').value.trim(),
      document.getElementById('optionD').value.trim()
    ],
    answer: correctAnswerSelect.value,
    explanation: document.getElementById('questionExplanation').value.trim()
  };

  if (!topic) {
    showToast('Please select a topic.');
    return;
  }

  if (!payload.question) {
    showToast('Question is required.');
    return;
  }

  if (payload.options.some((option) => !option)) {
    showToast('All options must be filled.');
    return;
  }

  if (new Set(payload.options).size !== 4) {
    showToast('Options must be unique.');
    return;
  }

  if (!payload.options.includes(payload.answer)) {
    showToast('Correct answer must match one of the options.');
    return;
  }

  const url = currentEditId ? `/api/questions/${encodeURIComponent(topic)}/${currentEditId}` : `/api/questions/${encodeURIComponent(topic)}`;
  const method = currentEditId ? 'PUT' : 'POST';

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    showToast(data.error || 'Unable to save question.');
    return;
  }

  showToast(currentEditId ? 'Question updated.' : 'Question added.');
  closeQuestionModal();
  loadQuestionsGrid(topicFilter.value);
}

async function openEditQuestion(topic, id) {
  const questions = await loadQuestions(topic);
  const match = questions.find((item) => Number(item.id) === id);
  if (!match) {
    showToast('Question not found.');
    return;
  }
  openQuestionModal('edit', topic, match);
}

async function deleteQuestion() {
  if (!pendingDelete) return;
  const response = await fetch(`/api/questions/${encodeURIComponent(pendingDelete.topic)}/${pendingDelete.id}`, { method: 'DELETE' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    showToast(data.error || 'Unable to delete question.');
    return;
  }
  deleteQuestionModal.classList.add('hidden');
  pendingDelete = null;
  showToast('Question deleted.');
  loadQuestionsGrid(topicFilter.value);
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await renderTopicOptions();
  } catch (error) {
    showToast('Unable to load topic data.');
  }

  searchInput?.addEventListener('input', () => loadQuestionsGrid(topicFilter.value));

  document.getElementById('addQuestionBtn')?.addEventListener('click', () => openQuestionModal('add', topicFilter.value));
  document.getElementById('cancelQuestionBtn')?.addEventListener('click', closeQuestionModal);
  document.getElementById('cancelDeleteQuestionBtn')?.addEventListener('click', () => deleteQuestionModal.classList.add('hidden'));
  document.getElementById('confirmDeleteQuestionBtn')?.addEventListener('click', deleteQuestion);
  document.getElementById('questionForm')?.addEventListener('submit', submitQuestion);

  updateCorrectAnswerOptions();
});
