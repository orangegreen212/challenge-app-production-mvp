'use client';

import { cn } from '@/lib/utils';
import { Check, Clock, Trash2 } from 'lucide-react';
import { ConfirmDelete } from './confirm-delete';
import type { Task } from '@/lib/types';

interface TaskCardProps {
  task: Task;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export function TaskCard({ task, onToggle, onEdit, onDelete, size = 'md' }: TaskCardProps) {
  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-xl border transition-all',
        sizeMap[size],
        task.completed
          ? 'border-success/20 bg-success/5'
          : 'border-border bg-card hover:border-primary/30 hover:shadow-sm'
      )}
    >
      <button
        onClick={onToggle}
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all',
          task.completed
            ? 'border-success bg-success text-success-foreground'
            : 'border-muted-foreground/30 hover:border-primary'
        )}
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {task.completed && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'font-medium leading-snug break-words',
            task.completed
              ? 'text-muted-foreground line-through'
              : 'text-foreground'
          )}
        >
          {task.title}
        </p>
        {task.description && size !== 'sm' && (
          <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line break-words">
            {task.description}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{task.duration} min</span>
        </div>
      </div>

      {onEdit && (
        <button
          onClick={onEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-primary font-medium"
        >
          Edit
        </button>
      )}

      {onDelete && (
        <ConfirmDelete
          title="Delete this task?"
          description={`"${task.title}" will be removed permanently.`}
          onConfirm={onDelete}
        >
          <button
            className="shrink-0 p-1 text-muted-foreground transition-colors hover:text-destructive"
            aria-label="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </ConfirmDelete>
      )}
    </div>
  );
}
