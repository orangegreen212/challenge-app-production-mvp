/*
# Production schema for AI-generated challenges

## Overview
Replaces the previous `days`/`weeks`/`tasks` structure with the production
schema needed to store real, Groq-generated challenges. `achievements` and
`user_achievements` are untouched (still used by the existing UI).

## Changes
1. Drop old `tasks`, `days`, `weeks`, `source_documents`, `challenges` tables
   (all previously empty / unused by the shipped UI — safe to drop and recreate).
2. Create `profiles` (1:1 with auth.users).
3. Create `challenges` (top-level challenge owned by a user).
4. Create `challenge_days` (a day within a challenge).
5. Create `tasks` (a task within a day).
6. Create `source_documents` (optional future personalization input).
7. Enable RLS everywhere, scoped to auth.uid() directly or via parent chain.
8. Add indexes on all foreign keys used for lookups.
9. Auto-create a `profiles` row on signup via trigger on auth.users.

## Security
- Every table has RLS enabled.
- `profiles`: a user can only read/update their own row.
- `challenges`: owner-scoped via user_id = auth.uid().
- `challenge_days`, `tasks`, `source_documents`: scoped through the parent
  challenge's user_id via EXISTS subqueries — a user can never read or
  write another user's challenge data.
*/

-- Drop old (unused/empty) tables in dependency order
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS days CASCADE;
DROP TABLE IF EXISTS weeks CASCADE;
DROP TABLE IF EXISTS source_documents CASCADE;
DROP TABLE IF EXISTS challenges CASCADE;

-- ============================================================
-- profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recreate the updated_at trigger helper (dropped by an earlier migration)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- challenges
-- ============================================================
CREATE TABLE challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  goal text NOT NULL DEFAULT '',
  duration_days integer NOT NULL,
  intensity text NOT NULL DEFAULT 'balanced' CHECK (intensity IN ('light', 'balanced', 'intensive')),
  preferred_minutes_per_day integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_challenges" ON challenges;
CREATE POLICY "select_own_challenges" ON challenges FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_challenges" ON challenges;
CREATE POLICY "insert_own_challenges" ON challenges FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_challenges" ON challenges;
CREATE POLICY "update_own_challenges" ON challenges FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_challenges" ON challenges;
CREATE POLICY "delete_own_challenges" ON challenges FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_challenges_user_id ON challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);

DROP TRIGGER IF EXISTS trigger_challenges_updated_at ON challenges;
CREATE TRIGGER trigger_challenges_updated_at
  BEFORE UPDATE ON challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- challenge_days
-- ============================================================
CREATE TABLE challenge_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, day_number)
);

ALTER TABLE challenge_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_challenge_days" ON challenge_days;
CREATE POLICY "select_own_challenge_days" ON challenge_days FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM challenges WHERE challenges.id = challenge_days.challenge_id AND challenges.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_challenge_days" ON challenge_days;
CREATE POLICY "insert_own_challenge_days" ON challenge_days FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM challenges WHERE challenges.id = challenge_days.challenge_id AND challenges.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_challenge_days" ON challenge_days;
CREATE POLICY "update_own_challenge_days" ON challenge_days FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM challenges WHERE challenges.id = challenge_days.challenge_id AND challenges.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM challenges WHERE challenges.id = challenge_days.challenge_id AND challenges.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_challenge_days" ON challenge_days;
CREATE POLICY "delete_own_challenge_days" ON challenge_days FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM challenges WHERE challenges.id = challenge_days.challenge_id AND challenges.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_challenge_days_challenge_id ON challenge_days(challenge_id);

-- ============================================================
-- tasks
-- ============================================================
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES challenge_days(id) ON DELETE CASCADE,
  task_number integer NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  estimated_minutes integer NOT NULL DEFAULT 15,
  task_type text NOT NULL DEFAULT 'action' CHECK (
    task_type IN ('reflection', 'learning', 'practice', 'research', 'project', 'action')
  ),
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tasks" ON tasks;
CREATE POLICY "select_own_tasks" ON tasks FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM challenge_days
      JOIN challenges ON challenges.id = challenge_days.challenge_id
      WHERE challenge_days.id = tasks.day_id AND challenges.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_tasks" ON tasks;
CREATE POLICY "insert_own_tasks" ON tasks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM challenge_days
      JOIN challenges ON challenges.id = challenge_days.challenge_id
      WHERE challenge_days.id = tasks.day_id AND challenges.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_tasks" ON tasks;
CREATE POLICY "update_own_tasks" ON tasks FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM challenge_days
      JOIN challenges ON challenges.id = challenge_days.challenge_id
      WHERE challenge_days.id = tasks.day_id AND challenges.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM challenge_days
      JOIN challenges ON challenges.id = challenge_days.challenge_id
      WHERE challenge_days.id = tasks.day_id AND challenges.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_tasks" ON tasks;
CREATE POLICY "delete_own_tasks" ON tasks FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM challenge_days
      JOIN challenges ON challenges.id = challenge_days.challenge_id
      WHERE challenge_days.id = tasks.day_id AND challenges.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_tasks_day_id ON tasks(day_id);

-- ============================================================
-- source_documents (kept for future personalization input)
-- ============================================================
CREATE TABLE source_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  source_type text NOT NULL DEFAULT 'text',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE source_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_source_documents" ON source_documents;
CREATE POLICY "select_own_source_documents" ON source_documents FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_source_documents" ON source_documents;
CREATE POLICY "insert_own_source_documents" ON source_documents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_source_documents" ON source_documents;
CREATE POLICY "delete_own_source_documents" ON source_documents FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_source_documents_challenge_id ON source_documents(challenge_id);
