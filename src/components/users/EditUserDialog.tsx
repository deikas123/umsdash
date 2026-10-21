import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Send, KeyRound } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserData {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role?: AppRole;
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
  onSuccess: () => void;
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: EditUserDialogProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    role: 'staff' as AppRole,
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name,
        phone: user.phone || '',
        role: user.role || 'staff',
      });
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setShowPasswordFields(false);
    }
  }, [user]);

  const sendPasswordResetSms = async (phone: string, fullName: string, email: string, password: string) => {
    if (!phone) return;
    try {
      const message = `Hello ${fullName}, your UMS Document Portal password has been reset.\n\nLogin: ${email}\nNew Password: ${password}\nPortal: https://umsdoc.netlify.app/\n\nPlease change your password after logging in.`;
      await supabase.functions.invoke('send-sms', {
        body: { mobile: phone, message, type: 'password_reset' },
      });
    } catch (e) {
      console.error('Failed to send password reset SMS:', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (!formData.full_name.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Full name is required',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim() || null,
        })
        .eq('user_id', user.user_id);

      if (profileError) throw profileError;

      if (formData.role !== user.role) {
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', user.user_id)
          .maybeSingle();

        if (existingRole) {
          const { error: updateError } = await supabase
            .from('user_roles')
            .update({ role: formData.role })
            .eq('user_id', user.user_id);
          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert({ user_id: user.user_id, role: formData.role });
          if (insertError) throw insertError;
        }
      }

      await supabase.from('audit_logs').insert({
        user_id: currentUser?.id,
        action: 'user_updated',
        entity_type: 'user',
        entity_id: user.user_id,
        details: {
          email: user.email,
          changes: {
            full_name: formData.full_name,
            phone: formData.phone,
            role: formData.role,
          },
        },
      });

      toast({
        title: '✅ User updated',
        description: `${formData.full_name}'s profile has been updated.`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Failed to update user',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user) return;

    if (!passwordData.newPassword) {
      toast({
        title: 'Missing password',
        description: 'Please enter a new password',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: 'Invalid password',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'New password and confirmation must match',
        variant: 'destructive',
      });
      return;
    }

    setResettingPassword(true);

    try {
      const { data: result, error: invokeError } = await supabase.functions.invoke(
        'reset-user-password',
        {
          body: {
            targetUserId: user.user_id,
            newPassword: passwordData.newPassword,
          },
        }
      );

      if (invokeError) {
        throw new Error((result as any)?.error || invokeError.message || 'Failed to reset password');
      }
      if (result && (result as any).error) {
        throw new Error((result as any).error);
      }

      // Send password reset SMS
      const phone = formData.phone || user.phone;
      if (phone) {
        await sendPasswordResetSms(phone, user.full_name, user.email, passwordData.newPassword);
        toast({
          title: '✅ Password reset',
          description: `Password has been reset and sent to ${user.full_name} via SMS.`,
        });
      } else {
        toast({
          title: '✅ Password reset',
          description: 'Password has been reset successfully. No phone number available for SMS notification.',
        });
      }

      setPasswordData({ newPassword: '', confirmPassword: '' });
      setShowPasswordFields(false);
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: 'Failed to reset password',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information, role, or reset password
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={user?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-full_name">Full Name *</Label>
            <Input
              id="edit-full_name"
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
              placeholder="User's full name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input
              id="edit-phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="+254..."
            />
          </div>
          <div className="space-y-2">
            <Label>Role *</Label>
            <Select
              value={formData.role}
              onValueChange={(v) =>
                setFormData({ ...formData, role: v as AppRole })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Password Reset Section */}
          <div className="border-t pt-4 mt-4">
            {!showPasswordFields ? (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => setShowPasswordFields(true)}
              >
                <KeyRound className="h-4 w-4" />
                Reset Password
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Password Reset</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPasswordFields(false);
                      setPasswordData({ newPassword: '', confirmPassword: '' });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, newPassword: e.target.value })
                    }
                    placeholder="Minimum 6 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                    placeholder="Confirm new password"
                  />
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Send className="h-3 w-3" />
                  New credentials will be sent via SMS if the user has a phone number
                </p>
                <Button
                  type="button"
                  className="w-full"
                  variant="default"
                  disabled={resettingPassword}
                  onClick={handleResetPassword}
                >
                  {resettingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
