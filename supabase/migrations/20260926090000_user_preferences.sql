/*
# User preferences (challenge settings, notifications, reminder time)

## Overview
Moves Settings-page state out of localStorage and into the database, so
that:
1. It survives across devices, like any other account setting.
2. The Telegram reminder cron job (which has no browser/localStorage) can
   read each user's reminder time and timezone.
3. The Google Calendar sync can read/write the id of the recurring
   reminder event it created, to update or remove it later.

## Table
`user_preferences` — one row per user (1:1, like `profiles`).

## Security
RLS scoped to `auth.uid() = user_id`, exactly like `profiles`. The
Telegram reminder cron reads this table with the service-role key (no
user session exists in a cron job), which intentionally bypasses RLS.
*/

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  default_duration integer NOT NULL DEFAULT 30,
  default_intensity text NOT NULL DEFAULT 'Balanced',
  daily_time_goal integer NOT NULL DEFAULT 60,

  daily_reminders boolean NOT NULL DEFAULT true,
  achievement_alerts boolean NOT NULL DEFAULT true,
  streak_warnings boolean NOT NULL DEFAULT false,

  -- "HH:MM" 24-hour, interpreted in `timezone` below.
  reminder_time text NOT NULL DEFAULT '09:00',
  -- IANA timezone name (e.g. "Europe/Kyiv"), captured from the browser
  -- when the user sets a reminder time.
  timezone text NOT NULL DEFAULT 'UTC',

  -- Bookkeeping for the two reminder channels.
  google_reminder_event_id text,
  last_telegram_reminder_date date,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_preferences" ON user_preferences;
CREATE POLICY "select_own_preferences" ON user_preferences FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_preferences" ON user_preferences;
CREATE POLICY "insert_own_preferences" ON user_preferences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_preferences" ON user_preferences;
CREATE POLICY "update_own_preferences" ON user_preferences FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER set_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
