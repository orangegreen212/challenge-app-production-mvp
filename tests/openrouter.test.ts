import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  DEFAULT_OPENROUTER_MODEL,
  OpenRouterError,
  generateChallengeJson,
} from '@/lib/ai/openrouter';

const input = {
  goal: 'secret-user-goal-text',
  background: '',
  preferences: '',
  durationDays: 7,
  intensity: 'balanced' as const,
  minutesPerDay: 30,
};

const okBody = (content: string) =>
  JSON.stringify({ choices: [{ message: { content }, finish_reason: 'stop' }] });

const res = (status: number, body: string) =>
  new Response(body, { status, headers: { 'Content-Type': 'application/json' } });

/** fetch that never resolves until its signal aborts, like a stalled provider. */
function hangingFetch(_url: unknown, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () =>
      reject(new DOMException('aborted', 'AbortError'))
    );
  });
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  process.env.OPENROUTER_API_KEY = 'sk-or-test-key';
  delete process.env.OPENROUTER_MODEL;
});
afterEach(() => vi.unstubAllGlobals());

const fast = { retryDelayMs: 0 };

describe('generateChallengeJson', () => {
  it('returns the model content on success and uses the default model', async () => {
    fetchMock.mockResolvedValueOnce(res(200, okBody('{"a":1}')));
    await expect(generateChallengeJson(input, fast)).resolves.toBe('{"a":1}');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe(DEFAULT_OPENROUTER_MODEL);
    expect(DEFAULT_OPENROUTER_MODEL).toBe('nvidia/nemotron-3.5-super-vl:free');
  });

  it('uses OPENROUTER_MODEL when set', async () => {
    process.env.OPENROUTER_MODEL = 'some/other-model:free';
    fetchMock.mockResolvedValueOnce(res(200, okBody('{}')));
    await generateChallengeJson(input, fast);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('some/other-model:free');
  });

  it('times out a request that never responds (regression: 60s FUNCTION_INVOCATION_TIMEOUT)', async () => {
    fetchMock.mockImplementation(hangingFetch);
    const started = Date.now();
    const err = await generateChallengeJson(input, { timeoutMs: 150, ...fast }).catch((e) => e);
    expect(err).toBeInstanceOf(OpenRouterError);
    expect(err.code).toBe('timeout');
    expect(err.status).toBe(504);
    expect(Date.now() - started).toBeLessThan(2000);
    // A timeout consumes the budget: it must not be retried.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('times out when headers arrive but the body stalls', async () => {
    fetchMock.mockImplementation((_u: unknown, init?: RequestInit) => {
      const stream = new ReadableStream({
        start(controller) {
          init?.signal?.addEventListener('abort', () =>
            controller.error(new DOMException('aborted', 'AbortError'))
          );
        },
      });
      return Promise.resolve(new Response(stream, { status: 200 }));
    });
    const err = await generateChallengeJson(input, { timeoutMs: 150, ...fast }).catch((e) => e);
    expect(err.code).toBe('timeout');
  });

  it.each([404, 401, 402, 403])('does not retry permanent error %i', async (status) => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        res(status, JSON.stringify({ error: { message: 'No endpoints found for x/y:free' } }))
      )
    );
    const err = await generateChallengeJson(input, fast).catch((e) => e);
    expect(err).toBeInstanceOf(OpenRouterError);
    expect(err.status).toBe(status);
    expect(err.detail).toContain('No endpoints found');
    expect(err.message).not.toContain('No endpoints found'); // upstream text stays server-side
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry a 400 that is not about structured output', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(res(400, JSON.stringify({ error: { message: 'bad thing' } }))));
    const err = await generateChallengeJson(input, fast).catch((e) => e);
    expect(err.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back once without response_format when the model rejects it', async () => {
    fetchMock
      .mockResolvedValueOnce(
        res(400, JSON.stringify({ error: { message: 'response_format not supported' } }))
      )
      .mockResolvedValueOnce(res(200, okBody('{"ok":true}')));
    await expect(generateChallengeJson(input, fast)).resolves.toBe('{"ok":true}');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).response_format).toBeDefined();
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).response_format).toBeUndefined();
  });

  it('does not loop if the fallback request also fails with a 400', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        res(400, JSON.stringify({ error: { message: 'response_format not supported' } }))
      )
    );
    const err = await generateChallengeJson(input, fast).catch((e) => e);
    expect(err.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries a transient 503 once and succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(res(503, '{}'))
      .mockResolvedValueOnce(res(200, okBody('{"ok":1}')));
    await expect(generateChallengeJson(input, fast)).resolves.toBe('{"ok":1}');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after a single retry on persistent 5xx', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(res(502, '{}')));
    const err = await generateChallengeJson(input, fast).catch((e) => e);
    expect(err.status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries one network error, then succeeds', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(res(200, okBody('{"ok":2}')));
    await expect(generateChallengeJson(input, fast)).resolves.toBe('{"ok":2}');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a 429', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(res(429, '{}')));
    const err = await generateChallengeJson(input, fast).catch((e) => e);
    expect(err.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports an empty completion with its finish_reason as server-side detail', async () => {
    fetchMock.mockResolvedValueOnce(
      res(200, JSON.stringify({ choices: [{ message: { content: null }, finish_reason: 'length' }] }))
    );
    const err = await generateChallengeJson(input, fast).catch((e) => e);
    expect(err.code).toBe('empty');
    expect(err.detail).toBe('finish_reason=length');
  });

  it('never puts the API key or the user prompt in error messages or details', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(res(404, JSON.stringify({ error: { message: 'No endpoints' } }))));
    const err = await generateChallengeJson(input, fast).catch((e) => e);
    const text = JSON.stringify([err.message, err.detail]);
    expect(text).not.toContain('sk-or-test-key');
    expect(text).not.toContain('secret-user-goal-text');
  });
});
