Project:
Build an “AI Interview Prep Tracker” that turns messy job descriptions, recruiter notes, interview schedules, and personal prep notes into a structured Airtable-style tracker.

Goal:
Create a small but complete workflow that solves a real problem: helping a candidate organize multiple interview processes, extract important information, track next actions, and prepare strategically.

The final app should feel like a lightweight Airtable base powered by AI-assisted structure extraction.

Tech Stack:
- React
- TypeScript
- Vite
- Local state only; no backend required
- Use clean component architecture
- Use deterministic mock AI logic instead of real API calls unless simple API integration is easy
- Keep the UI clean, practical, and demo-friendly

Core User Flow:
1. User pastes messy input into a text area.
   Example input may include:
   - Job description
   - Recruiter email
   - Interview notes
   - Company name
   - Role
   - Interview rounds
   - Dates or availability
   - Prep topics
   - Follow-up tasks
   - Compensation notes
   - Links

2. User clicks “Generate Tracker”.

3. The app extracts structured rows and fields:
   - Company
   - Role
   - Stage / Round
   - Interview Date
   - Interview Type
   - Prep Topics
   - Status
   - Priority
   - Next Action
   - Follow-up Owner
   - Notes

4. Render the result as an editable table.

5. User can:
   - Edit cells inline
   - Add a row
   - Delete a row
   - Sort by date or priority
   - Filter by status or company
   - Mark next action as done

6. Show a summary panel:
   - Total active opportunities
   - Upcoming interviews
   - High-priority prep items
   - Follow-ups due
   - Missing information

7. Add a sample messy input button so the demo works immediately.

Staff-Level Expectations:
Please do not just build a toy UI. Structure the implementation in a way that demonstrates senior engineering judgment.

Architecture Requirements:
- Separate parsing/extraction logic from UI components.
- Create clear TypeScript types for `InterviewOpportunity`, `InterviewRound`, `TrackerRow`, and `TrackerSummary`.
- Keep table state updates predictable and immutable.
- Add utility functions for:
  - Parsing messy input
  - Inferring company / role / stage / dates
  - Computing summary metrics
  - Filtering and sorting rows
- Make the parser deterministic and testable.
- Include a few unit-test-like examples or documented test cases in code comments if a full test setup is too much.

Product Requirements:
- The workflow should feel useful within 2 minutes.
- The user should understand the value immediately.
- The table should be editable after AI generation because AI output may be incomplete or wrong.
- Include empty states and helpful fallback behavior when the parser cannot infer something.
- Use practical statuses:
  - Applied
  - Recruiter Screen
  - Technical Screen
  - Onsite
  - Offer
  - Rejected
  - Follow-up Needed

Design Requirements:
- Clean Airtable-inspired layout.
- Left panel for messy input.
- Main panel for generated tracker table.
- Right or top summary panel for insights.
- Avoid over-designed marketing UI.
- Prioritize scannability, spacing, and useful controls.

Optimize for:
- A clear real-world workflow
- A working demo
- A thoughtful agent collaboration story
- A reasonable scope
- Clean code
- Product judgment
