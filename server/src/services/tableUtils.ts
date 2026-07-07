import type { TrackerRow, FilterState, SortState } from '@interview-prep/shared';

// =============================================================================
// tableUtils.ts — Filtering and sorting logic shared by the repository layer
// and the /api/rows query-param handling. Single source of truth so the
// in-memory repo and (later) a Postgres repo behave identically.
// =============================================================================

const PRIORITY_ORDER: Record<string, number> = {
  High: 0,
  Medium: 1,
  Low: 2,
};

// Mirrors the natural pipeline progression, most urgent first.
const STATUS_ORDER: Record<string, number> = {
  'Follow-up Needed': 0,
  Onsite: 1,
  'Technical Screen': 2,
  'Recruiter Screen': 3,
  Applied: 4,
  Offer: 5,
  Rejected: 6,
};

export function filterRows(rows: TrackerRow[], filters?: Partial<FilterState>): TrackerRow[] {
  if (!filters) return rows;

  let result = rows;
  if (filters.status && filters.status !== 'All') {
    result = result.filter((r) => r.status === filters.status);
  }
  if (filters.company && filters.company !== 'All') {
    result = result.filter((r) => r.company === filters.company);
  }
  if (filters.showDoneActions === false) {
    result = result.filter((r) => !r.nextActionDone);
  }
  return result;
}

export function sortRows(rows: TrackerRow[], sort?: SortState): TrackerRow[] {
  const { field, direction } = sort ?? { field: 'interviewDate', direction: 'asc' };
  const dir = direction === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    switch (field) {
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
