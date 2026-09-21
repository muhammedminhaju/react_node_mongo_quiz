function toDayKey(dateString) {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function labelForTopic(topic) {
  const text = String(topic || '').replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function filterHistory(history, { from, to, topic } = {}) {
  return (history || []).filter((entry) => {
    if (topic && topic !== 'all' && entry.topic !== topic) return false;

    if (from || to) {
      const dayKey = toDayKey(entry.date);
      if (from && dayKey < from) return false;
      if (to && dayKey > to) return false;
    }

    return true;
  });
}

export function computeSummary(filtered) {
  const totalQuizzes = filtered.length;
  const totalQuestions = filtered.reduce((sum, item) => sum + Number(item.totalQuestions || 0), 0);
  const totalCorrect = filtered.reduce((sum, item) => sum + Number(item.correct || 0), 0);
  const totalWrong = filtered.reduce((sum, item) => sum + Number(item.wrong || 0), 0);
  const totalUnanswered = filtered.reduce((sum, item) => sum + Number(item.unanswered || 0), 0);
  const averagePercentage = totalQuizzes
    ? Math.round(filtered.reduce((sum, item) => sum + Number(item.percentage || 0), 0) / totalQuizzes)
    : 0;
  const bestPercentage = totalQuizzes ? Math.max(...filtered.map((item) => Number(item.percentage || 0))) : 0;
  const worstPercentage = totalQuizzes ? Math.min(...filtered.map((item) => Number(item.percentage || 0))) : 0;

  return {
    totalQuizzes,
    totalQuestions,
    totalCorrect,
    totalWrong,
    totalUnanswered,
    averagePercentage,
    bestPercentage,
    worstPercentage
  };
}

export function computeTrend(filtered) {
  return [...filtered]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((item, index) => ({
      index: index + 1,
      date: item.date,
      dateLabel: new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      percentage: Number(item.percentage || 0),
      topic: item.topic
    }));
}

export function computeTopicBreakdown(filtered) {
  const grouped = new Map();

  filtered.forEach((item) => {
    const key = item.topic || 'unknown';
    if (!grouped.has(key)) {
      grouped.set(key, { topic: key, label: labelForTopic(key), attempts: 0, totalPercentage: 0 });
    }
    const entry = grouped.get(key);
    entry.attempts += 1;
    entry.totalPercentage += Number(item.percentage || 0);
  });

  return [...grouped.values()]
    .map((entry) => ({
      topic: entry.topic,
      label: entry.label,
      attempts: entry.attempts,
      avgPercentage: Math.round(entry.totalPercentage / entry.attempts)
    }))
    .sort((a, b) => b.avgPercentage - a.avgPercentage);
}

export function getAvailableTopics(history) {
  const names = [...new Set((history || []).map((item) => item.topic).filter(Boolean))];
  return names
    .map((name) => ({ name, label: labelForTopic(name) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function toDateInputValue(date) {
  return toDayKey(date.toISOString());
}
