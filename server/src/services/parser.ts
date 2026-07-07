import { randomUUID } from 'node:crypto';
import type { InterviewStatus, Priority, TrackerRow } from '@interview-prep/shared';
import {
  COMPANY_KEYWORDS,
  DATE_PATTERNS,
  MONTHS,
  PREP_TOPIC_KEYWORDS,
  STAGE_PATTERNS,
  STAGE_TO_INTERVIEW_TYPE,
  STAGE_TO_STATUS,
} from '../lib/constants.js';

// =============================================================================
// parser.ts — Deterministic, regex-based extraction of TrackerRow[] from raw
// pasted interview notes. Lives on the server so extraction logic is
// centralized: the client just POSTs text and gets structured rows back.
//
// Upgrade path: swap the body of parseInput() for an LLM call while keeping
// the same signature — nothing else in the app needs to change.
//
// Keyword/pattern tables (company names, prep topics, date regexes, stage
// mappings) live in ../lib/constants.ts — this file is just the inference
// functions over those tables.
// =============================================================================

/**
 * parseInput("Airtable - Staff FE\nTechnical screen July 14. Prep: React, system design.")
 *   -> [{ company: 'Airtable', role: 'Staff FE', stage: 'Technical Screen', ... }]
 *
 * parseInput("") -> []
 * parseInput("   \n\n   ") -> []
 *
 * Every call produces at most one row: the whole pasted text is treated as
 * notes for a single opportunity, even if it spans multiple paragraphs.
 * One "Generate Tracker" submit = one row. To track another company, paste
 * its notes and submit again.
 */
export function parseInput(raw: string, referenceDate: Date = new Date()): TrackerRow[] {
  const text = raw.trim();
  if (!text) return [];

  const company = inferCompany(text);
  const stage = inferStage(text);
  const interviewDate = inferDate(text, referenceDate);
  const prepTopics = inferPrepTopics(text);
  const status = inferStatus(stage, text);
  const priority = inferPriority(text, interviewDate, referenceDate);
  const now = new Date().toISOString();

  const row: TrackerRow = {
    id: `row-${randomUUID()}`,
    opportunityId: `opp-${randomUUID()}`,
    company,
    role: inferRole(text),
    status,
    priority,
    notes: text,
    stage,
    interviewDate,
    interviewType: STAGE_TO_INTERVIEW_TYPE[stage] ?? 'Unknown',
    prepTopics,
    nextAction: inferNextAction(text),
    nextActionDone: false,
    followUpOwner: inferFollowUpOwner(text, company),
    createdAt: now,
    updatedAt: now,
  };

  return [row];
}

// inferCompany("Airtable - Staff Frontend Engineer\n...") -> "Airtable"
// inferCompany("Chat with the Stripe recruiter today") -> "Stripe"
// inferCompany("Foo Corp: onsite scheduled") -> "Foo Corp"
// inferCompany("no identifiable company here") -> "Unknown Company"
export function inferCompany(text: string): string {
  for (const name of COMPANY_KEYWORDS) {
    const re = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i');
    if (re.test(text)) return name;
  }

  const firstLine = text.split('\n')[0] ?? '';
  const headerMatch = firstLine.match(/^([A-Z][\w&.]*(?:\s[A-Z][\w&.]*)*)\s*[-–:]/);
  if (headerMatch) return headerMatch[1].trim();

  return 'Unknown Company';
}

// inferRole("Airtable - Staff Frontend Engineer\n...") -> "Staff Frontend Engineer"
// inferRole("Interviewing for Senior Software Engineer role") -> "Senior Software Engineer"
// inferRole("no role mentioned") -> "Unknown Role"
export function inferRole(text: string): string {
  const firstLine = text.split('\n')[0] ?? '';
  const afterSeparator = firstLine.match(/[-–:]\s*(.+)$/);
  if (afterSeparator && /engineer|manager|designer|architect|scientist|analyst|developer/i.test(afterSeparator[1])) {
    return afterSeparator[1].trim();
  }

  const titleMatch = text.match(
    /((?:Staff|Senior|Sr\.?|Junior|Jr\.?|Lead|Principal|Founding)\s+)?((?:Software|Frontend|Backend|Full[- ]?Stack|Data|Platform|Infrastructure|Mobile|iOS|Android|ML|AI|DevOps|Site Reliability|Security|QA)\s+)?(Engineer|Developer|Manager|Designer|Architect|Scientist|Analyst)/i,
  );
  if (titleMatch) return titleMatch[0].replace(/\s+/g, ' ').trim();

  return 'Unknown Role';
}

// inferStage("Final round onsite July 8") -> "Final Onsite"
// inferStage("Technical screen scheduled") -> "Technical Screen"
// inferStage("Applied via referral") -> "Applied"
// inferStage("no signal") -> "Applied" (default)
export function inferStage(text: string): string {
  for (const [pattern, stage] of STAGE_PATTERNS) {
    if (pattern.test(text)) return stage;
  }
  return 'Applied';
}

// inferDate("Interview on July 10", new Date('2026-07-01')) -> "2026-07-10"
// inferDate("Scheduled 2026-07-14", ...) -> "2026-07-14"
// inferDate("Call on 7/8", new Date('2026-07-01')) -> "2026-07-08"
// inferDate("no date mentioned", ...) -> null
export function inferDate(text: string, referenceDate: Date = new Date()): string | null {
  const isoMatch = text.match(DATE_PATTERNS.iso);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return toIsoDate(new Date(Number(year), Number(month) - 1, Number(day)));
  }

  const monthMatch = text.match(DATE_PATTERNS.monthName);
  if (monthMatch) {
    const month = MONTHS[monthMatch[1].toLowerCase()];
    const day = Number(monthMatch[2]);
    return toIsoDate(resolveYear(month, day, referenceDate));
  }

  const slashMatch = text.match(DATE_PATTERNS.slash);
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    const month = Number(m) - 1;
    const day = Number(d);
    if (y) {
      const year = y.length === 2 ? 2000 + Number(y) : Number(y);
      return toIsoDate(new Date(year, month, day));
    }
    return toIsoDate(resolveYear(month, day, referenceDate));
  }

  if (DATE_PATTERNS.tomorrow.test(text)) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() + 1);
    return toIsoDate(d);
  }
  if (DATE_PATTERNS.today.test(text)) {
    return toIsoDate(referenceDate);
  }

  return null;
}

// inferPrepTopics("Prep: React, system design, leadership stories") -> ["React", "system design", "leadership stories"]
// inferPrepTopics("Need to review TypeScript and behavioral questions") -> ["TypeScript", "behavioral"]
// inferPrepTopics("no topics here") -> []
export function inferPrepTopics(text: string): string[] {
  const labeledMatch = text.match(/(?:prep(?:aration)?|topics?)\s*:\s*(.+)/i);
  if (labeledMatch) {
    const items = labeledMatch[1]
      .split(/[,;]/)
      .map((s) => s.trim().replace(/[.!?]+$/, ''))
      .filter((s) => s.length > 0);
    if (items.length > 0) return dedupe(items);
  }

  const found = PREP_TOPIC_KEYWORDS.filter((topic) =>
    new RegExp(`\\b${escapeRegExp(topic)}\\b`, 'i').test(text),
  );
  return dedupe(found);
}

// inferStatus("Recruiter Screen", "reached out, no response yet") -> "Follow-up Needed"
// inferStatus("Rejected", "unfortunately rejected after onsite") -> "Rejected"
// inferStatus("Technical Screen", "screen scheduled for next week") -> "Technical Screen"
export function inferStatus(stage: string, text: string): InterviewStatus {
  if (/\breject/i.test(text)) return 'Rejected';
  if (/\boffer\b/i.test(text) && !/no offer/i.test(text)) return 'Offer';
  if (/no response|follow[- ]?up|haven't heard|waiting to hear/i.test(text)) {
    return 'Follow-up Needed';
  }
  return STAGE_TO_STATUS[stage] ?? 'Applied';
}

// inferPriority("URGENT: send references today", null, ref) -> "High"
// inferPriority("Interview in 3 days", "<date 3 days out>", ref) -> "High"
// inferPriority("Low priority, backup option", null, ref) -> "Low"
// inferPriority("Applied, waiting to hear", null, ref) -> "Medium"
export function inferPriority(
  text: string,
  interviewDate: string | null,
  referenceDate: Date = new Date(),
): Priority {
  if (/urgent|asap|high priority/i.test(text)) return 'High';
  if (/low priority|not (a )?priority|backup/i.test(text)) return 'Low';
  if (/dream (job|company)|top choice|excited about/i.test(text)) return 'High';

  if (interviewDate) {
    const diffDays = (new Date(interviewDate).getTime() - startOfDay(referenceDate).getTime()) / 86_400_000;
    if (diffDays >= 0 && diffDays <= 7) return 'High';
  }

  return 'Medium';
}

// inferNextAction("Next: send references by Friday") -> "send references by Friday"
// inferNextAction("Need to prep system design before Thursday") -> "Need to prep system design before Thursday"
// inferNextAction("no clear action") -> "Review notes and plan next step"
export function inferNextAction(text: string): string {
  const labeledMatch = text.match(/(?:next(?: action)?|todo|action|follow[- ]?up)\s*:\s*(.+)/i);
  if (labeledMatch) return labeledMatch[1].trim().split('\n')[0].trim();

  const sentences = text.split(/(?<=[.!?])\s+|\n/).map((s) => s.trim()).filter(Boolean);
  const actionable = sentences.find((s) =>
    /\b(need to|should|must|send|schedule|prep|follow up|review|confirm)\b/i.test(s),
  );
  if (actionable) return actionable;

  return 'Review notes and plan next step';
}

function inferFollowUpOwner(text: string, company: string): string {
  if (/recruiter/i.test(text) && /no response|waiting|follow[- ]?up|haven't heard/i.test(text)) {
    return `${company} recruiter`;
  }
  return 'me';
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function toIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// If a bare "month + day" (no year) resolves to more than ~2 months in the
// past relative to referenceDate, assume it means next year.
function resolveYear(month: number, day: number, referenceDate: Date): Date {
  const candidate = new Date(referenceDate.getFullYear(), month, day);
  const diffDays = (candidate.getTime() - startOfDay(referenceDate).getTime()) / 86_400_000;
  if (diffDays < -60) {
    return new Date(referenceDate.getFullYear() + 1, month, day);
  }
  return candidate;
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
