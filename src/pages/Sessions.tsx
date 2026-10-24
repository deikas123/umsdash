import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Monitor, Loader2, LogOut, Shield } from 'lucide-react';
import { format } from 'date-fns';

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
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to sign out other sessions.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Sessions" description="Manage your active login sessions">
      <div className="max-w-xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Current Session
            </CardTitle>
            <CardDescription>This is your current active session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Shield className="h-5 w-5 text-green-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Web Browser</p>
                  <Badge variant="default" className="text-xs">Current</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Account created: {loginTime}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign Out Other Sessions</CardTitle>
            <CardDescription>
              Revoke access from all other devices and browsers where you're currently signed in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleSignOutOthers}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
              Sign Out All Other Sessions
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
