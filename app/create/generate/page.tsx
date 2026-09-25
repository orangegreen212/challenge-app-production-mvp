'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/shared/app-shell';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { Button } from '@/components/ui/button';
import { Sparkles, AlertCircle, RotateCcw } from 'lucide-react';
import type { Challenge } from '@/lib/types';

interface StoredConfig {
  goal: string;
  durationDays: number;
  intensity: string;
  minutesPerDay: number;
  preferences: string;
}

export default function GeneratePlanPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runGeneration = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(null);

    const raw = sessionStorage.getItem('challenge-create-config');
    if (!raw) {
      setErrorMessage('Missing challenge details. Please start over.');
      setStatus('error');
      return;
    }

    const config: StoredConfig = JSON.parse(raw);
    const background = sessionStorage.getItem('challenge-create-background') || '';

    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: config.goal,
          background,
          preferences: config.preferences,
          durationDays: config.durationDays,
          intensity: config.intensity,
          minutesPerDay: config.minutesPerDay,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Something went wrong generating your plan.');
        setStatus('error');
        return;
      }

      const challenge: Challenge = data.challenge;
      sessionStorage.removeItem('challenge-create-config');
      sessionStorage.removeItem('challenge-create-background');
      setStatus('success');
      router.push(`/challenges/${challenge.id}`);
    } catch {
      setErrorMessage('Could not reach the server. Check your connection and try again.');
      setStatus('error');
    }
  }, [router]);

  useEffect(() => {
    runGeneration();
  }, [runGeneration]);

  return (
    <ProtectedRoute>
      <AppShell showNav={false}>
        <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
          {status !== 'error' ? (
            <>
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 animate-pulse">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Generating your challenge
              </h1>
              <p className="mt-2 text-muted-foreground">
                We&apos;re asking the AI to build a plan around your goal. This
                usually takes a few seconds.
              </p>
            </>
          ) : (
            <>
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Couldn&apos;t generate your plan
              </h1>
              <p className="mt-2 text-muted-foreground">{errorMessage}</p>
              <div className="mt-6 flex gap-3">
                <Button onClick={runGeneration} className="rounded-xl">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Try again
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => router.push('/create/configure')}
                >
                  Back to settings
                </Button>
              </div>
            </>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
