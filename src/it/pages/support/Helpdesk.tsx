import { useState } from 'react';
import { useItTickets, useCreateItTicket, useUpdateItTicket, useItDevices, useItTicketComments, useCreateItTicketComment, DbItTicket } from '@/it/hooks/useItData';
import { useEmployees } from '@/hr/hooks/useSupabaseData';
import { Plus, Eye, Edit2, Search, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { SlaCountdown } from '@/it/components/SlaCountdown';

type Cat = 'hardware'|'software'|'network'|'access'|'email'|'printer'|'phone'|'other';
type Pri = 'low'|'medium'|'high'|'urgent';
type St  = 'open'|'assigned'|'investigating'|'resolved'|'escalated'|'closed';

const priClass = (p:string) => ({ low:'bg-muted text-muted-foreground',medium:'bg-blue-100 text-blue-800',high:'bg-orange-100 text-orange-800',urgent:'bg-red-100 text-red-800' }[p]??'');
const stClass  = (s:string) => ({ open:'bg-yellow-100 text-yellow-800',assigned:'bg-blue-100 text-blue-800',investigating:'bg-purple-100 text-purple-800',resolved:'bg-green-100 text-green-800',escalated:'bg-red-100 text-red-800',closed:'bg-muted text-muted-foreground' }[s]??'');

type FormState = { title:string; description:string; department:string; category:Cat; priority:Pri; reporting_employee_id:string; affected_device_id:string };
const blank:FormState = { title:'',description:'',department:'',category:'other',priority:'medium',reporting_employee_id:'',affected_device_id:'' };

export default function Helpdesk() {
  const { profile } = useAuth();
  const { data: tickets = [], isLoading } = useItTickets();
  const { data: employees = [] } = useEmployees();
  const { data: devices = [] } = useItDevices();
  const create = useCreateItTicket();
  const update = useUpdateItTicket();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPri, setFilterPri] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(blank);
  const [viewTicket, setViewTicket] = useState<DbItTicket|null>(null);
  const [editTicket, setEditTicket] = useState<DbItTicket|null>(null);
  const [editForm, setEditForm] = useState<Partial<DbItTicket>>({});
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: comments = [] } = useItTicketComments(viewTicket?.id);
  const addComment = useCreateItTicketComment();

  const empName = (id:string|null) => { if (!id) return '—'; const e = employees.find(x=>x.id===id); return e ? `${e.first_name} ${e.last_name}` : '—'; };
  const devName = (id:string|null) => id ? devices.find(d=>d.id===id)?.asset_id??'—' : '—';

  const filtered = tickets.filter(t => {
    const q = search.toLowerCase();
    return (`${t.ticket_id} ${t.title} ${t.department}`).toLowerCase().includes(q) &&
      (filterStatus==='all'||t.status===filterStatus) &&
      (filterPri==='all'||t.priority===filterPri);
  });

  const handleCreate = async () => {
    if (!form.title) { toast({ title:'Title required', variant:'destructive' }); return; }
    setSaving(true);
    try {
      await create.mutateAsync({ ...form, reporting_employee_id:form.reporting_employee_id||null, affected_device_id:form.affected_device_id||null });
      toast({ title:'Ticket created' }); setShowForm(false); setForm(blank);
    } catch (e:any) { toast({ title:'Error', description:e.message, variant:'destructive' }); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!editTicket) return;
    setSaving(true);
    try { await update.mutateAsync({ id:editTicket.id, ...editForm }); toast({ title:'Ticket updated' }); setEditTicket(null); }
    catch (e:any) { toast({ title:'Error', description:e.message, variant:'destructive' }); }
    finally { setSaving(false); }
  };

  const handleAddComment = async () => {
    if (!comment||!viewTicket) return;
    try { await addComment.mutateAsync({ ticket_id:viewTicket.id, body:comment, author_name:profile?.full_name??'IT Staff' }); setComment(''); }
    catch (e:any) { toast({ title:'Error', description:e.message, variant:'destructive' }); }
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div><h1 className="page-title">IT Helpdesk</h1><p className="page-subtitle">All IT support tickets · {tickets.length} total · {tickets.filter(t=>!['closed','resolved'].includes(t.status)).length} open</p></div>
        <Button className="gap-2" onClick={()=>{ setForm(blank); setShowForm(true); }}><Plus className="h-4 w-4"/>New Ticket</Button>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="Search tickets…" value={search} onChange={e=>setSearch(e.target.value)} className="pl-9"/></div>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-36"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="assigned">Assigned</SelectItem><SelectItem value="investigating">Investigating</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="escalated">Escalated</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select>
        <Select value={filterPri} onValueChange={setFilterPri}><SelectTrigger className="w-36"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All Priority</SelectItem><SelectItem value="urgent">Urgent</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b bg-muted/50">{['Ticket ID','Title','Category','Priority','Status','Reporter','Assigned To','SLA','Created',''].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(t=>(
              <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-sm font-medium">{t.ticket_id}</td>
                <td className="px-4 py-3 text-sm max-w-[180px] truncate">{t.title}</td>
                <td className="px-4 py-3 text-sm capitalize">{t.category}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priClass(t.priority)}`}>{t.priority}</span></td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stClass(t.status)}`}>{t.status}</span></td>
                <td className="px-4 py-3 text-sm">{empName(t.reporting_employee_id)}</td>
                <td className="px-4 py-3 text-sm">{empName(t.assigned_technician_id)}</td>
                <td className="px-4 py-3"><SlaCountdown createdAt={t.created_at} priority={t.priority} status={t.status} /></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDistanceToNow(new Date(t.created_at),{addSuffix:true})}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={()=>setViewTicket(t)} className="text-muted-foreground hover:text-primary p-1"><Eye className="h-4 w-4"/></button>
                    <button onClick={()=>{ setEditTicket(t); setEditForm({ status:t.status,priority:t.priority,assigned_technician_id:t.assigned_technician_id,resolution_notes:t.resolution_notes??'',employee_confirmed:t.employee_confirmed }); }} className="text-muted-foreground hover:text-primary p-1"><Edit2 className="h-4 w-4"/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length===0&&<div className="text-center py-12 text-muted-foreground">No tickets found.</div>}
      </div>

      {/* New ticket form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New IT Support Ticket</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="col-span-2"><Label className="text-xs">Title</Label><Input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></div>
            <div className="col-span-2"><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={3}/></div>
            <div><Label className="text-xs">Reporting Employee</Label><Select value={form.reporting_employee_id} onValueChange={v=>setForm(f=>({...f,reporting_employee_id:v}))}><SelectTrigger><SelectValue placeholder="Select employee"/></SelectTrigger><SelectContent>{employees.map(e=><SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Department</Label><Input value={form.department} onChange={e=>setForm(f=>({...f,department:e.target.value}))}/></div>
            <div><Label className="text-xs">Affected Device</Label><Select value={form.affected_device_id} onValueChange={v=>setForm(f=>({...f,affected_device_id:v}))}><SelectTrigger><SelectValue placeholder="None"/></SelectTrigger><SelectContent>{devices.map(d=><SelectItem key={d.id} value={d.id}>{d.asset_id} — {d.device_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Category</Label><Select value={form.category} onValueChange={v=>setForm(f=>({...f,category:v as Cat}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="hardware">Hardware</SelectItem><SelectItem value="software">Software</SelectItem><SelectItem value="network">Network</SelectItem><SelectItem value="access">Access</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="printer">Printer</SelectItem><SelectItem value="phone">Phone</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
            <div><Label className="text-xs">Priority</Label><Select value={form.priority} onValueChange={v=>setForm(f=>({...f,priority:v as Pri}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving}>{saving?'Creating…':'Create Ticket'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit / update ticket */}
      <Dialog open={!!editTicket} onOpenChange={()=>setEditTicket(null)}>
        <DialogContent className="max-w-lg">
          {editTicket&&(<>
            <DialogHeader><DialogTitle>Update {editTicket.ticket_id}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div><Label className="text-xs">Status</Label><Select value={editForm.status} onValueChange={v=>setEditForm(f=>({...f,status:v as St}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="assigned">Assigned</SelectItem><SelectItem value="investigating">Investigating</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="escalated">Escalated</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select></div>
              <div><Label className="text-xs">Priority</Label><Select value={editForm.priority} onValueChange={v=>setEditForm(f=>({...f,priority:v as Pri}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
              <div><Label className="text-xs">Assign Technician</Label><Select value={editForm.assigned_technician_id??''} onValueChange={v=>setEditForm(f=>({...f,assigned_technician_id:v||null}))}><SelectTrigger><SelectValue placeholder="Unassigned"/></SelectTrigger><SelectContent>{employees.map(e=><SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs">Employee Confirmed</Label><Select value={editForm.employee_confirmed?'yes':'no'} onValueChange={v=>setEditForm(f=>({...f,employee_confirmed:v==='yes'}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="no">No</SelectItem><SelectItem value="yes">Yes — resolved</SelectItem></SelectContent></Select></div>
              <div className="col-span-2"><Label className="text-xs">Resolution Notes</Label><Textarea value={editForm.resolution_notes??''} onChange={e=>setEditForm(f=>({...f,resolution_notes:e.target.value}))} rows={3}/></div>
            </div>
            <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>setEditTicket(null)}>Cancel</Button><Button onClick={handleUpdate} disabled={saving}>{saving?'Saving…':'Update'}</Button></DialogFooter>
          </>)}
        </DialogContent>
      </Dialog>

      {/* Detail + comments */}
      <Dialog open={!!viewTicket} onOpenChange={()=>setViewTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewTicket&&(<>
            <DialogHeader>
              <DialogTitle>{viewTicket.ticket_id} — {viewTicket.title}</DialogTitle>
              <div className="flex gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priClass(viewTicket.priority)}`}>{viewTicket.priority}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stClass(viewTicket.status)}`}>{viewTicket.status}</span>
              </div>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {[
                ['Reporter', empName(viewTicket.reporting_employee_id)],
                ['Department', viewTicket.department||'—'],
                ['Category', viewTicket.category],
                ['Affected Device', devName(viewTicket.affected_device_id)],
                ['Assigned To', empName(viewTicket.assigned_technician_id)],
                ['Employee Confirmed', viewTicket.employee_confirmed?'Yes':'No'],
                ['Response Time', viewTicket.response_time_minutes!=null?`${viewTicket.response_time_minutes} min`:'—'],
                ['Resolution Time', viewTicket.resolution_time_minutes!=null?`${viewTicket.resolution_time_minutes} min`:'—'],
                ['Created', format(new Date(viewTicket.created_at),'dd MMM yyyy HH:mm')],
                ['Resolved', viewTicket.resolved_at?format(new Date(viewTicket.resolved_at),'dd MMM yyyy HH:mm'):'—'],
              ].map(([l,v])=>(<div key={l}><Label className="text-xs text-muted-foreground">{l}</Label><p className="text-sm font-medium">{v}</p></div>))}
              {viewTicket.description&&<div className="col-span-2"><Label className="text-xs text-muted-foreground">Description</Label><p className="text-sm">{viewTicket.description}</p></div>}
              {viewTicket.resolution_notes&&<div className="col-span-2"><Label className="text-xs text-muted-foreground">Resolution Notes</Label><p className="text-sm">{viewTicket.resolution_notes}</p></div>}
            </div>

            <div className="mt-6 border-t pt-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4"/>Comments ({comments.length})</h3>
              <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
                {comments.map(c=>(
                  <div key={c.id} className="bg-muted rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">{c.author_name}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(c.created_at),'dd MMM HH:mm')}</span>
                    </div>
                    <p className="text-sm">{c.body}</p>
                  </div>
                ))}
                {comments.length===0&&<p className="text-sm text-muted-foreground">No comments yet.</p>}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Add a comment…" value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAddComment()} className="flex-1"/>
                <Button onClick={handleAddComment} disabled={!comment}>Send</Button>
              </div>
            </div>
          </>)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
