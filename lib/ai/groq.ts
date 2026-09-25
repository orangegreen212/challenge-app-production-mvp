import 'server-only';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts';
import type { GeneratePlanRequest } from './schemas';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
// A current Groq-hosted model with strong JSON-following behavior.
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export class GroqError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = 'GroqError';
  }
}

/**
 * Calls Groq's chat completions endpoint (OpenAI-compatible) and returns
 * the raw text content of the model's reply. Never call this from a
 * client component — it reads a server-only environment variable.
 */
export async function generateChallengeJson(
  input: GeneratePlanRequest
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new GroqError('GROQ_API_KEY is not configured on the server');
  }

  let response: Response;
  try {
    response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
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
    throw new GroqError(
      `Could not reach Groq: ${err instanceof Error ? err.message : 'network error'}`
    );
  }

  if (response.status === 429) {
    throw new GroqError('Groq rate limit exceeded. Please try again shortly.', 429);
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new GroqError(
      `Groq API error (${response.status}): ${bodyText.slice(0, 500)}`,
      response.status
    );
  }

  const data = await response.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new GroqError('Groq returned an empty response');
  }

  return content;
}
