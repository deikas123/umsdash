import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Monitor, Loader2, LogOut, Shield, ShieldCheck, Laptop } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function Sessions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const loginTime = user?.created_at
    ? format(new Date(user.created_at), 'MMM d, yyyy HH:mm')
    : 'Unknown';

  const handleSignOutOthers = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      if (error) throw error;
      toast({ title: 'Signed out', description: 'All other sessions have been signed out.' });
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to sign out other sessions.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Sessions" description="Manage your active login sessions">
      {/* Page header */}
      <div className="flex flex-col gap-1 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Monitor and manage all active login sessions for your account.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
              Account secure
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Current session card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Active Sessions</span>
              </div>

              {/* Current session row */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="px-4 py-3 text-left font-medium sticky top-0 bg-card">Device</th>
                      <th className="px-4 py-3 text-left font-medium sticky top-0 bg-card">User</th>
                      <th className="px-4 py-3 text-left font-medium sticky top-0 bg-card">Started</th>
                      <th className="px-4 py-3 text-left font-medium sticky top-0 bg-card">Status</th>
                      <th className="px-4 py-3 text-right font-medium sticky top-0 bg-card">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <>
                        {[1, 2].map((i) => (
                          <tr key={i} className="border-b">
                            <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                            <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                            <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                            <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                            <td className="px-4 py-3"><Skeleton className="h-7 w-20 ml-auto" /></td>
                          </tr>
                        ))}
                      </>
                    ) : user ? (
                      <tr className="border-b last:border-0 even:bg-muted/30 hover:bg-muted/50 transition-colors bg-primary/5">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-background">
                              <Laptop className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">Web Browser</p>
                              <p className="text-xs text-muted-foreground">Current device</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium truncate max-w-[160px]">{user.email}</p>
                            <p className="text-xs text-muted-foreground">Authenticated</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{loginTime}</td>
                        <td className="px-4 py-3">
                          <Badge variant="default" className="gap-1">
                            <Shield className="h-3 w-3" />
                            Current
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs text-muted-foreground italic">This session</span>
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Monitor className="h-8 w-8 opacity-40" />
                            <p className="font-medium">No active sessions</p>
                            <p className="text-xs">You are not currently signed in.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-muted-foreground px-1">
                Sessions are managed by Supabase Auth. Only your current session is visible here.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Revoke other sessions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                  <LogOut className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="font-semibold">Sign Out Other Sessions</p>
                  <p className="text-sm text-muted-foreground">
                    Revoke access from all other devices and browsers where you're currently signed in.
                    This action cannot be undone — those devices will need to sign in again.
                  </p>
                  <div className="pt-3">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={loading}>
                          {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <LogOut className="mr-2 h-4 w-4" />
                          )}
                          Sign Out All Other Sessions
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Sign out other sessions?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will immediately revoke access from all other devices and browsers
                            signed in to your account. Your current session will remain active.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleSignOutOthers}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Yes, sign out others
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
