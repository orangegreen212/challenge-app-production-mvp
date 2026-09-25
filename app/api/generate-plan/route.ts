import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePlanRequestSchema, generatedChallengeSchema, validateGeneratedChallengeStructure } from '@/lib/ai/schemas';
import { generateChallengeJson, GroqError } from '@/lib/ai/groq';
import { saveGeneratedChallenge } from '@/lib/db/challenges';

export const runtime = 'nodejs';
// NOTE: on Vercel Hobby this is capped at 10s regardless of this value —
// only takes effect on Pro/Enterprise. Generation is scoped to fit under
// that 10s ceiling (see durationDays cap in lib/ai/schemas.ts); if you
// upgrade to Pro, this 60s ceiling becomes real headroom.
export const maxDuration = 60;

export async function POST(request: Request) {
  // 1. Verify the authenticated Supabase user.
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // 2. Validate the request.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsedRequest = generatePlanRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsedRequest.error.flatten() },
      { status: 400 }
    );
  }
  const input = parsedRequest.data;

  // 3 & 4. Build the prompt and call Groq.
  let rawContent: string;
  try {
    rawContent = await generateChallengeJson(input);
  } catch (err) {
    if (err instanceof GroqError) {
      const status = err.status === 429 ? 429 : 502;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error('Unexpected Groq error', err);
    return NextResponse.json({ error: 'Failed to generate plan' }, { status: 502 });
  }

  // 6. Parse the response.
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch {
    console.error('Groq returned non-JSON content:', rawContent.slice(0, 1000));
    return NextResponse.json(
      { error: 'The AI returned a malformed response. Please try again.' },
      { status: 502 }
    );
  }

  // 7. Validate the response against a strict schema.
  const parsedPlan = generatedChallengeSchema.safeParse(parsedJson);
  if (!parsedPlan.success) {
    console.error('Groq output failed schema validation:', parsedPlan.error.flatten());
    return NextResponse.json(
      { error: 'The AI returned an invalid plan. Please try again.' },
      { status: 502 }
    );
  }

  // 8. Reject invalid AI output (structural checks beyond what zod alone can express).
  try {
    validateGeneratedChallengeStructure(parsedPlan.data, input.durationDays);
  } catch (err) {
    console.error('Groq output failed structural validation:', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `The AI returned an invalid plan: ${err.message}`
            : 'The AI returned an invalid plan. Please try again.',
      },
      { status: 502 }
    );
  }

  // 9. Save the generated challenge to Supabase.
  try {
    const saved = await saveGeneratedChallenge(supabase, user.id, parsedPlan.data, {
      intensity: input.intensity,
      minutesPerDay: input.minutesPerDay,
    });
    // 10. Return the saved challenge to the frontend.
    return NextResponse.json({ challenge: saved }, { status: 201 });
  } catch (err) {
    console.error('Failed to save generated challenge:', err);
    return NextResponse.json(
      { error: 'Failed to save the generated challenge. Please try again.' },
      { status: 500 }
    );
  }
}
