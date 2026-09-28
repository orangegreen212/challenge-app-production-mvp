import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendTelegramMessage } from '@/lib/integrations/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Reminder is sent if "now" is within this many minutes AFTER the user's
// reminder time and it hasn't been sent yet today. A window (instead of an
// exact-minute match) keeps reminders working even if the scheduler skips
// a minute or fires a little late.
const SEND_WINDOW_MINUTES = 10;

// Telegram rejects messages over 4096 characters — stay safely below.
const TELEGRAM_CHUNK = 3800;

type ServiceClient = ReturnType<typeof createServiceClient>;

function isAuthentic(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return request.headers.get('authorization') === `Bearer ${expected}`;
}

function localNow(timeZone: string): { minutes: number; time: string; date: string } {
  const format = (tz: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = format(timeZone);
  } catch {
    parts = format('UTC'); // invalid timezone name saved -> fall back
  }

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));
  return {
    minutes: hour * 60 + minute,
    time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    date: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

interface TaskRow {
  day_id: string;
  task_number: number;
  title: string;
  description: string | null;
  estimated_minutes: number;
  completed: boolean;
}

/**
 * Builds the reminder text: today's day of the user's latest active
 * challenge with the FULL list of tasks (title, description, minutes).
 * "Today's day" uses the same rule as the app: the first day that still
 * has unfinished tasks.
 */
async function buildReminderText(supabase: ServiceClient, userId: string): Promise<string> {
  const header = '\u23F0 Time for your daily challenge!';
  const fallback = `${header}\n\nOpen the app to see today\u2019s tasks.`;

  const { data: challenge } = await supabase
    .from('challenges')
    .select('id, title')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!challenge) return fallback;

  const { data: days } = await supabase
    .from('challenge_days')
    .select('id, day_number, title, description')
    .eq('challenge_id', challenge.id)
    .order('day_number', { ascending: true });
  if (!days || days.length === 0) return fallback;

  const { data: tasks } = await supabase
    .from('tasks')
    .select('day_id, task_number, title, description, estimated_minutes, completed')
    .in('day_id', days.map((d) => d.id))
    .order('task_number', { ascending: true });

  const tasksByDay = new Map<string, TaskRow[]>();
  for (const t of (tasks ?? []) as TaskRow[]) {
    const list = tasksByDay.get(t.day_id) ?? [];
    list.push(t);
    tasksByDay.set(t.day_id, list);
  }

  const isDone = (dayId: string) => {
    const list = tasksByDay.get(dayId) ?? [];
    return list.length > 0 && list.every((t) => t.completed);
  };

  const today = days.find((d) => !isDone(d.id));
  if (!today) {
    return `${header}\n\n\uD83C\uDF89 "${challenge.title}" \u2014 all days are completed. Great job!`;
  }

  const todayTasks = tasksByDay.get(today.id) ?? [];
  const lines: string[] = [header, '', `\uD83D\uDCD8 ${challenge.title}`, `Day ${today.day_number}: ${today.title}`];
  if (today.description) lines.push(`Goal: ${today.description}`);
  lines.push('');

  todayTasks.forEach((t, i) => {
    const mark = t.completed ? '\u2705' : `${i + 1}.`;
    lines.push(`${mark} ${t.title} (${t.estimated_minutes} min)`);
    if (t.description) lines.push(`   ${t.description}`);
    lines.push('');
  });

  const total = todayTasks.reduce((sum, t) => sum + t.estimated_minutes, 0);
  lines.push(`Total: ${total} min`);
  return lines.join('\n');
}

/** Sends a long text as several Telegram messages, splitting on line breaks. */
async function sendLongTelegramMessage(chatId: number, text: string) {
  if (text.length <= TELEGRAM_CHUNK) {
    await sendTelegramMessage(chatId, text);
    return;
  }
  let chunk = '';
  for (const line of text.split('\n')) {
    if (chunk.length + line.length + 1 > TELEGRAM_CHUNK && chunk) {
      await sendTelegramMessage(chatId, chunk);
      chunk = '';
    }
    // A single line longer than the limit: hard-split it.
    let rest = line;
    while (rest.length > TELEGRAM_CHUNK) {
      await sendTelegramMessage(chatId, rest.slice(0, TELEGRAM_CHUNK));
      rest = rest.slice(TELEGRAM_CHUNK);
    }
    chunk += (chunk ? '\n' : '') + rest;
  }
  if (chunk) await sendTelegramMessage(chatId, chunk);
}

/**
 * Hit this every minute from an external scheduler with header
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Optional query params (still require the Authorization header):
 *   ?debug=1  -> response includes a per-user breakdown of what happened
 *   ?force=1  -> ignore the time window / "already sent today" check and
 *                send right now (for testing). Implies debug.
 */
export async function GET(request: NextRequest) {
  if (!isAuthentic(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const force = request.nextUrl.searchParams.get('force') === '1';
  const debug = force || request.nextUrl.searchParams.get('debug') === '1';

  let supabase: ServiceClient;
  try {
    supabase = createServiceClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Service client failed' },
      { status: 500 }
    );
  }

  const { data: rows, error } = await supabase
    .from('user_preferences')
    .select('user_id, reminder_time, timezone, last_telegram_reminder_date')
    .eq('daily_reminders', true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  const errors: string[] = [];
  const details: Record<string, unknown>[] = [];

  for (const row of rows ?? []) {
    const now = localNow(row.timezone || 'UTC');
    const diff = (now.minutes - toMinutes(row.reminder_time) + 1440) % 1440;
    const inWindow = diff < SEND_WINDOW_MINUTES;
    const info: Record<string, unknown> = {
      user: String(row.user_id).slice(0, 8),
      reminder_time: row.reminder_time,
      timezone: row.timezone,
      local_now: now.time,
      in_window: inWindow,
      last_sent_date: row.last_telegram_reminder_date,
    };

    if (!force && !inWindow) {
      info.result = 'skipped: not reminder time yet';
      details.push(info);
      continue;
    }
    if (!force && row.last_telegram_reminder_date === now.date) {
      info.result = 'skipped: already sent today';
      details.push(info);
      continue;
    }

    const { data: telegram } = await supabase
      .from('user_integrations')
      .select('metadata')
      .eq('user_id', row.user_id)
      .eq('provider', 'telegram')
      .maybeSingle();

    const chatId = (telegram?.metadata as { chat_id?: number } | undefined)?.chat_id;
    if (!chatId) {
      info.result = 'skipped: Telegram not connected';
      details.push(info);
      continue;
    }

    try {
      const text = await buildReminderText(supabase, row.user_id);
      await sendLongTelegramMessage(chatId, text);
      if (!force) {
        await supabase
          .from('user_preferences')
          .update({ last_telegram_reminder_date: now.date })
          .eq('user_id', row.user_id);
      }
      sent += 1;
      info.result = 'sent';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push(message);
      info.result = `error: ${message}`;
    }
    details.push(info);
  }

  return NextResponse.json({
    checked: rows?.length ?? 0,
    sent,
    errors,
    ...(debug ? { details } : {}),
  });
}
