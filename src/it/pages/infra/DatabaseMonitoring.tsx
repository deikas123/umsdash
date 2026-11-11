import { useState } from 'react';
import { useItDatabaseMonitors, useCreateItDatabaseMonitor, useUpdateItDatabaseMonitor, useDeleteItDatabaseMonitor, DbItDatabaseMonitor } from '@/it/hooks/useItData';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

type DbStatus = 'up'|'down'|'degraded';
const statusClass = (s:string) => ({ up:'bg-green-100 text-green-800',down:'bg-red-100 text-red-800',degraded:'bg-yellow-100 text-yellow-800' }[s]??'');
type FormState = { name:string; engine:string; host:string; status:DbStatus; size_mb:number; connections:number; slow_queries:number; notes:string };
const blank:FormState = { name:'',engine:'postgresql',host:'',status:'up',size_mb:0,connections:0,slow_queries:0,notes:'' };

export default function DatabaseMonitoring() {
  const { data: dbs = [], isLoading } = useItDatabaseMonitors();
  const create = useCreateItDatabaseMonitor();
  const update = useUpdateItDatabaseMonitor();
  const del = useDeleteItDatabaseMonitor();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<DbItDatabaseMonitor|null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [saving, setSaving] = useState(false);

  const openEdit = (d:DbItDatabaseMonitor) => { setEditTarget(d); setForm({ name:d.name,engine:d.engine,host:d.host,status:d.status,size_mb:d.size_mb,connections:d.connections,slow_queries:d.slow_queries,notes:d.notes??'' }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name) { toast({ title:'Name required', variant:'destructive' }); return; }
    setSaving(true);
    try {
      if (editTarget) { await update.mutateAsync({ id:editTarget.id, ...form, last_checked:new Date().toISOString() }); toast({ title:'Updated' }); }
      else { await create.mutateAsync({ ...form, last_checked:new Date().toISOString() }); toast({ title:'Database added' }); }
      setShowForm(false);
    } catch (e:any) { toast({ title:'Error', description:e.message, variant:'destructive' }); }
    finally { setSaving(false); }
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div><h1 className="page-title">Database Monitoring</h1><p className="page-subtitle">Status and metrics for all databases · {dbs.length} databases</p></div>
        <Button className="gap-2" onClick={()=>{ setEditTarget(null); setForm(blank); setShowForm(true); }}><Plus className="h-4 w-4"/>Add Database</Button>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b bg-muted/50">{['Name','Engine','Host','Status','Size','Connections','Slow Queries','Last Checked',''].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
          <tbody>
            {dbs.map(d=>(
              <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 text-sm font-medium">{d.name}</td>
                <td className="px-4 py-3 text-sm capitalize">{d.engine}</td>
                <td className="px-4 py-3 text-sm font-mono">{d.host||'—'}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass(d.status)}`}>{d.status}</span></td>
                <td className="px-4 py-3 text-sm">{d.size_mb > 0 ? `${(d.size_mb/1024).toFixed(1)} GB` : '—'}</td>
                <td className="px-4 py-3 text-sm">{d.connections}</td>
                <td className="px-4 py-3 text-sm">{d.slow_queries}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(d.last_checked).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1"><button onClick={()=>openEdit(d)} className="text-muted-foreground hover:text-primary p-1"><Edit2 className="h-4 w-4"/></button><button onClick={async()=>{ await del.mutateAsync(d.id); toast({ title:'Removed' }); }} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-4 w-4"/></button></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {dbs.length===0&&<div className="text-center py-12 text-muted-foreground">No databases added yet.</div>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editTarget?'Edit Database':'Add Database'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
            <div><Label className="text-xs">Engine</Label><Input value={form.engine} onChange={e=>setForm(f=>({...f,engine:e.target.value}))}/></div>
            <div><Label className="text-xs">Host</Label><Input value={form.host} onChange={e=>setForm(f=>({...f,host:e.target.value}))}/></div>
            <div><Label className="text-xs">Status</Label><Select value={form.status} onValueChange={v=>setForm(f=>({...f,status:v as DbStatus}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="up">Up</SelectItem><SelectItem value="down">Down</SelectItem><SelectItem value="degraded">Degraded</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs">Size (MB)</Label><Input type="number" value={form.size_mb} onChange={e=>setForm(f=>({...f,size_mb:Number(e.target.value)}))}/></div>
            <div><Label className="text-xs">Connections</Label><Input type="number" value={form.connections} onChange={e=>setForm(f=>({...f,connections:Number(e.target.value)}))}/></div>
            <div><Label className="text-xs">Slow Queries</Label><Input type="number" value={form.slow_queries} onChange={e=>setForm(f=>({...f,slow_queries:Number(e.target.value)}))}/></div>
            <div className="col-span-2"><Label className="text-xs">Notes</Label><Input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
          </div>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving?'Saving…':'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
