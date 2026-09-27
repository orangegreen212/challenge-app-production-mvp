import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreatePreferences, updatePreferences } from '@/lib/db/preferences';
import { getIntegration } from '@/lib/db/integrations';
import { applyReminderPreferences } from '@/lib/integrations/reminders';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const prefs = await getOrCreatePreferences(supabase, user.id);
  return NextResponse.json({ preferences: prefs });
}

const ALLOWED_FIELDS = [
  'default_duration',
  'default_intensity',
  'daily_time_goal',
  'daily_reminders',
  'achievement_alerts',
  'streak_warnings',
  'reminder_time',
  'timezone',
] as const;

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const patch: Record<string, unknown> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) patch[field] = body[field];
  }

  const updated = await updatePreferences(supabase, user.id, patch);

  // If the reminder toggle or time/timezone changed, keep the Google
  // Calendar event in sync. Harmless no-op if Google isn't connected.
  let calendarWarning: string | null = null;
  const touchesReminder =
    'daily_reminders' in patch || 'reminder_time' in patch || 'timezone' in patch;

  if (touchesReminder) {
    const googleIntegration = await getIntegration(supabase, user.id, 'google_calendar');
    if (googleIntegration) {
      const result = await applyReminderPreferences(supabase, user.id, {
        daily_reminders: updated.daily_reminders,
        reminder_time: updated.reminder_time,
        timezone: updated.timezone,
        google_reminder_event_id: updated.google_reminder_event_id,
      });
      if (!result.ok) calendarWarning = result.error;
    }
  }

  return NextResponse.json({ preferences: updated, calendarWarning });
}
