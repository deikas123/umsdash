import { useState } from 'react';
import { useItCloudServices, useCreateItCloudService, useUpdateItCloudService, useDeleteItCloudService, DbItCloudService } from '@/it/hooks/useItData';
import { Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

type CSStatus = 'operational'|'degraded'|'outage'|'maintenance';
const statusClass = (s:string) => ({ operational:'bg-green-100 text-green-800',degraded:'bg-yellow-100 text-yellow-800',outage:'bg-red-100 text-red-800',maintenance:'bg-blue-100 text-blue-800' }[s]??'');
type FormState = { name:string; provider:string; category:string; status:CSStatus; url:string; notes:string };
const blank:FormState = { name:'',provider:'',category:'',status:'operational',url:'',notes:'' };

export default function CloudServices() {
  const { data: services = [], isLoading } = useItCloudServices();
  const create = useCreateItCloudService();
  const update = useUpdateItCloudService();
  const del = useDeleteItCloudService();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<DbItCloudService|null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [saving, setSaving] = useState(false);

  const openEdit = (s:DbItCloudService) => { setEditTarget(s); setForm({ name:s.name,provider:s.provider,category:s.category,status:s.status,url:s.url,notes:s.notes??'' }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name) { toast({ title:'Name required', variant:'destructive' }); return; }
    setSaving(true);
    try {
      if (editTarget) { await update.mutateAsync({ id:editTarget.id, ...form, last_checked:new Date().toISOString() }); toast({ title:'Updated' }); }
      else { await create.mutateAsync({ ...form, last_checked:new Date().toISOString() }); toast({ title:'Service added' }); }
      setShowForm(false);
    } catch (e:any) { toast({ title:'Error', description:e.message, variant:'destructive' }); }
    finally { setSaving(false); }
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const groups = [...new Set(services.map(s=>s.category||'Other'))];

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div><h1 className="page-title">Cloud Services</h1><p className="page-subtitle">Status of cloud and SaaS services used by UMS · {services.length} services</p></div>
        <Button className="gap-2" onClick={()=>{ setEditTarget(null); setForm(blank); setShowForm(true); }}><Plus className="h-4 w-4"/>Add Service</Button>
      </div>

      {groups.map(g=>(
        <div key={g} className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{g}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {services.filter(s=>(s.category||'Other')===g).map(s=>(
              <div key={s.id} className="bg-card rounded-lg border p-4 shadow-sm flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{s.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass(s.status)}`}>{s.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.provider}</p>
                  {s.url&&<a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 mt-1 hover:underline"><ExternalLink className="h-3 w-3"/>Open</a>}
                </div>
                <div className="flex gap-1">
                  <button onClick={()=>openEdit(s)} className="text-muted-foreground hover:text-primary p-1"><Edit2 className="h-4 w-4"/></button>
                  <button onClick={async()=>{ await del.mutateAsync(s.id); toast({ title:'Removed' }); }} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-4 w-4"/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {services.length===0&&<p className="text-muted-foreground">No cloud services added yet.</p>}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editTarget?'Edit Service':'Add Service'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-4">
            {([['name','Service Name'],['provider','Provider'],['category','Category'],['url','URL']] as [keyof FormState,string][]).map(([k,l])=>(
              <div key={k}><Label className="text-xs">{l}</Label><Input value={form[k] as string} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/></div>
            ))}
            <div><Label className="text-xs">Status</Label><Select value={form.status} onValueChange={v=>setForm(f=>({...f,status:v as CSStatus}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="operational">Operational</SelectItem><SelectItem value="degraded">Degraded</SelectItem><SelectItem value="outage">Outage</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs">Notes</Label><Input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
          </div>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving?'Saving…':'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
