# RUNBOOK — AI Interview Prep Tracker

> Operational reference for running, building, and developing this project.

---

## Current State vs. Planned Architecture

Phases 0–8 are done: real server (scaffold, shared types, repository/services, API routes, parser keyword tables extracted to `lib/constants.ts`) plus a fully-featured, keyboard-navigable client (API helpers, hooks, editable table, add/delete rows, paste-notes-to-table flow, client-side filter/sort, live summary panel, empty states, toasts, row-insert highlight, arrow-key grid navigation). Only Phase 9 (walkthrough writeup) remains.

| | Now |
|---|---|
| Structure | `client/` + `server/` + `shared/` workspaces |
| Run command | `npm run dev` (runs both concurrently) |
| Server / API | Live at `http://localhost:3001/api`, pre-seeded, all endpoints in [API Reference](#api-reference) working |
| Client | Fetches `/api/rows` and `/api/summary`; editable table (click-to-edit, add/delete row, mark-done checkbox, arrow-key cell navigation); paste notes → `/api/parse` → `/api/rows/bulk`; status/company filters + "hide completed"; sortable column headers; summary panel with upcoming-interview list and prep-topic chips; missing-info tooltip warnings; toast notifications on mutation failure; new-row highlight fade |

Both `npm run dev -w server` and `npm run dev -w client` are fully functional today — verified by driving the running app with headless Chromium (see `BUILD_PLAN.md`'s Phase 4+5 and Phase 6+7 "Testing" sections for the exact scenarios, and the Phase 8 section for the keyboard-nav verification).

---

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | ≥ 20 LTS | `node -v` |
| npm | ≥ 10 | `npm -v` |
| Git | any | `git --version` |

No global installs required beyond Node/npm.

---

## Quick Start (after full scaffold)

```bash
# 1. Install all workspace dependencies (root + client + server + shared)
npm install

# 2. Start both client and server in development mode
npm run dev
```

- **Client** → [http://localhost:5173](http://localhost:5173)
- **Server** → [http://localhost:3001](http://localhost:3001)
- **API health** → [http://localhost:3001/api/health](http://localhost:3001/api/health)

The tracker opens pre-populated with seed data (Airtable, Airbnb, OpenAI, Vanta).

---

## Verifying the Server Manually

The fastest way to check the server in isolation (without the UI) is `curl` against `npm run dev -w server`:

```bash
npm run dev -w server                     # starts on :3001, seeded on boot
curl http://localhost:3001/api/health
curl http://localhost:3001/api/rows
curl http://localhost:3001/api/summary
```

See [API Reference](#api-reference) below for the full endpoint list, and `BUILD_PLAN.md`'s Phase 3 "Testing" section for the request/response scenarios each endpoint was verified against. For the full app (client + server together), run `npm run dev` from the root and open [http://localhost:5173](http://localhost:5173) — see `BUILD_PLAN.md`'s Phase 4+5 "Testing" section for the interaction scenarios already verified there.

---

## Workspace Scripts

All scripts run from the **repo root** via npm workspaces (`-w` flag).

### Development

```bash
npm run dev                   # client + server concurrently (root script)
npm run dev -w client         # Vite only
npm run dev -w server         # Express + tsx --watch only
```

### Build

```bash
npm run build                 # build all workspaces
npm run build -w client       # Vite production build → client/dist/
npm run build -w server       # tsup build → server/dist/
```

### Preview (production build)

```bash
npm run preview               # serve client/dist/ via Vite preview
```

### Lint

```bash
npm run lint                  # oxlint across all workspaces
npm run lint -w client
npm run lint -w server
```

### Type-check

```bash
npm run typecheck             # tsc --noEmit on all packages
npm run typecheck -w client
npm run typecheck -w server
npm run typecheck -w shared
```

---

## Environment Variables

No `.env` file is required to run in development. All defaults are set in code.

| Variable | Default | Where set | Purpose |
|---|---|---|---|
| `PORT` | `3001` | `server/src/index.ts` | Express listen port |
| `CLIENT_ORIGIN` | `http://localhost:5173` | `server/src/index.ts` | CORS allow-list |
| `NODE_ENV` | `development` | shell / CI | Enables request logging |

For production, create `server/.env`:

```
PORT=3001
CLIENT_ORIGIN=https://your-deployed-client.com
NODE_ENV=production
```

> Never commit `.env` files. The `.gitignore` covers `*.env` and `.env*`.

---

## API Reference

Base URL: `http://localhost:3001/api`

| Method | Path | Body / Query | Success | Description |
|---|---|---|---|---|
| `GET` | `/health` | — | `200` | Liveness check: `{ status, timestamp }` |
| `GET` | `/rows` | `?status=&company=&sortBy=&dir=` | `200` | Bare `TrackerRow[]`, filtered/sorted |
| `POST` | `/rows` | `{ opportunityId? }` | `201` | Add a row (blank, or another round on an existing opportunity) |
| `PATCH` | `/rows/:id` | `{ fields: Partial<TrackerRow> }` | `200` | Update row fields; `id`/`opportunityId`/`createdAt` immutable |
| `DELETE` | `/rows/:id` | — | `204` | Delete row, empty body |
| `POST` | `/rows/bulk` | `{ rows: TrackerRow[] }` | `201` | Bulk insert; returns `{ rows, count }` |
| `POST` | `/parse` | `{ raw: string }` | `200` | Parse text → `{ rows: TrackerRow[] }` (not persisted) |
| `GET` | `/summary` | — | `200` | Bare `TrackerSummary` metrics |

All mutation endpoints validate with Zod; invalid requests return `400` with `{ error, details }`. Unknown row ids return `404`. Unmatched routes return `404`. Malformed JSON bodies return `400` (not the Express default `500`).

---

## Database

The server uses an **in-memory repository** (`Map<string, TrackerRow>`) that is seeded at startup. Data resets on server restart.

### Swapping to Postgres

1. Create `server/src/db/postgresRepository.ts` implementing `ITrackerRepository`
2. In `server/src/index.ts`, replace:
   ```ts
   // Before
   import { InMemoryRepository } from './db/inMemoryDb.js';
   const repo = new InMemoryRepository();

   // After
   import { PostgresRepository } from './db/postgresRepository.js';
   const repo = new PostgresRepository(process.env.DATABASE_URL!);
   ```
3. No other files change — routes, services, and the client are unaffected.

---

## Project Structure

```
interview-prep/
├── client/                  # Vite + React + TypeScript
│   ├── src/
│   │   ├── api/             # Typed fetch helpers
│   │   ├── components/      # InputPanel, TrackerTable, SummaryPanel, shared
│   │   ├── hooks/           # useRows, useSummary, useParseInput
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   └── vite.config.ts       # /api proxy → localhost:3001
├── server/                  # Express + TypeScript
│   ├── src/
│   │   ├── db/              # interface.ts · inMemoryDb.ts · seed.ts
│   │   ├── routes/          # rows.ts · parse.ts · summary.ts
│   │   ├── services/        # parser.ts · summary.ts · tableUtils.ts
│   │   ├── schemas/         # tracker.ts — Zod schemas
│   │   ├── middleware/      # asyncHandler.ts · errorHandler.ts
│   │   ├── lib/             # httpError.ts · constants.ts (parser keyword/pattern tables)
│   │   └── index.ts
│   └── tsconfig.json
├── shared/                  # Shared TypeScript types (client + server)
│   └── types.ts
├── package.json             # Root workspace: scripts + concurrently
├── BUILD_PLAN.md            # Implementation plan and architecture decisions
└── RUNBOOK.md               # This file
```

---

## Common Issues

### Port already in use

```bash
lsof -ti :3001 | xargs kill -9   # free server port
lsof -ti :5173 | xargs kill -9   # free client port
```

### `tsx` not found after install

```bash
npm install -w server             # reinstall server deps
```

### TypeScript errors in shared types

```bash
npm run typecheck -w shared       # validate shared package first
```

### Vite proxy not forwarding to server

Confirm `vite.config.ts` has:
```ts
server: {
  proxy: {
    '/api': 'http://localhost:3001'
  }
}
```
And that the server is running before the client dev server starts.

---

## Deployment Notes (future)

- **Client:** build with `npm run build -w client`, serve `client/dist/` as static files (Vercel, Netlify, or nginx)
- **Server:** build with `npm run build -w server`, run `node server/dist/index.js` (Railway, Render, Fly.io)
- **DB:** swap `InMemoryRepository` for `PostgresRepository` + set `DATABASE_URL` env var
- **CORS:** set `CLIENT_ORIGIN` to the production client URL
