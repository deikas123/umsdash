import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { Search, Plus, Users, ChevronDown, ChevronRight, Edit, Mail, Phone, MapPin, FileText, ChevronLeft, ChevronRight as ChevronRightIcon, UserPlus } from 'lucide-react';
import { EditCustomerDialog } from '@/components/customers/EditCustomerDialog';
import { CustomerDocuments } from '@/components/customers/CustomerDocuments';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface Customer {
  id: string;
  account_number: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  user_id: string | null;
  document_count?: number;
  created_at?: string;
}

const PAGE_SIZE = 10;

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-green-100 text-green-700',
    'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700',
    'bg-teal-100 text-teal-700',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

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

  // Stats
  const [statsData, setStatsData] = useState({ total: 0, withDocs: 0, recent: 0 });

  // Form state
  const [formData, setFormData] = useState({
    account_number: '',
    full_name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!isAdmin && !isStaff) return;
    const { count: total } = await supabase.from('customers').select('*', { count: 'exact', head: true });
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: recent } = await supabase.from('customers').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo);
    // Customers with at least one document
    const { data: docData } = await supabase.from('documents').select('customer_id').not('customer_id', 'is', null);
    const uniqueCustomersWithDocs = new Set(docData?.map(d => d.customer_id) || []).size;
    setStatsData({ total: total || 0, withDocs: uniqueCustomersWithDocs, recent: recent || 0 });
  }, [isAdmin, isStaff]);

  const fetchCustomers = useCallback(async () => {
    if (!isAdmin && !isStaff) {
      setLoading(false);
      return;
    }

    setLoading(true);

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
      const customerIds = data.map(c => c.id);
      if (customerIds.length > 0) {
        const { data: docCounts } = await supabase
          .from('documents')
          .select('customer_id')
          .in('customer_id', customerIds);

        const docCountMap: Record<string, number> = {};
        docCounts?.forEach(doc => {
          if (doc.customer_id) {
            docCountMap[doc.customer_id] = (docCountMap[doc.customer_id] || 0) + 1;
          }
        });

        setCustomers(data.map(c => ({ ...c, document_count: docCountMap[c.id] || 0 })));
      } else {
        setCustomers(data);
      }
    }
    setLoading(false);
  }, [searchTerm, page, isAdmin, isStaff]);

  useEffect(() => { setPage(1); }, [searchTerm]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.account_number.trim() || !formData.full_name.trim()) {
      toast({ title: 'Missing fields', description: 'Account number and full name are required', variant: 'destructive' });
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
        if (error.code === '23505') throw new Error('Account number already exists');
        throw error;
      }

      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'customer_created',
        entity_type: 'customer',
        details: { account_number: formData.account_number },
      });

      toast({ title: 'Success', description: 'Customer created successfully' });

      setFormData({ account_number: '', full_name: '', email: '', phone: '', address: '' });
      setDialogOpen(false);
      fetchCustomers();
      fetchStats();
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
      {/* Page header */}
      <div className="flex flex-col gap-1 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Manage customer accounts and their documents</p>
          </div>
          <div className="flex items-center gap-2">
            {(isAdmin || isStaff) && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
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
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                        placeholder="e.g. UMS001234"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name *</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
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
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="customer@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+254..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Customer address"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={submitting}>
                        {submitting ? 'Creating...' : 'Create Customer'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {(isAdmin || isStaff) && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6"
        >
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statsData.total}</p>
                <p className="text-xs text-muted-foreground">Total Customers</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{statsData.withDocs}</p>
                <p className="text-xs text-muted-foreground">With Documents</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <UserPlus className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{statsData.recent}</p>
                <p className="text-xs text-muted-foreground">Added (30 days)</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Search bar */}
      <Card className="mb-6">
        <CardContent className="p-3">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or account number…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {searchTerm && (
                <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')}>Clear</Button>
              )}
              <Badge variant="secondary" className="text-xs whitespace-nowrap">
                {totalCount} customer{totalCount !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer list */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : customers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No customers found"
              description={searchTerm ? 'Try adjusting your search.' : 'Add your first customer to get started.'}
              action={
                isAdmin ? (
                  <Button variant="outline" onClick={() => setDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />Add Customer
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="divide-y">
              {customers.map((customer, idx) => (
                <Collapsible
                  key={customer.id}
                  open={expandedCustomerId === customer.id}
                  onOpenChange={() => toggleExpand(customer.id)}
                >
                  <div className={`p-4 transition-colors hover:bg-muted/30 ${expandedCustomerId === customer.id ? 'bg-muted/20' : ''}`}>
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback className={`text-sm font-medium ${getAvatarColor(customer.full_name)}`}>
                          {getInitials(customer.full_name)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Main info */}
                      <CollapsibleTrigger asChild>
                        <button className="flex-1 text-left min-w-0">
                          <div className="font-medium text-foreground truncate">{customer.full_name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{customer.account_number}</div>
                        </button>
                      </CollapsibleTrigger>

                      {/* Right side — doc count + last activity + expand */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {customer.document_count !== undefined && customer.document_count > 0 && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <FileText className="h-3 w-3" />
                            {customer.document_count}
                          </Badge>
                        )}
                        {customer.created_at && (
                          <span className="text-[11px] text-muted-foreground hidden sm:block">
                            Added {formatDistanceToNow(new Date(customer.created_at), { addSuffix: true })}
                          </span>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => { e.stopPropagation(); handleEdit(customer); }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            {expandedCustomerId === customer.id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>

                    {/* Contact details inline on md+ */}
                    <div className="hidden md:flex items-center gap-4 mt-1.5 ml-13 text-xs text-muted-foreground pl-[52px] flex-wrap">
                      {customer.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />{customer.email}
                        </span>
                      )}
                      {customer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />{customer.phone}
                        </span>
                      )}
                      {customer.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{customer.address}
                        </span>
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
                            <a href={`mailto:${customer.email}`} className="hover:underline">{customer.email}</a>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <a href={`tel:${customer.phone}`} className="hover:underline">{customer.phone}</a>
                          </div>
                        )}
                        {customer.address && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4" />{customer.address}
                          </div>
                        )}
                      </div>

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
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} customers
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
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
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

      <EditCustomerDialog
        customer={selectedCustomer}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={fetchCustomers}
      />
    </AppLayout>
  );
}
