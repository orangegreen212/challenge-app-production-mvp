import type { Challenge, DayPlan, Task } from './types';

export function countAllTasks(challenge: Challenge): number {
  return challenge.weeks.reduce(
    (total, week) => total + week.days.reduce((dayTotal, day) => dayTotal + day.tasks.length, 0),
    0
  );
}

export function countCompletedTasks(challenge: Challenge): number {
  return challenge.weeks.reduce(
    (total, week) =>
      total + week.days.reduce((dayTotal, day) => dayTotal + day.tasks.filter((t) => t.completed).length, 0),
    0
  );
}

export function calculateProgress(challenge: Challenge): number {
  const total = countAllTasks(challenge);
  if (total === 0) return 0;
  return Math.round((countCompletedTasks(challenge) / total) * 100);
}

export function calculateEstimatedTime(challenge: Challenge): number {
  return challenge.weeks.reduce(
    (total, week) => total + week.days.reduce((dayTotal, day) => dayTotal + day.estimatedTime, 0),
    0
  );
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

export function getTodayPlan(challenge: Challenge): DayPlan | null {
  const day = challenge.weeks
    .flatMap((w) => w.days)
    .find((d) => d.dayNumber === challenge.currentDay);
  return day || null;
}

export function getDayById(challenge: Challenge, dayId: string): DayPlan | null {
  return (
    challenge.weeks
      .flatMap((w) => w.days)
      .find((d) => d.id === dayId) || null
  );
}

export function toggleTaskCompletion(
  challenge: Challenge,
  dayId: string,
  taskId: string
): Challenge {
  const updatedWeeks = challenge.weeks.map((week) => ({
    ...week,
    days: week.days.map((day) => {
      if (day.id !== dayId) return day;
      const updatedTasks = day.tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      );
      const allComplete = updatedTasks.every((t) => t.completed);
      return { ...day, tasks: updatedTasks, completed: allComplete };
    }),
  }));

  const updatedChallenge = { ...challenge, weeks: updatedWeeks };
  updatedChallenge.completedTasks = countCompletedTasks(updatedChallenge);
  updatedChallenge.totalTasks = countAllTasks(updatedChallenge);

  return updatedChallenge;
}

export function updateTaskTitle(
  challenge: Challenge,
  dayId: string,
  taskId: string,
  newTitle: string
): Challenge {
  return {
    ...challenge,
    weeks: challenge.weeks.map((week) => ({
      ...week,
      days: week.days.map((day) =>
        day.id !== dayId
          ? day
          : {
              ...day,
              tasks: day.tasks.map((task) =>
                task.id === taskId ? { ...task, title: newTitle } : task
              ),
            }
      ),
    })),
  };
}

export function updateDayTitle(
  challenge: Challenge,
  dayId: string,
  newTitle: string
): Challenge {
  return {
    ...challenge,
    weeks: challenge.weeks.map((week) => ({
      ...week,
      days: week.days.map((day) =>
        day.id === dayId ? { ...day, title: newTitle } : day
      ),
    })),
  };
}
