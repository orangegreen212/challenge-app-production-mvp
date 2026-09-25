/*
# Restructure schema to match requested design

## Overview
The previous schema used a `weeks` intermediate table between challenges and days.
The requested schema has days directly linked to challenges, plus a `source_documents` table.
All user tables currently have 0 rows, so we can safely drop and recreate.

## Changes
1. Drop existing tables: tasks, days, weeks, challenges, user_achievements, achievements
2. Recreate with the requested structure:
   - challenges: direct link to days (no weeks intermediate)
   - source_documents: new table for uploaded file metadata + extracted text
   - days: directly linked to challenges
   - tasks: linked to days
   - achievements + user_achievements: preserved with same structure

## Tables created (in order):

### challenges
- id, user_id, title, goal_description, total_days, daily_minutes, preferred_days, start_time, start_date, intensity, status, created_at
- user_id defaults to auth.uid() and references auth.users
- intensity: light/balanced/intensive
- status: draft/active/completed

### source_documents
- id, challenge_id, file_name, file_type, file_size, extracted_text, created_at
- challenge_id references challenges (1:0/1 relationship)

### days
- id, challenge_id, day_number, date, title, goal, total_minutes, status
- challenge_id references challenges
- status: pending/completed/skipped

### tasks
- id, day_id, title, duration_minutes, order, is_completed
- day_id references days

### achievements (shared definitions)
- id, title, description, icon, created_at

### user_achievements
- id, user_id, achievement_id, unlocked_at
- Unique on (user_id, achievement_id)

## Security
- RLS enabled on all tables
- challenges: owner-scoped via user_id = auth.uid()
- source_documents, days: scoped through parent challenge ownership
- tasks: scoped through parent day → challenge ownership chain
- achievements: readable by all authenticated users
- user_achievements: owner-scoped via user_id = auth.uid()
*/

-- Drop existing tables in dependency order
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS days CASCADE;
DROP TABLE IF EXISTS weeks CASCADE;
DROP TABLE IF EXISTS source_documents CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS challenges CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;

-- Challenges table
CREATE TABLE challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  goal_description text NOT NULL DEFAULT '',
  total_days int NOT NULL DEFAULT 30,
  daily_minutes int NOT NULL DEFAULT 60,
  preferred_days text[] NOT NULL DEFAULT '{}',
  start_time text NOT NULL DEFAULT '10:00',
  start_date timestamptz,
  intensity text NOT NULL DEFAULT 'balanced' CHECK (intensity IN ('light', 'balanced', 'intensive')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
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

-- Source documents table
CREATE TABLE source_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL DEFAULT '',
  file_size bigint NOT NULL DEFAULT 0,
  extracted_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE source_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_source_documents" ON source_documents;
CREATE POLICY "select_own_source_documents" ON source_documents FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM challenges WHERE challenges.id = source_documents.challenge_id AND challenges.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_source_documents" ON source_documents;
CREATE POLICY "insert_own_source_documents" ON source_documents FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM challenges WHERE challenges.id = source_documents.challenge_id AND challenges.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_source_documents" ON source_documents;
CREATE POLICY "update_own_source_documents" ON source_documents FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM challenges WHERE challenges.id = source_documents.challenge_id AND challenges.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM challenges WHERE challenges.id = source_documents.challenge_id AND challenges.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_source_documents" ON source_documents;
CREATE POLICY "delete_own_source_documents" ON source_documents FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM challenges WHERE challenges.id = source_documents.challenge_id AND challenges.user_id = auth.uid())
  );

-- Days table
CREATE TABLE days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  day_number int NOT NULL,
  date date,
  title text NOT NULL,
  goal text NOT NULL DEFAULT '',
  total_minutes int NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_days" ON days;
CREATE POLICY "select_own_days" ON days FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM challenges WHERE challenges.id = days.challenge_id AND challenges.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_days" ON days;
CREATE POLICY "insert_own_days" ON days FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM challenges WHERE challenges.id = days.challenge_id AND challenges.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_days" ON days;
CREATE POLICY "update_own_days" ON days FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM challenges WHERE challenges.id = days.challenge_id AND challenges.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM challenges WHERE challenges.id = days.challenge_id AND challenges.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_days" ON days;
CREATE POLICY "delete_own_days" ON days FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM challenges WHERE challenges.id = days.challenge_id AND challenges.user_id = auth.uid())
  );

-- Tasks table
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES days(id) ON DELETE CASCADE,
  title text NOT NULL,
  duration_minutes int NOT NULL DEFAULT 30,
  "order" int NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tasks" ON tasks;
CREATE POLICY "select_own_tasks" ON tasks FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM days
      JOIN challenges ON challenges.id = days.challenge_id
      WHERE days.id = tasks.day_id AND challenges.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_tasks" ON tasks;
CREATE POLICY "insert_own_tasks" ON tasks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM days
      JOIN challenges ON challenges.id = days.challenge_id
      WHERE days.id = tasks.day_id AND challenges.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_tasks" ON tasks;
CREATE POLICY "update_own_tasks" ON tasks FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM days
      JOIN challenges ON challenges.id = days.challenge_id
      WHERE days.id = tasks.day_id AND challenges.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM days
      JOIN challenges ON challenges.id = days.challenge_id
      WHERE days.id = tasks.day_id AND challenges.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_tasks" ON tasks;
CREATE POLICY "delete_own_tasks" ON tasks FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM days
      JOIN challenges ON challenges.id = days.challenge_id
      WHERE days.id = tasks.day_id AND challenges.user_id = auth.uid()
    )
  );

-- Achievements table (shared definitions)
CREATE TABLE achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'trophy',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_achievements" ON achievements;
CREATE POLICY "select_achievements" ON achievements FOR SELECT
  TO authenticated USING (true);

-- User achievements
CREATE TABLE user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_user_achievements" ON user_achievements;
CREATE POLICY "select_own_user_achievements" ON user_achievements FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_user_achievements" ON user_achievements;
CREATE POLICY "insert_own_user_achievements" ON user_achievements FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_user_achievements" ON user_achievements;
CREATE POLICY "delete_own_user_achievements" ON user_achievements FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_challenges_user_id ON challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_source_documents_challenge_id ON source_documents(challenge_id);
CREATE INDEX IF NOT EXISTS idx_days_challenge_id ON days(challenge_id);
CREATE INDEX IF NOT EXISTS idx_tasks_day_id ON tasks(day_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

-- Seed achievements
INSERT INTO achievements (title, description, icon) VALUES
  ('First Challenge', 'Completed your first challenge', 'trophy'),
  ('7-Day Streak', 'Maintained a 7-day streak', 'flame'),
  ('10 Tasks Completed', 'Completed 10 individual tasks', 'star'),
  ('25% Complete', 'Reached 25% completion on a challenge', 'target'),
  ('14-Day Streak', 'Maintained a 14-day streak', 'flame'),
  ('50% Complete', 'Reached 50% completion on a challenge', 'gem'),
  ('30 Tasks Completed', 'Completed 30 individual tasks', 'rocket'),
  ('Challenge Master', 'Completed 3 challenges', 'crown')
ON CONFLICT DO NOTHING;
