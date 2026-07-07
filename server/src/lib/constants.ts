import type { InterviewStatus, InterviewType } from '@interview-prep/shared';

// =============================================================================
// lib/constants.ts — keyword/pattern tables consumed by services/parser.ts.
// Pulled out so parser.ts reads as pure inference functions over these
// tables, and the tables themselves are easy to extend (e.g. add a company)
// without wading through regex logic.
// =============================================================================

export const COMPANY_KEYWORDS = [
  'Airtable', 'Airbnb', 'OpenAI', 'Anthropic', 'Vanta', 'Stripe', 'Google',
  'Meta', 'Amazon', 'Netflix', 'Microsoft', 'Apple', 'Uber', 'Lyft', 'Notion',
  'Figma', 'Linear', 'Vercel', 'Datadog', 'Snowflake', 'Coinbase', 'Robinhood',
  'DoorDash', 'Instacart', 'Pinterest', 'Salesforce', 'Adobe', 'Shopify',
  'Square', 'Block', 'Plaid', 'Brex', 'Ramp', 'Scale AI', 'Databricks',
];

export const PREP_TOPIC_KEYWORDS = [
  'React', 'TypeScript', 'JavaScript', 'system design', 'algorithms',
  'data structures', 'leadership', 'behavioral', 'SQL', 'distributed systems',
  'API design', 'accessibility', 'performance', 'security', 'Node.js',
  'GraphQL', 'Python', 'Java', 'Go', 'testing', 'CSS', 'leetcode',
  'system architecture', 'React hooks', 'async patterns',
];

export const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8,
  september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

// Regexes tried in order by inferDate(). `monthName` relies on MONTHS above
// to resolve the matched name to a month index.
export const DATE_PATTERNS = {
  iso: /\b(\d{4})-(\d{2})-(\d{2})\b/,
  monthName:
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(st|nd|rd|th)?\b/i,
  slash: /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/,
  tomorrow: /\btomorrow\b/i,
  today: /\btoday\b/i,
};

// Ordered most-specific-first: first match wins. Literal event-type phrases
// (e.g. "recruiter screen scheduled") outrank topic-ish words that often show
// up inside a prep list (e.g. "...prep: system design") rather than naming
// the stage itself.
export const STAGE_PATTERNS: Array<[RegExp, string]> = [
  [/final(\s+round)?/i, 'Final Onsite'],
  [/onsite/i, 'Onsite'],
  [/(recruiter (screen|call)|phone screen)/i, 'Recruiter Screen'],
  [/(technical screen|tech screen|coding (interview|round|screen))/i, 'Technical Screen'],
  [/take[- ]?home/i, 'Take-home'],
  [/system design/i, 'System Design'],
  [/behavioral/i, 'Behavioral'],
  [/offer/i, 'Offer'],
  [/reject/i, 'Rejected'],
  [/applied|application/i, 'Applied'],
];

export const STAGE_TO_INTERVIEW_TYPE: Record<string, InterviewType> = {
  'Recruiter Screen': 'Recruiter Call',
  'Technical Screen': 'Technical Screen',
  'Take-home': 'Take-home',
  'System Design': 'System Design',
  Behavioral: 'Behavioral',
  Onsite: 'Onsite',
  'Final Onsite': 'Onsite',
};

export const STAGE_TO_STATUS: Record<string, InterviewStatus> = {
  Applied: 'Applied',
  'Recruiter Screen': 'Recruiter Screen',
  'Technical Screen': 'Technical Screen',
  'Take-home': 'Technical Screen',
  'System Design': 'Technical Screen',
  Behavioral: 'Technical Screen',
  Onsite: 'Onsite',
  'Final Onsite': 'Onsite',
  Offer: 'Offer',
  Rejected: 'Rejected',
};
