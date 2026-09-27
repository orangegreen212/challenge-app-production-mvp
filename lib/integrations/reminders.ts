import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getIntegration, upsertIntegration } from '@/lib/db/integrations';
import {
  refreshGoogleToken,
  createReminderEvent,
  updateReminderEvent,
  deleteReminderEvent,
} from '@/lib/integrations/google';
import { updatePreferences } from '@/lib/db/preferences';

/**
 * Returns a valid (non-expired) Google access token for this user,
 * refreshing and persisting it first if it has expired. Returns null if
 * the user has no Google Calendar connection.
 */
export async function getValidGoogleAccessToken(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const integration = await getIntegration(supabase, userId, 'google_calendar');
  if (!integration?.access_token) return null;

  const expiresAt = integration.expires_at ? new Date(integration.expires_at).getTime() : 0;
  const isExpired = expiresAt < Date.now() + 60_000; // refresh a minute early

  if (!isExpired) return integration.access_token;
  if (!integration.refresh_token) return integration.access_token; // best effort

  const refreshed = await refreshGoogleToken(integration.refresh_token);
  await upsertIntegration(supabase, {
    user_id: userId,
    provider: 'google_calendar',
    access_token: refreshed.access_token,
    refresh_token: integration.refresh_token, // Google only re-sends this sometimes
    expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    external_account: integration.external_account,
    metadata: integration.metadata,
  });
  return refreshed.access_token;
}

/**
 * Creates, moves, or removes the recurring "Challenge reminder" Google
 * Calendar event to match the user's current reminder settings. Safe to
 * call even when Google Calendar isn't connected (no-op).
 */
export async function syncGoogleReminder(
  supabase: SupabaseClient,
  userId: string,
  opts: { enabled: boolean; time: string; timeZone: string; existingEventId: string | null }
): Promise<{ eventId: string | null }> {
  const accessToken = await getValidGoogleAccessToken(supabase, userId);
  if (!accessToken) return { eventId: opts.existingEventId };

  if (!opts.enabled) {
    if (opts.existingEventId) {
      await deleteReminderEvent(accessToken, opts.existingEventId);
    }
    return { eventId: null };
  }

  if (opts.existingEventId) {
    try {
      await updateReminderEvent(accessToken, opts.existingEventId, opts.time, opts.timeZone);
      return { eventId: opts.existingEventId };
    } catch (err) {
      // Event was deleted on the Google side — fall through and recreate.
      if (!(err instanceof Error) || (err as { status?: number }).status !== 404) throw err;
    }
  }

  const newEventId = await createReminderEvent(accessToken, opts.time, opts.timeZone);
  return { eventId: newEventId };
}

/**
 * Convenience wrapper: syncs the calendar event and persists the
 * resulting event id back onto the preferences row in one call.
 */
export async function applyReminderPreferences(
  supabase: SupabaseClient,
  userId: string,
  prefs: { daily_reminders: boolean; reminder_time: string; timezone: string; google_reminder_event_id: string | null }
) {
  try {
    const { eventId } = await syncGoogleReminder(supabase, userId, {
      enabled: prefs.daily_reminders,
      time: prefs.reminder_time,
      timeZone: prefs.timezone,
      existingEventId: prefs.google_reminder_event_id,
    });
    if (eventId !== prefs.google_reminder_event_id) {
      await updatePreferences(supabase, userId, { google_reminder_event_id: eventId });
    }
    return { ok: true as const };
  } catch (err) {
    // Don't fail the whole preferences save just because the calendar
    // sync failed (e.g. token revoked outside the app) — surface it to
    // the caller so it can be shown as a non-blocking warning instead.
    return { ok: false as const, error: err instanceof Error ? err.message : 'Calendar sync failed' };
  }
}
