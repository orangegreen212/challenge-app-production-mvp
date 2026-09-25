'use client';

import { cn } from '@/lib/utils';
import type { WeekSection } from '@/lib/types';
import { DayCard } from './day-card';

interface WeekSectionComponentProps {
  week: WeekSection;
  onToggleTask?: (dayId: string, taskId: string) => void;
  onEditTask?: (dayId: string, taskId: string, title: string) => void;
  onEditDay?: (dayId: string, title: string) => void;
  currentDay?: number;
  isPreview?: boolean;
}

export function WeekSectionComponent({
  week,
  onToggleTask,
  onEditTask,
  onEditDay,
  currentDay,
  isPreview = false,
}: WeekSectionComponentProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
          {week.weekNumber}
        </div>
        <h3 className="text-lg font-bold tracking-tight">{week.title}</h3>
      </div>
      <div className="space-y-2.5">
        {week.days.map((day) => (
          <DayCard
            key={day.id}
            day={day}
            onToggleTask={(taskId) => onToggleTask?.(day.id, taskId)}
            onEditTask={(taskId, title) => onEditTask?.(day.id, taskId, title)}
            onEditDay={(title) => onEditDay?.(day.id, title)}
            isToday={day.dayNumber === currentDay}
            isPreview={isPreview}
          />
        ))}
      </div>
    </div>
  );
}
