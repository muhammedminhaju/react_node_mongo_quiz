const mongoose = require('mongoose');

const reviewQuestionSchema = new mongoose.Schema(
  {
    id: mongoose.Schema.Types.Mixed,
    question: { type: String, required: true },
    options: { type: [String], default: [] },
    answer: { type: String, required: true },
    explanation: { type: String, default: '' },
    selectedAnswer: { type: String, default: null }
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
