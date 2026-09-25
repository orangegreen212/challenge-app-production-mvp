'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/shared/app-shell';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { Calendar, Send, Bell, User, Settings as SettingsIcon, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const email = user?.email || 'Unknown';
  const initials = email
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    router.push('/sign-in');
  };

  return (
    <AppShell>
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl mb-6">
        Settings
      </h1>

      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">Profile</h2>
          </div>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">{email}</p>
              <p className="text-sm text-muted-foreground">Member since today</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <SettingsIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">Challenge preferences</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Default duration</Label>
                <p className="text-xs text-muted-foreground">30 days</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-lg">Change</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Default intensity</Label>
                <p className="text-xs text-muted-foreground">Balanced</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-lg">Change</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Daily time goal</Label>
                <p className="text-xs text-muted-foreground">60 minutes</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-lg">Change</Button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">Notifications</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Daily reminders</Label>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Achievement alerts</Label>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Streak warnings</Label>
              <Switch />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight mb-4">Integrations</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Google Calendar</p>
                  <p className="text-xs text-muted-foreground">Not connected</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="rounded-lg">Connect</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <Send className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Telegram</p>
                  <p className="text-xs text-muted-foreground">Not connected</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="rounded-lg">Connect</Button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight mb-4">Account</h2>
          <div className="space-y-3">
            <Button variant="outline" className="w-full rounded-xl justify-start">
              Change password
            </Button>
            <Button variant="outline" className="w-full rounded-xl justify-start">
              Export my data
            </Button>
            <Button
              variant="ghost"
              className="w-full rounded-xl justify-start text-destructive hover:text-destructive"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {signingOut ? 'Signing out...' : 'Sign out'}
            </Button>
          </div>
        </section>
      </div>
    </div>
    </AppShell>
  );
}
