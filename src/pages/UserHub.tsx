import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useUserHub,
  type AppId,
  type AppRole,
  type UserHubUser,
  type DepartmentRow,
  type BulkInviteResult,
} from '@/hooks/useUserHub';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  Download,
  Plus,
  Pencil,
  Trash2,
  KeyRound,
  Loader2,
  Send,
  FileText,
  Settings2,
  Flame,
  Bell,
  Users as UsersIcon,
  Building2,
  Layers,
  History,
  MoreVertical,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/PageHeader';

const APPS: AppId[] = ['docs', 'ops'];
const APP_LABELS: Record<AppId, string> = { docs: 'Docs', ops: 'Ops' };
const ROLE_OPTIONS: AppRole[] = ['admin', 'manager', 'staff', 'customer', 'user'];
const NONE_DEPT = '__none__';

function getRoleBadgeVariant(role: AppRole | null) {
  switch (role) {
    case 'admin':
      return 'destructive';
    case 'manager':
      return 'default';
    case 'staff':
      return 'secondary';
    default:
      return 'outline';
  }
}

function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 45%)`;
}

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function formatDate(iso: string | null) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString();
}

function daysSince(iso: string | null) {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export default function UserHub() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    users,
    departments,
    appAccess,
    loading,
    updateUser,
    updateAppAccess,
    bulkUpdateAppAccess,
    resetPassword,
    bulkInvite,
    refetch,
  } = useUserHub();

  const hasAccess = (uid: string, appId: AppId) =>
    appAccess.some((a) => a.user_id === uid && a.app_id === appId);

  // ── Tab 1: All Users ──
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    departments.forEach((d) => set.add(d.name));
    users.forEach((u) => { if (u.department) set.add(u.department); });
    return Array.from(set).sort();
  }, [departments, users]);

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          (u.full_name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())) &&
          (roleFilter === 'all' || u.role === (roleFilter as AppRole)) &&
          (deptFilter === 'all' || u.department === deptFilter),
      ),
    [users, search, roleFilter, deptFilter],
  );

  const exportCsv = () => {
    const header = ['Full Name', 'Email', 'Phone', 'Role', 'Department', 'Docs', 'Last Active'];
    const rows = filtered.map((u) => [
      u.full_name,
      u.email,
      u.phone ?? '',
      u.role ?? '',
      u.department ?? '',
      String(u.docs_uploaded),
      u.last_active_at ?? '',
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Edit dialog ──
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserHubUser | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState<{
    full_name: string;
    phone: string;
    role: AppRole;
    department: string;
    must_reset_password: boolean;
    docs: boolean;
    ops: boolean;
    hr_role: string;
  } | null>(null);

  const openEdit = (u: UserHubUser) => {
    setEditTarget(u);
    setEditForm({
      full_name: u.full_name,
      phone: u.phone ?? '',
      role: u.role ?? 'staff',
      department: u.department ?? NONE_DEPT,
      must_reset_password: u.must_reset_password,
      docs: hasAccess(u.user_id, 'docs'),
      ops: hasAccess(u.user_id, 'ops'),
      hr_role: ['gm', 'hr_manager', 'hod'].includes(u.role ?? '') ? (u.role ?? 'none') : 'none',
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editTarget || !editForm) return;
    setEditSaving(true);
    try {
      // HR role: if set, it replaces the main role. If removed, fall back to the selected base role.
      const finalRole = (editForm.hr_role && editForm.hr_role !== 'none')
        ? editForm.hr_role as any
        : editForm.role;

      await updateUser(editTarget.user_id, {
        full_name: editForm.full_name,
        phone: editForm.phone || null,
        role: finalRole,
        department: editForm.department === NONE_DEPT ? null : editForm.department,
        must_reset_password: editForm.must_reset_password,
      });
      // App access
      if (editForm.docs !== hasAccess(editTarget.user_id, 'docs')) {
        await updateAppAccess(editTarget.user_id, 'docs', editForm.docs);
      }
      if (editForm.ops !== hasAccess(editTarget.user_id, 'ops')) {
        await updateAppAccess(editTarget.user_id, 'ops', editForm.ops);
      }
      toast({ title: 'User updated', description: `${editForm.full_name} saved.` });
      setEditOpen(false);
      setEditTarget(null);
      setEditForm(null);
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setEditSaving(false);
    }
  };

  // ── Reset password dialog ──
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserHubUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSaving, setResetSaving] = useState(false);

  const openReset = (u: UserHubUser) => {
    setResetTarget(u);
    setNewPassword('');
    setResetOpen(true);
  };

  const doReset = async () => {
    if (!resetTarget) return;
    if (newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Minimum 6 characters.', variant: 'destructive' });
      return;
    }
    setResetSaving(true);
    try {
      await resetPassword(resetTarget.user_id, newPassword);
      toast({ title: 'Password reset', description: `${resetTarget.full_name}'s password was updated.` });
      setResetOpen(false);
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      toast({
        title: 'Reset failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setResetSaving(false);
    }
  };

  // ── Tab 3: Departments CRUD ──
  const [deptOpen, setDeptOpen] = useState(false);
  const [deptEditing, setDeptEditing] = useState<DepartmentRow | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptColor, setDeptColor] = useState('#6366f1');
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<DepartmentRow | null>(null);

  const openDept = (d?: DepartmentRow) => {
    setDeptEditing(d ?? null);
    setDeptName(d?.name ?? '');
    setDeptColor(d?.color ?? '#6366f1');
    setDeptOpen(true);
  };

  const saveDept = async () => {
    if (!deptName.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    setDeptSaving(true);
    try {
      if (deptEditing) {
        const { error } = await supabase
          .from('hr_departments')
          .update({ name: deptName.trim(), color: deptColor })
          .eq('id', deptEditing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hr_departments')
          .insert({ name: deptName.trim(), color: deptColor });
        if (error) throw error;
      }
      toast({ title: deptEditing ? 'Department updated' : 'Department created', description: deptName.trim() });
      setDeptOpen(false);
      refetch();
    } catch (err) {
      toast({
        title: 'Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setDeptSaving(false);
    }
  };

  const deleteDept = async () => {
    if (!deptToDelete) return;
    try {
      const { error } = await supabase.from('hr_departments').delete().eq('id', deptToDelete.id);
      if (error) throw error;
      toast({ title: 'Department deleted', description: deptToDelete.name });
      setDeptToDelete(null);
      refetch();
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  // ── Tab 4: Bulk operations ──
  // Bulk invite
  const [bulkText, setBulkText] = useState('');
  const [bulkRole, setBulkRole] = useState<AppRole>('staff');
  const [bulkApps, setBulkApps] = useState<Set<AppId>>(new Set());
  const [bulkInviteRunning, setBulkInviteRunning] = useState(false);
  const [bulkInviteResult, setBulkInviteResult] = useState<BulkInviteResult | null>(null);

  const runBulkInvite = async () => {
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    setBulkInviteRunning(true);
    setBulkInviteResult(null);
    try {
      const res = await bulkInvite(lines, bulkRole, Array.from(bulkApps));
      setBulkInviteResult(res);
      toast({
        title: 'Bulk invite complete',
        description: `${res.success.length} succeeded, ${res.failed.length} failed.`,
      });
      setBulkText('');
    } catch (err) {
      toast({
        title: 'Bulk invite failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBulkInviteRunning(false);
    }
  };

  // Bulk role change
  const [bulkRoleSelected, setBulkRoleSelected] = useState<Set<string>>(new Set());
  const [bulkRoleValue, setBulkRoleValue] = useState<AppRole>('staff');
  const [bulkRoleLoading, setBulkRoleLoading] = useState(false);

  const applyBulkRole = async () => {
    if (bulkRoleSelected.size === 0) return;
    setBulkRoleLoading(true);
    try {
      const ids = Array.from(bulkRoleSelected).filter((id) => id !== user?.id);
      for (const uid of ids) {
        const { data: existing } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', uid)
          .maybeSingle();
        if (existing) {
          await supabase.from('user_roles').update({ role: bulkRoleValue }).eq('user_id', uid);
        } else {
          await supabase.from('user_roles').insert({ user_id: uid, role: bulkRoleValue });
        }
      }
      await supabase.from('audit_logs').insert({
        user_id: user?.id ?? null,
        action: 'bulk_role_change',
        entity_type: 'user',
        details: { count: ids.length, new_role: bulkRoleValue, user_ids: ids },
      });
      toast({ title: 'Roles updated', description: `${ids.length} user(s) set to ${bulkRoleValue}.` });
      setBulkRoleSelected(new Set());
      refetch();
    } catch (err) {
      toast({
        title: 'Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBulkRoleLoading(false);
    }
  };

  // Bulk app access
  const [bulkAccessSelected, setBulkAccessSelected] = useState<Set<string>>(new Set());
  const [bulkAccessApps, setBulkAccessApps] = useState<Set<AppId>>(new Set());
  const [bulkAccessLoading, setBulkAccessLoading] = useState(false);

  const applyBulkAccess = async (granted: boolean) => {
    if (bulkAccessSelected.size === 0 || bulkAccessApps.size === 0) return;
    setBulkAccessLoading(true);
    try {
      const ids = Array.from(bulkAccessSelected);
      for (const appId of Array.from(bulkAccessApps)) {
        await bulkUpdateAppAccess(ids, appId, granted);
      }
      toast({
        title: granted ? 'Access granted' : 'Access revoked',
        description: `${ids.length} user(s) × ${bulkAccessApps.size} app(s).`,
      });
      setBulkAccessSelected(new Set());
      setBulkAccessApps(new Set());
    } catch (err) {
      toast({
        title: 'Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBulkAccessLoading(false);
    }
  };

  // ── Tab 5: Activity ──
  const sortedActivity = useMemo(
    () =>
      [...users].sort((a, b) => {
        const av = a.last_active_at ? new Date(a.last_active_at).getTime() : 0;
        const bv = b.last_active_at ? new Date(b.last_active_at).getTime() : 0;
        return bv - av;
      }),
    [users],
  );

  const [notifying, setNotifying] = useState<string | null>(null);
  const notifyInactive = async (u: UserHubUser) => {
    setNotifying(u.user_id);
    try {
      const { error } = await supabase.from('in_app_notifications').insert({
        user_id: u.user_id,
        title: 'We miss you!',
        message: `Hi ${u.full_name.split(' ')[0]}, we noticed you haven't been active in a while. Come see what's new.`,
        type: 'reminder',
        is_read: false,
      });
      if (error) throw error;
      toast({ title: 'Notification sent', description: `Reminded ${u.full_name}.` });
    } catch (err) {
      toast({
        title: 'Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setNotifying(null);
    }
  };

  // ── helpers ──
  const toggleSet = (
    id: string,
    selected: Set<string>,
    setSelected: (s: Set<string>) => void,
  ) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleApp = (
    appId: AppId,
    selected: Set<AppId>,
    setSelected: (s: Set<AppId>) => void,
  ) => {
    const next = new Set(selected);
    if (next.has(appId)) next.delete(appId);
    else next.add(appId);
    setSelected(next);
  };

  const renderChecklist = (
    selected: Set<string>,
    onToggle: (id: string) => void,
  ) => (
    <div className="max-h-56 overflow-auto rounded-md border p-2 space-y-1">
      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground p-2">No users.</p>
      ) : (
        users.map((u) => (
          <div key={u.user_id} className="flex items-center gap-2 text-sm rounded px-1 py-1 hover:bg-muted/50">
            <Checkbox checked={selected.has(u.user_id)} onCheckedChange={() => onToggle(u.user_id)} />
            <span className="truncate">{u.full_name}</span>
            <span className="ml-auto text-xs text-muted-foreground truncate pl-2">{u.email}</span>
          </div>
        ))
      )}
    </div>
  );

  const grantAll = async (appId: AppId) => {
    const ids = users.map((u) => u.user_id);
    if (ids.length === 0) return;
    try {
      await bulkUpdateAppAccess(ids, appId, true);
      toast({ title: 'Granted', description: `All users now have ${APP_LABELS[appId]} access.` });
    } catch (err) {
      toast({
        title: 'Failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout title="User Hub" description="Unified user management across all apps">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
      <PageHeader
        title="User Hub"
        description="Unified user management — roles, app access, departments, and bulk operations"
      />
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4 flex w-full flex-wrap justify-start">
          <TabsTrigger value="all"><UsersIcon className="mr-2 h-4 w-4" />All Users</TabsTrigger>
          <TabsTrigger value="matrix"><Layers className="mr-2 h-4 w-4" />App Access</TabsTrigger>
          <TabsTrigger value="departments"><Building2 className="mr-2 h-4 w-4" />Departments</TabsTrigger>
          <TabsTrigger value="bulk"><Layers className="mr-2 h-4 w-4" />Bulk Ops</TabsTrigger>
          <TabsTrigger value="activity"><History className="mr-2 h-4 w-4" />Activity</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: All Users ── */}
        <TabsContent value="all">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-10 w-40">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="h-10 w-44">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departmentOptions.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
                <Download className="mr-2 h-4 w-4" />Export CSV
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                  <UsersIcon className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No users found</h3>
                  <p className="text-muted-foreground">Try adjusting your search or filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[900px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-48">Name</TableHead>
                        <TableHead className="w-52">Email</TableHead>
                        <TableHead className="w-24">Role</TableHead>
                        <TableHead className="hidden md:table-cell w-36">Department</TableHead>
                        <TableHead className="hidden lg:table-cell w-36">Designation</TableHead>
                        <TableHead className="hidden lg:table-cell w-24">Staff No.</TableHead>
                        <TableHead className="hidden lg:table-cell w-24">App Access</TableHead>
                        <TableHead className="hidden md:table-cell w-28">Last Active</TableHead>
                        <TableHead className="hidden lg:table-cell w-16">Docs</TableHead>
                        <TableHead className="hidden lg:table-cell w-16">Streak</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((u) => (
                        <TableRow key={u.user_id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                {u.avatar_url && <AvatarImage src={u.avatar_url} alt={u.full_name} />}
                                <AvatarFallback className="text-[10px]">{initials(u.full_name)}</AvatarFallback>
                              </Avatar>
                              <span>{u.full_name}</span>
                              {u.must_reset_password && (
                                <Badge variant="destructive" className="text-[10px] px-1">reset</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">{u.email}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(u.role)} className="capitalize">
                              {u.role ?? 'none'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {u.department ? (
                              <Badge variant="outline" className="text-xs font-normal">{u.department}</Badge>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {u.designation ? <span className="text-xs text-muted-foreground">{u.designation}</span> : '—'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {u.staff_number ? <Badge variant="outline" className="text-xs font-mono">{u.staff_number}</Badge> : '—'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              {APPS.map((app) => {
                                const granted = hasAccess(u.user_id, app);
                                const Icon = app === 'docs' ? FileText : Settings2;
                                return (
                                  <span
                                    key={app}
                                    title={`${APP_LABELS[app]}: ${granted ? 'Granted' : 'None'}`}
                                    className={granted ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/40'}
                                  >
                                    <Icon className="h-4 w-4" />
                                  </span>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{formatDate(u.last_active_at)}</TableCell>
                          <TableCell className="hidden lg:table-cell">{u.docs_uploaded}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center gap-1">
                              <Flame className={u.current_streak ? 'h-4 w-4 text-orange-500' : 'h-4 w-4 text-muted-foreground/40'} />
                              <span>{u.current_streak ?? 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(u)}>
                                  <Pencil className="mr-2 h-4 w-4" />Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openReset(u)}>
                                  <KeyRound className="mr-2 h-4 w-4" />Reset password
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: App Access Matrix ── */}
        <TabsContent value="matrix">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => grantAll('docs')}>
              <FileText className="mr-2 h-4 w-4" />Grant All to Docs
            </Button>
            <Button variant="outline" size="sm" onClick={() => grantAll('ops')}>
              <Settings2 className="mr-2 h-4 w-4" />Grant All to Ops
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        {APPS.map((app) => (
                          <TableHead key={app} className="w-28 text-center">{APP_LABELS[app]}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.user_id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                {u.avatar_url && <AvatarImage src={u.avatar_url} alt={u.full_name} />}
                                <AvatarFallback className="text-[9px]">{initials(u.full_name)}</AvatarFallback>
                              </Avatar>
                              <span className="truncate">{u.full_name}</span>
                            </div>
                          </TableCell>
                          {APPS.map((app) => (
                            <TableCell key={app} className="text-center">
                              <Switch
                                checked={hasAccess(u.user_id, app)}
                                onCheckedChange={(checked) => updateAppAccess(u.user_id, app, Boolean(checked))}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Departments ── */}
        <TabsContent value="departments">
          <div className="mb-4 flex justify-end">
            <Button onClick={() => openDept()}>
              <Plus className="mr-2 h-4 w-4" />Add Department
            </Button>
          </div>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
          ) : departments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Building2 className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No departments yet</h3>
                <p className="text-muted-foreground">Create your first department to organise users.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {departments.map((d) => {
                const count = users.filter((u) => u.department === d.name).length;
                return (
                  <Card key={d.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-4 w-4 shrink-0 rounded-full border"
                            style={{ backgroundColor: stringToColor(d.name) }}
                          />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{d.name}</p>
                            <p className="text-xs text-muted-foreground">{count} user{count === 1 ? '' : 's'}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDept(d)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeptToDelete(d)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {d.description && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{d.description}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 4: Bulk Operations ── */}
        <TabsContent value="bulk">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Bulk Invite */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bulk Invite</CardTitle>
                <CardDescription>
                  One per line: <code className="text-xs bg-muted px-1 rounded">email,password,full name</code>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`alice@example.com,pass123,Alice Smith\nbob@example.com,pass456,Bob Jones`}
                  rows={6}
                  disabled={bulkInviteRunning}
                />
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={bulkRole} onValueChange={(v) => setBulkRole(v as AppRole)} disabled={bulkInviteRunning}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>App access</Label>
                  <div className="flex gap-4">
                    {APPS.map((app) => (
                      <label key={app} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={bulkApps.has(app)}
                          onCheckedChange={() => toggleApp(app, bulkApps, setBulkApps)}
                          disabled={bulkInviteRunning}
                        />
                        {APP_LABELS[app]}
                      </label>
                    ))}
                  </div>
                </div>
                {bulkInviteRunning && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />Inviting {bulkText.split('\n').filter((l) => l.trim()).length} user(s)…
                  </div>
                )}
                {bulkInviteResult && (
                  <div className="max-h-40 overflow-auto rounded-md border p-2 space-y-1 text-xs">
                    {bulkInviteResult.failed.map((f, i) => (
                      <div key={`f${i}`} className="flex items-start gap-2 text-destructive">
                        <span>✗</span><span className="break-all">{f.line}: {f.message}</span>
                      </div>
                    ))}
                    {bulkInviteResult.success.map((s, i) => (
                      <div key={`s${i}`} className="flex items-start gap-2 text-emerald-600 dark:text-emerald-400">
                        <span>✓</span><span className="break-all">{s.line}</span>
                      </div>
                    ))}
                  </div>
                )}
                <Button onClick={runBulkInvite} disabled={bulkInviteRunning || !bulkText.trim()} className="w-full">
                  {bulkInviteRunning ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</>
                  ) : (
                    <><Send className="mr-2 h-4 w-4" />Send Invites</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Bulk Role Change */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bulk Role Change</CardTitle>
                <CardDescription>Select users and apply a new role.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderChecklist(bulkRoleSelected, (id) => toggleSet(id, bulkRoleSelected, setBulkRoleSelected))}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">{bulkRoleSelected.size} selected</span>
                  <Select value={bulkRoleValue} onValueChange={(v) => setBulkRoleValue(v as AppRole)} disabled={bulkRoleLoading}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={applyBulkRole} disabled={bulkRoleLoading || bulkRoleSelected.size === 0} className="w-full">
                  {bulkRoleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Apply Role
                </Button>
              </CardContent>
            </Card>

            {/* Bulk App Access */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bulk App Access</CardTitle>
                <CardDescription>Select users and grant or revoke apps.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderChecklist(bulkAccessSelected, (id) => toggleSet(id, bulkAccessSelected, setBulkAccessSelected))}
                <div className="space-y-2">
                  <Label>Apps</Label>
                  <div className="flex gap-4">
                    {APPS.map((app) => (
                      <label key={app} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={bulkAccessApps.has(app)}
                          onCheckedChange={() => toggleApp(app, bulkAccessApps, setBulkAccessApps)}
                          disabled={bulkAccessLoading}
                        />
                        {APP_LABELS[app]}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => applyBulkAccess(true)}
                    disabled={bulkAccessLoading || bulkAccessSelected.size === 0 || bulkAccessApps.size === 0}
                  >
                    {bulkAccessLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Grant
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => applyBulkAccess(false)}
                    disabled={bulkAccessLoading || bulkAccessSelected.size === 0 || bulkAccessApps.size === 0}
                  >
                    Revoke
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab 5: Activity ── */}
        <TabsContent value="activity">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">Email</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead className="hidden md:table-cell">Days Ago</TableHead>
                        <TableHead className="hidden lg:table-cell">Audit Events</TableHead>
                        <TableHead className="w-32"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedActivity.map((u) => {
                        const days = daysSince(u.last_active_at);
                        const inactive = days > 30;
                        return (
                          <TableRow key={u.user_id} className={inactive ? 'opacity-60' : undefined}>
                            <TableCell className={`font-medium ${inactive ? 'text-muted-foreground' : ''}`}>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-7 w-7">
                                  {u.avatar_url && <AvatarImage src={u.avatar_url} alt={u.full_name} />}
                                  <AvatarFallback className="text-[10px]">{initials(u.full_name)}</AvatarFallback>
                                </Avatar>
                                <span>{u.full_name}</span>
                              </div>
                            </TableCell>
                            <TableCell className={`hidden md:table-cell ${inactive ? 'text-muted-foreground' : ''}`}>{u.email}</TableCell>
                            <TableCell className={inactive ? 'text-muted-foreground' : ''}>{formatDate(u.last_active_at)}</TableCell>
                            <TableCell className={`hidden md:table-cell ${inactive ? 'text-muted-foreground' : ''}`}>
                              {days === Infinity ? 'Never' : `${days}d`}
                            </TableCell>
                            <TableCell className={`hidden lg:table-cell ${inactive ? 'text-muted-foreground' : ''}`}>{u.audit_events}</TableCell>
                            <TableCell>
                              {inactive ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => notifyInactive(u)}
                                  disabled={notifying === u.user_id}
                                >
                                  {notifying === u.user_id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Bell className="mr-2 h-4 w-4" />
                                  )}
                                  Notify
                                </Button>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Edit dialog ── */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) { setEditTarget(null); setEditForm(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>Update profile, role, department and app access.</DialogDescription>
          </DialogHeader>
          {editForm && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full name</Label>
                <Input
                  id="edit-name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+254…"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v as AppRole })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={editForm.department}
                    onValueChange={(v) => setEditForm({ ...editForm, department: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_DEPT}>No department</SelectItem>
                      {departmentOptions.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3 rounded-md border p-3">
                <p className="text-sm font-medium">App access</p>
                {APPS.map((app) => (
                  <div key={app} className="flex items-center justify-between">
                    <Label htmlFor={`edit-${app}`} className="flex items-center gap-2 font-normal cursor-pointer">
                      {app === 'docs' ? <FileText className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
                      {APP_LABELS[app]}
                    </Label>
                    <Switch
                      id={`edit-${app}`}
                      checked={editForm[app]}
                      onCheckedChange={(checked) => setEditForm({ ...editForm, [app]: Boolean(checked) })}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label htmlFor="edit-reset" className="font-normal cursor-pointer">Must reset password</Label>
                <Switch
                  id="edit-reset"
                  checked={editForm.must_reset_password}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, must_reset_password: Boolean(checked) })}
                />
              </div>
              <div className="space-y-2">
                <Label>HR Role <span className="text-xs text-muted-foreground">(replaces base role)</span></Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={editForm.hr_role ?? 'none'}
                  onChange={(e) => setEditForm((f) => f ? { ...f, hr_role: e.target.value } : f)}
                >
                  <option value="none">No HR Role</option>
                  <option value="gm">GM — General Manager</option>
                  <option value="hr_manager">HR Manager</option>
                  <option value="hod">HOD — Head of Department</option>
                </select>
                {editForm.hr_role && editForm.hr_role !== 'none' && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ⚠ This user's role will be set to <strong>{editForm.hr_role}</strong>, replacing their current base role.
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>Cancel</Button>
                <Button onClick={saveEdit} disabled={editSaving}>
                  {editSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Reset password dialog ── */}
      <Dialog open={resetOpen} onOpenChange={(open) => { setResetOpen(open); if (!open) { setResetTarget(null); setNewPassword(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetTarget?.full_name}. They will use it on next sign-in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setResetOpen(false)} disabled={resetSaving}>Cancel</Button>
            <Button onClick={doReset} disabled={resetSaving || newPassword.length < 6}>
              {resetSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              Reset password
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Department add/edit dialog ── */}
      <Dialog open={deptOpen} onOpenChange={setDeptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deptEditing ? 'Edit department' : 'Add department'}</DialogTitle>
            <DialogDescription>Departments help group users across apps.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Name</Label>
              <Input id="dept-name" value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="e.g. Finance, IT, HR" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {['#6366f1','#3b82f6','#22c55e','#ef4444','#f59e0b','#8b5cf6','#ec4899','#14b8a6'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDeptColor(c)}
                    className={`h-8 w-8 rounded-full border-2 transition-transform ${deptColor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeptOpen(false)} disabled={deptSaving}>Cancel</Button>
              <Button onClick={saveDept} disabled={deptSaving}>
                {deptSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {deptEditing ? 'Save' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Department delete confirmation ── */}
      <AlertDialog open={!!deptToDelete} onOpenChange={(open) => !open && setDeptToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete department?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deptToDelete?.name}</strong> will be removed. Users assigned to it will keep
              their department label until reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); deleteDept(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </motion.div>
    </AppLayout>
  );
}
