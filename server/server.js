require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const syncFileTopicsToMongo = require('./utils/syncQuestions');
const questionsRoutes = require('./routes/questions');
const topicsRoutes = require('./routes/topics');
const reviewsRoutes = require('./routes/reviews');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json({ limit: '2mb' }));

app.use('/api/questions', questionsRoutes);
app.use('/api/topics', topicsRoutes);
app.use('/api/reviews', reviewsRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

connectDB()
  .then(syncFileTopicsToMongo)
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Quiz API running at http://localhost:${PORT}`);
    });
  });
