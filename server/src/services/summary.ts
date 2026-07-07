import type { TrackerRow, TrackerSummary, MissingInfoItem } from '@interview-prep/shared';

// =============================================================================
// summary.ts — Computes TrackerSummary metrics on the server so the client
// never has to duplicate this logic. Called by GET /api/summary.
// =============================================================================

const UPCOMING_WINDOW_DAYS = 7;

/**
 * computeSummary
 *
 * - totalActive: unique companies not in a terminal state (Rejected/Offer)
 * - upcomingInterviews: rows with an interviewDate within the next 7 days
 *   (inclusive), sorted ascending
 * - highPriorityPrep: deduplicated prep topics from High-priority rows
 * - followUpsDue: rows where nextActionDone === false
 * - missingInfo: rows missing a date, prep topics, or a next action
 *
 * `referenceDate` defaults to "now" but is injectable for deterministic tests.
 */
export function computeSummary(
  rows: TrackerRow[],
  referenceDate: Date = new Date(),
): TrackerSummary {
  const activeCompanies = new Set(
    rows.filter((r) => r.status !== 'Rejected' && r.status !== 'Offer').map((r) => r.company),
  );

  const upcomingInterviews = rows
    .filter((r) => isWithinWindow(r.interviewDate, referenceDate, UPCOMING_WINDOW_DAYS))
    .sort((a, b) => (a.interviewDate ?? '').localeCompare(b.interviewDate ?? ''));

  const highPriorityPrep = dedupe(
    rows.filter((r) => r.priority === 'High').flatMap((r) => r.prepTopics),
  );

  const followUpsDue = rows.filter((r) => !r.nextActionDone);

  const missingInfo = rows
    .map(buildMissingInfoItem)
    .filter((item): item is MissingInfoItem => item !== null);

  return {
    totalActive: activeCompanies.size,
    upcomingInterviews,
    highPriorityPrep,
    followUpsDue,
    missingInfo,
  };
}

// isWithinWindow('2026-07-10', new Date('2026-07-07'), 7) -> true
// isWithinWindow('2026-07-20', new Date('2026-07-07'), 7) -> false (too far out)
// isWithinWindow('2026-07-01', new Date('2026-07-07'), 7) -> false (in the past)
// isWithinWindow(null, ..., 7) -> false
function isWithinWindow(dateStr: string | null, referenceDate: Date, days: number): boolean {
  if (!dateStr) return false;
  const target = new Date(dateStr);
  const diffDays = (target.getTime() - startOfDay(referenceDate).getTime()) / 86_400_000;
  return diffDays >= 0 && diffDays <= days;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}

// buildMissingInfoItem(row without interviewDate/prepTopics) -> { rowId, company, fields: ['interviewDate', 'prepTopics'] }
// buildMissingInfoItem(fully-populated row) -> null
function buildMissingInfoItem(row: TrackerRow): MissingInfoItem | null {
  const fields: string[] = [];
  if (!row.company.trim()) fields.push('company');
  if (!row.interviewDate) fields.push('interviewDate');
  if (row.prepTopics.length === 0) fields.push('prepTopics');
  if (!row.nextAction.trim()) fields.push('nextAction');

  if (fields.length === 0) return null;
  return { rowId: row.id, company: row.company, fields };
}
