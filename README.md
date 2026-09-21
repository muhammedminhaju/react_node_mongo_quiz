# Quiz Web Application

A full-stack quiz app: a React (Next.js) frontend and a Node.js/Express JSON API backend.

## Features

- Topic-based quiz selection
- JSON-backed question storage
- Randomized question and option shuffling
- Quiz history saved in localStorage
- Admin pages for adding, editing, and deleting questions and topics
- Revision mode across multiple topics
- Responsive dashboard UI
- Settings storage, including dark mode

## Project Structure

- `server/` – Express JSON API (`/api/questions`, `/api/topics`), backed by `server/data/*.json`
- `client/` – Next.js (App Router) React frontend

## Installation

```bash
npm install --prefix server
npm install --prefix client
npm install
```

## Run the app (development)

From the repo root, this starts both the API (port 4000) and the Next.js dev server (port 3000):

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

The client proxies `/api/*` requests to the backend (configurable via the `BACKEND_URL` env var, default `http://localhost:4000`), so no CORS setup is needed.

## Run the app (production)

```bash
npm run build          # builds the Next.js client
npm run start           # starts the Express API
npm run start:client    # starts the Next.js production server
```

## API Endpoints

- `GET /api/topics`
- `POST /api/topics`
- `PUT /api/topics/:name`
- `DELETE /api/topics/:name`
- `GET /api/questions/:topic`
- `POST /api/questions/:topic`
- `PUT /api/questions/:topic/:id`
- `DELETE /api/questions/:topic/:id`

## Notes

- Quiz history and settings are stored in the browser via `localStorage`.
- Question and topic data are stored in JSON files on the server (`server/data/`).
- Example questions are included for History, Biology, Physics, Chemistry, Mathematics, and Computer Science.
