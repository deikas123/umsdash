import { useState } from 'react';
import { useItDevices, useItEmployees, useItTickets, useItSecurityIncidents, useItUpdates, useItVpsMonitors, useItBackupMonitors, useSaveItReportSnapshot, useItReportSnapshots } from '@/it/hooks/useItData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileBarChart, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

export default function MonthlyReport() {
  const { user } = useAuth();
  const { data: devices = [] } = useItDevices();
  const { data: employees = [] } = useItEmployees();
  const { data: tickets = [] } = useItTickets();
  const { data: secInc = [] } = useItSecurityIncidents();
  const { data: updates = [] } = useItUpdates();
  const { data: vps = [] } = useItVpsMonitors();
  const { data: backups = [] } = useItBackupMonitors();
  const { data: snapshots = [] } = useItReportSnapshots('monthly');
  const saveSnapshot = useSaveItReportSnapshot();
  const [saving, setSaving] = useState(false);

  const period = format(new Date(), 'MMMM yyyy');

  const summary = {
    devices_total: devices.length,
    devices_active: devices.filter(d=>d.status==='active').length,
    devices_offline: devices.filter(d=>d.status==='offline').length,
    employees_active: employees.filter(e=>e.account_status==='active').length,
    tickets_total: tickets.length,
    tickets_open: tickets.filter(t=>!['closed','resolved'].includes(t.status)).length,
    tickets_resolved: tickets.filter(t=>['resolved','closed'].includes(t.status)).length,
    updates_pending: updates.filter(u=>u.status==='pending').length,
    security_incidents_open: secInc.filter(s=>!['closed','resolved'].includes(s.status)).length,
    vps_up: vps.filter(v=>v.status==='up').length,
    backups_success: backups.filter(b=>b.status==='success').length,
    backups_failed: backups.filter(b=>b.status==='failed').length,
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSnapshot.mutateAsync({ report_type:'monthly', period, summary, generated_by:user?.id??null });
      toast({ title:'Monthly report saved' });
    } catch (e:any) { toast({ title:'Error', description:e.message, variant:'destructive' }); }
    finally { setSaving(false); }
  };

  const rows: [string, number][] = [
    ['Total Devices', summary.devices_total],
    ['Active Devices', summary.devices_active],
    ['Offline Devices', summary.devices_offline],
    ['Active Employees', summary.employees_active],
    ['Total Tickets', summary.tickets_total],
    ['Open Tickets', summary.tickets_open],
    ['Resolved Tickets', summary.tickets_resolved],
    ['Pending Updates', summary.updates_pending],
    ['Open Security Incidents', summary.security_incidents_open],
    ['VPS Servers Up', summary.vps_up],
    ['Successful Backups', summary.backups_success],
    ['Failed Backups', summary.backups_failed],
  ];

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div><h1 className="page-title">Monthly IT Report</h1><p className="page-subtitle">Auto-generated from live data · {period}</p></div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleSave} disabled={saving}><FileBarChart className="h-4 w-4"/>{saving?'Saving…':'Save Snapshot'}</Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">{period} — IT Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {rows.map(([l,v])=>(
              <div key={l} className="p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{v}</p>
                <p className="text-sm text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Past snapshots */}
      {snapshots.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Saved Snapshots</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead><tr className="border-b bg-muted/50"><th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Period</th><th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Generated</th><th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Devices</th><th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Tickets</th><th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Incidents</th></tr></thead>
              <tbody>
                {snapshots.map(s=>{
                  const sm = s.summary as Record<string,number>;
                  return (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-medium">{s.period}</td>
                      <td className="px-4 py-3 text-sm">{format(new Date(s.generated_at),'dd MMM yyyy HH:mm')}</td>
                      <td className="px-4 py-3 text-sm">{sm.devices_total??'—'}</td>
                      <td className="px-4 py-3 text-sm">{sm.tickets_total??'—'}</td>
                      <td className="px-4 py-3 text-sm">{sm.security_incidents_open??'—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
