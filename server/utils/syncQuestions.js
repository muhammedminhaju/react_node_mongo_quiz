const fs = require('fs');
const path = require('path');
const { Question, isMongoConnected } = require('../models/Question');

const dataDir = path.join(__dirname, '..', 'data');

function normalizeErrorCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

// Any question missing the errorCount key (files predating this feature) gets
// it added and persisted back to disk, so the file itself becomes the
// self-healed source of truth going forward.
function backfillErrorCountInFiles() {
  if (!fs.existsSync(dataDir)) {
    return;
  }

  const files = fs.readdirSync(dataDir).filter((file) => file.toLowerCase().endsWith('.json'));
  for (const file of files) {
    const filePath = path.join(dataDir, file);
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const questions = JSON.parse(raw);
      if (!Array.isArray(questions) || !questions.length) {
        continue;
      }

      let changed = false;
      const updated = questions.map((question) => {
        if (question.errorCount !== undefined) {
          return question;
        }
        changed = true;
        return { ...question, errorCount: 0 };
      });

      if (changed) {
        fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf8');
        console.log(`Added default errorCount to ${file}.`);
      }
    } catch (error) {
      console.error(`Failed to backfill errorCount in ${file}:`, error.message);
    }
  }
}

// One-time-per-startup backfill: any topic that only exists as a JSON file
// (never touched via the app since MongoDB was wired up) gets its questions
// inserted into the shared `questions` collection, so quiz-taking has stable
// _ids to reference from saved reviews right away. Topics already present in
// Mongo are left untouched, so in-progress edits are never overwritten.
async function syncFileTopicsToMongo() {
  backfillErrorCountInFiles();

  if (!isMongoConnected() || !fs.existsSync(dataDir)) {
    return;
  }

  const backfillResult = await Question.updateMany({ errorCount: { $exists: false } }, { $set: { errorCount: 0 } });
  if (backfillResult.modifiedCount) {
    console.log(`Added default errorCount to ${backfillResult.modifiedCount} existing question(s) in MongoDB.`);
  }

  const files = fs.readdirSync(dataDir).filter((file) => file.toLowerCase().endsWith('.json'));

  for (const file of files) {
    const topic = file.replace(/\.json$/i, '');
    try {
      const raw = fs.readFileSync(path.join(dataDir, file), 'utf8');
      const questions = JSON.parse(raw);
      if (!Array.isArray(questions) || !questions.length) {
        continue;
      }

      const existingCount = await Question.countDocuments({ topic });
      if (existingCount > 0) {
        continue;
      }

      await Question.insertMany(
        questions.map((question) => ({
          topic,
          id: question.id,
          question: question.question,
          options: Array.isArray(question.options) ? question.options : [],
          answer: question.answer,
          explanation: question.explanation || '',
          errorCount: normalizeErrorCount(question.errorCount)
        })),
        { ordered: false }
      );
      console.log(`Synced ${questions.length} questions for topic "${topic}" into MongoDB.`);
    } catch (error) {
      console.error(`Failed to sync topic "${topic}" into MongoDB:`, error.message);
    }
  }
}

module.exports = syncFileTopicsToMongo;
