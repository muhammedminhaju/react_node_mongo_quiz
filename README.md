# Quiz Web Application

A full-stack quiz app: a React (Next.js) frontend and a Node.js/Express API with MongoDB storage and a JSON-file fallback.

## Features

**Quiz**
- Topic-based quizzes with an optional countdown timer (set when you pick a topic; auto-submits at zero)
- Configurable question count, or "load all questions"
- Question and option shuffling
- Most-missed questions (highest `errorCount`) are picked first
- Options can be selected and unselected
- Per-question warning that grows stronger as a question's error count rises
- Question navigator on the right: answered / not answered / bookmarked / current, click to jump
- Bookmark any question during a quiz
- Time spent is tracked for each question
- Revision mode across topics

**Review and reports**
- Review Answers page with All / Wrong / Not Wrong filters
- Negative marking: +1 correct, -1/3 wrong, 0 unanswered
- Topic Reviews page: every saved attempt per topic, with a scrollable, closable detail popup, the same filters and marks
- History and Reports (score trend, topic performance, answer breakdown, average time per quiz and per question)

**Content management**
- Add, edit and delete questions and topics
- Drag and drop a topic `.json` file to import it as a topic (replaces that topic)
- Append-import a `.json` file into an existing topic on the Question Management page
- Error Count column; questions are sorted by it, and questions with an error count of 0 are shaded light green

**App**
- Collapsible sidebar (remembered between visits), dark mode, responsive layout

## How error counts work

Each question has an `errorCount` (default and minimum 0). A wrong or unanswered result adds 1 and a correct answer subtracts 1, floored at 0. If a question in a JSON file has no `errorCount`, it is set to 0 automatically.

## Data storage

Questions are written to both MongoDB and `server/data/*.json` (dual-write).

- MongoDB connected: reads come from MongoDB, and every change is mirrored to the JSON file.
- MongoDB down: the app keeps working from the JSON files. Saving quiz reviews needs MongoDB and returns 503 without it.
- On startup, topics that exist only as JSON files are synced into MongoDB, and missing `errorCount` values are backfilled.

MongoDB collections:

| Collection | Contents |
| --- | --- |
| `questions` | One document per question: `topic`, `id`, `question`, `options`, `answer`, `explanation`, `errorCount`. Unique on `{topic, id}`. |
| `quizreviews` | One document per attempt: topic, score fields, time taken, and `questions[]` of `{questionId (ref to questions), selectedAnswer, answer, timeSpentSeconds}`. |

Quiz history, settings, timer choice, bookmarks and the quiz in progress live in the browser's `localStorage`.

## Project structure

- `client/`: Next.js (App Router) frontend. Pages: dashboard, quiz, result, review, revision, topic-reviews, history, reports, questions, topics, settings.
- `server/`: Express API
  - `routes/`: `questions.js`, `topics.js`, `reviews.js`
  - `models/`: `Question.js`, `QuizReview.js`
  - `utils/`: JSON file helpers, topic validation, startup sync
  - `data/`: JSON question files (fallback and mirror)

## Requirements

- Node.js
- MongoDB running locally (optional but recommended). Default URI: `mongodb://127.0.0.1:27017/quiz_app`

## Installation

```bash
npm install --prefix server
npm install --prefix client
npm install
```

Optionally copy `server/.env.example` to `server/.env` and adjust:

```text
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/quiz_app
```

## Run the app (development)

Start MongoDB first if you want database storage, then from the repo root:

```bash
npm run dev
```

This starts the API on port 4000 and the Next.js dev server on port 3000. Open `http://localhost:3000`.

The client proxies `/api/*` to the backend (set `BACKEND_URL` to change it, default `http://localhost:4000`), so no CORS setup is needed.

## Run the app (production)

```bash
npm run build          # builds the Next.js client
npm run start          # starts the Express API
npm run start:client   # starts the Next.js production server
```

## API endpoints

Topics
- `GET /api/topics`
- `POST /api/topics`
- `POST /api/topics/import`: drag-and-drop import, replaces the topic
- `PUT /api/topics/:name`: rename
- `DELETE /api/topics/:name`

Questions
- `GET /api/questions/:topic`
- `POST /api/questions/:topic`
- `POST /api/questions/:topic/import`: append from JSON
- `PUT /api/questions/:topic/:id`
- `DELETE /api/questions/:topic/:id`

Reviews (require MongoDB)
- `POST /api/reviews`: save an attempt and update error counts
- `GET /api/reviews?topic=<name>`
- `GET /api/reviews/topics`: per-topic attempt summary
- `GET /api/reviews/:id`
- `DELETE /api/reviews/:id`

## Question JSON format

```json
[
  {
    "id": 1,
    "question": "Capital of France?",
    "options": ["Paris", "Rome", "Madrid", "Berlin"],
    "answer": "Paris",
    "explanation": "Paris is the capital.",
    "errorCount": 0
  }
]
```

`errorCount` is optional.
