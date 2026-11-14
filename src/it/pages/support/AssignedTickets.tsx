import { useItTickets, useUpdateItTicket } from '@/it/hooks/useItData';
import { useEmployees } from '@/hr/hooks/useSupabaseData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { SlaCountdown } from '@/it/components/SlaCountdown';

const priClass = (p:string) => ({ low:'bg-muted text-muted-foreground',medium:'bg-blue-100 text-blue-800',high:'bg-orange-100 text-orange-800',urgent:'bg-red-100 text-red-800' }[p]??'');
const stClass  = (s:string) => ({ open:'bg-yellow-100 text-yellow-800',assigned:'bg-blue-100 text-blue-800',investigating:'bg-purple-100 text-purple-800',resolved:'bg-green-100 text-green-800',escalated:'bg-red-100 text-red-800',closed:'bg-muted text-muted-foreground' }[s]??'');

export default function AssignedTickets() {
  const { data: tickets = [], isLoading } = useItTickets();
  const { data: employees = [] } = useEmployees();
  const update = useUpdateItTicket();
  const { user } = useAuth();

  const empName = (id:string|null) => { if (!id) return '—'; const e = employees.find(x=>x.id===id); return e ? `${e.first_name} ${e.last_name}` : '—'; };

  // Show tickets that are assigned (not open/closed/resolved)
  const assigned = tickets.filter(t => !['closed'].includes(t.status) && t.assigned_technician_id !== null);

  const advance = async (id:string, status:string) => {
    try { await update.mutateAsync({ id, status: status as any }); toast({ title:`Ticket ${status}` }); }
    catch (e:any) { toast({ title:'Error', description:e.message, variant:'destructive' }); }
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Assigned Tickets</h1>
        <p className="page-subtitle">Tickets with an assigned technician · {assigned.length} active</p>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b bg-muted/50">{['Ticket','Title','Priority','Status','Reporter','Technician','SLA','Age','Actions'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>)}</tr></thead>
          <tbody>
            {assigned.map(t=>(
              <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-sm">{t.ticket_id}</td>
                <td className="px-4 py-3 text-sm max-w-[160px] truncate">{t.title}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priClass(t.priority)}`}>{t.priority}</span></td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stClass(t.status)}`}>{t.status}</span></td>
                <td className="px-4 py-3 text-sm">{empName(t.reporting_employee_id)}</td>
                <td className="px-4 py-3 text-sm">{empName(t.assigned_technician_id)}</td>
                <td className="px-4 py-3"><SlaCountdown createdAt={t.created_at} priority={t.priority} status={t.status} /></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatDistanceToNow(new Date(t.created_at),{addSuffix:true})}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {t.status==='assigned'&&<Button size="sm" variant="outline" onClick={()=>advance(t.id,'investigating')}>Investigate</Button>}
                    {t.status==='investigating'&&<Button size="sm" variant="outline" onClick={()=>advance(t.id,'resolved')}>Resolve</Button>}
                    {['assigned','investigating'].includes(t.status)&&<Button size="sm" variant="destructive" onClick={()=>advance(t.id,'escalated')}>Escalate</Button>}
                    {t.status==='resolved'&&<Button size="sm" variant="outline" onClick={()=>advance(t.id,'closed')}>Close</Button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {assigned.length===0&&<div className="text-center py-12 text-muted-foreground">No assigned tickets.</div>}
      </div>
    </div>
  );
}
