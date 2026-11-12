import { useState } from 'react';
import { useItDeviceAssignments, useCreateItDeviceAssignment, useReturnItDeviceAssignment, useItDevices } from '@/it/hooks/useItData';
import { useEmployees } from '@/hr/hooks/useSupabaseData';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function DeviceAssignments() {
  const { data: assignments = [], isLoading } = useItDeviceAssignments();
  const { data: devices = [] } = useItDevices();
  const { data: employees = [] } = useEmployees();
  const create = useCreateItDeviceAssignment();
  const returnDev = useReturnItDeviceAssignment();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ device_id: '', employee_id: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const devName = (id: string) => devices.find(d => d.id === id)?.asset_id ?? id;
  const empName = (id: string | null) => {
    if (!id) return '—';
    const e = employees.find(x => x.id === id);
    return e ? `${e.first_name} ${e.last_name}` : '—';
  };

  const handleSave = async () => {
    if (!form.device_id) { toast({ title: 'Select a device', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await create.mutateAsync({ device_id: form.device_id, employee_id: form.employee_id || null, notes: form.notes });
      toast({ title: 'Assignment recorded' });
      setShowForm(false);
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleReturn = async (id: string) => {
    try { await returnDev.mutateAsync(id); toast({ title: 'Device returned' }); }
    catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div><h1 className="page-title">Device Assignments</h1><p className="page-subtitle">Who is using which device · {assignments.length} records</p></div>
        <Button className="gap-2" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> New Assignment</Button>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              {['Device','Assigned To','Assigned','Returned','Notes',''].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {assignments.map(a => (
              <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-sm">{devName(a.device_id)}</td>
                <td className="px-4 py-3 text-sm">{empName(a.employee_id)}</td>
                <td className="px-4 py-3 text-sm">{format(new Date(a.assigned_at), 'dd MMM yyyy')}</td>
                <td className="px-4 py-3 text-sm">{a.returned_at ? format(new Date(a.returned_at), 'dd MMM yyyy') : <span className="text-green-600 font-medium">In use</span>}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{a.notes || '—'}</td>
                <td className="px-4 py-3">
                  {!a.returned_at && (
                    <Button variant="outline" size="sm" onClick={() => handleReturn(a.id)}>Return</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {assignments.length === 0 && <div className="text-center py-12 text-muted-foreground">No assignments yet.</div>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Assignment</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            <div>
              <Label className="text-xs">Device</Label>
              <Select value={form.device_id} onValueChange={v => setForm(f => ({ ...f, device_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select device" /></SelectTrigger>
                <SelectContent>{devices.map(d => <SelectItem key={d.id} value={d.id}>{d.asset_id} — {d.device_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Employee (optional)</Label>
              <Select value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Unassigned / shared" /></SelectTrigger>
                <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
