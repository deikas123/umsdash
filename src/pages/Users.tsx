import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PasswordExpirySettings } from '@/components/settings/PasswordExpirySettings';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useAuth } from '@/contexts/AuthContext';
import { EditUserDialog } from '@/components/users/EditUserDialog';
import { Search, Plus, Users as UsersIcon, MoreVertical, Pencil, Trash2, Send, Loader2, KeyRound, Activity, ShieldAlert, Undo2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  role?: AppRole;
  avatar_url?: string | null;
  must_reset_password?: boolean;
}

export default function Users() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<AppRole | null>(null);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const undoBulkReset = async (userIds: string[]) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ must_reset_password: false })
        .in('user_id', userIds);
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        user_id: currentUser?.id,
        action: 'bulk_force_password_reset_undone',
        entity_type: 'user',
        details: { count: userIds.length, user_ids: userIds },
      });
      toast({ title: 'Reverted', description: `Cleared forced reset for ${userIds.length} user(s).` });
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Undo failed', description: err?.message, variant: 'destructive' });
    }
  };

  const undoBulkRoleChange = async (snapshot: Array<{ user_id: string; role: AppRole | null }>) => {
    try {
      for (const s of snapshot) {
        if (s.role) {
          const { data: existing } = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', s.user_id)
            .maybeSingle();
          if (existing) {
            await supabase.from('user_roles').update({ role: s.role }).eq('user_id', s.user_id);
          } else {
            await supabase.from('user_roles').insert({ user_id: s.user_id, role: s.role });
          }
        } else {
          await supabase.from('user_roles').delete().eq('user_id', s.user_id);
        }
      }
      await supabase.from('audit_logs').insert({
        user_id: currentUser?.id,
        action: 'bulk_role_change_undone',
        entity_type: 'user',
        details: { count: snapshot.length, snapshot },
      });
      toast({ title: 'Reverted', description: `Restored previous roles for ${snapshot.length} user(s).` });
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Undo failed', description: err?.message, variant: 'destructive' });
    }
  };

  const handleForceReset = async (target: UserWithRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ must_reset_password: true })
        .eq('user_id', target.user_id);
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        user_id: currentUser?.id,
        action: 'force_password_reset',
        entity_type: 'user',
        entity_id: target.user_id,
        details: { email: target.email, message: 'User must change password on next access' },
      });
      toast({ title: 'Password reset required', description: `${target.full_name} will be forced to set a new password.` });
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Failed', description: err?.message, variant: 'destructive' });
    }
  };

  const handleBulkForceReset = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      // Snapshot previous state for undo
      const { data: prev } = await supabase
        .from('profiles')
        .select('user_id, must_reset_password')
        .in('user_id', ids);
      const previouslyClear = (prev ?? [])
        .filter((p) => !p.must_reset_password)
        .map((p) => p.user_id);

      const { error } = await supabase
        .from('profiles')
        .update({ must_reset_password: true })
        .in('user_id', ids);
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        user_id: currentUser?.id,
        action: 'bulk_force_password_reset',
        entity_type: 'user',
        details: { count: ids.length, user_ids: ids },
      });
      toast({
        title: '✅ Reset required',
        description: `${ids.length} user(s) will be forced to change password.`,
        duration: 10000,
        action: previouslyClear.length > 0 ? (
          <ToastAction altText="Undo" onClick={() => undoBulkReset(previouslyClear)}>
            <Undo2 className="mr-1 h-3 w-3" />
            Undo
          </ToastAction>
        ) : undefined,
      });
      setSelectedIds(new Set());
      setConfirmResetOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Bulk action failed', description: err?.message, variant: 'destructive' });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkRoleChange = async (newRole: AppRole) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds).filter((id) => id !== currentUser?.id);
      // Snapshot previous roles
      const { data: prevRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', ids);
      const snapshot: Array<{ user_id: string; role: AppRole | null }> = ids.map((uid) => ({
        user_id: uid,
        role: (prevRoles?.find((r) => r.user_id === uid)?.role as AppRole | undefined) ?? null,
      }));

      for (const uid of ids) {
        const { data: existing } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', uid)
          .maybeSingle();
        if (existing) {
          await supabase.from('user_roles').update({ role: newRole }).eq('user_id', uid);
        } else {
          await supabase.from('user_roles').insert({ user_id: uid, role: newRole });
        }
      }
      await supabase.from('audit_logs').insert({
        user_id: currentUser?.id,
        action: 'bulk_role_change',
        entity_type: 'user',
        details: { count: ids.length, new_role: newRole, user_ids: ids },
      });
      toast({
        title: '✅ Roles updated',
        description: `${ids.length} user(s) set to ${newRole}.`,
        duration: 10000,
        action: (
          <ToastAction altText="Undo" onClick={() => undoBulkRoleChange(snapshot)}>
            <Undo2 className="mr-1 h-3 w-3" />
            Undo
          </ToastAction>
        ),
      });
      setSelectedIds(new Set());
      setPendingRole(null);
      fetchUsers();
    } catch (err: any) {
      toast({ title: 'Bulk action failed', description: err?.message, variant: 'destructive' });
    } finally {
      setBulkLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'staff' as AppRole,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const usersWithRoles: UserWithRole[] = [];
      for (const profile of profiles || []) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.user_id)
          .single();

        usersWithRoles.push({
          ...profile,
          role: roleData?.role as AppRole | undefined,
        });
      }

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error loading users',
        description: 'Failed to load users. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sendCredentialsSms = async (phone: string, fullName: string, email: string, password: string) => {
    if (!phone) return;
    try {
      const message = `Hello ${fullName}, your UMS Document Portal account has been created.\n\nLogin: ${email}\nPassword: ${password}\nPortal: https://umsdoc.netlify.app/\n\nPlease change your password after first login.`;
      await supabase.functions.invoke('send-sms', {
        body: { mobile: phone, message, type: 'user_invitation' },
      });
    } catch (e) {
      console.error('Failed to send invitation SMS:', e);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password || !formData.full_name) {
      toast({
        title: 'Missing fields',
        description: 'Email, password, and full name are required',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Invalid password',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.full_name,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: authData.user.id,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone || null,
      });

      if (profileError) throw profileError;

      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: authData.user.id,
        role: formData.role,
      });

      if (roleError) throw roleError;

      // Log the action
      await supabase.from('audit_logs').insert({
        user_id: currentUser?.id,
        action: 'user_created',
        entity_type: 'user',
        details: { email: formData.email, role: formData.role },
      });

      // Send SMS invitation if phone number provided
      if (formData.phone) {
        await sendCredentialsSms(formData.phone, formData.full_name, formData.email, formData.password);
        toast({
          title: '✅ User created successfully',
          description: `${formData.full_name} has been created and an SMS invitation was sent.`,
        });
      } else {
        toast({
          title: '✅ User created successfully',
          description: `${formData.full_name} has been added to the system.`,
        });
      }

      setFormData({
        email: '',
        password: '',
        full_name: '',
        phone: '',
        role: 'staff',
      });
      setDialogOpen(false);
      fetchUsers();
    } catch (error) {
      toast({
        title: 'Failed to create user',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = (user: UserWithRole) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleDeleteUser = async (userToDelete: UserWithRole) => {
    if (userToDelete.user_id === currentUser?.id) {
      toast({
        title: 'Cannot delete',
        description: 'You cannot delete your own account',
        variant: 'destructive',
      });
      return;
    }

    try {
      await supabase.from('user_roles').delete().eq('user_id', userToDelete.user_id);
      const { error } = await supabase.from('profiles').delete().eq('user_id', userToDelete.user_id);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_id: currentUser?.id,
        action: 'user_deleted',
        entity_type: 'user',
        entity_id: userToDelete.user_id,
        details: { email: userToDelete.email, full_name: userToDelete.full_name },
      });

      toast({
        title: '✅ User deleted',
        description: `${userToDelete.full_name} has been removed from the system.`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Failed to delete user',
        description: 'The user may have associated data that prevents deletion.',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadgeVariant = (role?: AppRole) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'staff':
        return 'default';
      case 'customer':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <AppLayout title="User Management" description="Manage system users and roles">
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system. If a phone number is provided, an SMS invitation with login credentials will be sent.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  placeholder="User's full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (for SMS invitation)</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+254..."
                />
                <p className="text-xs text-muted-foreground">
                  <Send className="inline h-3 w-3 mr-1" />
                  Login credentials will be sent via SMS if a phone number is provided
                </p>
              </div>
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) =>
                    setFormData({ ...formData, role: v as AppRole })
                  }
                >
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
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create User'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Select
            value=""
            onValueChange={(v) => setPendingRole(v as AppRole)}
            disabled={bulkLoading}
          >
            <SelectTrigger className="h-8 w-[160px]">
              <SelectValue placeholder="Change role to..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmResetOpen(true)}
            disabled={bulkLoading}
          >
            <ShieldAlert className="mr-2 h-4 w-4" />
            Force password reset
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Bulk role change confirmation */}
      <AlertDialog
        open={pendingRole !== null}
        onOpenChange={(open) => !open && setPendingRole(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change role for {selectedIds.size} user(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to set the role of <strong>{selectedIds.size}</strong> selected user(s) to{' '}
              <strong className="capitalize">{pendingRole}</strong>. This affects what they can see
              and do across the system. You can undo within 10 seconds via the toast notification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (pendingRole) handleBulkRoleChange(pendingRole);
              }}
              disabled={bulkLoading}
            >
              {bulkLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                'Confirm change'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk force password reset confirmation */}
      <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force password reset for {selectedIds.size} user(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              The selected user(s) will be required to set a new password the next time they open
              the app. You can undo within 10 seconds via the toast notification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBulkForceReset();
              }}
              disabled={bulkLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                'Force reset'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No users found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search' : 'Add your first user'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filteredUsers.length > 0 && selectedIds.size === filteredUsers.length}
                      onCheckedChange={(checked) => {
                        setSelectedIds(checked ? new Set(filteredUsers.map((u) => u.user_id)) : new Set());
                      }}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Created</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id} data-state={selectedIds.has(u.user_id) ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(u.user_id)}
                        onCheckedChange={() => toggleSelected(u.user_id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          {u.avatar_url && <AvatarImage src={u.avatar_url} alt={u.full_name} />}
                          <AvatarFallback className="text-[10px]">
                            {u.full_name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{u.full_name}</span>
                        {u.must_reset_password && (
                          <Badge variant="destructive" className="text-[10px] px-1">reset</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {u.phone || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(u.role)} className="capitalize">
                        {u.role || 'No role'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditUser(u)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/users/${u.user_id}/activity`}>
                              <Activity className="mr-2 h-4 w-4" />
                              View activity
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleForceReset(u)}
                            disabled={u.user_id === currentUser?.id}
                          >
                            <KeyRound className="mr-2 h-4 w-4" />
                            Force password reset
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-destructive"
                                disabled={u.user_id === currentUser?.id}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete <strong>{u.full_name}</strong>? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(u)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Password Expiry Settings */}
      <div className="mt-6">
        <PasswordExpirySettings />
      </div>

      <EditUserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={selectedUser}
        onSuccess={fetchUsers}
      />
    </AppLayout>
  );
}
