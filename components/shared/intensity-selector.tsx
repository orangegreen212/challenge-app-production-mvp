'use client';

import { cn } from '@/lib/utils';
import type { Intensity } from '@/lib/types';

interface IntensitySelectorProps {
  value: Intensity;
  onChange: (value: Intensity) => void;
}

const options: { label: string; value: Intensity; desc: string }[] = [
  { label: 'Light', value: 'light', desc: '1-2 tasks per day' },
  { label: 'Balanced', value: 'balanced', desc: '2-3 tasks per day' },
  { label: 'Intensive', value: 'intensive', desc: '3-4 tasks per day' },
];

export function IntensitySelector({ value, onChange }: IntensitySelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-xl border p-4 text-left transition-all',
            value === opt.value
              ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
              : 'border-border bg-card hover:border-primary/30'
          )}
        >
          <p className={cn(
            'font-semibold',
            value === opt.value ? 'text-primary' : 'text-foreground'
          )}>
            {opt.label}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</p>
        </button>
      ))}
    </div>
  );
}
