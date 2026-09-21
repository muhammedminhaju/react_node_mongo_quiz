# Quiz Web Application

A full-stack quiz app built with Node.js, Express, HTML, CSS, and vanilla JavaScript.

## Features

- Topic-based quiz selection
- JSON-backed question storage
- Randomized question and option shuffling
- Quiz history saved in localStorage
- Admin routes for adding, editing, and deleting questions
- Revision mode across multiple topics
- Responsive dashboard UI
- Settings storage

## Project Structure

- `server/server.js` – Express server entry point
- `server/routes/questions.js` – question CRUD API
- `server/routes/topics.js` – topic listing/creation API
- `server/data/*.json` – example topic JSON datasets
- `public/*` – HTML, CSS, JS frontend files

## Installation

```bash
npm install
```

## Run the app

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

## API Endpoints

- `GET /api/topics`
- `GET /api/questions/:topic`
- `POST /api/questions/:topic`
- `PUT /api/questions/:topic/:id`
- `DELETE /api/questions/:topic/:id`

## Notes

- Quiz history is stored in the browser via `localStorage`.
- Question and topic data are stored in JSON files on the server.
- Example questions are included for History, Biology, Physics, Chemistry, Mathematics, and Computer Science.
