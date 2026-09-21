const express = require('express');
const path = require('path');
const questionsRoutes = require('./routes/questions');
const topicsRoutes = require('./routes/topics');

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, '..', 'public');

app.use(express.json({ limit: '2mb' }));

app.use('/api/questions', questionsRoutes);
app.use('/api/topics', topicsRoutes);

app.use(express.static(publicDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/quiz', (req, res) => {
  res.sendFile(path.join(publicDir, 'quiz.html'));
});

app.get('/result', (req, res) => {
  res.sendFile(path.join(publicDir, 'result.html'));
});

app.get('/history', (req, res) => {
  res.sendFile(path.join(publicDir, 'history.html'));
});

app.get('/questions', (req, res) => {
  res.sendFile(path.join(publicDir, 'questions.html'));
});

app.get('/topics', (req, res) => {
  res.sendFile(path.join(publicDir, 'topics.html'));
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(publicDir, 'settings.html'));
});

app.get('/review', (req, res) => {
  res.sendFile(path.join(publicDir, 'review.html'));
});

app.get('/revision', (req, res) => {
  res.sendFile(path.join(publicDir, 'revision.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Quiz app running at http://localhost:${PORT}`);
});
