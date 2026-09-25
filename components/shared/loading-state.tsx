'use client';

import { cn } from '@/lib/utils';

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = 'Loading...', className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16', className)}>
      <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      <p className="mt-4 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
