import 'server-only';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

// Scoped to calendar events only (not full calendar management) — the
// minimum needed to create/read events for challenge scheduling.
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. See INTEGRATIONS.md for setup steps.`);
  }
  return value;
}

export function getGoogleRedirectUri(origin: string): string {
  return `${origin}/api/integrations/google/callback`;
}

export function buildGoogleAuthUrl(origin: string, state: string): string {
  const clientId = requireEnv('GOOGLE_CALENDAR_CLIENT_ID');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleRedirectUri(origin),
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export async function exchangeGoogleCode(
  code: string,
  origin: string
): Promise<GoogleTokenResponse> {
  const clientId = requireEnv('GOOGLE_CALENDAR_CLIENT_ID');
  const clientSecret = requireEnv('GOOGLE_CALENDAR_CLIENT_SECRET');

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getGoogleRedirectUri(origin),
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function refreshGoogleToken(
  refreshToken: string
): Promise<GoogleTokenResponse> {
  const clientId = requireEnv('GOOGLE_CALENDAR_CLIENT_ID');
  const clientSecret = requireEnv('GOOGLE_CALENDAR_CLIENT_SECRET');

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token refresh failed: ${res.status} ${text}`);
  }

  return res.json();
}

export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.email ?? null;
}

export async function revokeGoogleToken(token: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
    method: 'POST',
  }).catch(() => {
    // Best-effort — the row is deleted locally regardless.
  });
}

// ---------------------------------------------------------------------
// Calendar events — the daily reminder is a single recurring event
// (RRULE:FREQ=DAILY), created once and patched in place when the time
// changes, rather than one event per day.
// ---------------------------------------------------------------------

const CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

function reminderEventBody(time: string, timeZone: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const start = new Date();
  start.setHours(hours, minutes, 0, 0);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  const toLocalIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes()
    ).padStart(2, '0')}:00`;

  return {
    summary: 'Challenge reminder',
    description: 'Time to work on your challenge for today.',
    start: { dateTime: toLocalIso(start), timeZone },
    end: { dateTime: toLocalIso(end), timeZone },
    recurrence: ['RRULE:FREQ=DAILY'],
    reminders: { useDefault: true },
  };
}

export async function createReminderEvent(
  accessToken: string,
  time: string,
  timeZone: string
): Promise<string> {
  const res = await fetch(CALENDAR_EVENTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reminderEventBody(time, timeZone)),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create calendar reminder: ${res.status} ${text}`);
  }
  const event = await res.json();
  return event.id as string;
}

export async function updateReminderEvent(
  accessToken: string,
  eventId: string,
  time: string,
  timeZone: string
): Promise<void> {
  const res = await fetch(`${CALENDAR_EVENTS_URL}/${eventId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reminderEventBody(time, timeZone)),
  });
  // A 404 means the event was deleted on the Google side (e.g. by the
  // user) — the caller should fall back to creating a new one.
  if (res.status === 404) {
    const notFound = Object.assign(new Error('Reminder event not found'), { status: 404 });
    throw notFound;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update calendar reminder: ${res.status} ${text}`);
  }
}

export async function deleteReminderEvent(accessToken: string, eventId: string): Promise<void> {
  const res = await fetch(`${CALENDAR_EVENTS_URL}/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // 404/410 both mean it's already gone — fine either way.
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const text = await res.text();
    throw new Error(`Failed to delete calendar reminder: ${res.status} ${text}`);
  }
}
