import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole =
  | 'admin' | 'staff' | 'customer' | 'manager' | 'user'
  | 'gm' | 'hr_manager' | 'hod'
  | 'it_admin' | 'it_staff';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  /** Primary role — the highest-privilege role for backwards compat.
   *  Use `roles` to check all roles a user has. */
  role: AppRole | null;
  /** All roles assigned to this user. */
  roles: AppRole[];
  profile: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url?: string | null;
    must_reset_password?: boolean;
    designation?: string | null;
    hr_department?: string | null;
    staff_number?: string | null;
    hr_employee_id?: string | null;
  } | null;
  customerId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isStaff: boolean;
  isCustomer: boolean;
  isGM: boolean;
  isHrManager: boolean;
  isHOD: boolean;
  isHrUser: boolean;
  isItAdmin: boolean;
  isItStaff: boolean;
  /** Check if the user has a specific role. */
  hasRole: (r: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Role priority — used to pick the "primary" role for backwards compat. */
const ROLE_PRIORITY: AppRole[] = [
  'admin', 'gm', 'hr_manager', 'it_admin', 'hod', 'it_staff', 'staff', 'customer', 'manager', 'user',
];

function pickPrimaryRole(rawRoles: string[]): AppRole | null {
  // Normalise legacy roles
  const mapped = rawRoles.map(r => {
    if (r === 'manager' || r === 'user') return 'staff' as AppRole;
    return r as AppRole;
  });
  // Return the highest-priority role
  for (const r of ROLE_PRIORITY) {
    if (mapped.includes(r)) return r;
  }
  return mapped[0] ?? null;
}

const SUPER_ADMIN_EMAIL = 'amsterntechhub@gmail.com';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch ALL roles for this user
      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const rawRoles = (roleRows ?? []).map((r: any) => r.role as string);
      const mappedRoles: AppRole[] = rawRoles.map(r =>
        r === 'manager' || r === 'user' ? 'staff' : r as AppRole
      );
      const primaryRole = pickPrimaryRole(rawRoles);

      setRoles(mappedRoles);
      setRole(primaryRole);

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, avatar_url, must_reset_password, designation, hr_department, staff_number, hr_employee_id')
        .eq('user_id', userId)
        .single();

      if (profileData) setProfile(profileData);

      // Customer ID
      if (primaryRole === 'customer') {
        const { data: customerData } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', userId)
          .single();
        if (customerData) setCustomerId(customerData.id);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => { fetchUserData(session.user.id); }, 0);
        } else {
          setRoles([]);
          setRole(null);
          setProfile(null);
          setCustomerId(null);
        }

        if (event === 'SIGNED_OUT') setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
    setRole(null);
    setProfile(null);
    setCustomerId(null);
  };

  const isSuperAdmin = (user?.email ?? '').toLowerCase() === SUPER_ADMIN_EMAIL;

  const hasRole = (r: AppRole) => isSuperAdmin || roles.includes(r);

  const value: AuthContextType = {
    user,
    session,
    role,
    roles,
    profile,
    customerId,
    loading,
    signIn,
    signOut,
    hasRole,
    isAdmin:     hasRole('admin')      || isSuperAdmin,
    isStaff:     hasRole('staff'),
    isCustomer:  hasRole('customer'),
    isGM:        hasRole('gm')         || isSuperAdmin,
    isHrManager: hasRole('hr_manager') || isSuperAdmin,
    isHOD:       hasRole('hod')        || isSuperAdmin,
    isHrUser:    isSuperAdmin || roles.some(r => ['gm','hr_manager','hod','staff'].includes(r)),
    isItAdmin:   hasRole('it_admin')   || isSuperAdmin,
    isItStaff:   hasRole('it_staff')   || hasRole('it_admin') || isSuperAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
