'use client';

import { cn } from '@/lib/utils';
import { AchievementBadge } from './achievement-badge';
import type { Achievement } from '@/lib/types';

interface AchievementCardProps {
  achievement: Achievement;
  size?: 'sm' | 'md';
}

export function AchievementCard({ achievement, size = 'md' }: AchievementCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center rounded-2xl border p-4 transition-all',
        achievement.unlocked
          ? 'border-achievement/20 bg-gradient-to-b from-achievement/5 to-card'
          : 'border-border bg-card opacity-60'
      )}
    >
      <AchievementBadge
        icon={achievement.icon}
        unlocked={achievement.unlocked}
        size={size === 'sm' ? 'sm' : 'lg'}
      />
      <h4 className="mt-3 font-semibold text-sm text-foreground">{achievement.title}</h4>
      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
        {achievement.description}
      </p>
      {achievement.unlocked && achievement.unlockedAt && (
        <p className="mt-2 text-[11px] font-medium text-achievement">
          Unlocked
        </p>
      )}
    </div>
  );
}
