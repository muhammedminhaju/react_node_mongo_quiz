const historyKey = 'quizHistory';

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(historyKey) || '[]');
  } catch (error) {
    return [];
  }
}

function saveHistory(list) {
  localStorage.setItem(historyKey, JSON.stringify(list));
}

function renderHistoryTable() {
  const tbody = document.getElementById('historyTableBody');
  if (!tbody) return;

  const history = loadHistory();
  if (!history.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No quiz history yet.</td></tr>';
    return;
  }

  tbody.innerHTML = history.map((entry) => `
    <tr>
      <td>${entry.topic}</td>
      <td>${new Date(entry.date).toLocaleDateString()}</td>
      <td>${entry.correct}/${entry.totalQuestions}</td>
      <td>${entry.percentage}%</td>
      <td>
        <button class="table-action view" data-view-id="${entry.id}">View</button>
        <button class="table-action delete" data-delete-id="${entry.id}">Delete</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-view-id]').forEach((button) => {
    button.addEventListener('click', () => showHistoryDetail(button.dataset.viewId));
  });

  tbody.querySelectorAll('[data-delete-id]').forEach((button) => {
    button.addEventListener('click', () => deleteHistoryEntry(button.dataset.deleteId));
  });
}

let selectedDeleteId = null;

function showHistoryDetail(id) {
  const history = loadHistory();
  const entry = history.find((item) => item.id === id);
  const modal = document.getElementById('historyModal');
  const content = document.getElementById('historyDetailContent');
  if (!entry || !modal || !content) return;

  content.innerHTML = `
    <div class="detail-box">
      <p><strong>Topic:</strong> ${entry.topic}</p>
      <p><strong>Date:</strong> ${new Date(entry.date).toLocaleString()}</p>
      <p><strong>Score:</strong> ${entry.correct}/${entry.totalQuestions}</p>
      <p><strong>Percentage:</strong> ${entry.percentage}%</p>
      <p><strong>Correct:</strong> ${entry.correct}</p>
      <p><strong>Wrong:</strong> ${entry.wrong}</p>
      <p><strong>Unanswered:</strong> ${entry.unanswered}</p>
    </div>
  `;
  modal.classList.remove('hidden');
}

function deleteHistoryEntry(id) {
  selectedDeleteId = id;
  document.getElementById('confirmHistoryDeleteModal')?.classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}

function bindHistoryEvents() {
  document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
    const history = loadHistory();
    if (!history.length) {
      window.appUtility?.showToast('No history to clear.');
      return;
    }
    if (confirm('Are you sure you want to clear all history?')) {
      saveHistory([]);
      renderHistoryTable();
    }
  });

  document.getElementById('closeHistoryDetailBtn')?.addEventListener('click', () => closeModal('historyModal'));

  document.getElementById('cancelDeleteHistoryBtn')?.addEventListener('click', () => closeModal('confirmHistoryDeleteModal'));

  document.getElementById('confirmDeleteHistoryBtn')?.addEventListener('click', () => {
    if (!selectedDeleteId) return;
    const list = loadHistory().filter((item) => item.id !== selectedDeleteId);
    saveHistory(list);
    selectedDeleteId = null;
    closeModal('confirmHistoryDeleteModal');
    renderHistoryTable();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderHistoryTable();
  bindHistoryEvents();
});
