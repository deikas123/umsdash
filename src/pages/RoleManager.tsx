import { useState, useCallback, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useRBAC, CustomRole } from '@/hooks/useRBAC';
import { useUserHub } from '@/hooks/useUserHub';
import { ALL_PERMISSIONS, groupPermissions } from '@/lib/permissions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Lock, Plus, Pencil, Trash2, CheckCircle2, X, ShieldCheck, Users } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const COLOR_SWATCHES = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#64748b',
];

function RoleColorDot({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <span
      style={{ backgroundColor: color, width: size, height: size }}
      className="inline-block rounded-full flex-shrink-0"
    />
  );
}

function baseRoleBadgeVariant(role: string) {
  if (role === 'admin') return 'destructive';
  if (role === 'staff') return 'default';
  return 'secondary';
}

// ── Role Form dialog ──────────────────────────────────────────────────────────

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: CustomRole | null;
  onSaved: () => void;
}

function RoleFormDialog({ open, onOpenChange, initial, onSaved }: RoleFormDialogProps) {
  const { createRole, updateRole } = useRBAC();
  const { toast } = useToast();
  const isEdit = !!initial;

  const [displayName, setDisplayName] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseRole, setBaseRole] = useState('staff');
  const [color, setColor] = useState('#6366f1');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDisplayName(initial?.display_name ?? '');
      setName(initial?.name ?? '');
      setDescription(initial?.description ?? '');
      setBaseRole(initial?.base_role ?? 'staff');
      setColor(initial?.color ?? '#6366f1');
    }
  }, [open, initial]);

  const handleDisplayNameChange = (val: string) => {
    setDisplayName(val);
    if (!isEdit) setName(slugify(val));
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast({ title: 'Display Name is required', variant: 'destructive' });
      return;
    }
    if (!name.trim()) {
      toast({ title: 'Internal Name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (isEdit && initial) {
        await updateRole({ id: initial.id, display_name: displayName, description: description || null, base_role: baseRole, color });
        toast({ title: 'Role updated' });
      } else {
        await createRole({ name, display_name: displayName, description: description || null, base_role: baseRole, color });
        toast({ title: 'Role created' });
      }
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to save role', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const isSystemRole = initial?.is_system ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Role' : 'Create New Role'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => handleDisplayNameChange(e.target.value)}
              placeholder="e.g. Senior Staff"
              disabled={isSystemRole}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="internal-name">Internal Name (slug)</Label>
            <Input
              id="internal-name"
              value={name}
              onChange={(e) => !isEdit && setName(slugify(e.target.value))}
              readOnly={isEdit}
              disabled={isSystemRole || isEdit}
              placeholder="e.g. senior-staff"
              className="font-mono text-sm"
            />
            {!isEdit && <p className="text-xs text-muted-foreground">Auto-filled from Display Name. Cannot be changed after creation.</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this role can do"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Base Role</Label>
            <Select value={baseRole} onValueChange={setBaseRole} disabled={isSystemRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  style={{ backgroundColor: c, width: 28, height: 28, border: color === c ? '3px solid white' : '3px solid transparent', outline: color === c ? `2px solid ${c}` : 'none' }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Tab 1 — Roles ─────────────────────────────────────────────────────────────

function RolesTab({
  onPermissionsTab,
}: {
  onPermissionsTab: (role: CustomRole) => void;
}) {
  const { customRoles, userCustomRoles, deleteRole } = useRBAC();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRole, setEditRole] = useState<CustomRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomRole | null>(null);

  const userCountForRole = (roleId: string) =>
    userCustomRoles.filter((ur) => ur.role_id === roleId).length;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRole(deleteTarget.id);
      toast({ title: 'Role deleted' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to delete', variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{customRoles.length} role{customRoles.length !== 1 ? 's' : ''} defined</p>
        <Button size="sm" onClick={() => { setEditRole(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1.5" />Create New Role
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {customRoles.map((role) => (
          <Card
            key={role.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onPermissionsTab(role)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <RoleColorDot color={role.color} />
                  <CardTitle className="text-base">{role.display_name}</CardTitle>
                  {role.is_system && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => { setEditRole(role); setDialogOpen(true); }}
                    aria-label="Edit role"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {!role.is_system && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(role)}
                      aria-label="Delete role"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs font-mono">{role.name}</Badge>
                <Badge variant={baseRoleBadgeVariant(role.base_role)} className="text-xs capitalize">{role.base_role}</Badge>
              </div>
              {role.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{role.description}</p>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{userCountForRole(role.id)} user{userCountForRole(role.id) !== 1 ? 's' : ''}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <RoleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editRole}
        onSaved={() => {}}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role "{deleteTarget?.display_name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the role and revoke it from all users assigned to it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Tab 2 — Permissions ───────────────────────────────────────────────────────

function PermissionsTab({ preselectedRole }: { preselectedRole: CustomRole | null }) {
  const { customRoles, rolePermissions, setRolePermissions } = useRBAC();
  const { toast } = useToast();

  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [localKeys, setLocalKeys] = useState<Set<string>>(new Set());
  const [unsaved, setUnsaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // preselect role from prop
  useEffect(() => {
    if (preselectedRole) setSelectedRoleId(preselectedRole.id);
  }, [preselectedRole]);

  // when selected role changes, sync local keys
  useEffect(() => {
    const keys = new Set(
      rolePermissions
        .filter((rp) => rp.role_id === selectedRoleId)
        .map((rp) => rp.permission_key),
    );
    setLocalKeys(keys);
    setUnsaved(false);
  }, [selectedRoleId, rolePermissions]);

  const grantedCount = (roleId: string) =>
    rolePermissions.filter((rp) => rp.role_id === roleId).length;

  const doSave = useCallback(
    async (keys: Set<string>) => {
      if (!selectedRoleId) return;
      setSaving(true);
      try {
        await setRolePermissions({ roleId: selectedRoleId, permissionKeys: Array.from(keys) });
        setUnsaved(false);
      } catch (err: unknown) {
        toast({ title: 'Save failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
      } finally {
        setSaving(false);
      }
    },
    [selectedRoleId, setRolePermissions, toast],
  );

  const handleToggle = (key: string, checked: boolean) => {
    setLocalKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key); else next.delete(key);
      return next;
    });
    setUnsaved(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLocalKeys((current) => {
        doSave(current);
        return current;
      });
    }, 500);
  };

  const handleGroupSelectAll = (groupKeys: string[], checked: boolean) => {
    setLocalKeys((prev) => {
      const next = new Set(prev);
      groupKeys.forEach((k) => (checked ? next.add(k) : next.delete(k)));
      return next;
    });
    setUnsaved(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLocalKeys((current) => {
        doSave(current);
        return current;
      });
    }, 500);
  };

  const handleCategorySelectAll = (catKeys: string[], checked: boolean) => {
    handleGroupSelectAll(catKeys, checked);
  };

  const grouped = groupPermissions(ALL_PERMISSIONS);
  const selectedRole = customRoles.find((r) => r.id === selectedRoleId);

  return (
    <div className="flex gap-4 min-h-[500px]">
      {/* Left — role selector */}
      <div className="w-60 flex-shrink-0 border rounded-lg overflow-hidden">
        <div className="p-2 bg-muted/30 border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground px-3">
          Roles
        </div>
        <div className="divide-y">
          {customRoles.map((role) => (
            <button
              key={role.id}
              type="button"
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent ${selectedRoleId === role.id ? 'bg-accent font-medium' : ''}`}
              onClick={() => setSelectedRoleId(role.id)}
            >
              <RoleColorDot color={role.color} size={10} />
              <span className="flex-1 truncate">{role.display_name}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                {grantedCount(role.id)}/{ALL_PERMISSIONS.length}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Right — permission matrix */}
      <div className="flex-1 min-w-0">
        {!selectedRole ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select a role to manage its permissions
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RoleColorDot color={selectedRole.color} />
                <span className="font-semibold">{selectedRole.display_name}</span>
                {selectedRole.is_system && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
              {unsaved && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200 text-xs animate-pulse">
                  Unsaved changes…
                </Badge>
              )}
              {saving && (
                <Badge variant="secondary" className="text-xs">Saving…</Badge>
              )}
            </div>

            {Object.entries(grouped).map(([category, groups]) => {
              const catKeys = Object.values(groups).flat().map((p) => p.key);
              const catAllChecked = catKeys.every((k) => localKeys.has(k));
              const catSomeChecked = catKeys.some((k) => localKeys.has(k));

              return (
                <div key={category} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 border-b">
                    <Checkbox
                      checked={catAllChecked}
                      data-state={catSomeChecked && !catAllChecked ? 'indeterminate' : undefined}
                      onCheckedChange={(v) => handleCategorySelectAll(catKeys, !!v)}
                      id={`cat-${category}`}
                      aria-label={`Select all in ${category}`}
                    />
                    <Label htmlFor={`cat-${category}`} className="font-semibold text-sm cursor-pointer">
                      {category}
                    </Label>
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      {catKeys.filter((k) => localKeys.has(k)).length}/{catKeys.length}
                    </Badge>
                  </div>

                  {Object.entries(groups).map(([group, perms]) => {
                    const groupKeys = perms.map((p) => p.key);
                    const groupAllChecked = groupKeys.every((k) => localKeys.has(k));
                    const groupSomeChecked = groupKeys.some((k) => localKeys.has(k));

                    return (
                      <div key={group}>
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/20 border-b">
                          <Checkbox
                            checked={groupAllChecked}
                            data-state={groupSomeChecked && !groupAllChecked ? 'indeterminate' : undefined}
                            onCheckedChange={(v) => handleGroupSelectAll(groupKeys, !!v)}
                            id={`group-${group}`}
                            aria-label={`Select all in ${group}`}
                          />
                          <Label htmlFor={`group-${group}`} className="text-xs font-medium text-muted-foreground cursor-pointer uppercase tracking-wide">
                            {group}
                          </Label>
                        </div>
                        <div className="divide-y">
                          {perms.map((perm) => (
                            <div key={perm.key} className="flex items-center gap-3 px-4 py-2.5">
                              <Switch
                                id={`perm-${perm.key}`}
                                checked={localKeys.has(perm.key)}
                                onCheckedChange={(v) => handleToggle(perm.key, v)}
                                aria-label={perm.label}
                              />
                              <div className="flex-1 min-w-0">
                                <Label htmlFor={`perm-${perm.key}`} className="text-sm font-medium cursor-pointer">
                                  {perm.label}
                                </Label>
                                <p className="text-xs text-muted-foreground truncate">{perm.description}</p>
                              </div>
                              <span className="text-[10px] text-muted-foreground font-mono hidden sm:block">
                                {perm.key}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab 3 — User Role Assignments ─────────────────────────────────────────────

function UserRoleAssignmentsTab() {
  const { customRoles, userCustomRoles, rolePermissions, assignRoleToUser, removeRoleFromUser } = useRBAC();
  const { users } = useUserHub();
  const { toast } = useToast();
  const [baseRoleFilter, setBaseRoleFilter] = useState('all');
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; roleId: string; roleName: string } | null>(null);
  const [assigning, setAssigning] = useState<{ [userId: string]: boolean }>({});

  const filteredUsers = baseRoleFilter === 'all'
    ? users
    : users.filter((u) => u.role === baseRoleFilter);

  const rolesForUser = (userId: string) =>
    userCustomRoles
      .filter((ur) => ur.user_id === userId)
      .map((ur) => customRoles.find((r) => r.id === ur.role_id))
      .filter(Boolean) as CustomRole[];

  const inheritedPermCount = (userId: string) => {
    const roleIds = new Set(userCustomRoles.filter((ur) => ur.user_id === userId).map((ur) => ur.role_id));
    return new Set(rolePermissions.filter((rp) => roleIds.has(rp.role_id)).map((rp) => rp.permission_key)).size;
  };

  const handleAssign = async (userId: string, roleId: string) => {
    if (!roleId) return;
    setAssigning((prev) => ({ ...prev, [userId]: true }));
    try {
      await assignRoleToUser({ userId, roleId });
      toast({ title: 'Role assigned' });
    } catch (err: unknown) {
      toast({ title: 'Failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setAssigning((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    try {
      await removeRoleFromUser({ userId: removeTarget.userId, roleId: removeTarget.roleId });
      toast({ title: 'Role removed' });
    } catch (err: unknown) {
      toast({ title: 'Failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setRemoveTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={baseRoleFilter} onValueChange={setBaseRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Base Role</TableHead>
              <TableHead>Custom Roles</TableHead>
              <TableHead className="hidden md:table-cell">Inherited Permissions</TableHead>
              <TableHead>Assign Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((u) => {
              const assigned = rolesForUser(u.user_id);
              const availableRoles = customRoles.filter(
                (r) => !assigned.some((ar) => ar.id === r.id),
              );
              return (
                <TableRow key={u.user_id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        {u.avatar_url && <AvatarImage src={u.avatar_url} alt={u.full_name} />}
                        <AvatarFallback className="text-xs">
                          {u.full_name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{u.full_name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={baseRoleBadgeVariant(u.role ?? 'staff')} className="capitalize text-xs">
                      {u.role ?? 'staff'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {assigned.map((r) => (
                        <Badge
                          key={r.id}
                          variant="outline"
                          className="text-xs gap-1 cursor-pointer"
                          style={{ borderColor: r.color, color: r.color }}
                        >
                          <RoleColorDot color={r.color} size={6} />
                          {r.display_name}
                          <button
                            type="button"
                            onClick={() => setRemoveTarget({ userId: u.user_id, roleId: r.id, roleName: r.display_name })}
                            className="ml-0.5 hover:text-destructive transition-colors"
                            aria-label={`Remove ${r.display_name}`}
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      ))}
                      {assigned.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm">{inheritedPermCount(u.user_id)}</span>
                  </TableCell>
                  <TableCell>
                    {availableRoles.length > 0 ? (
                      <Select
                        onValueChange={(roleId) => handleAssign(u.user_id, roleId)}
                        disabled={assigning[u.user_id]}
                      >
                        <SelectTrigger className="h-7 text-xs w-36">
                          <SelectValue placeholder="Add role…" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoles.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              <div className="flex items-center gap-1.5">
                                <RoleColorDot color={r.color} size={8} />
                                {r.display_name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-muted-foreground">All assigned</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!removeTarget} onOpenChange={(v) => !v && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove role "{removeTarget?.roleName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke the role and all associated permissions for this user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemove}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Tab 4 — Permission Audit ──────────────────────────────────────────────────

function PermissionAuditTab() {
  const { customRoles, rolePermissions } = useRBAC();
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categories = Array.from(new Set(ALL_PERMISSIONS.map((p) => p.category)));
  const visiblePerms = categoryFilter === 'all'
    ? ALL_PERMISSIONS
    : ALL_PERMISSIONS.filter((p) => p.category === categoryFilter);

  const hasPermission = (roleId: string, permKey: string) =>
    rolePermissions.some((rp) => rp.role_id === roleId && rp.permission_key === permKey);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{visiblePerms.length} permission{visiblePerms.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">Permission</TableHead>
              {customRoles.map((role) => (
                <TableHead key={role.id} className="text-center min-w-[100px]">
                  <div className="flex flex-col items-center gap-1">
                    <RoleColorDot color={role.color} size={8} />
                    <span className="text-xs">{role.display_name}</span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiblePerms.map((perm) => (
              <TableRow key={perm.key}>
                <TableCell className="sticky left-0 bg-background z-10">
                  <div>
                    <p className="text-sm font-medium">{perm.label}</p>
                    <p className="text-xs text-muted-foreground font-mono">{perm.key}</p>
                  </div>
                </TableCell>
                {customRoles.map((role) => (
                  <TableCell key={role.id} className="text-center">
                    {hasPermission(role.id, perm.key) ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RoleManager() {
  const [activeTab, setActiveTab] = useState('roles');
  const [permissionsRole, setPermissionsRole] = useState<CustomRole | null>(null);

  const handlePermissionsTab = (role: CustomRole) => {
    setPermissionsRole(role);
    setActiveTab('permissions');
  };

  return (
    <AppLayout
      title="Role & Permission Manager"
      description="Define custom roles and control what each user can access"
    >
      <div className="flex flex-col gap-1 mb-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Role & Permission Manager</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Define custom roles and control what each user can access
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="assignments">User Assignments</TabsTrigger>
          <TabsTrigger value="audit">Permission Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="roles">
          <RolesTab onPermissionsTab={handlePermissionsTab} />
        </TabsContent>

        <TabsContent value="permissions">
          <PermissionsTab preselectedRole={permissionsRole} />
        </TabsContent>

        <TabsContent value="assignments">
          <UserRoleAssignmentsTab />
        </TabsContent>

        <TabsContent value="audit">
          <PermissionAuditTab />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
