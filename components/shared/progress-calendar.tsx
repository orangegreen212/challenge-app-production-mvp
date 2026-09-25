'use client';

import { cn } from '@/lib/utils';

interface ProgressCalendarProps {
  days: { day: number; completed: boolean }[];
  currentDay?: number;
}

export function ProgressCalendar({ days, currentDay }: ProgressCalendarProps) {
  return (
    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
      {days.map((d) => {
        const isCurrent = d.day === currentDay;
        return (
          <div
            key={d.day}
            className={cn(
              'flex aspect-square items-center justify-center rounded-lg text-xs font-semibold transition-all',
              d.completed
                ? 'bg-success/15 text-success border border-success/20'
                : isCurrent
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                  : 'bg-muted text-muted-foreground/60'
            )}
          >
            {d.day}
          </div>
        );
      })}
    </div>
  );
}
