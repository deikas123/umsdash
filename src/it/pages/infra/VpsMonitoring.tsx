import { useState } from 'react';
import { useItVpsMonitors, useCreateItVps, useUpdateItVps, useDeleteItVps, DbItVps } from '@/it/hooks/useItData';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';

type VStatus = 'up'|'down'|'degraded';
const statusClass = (s:string) => ({ up:'bg-green-100 text-green-800',down:'bg-red-100 text-red-800',degraded:'bg-yellow-100 text-yellow-800' }[s]??'');
type FormState = { name:string; host:string; ip_address:string; provider:string; status:VStatus; uptime_pct:number; cpu_pct:number; ram_pct:number; disk_pct:number; notes:string };
const blank:FormState = { name:'',host:'',ip_address:'',provider:'',status:'up',uptime_pct:100,cpu_pct:0,ram_pct:0,disk_pct:0,notes:'' };

export default function VpsMonitoring() {
  const { data: servers = [], isLoading } = useItVpsMonitors();
  const create = useCreateItVps();
  const update = useUpdateItVps();
  const del = useDeleteItVps();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<DbItVps|null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [saving, setSaving] = useState(false);

  const openEdit = (s:DbItVps) => { setEditTarget(s); setForm({ name:s.name,host:s.host,ip_address:s.ip_address,provider:s.provider,status:s.status,uptime_pct:s.uptime_pct,cpu_pct:s.cpu_pct,ram_pct:s.ram_pct,disk_pct:s.disk_pct,notes:s.notes??'' }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name) { toast({ title:'Name required', variant:'destructive' }); return; }
    setSaving(true);
    try {
      if (editTarget) { await update.mutateAsync({ id:editTarget.id, ...form, last_checked:new Date().toISOString() }); toast({ title:'Updated' }); }
      else { await create.mutateAsync({ ...form, last_checked:new Date().toISOString() }); toast({ title:'Server added' }); }
      setShowForm(false);
    } catch (e:any) { toast({ title:'Error', description:e.message, variant:'destructive' }); }
    finally { setSaving(false); }
  };

  const refresh = async (s:DbItVps) => {
    try { await update.mutateAsync({ id:s.id, last_checked:new Date().toISOString() }); toast({ title:'Last checked updated' }); }
    catch (e:any) { toast({ title:'Error', description:e.message, variant:'destructive' }); }
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div><h1 className="page-title">VPS Monitoring</h1><p className="page-subtitle">Server health metrics and status · {servers.length} servers</p></div>
        <Button className="gap-2" onClick={()=>{ setEditTarget(null); setForm(blank); setShowForm(true); }}><Plus className="h-4 w-4"/>Add Server</Button>
      </div>

      <p className="text-xs text-muted-foreground mb-6 italic">Connect a monitoring agent (e.g. Uptime Kuma, Zabbix) to push live metrics. Figures here are manually recorded.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {servers.map(s=>(
          <div key={s.id} className="bg-card rounded-lg border p-5 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{s.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass(s.status)}`}>{s.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{s.host} · {s.ip_address} · {s.provider}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={()=>refresh(s)} className="text-muted-foreground hover:text-primary p-1"><RefreshCw className="h-4 w-4"/></button>
                <button onClick={()=>openEdit(s)} className="text-muted-foreground hover:text-primary p-1"><Edit2 className="h-4 w-4"/></button>
                <button onClick={async()=>{ await del.mutateAsync(s.id); toast({ title:'Removed' }); }} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-4 w-4"/></button>
              </div>
            </div>
            <div className="space-y-2">
              {[['Uptime',s.uptime_pct],['CPU',s.cpu_pct],['RAM',s.ram_pct],['Disk',s.disk_pct]].map(([l,v])=>(
                <div key={l as string}>
                  <div className="flex justify-between text-xs mb-0.5"><span className="text-muted-foreground">{l}</span><span className="font-medium">{v}%</span></div>
                  <Progress value={Number(v)} className="h-1.5" />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Last checked: {new Date(s.last_checked).toLocaleString()}</p>
          </div>
        ))}
        {servers.length===0&&<p className="text-muted-foreground col-span-2">No servers added yet.</p>}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editTarget?'Edit Server':'Add Server'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {([['name','Name','text'],['host','Host/FQDN','text'],['ip_address','IP Address','text'],['provider','Provider','text'],['notes','Notes','text']] as [keyof FormState,string,string][]).map(([k,l,t])=>(
              <div key={k} className={k==='notes'?'col-span-2':''}><Label className="text-xs">{l}</Label><Input type={t} value={form[k] as string} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/></div>
            ))}
            <div><Label className="text-xs">Status</Label><Select value={form.status} onValueChange={v=>setForm(f=>({...f,status:v as VStatus}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="up">Up</SelectItem><SelectItem value="down">Down</SelectItem><SelectItem value="degraded">Degraded</SelectItem></SelectContent></Select></div>
            {([['uptime_pct','Uptime %'],['cpu_pct','CPU %'],['ram_pct','RAM %'],['disk_pct','Disk %']] as [keyof FormState,string][]).map(([k,l])=>(
              <div key={k}><Label className="text-xs">{l}</Label><Input type="number" min={0} max={100} value={form[k] as number} onChange={e=>setForm(f=>({...f,[k]:Number(e.target.value)}))}/></div>
            ))}
          </div>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving?'Saving…':'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
