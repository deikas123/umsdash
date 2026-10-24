import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { Search, Plus, Users, ChevronDown, ChevronRight, Edit, Mail, Phone, MapPin, FileText, ChevronLeft, ChevronRightIcon } from 'lucide-react';
import { EditCustomerDialog } from '@/components/customers/EditCustomerDialog';
import { CustomerDocuments } from '@/components/customers/CustomerDocuments';

interface Customer {
  id: string;
  account_number: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  user_id: string | null;
  document_count?: number;
}

const PAGE_SIZE = 10;

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, isAdmin, isStaff } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  
  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    account_number: '',
    full_name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = useCallback(async () => {
    if (!isAdmin && !isStaff) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // First, get total count
    let countQuery = supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    if (searchTerm) {
      countQuery = countQuery.or(`full_name.ilike.%${searchTerm}%,account_number.ilike.%${searchTerm}%`);
    }

    const { count } = await countQuery;
    const total = count || 0;
    setTotalCount(total);
    setTotalPages(Math.ceil(total / PAGE_SIZE));

    // Then, get paginated customers
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let dataQuery = supabase
      .from('customers')
      .select('*')
      .order('full_name')
      .range(from, to);

    if (searchTerm) {
      dataQuery = dataQuery.or(`full_name.ilike.%${searchTerm}%,account_number.ilike.%${searchTerm}%`);
    }

    const { data, error } = await dataQuery;

    if (!error && data) {
      // Get document counts for each customer
      const customerIds = data.map(c => c.id);
      if (customerIds.length > 0) {
        const { data: docCounts } = await supabase
          .from('documents')
          .select('customer_id')
          .in('customer_id', customerIds);

        // Count documents per customer
        const docCountMap: Record<string, number> = {};
        docCounts?.forEach(doc => {
          if (doc.customer_id) {
            docCountMap[doc.customer_id] = (docCountMap[doc.customer_id] || 0) + 1;
          }
        });

        // Add document count to customers
        const customersWithDocs = data.map(customer => ({
          ...customer,
          document_count: docCountMap[customer.id] || 0
        }));
        setCustomers(customersWithDocs);
      } else {
        setCustomers(data);
      }
    }
    setLoading(false);
  }, [searchTerm, page, isAdmin, isStaff]);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

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
      const { error } = await supabase.from('customers').insert({
        account_number: formData.account_number.trim(),
        full_name: formData.full_name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
      });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Account number already exists');
        }
        throw error;
      }

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

      setFormData({
        account_number: '',
        full_name: '',
        email: '',
        phone: '',
        address: '',
      });
      setDialogOpen(false);
      fetchCustomers();
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

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditDialogOpen(true);
  };

  const toggleExpand = (customerId: string) => {
    setExpandedCustomerId(expandedCustomerId === customerId ? null : customerId);
  };

  return (
    <AppLayout title="Customers" description="Manage customer accounts">
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or account number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add Customer</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number *</Label>
                <Input
                  id="account_number"
                  value={formData.account_number}
                  onChange={(e) =>
                    setFormData({ ...formData, account_number: e.target.value })
                  }
                  placeholder="e.g. UMS001234"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  placeholder="Customer full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="customer@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+254..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
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
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No customers found"
              description={searchTerm ? 'Try adjusting your search.' : 'Add your first customer to get started.'}
            />
          ) : (
            <div className="divide-y">
              {customers.map((customer) => (
                <Collapsible
                  key={customer.id}
                  open={expandedCustomerId === customer.id}
                  onOpenChange={() => toggleExpand(customer.id)}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0 mt-0.5">
                          {expandedCustomerId === customer.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      
                      <div className="flex-1 min-w-0">
                        <CollapsibleTrigger asChild>
                          <button className="text-left w-full">
                            <div className="font-medium text-foreground">
                              {customer.full_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {customer.account_number}
                            </div>
                          </button>
                        </CollapsibleTrigger>
                        
                        {/* Contact details - visible on larger screens */}
                        <div className="hidden md:flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          {customer.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {customer.email}
                            </span>
                          )}
                          {customer.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </span>
                          )}
                          {customer.address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {customer.address}
                            </span>
                          )}
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(customer);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <CollapsibleContent>
                    <div className="border-t bg-muted/30">
                      {/* Mobile contact details */}
                      <div className="md:hidden p-4 space-y-2 text-sm border-b">
                        {customer.email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <a href={`mailto:${customer.email}`} className="hover:underline">
                              {customer.email}
                            </a>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <a href={`tel:${customer.phone}`} className="hover:underline">
                              {customer.phone}
                            </a>
                          </div>
                        )}
                        {customer.address && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {customer.address}
                          </div>
                        )}
                      </div>

                      {/* Customer documents */}
                      <CustomerDocuments 
                        customerId={customer.id} 
                        customerName={customer.full_name}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} customers
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <EditCustomerDialog
        customer={selectedCustomer}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={fetchCustomers}
      />
    </AppLayout>
  );
}
