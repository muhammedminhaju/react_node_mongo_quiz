const express = require('express');
const mongoose = require('mongoose');
const QuizReview = require('../models/QuizReview');

const router = express.Router();

function isDbReady() {
  return mongoose.connection.readyState === 1;
}

function requireDb(req, res, next) {
  if (!isDbReady()) {
    return res.status(503).json({ error: 'Review storage is unavailable. Check the MongoDB connection.' });
  }
  next();
}

router.use(requireDb);

router.post('/', async (req, res) => {
  const { topic, totalQuestions, correct, wrong, unanswered, percentage, questions } = req.body || {};

  if (!topic || !String(topic).trim()) {
    return res.status(400).json({ error: 'Topic is required.' });
  }

  if (!Array.isArray(questions) || !questions.length) {
    return res.status(400).json({ error: 'Questions are required.' });
  }

  try {
    const review = await QuizReview.create({
      topic: String(topic).trim(),
      totalQuestions: Number(totalQuestions) || questions.length,
      correct: Number(correct) || 0,
      wrong: Number(wrong) || 0,
      unanswered: Number(unanswered) || 0,
      percentage: Number(percentage) || 0,
      timeTakenSeconds: req.body.timeTakenSeconds != null ? Number(req.body.timeTakenSeconds) : null,
      timerMinutes: req.body.timerMinutes != null ? Number(req.body.timerMinutes) : null,
      questions: questions.map((question) => ({
        id: question.id,
        question: String(question.question || ''),
        options: Array.isArray(question.options) ? question.options.map((option) => String(option)) : [],
        answer: String(question.answer || ''),
        explanation: question.explanation ? String(question.explanation) : '',
        selectedAnswer: question.selectedAnswer != null ? String(question.selectedAnswer) : null
      }))
    });
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ error: 'Unable to save quiz review.' });
  }
});

router.get('/topics', async (req, res) => {
  try {
    const summary = await QuizReview.aggregate([
      {
        $group: {
          _id: '$topic',
          attempts: { $sum: 1 },
          averagePercentage: { $avg: '$percentage' },
          lastAttemptAt: { $max: '$date' }
        }
      },
      { $sort: { lastAttemptAt: -1 } }
    ]);

    res.json(
      summary.map((item) => ({
        topic: item._id,
        attempts: item.attempts,
        averagePercentage: Math.round(item.averagePercentage || 0),
        lastAttemptAt: item.lastAttemptAt
      }))
    );
  } catch (error) {
    res.status(500).json({ error: 'Unable to load topic review summary.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.topic) {
      filter.topic = String(req.query.topic).trim();
    }

    const reviews = await QuizReview.find(filter).sort({ date: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Unable to load quiz reviews.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const review = await QuizReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found.' });
    }
    res.json(review);
  } catch (error) {
    res.status(400).json({ error: 'Invalid review id.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const review = await QuizReview.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found.' });
    }
    res.json({ message: 'Review deleted successfully.' });
  } catch (error) {
    res.status(400).json({ error: 'Invalid review id.' });
  }
});

module.exports = router;
