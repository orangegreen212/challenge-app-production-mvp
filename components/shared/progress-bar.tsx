import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
}

const sizeMap = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
};

export function ProgressBar({
  value,
  max = 100,
  className,
  size = 'md',
  showLabel = false,
  label,
}: ProgressBarProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-medium text-muted-foreground">
            {label || 'Progress'}
          </span>
          <span className="font-semibold text-foreground">{Math.round(pct)}%</span>
        </div>
      )}
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-secondary',
          sizeMap[size]
        )}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
