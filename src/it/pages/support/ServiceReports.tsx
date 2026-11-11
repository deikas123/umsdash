import { useItTickets } from '@/it/hooks/useItData';
import { useEmployees } from '@/hr/hooks/useSupabaseData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ServiceReports() {
  const { data: tickets = [] } = useItTickets();
  const { data: employees = [] } = useEmployees();
  const empName = (id:string|null) => { if (!id) return '—'; const e = employees.find(x=>x.id===id); return e ? `${e.first_name} ${e.last_name}` : '—'; };

  // Tickets by category
  const categories = ['hardware','software','network','access','email','printer','phone','other'];
  const catData = categories.map(c => ({ name: c, count: tickets.filter(t=>t.category===c).length }));

  // Tickets by priority
  const priorities = ['urgent','high','medium','low'];
  const priData = priorities.map(p => ({ name: p, count: tickets.filter(t=>t.priority===p).length }));

  // Tickets by status
  const statuses = ['open','assigned','investigating','resolved','escalated','closed'];
  const stData = statuses.map(s => ({ name: s, count: tickets.filter(t=>t.status===s).length }));

  // Avg resolution time for resolved/closed tickets
  const resolved = tickets.filter(t=>t.resolution_time_minutes!=null);
  const avgResolution = resolved.length > 0 ? Math.round(resolved.reduce((s,t)=>s+(t.resolution_time_minutes??0),0)/resolved.length) : null;

  // Top technicians by resolved count
  const techStats: Record<string,number> = {};
  tickets.filter(t=>['resolved','closed'].includes(t.status)&&t.assigned_technician_id).forEach(t=>{
    const id = t.assigned_technician_id!;
    techStats[id] = (techStats[id]||0)+1;
  });
  const techLeader = Object.entries(techStats).sort((a,b)=>b[1]-a[1]).slice(0,5);

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Service Reports</h1><p className="page-subtitle">Helpdesk performance metrics and ticket analytics</p></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          ['Total Tickets', tickets.length, ''],
          ['Open', tickets.filter(t=>!['closed','resolved'].includes(t.status)).length, 'text-yellow-600'],
          ['Resolved', tickets.filter(t=>['resolved','closed'].includes(t.status)).length, 'text-green-600'],
          ['Avg Resolution', avgResolution!=null?`${avgResolution} min`:'—', 'text-blue-600'],
        ].map(([l,v,c])=>(
          <Card key={l as string}><CardContent className="p-5"><p className={`text-2xl font-bold ${c}`}>{v}</p><p className="text-sm text-muted-foreground">{l}</p></CardContent></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Tickets by Category</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={catData} margin={{ bottom: 20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent></Card>

        <Card><CardHeader className="pb-3"><CardTitle className="text-base">Tickets by Status</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stData} margin={{ bottom: 20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent></Card>
      </div>

      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Top Technicians by Resolutions</CardTitle></CardHeader><CardContent>
        {techLeader.length === 0 ? <p className="text-sm text-muted-foreground">No resolved tickets yet.</p> : (
          <div className="space-y-2">
            {techLeader.map(([id,count])=>(
              <div key={id} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm font-medium">{empName(id)}</span>
                <span className="text-sm text-muted-foreground">{count} resolved</span>
              </div>
            ))}
          </div>
        )}
      </CardContent></Card>
    </div>
  );
}
