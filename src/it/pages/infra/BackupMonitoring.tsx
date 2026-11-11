import { useState } from 'react';
import { useItBackupMonitors, useCreateItBackupMonitor, useUpdateItBackupMonitor, useDeleteItBackupMonitor, DbItBackupMonitor } from '@/it/hooks/useItData';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Loader, SkipForward } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type BkStatus = 'success'|'failed'|'running'|'skipped'|'partial';
const statusIcon = (s:string) => ({ success:<CheckCircle className="h-4 w-4 text-success"/>,failed:<XCircle className="h-4 w-4 text-destructive"/>,running:<Loader className="h-4 w-4 text-blue-500 animate-spin"/>,skipped:<SkipForward className="h-4 w-4 text-muted-foreground"/>,partial:<CheckCircle className="h-4 w-4 text-yellow-500"/> }[s]??null);
const statusClass = (s:string) => ({ success:'bg-green-100 text-green-800',failed:'bg-red-100 text-red-800',running:'bg-blue-100 text-blue-800',skipped:'bg-muted text-muted-foreground',partial:'bg-yellow-100 text-yellow-800' }[s]??'');

type FormState = { target_name:string; type:string; status:BkStatus; size_mb:number; completed_at:string; next_scheduled:string; retention_days:number; notes:string };
const blank:FormState = { target_name:'',type:'full',status:'success',size_mb:0,completed_at:'',next_scheduled:'',retention_days:30,notes:'' };

export default function BackupMonitoring() {
  const { data: backups = [], isLoading } = useItBackupMonitors();
  const create = useCreateItBackupMonitor();
  const update = useUpdateItBackupMonitor();
  const del = useDeleteItBackupMonitor();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<DbItBackupMonitor|null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [saving, setSaving] = useState(false);

  const success = backups.filter(b=>b.status==='success').length;
  const failed  = backups.filter(b=>b.status==='failed').length;

  const openEdit = (b:DbItBackupMonitor) => {
    setEditTarget(b);
    setForm({ target_name:b.target_name,type:b.type,status:b.status,size_mb:b.size_mb,completed_at:b.completed_at?b.completed_at.slice(0,16):'',next_scheduled:b.next_scheduled?b.next_scheduled.slice(0,16):'',retention_days:b.retention_days,notes:b.notes??'' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.target_name) { toast({ title:'Target name required', variant:'destructive' }); return; }
    setSaving(true);
    try {
      const payload = { ...form, completed_at:form.completed_at?new Date(form.completed_at).toISOString():null, next_scheduled:form.next_scheduled?new Date(form.next_scheduled).toISOString():null };
      if (editTarget) { await update.mutateAsync({ id:editTarget.id, ...payload }); toast({ title:'Updated' }); }
      else { await create.mutateAsync(payload); toast({ title:'Backup job added' }); }
      setShowForm(false);
    } catch (e:any) { toast({ title:'Error', description:e.message, variant:'destructive' }); }
    finally { setSaving(false); }
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div><h1 className="page-title">Backup Monitoring</h1><p className="page-subtitle">Backup job status and history · {backups.length} jobs</p></div>
        <Button className="gap-2" onClick={()=>{ setEditTarget(null); setForm(blank); setShowForm(true); }}><Plus className="h-4 w-4"/>Add Job</Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[['Successful',success,'text-green-600'],['Failed',failed,'text-red-600'],['Total',backups.length,'']].map(([l,v,c])=>(
          <div key={l as string} className="bg-card rounded-lg border p-5 shadow-sm"><p className={`text-2xl font-bold ${c}`}>{v}</p><p className="text-sm text-muted-foreground">{l}</p></div>
        ))}
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b bg-muted/50">{['Target','Type','Status','Size','Completed','Next Run','Retention',''].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
          <tbody>
            {backups.map(b=>(
              <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 text-sm font-medium">{b.target_name}</td>
                <td className="px-4 py-3 text-sm capitalize">{b.type}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {statusIcon(b.status)}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass(b.status)}`}>{b.status}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">{b.size_mb>0?`${(b.size_mb/1024).toFixed(2)} GB`:'—'}</td>
                <td className="px-4 py-3 text-sm">{b.completed_at?format(new Date(b.completed_at),'dd MMM HH:mm'):'—'}</td>
                <td className="px-4 py-3 text-sm">{b.next_scheduled?format(new Date(b.next_scheduled),'dd MMM HH:mm'):'—'}</td>
                <td className="px-4 py-3 text-sm">{b.retention_days} days</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1"><button onClick={()=>openEdit(b)} className="text-muted-foreground hover:text-primary p-1"><Edit2 className="h-4 w-4"/></button><button onClick={async()=>{ await del.mutateAsync(b.id); toast({ title:'Removed' }); }} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-4 w-4"/></button></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {backups.length===0&&<div className="text-center py-12 text-muted-foreground">No backup jobs added yet.</div>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editTarget?'Edit Backup Job':'Add Backup Job'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div><Label className="text-xs">Target Name</Label><Input value={form.target_name} onChange={e=>setForm(f=>({...f,target_name:e.target.value}))}/></div>
            <div><Label className="text-xs">Type</Label><Select value={form.type} onValueChange={v=>setForm(f=>({...f,type:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="full">Full</SelectItem><SelectItem value="incremental">Incremental</SelectItem><SelectItem value="differential">Differential</SelectItem><SelectItem value="snapshot">Snapshot</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs">Status</Label><Select value={form.status} onValueChange={v=>setForm(f=>({...f,status:v as BkStatus}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="success">Success</SelectItem><SelectItem value="failed">Failed</SelectItem><SelectItem value="running">Running</SelectItem><SelectItem value="skipped">Skipped</SelectItem><SelectItem value="partial">Partial</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs">Size (MB)</Label><Input type="number" value={form.size_mb} onChange={e=>setForm(f=>({...f,size_mb:Number(e.target.value)}))}/></div>
            <div><Label className="text-xs">Completed At</Label><Input type="datetime-local" value={form.completed_at} onChange={e=>setForm(f=>({...f,completed_at:e.target.value}))}/></div>
            <div><Label className="text-xs">Next Scheduled</Label><Input type="datetime-local" value={form.next_scheduled} onChange={e=>setForm(f=>({...f,next_scheduled:e.target.value}))}/></div>
            <div><Label className="text-xs">Retention (days)</Label><Input type="number" value={form.retention_days} onChange={e=>setForm(f=>({...f,retention_days:Number(e.target.value)}))}/></div>
            <div className="col-span-2"><Label className="text-xs">Notes</Label><Input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
          </div>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving?'Saving…':'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
