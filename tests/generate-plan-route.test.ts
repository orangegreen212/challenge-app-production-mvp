import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { getUser, save, generate } = vi.hoisted(() => ({
  getUser: vi.fn(),
  save: vi.fn(),
  generate: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser } }),
}));

vi.mock('@/lib/db/challenges', () => ({ saveGeneratedChallenge: save }));

vi.mock('@/lib/ai/openrouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/openrouter')>();
  return { ...actual, generateChallengeJson: generate };
});

import { POST } from '@/app/api/generate-plan/route';
import { OpenRouterError } from '@/lib/ai/openrouter';

const req = (body: unknown) =>
  new Request('http://localhost/api/generate-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const valid = { goal: 'Learn SQL', durationDays: 7, intensity: 'balanced', minutesPerDay: 30 };

const plan = {
  title: 'T',
  description: '',
  goal: '',
  durationDays: 7,
  days: Array.from({ length: 7 }, (_, i) => ({
    dayNumber: i + 1,
    title: `Day ${i + 1}`,
    description: '',
    tasks: [
      { taskNumber: 1, title: 'x', description: '', estimatedMinutes: 30, taskType: 'learning' },
    ],
  })),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
});

describe('POST /api/generate-plan', () => {
  it('returns 401 when unauthenticated, before any AI call', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(req(valid));
    expect(res.status).toBe(401);
    expect(generate).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid body, before any AI call', async () => {
    const res = await POST(req({ goal: '' }));
    expect(res.status).toBe(400);
    expect(generate).not.toHaveBeenCalled();
  });

  it('returns a clear JSON 504 (not a Vercel timeout) when the AI call times out', async () => {
    generate.mockRejectedValue(new OpenRouterError('The AI took too long.', 504, 'timeout'));
    const res = await POST(req(valid));
    expect(res.status).toBe(504);
    expect(await res.json()).toEqual({ error: 'The AI took too long.' });
    expect(save).not.toHaveBeenCalled();
  });

  it('returns 502 with a safe message for a 404 model error, and logs detail server-side only', async () => {
    generate.mockRejectedValue(
      new OpenRouterError('The AI service is not available right now.', 404, 'upstream', 'No endpoints found for x')
    );
    const res = await POST(req(valid));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain('No endpoints found');
    expect(console.error).toHaveBeenCalledWith(
      'OpenRouter request failed',
      expect.objectContaining({ status: 404, detail: 'No endpoints found for x' })
    );
  });

  it('keeps 429 as 429', async () => {
    generate.mockRejectedValue(new OpenRouterError('busy', 429, 'upstream'));
    expect((await POST(req(valid))).status).toBe(429);
  });

  it('still saves and returns 201 on the happy path', async () => {
    generate.mockResolvedValue(JSON.stringify(plan));
    save.mockResolvedValue({ id: 'c1' });
    const res = await POST(req(valid));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ challenge: { id: 'c1' } });
    expect(save).toHaveBeenCalledOnce();
  });
});
