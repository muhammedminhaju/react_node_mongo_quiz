const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const dataDir = path.join(__dirname, '..', 'data');

function makeTopicKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function getFilePath(topic) {
  ensureDataDir();
  const key = makeTopicKey(topic);
  return path.join(dataDir, `${key}.json`);
}

function readQuestions(topic) {
  const filePath = getFilePath(topic);
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (error) {
    return [];
  }
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

router.get('/:topic', (req, res) => {
  const topic = makeTopicKey(req.params.topic);
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required.' });
  }

  const questions = readQuestions(topic);
  return res.json(questions);
});

router.post('/:topic', (req, res) => {
  const topic = makeTopicKey(req.params.topic);
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required.' });
  }

  const validationError = validateQuestion(req.body, topic);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const questions = readQuestions(topic);
  const nextId = questions.reduce((max, current) => Math.max(max, Number(current.id) || 0), 0) + 1;
  const newQuestion = {
    id: nextId,
    question: String(req.body.question).trim(),
    options: Array.isArray(req.body.options) ? req.body.options.map((option) => String(option).trim()) : [],
    answer: String(req.body.answer).trim(),
    explanation: req.body.explanation !== undefined ? String(req.body.explanation).trim() : ''
  };

  const filePath = getFilePath(topic);
  questions.push(newQuestion);
  fs.writeFileSync(filePath, JSON.stringify(questions, null, 2), 'utf8');
  res.status(201).json(newQuestion);
});

router.put('/:topic/:id', (req, res) => {
  const topic = makeTopicKey(req.params.topic);
  const id = Number(req.params.id);
  if (!topic || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid topic or question id.' });
  }

  const validationError = validateQuestion(req.body, topic);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const questions = readQuestions(topic);
  const index = questions.findIndex((question) => Number(question.id) === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Question not found.' });
  }

  const updatedQuestion = {
    ...questions[index],
    question: String(req.body.question).trim(),
    options: Array.isArray(req.body.options) ? req.body.options.map((option) => String(option).trim()) : [],
    answer: String(req.body.answer).trim(),
    explanation: req.body.explanation !== undefined ? String(req.body.explanation).trim() : ''
  };

  questions[index] = updatedQuestion;
  fs.writeFileSync(getFilePath(topic), JSON.stringify(questions, null, 2), 'utf8');
  res.json(updatedQuestion);
});

router.delete('/:topic/:id', (req, res) => {
  const topic = makeTopicKey(req.params.topic);
  const id = Number(req.params.id);

  if (!topic || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid topic or question id.' });
  }

  const filePath = getFilePath(topic);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Topic not found.' });
  }

  const questions = readQuestions(topic);
  const filtered = questions.filter((question) => Number(question.id) !== id);
  fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf8');
  res.json({ message: 'Question deleted successfully.' });
});

module.exports = router;
