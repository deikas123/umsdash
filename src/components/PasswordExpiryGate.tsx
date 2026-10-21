import { useState } from 'react';
import { usePasswordExpiry } from '@/hooks/usePasswordExpiry';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert, Loader2, Eye, EyeOff, LogOut } from 'lucide-react';

/**
 * Blocks the entire app when the user's password has expired.
 * They must set a new password (or sign out) to continue.
 */
export function PasswordExpiryGate({ children }: { children: React.ReactNode }) {
  const { isExpired, mustReset, loading } = usePasswordExpiry();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({ title: 'Password too short', description: 'Use at least 8 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      await supabase
        .from('profiles')
        .update({ password_changed_at: new Date().toISOString(), must_reset_password: false })
        .eq('user_id', user!.id);
      toast({ title: 'Password updated', description: 'You can now continue using the system.' });
      setNewPassword('');
      setConfirmPassword('');
      // Force re-check
      window.location.reload();
    } catch (err: any) {
      toast({
        title: 'Failed to update password',
        description: err?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Don't gate anything until we know the state, and never gate signed-out users
  if (loading || !user || !isExpired) return <>{children}</>;

  return (
    <>
      {children}
      <Dialog open modal>
        <DialogContent
          className="max-w-md [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle className="text-center">
              {mustReset ? 'Password Reset Required' : 'Password Expired'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {mustReset
                ? 'An administrator has required you to set a new password before continuing.'
                : 'For security and compliance, you must set a new password before continuing.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="gate-new">New password</Label>
              <div className="relative">
                <Input
                  id="gate-new"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gate-confirm">Confirm new password</Label>
              <Input
                id="gate-confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update password & continue
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={signOut}
                className="w-full text-muted-foreground"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out instead
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
