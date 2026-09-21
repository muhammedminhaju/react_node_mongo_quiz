const topicModal = document.getElementById('topicModal');

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
        <span>${topic.label}</span>
      </div>
    `).join('');
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
