import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  CalendarClock, AlertTriangle, CheckCircle, Clock, Search, FileText, Calendar, RefreshCw,
} from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';

interface ExpiringDoc {
  id: string;
  title: string;
  file_name: string;
  expiry_date: string | null;
  status: string;
  created_at: string;
  customer_name: string;
  category_name: string;
}

export default function DocumentExpiry() {
  const [documents, setDocuments] = useState<ExpiringDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editDoc, setEditDoc] = useState<ExpiringDoc | null>(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, file_name, expiry_date, status, created_at, customer_id, category_id')
        .order('expiry_date', { ascending: true, nullsFirst: false });

      if (error) throw error;

      const customerIds = [...new Set((data || []).map(d => d.customer_id))];
      const categoryIds = [...new Set((data || []).map(d => d.category_id))];

      const { data: customers } = await supabase.from('customers').select('id, full_name').in('id', customerIds);
      const { data: categories } = await supabase.from('document_categories').select('id, name').in('id', categoryIds);

      const custMap = Object.fromEntries((customers || []).map(c => [c.id, c.full_name]));
      const catMap = Object.fromEntries((categories || []).map(c => [c.id, c.name]));

      setDocuments((data || []).map(d => ({
        ...d,
        expiry_date: (d as any).expiry_date || null,
        customer_name: custMap[d.customer_id] || 'Unknown',
        category_name: catMap[d.category_id] || 'Unknown',
      })));
    } catch (e) {
      console.error('Error fetching documents:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleSetExpiry = async () => {
    if (!editDoc || !expiryDate) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('documents')
        .update({ expiry_date: new Date(expiryDate).toISOString() } as any)
        .eq('id', editDoc.id);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: 'set_document_expiry',
        entity_type: 'document',
        entity_id: editDoc.id,
        details: { document_title: editDoc.title, expiry_date: expiryDate },
      });

      toast({ title: 'Expiry date set', description: `Expiry updated for "${editDoc.title}"` });
      setEditDoc(null);
      setExpiryDate('');
      fetchDocs();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { label: 'No Expiry', variant: 'secondary' as const, icon: Clock };
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, variant: 'destructive' as const, icon: AlertTriangle };
    if (days <= 30) return { label: `${days}d left`, variant: 'default' as const, icon: AlertTriangle };
    if (days <= 90) return { label: `${days}d left`, variant: 'secondary' as const, icon: CalendarClock };
    return { label: `${days}d left`, variant: 'outline' as const, icon: CheckCircle };
  };

  const now = new Date();
  const expired = documents.filter(d => d.expiry_date && new Date(d.expiry_date) < now);
  const expiringSoon = documents.filter(d => d.expiry_date && differenceInDays(new Date(d.expiry_date), now) >= 0 && differenceInDays(new Date(d.expiry_date), now) <= 30);
  const noExpiry = documents.filter(d => !d.expiry_date);

  const filtered = documents.filter(d => {
    if (filter === 'expired') return d.expiry_date && new Date(d.expiry_date) < now;
    if (filter === 'expiring') return d.expiry_date && differenceInDays(new Date(d.expiry_date), now) >= 0 && differenceInDays(new Date(d.expiry_date), now) <= 30;
    if (filter === 'no-expiry') return !d.expiry_date;
    if (filter === 'valid') return d.expiry_date && differenceInDays(new Date(d.expiry_date), now) > 30;
    return true;
  }).filter(d => {
    if (!search) return true;
    const s = search.toLowerCase();
    return d.title.toLowerCase().includes(s) || d.customer_name.toLowerCase().includes(s) || d.category_name.toLowerCase().includes(s);
  });

  return (
    <AppLayout title="Document Expiry & Renewals" description="Track document expirations and manage renewals">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('expired')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{expired.length}</p>
              <p className="text-xs text-muted-foreground">Expired</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('expiring')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <CalendarClock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{expiringSoon.length}</p>
              <p className="text-xs text-muted-foreground">Expiring Soon</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('valid')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{documents.length - expired.length - expiringSoon.length - noExpiry.length}</p>
              <p className="text-xs text-muted-foreground">Valid</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('no-expiry')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{noExpiry.length}</p>
              <p className="text-xs text-muted-foreground">No Expiry Set</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Documents</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="expiring">Expiring Soon (30d)</SelectItem>
            <SelectItem value="valid">Valid</SelectItem>
            <SelectItem value="no-expiry">No Expiry Set</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchDocs}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">No documents found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead className="hidden md:table-cell">Customer</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(doc => {
                    const expiry = getExpiryStatus(doc.expiry_date);
                    return (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{doc.title}</p>
                            <p className="text-xs text-muted-foreground md:hidden">{doc.customer_name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{doc.customer_name}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="text-xs">{doc.category_name}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {doc.expiry_date ? format(new Date(doc.expiry_date), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={expiry.variant} className="text-xs gap-1">
                            <expiry.icon className="h-3 w-3" />
                            {expiry.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditDoc(doc);
                              setExpiryDate(doc.expiry_date ? format(new Date(doc.expiry_date), 'yyyy-MM-dd') : '');
                            }}
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            Set Expiry
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editDoc} onOpenChange={() => setEditDoc(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Document Expiry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">{editDoc?.title}</p>
              <p className="text-xs text-muted-foreground">{editDoc?.customer_name} • {editDoc?.category_name}</p>
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setExpiryDate(format(addDays(new Date(), 30), 'yyyy-MM-dd'))}>+30 days</Button>
              <Button variant="outline" size="sm" onClick={() => setExpiryDate(format(addDays(new Date(), 90), 'yyyy-MM-dd'))}>+90 days</Button>
              <Button variant="outline" size="sm" onClick={() => setExpiryDate(format(addDays(new Date(), 365), 'yyyy-MM-dd'))}>+1 year</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDoc(null)}>Cancel</Button>
            <Button onClick={handleSetExpiry} disabled={saving || !expiryDate}>
              {saving ? 'Saving...' : 'Save Expiry Date'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
