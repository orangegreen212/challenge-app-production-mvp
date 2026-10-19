import 'server-only';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts';
import type { GeneratePlanRequest } from './schemas';

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
// Configurable via the OPENROUTER_MODEL env var so the model can be swapped
// without a code change. See https://openrouter.ai/models for valid IDs — a
// model ID with no live endpoint makes OpenRouter answer 404.
export const DEFAULT_OPENROUTER_MODEL = 'nvidia/nemotron-3.5-super-vl:free';

function getModel(): string {
  return process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL;
}

// Total wall-clock budget for everything we do against OpenRouter (all
// attempts, headers AND body). The route's maxDuration is 60s, and auth plus
// the database save need a few seconds on top, so the default leaves ~15s of
// headroom. Override with OPENROUTER_TIMEOUT_MS (clamped to a safe range).
const DEFAULT_TIMEOUT_MS = 45_000;
const MIN_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 50_000;
// At most one retry, and only for transient failures.
const MAX_TRANSIENT_RETRIES = 1;
const DEFAULT_RETRY_DELAY_MS = 1_000;
// Upstream statuses worth one retry. 400/401/402/403/404/429 are NOT here:
// repeating the same request cannot fix them.
const TRANSIENT_STATUSES = new Set([408, 500, 502, 503, 504]);

function resolveTimeoutMs(): number {
  const raw = Number(process.env.OPENROUTER_TIMEOUT_MS);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, raw));
}

export type OpenRouterErrorCode = 'timeout' | 'network' | 'upstream' | 'config' | 'empty';

export class OpenRouterError extends Error {
  constructor(
    /** Safe to show to the end user. */
    message: string,
    public status?: number,
    public code?: OpenRouterErrorCode,
    /** Server-side diagnostics only — never send to the client. */
    public detail?: string
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
    model: getModel(),
    temperature: 0.6,
    max_tokens: 8000,
    ...(useStructuredOutput ? { response_format: { type: 'json_object' } } : {}),
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(input) },
    ],
  });
}

interface AttemptResult {
  ok: boolean;
  status: number;
  text: string;
}

/**
 * One HTTP attempt, aborted when `deadline` (epoch ms) passes. The timer stays
 * armed until the response BODY has been read, so a provider that sends
 * headers and then stalls is bounded too.
 */
async function attemptOpenRouter(
  apiKey: string,
  input: GeneratePlanRequest,
  useStructuredOutput: boolean,
  deadline: number
): Promise<AttemptResult> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) {
    throw new OpenRouterError(TIMEOUT_MESSAGE, 504, 'timeout');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), remaining);
  try {
    const res = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        // OpenRouter uses these for its public rankings; optional but recommended.
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000',
        'X-Title': 'Challenge App',
      },
      body: buildBody(input, useStructuredOutput),
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch (err) {
    if (controller.signal.aborted) {
      throw new OpenRouterError(TIMEOUT_MESSAGE, 504, 'timeout');
    }
    throw new OpenRouterError(
      'Could not reach the AI service. Please try again.',
      undefined,
      'network',
      err instanceof Error ? err.message : 'network error'
    );
  } finally {
    clearTimeout(timer);
  }
}

const TIMEOUT_MESSAGE =
  'The AI took too long to generate your plan. Please try again, or choose a shorter duration.';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Pulls `error.message` out of an OpenRouter error body (never the prompt). */
function upstreamErrorMessage(bodyText: string): string {
  try {
    const msg = JSON.parse(bodyText)?.error?.message;
    if (typeof msg === 'string') return msg.slice(0, 300);
  } catch {
    // not JSON — fall through
  }
  return '';
}

function userMessageForStatus(status: number): string {
  if (status === 401 || status === 402 || status === 403 || status === 404) {
    return 'The AI service is not available right now (configuration issue). Please try again later.';
  }
  if (status === 400) {
    return 'The AI service rejected the request. Please try again.';
  }
  return 'The AI service is temporarily unavailable. Please try again.';
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

export interface GenerateOptions {
  /** Total time budget in ms for all attempts. Defaults to OPENROUTER_TIMEOUT_MS / 45s. */
  timeoutMs?: number;
  /** Pause before the single transient retry. */
  retryDelayMs?: number;
}

export async function generateChallengeJson(
  input: GeneratePlanRequest,
  options: GenerateOptions = {}
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError(
      'The AI service is not configured on the server.',
      undefined,
      'config',
      'OPENROUTER_API_KEY is not set'
    );
  }

  const totalMs = options.timeoutMs ?? resolveTimeoutMs();
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const deadline = Date.now() + totalMs;
  // Only retry if a meaningful part of the budget is still left.
  const canRetry = (retries: number) =>
    retries < MAX_TRANSIENT_RETRIES && deadline - Date.now() > totalMs * 0.25;

  let useStructuredOutput = true;
  let retries = 0;
  let result: AttemptResult;

  for (;;) {
    try {
      result = await attemptOpenRouter(apiKey, input, useStructuredOutput, deadline);
    } catch (err) {
      if (err instanceof OpenRouterError && err.code === 'network' && canRetry(retries)) {
        retries++;
        await sleep(retryDelayMs);
        continue;
      }
      throw err;
    }

    if (result.ok) break;

    // Some free models reject response_format with a 400. Fall back to a
    // plain request once (the flag flips, so this cannot loop).
    if (
      result.status === 400 &&
      useStructuredOutput &&
      isUnsupportedStructuredOutputError(400, result.text)
    ) {
      useStructuredOutput = false;
      continue;
    }

    if (result.status === 429) {
      throw new OpenRouterError(
        'The AI service is busy (rate limit). Please try again shortly.',
        429,
        'upstream',
        upstreamErrorMessage(result.text)
      );
    }

    if (TRANSIENT_STATUSES.has(result.status) && canRetry(retries)) {
      retries++;
      await sleep(retryDelayMs);
      continue;
    }

    // Permanent (400/401/402/403/404/...) or retries exhausted: fail now.
    throw new OpenRouterError(
      userMessageForStatus(result.status),
      result.status,
      'upstream',
      upstreamErrorMessage(result.text)
    );
  }

  let data: { choices?: { message?: { content?: string }; finish_reason?: string }[] };
  try {
    data = JSON.parse(result.text);
  } catch {
    throw new OpenRouterError(
      'The AI returned an unreadable response. Please try again.',
      502,
      'upstream',
      'OpenRouter 2xx body was not JSON'
    );
  }
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new OpenRouterError(
      'The AI returned an empty response. Please try again.',
      502,
      'empty',
      `finish_reason=${data?.choices?.[0]?.finish_reason ?? 'unknown'}`
    );
  }

  return extractJson(content);
}
