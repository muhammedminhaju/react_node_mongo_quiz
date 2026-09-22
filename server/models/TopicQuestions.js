const mongoose = require('mongoose');

const COLLECTION_PREFIX = 'questions_';

const questionSchema = new mongoose.Schema(
  {
    id: mongoose.Schema.Types.Mixed,
    question: { type: String, required: true },
    options: { type: [String], default: [] },
    answer: { type: String, required: true },
    explanation: { type: String, default: '' }
  },
  { _id: false }
);

const modelCache = new Map();

function collectionNameForTopic(topicKey) {
  return `${COLLECTION_PREFIX}${topicKey}`;
}

function getTopicQuestionModel(topicKey) {
  const collectionName = collectionNameForTopic(topicKey);
  if (modelCache.has(collectionName)) {
    return modelCache.get(collectionName);
  }

  const modelName = `TopicQuestions_${topicKey}`;
  const model = mongoose.models[modelName] || mongoose.model(modelName, questionSchema, collectionName);
  modelCache.set(collectionName, model);
  return model;
}

async function topicCollectionExists(topicKey) {
  if (mongoose.connection.readyState !== 1) {
    return false;
  }
  const collections = await mongoose.connection.db
    .listCollections({ name: collectionNameForTopic(topicKey) })
    .toArray();
  return collections.length > 0;
}

async function listMongoTopicKeys() {
  if (mongoose.connection.readyState !== 1) {
    return [];
  }
  const collections = await mongoose.connection.db.listCollections().toArray();
  return collections
    .map((collection) => collection.name)
    .filter((name) => name.startsWith(COLLECTION_PREFIX))
    .map((name) => name.slice(COLLECTION_PREFIX.length));
}

async function dropTopicCollection(topicKey) {
  if (mongoose.connection.readyState !== 1) {
    return false;
  }
  const exists = await topicCollectionExists(topicKey);
  if (!exists) {
    return false;
  }
  await mongoose.connection.db.dropCollection(collectionNameForTopic(topicKey));
  modelCache.delete(collectionNameForTopic(topicKey));
  return true;
}

module.exports = {
  getTopicQuestionModel,
  topicCollectionExists,
  listMongoTopicKeys,
  dropTopicCollection
};
