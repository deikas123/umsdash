import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Phone, Save, Shield, Bell, Building2, ScanLine, Key, AlertTriangle } from 'lucide-react';
import { SmsSettings } from '@/components/settings/SmsSettings';
import { OnboardingTourSettings } from '@/components/settings/OnboardingTourSettings';
import { AvatarUpload } from '@/components/AvatarUpload';
import { useOrgSettings, useUpdateOrgSetting } from '@/hooks/useOrgSettings';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useMFA } from '@/hooks/useMFA';
import { Link } from 'react-router-dom';

const ANNOUNCEMENT_COLORS = ['blue', 'green', 'yellow', 'red', 'purple'];

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
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: formData.full_name.trim(), phone: formData.phone.trim() || null }).eq('user_id', user.id);
      if (error) throw error;
      toast({ title: 'Profile updated', description: 'Your profile has been updated successfully.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to update profile.', variant: 'destructive' });
    } finally {
      setLoading(false);
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
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (error) throw error;
      await supabase.from('profiles').update({ password_changed_at: new Date().toISOString() }).eq('user_id', user!.id);
      toast({ title: 'Password updated' });
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to update password.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setLoading(true);
    try {
      const { error: uploadErr } = await supabase.storage.from('avatars').upload('org/logo.png', logoFile, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl('org/logo.png');
      const url = urlData?.publicUrl ?? '';
      await updateSetting.mutateAsync({ key: 'org_logo_url', value: url });
      setOrgLogoUrl(url);
      toast({ title: 'Logo updated' });
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Upload failed.', variant: 'destructive' });
    } finally {
      setLoading(false);
      setLogoFile(null);
    }
  };

  const saveAnnouncement = async () => {
    await updateSetting.mutateAsync({ key: 'announcement', value: { text: annText, color: annColor, active: annActive } });
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
    if (data) { setEnrollData(data); setMfaStep('verifying'); }
    else setMfaStep('idle');
  };

  const verifyEnroll = async () => {
    if (!enrollData) return;
    const result = await challengeAndVerify(enrollData.id, mfaCode);
    if (result) {
      toast({ title: 'Two-factor authentication enabled' });
      const updated = await listFactors();
      setFactors(updated);
      setEnrollData(null); setMfaCode(''); setMfaStep('idle');
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
      <div className="max-w-2xl space-y-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Profile Information</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <AvatarUpload />
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input id="email" value={profile?.email || ''} disabled className="bg-muted" />
                </div>
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input id="full_name" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder="Your full name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Input id="phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+254..." />
                </div>
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" value={passwordData.newPassword} onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })} placeholder="Minimum 8 characters" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} placeholder="Re-enter new password" />
              </div>
              <Button type="submit" disabled={loading || !passwordData.newPassword}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Two-Factor Authentication</CardTitle>
            <CardDescription>Secure your account with a TOTP authenticator app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {verifiedFactors.length > 0 ? (
              <div className="space-y-2">
                {verifiedFactors.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{f.friendly_name || 'Authenticator App'}</p>
                      <p className="text-xs text-muted-foreground">TOTP · Verified</p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => handleUnenroll(f.id)} disabled={mfaLoading}>Remove</Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">2FA is not enabled on your account.</p>
            )}
            {mfaStep === 'idle' && verifiedFactors.length === 0 && (
              <Button size="sm" onClick={startEnroll} disabled={mfaLoading}>
                {mfaLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
                Set Up 2FA
              </Button>
            )}
            {mfaStep === 'verifying' && enrollData && (
              <div className="space-y-3">
                <p className="text-sm">Scan the QR code with your authenticator app:</p>
                <img src={enrollData.totp?.qr_code} alt="QR code" className="w-40 h-40 border rounded" />
                <p className="text-xs text-muted-foreground">Or enter secret manually: <code className="font-mono bg-muted px-1 rounded">{enrollData.totp?.secret}</code></p>
                <div className="flex gap-2">
                  <Input placeholder="6-digit code" maxLength={6} value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))} className="w-40" />
                  <Button size="sm" onClick={verifyEnroll} disabled={mfaCode.length !== 6 || mfaLoading}>Verify</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setMfaStep('idle'); setEnrollData(null); setMfaCode(''); }}>Cancel</Button>
                </div>
              </div>
            )}
            <div className="pt-2">
              <Button variant="link" size="sm" className="p-0 h-auto text-muted-foreground" asChild>
                <Link to="/docs/sessions">Manage active sessions →</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Notification Preferences</CardTitle>
            <CardDescription>Choose which notifications you receive.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {prefsLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">In-App</p>
                {([
                  ['in_app_task_assigned', 'Task assigned to me'],
                  ['in_app_reminder_due', 'Reminder due'],
                  ['in_app_mention', '@mention in chat'],
                  ['in_app_achievement', 'Achievement unlocked'],
                ] as const).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label className="text-sm">{label}</Label>
                    <Switch checked={preferences[key]} onCheckedChange={v => updatePrefs.mutate({ [key]: v })} />
                  </div>
                ))}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">SMS</p>
                {([
                  ['sms_task_assigned', 'Task assigned (SMS)'],
                  ['sms_reminder_due', 'Reminder due (SMS)'],
                ] as const).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label className="text-sm">{label}</Label>
                    <Switch checked={preferences[key]} onCheckedChange={v => updatePrefs.mutate({ [key]: v })} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Push Notifications */}
        {isSupported && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Push Notifications</CardTitle>
              <CardDescription>Receive browser push notifications even when the app is closed.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{isSubscribed ? 'Push notifications enabled' : 'Push notifications disabled'}</p>
                  <p className="text-xs text-muted-foreground">{isSubscribed ? 'You will receive push notifications.' : 'Enable to get notified in your browser.'}</p>
                </div>
                <Switch
                  checked={isSubscribed}
                  disabled={pushLoading}
                  onCheckedChange={v => v ? subscribe().catch(e => toast({ title: 'Push Error', description: e.message, variant: 'destructive' })) : unsubscribe()}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* SMS Notifications */}
        <SmsSettings />

        {/* Onboarding Tours */}
        <OnboardingTourSettings />

        {/* Admin: Org Branding */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Organisation Branding</CardTitle>
              <CardDescription>Upload an org logo and configure announcements.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Logo upload */}
              <div className="space-y-2">
                <Label>Organisation Logo</Label>
                {orgLogoUrl && <img src={orgLogoUrl} alt="Org logo" className="h-12 w-auto object-contain border rounded p-1" />}
                <div className="flex items-center gap-2">
                  <Input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] ?? null)} className="max-w-xs" />
                  <Button size="sm" onClick={handleLogoUpload} disabled={!logoFile || loading}>Upload</Button>
                </div>
              </div>

              {/* Announcement banner */}
              <div className="space-y-2">
                <Label>Announcement Banner</Label>
                <Textarea
                  placeholder="Announcement text (leave empty to hide)"
                  value={annText}
                  onChange={e => setAnnText(e.target.value)}
                  rows={2}
                />
                <div className="flex items-center gap-3">
                  <Select value={annColor} onValueChange={setAnnColor}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ANNOUNCEMENT_COLORS.map(c => <SelectItem key={c} value={c}><span className="capitalize">{c}</span></SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Switch id="ann-active" checked={annActive} onCheckedChange={setAnnActive} />
                    <Label htmlFor="ann-active" className="text-sm">Active</Label>
                  </div>
                  <Button size="sm" onClick={saveAnnouncement}>Save</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin: Maintenance Mode */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" />Maintenance Mode</CardTitle>
              <CardDescription>When enabled, non-admin users see a maintenance page instead of the app.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{maintenanceMode ? '⚠ Maintenance mode is ON' : 'Maintenance mode is off'}</p>
                  <p className="text-xs text-muted-foreground">Admins always bypass maintenance mode.</p>
                </div>
                <Switch checked={maintenanceMode} onCheckedChange={saveMaintenanceMode} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
