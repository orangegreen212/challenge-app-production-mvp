'use client';

import { AppShell } from '@/components/shared/app-shell';
import { ProgressCalendar } from '@/components/shared/progress-calendar';
import { AchievementCard } from '@/components/shared/achievement-card';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingState } from '@/components/shared/loading-state';
import { useChallenge } from '@/lib/challenge-context';
import { calculateProgress, formatMinutes, countAllTasks } from '@/lib/challenge-utils';
import { Flame, TrendingUp, Clock, CheckCircle2, Calendar, LayoutGrid } from 'lucide-react';

export default function ProgressPage() {
  const { activeChallenge, achievements, loadingChallenges } = useChallenge();

  if (loadingChallenges) {
    return (
      <AppShell>
        <LoadingState label="Loading your progress..." className="min-h-[60vh]" />
      </AppShell>
    );
  }

  if (!activeChallenge) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-4xl lg:py-10">
          <EmptyState
            icon={LayoutGrid}
            title="No challenge yet"
            description="Create a challenge to start tracking your progress."
            actionLabel="Create a challenge"
            onAction={() => (window.location.href = '/create')}
          />
        </div>
      </AppShell>
    );
  }

  const progress = calculateProgress(activeChallenge);
  const totalTasks = countAllTasks(activeChallenge);
  const completedTasks = activeChallenge.completedTasks;
  const timeInvested = activeChallenge.timeInvestedMinutes;
  const streak = activeChallenge.streak;

  const calendarDays = Array.from({ length: activeChallenge.duration }, (_, i) => ({
    day: i + 1,
    completed: i < activeChallenge.currentDay - 1,
  }));

  const stats = [
    { label: 'Days', value: `${activeChallenge.duration}`, icon: Calendar },
    { label: 'Complete', value: `${progress}%`, icon: TrendingUp },
    { label: 'Tasks done', value: `${completedTasks}`, icon: CheckCircle2 },
    { label: 'Time invested', value: formatMinutes(timeInvested), icon: Clock },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-4xl lg:py-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl mb-6">
          Your progress
        </h1>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <Icon className="h-5 w-5 text-primary mb-2" />
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <div className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">Progress calendar</h2>
            <div className="flex items-center gap-2 text-sm">
              <Flame className="h-4 w-4 text-achievement" />
              <span className="font-semibold">{streak} day streak</span>
            </div>
          </div>
          <ProgressCalendar days={calendarDays} currentDay={activeChallenge.currentDay} />
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-success/15 border border-success/20" />
              Completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-primary" />
              Today
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-muted" />
              Upcoming
            </span>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold tracking-tight mb-4">Achievements</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {achievements.map((ach) => (
              <AchievementCard key={ach.id} achievement={ach} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 to-accent/20 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-achievement/15">
              <Flame className="h-6 w-6 text-achievement" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Keep going!</h3>
              <p className="text-sm text-muted-foreground">
                You&apos;re on a {streak}-day streak. Your next achievement is just around the corner.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
