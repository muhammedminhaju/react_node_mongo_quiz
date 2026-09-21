import { normalizeTopics } from './quizUtils';

export async function fetchTopics() {
  const response = await fetch('/api/topics');
  if (!response.ok) throw new Error('Unable to load topics.');
  const data = await response.json();
  return normalizeTopics(data);
}

export async function fetchQuestions(topic) {
  const response = await fetch(`/api/questions/${encodeURIComponent(topic)}`);
  if (!response.ok) throw new Error('Unable to load questions for this topic.');
  return response.json();
}

export async function createTopic({ name, fileName }) {
  const response = await fetch('/api/topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, fileName })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to create topic.');
  return data;
}

export async function renameTopic(topicName, payload) {
  const response = await fetch(`/api/topics/${encodeURIComponent(topicName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to rename topic.');
  return data;
}

export async function deleteTopic(topicName) {
  const response = await fetch(`/api/topics/${encodeURIComponent(topicName)}`, {
    method: 'DELETE'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to delete topic.');
  return data;
}

export async function createQuestion(topic, payload) {
  const response = await fetch(`/api/questions/${encodeURIComponent(topic)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to save question.');
  return data;
}

export async function updateQuestion(topic, id, payload) {
  const response = await fetch(`/api/questions/${encodeURIComponent(topic)}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to save question.');
  return data;
}

export async function deleteQuestion(topic, id) {
  const response = await fetch(`/api/questions/${encodeURIComponent(topic)}/${id}`, {
    method: 'DELETE'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to delete question.');
  return data;
}
