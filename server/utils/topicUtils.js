function makeTopicKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function validateQuestion(question, topic) {
  if (!question || typeof question !== 'object') {
    return 'Invalid question data.';
  }

  if (!topic || !makeTopicKey(topic)) {
    return 'Topic is required.';
  }

  const trimmedQuestion = String(question.question || '').trim();
  if (!trimmedQuestion) {
    return 'Question text is required.';
  }

  const options = Array.isArray(question.options) ? question.options.map((item) => String(item || '').trim()) : [];
  if (options.length !== 4 || options.some((option) => !option)) {
    return 'All four options are required.';
  }

  if (new Set(options).size !== 4) {
    return 'Options must be unique.';
  }

  const answer = String(question.answer || '').trim();
  if (!answer || !options.includes(answer)) {
    return 'Correct answer must match one of the provided options.';
  }

  if (question.explanation !== undefined && typeof question.explanation !== 'string') {
    return 'Explanation must be a string.';
  }

  return null;
}

module.exports = { makeTopicKey, validateQuestion };
