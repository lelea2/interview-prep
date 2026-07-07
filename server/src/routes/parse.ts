import { Router } from 'express';
import type { ParseResponse } from '@interview-prep/shared';
import { parseInput } from '../services/parser.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { parseRequestSchema } from '../schemas/tracker.js';

// =============================================================================
// routes/parse.ts — POST /api/parse
//
// Deterministic extraction only; does not touch the repository. The client
// reviews the returned rows and calls POST /api/rows/bulk to persist them.
// =============================================================================

export function createParseRouter(): Router {
  const router = Router();

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const { raw } = parseRequestSchema.parse(req.body);
      const rows = parseInput(raw);
      const body: ParseResponse = { rows };
      res.json(body);
    }),
  );

  return router;
}
