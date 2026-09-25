import { z } from 'zod';

export const taskTypeEnum = z.enum([
  'reflection',
  'learning',
  'practice',
  'research',
  'project',
  'action',
]);

export const generatedTaskSchema = z.object({
  taskNumber: z.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).default(''),
  estimatedMinutes: z.number().int().positive().max(480),
  taskType: taskTypeEnum,
});

export const generatedDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).default(''),
  tasks: z.array(generatedTaskSchema).min(1),
});

export const generatedChallengeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).default(''),
  goal: z.string().trim().max(1000).default(''),
  // Capped at 21 (not the original 90): on Vercel Hobby, serverless
  // functions are hard-killed at 10s regardless of `maxDuration` in code,
  // and the model can't reliably generate a full JSON plan for longer durations
  // within that window. See generatePlanRequestSchema below for the
  // matching input-side cap.
  durationDays: z.number().int().positive().max(21),
  days: z.array(generatedDaySchema).min(1),
});

export type GeneratedTask = z.infer<typeof generatedTaskSchema>;
export type GeneratedDay = z.infer<typeof generatedDaySchema>;
export type GeneratedChallenge = z.infer<typeof generatedChallengeSchema>;

/**
 * Extra structural checks that a plain z.parse can't express cleanly:
 * day numbers must be a contiguous 1..durationDays sequence matching the
 * requested duration exactly. Throws a descriptive Error on failure.
 */
export function validateGeneratedChallengeStructure(
  challenge: GeneratedChallenge,
  expectedDurationDays: number
) {
  if (challenge.durationDays !== expectedDurationDays) {
    throw new Error(
      `Expected durationDays=${expectedDurationDays}, got ${challenge.durationDays}`
    );
  }
  if (challenge.days.length !== expectedDurationDays) {
    throw new Error(
      `Expected exactly ${expectedDurationDays} days, got ${challenge.days.length}`
    );
  }
  const dayNumbers = challenge.days.map((d) => d.dayNumber).sort((a, b) => a - b);
  for (let i = 0; i < dayNumbers.length; i++) {
    if (dayNumbers[i] !== i + 1) {
      throw new Error(
        `Day numbers must be exactly 1..${expectedDurationDays} with no gaps or duplicates`
      );
    }
  }
  for (const day of challenge.days) {
    if (day.tasks.length === 0) {
      throw new Error(`Day ${day.dayNumber} has no tasks`);
    }
  }
}

export const generatePlanRequestSchema = z.object({
  goal: z.string().trim().min(1, 'goal is required').max(1000),
  background: z.string().trim().max(2000).default(''),
  preferences: z.string().trim().max(1000).default(''),
  // Kept in sync with generatedChallengeSchema.durationDays above.
  durationDays: z.number().int().positive().max(21).default(14),
  intensity: z.enum(['light', 'balanced', 'intensive']).default('balanced'),
  minutesPerDay: z.number().int().positive().max(480).default(30),
});

export type GeneratePlanRequest = z.infer<typeof generatePlanRequestSchema>;
