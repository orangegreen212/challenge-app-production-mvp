export type Duration = 7 | 14 | 30 | 'custom';
export type Intensity = 'light' | 'balanced' | 'intensive';
export type TimePerDay = 30 | 45 | 60 | 90 | 120;
export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type ChallengeStatus = 'draft' | 'active' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  duration: number;
  completed: boolean;
}

export interface DayPlan {
  id: string;
  dayNumber: number;
  title: string;
  goal: string;
  estimatedTime: number;
  tasks: Task[];
  completed: boolean;
}

export interface WeekSection {
  id: string;
  weekNumber: number;
  title: string;
  days: DayPlan[];
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  goal: string;
  status: ChallengeStatus;
  duration: number;
  timePerDay: TimePerDay;
  intensity: Intensity;
  preferredDays: DayOfWeek[];
  startTime: string;
  weeks: WeekSection[];
  currentDay: number;
  createdAt: string;
  completedTasks: number;
  totalTasks: number;
  timeInvestedMinutes: number;
  streak: number;
  startDate?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface ChallengeConfig {
  goal: string;
  duration: Duration;
  timePerDay: TimePerDay;
  intensity: Intensity;
  preferredDays: DayOfWeek[];
  startTime: string;
}

// ---------------------------------------------------------------------
// Production (Supabase + Groq) types
// ---------------------------------------------------------------------

export type TaskType =
  | 'reflection'
  | 'learning'
  | 'practice'
  | 'research'
  | 'project'
  | 'action';

/** Raw `challenges` table row. */
export interface DbChallengeRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  goal: string;
  duration_days: number;
  intensity: Intensity;
  preferred_minutes_per_day: number;
  status: ChallengeStatus;
  created_at: string;
  updated_at: string;
}

/** Raw `challenge_days` table row. */
export interface DbChallengeDayRow {
  id: string;
  challenge_id: string;
  day_number: number;
  title: string;
  description: string;
  created_at: string;
}

/** Raw `tasks` table row. */
export interface DbTaskRow {
  id: string;
  day_id: string;
  task_number: number;
  title: string;
  description: string;
  estimated_minutes: number;
  task_type: TaskType;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

/** Request body for POST /api/generate-plan */
export interface GeneratePlanRequestBody {
  goal: string;
  background?: string;
  preferences?: string;
  durationDays?: number;
  intensity?: Intensity;
  minutesPerDay?: number;
}
