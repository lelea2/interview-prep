import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { BulkInsertResponse, FilterState, SortState, TrackerRow } from '@interview-prep/shared';
import type { ITrackerRepository } from '../db/interface.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../lib/httpError.js';
import {
  addRowRequestSchema,
  bulkInsertRequestSchema,
  rowIdParamSchema,
  rowsQuerySchema,
  updateRowRequestSchema,
} from '../schemas/tracker.js';

// =============================================================================
// routes/rows.ts — GET/POST/PATCH/DELETE /api/rows, POST /api/rows/bulk
//
// Takes the repository as a constructor argument (dependency injection)
// rather than importing a singleton, so swapping InMemoryRepository for
// PostgresRepository is a one-line change in index.ts and routes stay
// testable in isolation.
// =============================================================================

export function createRowsRouter(repo: ITrackerRepository): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const query = rowsQuerySchema.parse(req.query);

      const filter: Partial<FilterState> = {};
      if (query.status) filter.status = query.status;
      if (query.company) filter.company = query.company;

      const sort: SortState | undefined = query.sortBy
        ? { field: query.sortBy, direction: query.dir ?? 'asc' }
        : undefined;

      const rows = await repo.getAllRows(filter, sort);
      res.json(rows);
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const { opportunityId } = addRowRequestSchema.parse(req.body ?? {});
      const row = await createBlankRow(repo, opportunityId);
      res.status(201).json(row);
    }),
  );

  router.post(
    '/bulk',
    asyncHandler(async (req, res) => {
      const { rows } = bulkInsertRequestSchema.parse(req.body);
      const saved = await repo.bulkInsertRows(rows);
      const body: BulkInsertResponse = { rows: saved, count: saved.length };
      res.status(201).json(body);
    }),
  );

  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = rowIdParamSchema.parse(req.params);
      const { fields } = updateRowRequestSchema.parse(req.body);

      const existing = await repo.getRowById(id);
      if (!existing) throw new HttpError(404, `No row found with id "${id}"`);

      const updated = await repo.upsertRow({ ...existing, ...fields });
      res.json(updated);
    }),
  );

  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = rowIdParamSchema.parse(req.params);

      const existing = await repo.getRowById(id);
      if (!existing) throw new HttpError(404, `No row found with id "${id}"`);

      await repo.deleteRow(id);
      res.status(204).end();
    }),
  );

  return router;
}

// Adding a row to an existing opportunity (opportunityId provided) copies
// the denormalized company/role/status/priority from a sibling row — there
// is no separate "opportunities" record to read from, since seed data and
// the parser only ever produce denormalized TrackerRows.
async function createBlankRow(
  repo: ITrackerRepository,
  opportunityId?: string,
): Promise<TrackerRow> {
  const now = new Date().toISOString();

  const base: Omit<TrackerRow, 'id' | 'opportunityId' | 'company' | 'role' | 'status' | 'priority'> = {
    notes: '',
    stage: '',
    interviewDate: null,
    interviewType: 'Unknown',
    prepTopics: [],
    nextAction: '',
    nextActionDone: false,
    followUpOwner: 'me',
    createdAt: now,
    updatedAt: now,
  };

  if (opportunityId) {
    const existingRows = await repo.getAllRows();
    const sibling = existingRows.find((r) => r.opportunityId === opportunityId);
    if (!sibling) {
      throw new HttpError(404, `No opportunity found with id "${opportunityId}"`);
    }
    return repo.upsertRow({
      ...base,
      id: `row-${randomUUID()}`,
      opportunityId,
      company: sibling.company,
      role: sibling.role,
      status: sibling.status,
      priority: sibling.priority,
    });
  }

  return repo.upsertRow({
    ...base,
    id: `row-${randomUUID()}`,
    opportunityId: `opp-${randomUUID()}`,
    company: '',
    role: '',
    status: 'Applied',
    priority: 'Medium',
  });
}
