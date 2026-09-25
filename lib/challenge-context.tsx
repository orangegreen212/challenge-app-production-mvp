'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Challenge, Achievement } from './types';
import {
  activeChallenge as mockActiveChallenge,
  allChallenges as mockAllChallenges,
  achievements as initialAchievements,
  generatedPlanChallenge,
} from './mock-data';
import { countAllTasks, countCompletedTasks } from './challenge-utils';
import { fetchAchievements } from './db';
import { useAuth } from './auth-context';

interface ChallengeContextValue {
  /** The most recently active real (Supabase-backed) challenge, or null if signed out / none yet. */
  activeChallenge: Challenge | null;
  /** All of the current user's real (Supabase-backed) challenges. */
  allChallenges: Challenge[];
  achievements: Achievement[];
  /** Static demo data — NOT real AI output. Only use for signed-out demo/dev screens, never label it "AI-generated". */
  demoChallenge: Challenge;
  toggleTask: (dayId: string, taskId: string) => Promise<void>;
  refreshChallenges: () => Promise<void>;
  loadingChallenges: boolean;
}

const ChallengeContext = createContext<ChallengeContextValue | null>(null);

export function ChallengeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [ach, setAchievements] = useState<Achievement[]>(initialAchievements);
  const [loadingChallenges, setLoadingChallenges] = useState(false);

  const refreshChallenges = useCallback(async () => {
    if (!user) return;
    setLoadingChallenges(true);
    try {
      const [challengesRes, dbAchievements] = await Promise.all([
        fetch('/api/challenges').then((r) => (r.ok ? r.json() : { challenges: [] })),
        fetchAchievements(),
      ]);
      setChallenges(challengesRes.challenges || []);
      if (dbAchievements.length > 0) {
        setAchievements(dbAchievements);
      }
    } finally {
      setLoadingChallenges(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshChallenges();
    } else {
      setChallenges([]);
    }
  }, [user, refreshChallenges]);

  const toggleTask = useCallback(
    async (dayId: string, taskId: string) => {
      const current = challenges.find((c) =>
        c.weeks.some((w) => w.days.some((d) => d.id === dayId))
      );
      const task = current?.weeks
        .flatMap((w) => w.days)
        .find((d) => d.id === dayId)
        ?.tasks.find((t) => t.id === taskId);
      if (!current || !task) return;

      const nextCompleted = !task.completed;

      // Optimistic local update.
      setChallenges((prev) =>
        prev.map((c) => {
          if (c.id !== current.id) return c;
          const weeks = c.weeks.map((w) => ({
            ...w,
            days: w.days.map((d) =>
              d.id !== dayId
                ? d
                : {
                    ...d,
                    tasks: d.tasks.map((t) =>
                      t.id === taskId ? { ...t, completed: nextCompleted } : t
                    ),
                  }
            ),
          }));
          return {
            ...c,
            weeks,
            totalTasks: countAllTasks({ ...c, weeks }),
            completedTasks: countCompletedTasks({ ...c, weeks }),
          };
        })
      );

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: nextCompleted }),
      });

      // Supabase is the source of truth: if the write failed, re-sync.
      if (!res.ok) {
        await refreshChallenges();
      }
    },
    [challenges, refreshChallenges]
  );

  const activeChallenge =
    challenges.find((c) => c.status === 'active') || challenges[0] || null;

  return (
    <ChallengeContext.Provider
      value={{
        activeChallenge,
        allChallenges: challenges,
        achievements: ach,
        demoChallenge: generatedPlanChallenge,
        toggleTask,
        refreshChallenges,
        loadingChallenges,
      }}
    >
      {children}
    </ChallengeContext.Provider>
  );
}

export function useChallenge() {
  const ctx = useContext(ChallengeContext);
  if (!ctx) throw new Error('useChallenge must be used within ChallengeProvider');
  return ctx;
}

// Re-exported for any screen that explicitly wants static demo/dev data
// (clearly separate from real, Supabase-persisted, AI-generated challenges).
export { mockActiveChallenge, mockAllChallenges };
