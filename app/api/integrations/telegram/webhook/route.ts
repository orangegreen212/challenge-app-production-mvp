import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { parseStartCommand, sendTelegramMessage } from '@/lib/integrations/telegram';

// Telegram calls this URL directly (no user session), so it's authenticated
// with a shared secret instead: set the same value as TELEGRAM_WEBHOOK_SECRET
// and as the `secret_token` when registering the webhook with Telegram
// (see INTEGRATIONS.md). Telegram echoes it back in this header on every call.
function isAuthentic(request: NextRequest): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return false;
  const received = request.headers.get('x-telegram-bot-api-secret-token');
  return received === expected;
}

export async function POST(request: NextRequest) {
  if (!isAuthentic(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const update = await request.json();
  const start = parseStartCommand(update);

  // Always 200 back to Telegram (even on a no-op) — Telegram retries
  // aggressively on non-2xx responses.
  if (!start) return NextResponse.json({ ok: true });

  const supabase = createServiceClient();

  const { data: linkCode, error: lookupError } = await supabase
    .from('telegram_link_codes')
    .select('user_id, expires_at')
    .eq('code', start.code)
    .maybeSingle();

  if (lookupError || !linkCode) {
    await sendTelegramMessage(
      start.chatId,
      "That link code wasn't found — go back to Settings and tap Connect again to get a fresh one."
    );
    return NextResponse.json({ ok: true });
  }

  if (new Date(linkCode.expires_at) < new Date()) {
    await supabase.from('telegram_link_codes').delete().eq('code', start.code);
    await sendTelegramMessage(
      start.chatId,
      'That link code expired — go back to Settings and tap Connect again to get a fresh one.'
    );
    return NextResponse.json({ ok: true });
  }

  await supabase.from('user_integrations').upsert(
    {
      user_id: linkCode.user_id,
      provider: 'telegram',
      external_account: start.username ? `@${start.username}` : String(start.chatId),
      metadata: { chat_id: start.chatId, username: start.username ?? null },
    },
    { onConflict: 'user_id,provider' }
  );

  await supabase.from('telegram_link_codes').delete().eq('code', start.code);

  await sendTelegramMessage(
    start.chatId,
    "You're connected! Reminders and streak alerts will be sent here from now on."
  );

  return NextResponse.json({ ok: true });
}
