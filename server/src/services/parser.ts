import { randomUUID } from 'node:crypto';
import type { TrackerRow } from '@interview-prep/shared';
import { extractOpportunity } from './openaiClient.js';

// =============================================================================
// parser.ts — Turns raw pasted interview notes into TrackerRow[]. Extraction
// itself is delegated to an LLM (see openaiClient.ts); this file attaches
// the server-generated identity/timestamps and keeps `notes` as the user's
// original text rather than an LLM summary, so no detail is silently lost.
//
// One call = at most one row: the whole pasted text is treated as notes for
// a single opportunity. To track another company, paste its notes and
// submit again.
// =============================================================================

export async function parseInput(raw: string, referenceDate: Date = new Date()): Promise<TrackerRow[]> {
  const text = raw.trim();
  if (!text) return [];

  const extracted = await extractOpportunity(text, referenceDate);
  const now = new Date().toISOString();

  const row: TrackerRow = {
    id: `row-${randomUUID()}`,
    opportunityId: `opp-${randomUUID()}`,
    notes: text,
    nextActionDone: false,
    createdAt: now,
    updatedAt: now,
    ...extracted,
  };

  return [row];
}
