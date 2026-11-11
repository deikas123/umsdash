import { Monitor, Users, Ticket, ShieldAlert, Server, RefreshCw, CheckSquare, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useItDevices } from '@/it/hooks/useItData';
import { useItTickets } from '@/it/hooks/useItData';
import { useItSecurityIncidents } from '@/it/hooks/useItData';
import { useItUpdates } from '@/it/hooks/useItData';
import { useItVpsMonitors, useItBackupMonitors } from '@/it/hooks/useItData';
import { useEmployees } from '@/hr/hooks/useSupabaseData';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export default function Overview() {
  const navigate = useNavigate();
  const { data: devices = [] } = useItDevices();
  const { data: employees = [] } = useEmployees();
  const { data: tickets = [] } = useItTickets();
  const { data: secIncidents = [] } = useItSecurityIncidents();
  const { data: updates = [] } = useItUpdates();
  const { data: vps = [] } = useItVpsMonitors();
  const { data: backups = [] } = useItBackupMonitors();

  const activeDevices  = devices.filter(d => d.status === 'active').length;
  const offlineDevices = devices.filter(d => d.status === 'offline').length;
  const openTickets    = tickets.filter(t => !['closed','resolved'].includes(t.status)).length;
  const pendingUpdates = updates.filter(u => u.status === 'pending').length;
  const openSecInc     = secIncidents.filter(s => !['closed','resolved'].includes(s.status)).length;
  const activeEmps     = employees.filter(e => e.status === 'active').length;
  const vpsDown        = vps.filter(v => v.status !== 'up').length;
  const failedBackups  = backups.filter(b => b.status === 'failed').length;

  const stats = [
    { label: 'Registered Devices',  value: devices.length,    sub: `${activeDevices} active · ${offlineDevices} offline`, icon: Monitor,     color: 'text-blue-500',    path: '/it/devices' },
    { label: 'Directory Employees', value: employees.length,  sub: `${activeEmps} active accounts`,                        icon: Users,       color: 'text-emerald-500', path: '/it/people/directory' },
    { label: 'Open Tickets',        value: openTickets,       sub: `${tickets.length} total tickets`,                       icon: Ticket,      color: 'text-orange-500',  path: '/it/support' },
    { label: 'Security Incidents',  value: openSecInc,        sub: `${secIncidents.length} total`,                          icon: ShieldAlert, color: 'text-red-500',     path: '/it/security/incidents' },
    { label: 'Pending Updates',     value: pendingUpdates,    sub: `across all devices`,                                    icon: RefreshCw,   color: 'text-yellow-500',  path: '/it/ops/updates' },
    { label: 'VPS Servers',         value: vps.length,        sub: `${vpsDown} down / degraded`,                            icon: Server,      color: 'text-purple-500',  path: '/it/infra/vps' },
    { label: 'Backup Jobs',         value: backups.length,    sub: `${failedBackups} failed`,                                icon: CheckSquare, color: 'text-teal-500',    path: '/it/infra/backup' },
    { label: 'Login Events (last)', value: '—',               sub: 'View login activity',                                   icon: Activity,    color: 'text-sky-500',     path: '/it/security/logins' },
  ];

  const recentTickets = tickets.slice(0, 5);

  const priorityColor = (p: string) => ({
    urgent: 'destructive', high: 'destructive', medium: 'secondary', low: 'outline',
  } as Record<string, any>)[p] ?? 'outline';

  const statusColor = (s: string) => ({
    open: 'bg-yellow-100 text-yellow-800', assigned: 'bg-blue-100 text-blue-800',
    investigating: 'bg-purple-100 text-purple-800', resolved: 'bg-green-100 text-green-800',
    escalated: 'bg-red-100 text-red-800', closed: 'bg-muted text-muted-foreground',
  } as Record<string, string>)[s] ?? 'bg-muted text-muted-foreground';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">IT Command Centre</h1>
        <p className="page-subtitle">Centralised endpoint, identity, security and IT operations management</p>
      </div>

      <p className="text-xs text-muted-foreground mb-6 italic">
        Figures reflect data recorded in this system. Live infrastructure metrics require integration with monitoring agents.
      </p>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Card
            key={s.label}
            className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
            onClick={() => navigate(s.path)}
          >
            <CardContent className="p-5 flex items-start gap-3">
              <div className={`mt-0.5 ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs font-medium text-foreground leading-tight">{s.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent tickets */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent IT Tickets</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 pb-6">No tickets yet.</p>
            ) : (
              <table className="w-full">
                <tbody>
                  {recentTickets.map((t) => (
                    <tr
                      key={t.id}
                      className="border-t first:border-t-0 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate('/it/support')}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{t.ticket_id}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{t.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={priorityColor(t.priority)} className="capitalize text-xs">{t.priority}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(t.status)}`}>{t.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Device status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Device Status</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {devices.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 pb-6">No devices registered yet.</p>
            ) : (
              <table className="w-full">
                <tbody>
                  {devices.slice(0, 6).map((d) => (
                    <tr
                      key={d.id}
                      className="border-t first:border-t-0 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate('/it/devices')}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{d.asset_id}</p>
                        <p className="text-xs text-muted-foreground">{d.device_name}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{d.department || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          d.status === 'active' ? 'bg-green-100 text-green-800'
                          : d.status === 'offline' ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                        }`}>{d.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          d.security_status === 'secure' ? 'bg-green-100 text-green-800'
                          : d.security_status === 'review' ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                        }`}>{d.security_status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
