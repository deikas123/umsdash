import { useState } from 'react';
import { useItDevices, useItEmployees, useItDeviceCompliance, useUpsertItCompliance, useItSoftwareInventory, useItUpdates } from '@/it/hooks/useItData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';

export default function DeviceDetails() {
  const { data: devices = [] } = useItDevices();
  const { data: employees = [] } = useItEmployees();
  const [selectedId, setSelectedId] = useState<string>('');
  const device = devices.find(d => d.id === selectedId);
  const employee = device?.assigned_employee_id ? employees.find(e => e.id === device.assigned_employee_id) : null;
  const { data: compliance = [] } = useItDeviceCompliance(selectedId || undefined);
  const { data: software = [] } = useItSoftwareInventory(selectedId || undefined);
  const { data: updates = [] } = useItUpdates(selectedId || undefined);
  const upsertCompliance = useUpsertItCompliance();

  const comp = compliance[0];

  const toggle = async (field: 'antivirus_ok' | 'disk_encryption_ok' | 'firewall_ok' | 'os_supported' | 'mfa_enrolled', val: boolean) => {
    if (!device) return;
    try {
      await upsertCompliance.mutateAsync({ device_id: device.id, ...comp, [field]: val, last_checked: new Date().toISOString() });
      toast({ title: 'Compliance updated' });
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const statusClass = (s: string) => ({ active: 'bg-green-100 text-green-800', offline: 'bg-red-100 text-red-800', maintenance: 'bg-yellow-100 text-yellow-800', retired: 'bg-muted text-muted-foreground' }[s] ?? '');

  return (
    <div>
      <div className="page-header flex items-center gap-4">
        <div>
          <h1 className="page-title">Device Details</h1>
          <p className="page-subtitle">Full profile, compliance and software for a single device</p>
        </div>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Select device…" /></SelectTrigger>
          <SelectContent>
            {devices.map(d => <SelectItem key={d.id} value={d.id}>{d.asset_id} — {d.device_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!device && <p className="text-muted-foreground">Select a device above to view its full profile.</p>}

      {device && (
        <div className="space-y-6">
          {/* Hardware info */}
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Hardware Profile</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ['Asset ID', device.asset_id], ['Device Name', device.device_name], ['Serial', device.serial_number],
                ['Manufacturer', device.manufacturer], ['Model', device.model], ['Processor', device.processor],
                ['RAM', `${device.ram_gb} GB`], ['Storage', `${device.storage_gb} GB`],
                ['OS', device.os_version], ['Edition', device.os_edition],
                ['Department', device.department || '—'], ['Warranty', device.warranty_expiry ?? '—'],
              ].map(([l, v]) => (
                <div key={l}><Label className="text-xs text-muted-foreground">{l}</Label><p className="text-sm font-medium">{v}</p></div>
              ))}
              <div className="col-span-2 flex items-center gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <span className={`block text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${statusClass(device.status)}`}>{device.status}</span>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Assigned To</Label>
                  <p className="text-sm font-medium">{employee?.full_name ?? 'Unassigned'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance */}
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Security Compliance</h2>
            {comp ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {([
                  ['antivirus_ok', 'Antivirus'],
                  ['disk_encryption_ok', 'Disk Encryption'],
                  ['firewall_ok', 'Firewall'],
                  ['os_supported', 'OS Supported'],
                  ['mfa_enrolled', 'MFA Enrolled'],
                ] as ['antivirus_ok' | 'disk_encryption_ok' | 'firewall_ok' | 'os_supported' | 'mfa_enrolled', string][]).map(([field, label]) => (
                  <div key={field} className="flex flex-col items-center gap-2 p-3 border rounded-lg">
                    <Label className="text-xs text-muted-foreground text-center">{label}</Label>
                    <Switch checked={comp[field]} onCheckedChange={v => toggle(field, v)} />
                    <span className={`text-xs font-medium ${comp[field] ? 'text-success' : 'text-destructive'}`}>{comp[field] ? 'OK' : 'Fail'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-3">No compliance record yet.</p>
                <Button size="sm" onClick={() => upsertCompliance.mutateAsync({ device_id: device.id, antivirus_ok: false, disk_encryption_ok: false, firewall_ok: false, os_supported: false, mfa_enrolled: false, last_checked: new Date().toISOString() })}>
                  Create Compliance Record
                </Button>
              </div>
            )}
          </div>

          {/* Software */}
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Installed Software ({software.length})</h2>
            {software.length === 0 ? <p className="text-sm text-muted-foreground">No software records.</p> : (
              <div className="flex flex-wrap gap-2">
                {software.map(s => (
                  <Badge key={s.id} variant={s.status === 'unauthorised' ? 'destructive' : s.status === 'update_available' ? 'secondary' : 'outline'} className="text-xs">
                    {s.name} {s.version && `v${s.version}`}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Pending updates */}
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Updates ({updates.length})</h2>
            {updates.length === 0 ? <p className="text-sm text-muted-foreground">No update records.</p> : (
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50"><th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Update</th><th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Type</th><th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Status</th></tr></thead>
                <tbody>{updates.map(u => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{u.update_name}</td>
                    <td className="px-3 py-2 capitalize">{u.type}</td>
                    <td className="px-3 py-2 capitalize">{u.status}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
