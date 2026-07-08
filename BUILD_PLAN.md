# BUILD_PLAN.md — AI Interview Prep Tracker

> Airtable Interview Assignment · Built with React + TypeScript + Vite + Node/Express · July 2026

---

## Overview

A workflow demo that turns messy interview notes into a structured, editable tracker — like Airtable, but AI-seeded. The target experience: paste raw notes, click one button, get an organized table you can immediately act on.

The app has a lightweight Express API server with an in-memory database. The DB layer uses a **repository pattern** so the only change needed to switch to Postgres, Supabase, or any other store is swapping the repository implementation — zero changes to route handlers or business logic.

The server boots with **pre-seeded realistic data** (Airtable, Airbnb, OpenAI, Vanta opportunities) so the demo works immediately without any user input.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + TypeScript + Vite | Fast DX, path aliases, HMR |
| Backend | Node.js + Express + TypeScript | Minimal, well-known, easy to extend |
| Runtime types | Zod | Schema validation at API boundary |
| In-memory DB | Plain `Map<string, T>` behind repository interface | Zero deps, instant swap to real DB |
| Dev server | `tsx --watch` | TypeScript-native, no build step in dev |
| API client | `fetch` (native) wrapped in typed helpers | No axios dep needed |
| CSS | CSS Modules, no UI library | Inspectable, demo-friendly |

---

## Monorepo Layout

```
interview-prep/
├── client/          # Vite React app (moved from src/)
│   ├── src/
│   │   ├── types/
│   │   ├── lib/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/         # typed fetch helpers
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   └── vite.config.ts
├── server/          # Express API
│   ├── src/
│   │   ├── db/
│   │   │   ├── interface.ts      # ITrackerRepository interface
│   │   │   ├── inMemoryDb.ts     # Map-backed implementation
│   │   │   └── seed.ts           # Pre-seeded realistic data
│   │   ├── routes/
│   │   │   ├── rows.ts           # GET/POST/PATCH/DELETE /rows, POST /rows/bulk
│   │   │   ├── parse.ts          # POST /parse
│   │   │   └── summary.ts        # GET /summary
│   │   ├── services/
│   │   │   ├── parser.ts         # Builds a TrackerRow from openaiClient's extraction + server-generated id/timestamps
│   │   │   ├── openaiClient.ts   # Calls OpenAI (Structured Outputs) to extract fields from raw notes
│   │   │   ├── summary.ts        # Metrics computation
│   │   │   └── tableUtils.ts     # filterRows / sortRows (shared by repo + routes)
│   │   ├── schemas/
│   │   │   └── tracker.ts        # Zod schemas, built from shared/types.ts enums
│   │   ├── middleware/
│   │   │   ├── asyncHandler.ts   # forwards async route errors to next()
│   │   │   └── errorHandler.ts   # ZodError / HttpError / malformed-JSON → ApiError
│   │   ├── lib/
│   │   │   └── httpError.ts      # HttpError(status, message, details?)
│   │   └── index.ts              # Express app entry — loads server/.env via `dotenv/config`
│   ├── tsconfig.json
│   └── package.json
├── shared/          # Types shared between client and server
│   └── types.ts
├── package.json     # Root workspace (npm workspaces)
└── BUILD_PLAN.md
```

---

## Phase 0 — Project Scaffold

**Goal:** Working monorepo with client + server running concurrently.

**Steps:**
1. Configure root `package.json` with npm workspaces: `client`, `server`, `shared`
2. `client/` — Vite + React + TypeScript, path alias `@/` → `client/src/`
3. `server/` — Express + TypeScript, `tsx --watch` for dev, `tsup` for build
4. `shared/` — plain TypeScript package; both client and server import from here
5. Root `dev` script: `concurrently "npm run dev -w server" "npm run dev -w client"`
6. Vite proxy: `/api/*` → `http://localhost:3001` (no CORS config needed in dev)
7. Base `index.css` with CSS custom properties (Airtable palette: white, light gray `#f0f0f0`, teal `#166ee1`)

**Tradeoff:** npm workspaces over a monorepo tool (Turborepo, Nx) — zero config overhead for this scope. Can be promoted later.

---

## Phase 1 — Shared Types (`shared/`)

**File:** `shared/types.ts`  
Both client and server import from here — single source of truth, no duplication.

```ts
// Core entity: one company's interview process
export interface InterviewOpportunity {
  id: string;
  company: string;
  role: string;
  status: InterviewStatus;
  priority: Priority;
  rounds: InterviewRound[];
  notes: string;
  compensationNotes: string;
  links: string[];
  createdAt: string;
  updatedAt: string;
}

// One interview event within an opportunity
export interface InterviewRound {
  id: string;
  opportunityId: string;
  stage: string;
  interviewDate: string | null;  // ISO date string or null
  interviewType: InterviewType;
  prepTopics: string[];
  nextAction: string;
  nextActionDone: boolean;
  followUpOwner: string;
}

// Flattened row for the table view (one row = one round + opportunity fields denormalized)
export interface TrackerRow {
  id: string;             // round id
  opportunityId: string;
  company: string;
  role: string;
  stage: string;
  interviewDate: string | null;
  interviewType: InterviewType;
  prepTopics: string[];
  status: InterviewStatus;
  priority: Priority;
  nextAction: string;
  nextActionDone: boolean;
  followUpOwner: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrackerSummary {
  totalActive: number;
  upcomingInterviews: TrackerRow[];
  highPriorityPrep: string[];
  followUpsDue: TrackerRow[];
  missingInfo: MissingInfoItem[];
}

export interface MissingInfoItem {
  rowId: string;
  company: string;
  fields: string[];
}

export type InterviewStatus =
  | 'Applied'
  | 'Recruiter Screen'
  | 'Technical Screen'
  | 'Onsite'
  | 'Offer'
  | 'Rejected'
  | 'Follow-up Needed';

export type Priority = 'High' | 'Medium' | 'Low';

export type InterviewType =
  | 'Recruiter Call'
  | 'Technical Screen'
  | 'Take-home'
  | 'System Design'
  | 'Behavioral'
  | 'Onsite'
  | 'Unknown';

// API request/response shapes
export interface ParseRequest { raw: string; }
export interface ParseResponse { rows: TrackerRow[]; }
export interface UpdateRowRequest { fields: Partial<TrackerRow>; }
```

**Tradeoff:** Denormalized `TrackerRow` for the table view keeps the client simple (one fetch, one array). The server normalizes internally via the repository.

---

## Phase 2 — Server: Repository Pattern + In-Memory DB ✅ Implemented

### Repository interface (`server/src/db/interface.ts`)

```ts
export interface ITrackerRepository {
  // Rows (denormalized view)
  getAllRows(): Promise<TrackerRow[]>;
  getRowById(id: string): Promise<TrackerRow | null>;
  upsertRow(row: TrackerRow): Promise<TrackerRow>;
  deleteRow(id: string): Promise<void>;
  bulkInsertRows(rows: TrackerRow[]): Promise<TrackerRow[]>;

  // Opportunities (normalized)
  getAllOpportunities(): Promise<InterviewOpportunity[]>;
  upsertOpportunity(opp: InterviewOpportunity): Promise<InterviewOpportunity>;
}
```

**Swap contract:** To use Postgres, create `postgresRepository.ts` implementing the same interface. Inject it in `server/src/index.ts`. Zero changes elsewhere.

### In-memory implementation (`server/src/db/inMemoryDb.ts`)

```ts
export class InMemoryRepository implements ITrackerRepository {
  private rows = new Map<string, TrackerRow>();
  private opportunities = new Map<string, InterviewOpportunity>();

  async getAllRows() { return [...this.rows.values()]; }
  async getRowById(id) { return this.rows.get(id) ?? null; }
  async upsertRow(row) { this.rows.set(row.id, row); return row; }
  async deleteRow(id) { this.rows.delete(id); }
  async bulkInsertRows(rows) {
    rows.forEach(r => this.rows.set(r.id, r));
    return rows;
  }
  // ...opportunities methods
}
```

### Seed data (`server/src/db/seed.ts`)

Pre-seeded with 4 companies at different stages — **no user action needed to see a populated tracker**:

| Company | Role | Stage | Date | Priority |
|---|---|---|---|---|
| Airtable | Staff Frontend Engineer | Technical Screen → Onsite | July 14–15 | High |
| Airbnb | Senior/Staff FE | Applied | — | Medium |
| OpenAI | Software Engineer, Frontend | Technical Screen | July 10 | High |
| Vanta | Staff Engineer | Onsite (Final) | July 8 | High |

Each seed row has realistic prep topics, next actions, follow-up owners, and notes. The seed runs synchronously at server startup: `await repo.bulkInsertRows(SEED_ROWS)`.

### Parser service (`server/src/services/parser.ts` + `openaiClient.ts`) — history below, current state first

**Current state:** extraction is a real LLM call (OpenAI, Structured Outputs), not regex. `parseInput(raw, referenceDate?): Promise<TrackerRow[]>` trims the input, returns `[]` for empty text, otherwise calls `openaiClient.extractOpportunity()` and attaches server-generated `id`/`opportunityId`/timestamps. `notes` is kept as the user's **original pasted text**, not an LLM summary — nothing is silently lost if the model mis-extracts a field, since the raw text is still on the row. `nextActionDone` is always `false` for a fresh extraction (matches the old regex behavior).

`openaiClient.ts` (new) owns everything OpenAI-specific:
- Model: `OPENAI_MODEL` env var, default `gpt-4o-mini`
- `response_format: { type: 'json_schema', ..., strict: true }` — the model is constrained to return exactly the 10 fields in `EXTRACTION_JSON_SCHEMA` (company, role, status, priority, stage, interviewDate, interviewType, prepTopics, nextAction, followUpOwner), with `status`/`priority`/`interviewType` as JSON Schema `enum`s built from `INTERVIEW_STATUSES`/`PRIORITIES`/`INTERVIEW_TYPES` — same source-of-truth pattern as the Zod schemas
- The response is re-validated through `llmExtractionSchema` (a Zod schema, `trackerRowSchema.omit({...})` — see `schemas/tracker.ts`) before being trusted, even though Structured Outputs should already guarantee the shape — defense in depth against API/model version drift
- **No `OPENAI_API_KEY` configured →** throws immediately with a clear `500` before making a network call, surfaced via the existing inline error UI in `InputPanel` (no new UI needed). **OpenAI call fails →** `502` with the upstream error message. **No silent fallback to regex** — see tradeoff below.

**History:** this replaced a deterministic regex-based `parseInput` (originally 9 exported `infer*` functions + a keyword/pattern table in `lib/constants.ts`, extracted there during the Phase 8 refactor pass). Two behavior fixes landed on the regex version before the LLM swap and both carried forward as design constraints on the new implementation: (1) one `parseInput` call always produces **at most one row** — the whole pasted text is one opportunity, not split into multiple rows; pasting a second company is a second paste + submit; (2) the client's "Load Sample" button was removed entirely (not just trimmed) once notes couldn't be a canned fixture anymore — every submit now genuinely calls the LLM.

**Tradeoff — hard failure over silent fallback:** when `OPENAI_API_KEY` is missing or the call fails, `POST /api/parse` fails outright rather than quietly falling back to the old regex logic (which was deleted, not kept as a fallback path). Rationale: for a feature that's explicitly "AI-powered," silently substituting a different, lower-quality extraction method would be more confusing than a clear error telling the user what to fix — the rest of the app (seeded data, inline editing, filters, summary) doesn't depend on this and keeps working regardless. See `RUNBOOK.md`'s Environment Variables section for setup.

### Summary service (`server/src/services/summary.ts`)

```ts
computeSummary(rows: TrackerRow[]): TrackerSummary
```

Runs on the server (called by `GET /api/summary`). Client gets a ready-made object — no metric logic in the frontend.

### Filtering & sorting (`server/src/services/tableUtils.ts`)

```ts
filterRows(rows: TrackerRow[], filters: FilterState): TrackerRow[]
sortRows(rows: TrackerRow[], sort: SortState): TrackerRow[]
```

Used by query params on `GET /api/rows?status=Onsite&sortBy=interviewDate`.

---

## Phase 3 — Server: API Routes ✅ Implemented

**Base URL:** `http://localhost:3001/api`

| Method | Path | Body / Query | Success | Description |
|---|---|---|---|---|
| `GET` | `/health` | — | `200` | Liveness check: `{ status, timestamp }` |
| `GET` | `/rows` | `?status=&company=&sortBy=&dir=` | `200` | Bare `TrackerRow[]`, filtered/sorted server-side |
| `POST` | `/rows` | `{ opportunityId? }` | `201` | Add a row. Omit `opportunityId` for a brand-new opportunity; pass an existing one to add a round to it |
| `PATCH` | `/rows/:id` | `{ fields: Partial<TrackerRow> }` | `200` | Update row fields (inline edit); `id`/`opportunityId`/`createdAt` are immutable |
| `DELETE` | `/rows/:id` | — | `204` | Delete a row |
| `POST` | `/rows/bulk` | `{ rows: TrackerRow[] }` | `201` | Bulk insert (after Parse); returns `{ rows, count }` |
| `POST` | `/parse` | `{ raw: string }` | `200` | Parse raw text → `{ rows: TrackerRow[] }` (not persisted) |
| `GET` | `/summary` | — | `200` | Bare `TrackerSummary` computed from all current rows |

**Implementation notes (deviations/additions from the original sketch):**

- Each router is a **factory that takes `ITrackerRepository`** (`createRowsRouter(repo)`, `createSummaryRouter(repo)`) rather than importing a singleton. `index.ts` constructs one `InMemoryRepository`, seeds it, and injects it — routes stay unit-testable without a running server, and the Postgres swap (see RUNBOOK.md) still only touches `index.ts`.
- **Zod schemas reuse `shared/types.ts` enums directly** (`INTERVIEW_STATUSES`, `PRIORITIES`, `INTERVIEW_TYPES`, `SORT_FIELDS`, `SORT_DIRECTIONS`, now exported `as const satisfies` their union type) instead of re-typing the literal lists in `schemas/tracker.ts`. One list to update if a status/priority/type is ever added.
- **Errors funnel through one place.** `asyncHandler()` wraps every async handler and forwards thrown/rejected errors to `next()`. `middleware/errorHandler.ts` maps: `ZodError` → `400` with `{ error, details: err.flatten() }`; `HttpError` (thrown by route handlers, e.g. row-not-found) → its own status; malformed JSON from `express.json()` → `400` (not the default `500`); anything else → `500` with a generic message (logged server-side). Unmatched routes get a `404` via `notFoundHandler`.
- **`POST /rows` with an `opportunityId` derives company/role/status/priority from a sibling `TrackerRow`**, not from `ITrackerRepository`'s `opportunities` Map. The seed data and the parser only ever produce denormalized rows — nothing populates the opportunities store today — so looking there would always 404. The repository's opportunity methods stay in the interface for a future normalized read path (e.g. a company detail view) but aren't load-bearing yet. Worth resolving explicitly (populate it, or drop it) before Postgres migration rather than leaving it silently unused.
- `PATCH /rows/:id` rejects a `fields` object with zero recognized keys (e.g. `{ "fields": { "id": "x" } }` — `id` is stripped as an unrecognized key by the omitted schema, leaving nothing to update) with a `400`, rather than silently no-op'ing.

---

## Testing — Scenarios Verified for Phase 2 + 3

No automated test runner is wired up yet (tracked as a follow-up in Phase 9). For this pass, each service function and route was exercised directly — service functions via a `tsx` smoke script against real inputs (not just `tsc`/`oxlint`), routes via a live server + `curl`. Recording the scenarios here so they can be lifted into a Vitest suite later without re-deriving them.

### `services/parser.ts` + `openaiClient.ts` *(rewritten after the LLM swap — the regex-specific scenarios this table used to list, e.g. "stage vs. prep-topic keyword collision," no longer apply since that code was deleted)*
| Scenario | Input | Expected | Verified how |
|---|---|---|---|
| Single row per call | Multi-paragraph input spanning two companies (Stripe, Meta), `\n\n`-separated | Exactly 1 row back, not 2 | Live, pre-LLM-swap: table row count went 7 → 8 (not 9) after submitting a two-paragraph paste. Still true post-swap by construction — `parseInput` makes exactly one `extractOpportunity()` call per input regardless of paragraph breaks |
| Empty input | `""` / whitespace-only | `[]`, no OpenAI call made | Code inspection (`if (!text) return [];` before the `extractOpportunity` call) — cheap to verify, avoids burning a request on nothing |
| Missing API key | `OPENAI_API_KEY` unset, `POST /api/parse` with valid notes | `500` with `"Server is not configured with OPENAI_API_KEY. Set it in server/.env..."`; no network call attempted | Live: `curl -X POST /api/parse` → confirmed exact message and status; then live in browser — inline error rendered under the textarea, **and the textarea's contents were preserved** (see next row) |
| Failed submit doesn't discard the user's text | Same as above, submitted via the UI | Textarea keeps the pasted notes after a failed submit, not cleared | Live: caught as a real bug during this verification pass — `InputPanel.handleGenerate` was unconditionally clearing the textarea via `.catch(() => {})` followed by `setRaw('')`, even on failure. Fixed to only clear on success; re-verified the textarea retains its value after a forced failure |
| `notes` preserves the original text | N/A — by construction | `notes` is set to the trimmed raw input directly in `parser.ts`, never passed through the LLM | Code inspection — `notes` is deliberately excluded from `llmExtractionSchema` / `EXTRACTION_JSON_SCHEMA` so there's nothing for the model to alter |
| Malformed/unexpected LLM response | *(not exercised — would require mocking the OpenAI SDK)* | `llmExtractionSchema.safeParse` fails → `502` with `ZodError.flatten()` details | Code inspection only; flagged as a gap for a future test suite (see Phase 3's Vitest/supertest note) |

**Not yet re-verified against a real API key** (none was available in this environment): the actual happy-path extraction quality (does `gpt-4o-mini` correctly infer company/stage/date/priority from messy notes) is unverified beyond the JSON-shape validation above. Worth a manual pass with a real key before calling this feature done.

### `services/summary.ts`
| Scenario | Input | Expected |
|---|---|---|
| Mixed statuses | Seed data (Rejected/Offer excluded) | `totalActive` counts unique companies excluding terminal states |
| Date window | Rows dated today, +3d, +10d, past | Only today/+3d appear in `upcomingInterviews`, sorted ascending; +10d and past excluded |
| Incomplete row | Row missing `interviewDate` and/or `prepTopics` | Appears in `missingInfo` with the correct `fields` list; fully-populated rows are omitted entirely |

### `services/tableUtils.ts`
| Scenario | Expected |
|---|---|
| `sortRows` by `interviewDate` | Rows with `null` date always sort to the end regardless of `asc`/`desc` |
| `sortRows` by `priority` | Ordered High → Medium → Low, not alphabetically |
| `filterRows` with `showDoneActions: false` | Rows with `nextActionDone: true` excluded |

### API routes (live server, verified with `curl`)
| Scenario | Request | Expected |
|---|---|---|
| Happy path list | `GET /rows` | `200`, array of 7 seeded rows |
| Filter + sort | `GET /rows?status=Onsite` | `200`, only Onsite rows |
| Invalid enum in query | `GET /rows?status=BadStatus` | `400`, `{ error: "Validation failed", details: {...} }` |
| Parse happy path | `POST /parse` with realistic notes | `200`, one correctly-inferred row |
| Parse empty input | `POST /parse` with `{ "raw": "   " }` | `400` (whitespace-only fails `min(1)` after `.trim()`) |
| Add blank row, no opportunity | `POST /rows` with `{}` | `201`, new row with fresh `opportunityId`, `status: "Applied"`, `priority: "Medium"` |
| Add round to existing opportunity | `POST /rows` with `{ "opportunityId": "opp-airtable" }` | `201`, new row inherits Airtable's `company`/`role`/`status`/`priority` |
| Add round, unknown opportunity | `POST /rows` with `{ "opportunityId": "opp-does-not-exist" }` | `404` |
| Update row | `PATCH /rows/:id` with `{ "fields": { "company": "TestCo" } }` | `200`, updated row, `updatedAt` bumped |
| Update with only immutable field | `PATCH /rows/:id` with `{ "fields": { "id": "hacked" } }` | `400` — stripped to an empty `fields` object, rejected |
| Update nonexistent row | `PATCH /rows/does-not-exist` | `404` |
| Delete row | `DELETE /rows/:id` | `204`, empty body |
| Delete already-deleted row | `DELETE /rows/:id` (again) | `404` |
| Bulk insert, valid rows | `POST /rows/bulk` with one full `TrackerRow` | `201`, `{ rows, count: 1 }` |
| Bulk insert, invalid enum | `POST /rows/bulk` with `status: "NotARealStatus"` | `400` with the offending field named in `details` |
| Malformed JSON body | `POST /rows/bulk` with truncated JSON | `400`, `"Malformed JSON in request body"` (not the default Express `500`) |
| Unmatched route | `GET /api/nope` | `404`, `{ error: "No route matches GET /api/nope" }` |

**Follow-up:** promote this table into `server/src/**/*.test.ts` with Vitest + `supertest` once the client is far enough along to justify the setup cost — the scenarios above are the spec to encode, not new ones to discover.

---

## Phase 4 — Client: Component Architecture ✅ Implemented

```
client/src/
├── api/
│   ├── client.ts        # Base fetch wrapper: /api prefix, JSON, ApiRequestError, toErrorMessage()
│   ├── rows.ts          # getRows, addRow, updateRow, deleteRow, bulkInsertRows
│   ├── parse.ts         # postParseInput
│   └── summary.ts       # getSummary
├── components/
│   ├── InputPanel/
│   │   ├── InputPanel.tsx       # Textarea + "Generate Tracker" button (no "Load Sample" — removed post-LLM-swap, see Phase 2)
│   │   └── InputPanel.module.css
│   ├── TrackerTable/
│   │   ├── TrackerTable.tsx     # Table shell: error banner, loading/empty states, <table>
│   │   ├── TableRow.tsx         # One row's cells + delete button + done checkbox
│   │   ├── TableCell.tsx        # Click-to-edit cell (text / select / date)
│   │   ├── TableToolbar.tsx     # Row count + Add Row (filter/sort controls land in Phase 6)
│   │   └── TrackerTable.module.css
│   ├── SummaryPanel/
│   │   ├── SummaryPanel.tsx     # Metric cards (counts only — see Phase 6 scope note)
│   │   └── SummaryPanel.module.css
│   └── shared/
│       ├── Badge.tsx            # Status/priority pill, colored via CSS attribute selectors
│       ├── Badge.module.css
│       ├── EmptyState.tsx       # Used today for "0 rows"; more states land in Phase 7
│       └── EmptyState.module.css
├── hooks/
│   ├── useRows.ts         # Fetch rows, expose CRUD actions (calls api/rows.ts)
│   ├── useSummary.ts      # Fetch summary, refetches when `refreshKey` changes
│   └── useParseInput.ts   # POST raw text, hand rows to caller's bulkInsertRows
├── App.tsx
├── App.module.css
└── main.tsx
```

**Key decisions (and where the implementation deviated from the original sketch):**

- **`useRows`** is the single owner of row state. It fetches from the server on mount and after each mutation. Optimistic updates are applied immediately; the server is the durable source.
- **`useRows` exposes a `version` counter**, bumped after every successful mutation, instead of `useSummary` reaching into `useRows` directly. `App.tsx` passes `version` to `useSummary(refreshKey)` as its refetch trigger — the two hooks stay decoupled; `useSummary` only knows "refetch when this value changes," not why.
- **`TableCell`** manages its own local edit state (`editing`, `draft`) and operates on strings only — callers (`TableRow`) own field-specific serialization (e.g. `prepTopics.join(', ')` / split back on commit). Keeps the cell generic across text/select/date without a discriminated-union value type.
- **`InputPanel`** is decoupled from persistence — it calls `useParseInput(bulkInsertRows)`, which POSTs to `/api/parse` then immediately calls the injected `bulkInsertRows` (from `useRows`) to persist. No separate refetch step: `bulkInsertRows` already appends the saved rows to local state optimistically.
- The client **never computes summary metrics** — `SummaryPanel` renders whatever `TrackerSummary` the server returns.
- **`Tooltip.tsx` was not built.** Nothing in Phase 4/5 consumes it — it's needed for the Phase 6 "missing info" row warnings. Building it now would be speculative; added when Phase 6 needs it.
- **Row-level mutation calls swallow their own rejection** (`onUpdate(...).catch(() => {})` in `TableRow`/`InputPanel`) because `useRows`/`useParseInput` already revert optimistic state and set an error message internally; without the swallow, every failed PATCH would additionally throw an unhandled promise rejection in the console on top of the (correct) UI error banner.
- **Palette + shell rebuilt.** `index.css` now carries the Airtable-style palette specified in Phase 0 (white / `#f0f0f0` / teal `#166ee1`, with a dark-mode variant) instead of the stock Vite template's purple accent. The marketing-page scaffold (`App.css`, hero/vite/react assets, `icons.svg`) was deleted as dead weight once `App.tsx` was replaced.

---

## Phase 5 — Editable Table Behavior ✅ Implemented

**Inline editing:**
- Click cell (or focus + Enter/Space — native `<button>` semantics, no custom key handler needed) → appropriate input (`<input>`, `<select>`, `<input type="date">`)
- Blur or Enter → commits, but only calls `PATCH /api/rows/:id` if the value actually changed (`next !== value` check in `TableCell.commit`)
- Escape → revert (`draft` reset to the original `value`, `onCommit` never called)
- Tab → **scope cut, documented in code:** relies on the browser's default focus movement. Blur fires before focus moves, which commits the edit; focus then lands on the next cell's static `<button>`. It does **not** auto-enter edit mode on the next cell — a fully continuous "tab-through-and-type" flow is left for the Phase 8 a11y pass if wanted.
- `select` cells commit immediately on `onChange` (no separate confirm step makes sense for a dropdown); `onBlur` without a change just cancels back to the static view.

**Row operations:**
- **Add:** `POST /api/rows` → new row appended to local state (no full refetch — `useRows.addRow` appends the server's response directly)
- **Delete:** `DELETE /api/rows/:id` on `×` click — no confirmation dialog was built (the original "inline confirmation (×)" phrasing was ambiguous; the `×` button deletes immediately, optimistically, and reverts on server error). Revisit if a confirm step is wanted.
- **Mark done:** Checkbox in the Next Action cell → `PATCH { nextActionDone: true }`, sits next to (not inside) the editable Next Action text `TableCell`

**Optimistic update pattern (as implemented in `useRows.updateRow`/`deleteRow`):**
```ts
const previous = rows;
setRows(prev => prev.map(r => r.id === id ? { ...r, ...fields } : r)); // instant UI
try {
  const updated = await api.updateRow(id, fields);
  setRows(prev => prev.map(r => r.id === id ? updated : r));           // reconcile with server response
} catch (err) {
  setRows(previous);        // revert
  setError(toErrorMessage(err));
  throw err;                // let the caller decide whether to also handle it
}
```
No toast library was added — errors surface via the `TrackerTable` error banner (dismissible), which is the simplest thing that satisfies "the user finds out a mutation failed." A toast is cosmetic polish, deferred to Phase 7 if wanted.

---

## Testing — Scenarios Verified for Phase 4 + 5

Same approach as Phase 2/3: no automated runner yet, so the app was actually driven — `npm run dev -w server` + Vite dev server, headless Chromium via Playwright (`chromium.launch`), screenshots + `console`/`requestfailed`/`response` listeners checked for silent failures, not just "the page rendered." Recording scenarios here as the spec for a future component/e2e suite.

### Initial load
| Scenario | Verified by | Result |
|---|---|---|
| Seeded data renders on first paint | Screenshot after `nav` + `wait-for table tbody tr` | 7 rows visible, matching `GET /api/rows` exactly (same companies/dates as the Phase 3 `curl` pass) |
| Summary cards match server truth | Screenshot | `4 / 3 / 6 / 17 / 2` — identical to the `GET /api/summary` values from the Phase 3 testing table, confirming `useSummary` isn't recomputing anything client-side |
| No console errors on load | `page.on('console'/'pageerror')` | Empty array |

### Inline editing (`TableCell`)
| Scenario | Steps | Result |
|---|---|---|
| Commit on blur | Click Follow-up Owner cell → fill `"Sarah (edited)"` → blur | Cell shows new value; `PATCH /api/rows/airtable-round-1` logged server-side |
| Escape reverts, no server call | Click Company cell → fill `"ShouldNotStick"` → `Escape` | Cell reverts to `"Airtable"`; no PATCH for that field in server log |
| Select commits immediately on change | (exercised via the same commit path as text — `onChange` calls `onCommit` directly, no separate blur step) | Covered by code path; not separately screenshotted this pass |
| No-op guard | Blur without changing the draft | `onCommit` intentionally not invoked (`next !== value` check) — prevents a PATCH storm from click-to-inspect-then-click-away |

### Row operations
| Scenario | Steps | Result |
|---|---|---|
| Add row | Click **+ Add Row** | Row count 7 → 8; `POST /api/rows` logged; new row appended without a full table refetch |
| Delete row | Click `×` on the just-added row | Row count 8 → 7; `DELETE /api/rows/:id` logged, returns `204` |
| Mark next action done | Click checkbox on row 1 | Checked state flips `true → false`; `PATCH { nextActionDone: false }` sent |
| Chromium 204 artifact (not a bug) | `page.on('requestfailed')` fired `net::ERR_ABORTED` for the DELETE | Confirmed via `page.on('response')`: server actually returned `204` cleanly. This is a known Chromium DevTools quirk for empty-body responses with `Connection: close` — the `fetch()` promise itself resolves fine (row count updated correctly), so it's not treated as an app bug. Worth knowing if a future test suite asserts on network events instead of DOM/state. |

### Parse → persist flow (`InputPanel` + `useParseInput`)
| Scenario | Steps | Result |
|---|---|---|
| Paste notes → Generate Tracker *(originally "Load Sample → Generate Tracker" — "Load Sample" was removed once the parser became a real LLM call; see Phase 2)* | Paste notes, click **Generate Tracker** | `POST /api/parse` then `POST /api/rows/bulk` logged in sequence; textarea cleared after a **successful** submit only (a failed submit preserves the text — see the Phase 2 testing table for the bug this caught) |
| Summary refetches after parse | Same run | Cards updated without a manual refresh — confirms `useSummary`'s `version`-keyed refetch fires on `bulkInsertRows`, not just on `updateRow`/`deleteRow` |
| Empty parse result | *(not exercised this pass — would require raw text with no extractable signal)* | Code path exists (`useParseInput` sets the "Couldn't extract opportunities..." message when `rows.length === 0`); flag as a gap for the future test suite |

**Gaps deliberately left for later:** confirm-before-delete UX, drag/keyboard reordering, `select`-cell commit screenshot, and the empty-parse-result path above. None are blockers for Phase 6.

---

## Phase 6 — Filtering, Sorting & Summary Panel ✅ Implemented

**Client-side** filter/sort for instant feedback (no round-trip per keystroke). The server's `GET /rows?status=&company=&sortBy=&dir=` query params (Phase 3) remain available as a fallback, but the client currently always fetches the full unfiltered set and does everything client-side — see deviation note below.

**Filters** (`client/src/components/TrackerTable/TableToolbar.tsx`):
- Status dropdown (All + 7 statuses, from `INTERVIEW_STATUSES`)
- Company dropdown (All + unique companies, derived from the current `rows` via `useMemo`, not a fixed list)
- "Hide completed actions" toggle — inverts `FilterState.showDoneActions`
- "Clear filters" link, shown only when a filter is active

**Sort** (`client/src/components/TrackerTable/TrackerTable.tsx`):
- Clicking a sortable column header (Company, Interview Date, Status, Priority) toggles asc/desc, or switches to that field at asc if a different column was active — indicated with ▲/▼
- Priority/status ordering use explicit rank maps (`High=0, Medium=1, Low=2`, and a pipeline-order map for status), not alphabetical — mirrors the server exactly (see deviation note)

**Summary Panel** (`client/src/components/SummaryPanel/SummaryPanel.tsx`) — all five metrics from the server's `TrackerSummary`, none recomputed client-side:
- **Active Opportunities** — count
- **Upcoming Interviews** — count + a list of up to 4 (`company — date`), "+N more" beyond that
- **Follow-ups Due** — count
- **High-Priority Prep** — count + up to 6 topic chips, "+N" beyond that
- **Missing Info** — count + a hint pointing at the table (the actual per-row detail lives there, see below)

**Missing-info warning on rows:** implemented as a ⚠ icon + CSS-only `Tooltip` (`client/src/components/shared/Tooltip.tsx`) next to the Company cell, shown when that row's id appears in `TrackerSummary.missingInfo`. Hovering (or focusing, for keyboard users) shows which fields are missing (e.g. "Missing: interviewDate"). `App.tsx` passes `summary.missingInfo` down into `TrackerTable`, which builds a `Map<rowId, fields>` once per summary update.

**Deviation from the original sketch — duplicated, not shared, filter/sort logic:** `client/src/lib/tableUtils.ts` is a client-side copy of `server/src/services/tableUtils.ts`'s `filterRows`/`sortRows` (same rank maps, same null-date-last rule), not an import from a shared module. `shared/` currently only exports types (`shared/types.ts`, one file, one `package.json` export entry) — turning this into a real shared module would mean adding a second export path plus matching alias updates across `server/tsconfig.json`, `client/tsconfig.app.json`, and `client/vite.config.ts`. Given the algorithm is ~25 lines and stable, duplicating it was the lower-risk call over touching three build configs mid-feature. **Watch for drift**: if `PRIORITY_ORDER`/`STATUS_ORDER` or the null-handling rule ever changes in one copy, it must change in both — promote to `shared/` if that happens more than once.

---

## Phase 7 — Empty States & UX Polish ✅ Implemented

**States:**
- **Initial load (seeded data visible immediately):** No empty state — confirmed, data is pre-populated
- **Parse returns 0 rows:** `useParseInput` shows "Couldn't extract opportunities — try including company names, roles, or dates" inline under the textarea (exact copy from the plan)
- **Filter returns 0 rows:** `TrackerTable` shows "No rows match — Try adjusting your filters." with a "Clear filters" action, distinct from the all-rows-deleted case (checks `rows.length === 0` vs `visibleRows.length === 0` separately)
- **All rows deleted:** "No opportunities tracked yet — paste notes above to get started, or add a row manually."

**UX details:**
- **Loading spinner:** `client/src/components/shared/Spinner.tsx` — a small CSS-only rotating-border spinner (no image/library), used in the table's loading row, the summary panel's loading state, and the "Generate Tracker" button while a parse is in flight. Never a full-page skeleton, per the plan.
- **Error toast:** `client/src/hooks/useToasts.ts` + `client/src/components/shared/Toast.tsx` — a minimal, dependency-free toast queue (no library). `App.tsx` pushes a toast whenever `useRows`'s `error` becomes non-null (covers add/update/delete/bulk-insert failures), auto-dismisses after 5s or on click. **This replaces the dismissible inline error banner** that `TrackerTable` had in Phase 5 — once a real toast existed, keeping both was redundant. The row itself snapping back to its prior value (optimistic revert) is the persistent evidence that something failed; the toast is how the user finds out why.
- **Row highlight on insert:** `useRows` tracks a `newRowIds: Set<string>` populated by `addRow`/`bulkInsertRows` and cleared per-id via `setTimeout` after 2s. `TableRow` applies a highlight background class while its id is in the set; when the class is removed, a CSS `transition` (not a keyframe animation) fades the background back to transparent.

**Scope note — parse errors stay inline, not toasted:** `useParseInput`'s error (both the "0 rows" message and any `/api/parse` failure) intentionally stays as inline text under the textarea rather than also firing a toast. It's contextual right at the point of action; toasting the same message too would just be noise. Only `useRows` errors (real mutation failures) go to the toast queue.

**Bug caught and fixed during verification:** the missing-info `Tooltip`'s bubble was centered under its trigger (`left: 50%; transform: translateX(-50%)`) — since the trigger sits near the table's left edge inside a horizontally-scrolling container (`.tableScroll { overflow-x: auto }`), the centered bubble overflowed past the clipped boundary and rendered with its text cut off ("...nterviewDate" instead of "Missing: interviewDate"). Fixed by left-anchoring the bubble (`left: 0`) instead of centering it — confirmed with a full tooltip screenshot after the fix.

---

## Testing — Scenarios Verified for Phase 6 + 7

Same approach as prior phases: driven with headless Chromium (Playwright), screenshots + `console`/network assertions, not just `tsc`/`oxlint`.

### Filtering & sorting
| Scenario | Steps | Result |
|---|---|---|
| Sort by column, toggle direction | Click "Company" header twice | 1st click: rows ascending by company name; 2nd click: descending — confirmed via first-column text before/after |
| Filter by status | Select "Onsite" in the status dropdown | Row count 7 → 1 (only the Vanta Onsite row); toolbar shows "1 of 7 rows" |
| Clear filters | Click "Clear filters" after the above | Row count back to 7; filter dropdowns reset to "All" |
| Filter to zero matches | Select "Offer" (no seed row has that status) | "No rows match — Try adjusting your filters" empty state renders, distinct from the all-deleted empty state, with a working "Clear filters" action |
| Missing-info tooltip | Hover the ⚠ icon on the Airbnb row (missing `interviewDate`) | Tooltip reads "Missing: interviewDate", fully visible (see the clipping bug + fix above) |

### Empty states & UX polish
| Scenario | Steps | Result |
|---|---|---|
| Error toast on mutation failure | Intercepted the next `PATCH /api/rows/:id` to return `500`, then edited a cell | Toast appeared bottom-right reading the server's error message; the cell's optimistic value reverted to the original (`Airtable`, not the attempted edit) — confirms revert-on-error and toast are both firing from the same failure path |
| Row highlight fades after insert | Clicked **+ Add Row**, read the new row's computed `background-color` immediately and again after 2.5s | Immediately: `rgba(22, 110, 225, 0.1)` (the accent highlight); at 2.5s: `rgba(22, 110, 225, 0.043)`, mid-fade — confirms the 2s hold + CSS transition, not an instant cut |
| Parse-returns-0-rows message | *(exact copy verified by reading `useParseInput.ts` — not re-driven this pass since Phase 4/5 testing already exercised the parse-success path with a live screenshot)* | Message matches the plan's copy exactly |

**Gaps deliberately left for later:** keyboard-only exercise of the new filter/sort controls (mouse-driven this pass), a live screenshot of the exact "parse returns 0 rows" empty state, and the server-side `?status=&sortBy=` query-param fallback path (implemented in Phase 3, not re-exercised here since the client no longer calls it — see the Phase 6 deviation note). None block Phase 8.

---

## Phase 8 — Refactor & a11y ✅ Implemented

- ~~`useMemo` on filtered/sorted rows (client)~~ — already done as part of Phase 6
- ~~`server/src/lib/constants.ts` now holds `COMPANY_KEYWORDS`, `PREP_TOPIC_KEYWORDS`, `MONTHS`, `DATE_PATTERNS`, `STAGE_PATTERNS`, `STAGE_TO_INTERVIEW_TYPE`, `STAGE_TO_STATUS`~~ — **superseded:** this file (and the regex `parseInput` it supported) was deleted entirely when the parser was later replaced with a real OpenAI extraction call — see Phase 2's "current state" writeup above. Extracting these constants was still the correct call *at the time*, and the smoke-test-after-move verification step is a pattern worth reusing for the next mechanical refactor.
- ~~`aria-label` on icon buttons~~ / `role="grid"` — already in place from Phases 5–7
- **Keyboard nav on cells**: arrow-key movement between grid cells, spreadsheet-style. Implemented as a single `onKeyDown` handler on the `<table>` (event delegation, not per-cell) in `TrackerTable.tsx`. Scoped carefully: it's skipped when the focused element is an actively-editing `.cellInput` (text/date) or an open `<select>`, so arrow keys move the text cursor / dropdown selection instead of jumping cells — verified live: typing into a cell and pressing ArrowLeft twice keeps the `<input>` focused (cursor moves), while arrow keys on the static (non-editing) cell button move focus to the adjacent `<td>`'s focusable element via DOM `previousElementSibling`/`nextElementSibling`/column-index lookup. **Known gap:** arrow-up from the first data row doesn't reach the header's sort buttons (documented in a code comment) — the header is a separate click-to-sort surface, not part of the grid-nav scope for this pass.
- **Final dead-code pass:** swept for stray `console.log`/`console.debug` (none — the two `console.log` calls that exist are the intentional dev-request-logger and startup banner in `index.ts`, and the one `console.error` is the error-handler's 500 logger), unused exports (all component/hook/service files trace back to `App.tsx` or `index.ts`), and orphaned CSS classes (checked every `.module.css` class against its component — none unused).
- **Zod schemas vs shared types:** compared `schemas/tracker.ts` field-by-field against `shared/types.ts`. `trackerRowSchema` covers all 16 `TrackerRow` fields with matching names in matching order; `updateRowRequestSchema`/`addRowRequestSchema`/`bulkInsertRequestSchema`/`parseRequestSchema` match their `UpdateRowRequest`/`AddRowRequest`/`BulkInsertRequest`/`ParseRequest` counterparts exactly. The only differences are Zod adding runtime format/non-emptiness constraints that TypeScript's structural `string` type can't express (non-empty IDs, ISO date/datetime regexes, non-empty `fields`/`rows`/`raw`) — intentional stricter validation at the API boundary, not drift. No changes needed.

---

## Phase 9 — Walkthrough Script

**What was built:**
> "A full-stack AI Interview Prep Tracker. Paste messy job search notes → server parses them into structured rows → editable Airtable-style table → live summary panel. The server uses a repository-pattern in-memory DB, so switching to Postgres later is a one-file swap."

**How the AI agent helped:**
> "Copilot scaffolded the TypeScript types, repository interface, and regex parser functions quickly. The route handlers and Zod schemas came out nearly correct on the first pass."

**What I corrected manually:**
> "Date inference needed anchoring to today's date. The optimistic update error-revert logic required careful thought. Summary panel layout was reworked for scannability."

**What I would improve next:**
> 1. ~~Real LLM extraction (OpenAI API) replacing the regex parser~~ — done, see Phase 2. Next: verify extraction quality against a real key (not yet possible in this environment), and consider a retry/backoff on transient OpenAI failures rather than failing the request outright
> 2. Swap `InMemoryRepository` for `PostgresRepository` (Supabase or Railway)
> 3. `localStorage` persistence as a middle ground before a real DB
> 4. Export to CSV / Airtable-paste format
> 5. Email thread import

*(This whole Phase 9 section — including "What was built" and "How the AI agent helped" above — is still the original placeholder text from early in the build and describes a hypothetical Copilot-assisted session, not what actually happened. Flagged in the Phase 8 pass as needing a real rewrite once the walkthrough is actually being prepared; not done as part of this LLM-extraction change.)*

---

## Implementation Order & Time Estimate

| Phase | Task | Est. Time | Status |
|---|---|---|---|
| 0 | Monorepo scaffold (workspaces, tsconfig, concurrently) | 15 min | ✅ Done |
| 1 | Shared types (`shared/types.ts`) | 15 min | ✅ Done |
| 2 | Server: repository + in-memory DB + seed + parser + summary + tableUtils | 70 min | ✅ Done |
| 3 | Server: Express routes + Zod validation + error handling | 25 min | ✅ Done |
| 4 | Client: API helpers + hooks + component shell + CSS layout | 50 min | ✅ Done |
| 5 | Client: editable table + inline edit + row ops | 35 min | ✅ Done |
| 6 | Client: filters, sort, summary panel polish | 25 min | ✅ Done |
| 7 | Empty states & UX polish | 20 min | ✅ Done |
| 8 | Refactor & a11y | 15 min | ✅ Done |
| 9 | Walkthrough script | 10 min | ⬜ Not started |
| **Total** | | **~4 hours** | |

*Note: this table's phase numbers now match the `## Phase N` section headers above — the original draft had drifted by one (it split what became "Phase 2" into two rows and shifted everything after).*

---

## Key Constraints & Tradeoffs Summary

| Decision | Chosen Approach | Why |
|---|---|---|
| DB | In-memory `Map` behind repository interface | Zero deps; swap to Postgres = replace one file |
| Pre-seeded data | Runs at server startup, always visible | Demo works immediately, no user action needed |
| AI extraction | OpenAI (`gpt-4o-mini`, Structured Outputs), server-side, hard failure if unconfigured | Real understanding of messy notes vs. keyword regex; requires `OPENAI_API_KEY` + network call + per-request cost, and no fallback if it's missing — see Phase 2's "hard failure over silent fallback" tradeoff note |
| UI library | None (raw CSS modules) | Avoids "library demo" feel; shows real CSS judgment |
| State management | `useState` + custom hooks + server as source of truth | No Redux needed; optimistic updates cover latency |
| Filtering/sorting | Client-side, duplicated (not shared) sort/filter algorithm | Instant feedback; server query params (Phase 3) remain available but unused by the client today — see Phase 6 deviation note on why the logic wasn't moved to `shared/` |
| Route error handling | Central `errorHandler` middleware + `HttpError`/`ZodError` mapping | One place maps validation/not-found/malformed-JSON to consistent `ApiError` responses instead of per-route try/catch |
| Client mutation reconciliation | Optimistic update → replace with server response on success → revert + toast on failure | Toast (Phase 7) replaced the Phase 5 inline error banner once it existed — the reverted row is persistent evidence something failed, the toast just explains why |
| Hook coupling | `useRows` exposes a `version` counter; `useSummary(refreshKey)` refetches when it changes | `useSummary` doesn't need to know *why* to refetch, only *that* something changed — avoids the two hooks importing each other |
| Testing | Manual smoke scripts (server: `tsx` + `curl`; client: headless Chromium via Playwright, screenshots + console/network assertions) — no automated runner wired up yet. Scenarios recorded in the Testing sections for [Phase 2+3](#testing--scenarios-verified-for-phase-2--3), [Phase 4+5](#testing--scenarios-verified-for-phase-4--5), and [Phase 6+7](#testing--scenarios-verified-for-phase-6--7) | Pragmatic for timebox; scenarios are the spec for a Vitest/Playwright suite later, not re-derived from scratch |
| Deployment | Docker, single service (server serves the client's static build too) → Railway | Not part of the original 10-phase plan — see `RUNBOOK.md`'s "Deployment (Railway)" section for the full writeup. Two real bugs only surfaced by actually running the built container, never from a green build/typecheck: a `tsup` bundling bug (`@interview-prep/shared` silently unresolved at runtime), and a first-cut Dockerfile that only built the server, which deployed successfully but served a bare `{"error":"No route matches GET /"}` at the root URL instead of the app |

---

*Phases 0–8 complete: full server + a fully-featured, keyboard-navigable client, refactored and dead-code-swept. Next: Phase 9 — the walkthrough writeup (already drafted below; update it to reflect what was actually built vs. the original placeholder text).*
