import type { TrackerRow } from '@interview-prep/shared';

// =============================================================================
// seed.ts — Pre-seeded tracker rows for the demo.
//
// Represents a realistic job search snapshot: Airtable, Airbnb, OpenAI, Vanta.
// Each company has one or more rounds at different stages so the full table
// feature set (sorting, filtering, summary) is exercisable immediately.
//
// Dates are anchored to 2026-07-07 (today during development) so "upcoming"
// and "overdue" states are visible on first load.
// =============================================================================

const NOW = new Date('2026-07-07T00:00:00.000Z').toISOString();

// Helper for stable ISO date strings
const d = (dateStr: string) => new Date(dateStr).toISOString().split('T')[0];

export const SEED_ROWS: TrackerRow[] = [
  // ---------------------------------------------------------------------------
  // Airtable — Staff Frontend Engineer  (2 rounds)
  // ---------------------------------------------------------------------------
  {
    id: 'airtable-round-1',
    opportunityId: 'opp-airtable',
    company: 'Airtable',
    role: 'Staff Frontend Engineer',
    status: 'Technical Screen',
    priority: 'High',
    stage: 'Recruiter Screen',
    interviewDate: d('2026-07-03'),
    interviewType: 'Recruiter Call',
    prepTopics: ['React architecture', 'TypeScript generics', 'leadership stories'],
    nextAction: 'Send thank-you note to Sarah',
    nextActionDone: true,
    followUpOwner: 'me',
    notes: 'Sarah @ Airtable recruiting. Loop confirmed for next week.',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'airtable-round-2',
    opportunityId: 'opp-airtable',
    company: 'Airtable',
    role: 'Staff Frontend Engineer',
    status: 'Technical Screen',
    priority: 'High',
    stage: 'Frontend System Design',
    interviewDate: d('2026-07-14'),
    interviewType: 'System Design',
    prepTopics: [
      'table rendering performance',
      'schema inference',
      'React architecture',
      'TypeScript generics',
      'virtual scrolling',
    ],
    nextAction: 'Prep system design: collaborative spreadsheet at scale',
    nextActionDone: false,
    followUpOwner: 'me',
    notes: 'July 14, 2pm PST. Followed by coding round July 15 and behavioral with VP Eng.',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'airtable-round-3',
    opportunityId: 'opp-airtable',
    company: 'Airtable',
    role: 'Staff Frontend Engineer',
    status: 'Technical Screen',
    priority: 'High',
    stage: 'Coding Round',
    interviewDate: d('2026-07-15'),
    interviewType: 'Technical Screen',
    prepTopics: ['LeetCode medium', 'TypeScript', 'React hooks'],
    nextAction: 'Do 2 practice problems focusing on graph / tree traversal',
    nextActionDone: false,
    followUpOwner: 'me',
    notes: 'Back-to-back with system design day. Comp: ~$280–320k TC.',
    createdAt: NOW,
    updatedAt: NOW,
  },

  // ---------------------------------------------------------------------------
  // Airbnb — Senior / Staff Frontend Engineer  (1 round, stalled)
  // ---------------------------------------------------------------------------
  {
    id: 'airbnb-round-1',
    opportunityId: 'opp-airbnb',
    company: 'Airbnb',
    role: 'Senior/Staff Frontend Engineer',
    status: 'Follow-up Needed',
    priority: 'Medium',
    stage: 'Applied',
    interviewDate: null,
    interviewType: 'Unknown',
    prepTopics: ['React', 'TypeScript', 'maps & search UI'],
    nextAction: 'Follow up with recruiter if no reply by July 10',
    nextActionDone: false,
    followUpOwner: 'Airbnb recruiter',
    notes: 'Applied via referral. Search & maps team. Recruiter: jobs@airbnb.com. No response yet.',
    createdAt: NOW,
    updatedAt: NOW,
  },

  // ---------------------------------------------------------------------------
  // OpenAI — Software Engineer, Frontend (AI Products)  (2 rounds)
  // ---------------------------------------------------------------------------
  {
    id: 'openai-round-1',
    opportunityId: 'opp-openai',
    company: 'OpenAI',
    role: 'Software Engineer, Frontend (AI Products)',
    status: 'Technical Screen',
    priority: 'High',
    stage: 'Technical Screen',
    interviewDate: d('2026-07-10'),
    interviewType: 'Technical Screen',
    prepTopics: [
      'JavaScript fundamentals',
      'React hooks',
      'async patterns',
      'system design for AI interfaces',
    ],
    nextAction: 'Prep async JS patterns, review AI UI paradigms, mock system design',
    nextActionDone: false,
    followUpOwner: 'me',
    notes:
      'July 10 at 11am. Previous feedback: "strong on systems, brush up on async patterns". Onsite pending after this round.',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'openai-round-2',
    opportunityId: 'opp-openai',
    company: 'OpenAI',
    role: 'Software Engineer, Frontend (AI Products)',
    status: 'Technical Screen',
    priority: 'High',
    stage: 'Onsite (pending)',
    interviewDate: null,
    interviewType: 'Onsite',
    prepTopics: ['system design for AI interfaces', 'leadership stories', 'performance'],
    nextAction: 'Schedule onsite after technical screen passes',
    nextActionDone: false,
    followUpOwner: 'OpenAI recruiter',
    notes: 'Onsite details TBD — contingent on technical screen result.',
    createdAt: NOW,
    updatedAt: NOW,
  },

  // ---------------------------------------------------------------------------
  // Vanta — Staff Engineer (Compliance Platform)  (1 round — final/urgent)
  // ---------------------------------------------------------------------------
  {
    id: 'vanta-round-1',
    opportunityId: 'opp-vanta',
    company: 'Vanta',
    role: 'Staff Engineer (Compliance Platform)',
    status: 'Onsite',
    priority: 'High',
    stage: 'Final Onsite',
    interviewDate: d('2026-07-08'),
    interviewType: 'Onsite',
    prepTopics: [
      'TypeScript strict mode',
      'security concepts',
      'leadership stories',
      'accessibility standards',
      'system design (security)',
    ],
    nextAction: 'Send references to Marcus by July 7 — URGENT',
    nextActionDone: false,
    followUpOwner: 'me',
    notes:
      'Final round onsite July 8. 3 rounds: system design (security), coding (TS), leadership. Recruiter: Marcus @ Vanta, marcus@vanta.com. Comp discussion after offer.',
    createdAt: NOW,
    updatedAt: NOW,
  },
];
