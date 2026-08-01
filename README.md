# Task Backlog — Next.js App

A small Next.js (App Router) task-backlog app that lets you create, edit, delete, and rank project tasks. It includes a simple REST API and a UI for managing tasks, plus an AI-powered "Rank Backlog" feature that uses Gemini to score and explain task priority.

---

## Stack

- **Language(s):** TypeScript (+ small amounts of CSS)
- **Framework / runtime:** Next.js App Router (Next 16) + React 19
- **Notable libraries:** @google/genai (Gemini client), TailwindCSS, TypeScript

## What this is

One-sentence summary: a lightweight, single-page task backlog and prioritization demo that demonstrates how to integrate a Next.js App Router UI with server API routes and a generative-AI ranking step.


## How it's organized

```
app/                     Next.js App Router routes & pages
  api/
    tasks/               REST endpoints for task CRUD (GET, POST)
      route.ts
    tasks/[id]/          PATCH and DELETE for individual tasks
      route.ts
    prioritize/          POST endpoint that calls Gemini to rank tasks
      route.ts
  page.tsx               App entry — renders the TaskTable component

components/
  TaskTable.tsx          Client-side task table UI, modal for add/edit, ranking button
  StatusMessage.tsx?     (components referenced: ErrorBanner, EmptyState)

lib/
  tasks.ts               In-memory task store helpers (getTasks, addTask, updateTask, deleteTask, getTask)

types/
  task.ts                Task, TaskScore, TaskStatus, TaskSource type definitions

package.json             Scripts, dependencies and devDependencies (Next, React, @google/genai, tailwind, typescript)
README.md                (this file)
```

How it fits together:
- The UI is a single-page view (TaskTable) in `app/page.tsx`. `TaskTable` fetches and displays tasks from the local REST API and opens a modal to add/edit tasks.
- The API endpoints under `app/api/*` use a small in-memory store (`lib/tasks`). `POST /api/prioritize` sends task summaries to Gemini (via `@google/genai`), receives a ranked array with reasoning, and writes rank+reasoning back into the store. The client re-fetches `/api/tasks` to show updated ranks.

## How to run it

1. Install dependencies

```bash
npm install
# or
# yarn
# or
# pnpm install
```

2. (Optional) Create a `.env.local` with the Gemini API key to enable the "Rank Backlog" feature:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

3. Run the dev server

```bash
npm run dev
# or
# yarn dev
# or
# pnpm dev
```

Open http://localhost:3000

Build and run production:

```bash
npm run build
npm run start
```

Lint:

```bash
npm run lint
```

Notes:
- The app calls the AI in `app/api/prioritize/route.ts` with `@google/genai` and expects the model to return JSON with items: `{ id, rank, reasoning }`. The route expects `GEMINI_API_KEY` in `process.env`.
- Tasks are stored in an in-memory store (`lib/tasks`). That means data is not persisted across server restarts. For production usage, replace `lib/tasks` with a persistent data store (database or file-backed storage).

## API (quick reference)

- GET /api/tasks
  - Returns all tasks (client sorts by rank)
- POST /api/tasks
  - Creates a new task. Required: `title` (string), `status` (`todo` | `in-progress` | `done` | `blocked`)
  - Optional: `description`, `assignedTo` (array of strings), `deadline` (date string), `deadlineTime` (requires `deadline`), `effort` (1–5), `impact` (1–5)
- PATCH /api/tasks/:id
  - Partial update. Cannot change `id`, `source`, `createdAt`. Same validation rules as POST. `deadlineTime` cannot be set unless a date exists either in the patch or in the current task.
- DELETE /api/tasks/:id
  - Removes the task
- POST /api/prioritize
  - Sends a compact summary of all tasks to Gemini. Expects `GEMINI_API_KEY` configured. The AI must return a JSON array of items: `{ id, rank (int), reasoning (string) }`. The route writes `rank` + `reasoning` back to tasks.

Validation highlights:
- `status` must be one of: `todo`, `in-progress`, `done`, `blocked`
- `effort`/`impact` must be integers 1–5 when present
- `assignedTo` must be an array of strings (APIs accept array; the client sends comma-separated string parsed to an array)
- `deadlineTime` requires a `deadline` to be set

## Security & environment

- `GEMINI_API_KEY`: required for `/api/prioritize`. Keep this secret — do not commit to source control.
- This repo uses in-memory storage — do not use this code as-is for multi-user production without adding persistent storage and proper auth.

## Development notes & recommendations

- Replace the in-memory `lib/tasks` with a datastore (SQLite/Postgres/Firestore) and update the API to use async persistence.
- Add authentication and per-user tasks if this will be used by multiple users.
- Add validation and typed schemas (e.g., Zod) for request bodies to centralize rules currently implemented in routes.
- Add a `tests/` directory and server-side tests for the API (e.g., Vitest or Jest) and component tests (e.g., React Testing Library).

## Contributing

- Fork → branch → PR.
- Keep changes small and focused. If altering the data layer, include migration notes and how to seed the store.
- Add tests for any API behavior or business logic you change.

## Try asking
- How would I replace the in-memory `lib/tasks` with a SQLite-backed store and keep the same API shape?
- Where is the exact AI prompt constructed that Gemini receives, and how can I change the output format to include a confidence score?
- Can you add pagination and filtering (by status/assignee/deadline) to `GET /api/tasks` and show how the TaskTable UI should call it?
