import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgSettings, useUpdateOrgSetting } from '@/hooks/useOrgSettings';
import PageHeader from '@/components/operations/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Phone, Save, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function todayDay(): string {
  const d = new Date().getDay(); // 0=Sun
  // Convert to Mon=0 index
  return DAYS[(d + 6) % 7];
}

export default function OpOnCall() {
  const { isAdmin } = useAuth();
  const { settings, loading } = useOrgSettings();
  const updateSetting = useUpdateOrgSetting();
  const [schedule, setSchedule] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const currentSchedule = saved ? schedule : settings.oncall_schedule;
  const today = todayDay();
  const onCallToday = currentSchedule[today] || 'Not assigned';

  const handleChange = (day: string, value: string) => {
    setSaved(true);
    setSchedule(prev => ({ ...settings.oncall_schedule, ...prev, [day]: value }));
  };

  const handleSave = async () => {
    try {
      await updateSetting.mutateAsync({ key: 'oncall_schedule', value: { ...settings.oncall_schedule, ...schedule } });
      toast.success('On-call schedule saved.');
      setSaved(false);
      setSchedule({});
    } catch {
      toast.error('Failed to save schedule.');
    }
  };

  const editSchedule = { ...settings.oncall_schedule, ...schedule };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="On-Call Schedule"
        description="Weekly on-call assignments for the Operations team."
      />

      {/* Today's hero */}
      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="p-3 rounded-full bg-primary/10">
            <UserCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">On call today ({DAY_NAMES[(DAYS.indexOf(today))]})</p>
            <p className="text-xl font-bold">{onCallToday}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4" />
            Weekly Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : (
            DAYS.map((day, i) => (
              <div key={day} className="flex items-center gap-3">
                <Label className={`w-28 text-sm ${day === today ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                  {DAY_NAMES[i]}
                  {day === today && <Badge variant="default" className="ml-2 text-[10px] px-1.5 py-0">Today</Badge>}
                </Label>
                {isAdmin ? (
                  <Input
                    className="h-8 text-sm"
                    placeholder="Staff name / phone"
                    value={editSchedule[day] ?? ''}
                    onChange={e => handleChange(day, e.target.value)}
                  />
                ) : (
                  <span className="text-sm">{editSchedule[day] || <span className="text-muted-foreground italic">Not assigned</span>}</span>
                )}
              </div>
            ))
          )}
          {isAdmin && (
            <div className="pt-2">
              <Button size="sm" onClick={handleSave} disabled={updateSetting.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save Schedule
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
