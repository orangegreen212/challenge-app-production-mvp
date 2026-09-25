'use client';

import { useState } from 'react';
import { ChevronDown, Clock, CheckCircle2, Circle, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DayPlan } from '@/lib/types';
import { TaskCard } from './task-card';

interface DayCardProps {
  day: DayPlan;
  onToggleTask?: (taskId: string) => void;
  onEditTask?: (taskId: string, title: string) => void;
  onEditDay?: (title: string) => void;
  defaultExpanded?: boolean;
  isToday?: boolean;
  isPreview?: boolean;
}

export function DayCard({
  day,
  onToggleTask,
  onEditTask,
  onEditDay,
  defaultExpanded = false,
  isToday = false,
  isPreview = false,
}: DayCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded || isToday);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(day.title);

  const completedCount = day.tasks.filter((t) => t.completed).length;
  const allDone = completedCount === day.tasks.length && day.tasks.length > 0;

  return (
    <div
      className={cn(
        'rounded-2xl border transition-all',
        isToday
          ? 'border-primary/30 bg-primary/5 shadow-sm'
          : allDone
            ? 'border-success/20 bg-success/5'
            : 'border-border bg-card'
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-colors',
            allDone
              ? 'bg-success text-success-foreground'
              : isToday
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
          )}
        >
          {day.dayNumber}
        </div>

        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => {
                setEditingTitle(false);
                if (titleDraft.trim() && onEditDay) onEditDay(titleDraft.trim());
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setEditingTitle(false);
                  if (titleDraft.trim() && onEditDay) onEditDay(titleDraft.trim());
                }
              }}
              autoFocus
              className="font-semibold text-foreground bg-transparent border-b border-primary outline-none"
            />
          ) : (
            <h4 className="font-semibold text-foreground truncate">{day.title}</h4>
          )}
          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {day.estimatedTime} min
            </span>
            <span className="flex items-center gap-1">
              {allDone ? (
                <CheckCircle2 className="h-3 w-3 text-success" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
              {completedCount}/{day.tasks.length} tasks
            </span>
          </div>
        </div>

        {!isPreview && onEditDay && !editingTitle && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingTitle(true);
            }}
            className="text-muted-foreground hover:text-primary p-1"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}

        <ChevronDown
          className={cn(
            'h-5 w-5 text-muted-foreground transition-transform shrink-0',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2.5 animate-in">
          {day.goal && (
            <div className="mb-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Goal: </span>
              {day.goal}
            </div>
          )}
          {day.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={() => onToggleTask?.(task.id)}
              onEdit={
                onEditTask
                  ? () => {
                      const newTitle = window.prompt('Edit task title', task.title);
                      if (newTitle && newTitle.trim()) onEditTask(task.id, newTitle.trim());
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
