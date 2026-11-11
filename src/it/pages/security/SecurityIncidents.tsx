import { useState } from 'react';
import { useItSecurityIncidents, useCreateItSecurityIncident, useUpdateItSecurityIncident, useDeleteItSecurityIncident, useItDevices, DbItSecurityIncident } from '@/it/hooks/useItData';
import { useEmployees } from '@/hr/hooks/useSupabaseData';
import { Plus, Edit2, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

type Sev = 'low'|'medium'|'high'|'critical';
type St = 'open'|'investigating'|'contained'|'resolved'|'closed';
const sevClass=(s:string)=>({low:'bg-blue-100 text-blue-800',medium:'bg-yellow-100 text-yellow-800',high:'bg-orange-100 text-orange-800',critical:'bg-red-100 text-red-800'}[s]??'');
const stClass=(s:string)=>({open:'bg-yellow-100 text-yellow-800',investigating:'bg-blue-100 text-blue-800',contained:'bg-purple-100 text-purple-800',resolved:'bg-green-100 text-green-800',closed:'bg-muted text-muted-foreground'}[s]??'');

type FormState = { title:string; description:string; severity:Sev; status:St; affected_device_id:string; affected_employee_id:string; resolution_notes:string };
const blank:FormState = { title:'',description:'',severity:'medium',status:'open',affected_device_id:'',affected_employee_id:'',resolution_notes:'' };

export default function SecurityIncidents() {
  const { data: incidents = [], isLoading } = useItSecurityIncidents();
  const { data: devices = [] } = useItDevices();
  const { data: employees = [] } = useItEmployees();
  const create = useCreateItSecurityIncident();
  const update = useUpdateItSecurityIncident();
  const del = useDeleteItSecurityIncident();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<DbItSecurityIncident|null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [viewTarget, setViewTarget] = useState<DbItSecurityIncident|null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DbItSecurityIncident|null>(null);
  const [saving, setSaving] = useState(false);

  const devName = (id:string|null) => id ? devices.find(d=>d.id===id)?.asset_id??'—' : '—';
  const empName = (id:string|null) => { if (!id) return '—'; const e = employees.find(x=>x.id===id); return e ? `${e.first_name} ${e.last_name}` : '—'; };

  const openEdit = (i:DbItSecurityIncident) => { setEditTarget(i); setForm({ title:i.title,description:i.description,severity:i.severity,status:i.status,affected_device_id:i.affected_device_id??'',affected_employee_id:i.affected_employee_id??'',resolution_notes:i.resolution_notes??'' }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.title) { toast({ title:'Title required', variant:'destructive' }); return; }
    setSaving(true);
    try {
      const payload = { ...form, affected_device_id:form.affected_device_id||null, affected_employee_id:form.affected_employee_id||null };
      if (editTarget) { await update.mutateAsync({ id:editTarget.id, ...payload }); toast({ title:'Incident updated' }); }
      else { await create.mutateAsync(payload); toast({ title:'Incident reported' }); }
      setShowForm(false);
    } catch (e:any) { toast({ title:'Error', description:e.message, variant:'destructive' }); }
    finally { setSaving(false); }
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div><h1 className="page-title">Security Incidents</h1><p className="page-subtitle">Record and investigate security events · {incidents.length} total</p></div>
        <Button className="gap-2" onClick={()=>{ setEditTarget(null); setForm(blank); setShowForm(true); }}><Plus className="h-4 w-4"/>Report Incident</Button>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b bg-muted/50">{['Title','Severity','Status','Affected Device','Affected Employee','Reported',''].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
          <tbody>
            {incidents.map(i=>(
              <tr key={i.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 text-sm font-medium max-w-[220px] truncate">{i.title}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sevClass(i.severity)}`}>{i.severity}</span></td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stClass(i.status)}`}>{i.status}</span></td>
                <td className="px-4 py-3 text-sm">{devName(i.affected_device_id)}</td>
                <td className="px-4 py-3 text-sm">{empName(i.affected_employee_id)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDistanceToNow(new Date(i.created_at),{addSuffix:true})}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <button onClick={()=>setViewTarget(i)} className="text-muted-foreground hover:text-primary p-1"><Eye className="h-4 w-4"/></button>
                    <button onClick={()=>openEdit(i)} className="text-muted-foreground hover:text-primary p-1"><Edit2 className="h-4 w-4"/></button>
                    <button onClick={()=>setDeleteTarget(i)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-4 w-4"/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {incidents.length===0&&<div className="text-center py-12 text-muted-foreground">No incidents recorded.</div>}
      </div>

      {/* Detail */}
      <Dialog open={!!viewTarget} onOpenChange={()=>setViewTarget(null)}>
        <DialogContent className="max-w-lg">
          {viewTarget&&(<>
            <DialogHeader><DialogTitle>{viewTarget.title}</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-4">
              <div className="flex gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sevClass(viewTarget.severity)}`}>{viewTarget.severity}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stClass(viewTarget.status)}`}>{viewTarget.status}</span>
              </div>
              {viewTarget.description&&<p className="text-sm">{viewTarget.description}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Affected Device</Label><p className="text-sm">{devName(viewTarget.affected_device_id)}</p></div>
                <div><Label className="text-xs text-muted-foreground">Affected Employee</Label><p className="text-sm">{empName(viewTarget.affected_employee_id)}</p></div>
                <div><Label className="text-xs text-muted-foreground">Reported</Label><p className="text-sm">{new Date(viewTarget.created_at).toLocaleString()}</p></div>
                <div><Label className="text-xs text-muted-foreground">Resolved</Label><p className="text-sm">{viewTarget.resolved_at ? new Date(viewTarget.resolved_at).toLocaleString() : '—'}</p></div>
              </div>
              {viewTarget.resolution_notes&&<div><Label className="text-xs text-muted-foreground">Resolution Notes</Label><p className="text-sm">{viewTarget.resolution_notes}</p></div>}
            </div>
          </>)}
        </DialogContent>
      </Dialog>

      {/* Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editTarget?'Edit Incident':'Report Incident'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="col-span-2"><Label className="text-xs">Title</Label><Input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></div>
            <div className="col-span-2"><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={3}/></div>
            <div><Label className="text-xs">Severity</Label><Select value={form.severity} onValueChange={v=>setForm(f=>({...f,severity:v as Sev}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs">Status</Label><Select value={form.status} onValueChange={v=>setForm(f=>({...f,status:v as St}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="investigating">Investigating</SelectItem><SelectItem value="contained">Contained</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs">Affected Device</Label><Select value={form.affected_device_id} onValueChange={v=>setForm(f=>({...f,affected_device_id:v}))}><SelectTrigger><SelectValue placeholder="None"/></SelectTrigger><SelectContent>{devices.map(d=><SelectItem key={d.id} value={d.id}>{d.asset_id}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Affected Employee</Label><Select value={form.affected_employee_id} onValueChange={v=>setForm(f=>({...f,affected_employee_id:v}))}><SelectTrigger><SelectValue placeholder="None"/></SelectTrigger><SelectContent>{employees.map(e=><SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-2"><Label className="text-xs">Resolution Notes</Label><Textarea value={form.resolution_notes} onChange={e=>setForm(f=>({...f,resolution_notes:e.target.value}))} rows={2}/></div>
          </div>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving?'Saving…':'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={()=>setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Incident</AlertDialogTitle><AlertDialogDescription>Permanently delete this incident?</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={async()=>{if(!deleteTarget)return;await del.mutateAsync(deleteTarget.id);setDeleteTarget(null);}} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
