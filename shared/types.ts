// =============================================================================
// shared/types.ts — Single source of truth for all types used by client + server
// =============================================================================

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export type InterviewStatus =
  | 'Applied'
  | 'Recruiter Screen'
  | 'Technical Screen'
  | 'Onsite'
  | 'Offer'
  | 'Rejected'
  | 'Follow-up Needed';

export type Priority = 'High' | 'Medium' | 'Low';

export type InterviewType =
  | 'Recruiter Call'
  | 'Technical Screen'
  | 'Take-home'
  | 'System Design'
  | 'Behavioral'
  | 'Onsite'
  | 'Unknown';

// `as const satisfies` keeps these as literal tuples (so Zod can build enum
// schemas directly from them — see server/src/schemas/tracker.ts) while still
// checking each entry against its corresponding union type.
export const INTERVIEW_STATUSES = [
  'Applied',
  'Recruiter Screen',
  'Technical Screen',
  'Onsite',
  'Offer',
  'Rejected',
  'Follow-up Needed',
] as const satisfies InterviewStatus[];

export const PRIORITIES = ['High', 'Medium', 'Low'] as const satisfies Priority[];

export const INTERVIEW_TYPES = [
  'Recruiter Call',
  'Technical Screen',
  'Take-home',
  'System Design',
  'Behavioral',
  'Onsite',
  'Unknown',
] as const satisfies InterviewType[];

// ---------------------------------------------------------------------------
// Core domain entities
// ---------------------------------------------------------------------------

/**
 * One interview event within an opportunity (e.g. "Technical Screen on July 10").
 */
export interface InterviewRound {
  id: string;
  opportunityId: string;
  stage: string;
  interviewDate: string | null; // ISO date string ("2026-07-10") or null
  interviewType: InterviewType;
  prepTopics: string[];
  nextAction: string;
  nextActionDone: boolean;
  followUpOwner: string; // e.g. "me" | "Sarah @ Airtable"
  createdAt: string;
  updatedAt: string;
}

/**
 * Company-level interview process. Contains one or more rounds.
 */
export interface InterviewOpportunity {
  id: string;
  company: string;
  role: string;
  status: InterviewStatus;
  priority: Priority;
  rounds: InterviewRound[];
  notes: string;
  compensationNotes: string;
  links: string[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// TrackerRow — denormalized view used by the table
// One row = one InterviewRound with opportunity fields flattened in.
// ---------------------------------------------------------------------------

export interface TrackerRow {
  // Round identity
  id: string;            // round id
  opportunityId: string;

  // Opportunity fields (denormalized)
  company: string;
  role: string;
  status: InterviewStatus;
  priority: Priority;
  notes: string;

  // Round fields
  stage: string;
  interviewDate: string | null;
  interviewType: InterviewType;
  prepTopics: string[];
  nextAction: string;
  nextActionDone: boolean;
  followUpOwner: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// TrackerSummary — computed metrics for the summary panel
// ---------------------------------------------------------------------------

export interface MissingInfoItem {
  rowId: string;
  company: string;
  fields: string[]; // e.g. ["interviewDate", "prepTopics"]
}

export interface TrackerSummary {
  totalActive: number;
  upcomingInterviews: TrackerRow[];  // within next 7 days
  highPriorityPrep: string[];        // deduplicated topics from High-priority rows
  followUpsDue: TrackerRow[];        // nextActionDone === false
  missingInfo: MissingInfoItem[];
}

// ---------------------------------------------------------------------------
// Filter & Sort state (shared so server query params mirror client state)
// ---------------------------------------------------------------------------

export interface FilterState {
  status: InterviewStatus | 'All';
  company: string; // company name or 'All'
  showDoneActions: boolean;
}

export type SortField = 'interviewDate' | 'priority' | 'company' | 'status' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export const SORT_FIELDS = [
  'interviewDate',
  'priority',
  'company',
  'status',
  'createdAt',
] as const satisfies SortField[];

export const SORT_DIRECTIONS = ['asc', 'desc'] as const satisfies SortDirection[];

export interface SortState {
  field: SortField;
  direction: SortDirection;
}

// ---------------------------------------------------------------------------
// API request / response contracts
// ---------------------------------------------------------------------------

export interface ParseRequest {
  raw: string;
}

export interface ParseResponse {
  rows: TrackerRow[];
}

export interface AddRowRequest {
  opportunityId?: string; // if omitted, server creates a new opportunity
}

export interface UpdateRowRequest {
  fields: Partial<Omit<TrackerRow, 'id' | 'opportunityId' | 'createdAt'>>;
}

export interface BulkInsertRequest {
  rows: TrackerRow[];
}

export interface BulkInsertResponse {
  rows: TrackerRow[];
  count: number;
}

export interface ApiError {
  error: string;
  details?: unknown;
}
