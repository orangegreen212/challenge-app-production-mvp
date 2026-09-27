import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendTelegramMessage } from '@/lib/integrations/telegram';

export const runtime = 'nodejs';

function isAuthentic(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${expected}`;
}

// Returns "HH:MM" and the calendar date for `timeZone` right now, using
// only Intl (no extra timezone library needed).
function localTimeAndDate(timeZone: string): { time: string; date: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    time: `${get('hour')}:${get('minute')}`,
    date: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

/**
 * Meant to be hit once a minute by a scheduler (Vercel Cron, or any
 * external cron service) — see INTEGRATIONS.md. For every user with
 * Telegram connected and daily reminders on, checks whether it's
 * currently their configured reminder time in their own timezone, and
 * sends the reminder if so (once per calendar day, tracked via
 * `last_telegram_reminder_date`).
 */
export async function GET(request: NextRequest) {
  if (!isAuthentic(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: rows, error } = await supabase
    .from('user_preferences')
    .select('user_id, reminder_time, timezone, last_telegram_reminder_date')
    .eq('daily_reminders', true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const row of rows ?? []) {
    const { time, date } = localTimeAndDate(row.timezone || 'UTC');
    if (time !== row.reminder_time) continue;
    if (row.last_telegram_reminder_date === date) continue; // already sent today

    const { data: telegram } = await supabase
      .from('user_integrations')
      .select('metadata')
      .eq('user_id', row.user_id)
      .eq('provider', 'telegram')
      .maybeSingle();

    const chatId = (telegram?.metadata as { chat_id?: number } | undefined)?.chat_id;
    if (!chatId) continue;

    try {
      await sendTelegramMessage(chatId, '⏰ Time for your daily challenge! Open the app to see today\u2019s tasks.');
      await supabase
        .from('user_preferences')
        .update({ last_telegram_reminder_date: date })
        .eq('user_id', row.user_id);
      sent += 1;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  return NextResponse.json({ checked: rows?.length ?? 0, sent, errors });
}
