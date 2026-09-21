const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const dataDir = path.join(__dirname, '..', 'data');
const TOPIC_RE = /^[a-zA-Z0-9][a-zA-Z0-9 _-]*$/;

function safeFileNameFromTopic(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'topic';
}

function getTopicFiles() {
  if (!fs.existsSync(dataDir)) {
    return [];
  }

  return fs
    .readdirSync(dataDir)
    .filter((file) => file.toLowerCase().endsWith('.json'))
    .map((file) => file.replace(/\.json$/, ''))
    .filter((name) => name && name !== 'topics');
}

function readTopicList() {
  const topicNames = getTopicFiles();
  return topicNames.map((name) => {
    const label = name
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    return { name, label };
  });
}

function resolveTopicFile(topicName) {
  const safeName = String(topicName || '').trim();
  if (!safeName || safeName.includes('..') || safeName.includes('/')) {
    return null;
  }

  const fileName = `${safeName}.json`;
  return path.join(dataDir, fileName);
}

router.get('/', (req, res) => {
  const topics = readTopicList();
  res.json(topics.map((topic) => topic.name));
});

router.post('/', (req, res) => {
  const { name, fileName } = req.body || {};

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Topic name is required.' });
  }

  if (!TOPIC_RE.test(String(name).trim())) {
    return res.status(400).json({ error: 'Topic name contains unsupported characters.' });
  }

  const topicValue = String(name).trim();
  const selectedFileName = String(fileName || '').trim() || `${safeFileNameFromTopic(topicValue)}.json`;

  if (!selectedFileName.toLowerCase().endsWith('.json')) {
    return res.status(400).json({ error: 'JSON file name must end with .json.' });
  }

  const safeName = selectedFileName.replace(/\\/g, '/');
  const cleanName = safeName.split('/').pop();
  const filePath = path.join(dataDir, cleanName);
  const fileKey = cleanName.replace(/\.json$/i, '');

  if (!fileKey || fileKey.includes('..')) {
    return res.status(400).json({ error: 'Invalid topic file name.' });
  }

  if (fs.existsSync(filePath)) {
    return res.status(409).json({ error: 'This topic already exists.' });
  }

  try {
    fs.writeFileSync(filePath, '[]', 'utf8');
    res.status(201).json({
      message: 'Topic created successfully.',
      topic: { name: fileKey, label: topicValue }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to create topic data file.' });
  }
});

router.put('/:name', (req, res) => {
  const currentTopic = String(req.params.name || '').trim();

  if (!currentTopic) {
    return res.status(400).json({ error: 'Topic name is required.' });
  }

  const sourcePath = resolveTopicFile(currentTopic);
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return res.status(404).json({ error: 'Topic not found.' });
  }

  const targetName = String(req.body?.newName || req.body?.name || '').trim();
  const targetFileName = String(req.body?.fileName || '').trim();

  if (!targetName && !targetFileName) {
    return res.status(400).json({ error: 'A new topic name or file name is required.' });
  }

  const finalName = targetName || currentTopic;
  const nextFileName = targetFileName || `${safeFileNameFromTopic(finalName)}.json`;

  if (!nextFileName.toLowerCase().endsWith('.json')) {
    return res.status(400).json({ error: 'JSON file name must end with .json.' });
  }

  const cleanFileName = nextFileName.replace(/\\/g, '/').split('/').pop();
  if (!cleanFileName || cleanFileName.includes('..')) {
    return res.status(400).json({ error: 'Invalid topic file name.' });
  }

  const targetPath = path.join(dataDir, cleanFileName);
  const nextTopicKey = cleanFileName.replace(/\.json$/i, '');

  if (sourcePath !== targetPath && fs.existsSync(targetPath)) {
    return res.status(409).json({ error: 'A topic with that file name already exists.' });
  }

  try {
    if (sourcePath !== targetPath) {
      fs.renameSync(sourcePath, targetPath);
    }

    res.json({
      message: 'Topic renamed successfully.',
      topic: {
        name: nextTopicKey,
        label: finalName
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to rename topic.' });
  }
});

router.delete('/:name', (req, res) => {
  const currentTopic = String(req.params.name || '').trim();

  if (!currentTopic) {
    return res.status(400).json({ error: 'Topic name is required.' });
  }

  const sourcePath = resolveTopicFile(currentTopic);
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return res.status(404).json({ error: 'Topic not found.' });
  }

  try {
    fs.unlinkSync(sourcePath);
    res.json({ message: 'Topic deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to delete topic.' });
  }
});

module.exports = router;
