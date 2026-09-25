'use client';

import { AppShell } from '@/components/shared/app-shell';
import { ChallengeCard } from '@/components/shared/challenge-card';
import { EmptyState } from '@/components/shared/empty-state';
import { useChallenge } from '@/lib/challenge-context';
import { LayoutGrid } from 'lucide-react';

export default function ChallengesPage() {
  const { allChallenges } = useChallenge();

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:max-w-4xl lg:py-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl mb-6">
          Challenges
        </h1>

        {allChallenges.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title="No challenges yet"
            description="Create your first challenge to start building daily progress toward your goals."
            actionLabel="Create a challenge"
            onAction={() => (window.location.href = '/create')}
          />
        ) : (
          <div className="space-y-4">
            {allChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                variant={challenge.status === 'active' ? 'active' : 'compact'}
                href={`/challenges/${challenge.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
