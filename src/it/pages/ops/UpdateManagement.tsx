import { useState } from 'react';
import { useItUpdates, useCreateItUpdate, useUpdateItUpdate, useItDevices } from '@/it/hooks/useItData';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

type UpdStatus = 'pending'|'scheduled'|'installed'|'failed';
const statusVariant = (s:string) => ({ pending:'secondary',scheduled:'default',installed:'default',failed:'destructive' }as Record<string,any>)[s]??'outline';
const statusClass = (s:string) => ({ pending:'bg-yellow-100 text-yellow-800',scheduled:'bg-blue-100 text-blue-800',installed:'bg-green-100 text-green-800',failed:'bg-red-100 text-red-800' }[s]??'');

export default function UpdateManagement() {
  const { data: updates = [], isLoading } = useItUpdates();
  const { data: devices = [] } = useItDevices();
  const create = useCreateItUpdate();
  const update = useUpdateItUpdate();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ device_id:'',update_name:'',type:'os' as 'os'|'application'|'driver'|'firmware',status:'pending' as UpdStatus,released_at:'' });
  const [saving, setSaving] = useState(false);

  const devName = (id:string) => devices.find(d=>d.id===id)?.asset_id??'—';

  const pending = updates.filter(u=>u.status==='pending').length;
  const scheduled = updates.filter(u=>u.status==='scheduled').length;
  const failed = updates.filter(u=>u.status==='failed').length;

  const markInstalled = async (id:string) => {
    try { await update.mutateAsync({ id, status:'installed', installed_at: new Date().toISOString() }); toast({ title:'Marked installed' }); }
    catch (e:any) { toast({ title:'Error', description:e.message, variant:'destructive' }); }
  };

  const handleSave = async () => {
    if (!form.device_id||!form.update_name) { toast({ title:'Device and name required', variant:'destructive' }); return; }
    setSaving(true);
    try { await create.mutateAsync({ ...form, released_at:form.released_at||null }); toast({ title:'Update tracked' }); setShowForm(false); }
    catch (e:any) { toast({ title:'Error', description:e.message, variant:'destructive' }); }
    finally { setSaving(false); }
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div><h1 className="page-title">Update Management</h1><p className="page-subtitle">Windows and application update tracking across all devices</p></div>
        <Button className="gap-2" onClick={()=>setShowForm(true)}><Plus className="h-4 w-4"/>Track Update</Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[['Pending',pending,'text-yellow-600'],['Scheduled',scheduled,'text-blue-600'],['Failed',failed,'text-red-600']].map(([l,v,c])=>(
          <div key={l as string} className="bg-card rounded-lg border p-5 shadow-sm">
            <p className={`text-2xl font-bold ${c}`}>{v}</p>
            <p className="text-sm text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b bg-muted/50">{['Device','Update','Type','Status','Released',''].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
          <tbody>
            {updates.map(u=>(
              <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-sm">{devName(u.device_id)}</td>
                <td className="px-4 py-3 text-sm font-medium">{u.update_name}</td>
                <td className="px-4 py-3 text-sm capitalize">{u.type}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass(u.status)}`}>{u.status}</span></td>
                <td className="px-4 py-3 text-sm">{u.released_at ? new Date(u.released_at).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3">{u.status!=='installed'&&<Button size="sm" variant="outline" onClick={()=>markInstalled(u.id)}>Mark Installed</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {updates.length===0&&<div className="text-center py-12 text-muted-foreground">No update records.</div>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Track Update</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            <div><Label className="text-xs">Device</Label><Select value={form.device_id} onValueChange={v=>setForm(f=>({...f,device_id:v}))}><SelectTrigger><SelectValue placeholder="Select device"/></SelectTrigger><SelectContent>{devices.map(d=><SelectItem key={d.id} value={d.id}>{d.asset_id} — {d.device_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Update Name</Label><Input value={form.update_name} onChange={e=>setForm(f=>({...f,update_name:e.target.value}))}/></div>
            <div><Label className="text-xs">Type</Label><Select value={form.type} onValueChange={v=>setForm(f=>({...f,type:v as any}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="os">OS</SelectItem><SelectItem value="application">Application</SelectItem><SelectItem value="driver">Driver</SelectItem><SelectItem value="firmware">Firmware</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs">Status</Label><Select value={form.status} onValueChange={v=>setForm(f=>({...f,status:v as UpdStatus}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="installed">Installed</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs">Released Date</Label><Input type="date" value={form.released_at} onChange={e=>setForm(f=>({...f,released_at:e.target.value}))}/></div>
          </div>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving?'Saving…':'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
