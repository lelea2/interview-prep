import OpenAI from 'openai';
import type { z } from 'zod';
import { INTERVIEW_STATUSES, PRIORITIES, INTERVIEW_TYPES } from '@interview-prep/shared';
import { HttpError } from '../lib/httpError.js';
import { llmExtractionSchema } from '../schemas/tracker.js';

// =============================================================================
// openaiClient.ts — Calls OpenAI (Structured Outputs) to extract interview-
// opportunity fields from raw pasted notes. This is the only file that knows
// about OpenAI; parser.ts just calls extractOpportunity() and attaches
// server-generated identity/timestamps.
// =============================================================================

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new HttpError(
      500,
      'Server is not configured with OPENAI_API_KEY. Set it in server/.env (see RUNBOOK.md) to enable Generate Tracker.',
    );
  }
  client ??= new OpenAI({ apiKey });
  return client;
}

// JSON Schema for OpenAI's Structured Outputs (strict mode: every property
// must be listed in `required`, and `additionalProperties: false`). Mirrors
// llmExtractionSchema field-for-field — see schemas/tracker.ts.
const EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    company: {
      type: 'string',
      description: 'Company name mentioned in the notes. "Unknown Company" if none is mentioned.',
    },
    role: {
      type: 'string',
      description: 'Job title/role. "Unknown Role" if none is mentioned.',
    },
    status: { type: 'string', enum: INTERVIEW_STATUSES },
    priority: { type: 'string', enum: PRIORITIES },
    stage: {
      type: 'string',
      description: 'Short label for the current stage, e.g. "Technical Screen", "Final Onsite", "Applied".',
    },
    interviewDate: {
      type: ['string', 'null'],
      description: 'Next interview date as an ISO date (YYYY-MM-DD), or null if none is mentioned.',
    },
    interviewType: { type: 'string', enum: INTERVIEW_TYPES },
    prepTopics: {
      type: 'array',
      items: { type: 'string' },
      description: 'Topics to prepare for, deduplicated.',
    },
    nextAction: {
      type: 'string',
      description: 'The single next actionable step for the candidate.',
    },
    followUpOwner: {
      type: 'string',
      description: '"me" unless the notes name a specific recruiter or contact who owns the next step.',
    },
  },
  required: [
    'company', 'role', 'status', 'priority', 'stage', 'interviewDate',
    'interviewType', 'prepTopics', 'nextAction', 'followUpOwner',
  ],
  additionalProperties: false,
} as const;

function buildSystemPrompt(referenceDate: Date): string {
  const today = referenceDate.toISOString().split('T')[0];
  return [
    "You extract structured interview-tracker data from one candidate's messy, informal notes about a single job opportunity.",
    `Today's date is ${today}. Resolve relative dates ("next week", "this Friday") against it.`,
    'Extract exactly one opportunity — the notes describe one company\'s process, even if they mention several rounds.',
    'Set priority "High" if the next interview is within 7 days, or the notes describe it as urgent or a top choice.',
    'If the notes describe an application with no response yet, use status "Follow-up Needed".',
  ].join(' ');
}

export async function extractOpportunity(
  raw: string,
  referenceDate: Date = new Date(),
): Promise<z.infer<typeof llmExtractionSchema>> {
  const openai = getClient();

  let response: OpenAI.Chat.Completions.ChatCompletion;
  try {
    response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: buildSystemPrompt(referenceDate) },
        { role: 'user', content: raw },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'interview_opportunity',
          schema: EXTRACTION_JSON_SCHEMA,
          strict: true,
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    throw new HttpError(502, `OpenAI request failed: ${message}`);
  }

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new HttpError(502, 'OpenAI returned an empty response');
  }

  const result = llmExtractionSchema.safeParse(JSON.parse(content));
  if (!result.success) {
    throw new HttpError(502, 'OpenAI response did not match the expected shape', result.error.flatten());
  }

  return result.data;
}
