const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  topic: { type: String, required: true, index: true },
  id: { type: Number, required: true },
  question: { type: String, required: true },
  options: { type: [String], default: [] },
  answer: { type: String, required: true },
  explanation: { type: String, default: '' },
  errorCount: { type: Number, default: 0, min: 0 }
});

questionSchema.index({ topic: 1, id: 1 }, { unique: true });

const Question = mongoose.model('Question', questionSchema, 'questions');

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

async function topicHasQuestions(topicKey) {
  if (!isMongoConnected()) {
    return false;
  }
  const count = await Question.countDocuments({ topic: topicKey });
  return count > 0;
}

async function listMongoTopicKeys() {
  if (!isMongoConnected()) {
    return [];
  }
  return Question.distinct('topic');
}

async function getTopicQuestions(topicKey) {
  return Question.find({ topic: topicKey }).sort({ id: 1 }).lean();
}

// Wipes and recreates every document for the topic. Only appropriate for a
// full "replace this topic's dataset" import — it intentionally assigns
// fresh _ids, so any quiz reviews referencing the old documents will no
// longer resolve to a question (they keep their own answer/selectedAnswer
// snapshot, so they still display correctly, just without the question text).
async function replaceTopicQuestions(topicKey, questions) {
  if (!isMongoConnected()) {
    return false;
  }
  await Question.deleteMany({ topic: topicKey });
  if (questions.length) {
    await Question.insertMany(questions.map((question) => ({ ...question, topic: topicKey })));
  }
  return true;
}

async function deleteTopicQuestions(topicKey) {
  if (!isMongoConnected()) {
    return false;
  }
  const result = await Question.deleteMany({ topic: topicKey });
  return result.deletedCount > 0;
}

async function renameTopicQuestions(oldTopicKey, newTopicKey) {
  if (!isMongoConnected() || oldTopicKey === newTopicKey) {
    return false;
  }
  const result = await Question.updateMany({ topic: oldTopicKey }, { $set: { topic: newTopicKey } });
  return result.matchedCount > 0;
}

module.exports = {
  Question,
  isMongoConnected,
  topicHasQuestions,
  listMongoTopicKeys,
  getTopicQuestions,
  replaceTopicQuestions,
  deleteTopicQuestions,
  renameTopicQuestions
};
