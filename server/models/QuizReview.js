const mongoose = require('mongoose');

const reviewQuestionSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    selectedAnswer: { type: String, default: null },
    // The correct answer is snapshotted here (not just read via questionId)
    // so a review stays accurate even if the question is later edited or
    // deleted (e.g. a full topic re-import replaces its documents).
    answer: { type: String, required: true },
    timeSpentSeconds: { type: Number, default: 0, min: 0 }
  },
  { _id: false }
);

const quizReviewSchema = new mongoose.Schema({
  topic: { type: String, required: true, index: true },
  date: { type: Date, default: Date.now },
  totalQuestions: { type: Number, required: true },
  correct: { type: Number, required: true },
  wrong: { type: Number, required: true },
  unanswered: { type: Number, required: true },
  percentage: { type: Number, required: true },
  timeTakenSeconds: { type: Number, default: null },
  timerMinutes: { type: Number, default: null },
  questions: { type: [reviewQuestionSchema], default: [] }
});

module.exports = mongoose.model('QuizReview', quizReviewSchema);
