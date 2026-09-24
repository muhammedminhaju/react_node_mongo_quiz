const fs = require('fs');
const path = require('path');
const { makeTopicKey } = require('./topicUtils');

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
    // Older files may predate the errorCount field.
    return parsed.map((question) => ({ errorCount: 0, ...question }));
  } catch (error) {
    return [];
  }
}

function writeQuestionsToFile(topic, questions) {
  fs.writeFileSync(getFilePath(topic), JSON.stringify(questions, null, 2), 'utf8');
}

module.exports = { dataDir, getFilePath, readQuestionsFromFile, writeQuestionsToFile };
