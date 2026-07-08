# RUNBOOK — AI Interview Prep Tracker

> Operational reference for running, building, and developing this project.

---

## Current State vs. Planned Architecture

Phases 0–8 are done: real server (scaffold, shared types, repository/services, API routes) plus a fully-featured, keyboard-navigable client (API helpers, hooks, editable table, add/delete rows, paste-notes-to-table flow, client-side filter/sort, live summary panel, empty states, toasts, row-insert highlight, arrow-key grid navigation). Only Phase 9 (walkthrough writeup) remains.

**Post-Phase-8 change:** the deterministic regex parser was replaced with a real OpenAI extraction call (`server/src/services/openaiClient.ts`) — see [Environment Variables](#environment-variables) for the required `OPENAI_API_KEY`. "Load Sample" was removed from the client since it no longer fits the one-submit-one-row, LLM-backed flow.

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

`server/src/index.ts` loads `server/.env` automatically via `dotenv/config` (the first import in the file) — create the file for local dev; on a real host (Railway/Render/etc.) set these as platform env vars instead and skip the file.

| Variable | Default | Required? | Purpose |
|---|---|---|---|
| `OPENAI_API_KEY` | — | **Yes**, for Generate Tracker | Used by `services/openaiClient.ts` to extract structured rows from pasted notes. Without it, `POST /api/parse` returns a `500` with a clear "not configured" message — the rest of the app (seeded data, editing, filters) works fine either way. |
| `OPENAI_MODEL` | `gpt-4o-mini` | No | Model used for extraction (must support Structured Outputs / `response_format: json_schema`) |
| `PORT` | `3001` | No | Express listen port |
| `CLIENT_ORIGIN` | `http://localhost:5173` | No | CORS allow-list |
| `NODE_ENV` | `development` | No | Enables request logging |

Create `server/.env` (gitignored — see `.gitignore` at the repo root):

```
OPENAI_API_KEY=sk-...
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development
```

> Never commit `.env` files or paste a real key into a prompt, commit message, or this file. Get a key at platform.openai.com if you don't have one.

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
│   │   ├── services/        # parser.ts · openaiClient.ts (LLM extraction) · summary.ts · tableUtils.ts
│   │   ├── schemas/         # tracker.ts — Zod schemas
│   │   ├── middleware/      # asyncHandler.ts · errorHandler.ts
│   │   ├── lib/             # httpError.ts
│   │   └── index.ts
│   ├── tsconfig.json
│   └── tsup.config.ts       # noExternal: ['@interview-prep/shared'] — see Deployment (Railway)
├── shared/                  # Shared TypeScript types (client + server)
│   └── types.ts
├── Dockerfile                # Builds + runs the server only, for Railway
├── .dockerignore
├── railway.json               # Points Railway at the Dockerfile + healthcheck
├── .gitignore
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

## Deployment (Railway)

The root `Dockerfile` builds and runs **the server only** — the client is a separate static-hosting deploy (Vercel/Netlify/nginx), not part of this image. `railway.json` points Railway at the Dockerfile and sets a `/api/health` healthcheck.

### Deploy

1. In Railway, create a service from this repo (or `railway up` from the repo root with the Railway CLI). It auto-detects `railway.json` → `Dockerfile`.
2. Set environment variables on the Railway service (Settings → Variables):
   - `OPENAI_API_KEY` — **required** for Generate Tracker (see [Environment Variables](#environment-variables))
   - `CLIENT_ORIGIN` — the deployed client's URL (e.g. `https://your-app.vercel.app`), so CORS allows it
   - `OPENAI_MODEL` — optional, defaults to `gpt-4o-mini`
   - Do **not** set `PORT` — Railway injects its own and the server already reads `process.env.PORT`
3. Deploy the client separately (`npm run build -w client` → serve `client/dist/`), pointing its API calls at the Railway service's URL.

### How the image is built (why it looks the way it does)

- **Multi-stage, server-only.** `build-deps` (full install) → `build` (compiles `server/dist/index.js` via `npm run build -w server`) → `prod-deps` (runtime-only install, no devDependencies, no client) → `runtime` (final image: just `node_modules` + `server/dist`). Keeps the deployed image free of TypeScript/tsup/oxlint/the client's React toolchain.
- **`server/tsup.config.ts` sets `noExternal: ['@interview-prep/shared']`.** This was a real bug caught while building this Dockerfile, not a preemptive guess: tsup externalizes anything listed in `package.json` `dependencies` by default, and `@interview-prep/shared` is listed there (it's a workspace package, not an npm one). Files that only did `import type {...}` from shared were unaffected (type-only imports are erased at compile time either way), but `schemas/tracker.ts` and `services/openaiClient.ts` import real *values* (`INTERVIEW_STATUSES`, etc.) — those imports were silently left as an unresolved `from "@interview-prep/shared"` in the compiled output. Running the built bundle directly on the host "worked" anyway, purely by accident: Node's bare-specifier resolution walks up from the script's own directory looking for `node_modules`, and it happened to find the real monorepo's workspace symlink. That symlink doesn't exist in a real deployment — the built image would have crashed on the very first request that hit `openaiClient.ts`, i.e. the first "Generate Tracker" click. Caught by actually running `docker build` + `docker run` + a live request against the container, not by reading the build log.
- Verified end-to-end against this Dockerfile: container boots, `/api/health` and `/api/rows` respond correctly with no host filesystem access, and `/api/parse` correctly calls OpenAI when a real key is injected via `--env-file` at `docker run` time (never baked into the image).

### Not yet done

- **DB:** still `InMemoryRepository` — data resets on every deploy/restart. Swap for `PostgresRepository` + set `DATABASE_URL` when ready (see the repository-swap note earlier in this file).
- No CI wired up to actually run `docker build` on push — worth adding before this is relied on for real deploys, since the bug above shows a green `tsc`/`vite build` doesn't guarantee the container actually boots.
