import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSmsPreferences } from '@/hooks/useSmsPreferences';
import { Loader2, MessageSquare, Save } from 'lucide-react';

export function SmsSettings() {
  const { prefs, loading, savePrefs } = useSmsPreferences();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    sms_enabled: true,
    phone_number: '',
    notify_reminders: true,
    notify_tasks: true,
    notify_task_updates: true,
  });

  useEffect(() => {
    if (prefs) {
      setForm({
        sms_enabled: prefs.sms_enabled,
        phone_number: prefs.phone_number || '',
        notify_reminders: prefs.notify_reminders,
        notify_tasks: prefs.notify_tasks,
        notify_task_updates: prefs.notify_task_updates,
      });
    }
  }, [prefs]);

  const handleSave = async () => {
    setSaving(true);
    await savePrefs({
      sms_enabled: form.sms_enabled,
      phone_number: form.phone_number.trim() || null,
      notify_reminders: form.notify_reminders,
      notify_tasks: form.notify_tasks,
      notify_task_updates: form.notify_task_updates,
    });
    setSaving(false);
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          SMS Notifications
        </CardTitle>
        <CardDescription>
          Receive SMS alerts for reminders, tasks, and updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Enable SMS Notifications</Label>
          <Switch checked={form.sms_enabled} onCheckedChange={v => setForm(f => ({ ...f, sms_enabled: v }))} />
        </div>

        {form.sms_enabled && (
          <>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={form.phone_number}
                onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
                placeholder="254712345678"
              />
              <p className="text-xs text-muted-foreground">Enter in format: 254XXXXXXXXX</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Reminder alerts</Label>
                <Switch checked={form.notify_reminders} onCheckedChange={v => setForm(f => ({ ...f, notify_reminders: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label>New task assignments</Label>
                <Switch checked={form.notify_tasks} onCheckedChange={v => setForm(f => ({ ...f, notify_tasks: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Task status updates</Label>
                <Switch checked={form.notify_task_updates} onCheckedChange={v => setForm(f => ({ ...f, notify_task_updates: v }))} />
              </div>
            </div>
          </>
        )}

        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save SMS Settings
        </Button>
      </CardContent>
    </Card>
  );
}
