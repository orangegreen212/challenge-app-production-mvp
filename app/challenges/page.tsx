'use client';

import { AppShell } from '@/components/shared/app-shell';
import { ChallengeCard } from '@/components/shared/challenge-card';
import { EmptyState } from '@/components/shared/empty-state';
import { useChallenge } from '@/lib/challenge-context';
import { ConfirmDelete } from '@/components/shared/confirm-delete';
import { LayoutGrid, Trash2 } from 'lucide-react';

export default function ChallengesPage() {
  const { allChallenges, deleteChallenge } = useChallenge();

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
              <div key={challenge.id} className="relative">
                <ChallengeCard
                  challenge={challenge}
                  variant={challenge.status === 'active' ? 'active' : 'compact'}
                  href={`/challenges/${challenge.id}`}
                />
                <ConfirmDelete
                  title="Delete this challenge?"
                  description={`"${challenge.title}" and all its days and tasks will be removed permanently.`}
                  onConfirm={() => deleteChallenge(challenge.id)}
                >
                  <button
                    className="absolute right-3 top-3 rounded-lg bg-card/80 p-2 text-muted-foreground backdrop-blur transition-colors hover:text-destructive"
                    aria-label="Delete challenge"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </ConfirmDelete>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
