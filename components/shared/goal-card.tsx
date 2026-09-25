'use client';

import { cn } from '@/lib/utils';
import { Brain } from 'lucide-react';

interface GoalCardProps {
  goal: string;
  onEdit?: () => void;
  className?: string;
}

export function GoalCard({ goal, onEdit, className }: GoalCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 to-accent/30 p-5',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">
            I understood your goal as
          </p>
          <p className="mt-1.5 text-base font-medium text-foreground leading-relaxed">
            &ldquo;{goal}&rdquo;
          </p>
          {onEdit && (
            <button
              onClick={onEdit}
              className="mt-3 text-sm font-semibold text-primary hover:underline"
            >
              Edit goal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
