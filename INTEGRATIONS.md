# Connecting Google Calendar and Telegram

The Settings page now has real "Connect" flows for both. Each one needs
credentials you create yourself (Anthropic/Claude has no access to your
Google or Telegram accounts) and a few environment variables.

Run the new migration first, either way you deploy migrations normally:

```
supabase/migrations/20260925130000_user_integrations.sql
```

It adds `user_integrations` (stores tokens/links per user) and
`telegram_link_codes` (short-lived codes used to link a Telegram account).

## Environment variables

Add these to `.env.local` (and to your hosting provider's env settings for
production):

```
# Required for both integrations — a Supabase service-role key, used only
# server-side by the Telegram webhook (it has no user session to authenticate
# with, so it verifies Telegram's shared secret instead — see below).
# Project Settings → API → service_role key in the Supabase dashboard.
SUPABASE_SERVICE_ROLE_KEY=

# Google Calendar
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=

# Cron job that sends the Telegram daily reminder — see "Sending reminders
# at the scheduled time" below.
CRON_SECRET=
```

## Google Calendar setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) →
   create (or pick) a project.
2. **APIs & Services → Library** → enable the **Google Calendar API**.
3. **APIs & Services → OAuth consent screen** → configure it (External is
   fine for testing; add your own Google account as a test user while the
   app is unverified).
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**,
   type **Web application**.
5. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/api/integrations/google/callback` (local dev)
   - `https://YOUR-PRODUCTION-DOMAIN/api/integrations/google/callback`
6. Copy the **Client ID** and **Client secret** into
   `GOOGLE_CALENDAR_CLIENT_ID` / `GOOGLE_CALENDAR_CLIENT_SECRET`.

That's it — clicking **Connect** next to Google Calendar in Settings sends
the user through Google's consent screen and back; tokens are stored in
`user_integrations`.

## Telegram setup

1. In Telegram, message **[@BotFather](https://t.me/BotFather)** →
   `/newbot` → follow the prompts. You'll get a **bot token** and a
   **username** (ends in `bot`).
2. Put the token in `TELEGRAM_BOT_TOKEN` and the username (no `@`) in
   `TELEGRAM_BOT_USERNAME`.
3. Make up any random string for `TELEGRAM_WEBHOOK_SECRET` (this is a
   shared secret Telegram echoes back on every webhook call, so the app can
   tell a real Telegram request apart from anyone who guesses the URL).
4. Once the app is deployed somewhere with a public HTTPS URL, register the
   webhook (replace both placeholders):

   ```
   curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
     -d "url=https://YOUR-PRODUCTION-DOMAIN/api/integrations/telegram/webhook" \
     -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
   ```

   Telegram's webhook must be a public HTTPS URL — it can't reach
   `localhost`, so Telegram linking only works once deployed (or through a
   tunnel like ngrok pointed at your local dev server).

Clicking **Connect** next to Telegram in Settings generates a one-time code
and a `t.me/<bot>?start=<code>` link. Opening it and tapping **Start** sends
`/start <code>` to the webhook, which links that Telegram chat to the
signed-in user. The Settings page polls in the background and closes the
dialog automatically once it sees the link land.

## Sending reminders at the scheduled time

In Settings, when **Daily reminders** is on, the user sets a **reminder
time** (their local time — the browser's timezone is captured
automatically). What happens with that time depends on the channel:

### Google Calendar — a recurring event

The moment the reminder is turned on (or the time is changed, or Google
Calendar is connected while reminders are already on), the app creates a
**single recurring event** ("Challenge reminder", `RRULE:FREQ=DAILY`) at
that time on the user's primary calendar — no cron needed, since Google
Calendar itself repeats it every day. Turning reminders off, or
disconnecting Google Calendar, deletes that event. Changing the time
moves the existing event instead of creating a new one each time
(`lib/integrations/reminders.ts`).

### Telegram — a scheduled job

Telegram has no concept of a recurring reminder on its own — something
has to actually send the message at the right time. `app/api/cron/send-
reminders/route.ts` does this: called once a minute, it checks every user
with reminders on and Telegram connected, works out their current local
time from the timezone captured earlier, and sends the message the first
time it matches their reminder time (tracked via
`last_telegram_reminder_date` so it only fires once per day even if the
job overlaps itself).

**You need to actually schedule that route to run.** Two options:

**Option A — Vercel Cron** (if deployed on Vercel). `vercel.json` already
declares:

```json
{ "crons": [{ "path": "/api/cron/send-reminders", "schedule": "* * * * *" }] }
```

Set `CRON_SECRET` in your Vercel project's environment variables — Vercel
automatically sends it as `Authorization: Bearer <CRON_SECRET>` on every
cron invocation, which the route checks. Note: **minute-level schedules
need a Vercel Pro plan**; the Hobby plan only allows once-daily crons. If
you're on Hobby, change the schedule to something like `"0 * * * *"`
(hourly) or `"0 9 * * *"` (once daily) and reminders will only be as
precise as that interval.

**Option B — an external scheduler** (any plan/host). Use a free service
like [cron-job.org](https://cron-job.org) to hit
`https://YOUR-DOMAIN/api/cron/send-reminders` every minute with header
`Authorization: Bearer <CRON_SECRET>`.

Either way, nothing needs to change in the code — the route itself does
the same check regardless of what's calling it.

## What's already wired up

- `app/api/preferences` (GET/PUT) — challenge preferences, notification
  toggles, reminder time/timezone. Replaces the old localStorage-only
  Settings state, since the Telegram cron job needs to read this
  server-side.
- `app/api/cron/send-reminders` — the scheduled job described above.
- `app/api/integrations/status` — returns connection state for both
  providers for the signed-in user.
- `app/api/integrations/google/connect` / `.../callback` / `route.ts`
  (DELETE) — the OAuth flow and disconnect.
- `app/api/integrations/telegram/connect` / `.../webhook` / `route.ts`
  (DELETE) — code generation, the bot webhook, and disconnect.
- `lib/integrations/google.ts`, `lib/integrations/telegram.ts` — the API
  calls to Google/Telegram.
- `lib/integrations/reminders.ts` — keeps the Google Calendar recurring
  event in sync with the user's reminder settings.
- `lib/db/integrations.ts`, `lib/db/preferences.ts` — reads/writes to
  `user_integrations` and `user_preferences`.

## Not built yet

- **Achievement alerts** and **streak warnings** are still just stored
  toggles — nothing sends those yet (only the daily reminder is wired to
  Google Calendar / Telegram). Extending `send-reminders` (or a similar
  route) to check challenge progress and send those too is the natural
  next step.
- No UI to review/cancel a Google Calendar event manually from the app —
  the user can always delete or edit it directly in Google Calendar,
  though the next automatic sync (toggling reminders, or changing the
  time) will recreate it if it's missing.

