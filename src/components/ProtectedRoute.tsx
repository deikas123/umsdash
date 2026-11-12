import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const SUPER_ADMIN_EMAIL = 'amsterntechhub@gmail.com';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
  requireSuperAdmin?: boolean;
}

export function ProtectedRoute({ children, allowedRoles, requireSuperAdmin }: ProtectedRouteProps) {
  const { user, role, roles, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isSuperAdmin = (user?.email ?? '').toLowerCase() === SUPER_ADMIN_EMAIL;

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/docs" replace />;
  }

  // Super admin bypasses all role checks
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Check if the user has ANY of the allowed roles (not just the primary one)
  if (allowedRoles && allowedRoles.length > 0) {
    const userHasRole = roles.some(r => allowedRoles.includes(r));
    if (!userHasRole) {
      // Redirect based on what primary role they do have
      if (role === 'customer') return <Navigate to="/docs/my-documents" replace />;
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
