import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, User, Mail, Phone, Save, Shield, Bell, Building2,
  Key, AlertTriangle, X, Lock,
} from 'lucide-react';
import { SmsSettings } from '@/components/settings/SmsSettings';
import { OnboardingTourSettings } from '@/components/settings/OnboardingTourSettings';
import { AvatarUpload } from '@/components/AvatarUpload';
import { useOrgSettings, useUpdateOrgSetting } from '@/hooks/useOrgSettings';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useMFA } from '@/hooks/useMFA';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const ANNOUNCEMENT_COLORS = ['blue', 'green', 'yellow', 'red', 'purple'];

// Helper: row of label + description + control (switches)
function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="space-y-0.5">
        <p className="text-sm font-medium leading-none">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// Section header with icon
function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-2 text-base">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
          <span className="text-primary">{icon}</span>
        </span>
        {title}
      </CardTitle>
      {description && <CardDescription className="mt-0.5">{description}</CardDescription>}
    </CardHeader>
  );
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function Settings() {
  const { profile, user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { settings } = useOrgSettings();
  const updateSetting = useUpdateOrgSetting();
  const { preferences, update: updatePrefs, loading: prefsLoading } = useNotificationPreferences();
  const { isSubscribed, isSupported, subscribe, unsubscribe, loading: pushLoading } = usePushNotifications();
  const { listFactors, enroll, unenroll, challengeAndVerify, loading: mfaLoading, error: mfaError } = useMFA();

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  // Org settings form state
  const [annText, setAnnText] = useState('');
  const [annColor, setAnnColor] = useState('blue');
  const [annActive, setAnnActive] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [orgLogoUrl, setOrgLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [orgSettingsSynced, setOrgSettingsSynced] = useState(false);

  // Section-level saving states
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);

  // MFA state
  const [factors, setFactors] = useState<any[]>([]);
  const [enrollData, setEnrollData] = useState<any>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaStep, setMfaStep] = useState<'idle' | 'enrolling' | 'verifying'>('idle');

  useEffect(() => {
    if (!orgSettingsSynced && settings.announcement?.text !== undefined) {
      setAnnText(settings.announcement.text);
      setAnnColor(settings.announcement.color || 'blue');
      setAnnActive(settings.announcement.active || false);
      setMaintenanceMode(settings.maintenance_mode || false);
      setOrgLogoUrl(settings.org_logo_url || '');
      setOrgSettingsSynced(true);
    }
  }, [settings, orgSettingsSynced]);

  useEffect(() => {
    if (user) listFactors().then(setFactors);
  }, [user, listFactors]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: formData.full_name.trim(), phone: formData.phone.trim() || null })
        .eq('user_id', user.id);
      if (error) throw error;
      toast({ title: 'Profile updated', description: 'Your profile has been saved.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to update profile.', variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast({ title: 'Password too short', description: 'Minimum 8 characters.', variant: 'destructive' });
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (error) throw error;
      await supabase
        .from('profiles')
        .update({ password_changed_at: new Date().toISOString() })
        .eq('user_id', user!.id);
      toast({ title: 'Password updated', description: 'Your password has been changed.' });
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to update password.',
        variant: 'destructive',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setSavingOrg(true);
    try {
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload('org/logo.png', logoFile, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl('org/logo.png');
      const url = urlData?.publicUrl ?? '';
      await updateSetting.mutateAsync({ key: 'org_logo_url', value: url });
      setOrgLogoUrl(url);
      toast({ title: 'Logo updated' });
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Upload failed.',
        variant: 'destructive',
      });
    } finally {
      setSavingOrg(false);
      setLogoFile(null);
    }
  };

  const saveAnnouncement = async () => {
    await updateSetting.mutateAsync({
      key: 'announcement',
      value: { text: annText, color: annColor, active: annActive },
    });
    toast({ title: 'Announcement saved' });
  };

  const saveMaintenanceMode = async (val: boolean) => {
    setMaintenanceMode(val);
    await updateSetting.mutateAsync({ key: 'maintenance_mode', value: val });
    toast({ title: `Maintenance mode ${val ? 'enabled' : 'disabled'}` });
  };

  const startEnroll = async () => {
    setMfaStep('enrolling');
    const data = await enroll('UMS Hub Authenticator');
    if (data) {
      setEnrollData(data);
      setMfaStep('verifying');
    } else {
      setMfaStep('idle');
    }
  };

  const verifyEnroll = async () => {
    if (!enrollData) return;
    const result = await challengeAndVerify(enrollData.id, mfaCode);
    if (result) {
      toast({ title: 'Two-factor authentication enabled' });
      const updated = await listFactors();
      setFactors(updated);
      setEnrollData(null);
      setMfaCode('');
      setMfaStep('idle');
    } else {
      toast({ title: 'Invalid code', description: mfaError || 'Please try again.', variant: 'destructive' });
    }
  };

  const handleUnenroll = async (factorId: string) => {
    const ok = await unenroll(factorId);
    if (ok) {
      toast({ title: '2FA removed' });
      const updated = await listFactors();
      setFactors(updated);
    }
  };

  const verifiedFactors = factors.filter((f: any) => f.status === 'verified');

  return (
    <AppLayout title="Settings" description="Manage your account settings">
      {/* Page header */}
      <div className="flex flex-col gap-1 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage your profile, security, and notification preferences.
            </p>
          </div>
        </div>
      </div>

      <motion.div
        className="max-w-2xl space-y-6"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* ── Profile Information ─────────────────────────────────────────── */}
        <motion.div variants={fadeUp}>
          <Card>
            <SectionHeader
              icon={<User className="h-4 w-4" />}
              title="Profile Information"
              description="Update your name, phone number and profile picture."
            />
            <Separator />
            <CardContent className="pt-5 space-y-5">
              <AvatarUpload />

              <form onSubmit={handleProfileUpdate} className="space-y-4">
                {/* Email — read-only */}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <p className="text-xs text-muted-foreground">Your account email. Cannot be changed here.</p>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="email"
                      value={profile?.email || ''}
                      disabled
                      className="bg-muted pl-9"
                    />
                  </div>
                </div>

                {/* Full name */}
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Full name</Label>
                  <p className="text-xs text-muted-foreground">Your display name across the platform.</p>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Your full name"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone number</Label>
                  <p className="text-xs text-muted-foreground">Used for SMS notifications (optional).</p>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+254..."
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button type="submit" disabled={savingProfile}>
                    {savingProfile ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save profile
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Security ────────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp}>
          <Card>
            <SectionHeader
              icon={<Lock className="h-4 w-4" />}
              title="Security"
              description="Change your password and manage two-factor authentication."
            />
            <Separator />
            <CardContent className="pt-5 space-y-6">
              {/* Password change */}
              <div>
                <p className="text-sm font-semibold mb-3">Change password</p>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword">New password</Label>
                    <p className="text-xs text-muted-foreground">Must be at least 8 characters.</p>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="New password"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirm new password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="Re-enter new password"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="submit" disabled={savingPassword || !passwordData.newPassword}>
                      {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Update password
                    </Button>
                    {passwordData.newPassword && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPasswordData({ newPassword: '', confirmPassword: '' })}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </div>

              <Separator />

              {/* Two-factor authentication */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">Two-Factor Authentication</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Add an extra layer of security with a TOTP authenticator app.
                </p>

                <div className="space-y-3">
                  {verifiedFactors.length > 0 ? (
                    <div className="space-y-2">
                      {verifiedFactors.map((f: any) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium">{f.friendly_name || 'Authenticator App'}</p>
                            <p className="text-xs text-muted-foreground">TOTP · Verified</p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleUnenroll(f.id)}
                            disabled={mfaLoading}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      2FA is not enabled on your account.
                    </p>
                  )}

                  {mfaStep === 'idle' && verifiedFactors.length === 0 && (
                    <Button size="sm" onClick={startEnroll} disabled={mfaLoading}>
                      {mfaLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Key className="mr-2 h-4 w-4" />
                      )}
                      Set up 2FA
                    </Button>
                  )}

                  {mfaStep === 'verifying' && enrollData && (
                    <div className="space-y-3 rounded-lg border p-4 bg-muted/20">
                      <p className="text-sm font-medium">Scan QR code with your authenticator app:</p>
                      <img
                        src={enrollData.totp?.qr_code}
                        alt="QR code"
                        className="w-40 h-40 border rounded"
                      />
                      <p className="text-xs text-muted-foreground">
                        Or enter secret manually:{' '}
                        <code className="font-mono bg-muted px-1 rounded">
                          {enrollData.totp?.secret}
                        </code>
                      </p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="6-digit code"
                          maxLength={6}
                          value={mfaCode}
                          onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                          className="w-40"
                        />
                        <Button
                          size="sm"
                          onClick={verifyEnroll}
                          disabled={mfaCode.length !== 6 || mfaLoading}
                        >
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setMfaStep('idle');
                            setEnrollData(null);
                            setMfaCode('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button variant="link" size="sm" className="p-0 h-auto text-muted-foreground" asChild>
                    <Link to="/docs/sessions">Manage active sessions →</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Notifications ───────────────────────────────────────────────── */}
        <motion.div variants={fadeUp}>
          <Card>
            <SectionHeader
              icon={<Bell className="h-4 w-4" />}
              title="Notification Preferences"
              description="Choose which events trigger notifications for you."
            />
            <Separator />
            <CardContent className="pt-5 space-y-2">
              {prefsLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-1">
                    In-App
                  </p>
                  {(
                    [
                      ['in_app_task_assigned', 'Task assigned to me', 'Notify when a task is assigned to you'],
                      ['in_app_reminder_due', 'Reminder due', 'Notify when a reminder is about to trigger'],
                      ['in_app_mention', '@mention in chat', 'Notify when someone mentions you in chat'],
                      ['in_app_achievement', 'Achievement unlocked', 'Notify when you earn a new achievement'],
                    ] as const
                  ).map(([key, label, description]) => (
                    <SettingRow key={key} label={label} description={description}>
                      <Switch
                        checked={preferences[key]}
                        onCheckedChange={(v) => updatePrefs.mutate({ [key]: v })}
                      />
                    </SettingRow>
                  ))}

                  <Separator className="my-2" />

                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-1">
                    SMS
                  </p>
                  {(
                    [
                      ['sms_task_assigned', 'Task assigned (SMS)', 'Receive an SMS when a task is assigned'],
                      ['sms_reminder_due', 'Reminder due (SMS)', 'Receive an SMS when a reminder triggers'],
                    ] as const
                  ).map(([key, label, description]) => (
                    <SettingRow key={key} label={label} description={description}>
                      <Switch
                        checked={preferences[key]}
                        onCheckedChange={(v) => updatePrefs.mutate({ [key]: v })}
                      />
                    </SettingRow>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Push Notifications ──────────────────────────────────────────── */}
        {isSupported && (
          <motion.div variants={fadeUp}>
            <Card>
              <SectionHeader
                icon={<Bell className="h-4 w-4" />}
                title="Push Notifications"
                description="Receive browser push notifications even when the app is closed."
              />
              <Separator />
              <CardContent className="pt-5">
                <SettingRow
                  label={isSubscribed ? 'Push notifications enabled' : 'Push notifications disabled'}
                  description={
                    isSubscribed
                      ? 'You will receive push notifications in your browser.'
                      : 'Enable to get browser notifications.'
                  }
                >
                  <Switch
                    checked={isSubscribed}
                    disabled={pushLoading}
                    onCheckedChange={(v) =>
                      v
                        ? subscribe().catch((e) =>
                            toast({ title: 'Push Error', description: e.message, variant: 'destructive' })
                          )
                        : unsubscribe()
                    }
                  />
                </SettingRow>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── SMS Settings ────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp}>
          <SmsSettings />
        </motion.div>

        {/* ── Onboarding Tours ────────────────────────────────────────────── */}
        <motion.div variants={fadeUp}>
          <OnboardingTourSettings />
        </motion.div>

        {/* ── Admin: Organisation Branding ────────────────────────────────── */}
        {isAdmin && (
          <motion.div variants={fadeUp}>
            <Card>
              <SectionHeader
                icon={<Building2 className="h-4 w-4" />}
                title="Organisation Branding"
                description="Upload an org logo and configure announcement banners."
              />
              <Separator />
              <CardContent className="pt-5 space-y-5">
                {/* Logo upload */}
                <div className="space-y-2">
                  <Label>Organisation logo</Label>
                  <p className="text-xs text-muted-foreground">
                    Shown in the app header and emails. PNG recommended.
                  </p>
                  {orgLogoUrl && (
                    <img
                      src={orgLogoUrl}
                      alt="Org logo"
                      className="h-12 w-auto object-contain border rounded p-1"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                      className="max-w-xs"
                    />
                    <Button
                      size="sm"
                      onClick={handleLogoUpload}
                      disabled={!logoFile || savingOrg}
                    >
                      {savingOrg ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upload'}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Announcement banner */}
                <div className="space-y-2">
                  <Label>Announcement banner</Label>
                  <p className="text-xs text-muted-foreground">
                    Displayed at the top of the app for all users when active.
                  </p>
                  <Textarea
                    placeholder="Announcement text (leave empty to hide)"
                    value={annText}
                    onChange={(e) => setAnnText(e.target.value)}
                    rows={2}
                  />
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Select value={annColor} onValueChange={setAnnColor}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ANNOUNCEMENT_COLORS.map((c) => (
                          <SelectItem key={c} value={c}>
                            <span className="capitalize">{c}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Switch id="ann-active" checked={annActive} onCheckedChange={setAnnActive} />
                      <Label htmlFor="ann-active" className="text-sm cursor-pointer">
                        Active
                      </Label>
                    </div>
                    <Button size="sm" onClick={saveAnnouncement}>
                      <Save className="mr-2 h-3.5 w-3.5" />
                      Save
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Admin: Maintenance Mode ──────────────────────────────────────── */}
        {isAdmin && (
          <motion.div variants={fadeUp}>
            <Card className="border-amber-200 dark:border-amber-800">
              <SectionHeader
                icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
                title="Maintenance Mode"
                description="When enabled, non-admin users see a maintenance page instead of the app."
              />
              <Separator />
              <CardContent className="pt-5">
                <SettingRow
                  label={maintenanceMode ? '⚠ Maintenance mode is ON' : 'Maintenance mode is off'}
                  description="Admins always bypass maintenance mode and can access the app normally."
                >
                  <Switch checked={maintenanceMode} onCheckedChange={saveMaintenanceMode} />
                </SettingRow>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </AppLayout>
  );
}
