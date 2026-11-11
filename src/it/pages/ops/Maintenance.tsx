import { useState } from 'react';
import { useItMaintenance, useCreateItMaintenance, useUpdateItMaintenance, useDeleteItMaintenance, useItDevices, useItHardwareInventory, DbItMaintenance } from '@/it/hooks/useItData';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

type MType = 'preventive'|'corrective'|'upgrade'|'inspection';
type MStatus = 'scheduled'|'in_progress'|'completed'|'cancelled';
const statusClass = (s:string) => ({ scheduled:'bg-blue-100 text-blue-800',in_progress:'bg-yellow-100 text-yellow-800',completed:'bg-green-100 text-green-800',cancelled:'bg-muted text-muted-foreground' }[s]??'');

type FormState = { device_id:string; hardware_id:string; type:MType; status:MStatus; scheduled_date:string; performed_by:string; description:string; cost:number };
const blank: FormState = { device_id:'',hardware_id:'',type:'preventive',status:'scheduled',scheduled_date:'',performed_by:'',description:'',cost:0 };

export default function Maintenance() {
  const { data: items = [], isLoading } = useItMaintenance();
  const { data: devices = [] } = useItDevices();
  const { data: hardware = [] } = useItHardwareInventory();
  const create = useCreateItMaintenance();
  const upd = useUpdateItMaintenance();
  const del = useDeleteItMaintenance();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<DbItMaintenance|null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [deleteTarget, setDeleteTarget] = useState<DbItMaintenance|null>(null);
  const [saving, setSaving] = useState(false);

  const devName = (id:string|null) => id ? devices.find(d=>d.id===id)?.asset_id??'—' : '—';
  const hwName  = (id:string|null) => id ? hardware.find(h=>h.id===id)?.name??'—' : '—';

  const openEdit = (m:DbItMaintenance) => { setEditTarget(m); setForm({ device_id:m.device_id??'',hardware_id:m.hardware_id??'',type:m.type,status:m.status,scheduled_date:m.scheduled_date??'',performed_by:m.performed_by,description:m.description,cost:m.cost }); setShowForm(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, device_id:form.device_id||null, hardware_id:form.hardware_id||null, scheduled_date:form.scheduled_date||null };
      if (editTarget) { await upd.mutateAsync({ id:editTarget.id, ...payload }); toast({ title:'Updated' }); }
      else { await create.mutateAsync(payload); toast({ title:'Scheduled' }); }
      setShowForm(false);
    } catch (e:any) { toast({ title:'Error', description:e.message, variant:'destructive' }); }
    finally { setSaving(false); }
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div><h1 className="page-title">Maintenance</h1><p className="page-subtitle">Scheduled and completed maintenance records · {items.length} records</p></div>
        <Button className="gap-2" onClick={()=>{ setEditTarget(null); setForm(blank); setShowForm(true); }}><Plus className="h-4 w-4"/>Schedule Maintenance</Button>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b bg-muted/50">{['Asset','Type','Status','Date','Performed By','Description','Cost (KES)',''].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
          <tbody>
            {items.map(m=>(
              <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 text-sm">{m.device_id ? devName(m.device_id) : hwName(m.hardware_id)}</td>
                <td className="px-4 py-3 text-sm capitalize">{m.type}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass(m.status)}`}>{m.status.replace('_',' ')}</span></td>
                <td className="px-4 py-3 text-sm">{m.scheduled_date ?? '—'}</td>
                <td className="px-4 py-3 text-sm">{m.performed_by || '—'}</td>
                <td className="px-4 py-3 text-sm max-w-[200px] truncate">{m.description || '—'}</td>
                <td className="px-4 py-3 text-sm">{m.cost > 0 ? `KES ${m.cost.toLocaleString()}` : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <button onClick={()=>openEdit(m)} className="text-muted-foreground hover:text-primary p-1"><Edit2 className="h-4 w-4"/></button>
                    <button onClick={()=>setDeleteTarget(m)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-4 w-4"/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length===0&&<div className="text-center py-12 text-muted-foreground">No maintenance records.</div>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editTarget?'Edit':'Schedule'} Maintenance</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div><Label className="text-xs">Device (optional)</Label><Select value={form.device_id} onValueChange={v=>setForm(f=>({...f,device_id:v}))}><SelectTrigger><SelectValue placeholder="None"/></SelectTrigger><SelectContent>{devices.map(d=><SelectItem key={d.id} value={d.id}>{d.asset_id}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Hardware Asset (optional)</Label><Select value={form.hardware_id} onValueChange={v=>setForm(f=>({...f,hardware_id:v}))}><SelectTrigger><SelectValue placeholder="None"/></SelectTrigger><SelectContent>{hardware.map(h=><SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Type</Label><Select value={form.type} onValueChange={v=>setForm(f=>({...f,type:v as MType}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="preventive">Preventive</SelectItem><SelectItem value="corrective">Corrective</SelectItem><SelectItem value="upgrade">Upgrade</SelectItem><SelectItem value="inspection">Inspection</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs">Status</Label><Select value={form.status} onValueChange={v=>setForm(f=>({...f,status:v as MStatus}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs">Scheduled Date</Label><Input type="date" value={form.scheduled_date} onChange={e=>setForm(f=>({...f,scheduled_date:e.target.value}))}/></div>
            <div><Label className="text-xs">Performed By</Label><Input value={form.performed_by} onChange={e=>setForm(f=>({...f,performed_by:e.target.value}))}/></div>
            <div className="col-span-2"><Label className="text-xs">Description</Label><Input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>
            <div><Label className="text-xs">Cost (KES)</Label><Input type="number" value={form.cost} onChange={e=>setForm(f=>({...f,cost:Number(e.target.value)}))}/></div>
          </div>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving?'Saving…':'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={()=>setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Record</AlertDialogTitle><AlertDialogDescription>Remove this maintenance record?</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={async()=>{if(!deleteTarget)return;await del.mutateAsync(deleteTarget.id);setDeleteTarget(null);}} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
