'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/shared/app-shell';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { LoadingState } from '@/components/shared/loading-state';
import { WeekSectionComponent } from '@/components/shared/week-section';
import { ProgressBar } from '@/components/shared/progress-bar';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { Challenge } from '@/lib/types';
import {
  calculateProgress,
  calculateEstimatedTime,
  countAllTasks,
  formatMinutes,
} from '@/lib/challenge-utils';

export default function ChallengeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params.id as string;

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/challenges/${challengeId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not load this challenge.');
      } else {
        setChallenge(data.challenge);
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleTask = async (dayId: string, taskId: string) => {
    if (!challenge) return;

    // Optimistic update.
    const wasCompleted = challenge.weeks
      .flatMap((w) => w.days)
      .find((d) => d.id === dayId)
      ?.tasks.find((t) => t.id === taskId)?.completed;

    setChallenge((prev) => {
      if (!prev) return prev;
      const weeks = prev.weeks.map((w) => ({
        ...w,
        days: w.days.map((d) =>
          d.id !== dayId
            ? d
            : {
                ...d,
                tasks: d.tasks.map((t) =>
                  t.id === taskId ? { ...t, completed: !t.completed } : t
                ),
              }
        ),
      }));
      return { ...prev, weeks };
    });

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !wasCompleted }),
    });

    if (!res.ok) {
      // Revert on failure and reload the source of truth.
      load();
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppShell showNav={false}>
          <LoadingState label="Loading challenge..." className="min-h-screen" />
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (error || !challenge) {
    return (
      <ProtectedRoute>
        <AppShell showNav={false}>
          <div className="mx-auto max-w-md px-6 py-16 text-center">
            <h1 className="text-xl font-bold">Challenge not found</h1>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <Button className="mt-4" onClick={() => router.push('/dashboard')}>
              Back to dashboard
            </Button>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  const progress = calculateProgress(challenge);
  const totalTime = calculateEstimatedTime(challenge);
  const totalTasks = countAllTasks(challenge);

  return (
    <ProtectedRoute>
      <AppShell showNav={false}>
        <div className="mx-auto max-w-3xl px-6 py-8 sm:py-12">
          <button
            onClick={() => router.push('/dashboard')}
            className="mb-6 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </button>

          <div className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight">{challenge.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{challenge.goal}</p>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-lg font-bold">{challenge.duration} days</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total time</p>
                <p className="text-lg font-bold">{formatMinutes(totalTime)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tasks</p>
                <p className="text-lg font-bold">{totalTasks}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completion</p>
                <p className="text-lg font-bold">{progress}%</p>
              </div>
            </div>

            <div className="mt-4">
              <ProgressBar value={progress} size="sm" />
            </div>
          </div>

          <div className="space-y-6 mb-8">
            {challenge.weeks.map((week) => (
              <WeekSectionComponent
                key={week.id}
                week={week}
                currentDay={challenge.currentDay}
                onToggleTask={toggleTask}
              />
            ))}
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
