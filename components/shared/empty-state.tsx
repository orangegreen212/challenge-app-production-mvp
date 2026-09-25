'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-16 px-4', className)}>
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted mb-5">
        <Icon className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl font-bold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
