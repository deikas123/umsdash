import { ReactNode } from 'react';
import { useOrgSettings } from '@/hooks/useOrgSettings';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle } from 'lucide-react';

interface Props { children: ReactNode }

export function MaintenanceGate({ children }: Props) {
  const { settings, loading } = useOrgSettings();
  const { isAdmin } = useAuth();

  // Admins always bypass maintenance mode; wait for settings to load
  if (loading || isAdmin || !settings.maintenance_mode) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
      <div className="flex flex-col items-center gap-4 max-w-md">
        <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-900/30">
          <AlertTriangle className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold">Maintenance in Progress</h1>
        <p className="text-muted-foreground">
          UMS Hub is currently undergoing scheduled maintenance. We'll be back shortly. Please check back later.
        </p>
        <p className="text-xs text-muted-foreground">If you need immediate assistance, contact your system administrator.</p>
      </div>
    </div>
  );
}
