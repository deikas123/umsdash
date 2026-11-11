import { useItDeviceCompliance, useItSecurityIncidents, useItMfaCompliance, useItLoginActivity } from '@/it/hooks/useItData';
import { useEmployees } from '@/hr/hooks/useSupabaseData';
import { ShieldCheck, ShieldAlert, Lock, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';

export default function SecurityOverview() {
  const navigate = useNavigate();
  const { data: compliance = [] } = useItDeviceCompliance();
  const { data: incidents = [] } = useItSecurityIncidents();
  const { data: mfa = [] } = useItMfaCompliance();
  const { data: employees = [] } = useEmployees();
  const { data: logins = [] } = useItLoginActivity();

  const openIncidents = incidents.filter(i => !['closed','resolved'].includes(i.status)).length;
  const criticalIncidents = incidents.filter(i => i.severity === 'critical' && !['closed','resolved'].includes(i.status)).length;
  const mfaEnrolled = mfa.filter(m => m.enrolled).length;
  const mfaPct = employees.length > 0 ? Math.round((mfaEnrolled / employees.length) * 100) : 0;

  const fields = ['antivirus_ok','disk_encryption_ok','firewall_ok','os_supported','mfa_enrolled'] as const;
  const totalChecks = compliance.length * fields.length;
  const passedChecks = compliance.reduce((s, c) => s + fields.filter(f => c[f]).length, 0);
  const compliancePct = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

  const failedLogins = logins.filter(l => l.outcome === 'failed').length;

  const baseline = [
    'Every employee uses an individual account',
    'MFA required for administrators and critical cloud apps',
    'Employees do not have permanent local administrator privileges',
    'Company laptops must have supported, updated operating systems',
    'Lost devices reported immediately',
    'Departing employees lose access promptly',
    'Production credentials never shared through WhatsApp or plain-text files',
  ];

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Security Overview</h1><p className="page-subtitle">Security posture across devices, identities and incidents</p></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Open Incidents', value: openIncidents, sub: `${criticalIncidents} critical`, icon: ShieldAlert, color: 'text-red-500', path: '/it/security/incidents' },
          { label: 'Device Compliance', value: `${compliancePct}%`, sub: `${passedChecks}/${totalChecks} checks`, icon: ShieldCheck, color: 'text-green-500', path: '/it/devices/compliance' },
          { label: 'MFA Enrolled', value: `${mfaPct}%`, sub: `${mfaEnrolled} of ${employees.length} employees`, icon: Lock, color: 'text-blue-500', path: '/it/security/mfa' },
          { label: 'Failed Logins', value: failedLogins, sub: 'from login activity', icon: Activity, color: 'text-orange-500', path: '/it/security/logins' },
        ].map(s => (
          <Card key={s.label} className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all" onClick={() => navigate(s.path)}>
            <CardContent className="p-5 flex items-start gap-3">
              <div className={`mt-0.5 ${s.color}`}><s.icon className="h-5 w-5" /></div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Compliance Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {fields.map(f => {
              const passed = compliance.filter(c => c[f]).length;
              const pct = compliance.length > 0 ? Math.round((passed / compliance.length) * 100) : 0;
              const labels: Record<string, string> = { antivirus_ok:'Antivirus',disk_encryption_ok:'Disk Encryption',firewall_ok:'Firewall',os_supported:'Supported OS',mfa_enrolled:'MFA Enrolled' };
              return (
                <div key={f}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{labels[f]}</span>
                    <span className="text-sm font-medium">{passed}/{compliance.length}</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
            {compliance.length === 0 && <p className="text-sm text-muted-foreground">No compliance records. Add them in Device Compliance.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Security Baseline</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {baseline.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
