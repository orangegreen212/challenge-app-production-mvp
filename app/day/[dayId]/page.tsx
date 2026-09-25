'use client';

import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/shared/app-shell';
import { TaskCard } from '@/components/shared/task-card';
import { Button } from '@/components/ui/button';
import { useChallenge } from '@/lib/challenge-context';
import { getDayById, formatMinutes } from '@/lib/challenge-utils';
import { ArrowLeft, Clock, Target, Sparkles, CheckCircle2, PartyPopper } from 'lucide-react';

export default function DayDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { activeChallenge, toggleTask } = useChallenge();

  const dayId = params.dayId as string;
  const day = activeChallenge ? getDayById(activeChallenge, dayId) : null;

  if (!day) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-6 py-12 text-center">
          <h1 className="text-2xl font-bold">Day not found</h1>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">
            Back to dashboard
          </Button>
        </div>
      </AppShell>
    );
  }

  const completedCount = day.tasks.filter((t) => t.completed).length;
  const allDone = completedCount === day.tasks.length && day.tasks.length > 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="mb-6 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>

        <div className="mb-6">
          <p className="text-sm font-semibold text-primary">Day {day.dayNumber}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{day.title}</h1>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              <span className="text-xs font-medium">Today&apos;s goal</span>
            </div>
            <p className="text-sm font-medium text-foreground">{day.goal}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Estimated time</span>
            </div>
            <p className="text-sm font-medium text-foreground">{formatMinutes(day.estimatedTime)}</p>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-bold tracking-tight mb-3">Tasks</h2>
          <div className="space-y-2.5">
            {day.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={() => toggleTask(day.id, task.id)}
                size="lg"
              />
            ))}
          </div>
        </div>

        {allDone ? (
          <div className="rounded-2xl border border-success/20 bg-gradient-to-br from-success/10 to-card p-6 text-center animate-celebrate">
            <PartyPopper className="mx-auto h-10 w-10 text-success mb-2" />
            <h3 className="text-lg font-bold">Day complete!</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              You finished all {day.tasks.length} tasks. See you tomorrow.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <Button
              variant="outline"
              className="w-full rounded-xl border-dashed"
              size="lg"
            >
              <Sparkles className="mr-2 h-5 w-5 text-primary" />
              Need help? Ask AI
            </Button>

            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full rounded-xl shadow-lg shadow-primary/20"
              size="lg"
            >
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Complete day
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
