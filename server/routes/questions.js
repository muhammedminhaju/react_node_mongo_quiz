const express = require('express');
const fs = require('fs');
const path = require('path');
const { makeTopicKey, validateQuestion } = require('../utils/topicUtils');
const { getTopicQuestionModel, topicCollectionExists } = require('../models/TopicQuestions');

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

router.get('/:topic', async (req, res) => {
  const topic = makeTopicKey(req.params.topic);
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required.' });
  }

  if (await topicCollectionExists(topic)) {
    const docs = await getTopicQuestionModel(topic).find().lean();
    return res.json(docs.map(({ _id, __v, ...rest }) => rest));
  }

  const questions = readQuestions(topic);
  return res.json(questions);
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

  const newQuestionData = {
    question: String(req.body.question).trim(),
    options: Array.isArray(req.body.options) ? req.body.options.map((option) => String(option).trim()) : [],
    answer: String(req.body.answer).trim(),
    explanation: req.body.explanation !== undefined ? String(req.body.explanation).trim() : ''
  };

  if (await topicCollectionExists(topic)) {
    const Model = getTopicQuestionModel(topic);
    const existing = await Model.find().lean();
    const nextId = existing.reduce((max, current) => Math.max(max, Number(current.id) || 0), 0) + 1;
    const created = await Model.create({ id: nextId, ...newQuestionData });
    const { _id, __v, ...plain } = created.toObject();
    return res.status(201).json(plain);
  }

  const questions = readQuestions(topic);
  const nextId = questions.reduce((max, current) => Math.max(max, Number(current.id) || 0), 0) + 1;
  const newQuestion = { id: nextId, ...newQuestionData };

  const filePath = getFilePath(topic);
  questions.push(newQuestion);
  fs.writeFileSync(filePath, JSON.stringify(questions, null, 2), 'utf8');
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

  const updatedData = {
    question: String(req.body.question).trim(),
    options: Array.isArray(req.body.options) ? req.body.options.map((option) => String(option).trim()) : [],
    answer: String(req.body.answer).trim(),
    explanation: req.body.explanation !== undefined ? String(req.body.explanation).trim() : ''
  };

  if (await topicCollectionExists(topic)) {
    const Model = getTopicQuestionModel(topic);
    const updated = await Model.findOneAndUpdate({ id }, updatedData, { new: true }).lean();
    if (!updated) {
      return res.status(404).json({ error: 'Question not found.' });
    }
    const { _id, __v, ...plain } = updated;
    return res.json(plain);
  }

  const questions = readQuestions(topic);
  const index = questions.findIndex((question) => Number(question.id) === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Question not found.' });
  }

  const updatedQuestion = { ...questions[index], ...updatedData };
  questions[index] = updatedQuestion;
  fs.writeFileSync(getFilePath(topic), JSON.stringify(questions, null, 2), 'utf8');
  res.json(updatedQuestion);
});

router.delete('/:topic/:id', async (req, res) => {
  const topic = makeTopicKey(req.params.topic);
  const id = Number(req.params.id);

  if (!topic || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid topic or question id.' });
  }

  if (await topicCollectionExists(topic)) {
    const result = await getTopicQuestionModel(topic).deleteOne({ id });
    if (!result.deletedCount) {
      return res.status(404).json({ error: 'Question not found.' });
    }
    return res.json({ message: 'Question deleted successfully.' });
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
