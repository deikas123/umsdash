// src/hooks/useUserRole.ts
// Unified role hook covering both apps.
// ums-docs-vault roles: admin | staff | customer
// uptime-hub roles mapped: manager → staff, user → staff
import { useAuth } from '@/contexts/AuthContext';

export function useUserRole() {
  const { role, isAdmin, isStaff, isCustomer } = useAuth();

  return {
    role: role ?? 'customer',
    isAdmin,
    isStaff,
    isCustomer,
    // isManager is an alias for isStaff — uptime-hub components use isManager
    isManager: isAdmin || isStaff,
    loading: false, // role is loaded synchronously from AuthContext
  };
}
