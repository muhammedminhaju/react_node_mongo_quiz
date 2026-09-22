const express = require('express');
const fs = require('fs');
const path = require('path');
const { makeTopicKey, validateQuestion } = require('../utils/topicUtils');
const { getTopicQuestionModel, topicCollectionExists, replaceTopicQuestions } = require('../models/TopicQuestions');

const router = express.Router();
const dataDir = path.join(__dirname, '..', 'data');

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

function readQuestionsFromFile(topic) {
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

// MongoDB is treated as the primary store whenever it's connected, but every
// write also lands on disk so the app keeps working (read-only history aside)
// if the database becomes unreachable later.
async function loadEffectiveQuestions(topic) {
  if (await topicCollectionExists(topic)) {
    const docs = await getTopicQuestionModel(topic).find().lean();
    return docs.map(({ _id, __v, ...rest }) => rest);
  }
  return readQuestionsFromFile(topic);
}

async function persistQuestions(topic, questions) {
  fs.writeFileSync(getFilePath(topic), JSON.stringify(questions, null, 2), 'utf8');
  try {
    await replaceTopicQuestions(topic, questions);
  } catch (error) {
    // The JSON file already has the authoritative write; a Mongo mirroring
    // failure shouldn't fail the request.
  }
}

router.get('/:topic', async (req, res) => {
  const topic = makeTopicKey(req.params.topic);
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required.' });
  }

  const questions = await loadEffectiveQuestions(topic);
  res.json(questions);
});

router.post('/:topic/import', async (req, res) => {
  const topic = makeTopicKey(req.params.topic);
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required.' });
  }

  const { questions: incoming } = req.body || {};
  if (!Array.isArray(incoming) || !incoming.length) {
    return res.status(400).json({ error: 'The file must contain a non-empty array of questions.' });
  }

  for (let i = 0; i < incoming.length; i += 1) {
    const validationError = validateQuestion(incoming[i], topic);
    if (validationError) {
      return res.status(400).json({ error: `Question ${i + 1}: ${validationError}` });
    }
  }

  const questions = await loadEffectiveQuestions(topic);
  let nextId = questions.reduce((max, current) => Math.max(max, Number(current.id) || 0), 0) + 1;

  const appended = incoming.map((question) => ({
    id: nextId++,
    question: String(question.question).trim(),
    options: question.options.map((option) => String(option).trim()),
    answer: String(question.answer).trim(),
    explanation: question.explanation !== undefined ? String(question.explanation).trim() : ''
  }));

  const combined = [...questions, ...appended];
  await persistQuestions(topic, combined);

  res.status(201).json({
    message: `Appended ${appended.length} questions (total ${combined.length}).`,
    added: appended.length,
    total: combined.length
  });
});

router.post('/:topic', async (req, res) => {
  const topic = makeTopicKey(req.params.topic);
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required.' });
  }

  const validationError = validateQuestion(req.body, topic);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const questions = await loadEffectiveQuestions(topic);
  const nextId = questions.reduce((max, current) => Math.max(max, Number(current.id) || 0), 0) + 1;
  const newQuestion = {
    id: nextId,
    question: String(req.body.question).trim(),
    options: Array.isArray(req.body.options) ? req.body.options.map((option) => String(option).trim()) : [],
    answer: String(req.body.answer).trim(),
    explanation: req.body.explanation !== undefined ? String(req.body.explanation).trim() : ''
  };

  questions.push(newQuestion);
  await persistQuestions(topic, questions);
  res.status(201).json(newQuestion);
});

router.put('/:topic/:id', async (req, res) => {
  const topic = makeTopicKey(req.params.topic);
  const id = Number(req.params.id);
  if (!topic || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid topic or question id.' });
  }

  const validationError = validateQuestion(req.body, topic);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const questions = await loadEffectiveQuestions(topic);
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
  await persistQuestions(topic, questions);
  res.json(updatedQuestion);
});

router.delete('/:topic/:id', async (req, res) => {
  const topic = makeTopicKey(req.params.topic);
  const id = Number(req.params.id);

  if (!topic || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid topic or question id.' });
  }

  const filePath = getFilePath(topic);
  const topicExists = fs.existsSync(filePath) || (await topicCollectionExists(topic));
  if (!topicExists) {
    return res.status(404).json({ error: 'Topic not found.' });
  }

  const questions = await loadEffectiveQuestions(topic);
  const filtered = questions.filter((question) => Number(question.id) !== id);
  await persistQuestions(topic, filtered);
  res.json({ message: 'Question deleted successfully.' });
});

module.exports = router;
