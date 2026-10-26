import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

export type AppId = 'docs' | 'ops';
export type AppRole = Database['public']['Enums']['app_role'];

/** A single user row projected by the `user_activity_summary` view. */
export interface UserHubUser {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  avatar_url: string | null;
  must_reset_password: boolean;
  role: AppRole | null;
  docs_uploaded: number;
  tasks_created: number;
  audit_events: number;
  last_active_at: string | null;
  current_streak: number | null;
  total_xp: number | null;
  level_name: number | null;
  designation: string | null;
  staff_number: string | null;
  hr_employee_id: string | null;
  hr_role?: string | null;
}

export interface UserAppAccessRow {
  id: string;
  user_id: string;
  app_id: AppId;
  granted_by: string | null;
  granted_at: string;
}

export interface DepartmentRow {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface UpdateUserInput {
  full_name?: string;
  phone?: string | null;
  department?: string | null;
  role?: AppRole;
  must_reset_password?: boolean;
}

export interface BulkInviteResult {
  success: Array<{ line: string }>;
  failed: Array<{ line: string; message: string }>;
}

const USERS_KEY = ['user-hub', 'users'] as const;
const DEPARTMENTS_KEY = ['user-hub', 'departments'] as const;
const APP_ACCESS_KEY = ['user-hub', 'app-access'] as const;

/**
 * useUserHub — unified user management data + mutations for the admin
 * User Hub page. Reads from the `user_activity_summary` view, the
 * `departments` table and the `user_app_access` table, and exposes
 * mutations that invalidate the relevant TanStack Query keys.
 */
export function useUserHub() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: USERS_KEY,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_activity_summary')
        .select('*')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as UserHubUser[];
    },
  });

  const departmentsQuery = useQuery({
    queryKey: DEPARTMENTS_KEY,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, color, created_at')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as DepartmentRow[];
    },
  });

  const appAccessQuery = useQuery({
    queryKey: APP_ACCESS_KEY,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_app_access')
        .select('id, user_id, app_id, granted_by, granted_at')
        .order('user_id', { ascending: true });
      if (error) throw error;
      return (data ?? []) as UserAppAccessRow[];
    },
  });

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: USERS_KEY });
  const invalidateAccess = () => queryClient.invalidateQueries({ queryKey: APP_ACCESS_KEY });
  const invalidateAll = () =>
    Promise.all([invalidateUsers(), invalidateAccess(), queryClient.invalidateQueries({ queryKey: DEPARTMENTS_KEY })]);

  /** Update a user's profile fields and/or role. */
  async function updateUser(userId: string, patch: UpdateUserInput): Promise<void> {
    const profileUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.full_name !== undefined) profileUpdate.full_name = patch.full_name;
    if (patch.phone !== undefined) profileUpdate.phone = patch.phone;
    if (patch.department !== undefined) profileUpdate.department = patch.department;
    if (patch.must_reset_password !== undefined) profileUpdate.must_reset_password = patch.must_reset_password;

    const { error: profErr } = await supabase.from('profiles').update(profileUpdate).eq('user_id', userId);
    if (profErr) throw profErr;

    if (patch.role !== undefined) {
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase.from('user_roles').update({ role: patch.role }).eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: patch.role });
        if (error) throw error;
      }
    }

    await supabase.from('audit_logs').insert({
      user_id: user?.id ?? null,
      action: 'user_updated',
      entity_type: 'user',
      entity_id: userId,
      details: {
        full_name: patch.full_name,
        phone: patch.phone,
        department: patch.department,
        role: patch.role,
        must_reset_password: patch.must_reset_password,
      },
    });

    await invalidateUsers();
  }

  /** Grant or revoke a single app for a user. */
  async function updateAppAccess(userId: string, appId: AppId, granted: boolean): Promise<void> {
    if (granted) {
      const { error } = await supabase
        .from('user_app_access')
        .upsert(
          { user_id: userId, app_id: appId, granted_by: user?.id ?? null },
          { onConflict: 'user_id,app_id' },
        );
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('user_app_access')
        .delete()
        .eq('user_id', userId)
        .eq('app_id', appId);
      if (error) throw error;
    }

    await supabase.from('audit_logs').insert({
      user_id: user?.id ?? null,
      action: granted ? 'app_access_granted' : 'app_access_revoked',
      entity_type: 'user',
      entity_id: userId,
      details: { app_id: appId },
    });

    await invalidateAccess();
  }

  /** Grant or revoke a single app for many users at once. */
  async function bulkUpdateAppAccess(userIds: string[], appId: AppId, granted: boolean): Promise<void> {
    if (granted) {
      const rows = userIds.map((uid) => ({ user_id: uid, app_id: appId, granted_by: user?.id ?? null }));
      const { error } = await supabase
        .from('user_app_access')
        .upsert(rows, { onConflict: 'user_id,app_id' });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('user_app_access')
        .delete()
        .in('user_id', userIds)
        .eq('app_id', appId);
      if (error) throw error;
    }

    await supabase.from('audit_logs').insert({
      user_id: user?.id ?? null,
      action: granted ? 'bulk_app_access_granted' : 'bulk_app_access_revoked',
      entity_type: 'user',
      details: { app_id: appId, count: userIds.length, user_ids: userIds },
    });

    await invalidateAccess();
  }

  /** Reset a user's password via the admin-reset-password edge function. */
  async function resetPassword(userId: string, newPassword: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('admin-reset-password', {
      body: { user_id: userId, new_password: newPassword },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
  }

  /** Create a new user (auth + profile + role + app access). Returns the new user id. */
  async function inviteUser(
    email: string,
    password: string,
    fullName: string,
    role: AppRole,
    apps: AppId[],
  ): Promise<string> {
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (signUpError) throw signUpError;
    if (!authData.user) throw new Error('Failed to create auth user');

    const newUserId = authData.user.id;

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ user_id: newUserId, full_name: fullName, email });
    if (profileError) throw profileError;

    const { error: roleError } = await supabase.from('user_roles').insert({ user_id: newUserId, role });
    if (roleError) throw roleError;

    if (apps.length > 0) {
      const { error: accessError } = await supabase
        .from('user_app_access')
        .upsert(
          apps.map((appId) => ({ user_id: newUserId, app_id: appId, granted_by: user?.id ?? null })),
          { onConflict: 'user_id,app_id' },
        );
      if (accessError) throw accessError;
    }

    await supabase.from('audit_logs').insert({
      user_id: user?.id ?? null,
      action: 'user_created',
      entity_type: 'user',
      entity_id: newUserId,
      details: { email, role, apps },
    });

    return newUserId;
  }

  /** Invite many users from `email,password,full name` lines. */
  async function bulkInvite(lines: string[], role: AppRole, apps: AppId[]): Promise<BulkInviteResult> {
    const success: Array<{ line: string }> = [];
    const failed: Array<{ line: string; message: string }> = [];

    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim());
      const [email, password, ...nameParts] = parts;
      const full_name = nameParts.join(',').trim();
      if (!email || !password || !full_name) {
        failed.push({ line, message: 'Invalid format — expected: email,password,full name' });
        continue;
      }
      try {
        await inviteUser(email, password, full_name, role, apps);
        success.push({ line });
      } catch (err: unknown) {
        failed.push({ line, message: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    await invalidateAll();
    return { success, failed };
  }

  return {
    users: usersQuery.data ?? [],
    departments: departmentsQuery.data ?? [],
    appAccess: appAccessQuery.data ?? [],
    loading: usersQuery.isLoading,
    isLoadingUsers: usersQuery.isLoading,
    isLoadingDepartments: departmentsQuery.isLoading,
    isLoadingAppAccess: appAccessQuery.isLoading,
    updateUser,
    updateAppAccess,
    bulkUpdateAppAccess,
    resetPassword,
    inviteUser,
    bulkInvite,
    refetch: () => invalidateAll(),
  };
}
