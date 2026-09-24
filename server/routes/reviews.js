const express = require('express');
const mongoose = require('mongoose');
const QuizReview = require('../models/QuizReview');
const { Question, isMongoConnected } = require('../models/Question');
const { readQuestionsFromFile, writeQuestionsToFile } = require('../utils/questionFiles');

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

// Flattens the populated questionId back into the question's own fields, so
// clients can keep reading review.questions[i].question/options/explanation
// as before. If the referenced question no longer exists (e.g. its topic was
// fully re-imported), or this is a review saved before questionId existed,
// falls back to whatever was snapshotted directly on the entry itself.
function flattenReview(review) {
  return {
    ...review,
    questions: (review.questions || []).map((entry) => {
      const question = entry.questionId && typeof entry.questionId === 'object' ? entry.questionId : null;
      return {
        id: question?.id ?? entry.id,
        question: question?.question || entry.question || '',
        options: question?.options || entry.options || [],
        answer: entry.answer,
        explanation: question?.explanation || entry.explanation || '',
        selectedAnswer: entry.selectedAnswer,
        timeSpentSeconds: entry.timeSpentSeconds || 0
      };
    })
  };
}

// A correct answer forgives one prior mistake (floored at 0); a wrong or
// unanswered question adds one. Mirrors the updated counts into each
// affected topic's JSON file too, so it stays the self-contained fallback.
async function applyErrorCountUpdates(topic, questions) {
  if (!isMongoConnected() || !questions.length) {
    return;
  }

  const bulkOps = questions.map((question) => {
    const isCorrect = question.selectedAnswer != null && String(question.selectedAnswer) === String(question.answer);
    return {
      updateOne: {
        filter: { _id: question.questionId },
        update: [
          {
            $set: {
              errorCount: {
                $max: [0, { $add: [{ $ifNull: ['$errorCount', 0] }, isCorrect ? -1 : 1] }]
              }
            }
          }
        ]
      }
    };
  });

  try {
    await Question.bulkWrite(bulkOps);

    const ids = questions.map((question) => question.questionId);
    const updatedDocs = await Question.find({ _id: { $in: ids } })
      .select('id errorCount')
      .lean();
    if (!updatedDocs.length) {
      return;
    }

    const errorCountById = new Map(updatedDocs.map((doc) => [doc.id, doc.errorCount]));
    const fileQuestions = readQuestionsFromFile(topic);
    let changed = false;
    const updatedFile = fileQuestions.map((fileQuestion) => {
      if (!errorCountById.has(fileQuestion.id)) {
        return fileQuestion;
      }
      changed = true;
      return { ...fileQuestion, errorCount: errorCountById.get(fileQuestion.id) };
    });

    if (changed) {
      writeQuestionsToFile(topic, updatedFile);
    }
  } catch (error) {
    // The review itself already saved successfully; error-count tracking is
    // best-effort on top of that.
  }
}

router.post('/', async (req, res) => {
  const { topic, totalQuestions, correct, wrong, unanswered, percentage, questions } = req.body || {};

  if (!topic || !String(topic).trim()) {
    return res.status(400).json({ error: 'Topic is required.' });
  }

  if (!Array.isArray(questions) || !questions.length) {
    return res.status(400).json({ error: 'Questions are required.' });
  }

  if (questions.some((question) => !question.questionId)) {
    return res.status(400).json({ error: 'Each question must include a questionId.' });
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
        questionId: question.questionId,
        selectedAnswer: question.selectedAnswer != null ? String(question.selectedAnswer) : null,
        answer: String(question.answer || ''),
        timeSpentSeconds: Math.max(0, Number(question.timeSpentSeconds) || 0)
      }))
    });

    await applyErrorCountUpdates(String(topic).trim(), questions);

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

    const reviews = await QuizReview.find(filter).sort({ date: -1 }).populate('questions.questionId').lean();
    res.json(reviews.map(flattenReview));
  } catch (error) {
    res.status(500).json({ error: 'Unable to load quiz reviews.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const review = await QuizReview.findById(req.params.id).populate('questions.questionId').lean();
    if (!review) {
      return res.status(404).json({ error: 'Review not found.' });
    }
    res.json(flattenReview(review));
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
