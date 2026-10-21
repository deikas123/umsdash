import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, Clock, FileText, Trash2, User } from 'lucide-react';
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
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('deletion_requests')
        .select('*, document:documents(id, title, file_name, file_path)')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
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
  }, [user, statusFilter]);

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
      <div className="flex gap-3 mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Trash2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No {statusFilter !== 'all' ? statusFilter : ''} deletion requests</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <Card key={req.id}>
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
                        Requested by {req.requester_name} on {format(new Date(req.created_at), 'PPp')}
                      </p>
                      {req.reason && <p className="italic">Reason: "{req.reason}"</p>}
                      {req.document?.file_name && <p>File: {req.document.file_name}</p>}
                    </div>
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" onClick={() => handleApprove(req)} className="bg-green-600 hover:bg-green-700">
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
          ))}
        </div>
      )}
    </AppLayout>
  );
}
