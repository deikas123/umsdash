import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, FileText, Trash2, User, Search, X } from 'lucide-react';
import { format } from 'date-fns';

interface DeletionRequest {
  id: string;
  document_id: string;
  requested_by: string;
  reason: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  document?: { id: string; title: string; file_name: string; file_path: string } | null;
  requester_name?: string;
}

export default function DeletionRequests() {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load all requests — filter on client so stats are always accurate
      const { data, error } = await supabase
        .from('deletion_requests')
        .select('*, document:documents(id, title, file_name, file_path)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch requester names
      const requesterIds = [...new Set((data || []).map(r => r.requested_by))];
      let nameMap: Record<string, string> = {};
      if (requesterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', requesterIds);
        if (profiles) {
          nameMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
        }
      }

      setRequests((data || []).map(r => ({
        ...r,
        requester_name: nameMap[r.requested_by] || 'Unknown',
      })));
    } catch (error: any) {
      console.error('Error fetching deletion requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const handleApprove = async (request: DeletionRequest) => {
    if (!confirm('Approve this deletion? The document will be permanently removed.')) return;
    try {
      // Delete the file from storage
      if (request.document?.file_path) {
        await supabase.storage.from('documents').remove([request.document.file_path]);
      }
      // Delete the document record
      if (request.document?.id) {
        await supabase.from('documents').delete().eq('id', request.document.id);
      }
      // Update request status
      const { error } = await supabase
        .from('deletion_requests')
        .update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', request.id);
      if (error) throw error;
      toast({ title: 'Approved', description: 'Document has been deleted' });
      fetchRequests();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleReject = async (request: DeletionRequest) => {
    if (!confirm('Reject this deletion request?')) return;
    try {
      const { error } = await supabase
        .from('deletion_requests')
        .update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', request.id);
      if (error) throw error;
      toast({ title: 'Rejected', description: 'Deletion request has been rejected' });
      fetchRequests();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved': return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-700 border-red-300"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AppLayout title="Deletion Requests" description="Review and manage document deletion requests">
      {/* Stats */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{requests.filter(r => r.status === 'pending').length}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{requests.filter(r => r.status === 'approved').length}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{requests.filter(r => r.status === 'rejected').length}</p>
              <p className="text-sm text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by document, requester..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        {(search || statusFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); }}>
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>
      ) : (() => {
        const displayed = requests.filter(req => {
          const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
          const matchesSearch = !search ||
            req.document?.title?.toLowerCase().includes(search.toLowerCase()) ||
            req.requester_name?.toLowerCase().includes(search.toLowerCase()) ||
            req.reason?.toLowerCase().includes(search.toLowerCase());
          return matchesStatus && matchesSearch;
        });
        return displayed.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Trash2 className="mx-auto h-12 w-12 mb-4 opacity-30" />
              <p className="font-medium">No {statusFilter !== 'all' ? statusFilter : ''} deletion requests</p>
              <p className="text-sm mt-1">
                {search ? 'Try adjusting your search' : 'All clear — no requests to review'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {displayed.map((req, idx) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.2 }}
              >
                <Card className={`transition-shadow hover:shadow-md ${
                  req.status === 'pending' ? 'border-amber-200 dark:border-amber-800' :
                  req.status === 'approved' ? 'border-green-200 dark:border-green-800' :
                  'border-red-200 dark:border-red-800'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate">{req.document?.title || 'Deleted Document'}</span>
                          {statusBadge(req.status)}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Requested by <span className="font-medium text-foreground">{req.requester_name}</span> on {format(new Date(req.created_at), 'PPp')}
                          </p>
                          {req.reason && <p className="italic">Reason: "{req.reason}"</p>}
                          {req.document?.file_name && <p>File: {req.document.file_name}</p>}
                        </div>
                      </div>
                      {req.status === 'pending' && (
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" onClick={() => handleApprove(req)} className="bg-green-600 hover:bg-green-700 text-white">
                            <CheckCircle2 className="h-4 w-4 mr-1" />Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleReject(req)}>
                            <XCircle className="h-4 w-4 mr-1" />Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        );
      })()}
    </AppLayout>
  );
}
