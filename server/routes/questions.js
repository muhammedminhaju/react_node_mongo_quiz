const express = require('express');
const fs = require('fs');
const { makeTopicKey, validateQuestion } = require('../utils/topicUtils');
const { getFilePath, readQuestionsFromFile, writeQuestionsToFile } = require('../utils/questionFiles');
const { Question, topicHasQuestions, isMongoConnected } = require('../models/Question');

const router = express.Router();

function toClientQuestion(doc) {
  const { __v, topic, ...rest } = doc;
  return rest;
}

// MongoDB is treated as the primary store whenever it's connected, but every
// write also lands on disk so the app keeps working (minus DB-only features
// like saved reviews) if the database becomes unreachable later.
async function loadEffectiveQuestions(topic) {
  if (await topicHasQuestions(topic)) {
    const docs = await Question.find({ topic }).sort({ id: 1 }).lean();
    return docs.map(toClientQuestion);
  }
  return readQuestionsFromFile(topic);
}

router.get('/:topic', async (req, res) => {
  const topic = makeTopicKey(req.params.topic);
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required.' });
  }

  const questions = await loadEffectiveQuestions(topic);
  res.json(questions);
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

  const existing = await loadEffectiveQuestions(topic);
  const nextId = existing.reduce((max, current) => Math.max(max, Number(current.id) || 0), 0) + 1;
  const data = {
    question: String(req.body.question).trim(),
    options: Array.isArray(req.body.options) ? req.body.options.map((option) => String(option).trim()) : [],
    answer: String(req.body.answer).trim(),
    explanation: req.body.explanation !== undefined ? String(req.body.explanation).trim() : ''
  };
  const newQuestion = { id: nextId, ...data, errorCount: 0 };

  const fileQuestions = readQuestionsFromFile(topic);
  fileQuestions.push(newQuestion);
  writeQuestionsToFile(topic, fileQuestions);

  let created = newQuestion;
  if (isMongoConnected()) {
    try {
      const doc = await Question.create({ topic, ...newQuestion });
      created = toClientQuestion(doc.toObject());
    } catch (error) {
      // JSON file already has the authoritative write; a Mongo mirroring
      // failure shouldn't fail the request.
    }
  }

  res.status(201).json(created);
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

  const existing = await loadEffectiveQuestions(topic);
  let nextId = existing.reduce((max, current) => Math.max(max, Number(current.id) || 0), 0) + 1;

  const appended = incoming.map((question) => ({
    id: nextId++,
    question: String(question.question).trim(),
    options: question.options.map((option) => String(option).trim()),
    answer: String(question.answer).trim(),
    explanation: question.explanation !== undefined ? String(question.explanation).trim() : '',
    errorCount: 0
  }));

  const fileQuestions = readQuestionsFromFile(topic);
  const combinedFile = [...fileQuestions, ...appended];
  writeQuestionsToFile(topic, combinedFile);

  if (isMongoConnected()) {
    try {
      await Question.insertMany(appended.map((question) => ({ topic, ...question })));
    } catch (error) {
      // JSON file already has the authoritative write.
    }
  }

  res.status(201).json({
    message: `Appended ${appended.length} questions (total ${combinedFile.length}).`,
    added: appended.length,
    total: combinedFile.length
  });
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

  const data = {
    question: String(req.body.question).trim(),
    options: Array.isArray(req.body.options) ? req.body.options.map((option) => String(option).trim()) : [],
    answer: String(req.body.answer).trim(),
    explanation: req.body.explanation !== undefined ? String(req.body.explanation).trim() : ''
  };

  const fileQuestions = readQuestionsFromFile(topic);
  const fileIndex = fileQuestions.findIndex((question) => Number(question.id) === id);
  const existedInFile = fileIndex !== -1;
  if (existedInFile) {
    fileQuestions[fileIndex] = { ...fileQuestions[fileIndex], ...data };
    writeQuestionsToFile(topic, fileQuestions);
  }

  let updatedDoc = null;
  if (isMongoConnected()) {
    try {
      updatedDoc = await Question.findOneAndUpdate(
        { topic, id },
        { $set: data, $setOnInsert: { errorCount: 0 } },
        { new: true, upsert: true }
      ).lean();
    } catch (error) {
      // JSON file already has the authoritative write, if it existed there.
    }
  }

  if (!updatedDoc && !existedInFile) {
    return res.status(404).json({ error: 'Question not found.' });
  }

  res.json(updatedDoc ? toClientQuestion(updatedDoc) : { id, errorCount: fileQuestions[fileIndex]?.errorCount ?? 0, ...data });
});

router.delete('/:topic/:id', async (req, res) => {
  const topic = makeTopicKey(req.params.topic);
  const id = Number(req.params.id);

  if (!topic || Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid topic or question id.' });
  }

  const filePath = getFilePath(topic);
  const fileExists = fs.existsSync(filePath);
  const mongoHasTopic = await topicHasQuestions(topic);

  if (!fileExists && !mongoHasTopic) {
    return res.status(404).json({ error: 'Topic not found.' });
  }

  if (fileExists) {
    const filtered = readQuestionsFromFile(topic).filter((question) => Number(question.id) !== id);
    writeQuestionsToFile(topic, filtered);
  }

  if (isMongoConnected()) {
    try {
      await Question.deleteOne({ topic, id });
    } catch (error) {
      // JSON file already has the authoritative write, if it existed there.
    }
  }

  res.json({ message: 'Question deleted successfully.' });
});

module.exports = router;
