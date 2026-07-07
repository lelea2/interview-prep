import { Router } from 'express';
import type { ITrackerRepository } from '../db/interface.js';
import { computeSummary } from '../services/summary.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

// =============================================================================
// routes/summary.ts — GET /api/summary
// =============================================================================

export function createSummaryRouter(repo: ITrackerRepository): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const rows = await repo.getAllRows();
      res.json(computeSummary(rows));
    }),
  );

  return router;
}
