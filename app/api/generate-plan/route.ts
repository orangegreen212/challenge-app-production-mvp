import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePlanRequestSchema, generatedChallengeSchema, validateGeneratedChallengeStructure } from '@/lib/ai/schemas';
import { generateChallengeJson, OpenRouterError } from '@/lib/ai/openrouter';
import { saveGeneratedChallenge } from '@/lib/db/challenges';

export const runtime = 'nodejs';
// Vercel kills the function at this limit. Do not raise it to paper over a slow
// model: the OpenRouter call has its own 45s budget (see lib/ai/openrouter.ts)
// so that we return a clear JSON error before this ceiling is reached.
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

  // 3 & 4. Build the prompt and call OpenRouter (bounded by its own deadline).
  let rawContent: string;
  const startedAt = Date.now();
  try {
    rawContent = await generateChallengeJson(input);
  } catch (err) {
    if (err instanceof OpenRouterError) {
      // Diagnostics only: status/code/duration and the upstream error text.
      // Never the prompt, the API key or user data.
      console.error('OpenRouter request failed', {
        status: err.status,
        code: err.code,
        detail: err.detail,
        durationMs: Date.now() - startedAt,
        durationDays: input.durationDays,
      });
      const status = err.code === 'timeout' ? 504 : err.status === 429 ? 429 : 502;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error('Unexpected OpenRouter error', err);
    return NextResponse.json({ error: 'Failed to generate plan' }, { status: 502 });
  }

  // 6. Parse the response.
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch {
    // Log only the size: the content is derived from the user's prompt.
    console.error('OpenRouter returned non-JSON content, length:', rawContent.length);
    return NextResponse.json(
      { error: 'The AI returned a malformed response. Please try again.' },
      { status: 502 }
    );
  }

  // 7. Validate the response against a strict schema.
  const parsedPlan = generatedChallengeSchema.safeParse(parsedJson);
  if (!parsedPlan.success) {
    console.error('OpenRouter output failed schema validation:', parsedPlan.error.flatten());
    return NextResponse.json(
      { error: 'The AI returned an invalid plan. Please try again.' },
      { status: 502 }
    );
  }

  // 8. Reject invalid AI output (structural checks beyond what zod alone can express).
  try {
    validateGeneratedChallengeStructure(parsedPlan.data, input.durationDays);
  } catch (err) {
    console.error('OpenRouter output failed structural validation:', err);
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
