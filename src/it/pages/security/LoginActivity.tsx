import { useState } from 'react';
import { useItLoginActivity, useCreateItLoginActivity, useItDevices } from '@/it/hooks/useItData';
import { useEmployees } from '@/hr/hooks/useSupabaseData';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function LoginActivity() {
  const { data: logs = [], isLoading } = useItLoginActivity();
  const { data: employees = [] } = useEmployees();
  const { data: devices = [] } = useItDevices();
  const create = useCreateItLoginActivity();

  const [search, setSearch] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employee_id: '', device_id: '', ip_address: '', outcome: 'success' as 'success'|'failed', mfa_used: false, location: '' });
  const [saving, setSaving] = useState(false);

  const empName = (id: string|null) => {
    if (!id) return '—';
    const e = employees.find(x => x.id === id);
    return e ? `${e.first_name} ${e.last_name}` : '—';
  };
  const devName = (id: string|null) => id ? devices.find(d => d.id === id)?.asset_id ?? '—' : '—';

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    return (empName(l.employee_id) + devName(l.device_id) + l.ip_address + l.location).toLowerCase().includes(q) &&
      (filterOutcome === 'all' || l.outcome === filterOutcome);
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await create.mutateAsync({
        employee_id: form.employee_id || null,
        device_id: form.device_id || null,
        ip_address: form.ip_address,
        outcome: form.outcome,
        mfa_used: form.mfa_used,
        location: form.location,
      });
      toast({ title: 'Login event recorded' });
      setShowForm(false);
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
          <h1 className="page-title">Login Activity</h1>
          <p className="page-subtitle">Monitor account access and suspicious patterns · {logs.length} events</p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" />Log Event</Button>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterOutcome} onValueChange={setFilterOutcome}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              {['Employee', 'Device', 'IP', 'Location', 'MFA', 'Outcome', 'Time'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 text-sm">{empName(l.employee_id)}</td>
                <td className="px-4 py-3 text-sm font-mono">{devName(l.device_id)}</td>
                <td className="px-4 py-3 text-sm font-mono">{l.ip_address || '—'}</td>
                <td className="px-4 py-3 text-sm">{l.location || '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant={l.mfa_used ? 'default' : 'secondary'} className="text-xs">{l.mfa_used ? 'Yes' : 'No'}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={l.outcome === 'success' ? 'default' : 'destructive'} className="text-xs">{l.outcome}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {format(new Date(l.login_at), 'dd MMM yyyy HH:mm')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">No login events.</div>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Log Login Event</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            <div>
              <Label className="text-xs">Employee</Label>
              <Select value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Device</Label>
              <Select value={form.device_id} onValueChange={v => setForm(f => ({ ...f, device_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select device" /></SelectTrigger>
                <SelectContent>
                  {devices.map(d => <SelectItem key={d.id} value={d.id}>{d.asset_id}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">IP Address</Label><Input value={form.ip_address} onChange={e => setForm(f => ({ ...f, ip_address: e.target.value }))} /></div>
            <div><Label className="text-xs">Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
            <div>
              <Label className="text-xs">Outcome</Label>
              <Select value={form.outcome} onValueChange={v => setForm(f => ({ ...f, outcome: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">MFA Used</Label>
              <Select value={form.mfa_used ? 'yes' : 'no'} onValueChange={v => setForm(f => ({ ...f, mfa_used: v === 'yes' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
