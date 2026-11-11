/**
 * IT → People → Account Lifecycle
 * Records onboarding, transfers, offboarding etc. for HR employees.
 * it_lifecycle_events FK → hr_employees.id
 */
import { useState } from 'react';
import { useItLifecycleEvents, useCreateItLifecycleEvent } from '@/it/hooks/useItData';
import { useEmployees } from '@/hr/hooks/useSupabaseData';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const eventTypes = ['onboarded', 'transferred', 'offboarded', 'suspended', 'reactivated', 'role_changed'] as const;

const eventColors: Record<string, string> = {
  onboarded:    'bg-green-100 text-green-800',
  transferred:  'bg-blue-100 text-blue-800',
  offboarded:   'bg-red-100 text-red-800',
  suspended:    'bg-yellow-100 text-yellow-800',
  reactivated:  'bg-teal-100 text-teal-800',
  role_changed: 'bg-purple-100 text-purple-800',
};

const eventDescriptions: Record<string, string> = {
  onboarded:    'New employee — account created, device assigned, access provisioned',
  transferred:  'Employee moved to a different department — permissions reviewed',
  offboarded:   'Employee left — account suspended, device recovered, access revoked',
  suspended:    'Account temporarily suspended (e.g. disciplinary, leave)',
  reactivated:  'Account reinstated after suspension',
  role_changed: 'Job title or role changed — access groups reviewed',
};

export default function AccountLifecycle() {
  const { data: events = [], isLoading } = useItLifecycleEvents();
  const { data: employees = [] } = useEmployees();   // ← HR employees
  const createEvent = useCreateItLifecycleEvent();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    event_type: 'onboarded' as typeof eventTypes[number],
    event_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const empName = (id: string) => {
    const e = employees.find(emp => emp.id === id);
    return e ? `${e.first_name} ${e.last_name}` : '—';
  };

  const handleSave = async () => {
    if (!form.employee_id) { toast({ title: 'Select an employee', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await createEvent.mutateAsync({
        employee_id: form.employee_id,
        event_type: form.event_type,
        event_date: form.event_date,
        notes: form.notes,
        details: {},
      });
      toast({ title: 'Lifecycle event recorded' });
      setShowForm(false);
      setForm(f => ({ ...f, employee_id: '', notes: '' }));
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Account Lifecycle</h1>
          <p className="page-subtitle">
            Onboarding, transfers, offboarding and account changes · {events.length} events recorded
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Record Event
        </Button>
      </div>

      {/* Quick-reference scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {(['onboarded', 'transferred', 'offboarded'] as const).map(t => (
          <div key={t} className="bg-card border rounded-lg p-4 shadow-sm">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${eventColors[t]}`}>{t}</span>
            <p className="text-xs text-muted-foreground mt-2">{eventDescriptions[t]}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              {['Employee', 'Department', 'Event', 'Date', 'Notes'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map(ev => {
              const emp = employees.find(e => e.id === ev.employee_id);
              return (
                <tr key={ev.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{empName(ev.employee_id)}</p>
                    <p className="text-xs text-muted-foreground">{emp?.email ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">{(emp as any)?.hr_departments?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${eventColors[ev.event_type] ?? 'bg-muted text-muted-foreground'}`}>
                      {ev.event_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{format(new Date(ev.event_date), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{ev.notes || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {events.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No lifecycle events recorded yet. Use "Record Event" to track onboarding, transfers and offboarding.
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Lifecycle Event</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            <div>
              <Label className="text-xs">Employee</Label>
              <Select value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} — {e.staff_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Event Type</Label>
              <Select value={form.event_type} onValueChange={v => setForm(f => ({ ...f, event_type: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {eventTypes.map(t => (
                    <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.event_type && (
                <p className="text-xs text-muted-foreground mt-1">{eventDescriptions[form.event_type]}</p>
              )}
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes…" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Record'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
