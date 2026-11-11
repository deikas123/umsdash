/**
 * IT → People → Employee Directory
 * Reads from hr_employees + hr_departments (existing HR data).
 * Adds IT-only overlay: account_username, identity_provider, mfa_enrolled
 * stored in a lightweight it_employee_meta table (upsert by hr_employee_id).
 */
import { useState } from 'react';
import { useEmployees, useDepartments, DbEmployee } from '@/hr/hooks/useSupabaseData';
import { useItEmployeeMeta, useUpsertItEmployeeMeta } from '@/it/hooks/useItEmployeeMeta';
import { Search, Eye, Settings, UserCheck, UserX, UserMinus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

export default function EmployeeDirectory() {
  const { data: employees = [], isLoading } = useEmployees();
  const { data: departments = [] } = useDepartments();
  const { data: metaList = [] } = useItEmployeeMeta();
  const upsertMeta = useUpsertItEmployeeMeta();

  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewTarget, setViewTarget] = useState<DbEmployee | null>(null);
  const [editMeta, setEditMeta] = useState<DbEmployee | null>(null);
  const [metaForm, setMetaForm] = useState({ account_username: '', identity_provider: 'local', mfa_enrolled: false, account_status: 'active' as 'active' | 'suspended' | 'deactivated' });
  const [saving, setSaving] = useState(false);

  const metaMap = Object.fromEntries(metaList.map(m => [m.hr_employee_id, m]));

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    const meta = metaMap[e.id];
    const matchSearch = `${e.first_name} ${e.last_name} ${e.email} ${e.designation} ${meta?.account_username ?? ''}`.toLowerCase().includes(q);
    const matchDept = filterDept === 'all' || e.department_id === filterDept;
    const matchStatus = filterStatus === 'all' || (meta?.account_status ?? 'active') === filterStatus;
    return matchSearch && matchDept && matchStatus;
  });

  const deptName = (id: string | null) => id ? departments.find(d => d.id === id)?.name ?? '—' : '—';

  const openEditMeta = (emp: DbEmployee) => {
    const m = metaMap[emp.id];
    setMetaForm({
      account_username: m?.account_username ?? '',
      identity_provider: m?.identity_provider ?? 'local',
      mfa_enrolled: m?.mfa_enrolled ?? false,
      account_status: m?.account_status ?? 'active',
    });
    setEditMeta(emp);
  };

  const handleSaveMeta = async () => {
    if (!editMeta) return;
    setSaving(true);
    try {
      await upsertMeta.mutateAsync({ hr_employee_id: editMeta.id, ...metaForm });
      toast({ title: 'IT settings updated' });
      setEditMeta(null);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const statusIcon = (s: string) =>
    s === 'active' ? <UserCheck className="h-3 w-3" /> :
    s === 'suspended' ? <UserMinus className="h-3 w-3" /> :
    <UserX className="h-3 w-3" />;

  const statusClass = (s: string) =>
    s === 'active' ? 'text-success' :
    s === 'suspended' ? 'text-warning' :
    'text-destructive';

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Employee Directory</h1>
        <p className="page-subtitle">
          Sourced from HR Hub · {employees.length} employees — IT overlay adds account username, provider and MFA status
        </p>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, email, username…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="deactivated">Deactivated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              {['Staff #', 'Name', 'Department', 'Designation', 'Username', 'Provider', 'MFA', 'IT Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(emp => {
              const meta = metaMap[emp.id];
              const itStatus = meta?.account_status ?? 'active';
              return (
                <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm">{emp.staff_number}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{emp.first_name} {emp.last_name}</p>
                    <p className="text-xs text-muted-foreground">{emp.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">{(emp as any).hr_departments?.name ?? deptName(emp.department_id)}</td>
                  <td className="px-4 py-3 text-sm">{emp.designation || '—'}</td>
                  <td className="px-4 py-3 text-sm font-mono">{meta?.account_username || <span className="text-muted-foreground italic">not set</span>}</td>
                  <td className="px-4 py-3 text-sm capitalize">{meta?.identity_provider ?? 'local'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={meta?.mfa_enrolled ? 'default' : 'secondary'} className="text-xs">
                      {meta?.mfa_enrolled ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs font-medium ${statusClass(itStatus)}`}>
                      {statusIcon(itStatus)} {itStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setViewTarget(emp)} className="text-muted-foreground hover:text-primary p-1" title="View">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => openEditMeta(emp)} className="text-muted-foreground hover:text-primary p-1" title="IT Settings">
                        <Settings className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No employees found</div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!viewTarget} onOpenChange={() => setViewTarget(null)}>
        <DialogContent className="max-w-lg">
          {viewTarget && (() => {
            const meta = metaMap[viewTarget.id];
            return (
              <>
                <DialogHeader>
                  <DialogTitle>{viewTarget.first_name} {viewTarget.last_name}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {[
                    ['Staff Number', viewTarget.staff_number],
                    ['Email', viewTarget.email],
                    ['Phone', viewTarget.phone || '—'],
                    ['Department', (viewTarget as any).hr_departments?.name ?? deptName(viewTarget.department_id)],
                    ['Designation', viewTarget.designation || '—'],
                    ['Join Date', viewTarget.join_date],
                    ['HR Status', viewTarget.status],
                    ['Username', meta?.account_username || 'Not set'],
                    ['Identity Provider', meta?.identity_provider ?? 'local'],
                    ['MFA Enrolled', meta?.mfa_enrolled ? 'Yes' : 'No'],
                    ['IT Account Status', meta?.account_status ?? 'active'],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <Label className="text-xs text-muted-foreground">{l}</Label>
                      <p className="text-sm font-medium">{v}</p>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* IT overlay settings */}
      <Dialog open={!!editMeta} onOpenChange={() => setEditMeta(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>IT Settings — {editMeta?.first_name} {editMeta?.last_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <div>
              <Label className="text-xs">Account Username</Label>
              <Input value={metaForm.account_username} onChange={e => setMetaForm(f => ({ ...f, account_username: e.target.value }))} placeholder="e.g. jdoe" />
            </div>
            <div>
              <Label className="text-xs">Identity Provider</Label>
              <Select value={metaForm.identity_provider} onValueChange={v => setMetaForm(f => ({ ...f, identity_provider: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="entra">Microsoft Entra ID</SelectItem>
                  <SelectItem value="google">Google Workspace</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">MFA Enrolled</Label>
              <Select value={metaForm.mfa_enrolled ? 'yes' : 'no'} onValueChange={v => setMetaForm(f => ({ ...f, mfa_enrolled: v === 'yes' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">IT Account Status</Label>
              <Select value={metaForm.account_status} onValueChange={v => setMetaForm(f => ({ ...f, account_status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="deactivated">Deactivated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditMeta(null)}>Cancel</Button>
            <Button onClick={handleSaveMeta} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
