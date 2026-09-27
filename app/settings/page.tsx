'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/shared/app-shell';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Calendar,
  Send,
  Bell,
  User,
  Settings as SettingsIcon,
  LogOut,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

interface AppPreferences {
  default_duration: number;
  default_intensity: string;
  daily_time_goal: number;
  daily_reminders: boolean;
  achievement_alerts: boolean;
  streak_warnings: boolean;
  reminder_time: string;
  timezone: string;
}

type EditableField =
  | 'default_duration'
  | 'default_intensity'
  | 'daily_time_goal'
  | 'reminder_time';

const FIELD_LABELS: Record<EditableField, string> = {
  default_duration: 'Default duration',
  default_intensity: 'Default intensity',
  daily_time_goal: 'Daily time goal',
  reminder_time: 'Reminder time',
};

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const email = user?.email || 'Unknown';
  const initials = email.split('@')[0].slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    router.push('/sign-in');
  };

  // ---- Preferences (persisted server-side, in user_preferences) ----
  const [prefs, setPrefs] = useState<AppPreferences | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [savingField, setSavingField] = useState(false);

  const loadPreferences = async () => {
    try {
      const res = await fetch('/api/preferences');
      if (!res.ok) throw new Error('Failed to load preferences');
      const data = await res.json();
      setPrefs(data.preferences);
    } catch {
      toast.error('Could not load your preferences');
    } finally {
      setPrefsLoading(false);
    }
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  const savePreferences = async (patch: Partial<AppPreferences>) => {
    if (!prefs) return;
    const previous = prefs;
    setPrefs({ ...prefs, ...patch }); // optimistic
    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setPrefs(data.preferences);
      if (data.calendarWarning) {
        toast.warning('Saved, but Google Calendar sync failed', {
          description: data.calendarWarning,
        });
      }
      return true;
    } catch (err) {
      setPrefs(previous); // roll back
      toast.error(err instanceof Error ? err.message : 'Failed to save');
      return false;
    }
  };

  const openEdit = (field: EditableField) => {
    if (!prefs) return;
    setEditingField(field);
    setDraftValue(String(prefs[field]));
  };

  const saveEditedField = async () => {
    if (!editingField || !prefs) return;
    setSavingField(true);

    const patch: Partial<AppPreferences> = {};
    if (editingField === 'default_duration' || editingField === 'daily_time_goal') {
      const num = parseInt(draftValue, 10);
      if (!num || num <= 0) {
        toast.error('Enter a number greater than 0');
        setSavingField(false);
        return;
      }
      patch[editingField] = num;
    } else if (editingField === 'reminder_time') {
      patch.reminder_time = draftValue;
      patch.timezone = browserTimeZone();
    } else {
      patch.default_intensity = draftValue;
    }

    const ok = await savePreferences(patch);
    setSavingField(false);
    if (ok) {
      toast.success('Preference updated');
      setEditingField(null);
    }
  };

  const toggleNotif = (key: 'daily_reminders' | 'achievement_alerts' | 'streak_warnings') => {
    if (!prefs) return;
    const patch: Partial<AppPreferences> = { [key]: !prefs[key] };
    // Turning reminders on for the first time — make sure we have a
    // timezone on file so the calendar event and cron land at the right
    // local time.
    if (key === 'daily_reminders' && patch.daily_reminders) {
      patch.timezone = browserTimeZone();
    }
    savePreferences(patch);
  };

  // ---- Integrations ----
  interface IntegrationStatus {
    connected: boolean;
    account: string | null;
  }
  const [googleStatus, setGoogleStatus] = useState<IntegrationStatus>({
    connected: false,
    account: null,
  });
  const [telegramStatus, setTelegramStatus] = useState<IntegrationStatus>({
    connected: false,
    account: null,
  });
  const [statusLoading, setStatusLoading] = useState(true);
  const [googleDisconnecting, setGoogleDisconnecting] = useState(false);
  const [telegramDisconnecting, setTelegramDisconnecting] = useState(false);

  const fetchIntegrationStatus = async () => {
    try {
      const res = await fetch('/api/integrations/status');
      if (!res.ok) return;
      const data = await res.json();
      setGoogleStatus(data.google);
      setTelegramStatus(data.telegram);
    } catch {
      // Leave last-known status on the screen rather than erroring out.
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrationStatus();

    // Google redirects back to /settings?integration_success=google or
    // ?integration_error=... — surface that as a toast, then clean the URL.
    const params = new URLSearchParams(window.location.search);
    const success = params.get('integration_success');
    const error = params.get('integration_error');
    if (success === 'google') {
      toast.success('Google Calendar connected');
    } else if (error) {
      toast.error(error);
    }
    if (success || error) {
      window.history.replaceState({}, '', '/settings');
    }
  }, []);

  const handleConnectGoogle = () => {
    window.location.href = '/api/integrations/google/connect';
  };

  const handleDisconnectGoogle = async () => {
    setGoogleDisconnecting(true);
    try {
      const res = await fetch('/api/integrations/google', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to disconnect Google Calendar');
      setGoogleStatus({ connected: false, account: null });
      toast.success('Google Calendar disconnected');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setGoogleDisconnecting(false);
    }
  };

  // ---- Telegram connect dialog (linking code + poll for completion) ----
  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false);
  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const [telegramLinkLoading, setTelegramLinkLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const handleOpenTelegramDialog = async () => {
    setTelegramDialogOpen(true);
    setTelegramLinkLoading(true);
    setTelegramLink(null);
    try {
      const res = await fetch('/api/integrations/telegram/connect', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start Telegram linking');
      setTelegramLink(data.deepLink);

      stopPolling();
      pollRef.current = setInterval(async () => {
        const statusRes = await fetch('/api/integrations/status');
        if (!statusRes.ok) return;
        const statusData = await statusRes.json();
        if (statusData.telegram?.connected) {
          setTelegramStatus(statusData.telegram);
          stopPolling();
          setTelegramDialogOpen(false);
          toast.success('Telegram connected');
        }
      }, 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start Telegram linking');
      setTelegramDialogOpen(false);
    } finally {
      setTelegramLinkLoading(false);
    }
  };

  useEffect(() => stopPolling, []);

  const handleDisconnectTelegram = async () => {
    setTelegramDisconnecting(true);
    try {
      const res = await fetch('/api/integrations/telegram', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to disconnect Telegram');
      setTelegramStatus({ connected: false, account: null });
      toast.success('Telegram disconnected');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setTelegramDisconnecting(false);
    }
  };

  // ---- Change password ----
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setPwSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Password updated');
    setPwDialogOpen(false);
    setNewPassword('');
    setConfirmPassword('');
  };

  // ---- Export data ----
  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/challenges');
      if (!res.ok) throw new Error('Failed to fetch your data');
      const data = await res.json();

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        account: { email },
        preferences: prefs,
        challenges: data.challenges ?? [],
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Data exported');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
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
                <p className="text-xs text-muted-foreground">
                  {prefsLoading ? '…' : `${prefs?.default_duration} days`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => openEdit('default_duration')}
                disabled={prefsLoading}
              >
                Change
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Default intensity</Label>
                <p className="text-xs text-muted-foreground">
                  {prefsLoading ? '…' : prefs?.default_intensity}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => openEdit('default_intensity')}
                disabled={prefsLoading}
              >
                Change
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Daily time goal</Label>
                <p className="text-xs text-muted-foreground">
                  {prefsLoading ? '…' : `${prefs?.daily_time_goal} minutes`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => openEdit('daily_time_goal')}
                disabled={prefsLoading}
              >
                Change
              </Button>
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
              <Switch
                checked={!!prefs?.daily_reminders}
                onCheckedChange={() => toggleNotif('daily_reminders')}
                disabled={prefsLoading}
              />
            </div>
            {prefs?.daily_reminders && (
              <div className="flex items-center justify-between pl-1">
                <div>
                  <Label className="text-xs text-muted-foreground">Reminder time</Label>
                  <p className="text-sm font-medium">{prefs.reminder_time}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => openEdit('reminder_time')}
                >
                  Change
                </Button>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Achievement alerts</Label>
              <Switch
                checked={!!prefs?.achievement_alerts}
                onCheckedChange={() => toggleNotif('achievement_alerts')}
                disabled={prefsLoading}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Streak warnings</Label>
              <Switch
                checked={!!prefs?.streak_warnings}
                onCheckedChange={() => toggleNotif('streak_warnings')}
                disabled={prefsLoading}
              />
            </div>
            {(prefs?.daily_reminders) && (
              <p className="text-xs text-muted-foreground pt-1">
                {googleStatus.connected && 'A daily event is kept in your Google Calendar. '}
                {telegramStatus.connected && "You'll also get a Telegram message at this time."}
                {!googleStatus.connected && !telegramStatus.connected &&
                  'Connect Google Calendar or Telegram below to actually receive this reminder.'}
              </p>
            )}
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
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {googleStatus.connected ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        {googleStatus.account || 'Connected'}
                      </>
                    ) : (
                      'Not connected'
                    )}
                  </p>
                </div>
              </div>
              {googleStatus.connected ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-destructive hover:text-destructive"
                  onClick={handleDisconnectGoogle}
                  disabled={googleDisconnecting}
                >
                  {googleDisconnecting ? 'Removing…' : 'Disconnect'}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={handleConnectGoogle}
                  disabled={statusLoading}
                >
                  Connect
                </Button>
              )}
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <Send className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Telegram</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {telegramStatus.connected ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        {telegramStatus.account || 'Connected'}
                      </>
                    ) : (
                      'Not connected'
                    )}
                  </p>
                </div>
              </div>
              {telegramStatus.connected ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-destructive hover:text-destructive"
                  onClick={handleDisconnectTelegram}
                  disabled={telegramDisconnecting}
                >
                  {telegramDisconnecting ? 'Removing…' : 'Disconnect'}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={handleOpenTelegramDialog}
                  disabled={statusLoading}
                >
                  Connect
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight mb-4">Account</h2>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full rounded-xl justify-start"
              onClick={() => setPwDialogOpen(true)}
            >
              Change password
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl justify-start"
              onClick={handleExportData}
              disabled={exporting}
            >
              {exporting ? 'Exporting…' : 'Export my data'}
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

      {/* Edit preference dialog */}
      <Dialog open={editingField !== null} onOpenChange={(open) => !open && setEditingField(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingField ? FIELD_LABELS[editingField] : ''}</DialogTitle>
            <DialogDescription>Update this challenge preference.</DialogDescription>
          </DialogHeader>

          {editingField === 'default_intensity' ? (
            <Select value={draftValue} onValueChange={setDraftValue}>
              <SelectTrigger>
                <SelectValue placeholder="Select intensity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Balanced">Balanced</SelectItem>
                <SelectItem value="Intense">Intense</SelectItem>
              </SelectContent>
            </Select>
          ) : editingField === 'reminder_time' ? (
            <Input
              type="time"
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
            />
          ) : (
            <Input
              type="number"
              min={1}
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
              placeholder={editingField === 'default_duration' ? 'Days' : 'Minutes'}
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingField(null)} disabled={savingField}>
              Cancel
            </Button>
            <Button onClick={saveEditedField} disabled={savingField}>
              {savingField ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Telegram linking dialog */}
      <Dialog
        open={telegramDialogOpen}
        onOpenChange={(open) => {
          setTelegramDialogOpen(open);
          if (!open) stopPolling();
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Connect Telegram</DialogTitle>
            <DialogDescription>
              Open the link below in Telegram and tap Start. This page updates automatically
              once it's linked.
            </DialogDescription>
          </DialogHeader>
          {telegramLinkLoading ? (
            <p className="text-sm text-muted-foreground">Generating your link…</p>
          ) : telegramLink ? (
            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Open in Telegram
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTelegramDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change password dialog */}
      <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>Choose a new password for your account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-sm font-medium">
                New password
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-sm font-medium">
                Confirm password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwDialogOpen(false)} disabled={pwSaving}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={pwSaving}>
              {pwSaving ? 'Saving…' : 'Save password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AppShell>
  );
}
