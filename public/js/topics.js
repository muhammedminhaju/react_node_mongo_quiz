const topicModal = document.getElementById('topicModal');

function slugifyTopicLabel(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'topic';
}

async function fetchTopics() {
  const response = await fetch('/api/topics');
  if (!response.ok) throw new Error('Unable to load topics.');
  const data = await response.json();
  return (data || []).map((topic) => {
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
    return { name: topic.name || topic.value || '', label: topic.label || topic.name || topic.value || '' };
  }).filter((topic) => topic.name);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

async function deleteTopic(topicName) {
  const confirmed = window.confirm(`Delete the "${topicName}" topic and its question file?`);
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/topics/${encodeURIComponent(topicName)}`, {
      method: 'DELETE'
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showToast(data.error || 'Unable to delete topic.');
      return;
    }

    showToast('Topic deleted.');
    renderTopics();
  } catch (error) {
    showToast('Unable to delete topic.');
  }
}

async function renameTopic(topicName) {
  const currentLabel = topicName.replace(/_/g, ' ');
  const newLabel = window.prompt('Rename topic to:', currentLabel);
  if (newLabel === null) return;

  const trimmedLabel = newLabel.trim();
  if (!trimmedLabel) {
    showToast('Topic name cannot be empty.');
    return;
  }

  const suggestedFile = `${slugifyTopicLabel(trimmedLabel)}.json`;
  const fileNameInput = window.prompt('New JSON file name (optional):', suggestedFile);

  const finalFileName = (fileNameInput || '').trim();
  const payload = {
    newName: trimmedLabel,
    fileName: finalFileName || suggestedFile
  };

  try {
    const response = await fetch(`/api/topics/${encodeURIComponent(topicName)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      showToast(data.error || 'Unable to rename topic.');
      return;
    }

    showToast('Topic renamed.');
    renderTopics();
  } catch (error) {
    showToast('Unable to rename topic.');
  }
}

async function renderTopics() {
  const container = document.getElementById('topicsList');
  if (!container) return;

  try {
    const topics = await fetchTopics();
    if (!topics.length) {
      container.innerHTML = '<div class="empty-state">No topics available yet.</div>';
      return;
    }

    container.innerHTML = topics.map((topic) => `
      <div class="topic-card">
        <div class="topic-card-body">
          <span>${topic.label}</span>
          <div class="topic-actions">
            <button type="button" class="table-action" data-action="rename" data-topic="${topic.name}">Rename</button>
            <button type="button" class="table-action delete" data-action="delete" data-topic="${topic.name}">Delete</button>
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-action="rename"]').forEach((button) => {
      button.addEventListener('click', () => renameTopic(button.dataset.topic));
    });

    container.querySelectorAll('[data-action="delete"]').forEach((button) => {
      button.addEventListener('click', () => deleteTopic(button.dataset.topic));
    });
  } catch (error) {
    container.innerHTML = '<div class="empty-state">Unable to load topics.</div>';
  }
}

document.getElementById('addTopicBtn')?.addEventListener('click', () => topicModal.classList.remove('hidden'));
document.getElementById('cancelTopicBtn')?.addEventListener('click', () => topicModal.classList.add('hidden'));

document.getElementById('topicForm')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('topicNameInput').value.trim();
  const fileName = document.getElementById('topicFileInput').value.trim();

  if (!name || !fileName) {
    showToast('Topic name and file name are required.');
    return;
  }

  const response = await fetch('/api/topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, fileName })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    showToast(data.error || 'Unable to create topic.');
    return;
  }

  topicModal.classList.add('hidden');
  document.getElementById('topicForm').reset();
  showToast('Topic created.');
  renderTopics();
});

document.addEventListener('DOMContentLoaded', renderTopics);
