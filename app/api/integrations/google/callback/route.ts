import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { upsertIntegration } from '@/lib/db/integrations';
import { exchangeGoogleCode, fetchGoogleEmail } from '@/lib/integrations/google';
import { getOrCreatePreferences } from '@/lib/db/preferences';
import { applyReminderPreferences } from '@/lib/integrations/reminders';

const STATE_COOKIE = 'google_oauth_state';

export async function GET(request: NextRequest) {
  const settingsUrl = new URL('/settings', request.url);

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const errorParam = request.nextUrl.searchParams.get('error');
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  const fail = (message: string) => {
    settingsUrl.searchParams.set('integration_error', message);
    const res = NextResponse.redirect(settingsUrl);
    res.cookies.delete(STATE_COOKIE);
    return res;
  };

  if (errorParam) return fail(`Google declined: ${errorParam}`);
  if (!code || !state) return fail('Missing code from Google');
  if (!expectedState || state !== expectedState) return fail('Invalid OAuth state');

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return fail('Not signed in');

  try {
    const tokens = await exchangeGoogleCode(code, request.nextUrl.origin);
    const email = await fetchGoogleEmail(tokens.access_token);

    await upsertIntegration(supabase, {
      user_id: user.id,
      provider: 'google_calendar',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      external_account: email,
      metadata: { scope: tokens.scope },
    });

    // If daily reminders are already turned on, create the recurring
    // event right away instead of waiting for the user to touch the
    // reminder settings again.
    const prefs = await getOrCreatePreferences(supabase, user.id);
    if (prefs.daily_reminders) {
      await applyReminderPreferences(supabase, user.id, {
        daily_reminders: prefs.daily_reminders,
        reminder_time: prefs.reminder_time,
        timezone: prefs.timezone,
        google_reminder_event_id: prefs.google_reminder_event_id,
      });
    }
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to connect Google Calendar');
  }

  settingsUrl.searchParams.set('integration_success', 'google');
  const res = NextResponse.redirect(settingsUrl);
  res.cookies.delete(STATE_COOKIE);
  return res;
}
