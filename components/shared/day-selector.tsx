'use client';

import { cn } from '@/lib/utils';
import type { DayOfWeek } from '@/lib/types';

interface DaySelectorProps {
  value: DayOfWeek[];
  onChange: (value: DayOfWeek[]) => void;
}

const days: { label: string; value: DayOfWeek }[] = [
  { label: 'M', value: 'monday' },
  { label: 'T', value: 'tuesday' },
  { label: 'W', value: 'wednesday' },
  { label: 'T', value: 'thursday' },
  { label: 'F', value: 'friday' },
  { label: 'S', value: 'saturday' },
  { label: 'S', value: 'sunday' },
];

export function DaySelector({ value, onChange }: DaySelectorProps) {
  const toggle = (day: DayOfWeek) => {
    if (value.includes(day)) {
      onChange(value.filter((d) => d !== day));
    } else {
      onChange([...value, day]);
    }
  };

  return (
    <div className="flex gap-2">
      {days.map((d, i) => (
        <button
          key={d.value}
          onClick={() => toggle(d.value)}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold transition-all',
            value.includes(d.value)
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
              : 'bg-secondary text-secondary-foreground hover:bg-accent'
          )}
          aria-label={d.value}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}
