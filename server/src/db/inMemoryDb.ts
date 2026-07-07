import type {
  TrackerRow,
  InterviewOpportunity,
  FilterState,
  SortState,
} from '@interview-prep/shared';
import type { ITrackerRepository } from './interface.js';
import { filterRows, sortRows } from '../services/tableUtils.js';

// =============================================================================
// InMemoryRepository — Map-backed implementation of ITrackerRepository.
//
// Suitable for development and demos. Data resets on server restart.
// Replace with PostgresRepository (or similar) for persistence — see RUNBOOK.md.
// =============================================================================

export class InMemoryRepository implements ITrackerRepository {
  private rows = new Map<string, TrackerRow>();
  private opportunities = new Map<string, InterviewOpportunity>();

  // ---------------------------------------------------------------------------
  // Rows
  // ---------------------------------------------------------------------------

  async getAllRows(
    filter?: Partial<FilterState>,
    sort?: SortState,
  ): Promise<TrackerRow[]> {
    const filtered = filterRows([...this.rows.values()], filter);
    return sortRows(filtered, sort);
  }

  async getRowById(id: string): Promise<TrackerRow | null> {
    return this.rows.get(id) ?? null;
  }

  async upsertRow(row: TrackerRow): Promise<TrackerRow> {
    const now = new Date().toISOString();
    const saved: TrackerRow = {
      ...row,
      updatedAt: now,
      createdAt: row.createdAt ?? now,
    };
    this.rows.set(saved.id, saved);
    return saved;
  }

  async deleteRow(id: string): Promise<void> {
    this.rows.delete(id);
  }

  async bulkInsertRows(rows: TrackerRow[]): Promise<TrackerRow[]> {
    const now = new Date().toISOString();
    const saved = rows.map((r) => ({
      ...r,
      updatedAt: now,
      createdAt: r.createdAt ?? now,
    }));
    saved.forEach((r) => this.rows.set(r.id, r));
    return saved;
  }

  // ---------------------------------------------------------------------------
  // Opportunities
  // ---------------------------------------------------------------------------

  async getAllOpportunities(): Promise<InterviewOpportunity[]> {
    return [...this.opportunities.values()];
  }

  async upsertOpportunity(opp: InterviewOpportunity): Promise<InterviewOpportunity> {
    const now = new Date().toISOString();
    const saved: InterviewOpportunity = {
      ...opp,
      updatedAt: now,
      createdAt: opp.createdAt ?? now,
    };
    this.opportunities.set(saved.id, saved);
    return saved;
  }

  async deleteOpportunity(id: string): Promise<void> {
    this.opportunities.delete(id);
    // Cascade: remove all rows belonging to this opportunity
    for (const [rowId, row] of this.rows) {
      if (row.opportunityId === id) {
        this.rows.delete(rowId);
      }
    }
  }
}
