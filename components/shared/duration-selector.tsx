'use client';

import { cn } from '@/lib/utils';
import type { Duration } from '@/lib/types';

interface DurationSelectorProps {
  value: Duration;
  onChange: (value: Duration) => void;
}

const options: { label: string; value: Duration }[] = [
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
  { label: 'Custom', value: 'custom' },
];

export function DurationSelector({ value, onChange }: DurationSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-xl border px-4 py-3 text-sm font-semibold transition-all',
            value === opt.value
              ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20'
              : 'border-border bg-card text-foreground hover:border-primary/30'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
