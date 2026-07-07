import { z } from 'zod';
import {
  INTERVIEW_STATUSES,
  PRIORITIES,
  INTERVIEW_TYPES,
  SORT_FIELDS,
  SORT_DIRECTIONS,
} from '@interview-prep/shared';

// =============================================================================
// tracker.ts — Zod schemas mirroring shared/types.ts. These are the runtime
// validation boundary for every mutation endpoint; the enum lists are
// imported (not re-typed) so a status/priority/type added in shared/types.ts
// only has to be added in one place.
// =============================================================================

const interviewStatusSchema = z.enum(INTERVIEW_STATUSES);
const prioritySchema = z.enum(PRIORITIES);
const interviewTypeSchema = z.enum(INTERVIEW_TYPES);
const sortFieldSchema = z.enum(SORT_FIELDS);
const sortDirectionSchema = z.enum(SORT_DIRECTIONS);

// ISO date-only string, e.g. "2026-07-10". `interviewDate` is nullable but
// never an empty string — parser/services always emit null instead.
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected an ISO date string (YYYY-MM-DD)');

const isoDateTimeSchema = z.string().datetime({ offset: true });

export const trackerRowSchema = z.object({
  id: z.string().min(1),
  opportunityId: z.string().min(1),
  company: z.string(),
  role: z.string(),
  status: interviewStatusSchema,
  priority: prioritySchema,
  notes: z.string(),
  stage: z.string(),
  interviewDate: isoDateSchema.nullable(),
  interviewType: interviewTypeSchema,
  prepTopics: z.array(z.string()),
  nextAction: z.string(),
  nextActionDone: z.boolean(),
  followUpOwner: z.string(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

// Fields the LLM extraction call (services/openaiClient.ts) is responsible
// for. Everything else on TrackerRow is server-generated: `id`/`opportunityId`
// (identity), `notes` (kept as the user's original pasted text, not a
// summary — see parser.ts), `nextActionDone` (always false for a fresh
// extraction), and the timestamps.
export const llmExtractionSchema = trackerRowSchema.omit({
  id: true,
  opportunityId: true,
  notes: true,
  nextActionDone: true,
  createdAt: true,
  updatedAt: true,
});

// Fields a client is allowed to PATCH — identity and creation time are immutable.
export const updateRowRequestSchema = z.object({
  fields: trackerRowSchema
    .omit({ id: true, opportunityId: true, createdAt: true })
    .partial()
    .refine((fields) => Object.keys(fields).length > 0, {
      message: 'fields must contain at least one property to update',
    }),
});

export const addRowRequestSchema = z.object({
  opportunityId: z.string().min(1).optional(),
});

export const bulkInsertRequestSchema = z.object({
  rows: z.array(trackerRowSchema).min(1, 'rows must contain at least one row'),
});

export const parseRequestSchema = z.object({
  raw: z.string().trim().min(1, 'raw must be a non-empty string'),
});

// GET /api/rows query params — mirrors FilterState/SortState so the server
// accepts the same shape the client keeps in local state.
export const rowsQuerySchema = z.object({
  status: z.union([interviewStatusSchema, z.literal('All')]).optional(),
  company: z.string().optional(),
  sortBy: sortFieldSchema.optional(),
  dir: sortDirectionSchema.optional(),
});

export const rowIdParamSchema = z.object({
  id: z.string().min(1),
});
