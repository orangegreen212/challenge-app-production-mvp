'use client';

import Link from 'next/link';
import { Calendar, Clock, Flame, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Challenge } from '@/lib/types';
import { ProgressBar } from './progress-bar';
import { calculateProgress } from '@/lib/challenge-utils';

interface ChallengeCardProps {
  challenge: Challenge;
  variant?: 'active' | 'compact' | 'completed' | 'draft';
  href?: string;
}

const statusBadge: Record<string, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-primary/10 text-primary',
  },
  completed: {
    label: 'Completed',
    className: 'bg-success/10 text-success',
  },
  draft: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground',
  },
};

export function ChallengeCard({ challenge, variant = 'compact', href }: ChallengeCardProps) {
  const progress = calculateProgress(challenge);
  const linkHref = href || (challenge.status === 'active' ? '/dashboard' : `/challenges/${challenge.id}`);

  if (variant === 'active') {
    return (
      <Link href={linkHref} className="block group">
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/30">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold', statusBadge[challenge.status]?.className)}>
                {statusBadge[challenge.status]?.label || challenge.status}
              </span>
              <h3 className="mt-2 text-xl font-bold tracking-tight">{challenge.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{challenge.goal}</p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <span className="text-lg font-bold">{challenge.currentDay}</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Day {challenge.currentDay} of {challenge.duration}</span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <ProgressBar value={progress} size="md" />
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-achievement" />
              {challenge.streak} day streak
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {challenge.completedTasks} tasks done
            </span>
          </div>

          <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary transition-all group-hover:gap-2">
            Continue challenge
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={linkHref} className="block group">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold mb-2', statusBadge[challenge.status]?.className)}>
              {statusBadge[challenge.status]?.label || challenge.status}
            </span>
            <h3 className="font-bold text-lg tracking-tight truncate">{challenge.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{challenge.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {challenge.duration} days
          </span>
          {challenge.status === 'completed' && (
            <span className="flex items-center gap-1.5 text-success">
              <Flame className="h-4 w-4" />
              {challenge.streak} day streak
            </span>
          )}
        </div>

        {(challenge.status === 'active' || challenge.status === 'completed') && (
          <ProgressBar value={progress} size="sm" showLabel />
        )}

        {challenge.status === 'draft' && (
          <div className="flex items-center gap-1 text-sm font-semibold text-primary transition-all group-hover:gap-2">
            Review & start
            <ArrowRight className="h-4 w-4" />
          </div>
        )}
      </div>
    </Link>
  );
}
