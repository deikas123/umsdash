import { useItDevices, useItDeviceCompliance, useItMfaCompliance, useItSecurityIncidents } from '@/it/hooks/useItData';
import { useEmployees } from '@/hr/hooks/useSupabaseData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle } from 'lucide-react';

export default function ComplianceReport() {
  const { data: devices = [] } = useItDevices();
  const { data: compliance = [] } = useItDeviceCompliance();
  const { data: employees = [] } = useEmployees();
  const { data: mfa = [] } = useItMfaCompliance();
  const { data: incidents = [] } = useItSecurityIncidents();

  const fields: Array<{ key: 'antivirus_ok'|'disk_encryption_ok'|'firewall_ok'|'os_supported'|'mfa_enrolled'; label: string }> = [
    { key: 'antivirus_ok',       label: 'Antivirus Active' },
    { key: 'disk_encryption_ok', label: 'Disk Encrypted' },
    { key: 'firewall_ok',        label: 'Firewall Enabled' },
    { key: 'os_supported',       label: 'OS Supported' },
    { key: 'mfa_enrolled',       label: 'MFA Enrolled' },
  ];

  const compMap = Object.fromEntries(compliance.map(c => [c.device_id, c]));

  const devicesWith = (field: typeof fields[0]['key']) => compliance.filter(c => c[field]).length;
  const totalDevices = compliance.length;

  const mfaEnrolled = mfa.filter(m => m.enrolled).length;
  const mfaPct = employees.length > 0 ? Math.round((mfaEnrolled / employees.length) * 100) : 0;

  const openIncidents = incidents.filter(i => !['closed','resolved'].includes(i.status)).length;
  const criticalIncidents = incidents.filter(i => i.severity === 'critical' && !['closed','resolved'].includes(i.status)).length;

  const baseline = [
    { label: 'Individual accounts per employee', met: employees.every(e => { const m = mfa.find(x => x.employee_id === e.id); return !!m; }) },
    { label: 'MFA coverage ≥ 80%', met: mfaPct >= 80 },
    { label: 'No critical open security incidents', met: criticalIncidents === 0 },
    { label: 'All tracked devices have compliance records', met: devices.length > 0 && compliance.length >= devices.length },
    { label: 'All devices have antivirus active', met: devicesWith('antivirus_ok') === totalDevices && totalDevices > 0 },
    { label: 'All devices have disk encryption', met: devicesWith('disk_encryption_ok') === totalDevices && totalDevices > 0 },
    { label: 'All devices have firewall enabled', met: devicesWith('firewall_ok') === totalDevices && totalDevices > 0 },
  ];

  const metCount = baseline.filter(b => b.met).length;
  const baselinePct = baseline.length > 0 ? Math.round((metCount / baseline.length) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Compliance Report</h1>
        <p className="page-subtitle">Security baseline status and compliance posture</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          ['Baseline Score',    `${baselinePct}%`, metCount === baseline.length ? 'text-green-600' : 'text-orange-500'],
          ['MFA Coverage',      `${mfaPct}%`,      mfaPct >= 80 ? 'text-green-600' : 'text-red-500'],
          ['Open Incidents',    openIncidents,     openIncidents === 0 ? 'text-green-600' : 'text-red-500'],
          ['Critical Incidents',criticalIncidents, criticalIncidents === 0 ? 'text-green-600' : 'text-red-500'],
        ].map(([l,v,c]) => (
          <Card key={l as string}>
            <CardContent className="p-5">
              <p className={`text-2xl font-bold ${c}`}>{v}</p>
              <p className="text-sm text-muted-foreground">{l}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security baseline */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Security Baseline Checks</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Overall</span>
                <span className="text-sm font-bold">{metCount}/{baseline.length}</span>
              </div>
              <Progress value={baselinePct} className="h-2" />
            </div>
            <ul className="space-y-2">
              {baseline.map((b, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  {b.met
                    ? <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                    : <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />}
                  <span className={b.met ? '' : 'text-destructive'}>{b.label}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Device compliance breakdown */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Device Compliance Breakdown</CardTitle></CardHeader>
          <CardContent>
            {totalDevices === 0
              ? <p className="text-sm text-muted-foreground">No compliance records. Add them in Devices → Device Compliance.</p>
              : (
                <div className="space-y-3">
                  {fields.map(f => {
                    const passed = devicesWith(f.key);
                    const pct = Math.round((passed / totalDevices) * 100);
                    return (
                      <div key={f.key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">{f.label}</span>
                          <span className={`text-sm font-semibold ${pct === 100 ? 'text-success' : pct >= 60 ? 'text-warning' : 'text-destructive'}`}>{passed}/{totalDevices}</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              )}
          </CardContent>
        </Card>

        {/* MFA per employee */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-base">Employee MFA Status</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Employee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Department</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">MFA</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Account Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => {
                  const rec = mfa.find(m => m.employee_id === emp.id);
                  return (
                    <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm">{(emp as any).hr_departments?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        {rec
                          ? (rec.enrolled
                              ? <CheckCircle className="h-4 w-4 text-success" />
                              : <XCircle className="h-4 w-4 text-destructive" />)
                          : <span className="text-xs text-muted-foreground">Not recorded</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          emp.status === 'active' ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                        }`}>{emp.status}</span>
                      </td>
                    </tr>
                  );
                })}
                {employees.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No employees in directory.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
