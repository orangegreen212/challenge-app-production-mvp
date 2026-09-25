'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/shared/logo';
import { GoalCard } from '@/components/shared/goal-card';
import { DurationSelector } from '@/components/shared/duration-selector';
import { IntensitySelector } from '@/components/shared/intensity-selector';
import { DaySelector } from '@/components/shared/day-selector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProtectedRoute } from '@/components/shared/protected-route';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import type { Duration, Intensity, TimePerDay, DayOfWeek } from '@/lib/types';

const timeOptions: { label: string; value: TimePerDay }[] = [
  { label: '30 min', value: 30 },
  { label: '60 min', value: 60 },
  { label: '90 min', value: 90 },
  { label: '120 min', value: 120 },
];

export default function ConfigurePage() {
  const router = useRouter();
  const [goal, setGoal] = useState(
    'Build practical skills and become confident enough to apply them in real situations.'
  );
  const [editingGoal, setEditingGoal] = useState(false);
  const [duration, setDuration] = useState<Duration>(14);
  const [timePerDay, setTimePerDay] = useState<TimePerDay>(60);
  const [intensity, setIntensity] = useState<Intensity>('balanced');
  const [preferredDays, setPreferredDays] = useState<DayOfWeek[]>([
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  ]);
  const [startTime, setStartTime] = useState('10:00');

  return (
    <ProtectedRoute>
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20">
      <div className="mx-auto max-w-2xl px-6 py-8 sm:py-12">
        <div className="mb-8 flex items-center justify-between">
          <Logo size="md" />
          <button
            onClick={() => router.push('/create')}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-8">
          Let&apos;s build your challenge
        </h1>

        <div className="space-y-8">
          {editingGoal ? (
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5 space-y-3">
              <Label>Edit your goal</Label>
              <Textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="min-h-[80px] resize-none"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setEditingGoal(false)}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingGoal(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <GoalCard goal={goal} onEdit={() => setEditingGoal(true)} />
          )}

          <div>
            <Label className="text-base font-semibold mb-3 block">Duration</Label>
            <DurationSelector value={duration} onChange={setDuration} />
          </div>

          <div>
            <Label className="text-base font-semibold mb-3 block">
              Time available per day
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {timeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTimePerDay(opt.value)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                    timePerDay === opt.value
                      ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <Clock className="h-4 w-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-base font-semibold mb-3 block">Intensity</Label>
            <IntensitySelector value={intensity} onChange={setIntensity} />
          </div>

          <div>
            <Label className="text-base font-semibold mb-3 block">Preferred days</Label>
            <DaySelector value={preferredDays} onChange={setPreferredDays} />
          </div>

          <div>
            <Label className="text-base font-semibold mb-3 block">Preferred start time</Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-32 text-base"
            />
          </div>

          <Button
            onClick={() => {
              const durationDays = duration;
              sessionStorage.setItem(
                'challenge-create-config',
                JSON.stringify({
                  goal,
                  durationDays,
                  intensity,
                  minutesPerDay: timePerDay,
                  preferences: `Preferred days: ${preferredDays.join(', ')}. Preferred start time: ${startTime}.`,
                })
              );
              router.push('/create/generate');
            }}
            size="lg"
            className="w-full text-base font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
          >
            Generate my plan
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}

function Textarea({ value, onChange, className }: { value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; className?: string }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      className={`flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className || ''}`}
    />
  );
}
