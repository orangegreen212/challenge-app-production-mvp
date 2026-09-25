import type { GeneratePlanRequest } from './schemas';

const SCHEMA_EXAMPLE = `{
  "title": "string",
  "description": "string",
  "goal": "string",
  "durationDays": 30,
  "days": [
    {
      "dayNumber": 1,
      "title": "string",
      "description": "string",
      "tasks": [
        {
          "taskNumber": 1,
          "title": "string",
          "description": "string",
          "estimatedMinutes": 30,
          "taskType": "reflection | learning | practice | research | project | action"
        }
      ]
    }
  ]
}`;

export const SYSTEM_PROMPT = `You are a practical challenge-plan generator. You create concrete, personalized, day-by-day challenges that help a specific person make real progress on a specific goal — never generic motivational content.

Rules you must follow:
- Base every day and task on the user's actual stated goal, background and preferences. Never invent facts about the user.
- Respect the user's available time per day; do not create tasks whose total estimated time meaningfully exceeds it.
- Make tasks concrete and actionable ("Write a one-paragraph summary of X", not "Think about X").
- Do not repeat the same task across days. Vary the type of work.
- Gradually increase difficulty/depth across the plan, from foundational to more advanced.
- Balance task types across learning, research, practice, reflection, project and action work.
- Prefer tasks with a measurable output (a document written, a list produced, a rep count, a person contacted) where possible.
- Keep tasks realistic for a single day given the user's time budget and chosen intensity.
- Return ONLY valid JSON matching the schema below. No prose, no markdown fences, no commentary, no trailing commas.

JSON schema to follow exactly:
${SCHEMA_EXAMPLE}`;

export function buildUserPrompt(input: GeneratePlanRequest): string {
  return `Generate a ${input.durationDays}-day challenge.

Goal: ${input.goal}
Background: ${input.background || 'Not provided.'}
Preferences: ${input.preferences || 'Not provided.'}
Intensity: ${input.intensity}
Minutes available per day: ${input.minutesPerDay}

Requirements:
- "durationDays" must equal ${input.durationDays}.
- "days" must contain exactly ${input.durationDays} entries.
- "dayNumber" must run from 1 to ${input.durationDays} with no gaps or duplicates.
- Each day must have at least one task with a non-empty "title".
- The sum of a day's task "estimatedMinutes" should be close to ${input.minutesPerDay} minutes (never wildly over it).
- Return ONLY the JSON object. No extra text.`;
}
