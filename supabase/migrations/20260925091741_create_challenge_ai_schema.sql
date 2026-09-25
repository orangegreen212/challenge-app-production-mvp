/*
# Create Challenge AI Core Schema

## Overview
Sets up the complete database for Challenge AI — a multi-user app where each authenticated user owns their challenges, weekly plans, daily tasks, and achievements.

## New Tables

1. `challenges`
   - Stores a user's challenge (e.g. "30-Day Career Reset")
   - Columns: id, user_id (owner), title, description, goal, status (draft/active/completed), duration (days), time_per_day (minutes), intensity (light/balanced/intensive), preferred_days (text[] of weekday names), start_time (HH:MM), current_day, streak, time_invested_minutes, start_date, created_at, updated_at
   - Owned by the authenticated user via user_id

2. `weeks`
   - Groups days into weekly sections within a challenge
   - Columns: id, challenge_id (FK), week_number, title, created_at
   - Scoped through the parent challenge's user_id

3. `days`
   - Individual days within a week, each with a title, goal, and estimated time
   - Columns: id, week_id (FK), day_number, title, goal, estimated_time (minutes), completed, created_at
   - Scoped through the parent challenge's user_id

4. `tasks`
   - Individual tasks within a day, each with a title, description, duration, and completion state
   - Columns: id, day_id (FK), title, description, duration (minutes), completed, sort_order, created_at
   - Scoped through the parent challenge's user_id

5. `achievements`
   - Achievement definitions (shared across all users, seeded by the app)
   - Columns: id, title, description, icon, created_at

6. `user_achievements`
   - Tracks which achievements each user has unlocked and when
   - Columns: id, user_id (FK to auth.users), achievement_id (FK), unlocked_at
   - Unique constraint on (user_id, achievement_id)

## Security
- RLS enabled on ALL tables
- challenges: owner-scoped CRUD via user_id = auth.uid()
- weeks, days, tasks: scoped through parent challenge ownership (EXISTS subquery)
- achievements: readable by all authenticated users (shared definitions)
- user_achievements: owner-scoped CRUD via user_id = auth.uid()

## Important Notes
1. All owner columns default to auth.uid() so client inserts that omit user_id still succeed
2. Child table policies use EXISTS subqueries to verify ownership through the parent chain
3. preferred_days stored as text[] for flexibility
4. sort_order on tasks allows reordering
5. ON DELETE CASCADE on all foreign keys so deleting a challenge cleans up its weeks, days, and tasks
*/

-- Challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  goal text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  duration int NOT NULL DEFAULT 30,
  time_per_day int NOT NULL DEFAULT 60,
  intensity text NOT NULL DEFAULT 'balanced' CHECK (intensity IN ('light', 'balanced', 'intensive')),
  preferred_days text[] NOT NULL DEFAULT '{}',
  start_time text NOT NULL DEFAULT '10:00',
  current_day int NOT NULL DEFAULT 0,
  streak int NOT NULL DEFAULT 0,
  time_invested_minutes int NOT NULL DEFAULT 0,
  start_date timestamptz,
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

-- Weeks table
CREATE TABLE IF NOT EXISTS weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  week_number int NOT NULL,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_weeks" ON weeks;
CREATE POLICY "select_own_weeks" ON weeks FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM challenges WHERE challenges.id = weeks.challenge_id AND challenges.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_weeks" ON weeks;
CREATE POLICY "insert_own_weeks" ON weeks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM challenges WHERE challenges.id = weeks.challenge_id AND challenges.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_weeks" ON weeks;
CREATE POLICY "update_own_weeks" ON weeks FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM challenges WHERE challenges.id = weeks.challenge_id AND challenges.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM challenges WHERE challenges.id = weeks.challenge_id AND challenges.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_weeks" ON weeks;
CREATE POLICY "delete_own_weeks" ON weeks FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM challenges WHERE challenges.id = weeks.challenge_id AND challenges.user_id = auth.uid())
  );

-- Days table
CREATE TABLE IF NOT EXISTS days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id uuid NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  day_number int NOT NULL,
  title text NOT NULL,
  goal text NOT NULL DEFAULT '',
  estimated_time int NOT NULL DEFAULT 60,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_days" ON days;
CREATE POLICY "select_own_days" ON days FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM weeks
      JOIN challenges ON challenges.id = weeks.challenge_id
      WHERE weeks.id = days.week_id AND challenges.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_days" ON days;
CREATE POLICY "insert_own_days" ON days FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM weeks
      JOIN challenges ON challenges.id = weeks.challenge_id
      WHERE weeks.id = days.week_id AND challenges.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_days" ON days;
CREATE POLICY "update_own_days" ON days FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM weeks
      JOIN challenges ON challenges.id = weeks.challenge_id
      WHERE weeks.id = days.week_id AND challenges.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM weeks
      JOIN challenges ON challenges.id = weeks.challenge_id
      WHERE weeks.id = days.week_id AND challenges.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_days" ON days;
CREATE POLICY "delete_own_days" ON days FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM weeks
      JOIN challenges ON challenges.id = weeks.challenge_id
      WHERE weeks.id = days.week_id AND challenges.user_id = auth.uid()
    )
  );

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES days(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  duration int NOT NULL DEFAULT 30,
  completed boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tasks" ON tasks;
CREATE POLICY "select_own_tasks" ON tasks FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM days
      JOIN weeks ON weeks.id = days.week_id
      JOIN challenges ON challenges.id = weeks.challenge_id
      WHERE days.id = tasks.day_id AND challenges.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_tasks" ON tasks;
CREATE POLICY "insert_own_tasks" ON tasks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM days
      JOIN weeks ON weeks.id = days.week_id
      JOIN challenges ON challenges.id = weeks.challenge_id
      WHERE days.id = tasks.day_id AND challenges.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_tasks" ON tasks;
CREATE POLICY "update_own_tasks" ON tasks FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM days
      JOIN weeks ON weeks.id = days.week_id
      JOIN challenges ON challenges.id = weeks.challenge_id
      WHERE days.id = tasks.day_id AND challenges.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM days
      JOIN weeks ON weeks.id = days.week_id
      JOIN challenges ON challenges.id = weeks.challenge_id
      WHERE days.id = tasks.day_id AND challenges.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_tasks" ON tasks;
CREATE POLICY "delete_own_tasks" ON tasks FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM days
      JOIN weeks ON weeks.id = days.week_id
      JOIN challenges ON challenges.id = weeks.challenge_id
      WHERE days.id = tasks.day_id AND challenges.user_id = auth.uid()
    )
  );

-- Achievements table (shared definitions, readable by all authenticated users)
CREATE TABLE IF NOT EXISTS achievements (
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

-- User achievements (tracks which user unlocked which achievement)
CREATE TABLE IF NOT EXISTS user_achievements (
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_challenges_user_id ON challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_weeks_challenge_id ON weeks(challenge_id);
CREATE INDEX IF NOT EXISTS idx_days_week_id ON days(week_id);
CREATE INDEX IF NOT EXISTS idx_tasks_day_id ON tasks(day_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

-- updated_at trigger for challenges
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_challenges_updated_at ON challenges;
CREATE TRIGGER trigger_challenges_updated_at
  BEFORE UPDATE ON challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
