import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Challenge,
  DayPlan,
  Task,
  WeekSection,
  DbChallengeRow,
  DbChallengeDayRow,
  DbTaskRow,
} from '@/lib/types';
import type { GeneratedChallenge } from '@/lib/ai/schemas';

function dbTaskToUiTask(row: DbTaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    duration: row.estimated_minutes,
    completed: row.completed,
  };
}

function groupDaysIntoWeeks(
  days: DbChallengeDayRow[],
  tasksByDay: Map<string, DbTaskRow[]>
): WeekSection[] {
  const sorted = [...days].sort((a, b) => a.day_number - b.day_number);
  const weeks: WeekSection[] = [];
  let currentWeek: DayPlan[] = [];
  let weekNum = 1;

  for (const dbDay of sorted) {
    const dayTasks = (tasksByDay.get(dbDay.id) || []).sort(
      (a, b) => a.task_number - b.task_number
    );
    const estimatedTime = dayTasks.reduce((sum, t) => sum + t.estimated_minutes, 0);
    const completed = dayTasks.length > 0 && dayTasks.every((t) => t.completed);

    currentWeek.push({
      id: dbDay.id,
      dayNumber: dbDay.day_number,
      title: dbDay.title,
      goal: dbDay.description,
      estimatedTime,
      tasks: dayTasks.map(dbTaskToUiTask),
      completed,
    });

    if (currentWeek.length === 7) {
      weeks.push({
        id: `week-${weekNum}`,
        weekNumber: weekNum,
        title: `Week ${weekNum}`,
        days: currentWeek,
      });
      currentWeek = [];
      weekNum++;
    }
  }

  if (currentWeek.length > 0) {
    weeks.push({
      id: `week-${weekNum}`,
      weekNumber: weekNum,
      title: `Week ${weekNum}`,
      days: currentWeek,
    });
  }

  return weeks;
}

function dbChallengeToUiChallenge(
  db: DbChallengeRow,
  weeks: WeekSection[]
): Challenge {
  const allTasks = weeks.flatMap((w) => w.days.flatMap((d) => d.tasks));
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.completed).length;
  const currentDay =
    weeks
      .flatMap((w) => w.days)
      .find((d) => !d.completed)?.dayNumber ?? weeks.flatMap((w) => w.days).length;

  return {
    id: db.id,
    title: db.title,
    description: db.description,
    goal: db.goal,
    status: db.status,
    duration: db.duration_days,
    timePerDay: (db.preferred_minutes_per_day as Challenge['timePerDay']) ?? 30,
    intensity: db.intensity,
    preferredDays: [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ],
    startTime: '09:00',
    weeks,
    currentDay,
    createdAt: db.created_at,
    completedTasks,
    totalTasks,
    timeInvestedMinutes: 0,
    streak: 0,
  };
}

/** Fetch all challenges owned by the current (authenticated) user. */
export async function fetchUserChallengesFromDb(
  supabase: SupabaseClient
): Promise<Challenge[]> {
  const { data: challenges, error } = await supabase
    .from('challenges')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !challenges) return [];

  const result: Challenge[] = [];
  for (const db of challenges as DbChallengeRow[]) {
    result.push(await fetchOneChallengeFromDb(supabase, db));
  }
  return result;
}

/** Fetch a single challenge (with its days and tasks) by id. Returns null if not found or not owned by the user (RLS enforces this). */
export async function fetchChallengeByIdFromDb(
  supabase: SupabaseClient,
  challengeId: string
): Promise<Challenge | null> {
  const { data: db, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', challengeId)
    .maybeSingle();

  if (error || !db) return null;
  return fetchOneChallengeFromDb(supabase, db as DbChallengeRow);
}

async function fetchOneChallengeFromDb(
  supabase: SupabaseClient,
  db: DbChallengeRow
): Promise<Challenge> {
  const { data: days } = await supabase
    .from('challenge_days')
    .select('*')
    .eq('challenge_id', db.id)
    .order('day_number', { ascending: true });

  if (!days || days.length === 0) {
    return dbChallengeToUiChallenge(db, []);
  }

  const dayIds = (days as DbChallengeDayRow[]).map((d) => d.id);
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .in('day_id', dayIds)
    .order('task_number', { ascending: true });

  const tasksByDay = new Map<string, DbTaskRow[]>();
  for (const task of (tasks || []) as DbTaskRow[]) {
    const list = tasksByDay.get(task.day_id) || [];
    list.push(task);
    tasksByDay.set(task.day_id, list);
  }

  const weeks = groupDaysIntoWeeks(days as DbChallengeDayRow[], tasksByDay);
  return dbChallengeToUiChallenge(db, weeks);
}

/**
 * Persists a validated, Groq-generated challenge for the given user.
 * Writes the challenge row, then its days, then its tasks. If any step
 * after the challenge row fails, the challenge row (and anything already
 * written under it, via ON DELETE CASCADE) is deleted so we never leave
 * a half-created challenge behind.
 */
export async function saveGeneratedChallenge(
  supabase: SupabaseClient,
  userId: string,
  plan: GeneratedChallenge,
  params: { intensity: string; minutesPerDay: number }
): Promise<Challenge> {
  const { data: challengeRow, error: challengeError } = await supabase
    .from('challenges')
    .insert({
      user_id: userId,
      title: plan.title,
      description: plan.description,
      goal: plan.goal,
      duration_days: plan.durationDays,
      intensity: params.intensity,
      preferred_minutes_per_day: params.minutesPerDay,
      status: 'active',
    })
    .select('*')
    .single();

  if (challengeError || !challengeRow) {
    throw new Error(
      `Failed to create challenge: ${challengeError?.message ?? 'unknown error'}`
    );
  }

  const challengeId = (challengeRow as DbChallengeRow).id;

  try {
    const dayInserts = plan.days.map((d) => ({
      challenge_id: challengeId,
      day_number: d.dayNumber,
      title: d.title,
      description: d.description,
    }));

    const { data: insertedDays, error: daysError } = await supabase
      .from('challenge_days')
      .insert(dayInserts)
      .select('*');

    if (daysError || !insertedDays) {
      throw new Error(`Failed to create challenge days: ${daysError?.message}`);
    }

    const dayIdByNumber = new Map<number, string>();
    for (const row of insertedDays as DbChallengeDayRow[]) {
      dayIdByNumber.set(row.day_number, row.id);
    }

    const taskInserts = plan.days.flatMap((d) => {
      const dayId = dayIdByNumber.get(d.dayNumber);
      if (!dayId) return [];
      return d.tasks.map((t) => ({
        day_id: dayId,
        task_number: t.taskNumber,
        title: t.title,
        description: t.description,
        estimated_minutes: t.estimatedMinutes,
        task_type: t.taskType,
      }));
    });

    const { error: tasksError } = await supabase.from('tasks').insert(taskInserts);
    if (tasksError) {
      throw new Error(`Failed to create tasks: ${tasksError.message}`);
    }
  } catch (err) {
    // Roll back the partially-created challenge so nothing half-written remains.
    await supabase.from('challenges').delete().eq('id', challengeId);
    throw err;
  }

  const saved = await fetchChallengeByIdFromDb(supabase, challengeId);
  if (!saved) {
    throw new Error('Challenge was saved but could not be re-read');
  }
  return saved;
}

/**
 * Updates a task's completion state. The caller must already be scoped to
 * the authenticated user's Supabase client — RLS ensures a user can only
 * update tasks under their own challenges (the WHERE id match returns 0
 * rows for a task the user doesn't own, so we check `data` to detect that).
 */
export async function setTaskCompletion(
  supabase: SupabaseClient,
  taskId: string,
  completed: boolean
): Promise<boolean> {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', taskId)
    .select('id')
    .maybeSingle();

  return !error && !!data;
}
