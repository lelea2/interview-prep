import type {
  TrackerRow,
  InterviewOpportunity,
  FilterState,
  SortState,
} from '@interview-prep/shared';

// =============================================================================
// ITrackerRepository — contract that every DB implementation must satisfy.
//
// Swap rule: to use Postgres (or any other store), create a new file that
// implements this interface and inject it in server/src/index.ts.
// No other files change.
// =============================================================================

export interface ITrackerRepository {
  // ---------------------------------------------------------------------------
  // Rows  (denormalized view — what the table and API expose)
  // ---------------------------------------------------------------------------

  /** Return all rows, optionally filtered and sorted server-side. */
  getAllRows(filter?: Partial<FilterState>, sort?: SortState): Promise<TrackerRow[]>;

  /** Return a single row by its round id, or null if not found. */
  getRowById(id: string): Promise<TrackerRow | null>;

  /**
   * Insert or replace a row (upsert by id).
   * Always updates `updatedAt` to now.
   */
  upsertRow(row: TrackerRow): Promise<TrackerRow>;

  /** Delete a row by id. No-op if id does not exist. */
  deleteRow(id: string): Promise<void>;

  /**
   * Bulk-insert rows (e.g. after a parse operation).
   * Existing rows with matching ids are replaced.
   */
  bulkInsertRows(rows: TrackerRow[]): Promise<TrackerRow[]>;

  // ---------------------------------------------------------------------------
  // Opportunities  (normalized — used internally for grouping/summary)
  // ---------------------------------------------------------------------------

  /** Return all opportunities. */
  getAllOpportunities(): Promise<InterviewOpportunity[]>;

  /**
   * Insert or replace an opportunity (upsert by id).
   * Always updates `updatedAt` to now.
   */
  upsertOpportunity(opportunity: InterviewOpportunity): Promise<InterviewOpportunity>;

  /** Delete an opportunity and all its associated rows. */
  deleteOpportunity(id: string): Promise<void>;
}
