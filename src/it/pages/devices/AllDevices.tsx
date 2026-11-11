import { useState } from 'react';
import { useItDevices, useCreateItDevice, useUpdateItDevice, useDeleteItDevice, useItEmployees, DbItDevice } from '@/it/hooks/useItData';
import { Plus, Edit2, Trash2, Eye, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

type FormState = {
  asset_id: string; device_name: string; serial_number: string; manufacturer: string; model: string;
  processor: string; ram_gb: number; storage_gb: number; os_version: string; os_edition: string;
  department: string; assignment_type: 'primary' | 'shared' | 'unassigned'; status: 'active' | 'offline' | 'maintenance' | 'retired';
  security_status: 'secure' | 'review' | 'critical'; warranty_expiry: string; notes: string;
};

const blank: FormState = {
  asset_id: '', device_name: '', serial_number: '', manufacturer: '', model: '',
  processor: '', ram_gb: 0, storage_gb: 0, os_version: '', os_edition: '',
  department: '', assignment_type: 'unassigned', status: 'active',
  security_status: 'review', warranty_expiry: '', notes: '',
};

const statusClass = (s: string) => ({ active: 'bg-green-100 text-green-800', offline: 'bg-red-100 text-red-800', maintenance: 'bg-yellow-100 text-yellow-800', retired: 'bg-muted text-muted-foreground' }[s] ?? 'bg-muted text-muted-foreground');
const secClass = (s: string) => ({ secure: 'bg-green-100 text-green-800', review: 'bg-yellow-100 text-yellow-800', critical: 'bg-red-100 text-red-800' }[s] ?? '');

export default function AllDevices() {
  const { data: devices = [], isLoading } = useItDevices();
  const { data: employees = [] } = useItEmployees();
  const create = useCreateItDevice();
  const update = useUpdateItDevice();
  const del = useDeleteItDevice();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<DbItDevice | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [viewTarget, setViewTarget] = useState<DbItDevice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DbItDevice | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = devices.filter(d => {
    const q = search.toLowerCase();
    return (`${d.asset_id} ${d.device_name} ${d.manufacturer} ${d.model} ${d.department}`).toLowerCase().includes(q) &&
      (filterStatus === 'all' || d.status === filterStatus);
  });

  const empName = (id: string | null) => id ? employees.find(e => e.id === id)?.full_name ?? '—' : '—';

  const openCreate = () => { setEditTarget(null); setForm(blank); setShowForm(true); };
  const openEdit = (d: DbItDevice) => {
    setEditTarget(d);
    setForm({ asset_id: d.asset_id, device_name: d.device_name, serial_number: d.serial_number, manufacturer: d.manufacturer, model: d.model, processor: d.processor, ram_gb: d.ram_gb, storage_gb: d.storage_gb, os_version: d.os_version, os_edition: d.os_edition, department: d.department, assignment_type: d.assignment_type, status: d.status, security_status: d.security_status, warranty_expiry: d.warranty_expiry ?? '', notes: d.notes ?? '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.asset_id || !form.device_name) { toast({ title: 'Asset ID and name required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload = { ...form, warranty_expiry: form.warranty_expiry || null };
      if (editTarget) { await update.mutateAsync({ id: editTarget.id, ...payload }); toast({ title: 'Device updated' }); }
      else { await create.mutateAsync(payload); toast({ title: 'Device registered' }); }
      setShowForm(false);
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await del.mutateAsync(deleteTarget.id); toast({ title: 'Device removed', variant: 'destructive' }); }
    catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setDeleteTarget(null);
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div><h1 className="page-title">All Devices</h1><p className="page-subtitle">Every registered company endpoint · {devices.length} devices</p></div>
        <Button className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> Register Device</Button>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search asset ID, name, model…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              {['Asset ID','Device','OS','Department','Assignment','Status','Security',''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-sm">{d.asset_id}</td>
                <td className="px-4 py-3"><p className="text-sm font-medium">{d.device_name}</p><p className="text-xs text-muted-foreground">{d.manufacturer} {d.model}</p></td>
                <td className="px-4 py-3 text-sm">{d.os_version || '—'}</td>
                <td className="px-4 py-3 text-sm">{d.department || '—'}</td>
                <td className="px-4 py-3 text-sm capitalize">{d.assignment_type}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass(d.status)}`}>{d.status}</span></td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${secClass(d.security_status)}`}>{d.security_status}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => setViewTarget(d)} className="text-muted-foreground hover:text-primary p-1"><Eye className="h-4 w-4" /></button>
                    <button onClick={() => openEdit(d)} className="text-muted-foreground hover:text-primary p-1"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => setDeleteTarget(d)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground">No devices found</div>}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!viewTarget} onOpenChange={() => setViewTarget(null)}>
        <DialogContent className="max-w-2xl">
          {viewTarget && (
            <>
              <DialogHeader><DialogTitle>{viewTarget.device_name}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-3 gap-4 mt-4">
                {[
                  ['Asset ID', viewTarget.asset_id], ['Serial', viewTarget.serial_number], ['Manufacturer', viewTarget.manufacturer],
                  ['Model', viewTarget.model], ['Processor', viewTarget.processor], ['RAM', `${viewTarget.ram_gb} GB`],
                  ['Storage', `${viewTarget.storage_gb} GB`], ['OS', viewTarget.os_version], ['Edition', viewTarget.os_edition],
                  ['Department', viewTarget.department], ['Assignment', viewTarget.assignment_type], ['Status', viewTarget.status],
                  ['Security', viewTarget.security_status], ['Warranty', viewTarget.warranty_expiry ?? '—'],
                  ['Assigned To', empName(viewTarget.assigned_employee_id)],
                  ['Last Check-In', viewTarget.last_check_in ? new Date(viewTarget.last_check_in).toLocaleString() : '—'],
                  ['Notes', viewTarget.notes ?? '—'],
                ].map(([l, v]) => (
                  <div key={l}><Label className="text-xs text-muted-foreground">{l}</Label><p className="text-sm font-medium">{v}</p></div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editTarget ? 'Edit Device' : 'Register Device'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {([['asset_id','Asset ID','text'],['device_name','Device Name','text'],['serial_number','Serial Number','text'],['manufacturer','Manufacturer','text'],['model','Model','text'],['processor','Processor','text'],['os_version','OS Version','text'],['os_edition','OS Edition','text'],['department','Department','text'],['warranty_expiry','Warranty Expiry','date'],['notes','Notes','text']] as [keyof FormState,string,string][]).map(([k,l,t]) => (
              <div key={k} className={k === 'notes' ? 'col-span-2' : ''}>
                <Label className="text-xs">{l}</Label>
                <Input type={t} value={form[k] as string} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
            {([['ram_gb','RAM (GB)'],['storage_gb','Storage (GB)']] as [keyof FormState,string][]).map(([k,l]) => (
              <div key={k}><Label className="text-xs">{l}</Label><Input type="number" value={form[k] as number} onChange={e => setForm(f => ({ ...f, [k]: Number(e.target.value) }))} /></div>
            ))}
            <div>
              <Label className="text-xs">Assignment Type</Label>
              <Select value={form.assignment_type} onValueChange={v => setForm(f => ({ ...f, assignment_type: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="primary">Primary</SelectItem><SelectItem value="shared">Shared</SelectItem><SelectItem value="unassigned">Unassigned</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="offline">Offline</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="retired">Retired</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Security Status</Label>
              <Select value={form.security_status} onValueChange={v => setForm(f => ({ ...f, security_status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="secure">Secure</SelectItem><SelectItem value="review">Review</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove Device</AlertDialogTitle><AlertDialogDescription>Remove {deleteTarget?.asset_id}? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
