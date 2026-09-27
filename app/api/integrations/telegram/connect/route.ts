import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildTelegramDeepLink } from '@/lib/integrations/telegram';

function generateCode(): string {
  // Short, URL-safe, and distinct from a UUID so it's easy to eyeball in logs.
  return Array.from({ length: 8 }, () =>
    '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 32)]
  ).join('');
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let deepLinkBase: string;
  try {
    // Validated up front so a misconfigured bot fails fast with a clear error
    // instead of generating a code that can never be redeemed.
    deepLinkBase = buildTelegramDeepLink('placeholder');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Telegram is not configured';
    return NextResponse.json({ error: message }, { status: 503 });
  }
  void deepLinkBase;

  // Clear out this user's old codes so only one is ever valid at a time.
  await supabase.from('telegram_link_codes').delete().eq('user_id', user.id);

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('telegram_link_codes')
    .insert({ code, user_id: user.id, expires_at: expiresAt });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    code,
    deepLink: buildTelegramDeepLink(code),
    expiresAt,
  });
}
