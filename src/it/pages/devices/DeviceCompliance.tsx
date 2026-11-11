import { useItDevices, useItDeviceCompliance, useUpsertItCompliance } from '@/it/hooks/useItData';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';

function ComplianceIcon({ ok }: { ok: boolean }) {
  return ok ? <CheckCircle className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />;
}

export default function DeviceCompliance() {
  const { data: devices = [] } = useItDevices();
  const { data: allCompliance = [] } = useItDeviceCompliance();
  const upsert = useUpsertItCompliance();

  const compMap = Object.fromEntries(allCompliance.map(c => [c.device_id, c]));
  const fields: Array<[string, string]> = [
    ['antivirus_ok','AV'],['disk_encryption_ok','Encryption'],['firewall_ok','Firewall'],['os_supported','OS'],['mfa_enrolled','MFA'],
  ];

  const totalChecks = devices.length * fields.length;
  const passedChecks = allCompliance.reduce((sum, c) => sum + fields.filter(([f]) => (c as any)[f]).length, 0);
  const compliancePct = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

  const seed = async (deviceId: string) => {
    try {
      await upsert.mutateAsync({ device_id: deviceId, antivirus_ok: false, disk_encryption_ok: false, firewall_ok: false, os_supported: false, mfa_enrolled: false, last_checked: new Date().toISOString() });
      toast({ title: 'Compliance record created' });
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Device Compliance</h1>
        <p className="page-subtitle">Security baseline across all registered devices</p>
      </div>

      <div className="bg-card rounded-lg border p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Overall Compliance</h2>
          <span className="text-2xl font-bold">{compliancePct}%</span>
        </div>
        <Progress value={compliancePct} className="h-3" />
        <p className="text-xs text-muted-foreground mt-2">{passedChecks} of {totalChecks} checks passing across {devices.length} devices</p>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Device</th>
              {fields.map(([, label]) => <th key={label} className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{label}</th>)}
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Score</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Last Checked</th>
            </tr>
          </thead>
          <tbody>
            {devices.map(d => {
              const c = compMap[d.id];
              const score = c ? fields.filter(([f]) => (c as any)[f]).length : 0;
              return (
                <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{d.asset_id}</p>
                    <p className="text-xs text-muted-foreground">{d.device_name}</p>
                  </td>
                  {c ? fields.map(([f, label]) => (
                    <td key={label} className="px-4 py-3 text-center"><ComplianceIcon ok={(c as any)[f]} /></td>
                  )) : fields.map(([, label]) => (
                    <td key={label} className="px-4 py-3 text-center text-muted-foreground text-xs">—</td>
                  ))}
                  <td className="px-4 py-3">
                    {c ? (
                      <span className={`text-sm font-semibold ${score === fields.length ? 'text-success' : score >= 3 ? 'text-warning' : 'text-destructive'}`}>
                        {score}/{fields.length}
                      </span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => seed(d.id)}>Create</Button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c ? new Date(c.last_checked).toLocaleString() : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {devices.length === 0 && <div className="text-center py-12 text-muted-foreground">No devices registered.</div>}
      </div>
    </div>
  );
}
