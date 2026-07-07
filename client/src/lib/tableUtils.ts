import type { FilterState, SortState, TrackerRow } from '@interview-prep/shared';

// =============================================================================
// lib/tableUtils.ts — client-side filter/sort for instant feedback (no
// round-trip per keystroke). Deliberately mirrors
// server/src/services/tableUtils.ts (same PRIORITY_ORDER/STATUS_ORDER, same
// null-date-last rule) so the client's instant view matches what
// `GET /api/rows?status=&sortBy=&dir=` would return. Duplicated rather than
// shared because the client sorts an already-fetched in-memory array
// synchronously, while the server version lives alongside the repository
// layer — promote to shared/ if the two ever drift.
// =============================================================================

const PRIORITY_ORDER: Record<string, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

const STATUS_ORDER: Record<string, number> = {
  'Follow-up Needed': 0,
  Onsite: 1,
  'Technical Screen': 2,
  'Recruiter Screen': 3,
  Applied: 4,
  Offer: 5,
  Rejected: 6,
};

export function filterRows(rows: TrackerRow[], filters: FilterState): TrackerRow[] {
  let result = rows;
  if (filters.status !== 'All') {
    result = result.filter((r) => r.status === filters.status);
  }
  if (filters.company !== 'All') {
    result = result.filter((r) => r.company === filters.company);
  }
  if (!filters.showDoneActions) {
    result = result.filter((r) => !r.nextActionDone);
  }
  return result;
}

export function sortRows(rows: TrackerRow[], sort: SortState): TrackerRow[] {
  const dir = sort.direction === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    switch (sort.field) {
      case 'interviewDate': {
        // Null dates always sort to the end, regardless of direction.
        if (!a.interviewDate && !b.interviewDate) return 0;
        if (!a.interviewDate) return 1;
        if (!b.interviewDate) return -1;
        return dir * a.interviewDate.localeCompare(b.interviewDate);
      }
      case 'priority': {
        const pa = PRIORITY_ORDER[a.priority] ?? 99;
        const pb = PRIORITY_ORDER[b.priority] ?? 99;
        return dir * (pa - pb);
      }
      case 'status': {
        const sa = STATUS_ORDER[a.status] ?? 99;
        const sb = STATUS_ORDER[b.status] ?? 99;
        return dir * (sa - sb);
      }
      case 'company':
        return dir * a.company.localeCompare(b.company);
      case 'createdAt':
        return dir * a.createdAt.localeCompare(b.createdAt);
      default:
        return 0;
    }
  });
}
