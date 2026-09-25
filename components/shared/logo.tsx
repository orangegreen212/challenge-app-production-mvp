import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { icon: 'h-7 w-7', text: 'text-lg' },
  md: { icon: 'h-9 w-9', text: 'text-xl' },
  lg: { icon: 'h-12 w-12', text: 'text-2xl' },
};

export function Logo({ className, showText = true, size = 'md' }: LogoProps) {
  const s = sizeMap[size];
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/20',
          s.icon
        )}
      >
        <Sparkles className="h-1/2 w-1/2" strokeWidth={2.5} />
      </div>
      {showText && (
        <span className={cn('font-bold tracking-tight', s.text)}>
          Challenge <span className="text-primary">AI</span>
        </span>
      )}
    </div>
  );
}
