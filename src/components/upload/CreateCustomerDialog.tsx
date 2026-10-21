import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus } from 'lucide-react';

interface CreateCustomerDialogProps {
  onCustomerCreated: (customerId: string) => void;
  trigger?: React.ReactNode;
}

export function CreateCustomerDialog({ onCustomerCreated, trigger }: CreateCustomerDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    account_number: '',
    full_name: '',
    email: '',
    phone: '',
    address: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.account_number.trim() || !formData.full_name.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Account number and full name are required',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.from('customers').insert({
        account_number: formData.account_number.trim(),
        full_name: formData.full_name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
      }).select('id').single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Account number already exists');
        }
        throw error;
      }

      // Log the action
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'customer_created',
        entity_type: 'customer',
        details: { account_number: formData.account_number },
      });

      toast({
        title: 'Success',
        description: 'Customer created successfully',
      });

      onCustomerCreated(data.id);
      setFormData({
        account_number: '',
        full_name: '',
        email: '',
        phone: '',
        address: '',
      });
      setDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create customer',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button type="button" variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Customer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new_account_number">Account Number *</Label>
            <Input
              id="new_account_number"
              value={formData.account_number}
              onChange={(e) =>
                setFormData({ ...formData, account_number: e.target.value })
              }
              placeholder="e.g. UMS001234"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_full_name">Full Name *</Label>
            <Input
              id="new_full_name"
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
              placeholder="Customer full name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_email">Email</Label>
            <Input
              id="new_email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="customer@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_phone">Phone</Label>
            <Input
              id="new_phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="+254..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_address">Address</Label>
            <Input
              id="new_address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="Customer address"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
