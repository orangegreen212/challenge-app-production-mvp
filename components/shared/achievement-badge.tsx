'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import {
  Trophy,
  Flame,
  Star,
  Target,
  Gem,
  Rocket,
  Crown,
  Lock,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  trophy: Trophy,
  flame: Flame,
  star: Star,
  target: Target,
  gem: Gem,
  rocket: Rocket,
  crown: Crown,
};

interface AchievementBadgeProps {
  icon: string;
  unlocked: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-20 w-20',
};

const iconSizeMap = {
  sm: 'h-5 w-5',
  md: 'h-7 w-7',
  lg: 'h-10 w-10',
};

export function AchievementBadge({ icon, unlocked, size = 'md' }: AchievementBadgeProps) {
  const Icon = iconMap[icon] || Trophy;

  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-2xl transition-all',
        sizeMap[size],
        unlocked
          ? 'bg-gradient-to-br from-achievement/20 to-achievement/5 border border-achievement/30 shadow-md shadow-achievement/10'
          : 'bg-muted border border-border'
      )}
    >
      <Icon
        className={cn(
          iconSizeMap[size],
          unlocked ? 'text-achievement' : 'text-muted-foreground/50'
        )}
        strokeWidth={2}
      />
      {!unlocked && (
        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-card border border-border">
          <Lock className="h-2.5 w-2.5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
