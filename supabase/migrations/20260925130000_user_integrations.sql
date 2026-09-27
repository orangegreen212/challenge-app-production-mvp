/*
# Third-party integrations (Google Calendar, Telegram)

## Overview
Stores per-user connection state for the "Integrations" section of Settings.

## Tables
1. `user_integrations` — one row per (user, provider). Holds OAuth tokens for
   Google Calendar and the linked chat id for Telegram, plus a small
   `metadata` blob for display info (connected email / telegram username).
2. `telegram_link_codes` — short-lived one-time codes used to link a
   Telegram account. The authenticated app creates a code; the Telegram
   webhook (running with the service role, no user session) redeems it.

## Security
- `user_integrations`: RLS scoped to `auth.uid() = user_id`. The Telegram
  webhook writes to this table using the service-role key from a trusted
  server route, which bypasses RLS by design (service role is never
  exposed to the browser).
- `telegram_link_codes`: RLS lets a user create/delete their own codes.
  The webhook reads/deletes by code using the service role.
*/

CREATE TABLE IF NOT EXISTS user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google_calendar', 'telegram')),
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  external_account text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_integrations" ON user_integrations;
CREATE POLICY "select_own_integrations" ON user_integrations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_integrations" ON user_integrations;
CREATE POLICY "insert_own_integrations" ON user_integrations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_integrations" ON user_integrations;
CREATE POLICY "update_own_integrations" ON user_integrations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_integrations" ON user_integrations;
CREATE POLICY "delete_own_integrations" ON user_integrations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_user_integrations_updated_at ON user_integrations;
CREATE TRIGGER set_user_integrations_updated_at
  BEFORE UPDATE ON user_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);

-- ============================================================
-- telegram_link_codes
-- ============================================================
CREATE TABLE IF NOT EXISTS telegram_link_codes (
  code text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE telegram_link_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_link_codes" ON telegram_link_codes;
CREATE POLICY "select_own_link_codes" ON telegram_link_codes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_link_codes" ON telegram_link_codes;
CREATE POLICY "insert_own_link_codes" ON telegram_link_codes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_link_codes" ON telegram_link_codes;
CREATE POLICY "delete_own_link_codes" ON telegram_link_codes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_expires_at ON telegram_link_codes(expires_at);
