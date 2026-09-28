import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { fetchDayContext } from '@/lib/db/challenges';
import { askHelper } from '@/lib/ai/help';

export const runtime = 'nodejs';
export const maxDuration = 30;

const bodySchema = z.object({
  dayId: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(4000),
      })
    )
    .min(1)
    .max(20),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const ctx = await fetchDayContext(supabase, parsed.data.dayId);
  if (!ctx) {
    return NextResponse.json({ error: 'Day not found' }, { status: 404 });
  }

  const taskLines = ctx.tasks
    .map(
      (t: { title: string; description: string; estimated_minutes: number; completed: boolean }, i: number) =>
        `${i + 1}. [${t.completed ? 'done' : 'todo'}] ${t.title} (${t.estimated_minutes} min)${
          t.description ? ` — ${t.description}` : ''
        }`
    )
    .join('\n');

  const system = `You are a concise, practical coach inside a daily-challenge app. Help the user complete today's tasks: explain what to do, break tasks into small steps, give examples, unblock them.
Reply in the same language the user writes in. Keep answers short and concrete. Do not invent facts about the user.

Challenge: ${ctx.challenge?.title ?? ''}
Goal: ${ctx.challenge?.goal ?? ''}
Day ${ctx.day.day_number}: ${ctx.day.title}
Day goal: ${ctx.day.description}
Tasks:
${taskLines}`;

  try {
    const reply = await askHelper(system, parsed.data.messages);
    return NextResponse.json({ reply });
  } catch (err) {
    console.error('AI help failed:', err);
    return NextResponse.json(
      { error: 'The AI helper is unavailable right now. Please try again.' },
      { status: 502 }
    );
  }
}
