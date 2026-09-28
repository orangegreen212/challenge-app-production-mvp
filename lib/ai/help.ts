import 'server-only';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export interface HelpMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function callChat(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  extraHeaders: Record<string, string> = {}
): Promise<string> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({ model, temperature: 0.5, max_tokens: 1200, messages }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`AI provider error (${res.status}): ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI returned an empty response');
  return content.trim();
}

/** Chat reply for the "Need help? Ask AI" helper. Tries Groq first, then OpenRouter. */
export async function askHelper(
  system: string,
  messages: HelpMessage[]
): Promise<string> {
  const full = [{ role: 'system', content: system }, ...messages];
  const errors: string[] = [];

  if (process.env.GROQ_API_KEY) {
    try {
      return await callChat(
        GROQ_ENDPOINT,
        process.env.GROQ_API_KEY,
        process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        full
      );
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'Groq failed');
    }
  }

  if (process.env.OPENROUTER_API_KEY) {
    try {
      return await callChat(
        OPENROUTER_ENDPOINT,
        process.env.OPENROUTER_API_KEY,
        process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free',
        full,
        {
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000',
          'X-Title': 'Challenge App',
        }
      );
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'OpenRouter failed');
    }
  }

  if (errors.length === 0) {
    throw new Error('No AI provider configured (set GROQ_API_KEY or OPENROUTER_API_KEY)');
  }
  throw new Error(errors.join(' | '));
}
