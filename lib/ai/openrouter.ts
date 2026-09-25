import 'server-only';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts';
import type { GeneratePlanRequest } from './schemas';

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
// Configurable via env so the model can be swapped without a code change.
// See https://openrouter.ai/models for available models.
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
export async function generateChallengeJson(
  input: GeneratePlanRequest
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError('OPENROUTER_API_KEY is not configured on the server');
  }

  let response: Response;
  try {
    response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        // OpenRouter uses these for its public rankings; optional but recommended.
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000',
        'X-Title': 'Challenge App',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        temperature: 0.6,
        max_tokens: 8000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(input) },
        ],
      }),
    });
  } catch (err) {
    throw new OpenRouterError(
      `Could not reach OpenRouter: ${err instanceof Error ? err.message : 'network error'}`
    );
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

  return content;
}
