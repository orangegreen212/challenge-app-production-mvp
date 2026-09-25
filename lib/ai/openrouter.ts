import 'server-only';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts';
import type { GeneratePlanRequest } from './schemas';

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
// Configurable via env so the model can be swapped without a code change.
// See https://openrouter.ai/models for available models.
// NOTE: on Vercel Hobby, this whole request must finish inside ~10s
// (see maxDuration note in app/api/generate-plan/route.ts), so pick a
// small/fast free model here — large ones (e.g. 70B+) routinely time out.
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

/**
 * Calls OpenRouter's chat completions endpoint (OpenAI-compatible) and
 * returns the raw text content of the model's reply. Never call this from
 * a client component — it reads a server-only environment variable.
 */
function buildBody(input: GeneratePlanRequest, useStructuredOutput: boolean) {
  return JSON.stringify({
    model: OPENROUTER_MODEL,
    temperature: 0.6,
    max_tokens: 8000,
    ...(useStructuredOutput ? { response_format: { type: 'json_object' } } : {}),
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(input) },
    ],
  });
}

async function callOpenRouter(
  apiKey: string,
  input: GeneratePlanRequest,
  useStructuredOutput: boolean
): Promise<Response> {
  try {
    return await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        // OpenRouter uses these for its public rankings; optional but recommended.
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000',
        'X-Title': 'Challenge App',
      },
      body: buildBody(input, useStructuredOutput),
    });
  } catch (err) {
    throw new OpenRouterError(
      `Could not reach OpenRouter: ${err instanceof Error ? err.message : 'network error'}`
    );
  }
}

/**
 * Some free/community models on OpenRouter don't support the
 * `response_format: json_object` structured-output feature and return a
 * 400 for it. Detect that specific case so we can retry once without it,
 * instead of failing the whole request.
 */
function isUnsupportedStructuredOutputError(status: number, bodyText: string): boolean {
  if (status !== 400) return false;
  const lower = bodyText.toLowerCase();
  return (
    lower.includes('structured-outputs') ||
    lower.includes('structured outputs') ||
    lower.includes('response_format')
  );
}

/**
 * Extracts a JSON object from a model's raw text reply. Models without
 * structured-output support sometimes wrap the JSON in a ```json fence or
 * add a sentence before/after it — this pulls out just the object.
 */
function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

export async function generateChallengeJson(
  input: GeneratePlanRequest
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError('OPENROUTER_API_KEY is not configured on the server');
  }

  let response = await callOpenRouter(apiKey, input, true);

  if (!response.ok && response.status === 400) {
    const bodyText = await response.text().catch(() => '');
    if (isUnsupportedStructuredOutputError(400, bodyText)) {
      // Retry once without response_format for models that don't support it.
      response = await callOpenRouter(apiKey, input, false);
    } else {
      throw new OpenRouterError(`OpenRouter API error (400): ${bodyText.slice(0, 500)}`, 400);
    }
  }

  if (response.status === 429) {
    throw new OpenRouterError('OpenRouter rate limit exceeded. Please try again shortly.', 429);
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new OpenRouterError(
      `OpenRouter API error (${response.status}): ${bodyText.slice(0, 500)}`,
      response.status
    );
  }

  const data = await response.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new OpenRouterError('OpenRouter returned an empty response');
  }

  return extractJson(content);
}
