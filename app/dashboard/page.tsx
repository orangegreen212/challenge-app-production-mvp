'use client';

import Link from 'next/link';
import { AppShell } from '@/components/shared/app-shell';
import { ChallengeCard } from '@/components/shared/challenge-card';
import { ProgressBar } from '@/components/shared/progress-bar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingState } from '@/components/shared/loading-state';
import { useChallenge } from '@/lib/challenge-context';
import { calculateProgress, getTodayPlan, formatMinutes } from '@/lib/challenge-utils';
import { TaskCard } from '@/components/shared/task-card';
import { Plus, ArrowRight, CheckCircle2, Flame, Sparkles, LayoutGrid } from 'lucide-react';

export default function DashboardPage() {
  const { activeChallenge, toggleTask, achievements, loadingChallenges } = useChallenge();

  if (loadingChallenges) {
    return (
      <AppShell>
        <LoadingState label="Loading your challenges..." className="min-h-[60vh]" />
      </AppShell>
    );
  }

  if (!activeChallenge) {
    return (
      <AppShell>
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-4xl lg:py-10">
          <EmptyState
            icon={LayoutGrid}
            title="No active challenge yet"
            description="Create your first AI-generated challenge to start building daily progress toward your goal."
            actionLabel="Create a challenge"
            onAction={() => (window.location.href = '/create')}
          />
        </div>
      </AppShell>
    );
  }

  const progress = calculateProgress(activeChallenge);
  const todayPlan = getTodayPlan(activeChallenge);
  const todayCompleted = todayPlan?.tasks.filter((t) => t.completed).length || 0;
  const todayTotal = todayPlan?.tasks.length || 0;
  const allDone = todayCompleted === todayTotal && todayTotal > 0;
  const unlockedAchievements = achievements.filter((a) => a.unlocked);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-4xl lg:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Good morning
            <span className="ml-1">👋</span>
          </h1>
          <p className="mt-1 text-muted-foreground">
            {allDone ? 'All done for today. Great work!' : 'Ready to make progress today?'}
          </p>
        </div>

        <ChallengeCard challenge={activeChallenge} variant="active" />

        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">Today</h2>
            <span className="text-sm text-muted-foreground">
              {todayCompleted} / {todayTotal} completed
            </span>
          </div>

          {todayPlan && (
            <>
              {allDone ? (
                <div className="rounded-2xl border border-success/20 bg-gradient-to-br from-success/10 to-card p-6 text-center animate-celebrate">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-success mb-3" />
                  <h3 className="text-xl font-bold">All tasks done!</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    You completed everything for today. See you tomorrow.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {todayPlan.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggle={() => toggleTask(todayPlan.id, task.id)}
                      size="lg"
                    />
                  ))}
                </div>
              )}

              <div className="mt-4">
                <ProgressBar value={todayCompleted} max={todayTotal} size="md" />
                <p className="mt-2 text-sm text-muted-foreground text-center">
                  Today&apos;s progress: {todayCompleted} / {todayTotal} completed
                </p>
              </div>

              <Link href={`/day/${todayPlan.id}`}>
                <Button variant="outline" className="mt-4 w-full rounded-xl" size="lg">
                  Open today&apos;s plan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">Recent achievements</h2>
            <Link href="/progress" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {unlockedAchievements.slice(0, 6).map((ach) => (
              <div
                key={ach.id}
                className="flex shrink-0 flex-col items-center gap-2 w-24 text-center"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-achievement/20 to-achievement/5 border border-achievement/30">
                  <span className="text-2xl">
                    {ach.icon === 'trophy' && '🏆'}
                    {ach.icon === 'flame' && '🔥'}
                    {ach.icon === 'star' && '⭐'}
                    {ach.icon === 'target' && '🎯'}
                    {ach.icon === 'gem' && '💎'}
                    {ach.icon === 'rocket' && '🚀'}
                    {ach.icon === 'crown' && '👑'}
                  </span>
                </div>
                <p className="text-xs font-medium leading-tight">{ach.title}</p>
              </div>
            ))}
          </div>
        </div>

        <Link href="/create" className="mt-8 block">
          <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-border p-4 transition-all hover:border-primary/30 hover:bg-accent/20">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Create a new challenge</p>
              <p className="text-sm text-muted-foreground">Turn a new goal into daily progress</p>
            </div>
          </div>
        </Link>
      </div>
    </AppShell>
  );
}
