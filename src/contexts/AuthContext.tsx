import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export type AppRole = 'admin' | 'staff' | 'customer' | 'manager' | 'user' | 'gm' | 'hr_manager' | 'hod';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<AuthContextType['profile']>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      let mappedRole: AppRole | null = null;
      if (roleData) {
        // Map uptime-hub legacy roles to ums-docs-vault roles
        // HR roles (gm, hr_manager, hod) pass through unchanged
        // Only 'manager' and 'user' legacy roles map to 'staff'
        const rawRole = roleData.role as string;
        if (rawRole === 'manager' || rawRole === 'user') {
          mappedRole = 'staff';
        } else {
          mappedRole = rawRole as AppRole;
        }
        setRole(mappedRole);
      }

      // Fetch user profile including HR fields
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, avatar_url, must_reset_password, designation, hr_department, staff_number, hr_employee_id')
        .eq('user_id', userId)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // If customer (use mapped role, not raw DB value), fetch customer ID
      if (mappedRole === 'customer') {
        const { data: customerData } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (customerData) {
          setCustomerId(customerData.id);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer data fetching to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setProfile(null);
          setCustomerId(null);
        }

        if (event === 'SIGNED_OUT') {
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserData(session.user.id).finally(() => {
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
    setCustomerId(null);
  };

  const SUPER_ADMIN_EMAIL = 'amsterntechhub@gmail.com';
  const isSuperAdmin = (user?.email ?? '').toLowerCase() === SUPER_ADMIN_EMAIL;

  const value: AuthContextType = {
    user,
    session,
    role,
    profile,
    customerId,
    loading,
    signIn,
    signOut,
    isAdmin: role === 'admin' || isSuperAdmin,
    isStaff: role === 'staff',
    isCustomer: role === 'customer',
    isGM: role === 'gm' || isSuperAdmin,
    isHrManager: role === 'hr_manager' || isSuperAdmin,
    isHOD: role === 'hod' || isSuperAdmin,
    // Super admin can access HR app too
    isHrUser: role === 'gm' || role === 'hr_manager' || role === 'hod' || role === 'staff' || isSuperAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
