import { useState } from 'react';
import { useItRemoteSessions, useCreateItRemoteSession, useUpdateItRemoteSession, useItDevices, useItEmployees } from '@/it/hooks/useItData';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type SStatus = 'requested'|'authorised'|'active'|'ended'|'failed';
const statusClass = (s:string) => ({ requested:'bg-yellow-100 text-yellow-800',authorised:'bg-blue-100 text-blue-800',active:'bg-green-100 text-green-800',ended:'bg-muted text-muted-foreground',failed:'bg-red-100 text-red-800' }[s]??'');

export default function RemoteSupport() {
  const { data: sessions = [], isLoading } = useItRemoteSessions();
  const { data: devices = [] } = useItDevices();
  const { data: employees = [] } = useItEmployees();
  const create = useCreateItRemoteSession();
  const updateSession = useUpdateItRemoteSession();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ device_id: '', technician_id: '', session_type: 'remote_desktop' as 'remote_desktop'|'terminal'|'file_transfer', notes: '' });
  const [saving, setSaving] = useState(false);

  const devName = (id: string | null) => id ? devices.find(d => d.id === id)?.asset_id ?? '—' : '—';
  const empName = (id: string | null) => id ? employees.find(e => e.id === id)?.full_name ?? '—' : '—';

  const handleSave = async () => {
    if (!form.device_id) { toast({ title: 'Select a device', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await create.mutateAsync({ device_id: form.device_id || null, technician_id: form.technician_id || null, session_type: form.session_type, notes: form.notes });
      toast({ title: 'Session requested' }); setShowForm(false);
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const transition = async (id: string, status: SStatus) => {
    try {
      const payload: Record<string, any> = { status };
      if (status === 'active') payload.started_at = new Date().toISOString();
      if (status === 'ended' || status === 'failed') payload.ended_at = new Date().toISOString();
      await updateSession.mutateAsync({ id, ...payload });
      toast({ title: `Session ${status}` });
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Remote Support</h1>
          <p className="page-subtitle">Authorised remote sessions — all sessions are logged · {sessions.length} total</p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Request Session</Button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-800">
        Remote access must be explicitly authorised, logged and restricted to IT personnel. Connect via MeshCentral or Tailscale — this module records the authorisation audit trail only.
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">{['Device','Technician','Type','Status','Started','Ended',''].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr>
          </thead>
          <tbody>
            {sessions.map(s => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 text-sm">{devName(s.device_id)}</td>
                <td className="px-4 py-3 text-sm">{empName(s.technician_id)}</td>
                <td className="px-4 py-3 text-sm capitalize">{s.session_type.replace('_',' ')}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass(s.status)}`}>{s.status}</span></td>
                <td className="px-4 py-3 text-sm">{s.started_at ? format(new Date(s.started_at),'dd MMM HH:mm') : '—'}</td>
                <td className="px-4 py-3 text-sm">{s.ended_at ? format(new Date(s.ended_at),'dd MMM HH:mm') : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {s.status === 'requested' && <Button size="sm" variant="outline" onClick={() => transition(s.id, 'authorised')}>Authorise</Button>}
                    {s.status === 'authorised' && <Button size="sm" variant="outline" onClick={() => transition(s.id, 'active')}>Start</Button>}
                    {s.status === 'active' && <Button size="sm" variant="outline" onClick={() => transition(s.id, 'ended')}>End</Button>}
                    {['requested','authorised','active'].includes(s.status) && <Button size="sm" variant="destructive" onClick={() => transition(s.id, 'failed')}>Fail</Button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sessions.length === 0 && <div className="text-center py-12 text-muted-foreground">No sessions recorded yet.</div>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Request Remote Session</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            <div><Label className="text-xs">Device</Label><Select value={form.device_id} onValueChange={v=>setForm(f=>({...f,device_id:v}))}><SelectTrigger><SelectValue placeholder="Select device" /></SelectTrigger><SelectContent>{devices.map(d=><SelectItem key={d.id} value={d.id}>{d.asset_id} — {d.device_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Technician</Label><Select value={form.technician_id} onValueChange={v=>setForm(f=>({...f,technician_id:v}))}><SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger><SelectContent>{employees.map(e=><SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Session Type</Label><Select value={form.session_type} onValueChange={v=>setForm(f=>({...f,session_type:v as any}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="remote_desktop">Remote Desktop</SelectItem><SelectItem value="terminal">Terminal</SelectItem><SelectItem value="file_transfer">File Transfer</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs">Notes</Label><Input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
          </div>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving?'Saving…':'Request'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
