export function fisherYates(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getTopicLabels(topicNames) {
  return topicNames.map((name) => {
    const text = String(name || '').replace(/_/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  });
}

export function normalizeTopics(rawTopics) {
  return (rawTopics || [])
    .map((topic) => {
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
        name: topic?.name || topic?.value || topic?.id || '',
        label: topic?.label || topic?.name || topic?.value || topic?.id || ''
      };
    })
    .filter((topic) => topic.name);
}

export function slugifyTopicLabel(value) {
  return (
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'topic'
  );
}

export function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}
