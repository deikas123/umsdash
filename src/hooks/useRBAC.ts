import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SUPER_ADMIN_EMAIL = 'amsterntechhub@gmail.com';

// --- types ---
export interface CustomRole {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  base_role: string;
  color: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_key: string;
  granted_at: string;
}

export interface UserCustomRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string | null;
  assigned_at: string;
}

// --- query keys ---
const ROLES_KEY = ['rbac', 'custom_roles'] as const;
const PERMISSIONS_KEY = ['rbac', 'role_permissions'] as const;
const USER_ROLES_KEY = ['rbac', 'user_custom_roles'] as const;

// --- main hook ---
export function useRBAC() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const rolesQuery = useQuery({
    queryKey: ROLES_KEY,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .order('is_system', { ascending: false })
        .order('display_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CustomRole[];
    },
  });

  const permissionsQuery = useQuery({
    queryKey: PERMISSIONS_KEY,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*');
      if (error) throw error;
      return (data ?? []) as RolePermission[];
    },
  });

  const userRolesQuery = useQuery({
    queryKey: USER_ROLES_KEY,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_custom_roles')
        .select('*');
      if (error) throw error;
      return (data ?? []) as UserCustomRole[];
    },
  });

  const invalidateAll = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
      queryClient.invalidateQueries({ queryKey: PERMISSIONS_KEY }),
      queryClient.invalidateQueries({ queryKey: USER_ROLES_KEY }),
    ]);

  const createRoleMutation = useMutation({
    mutationFn: async (input: {
      name: string;
      display_name: string;
      description?: string | null;
      base_role: string;
      color: string;
    }) => {
      const { data, error } = await supabase
        .from('custom_roles')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as CustomRole;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: {
      id: string;
      display_name?: string;
      description?: string | null;
      base_role?: string;
      color?: string;
    }) => {
      const { data, error } = await supabase
        .from('custom_roles')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as CustomRole;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('custom_roles')
        .delete()
        .eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(),
  });

  /** Replace all permissions for a role in one call. */
  const setRolePermissionsMutation = useMutation({
    mutationFn: async ({
      roleId,
      permissionKeys,
    }: {
      roleId: string;
      permissionKeys: string[];
    }) => {
      // Delete existing then re-insert
      const { error: delError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);
      if (delError) throw delError;

      if (permissionKeys.length > 0) {
        const rows = permissionKeys.map((permission_key) => ({
          role_id: roleId,
          permission_key,
        }));
        const { error: insError } = await supabase
          .from('role_permissions')
          .insert(rows);
        if (insError) throw insError;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PERMISSIONS_KEY }),
  });

  const assignRoleToUserMutation = useMutation({
    mutationFn: async ({
      userId,
      roleId,
    }: {
      userId: string;
      roleId: string;
    }) => {
      const { error } = await supabase
        .from('user_custom_roles')
        .upsert(
          { user_id: userId, role_id: roleId, assigned_by: user?.id ?? null },
          { onConflict: 'user_id,role_id' },
        );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USER_ROLES_KEY }),
  });

  const removeRoleFromUserMutation = useMutation({
    mutationFn: async ({
      userId,
      roleId,
    }: {
      userId: string;
      roleId: string;
    }) => {
      const { error } = await supabase
        .from('user_custom_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USER_ROLES_KEY }),
  });

  /** Returns permission keys granted to a specific user across all their roles. */
  function getUserPermissions(userId: string): string[] {
    const userRoles = (userRolesQuery.data ?? []).filter((ur) => ur.user_id === userId);
    const roleIds = new Set(userRoles.map((ur) => ur.role_id));
    return [
      ...new Set(
        (permissionsQuery.data ?? [])
          .filter((rp) => roleIds.has(rp.role_id))
          .map((rp) => rp.permission_key),
      ),
    ];
  }

  return {
    customRoles: rolesQuery.data ?? [],
    rolePermissions: permissionsQuery.data ?? [],
    userCustomRoles: userRolesQuery.data ?? [],
    loading: rolesQuery.isLoading || permissionsQuery.isLoading || userRolesQuery.isLoading,
    createRole: createRoleMutation.mutateAsync,
    updateRole: updateRoleMutation.mutateAsync,
    deleteRole: deleteRoleMutation.mutateAsync,
    setRolePermissions: setRolePermissionsMutation.mutateAsync,
    assignRoleToUser: assignRoleToUserMutation.mutateAsync,
    removeRoleFromUser: removeRoleFromUserMutation.mutateAsync,
    getUserPermissions,
  };
}

// --- permission check hook ---
export function usePermission(permissionKey: string): boolean {
  const { user } = useAuth();
  const isSuperAdmin = (user?.email ?? '').toLowerCase() === SUPER_ADMIN_EMAIL;

  const userRolesQuery = useQuery({
    queryKey: USER_ROLES_KEY,
    enabled: !!user && !isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_custom_roles')
        .select('*')
        .eq('user_id', user!.id);
      if (error) throw error;
      return (data ?? []) as UserCustomRole[];
    },
  });

  const roleIds = (userRolesQuery.data ?? []).map((ur) => ur.role_id);

  const permissionsQuery = useQuery({
    queryKey: [...PERMISSIONS_KEY, 'user', user?.id] as const,
    enabled: !!user && !isSuperAdmin && roleIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_key')
        .in('role_id', roleIds);
      if (error) throw error;
      return (data ?? []).map((rp) => rp.permission_key) as string[];
    },
  });

  // Super admin always gets true
  if (isSuperAdmin) return true;

  // Return false while still loading (graceful degradation)
  if (userRolesQuery.isLoading || permissionsQuery.isLoading) return false;

  // No custom roles assigned → no custom permissions
  if (roleIds.length === 0) return false;

  return (permissionsQuery.data ?? []).includes(permissionKey);
}
