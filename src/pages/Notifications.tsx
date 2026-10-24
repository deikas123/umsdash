import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { MessageSquare, CheckCircle2, XCircle, Clock, Search, Send, RefreshCw, Phone, X } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface SmsLog {
  id: string;
  sent_by: string;
  recipient_phone: string;
  recipient_name: string | null;
  message: string;
  sms_type: string;
  status: string;
  api_response: any;
  created_at: string;
}

export default function Notifications() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [statusTab, setStatusTab] = useState<'all' | 'delivered' | 'failed'>('all');
  const [resending, setResending] = useState<string | null>(null);
  const [confirmResend, setConfirmResend] = useState<SmsLog | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['sms-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sms_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as SmsLog[];
    },
  });

  const filtered = logs.filter((log) => {
    const matchesSearch =
      !search ||
      log.recipient_phone.includes(search) ||
      log.recipient_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.message.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || log.sms_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesTab = statusTab === 'all' || log.status === statusTab;
    return matchesSearch && matchesType && matchesStatus && matchesTab;
  });

  const hasFilters = search || typeFilter !== 'all' || statusFilter !== 'all';
  const clearFilters = () => { setSearch(''); setTypeFilter('all'); setStatusFilter('all'); };

  const totalSent = logs.length;
  const delivered = logs.filter((l) => l.status === 'delivered').length;
  const failed = logs.filter((l) => l.status === 'failed').length;
  const smsTypes = [...new Set(logs.map((l) => l.sms_type))];

  const handleResend = async (log: SmsLog) => {
    setResending(log.id);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          mobile: log.recipient_phone,
          message: log.message,
          type: log.sms_type,
          recipientName: log.recipient_name,
        },
      });
      if (error) throw error;
      toast({ title: 'SMS Resent', description: `Message resent to ${log.recipient_phone}` });
      queryClient.invalidateQueries({ queryKey: ['sms-logs'] });
    } catch (error: any) {
      toast({ title: 'Resend Failed', description: error.message, variant: 'destructive' });
    } finally {
      setResending(null);
      setConfirmResend(null);
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const typeLabel = (type: string) => {
    const labels: Record<string, string> = {
      task_assignment: 'Task Assignment',
      task_status: 'Task Status',
      task: 'Task',
      task_update: 'Task Update',
      reminder: 'Reminder',
      user_invitation: 'User Invitation',
      password_reset: 'Password Reset',
      general: 'General',
    };
    return labels[type] || type;
  };

  return (
    <AppLayout title="Notification Center" description="SMS delivery history and status tracking">
      <div className="space-y-6">
        {/* Stats */}
        <motion.div
          className="grid grid-cols-3 gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-primary/10 p-2.5">
                <Send className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSent}</p>
                <p className="text-xs text-muted-foreground">Total Sent</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-emerald-500/10 p-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{delivered}</p>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-destructive/10 p-2.5">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Status tabs */}
        <div className="flex items-center gap-2 border-b pb-3">
          {(['all', 'delivered', 'failed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                statusTab === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {tab === 'all' ? `All (${logs.length})` : tab === 'delivered' ? `Delivered (${delivered})` : `Failed (${failed})`}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by phone, name, or message..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {smsTypes.map((t) => (
                <SelectItem key={t} value={t}>{typeLabel(t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* Messages list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/20" />
              <p className="font-medium">No SMS messages found</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((log, idx) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.2 }}
              >
                <Card className={`transition-all hover:shadow-sm ${
                  log.status === 'failed'
                    ? 'border-destructive/40 bg-destructive/5'
                    : log.status === 'delivered'
                    ? 'border-emerald-200 dark:border-emerald-800'
                    : ''
                }`}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">{statusIcon(log.status)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium">{log.recipient_name || log.recipient_phone}</span>
                          </div>
                          <Badge variant={log.status === 'delivered' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'} className="text-[10px]">
                            {log.status}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">{typeLabel(log.sms_type)}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{log.message}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground" title={format(new Date(log.created_at), 'PPpp')}>
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </span>
                          {log.status === 'failed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              disabled={resending === log.id}
                              onClick={() => setConfirmResend(log)}
                            >
                              <RefreshCw className={`h-3 w-3 ${resending === log.id ? 'animate-spin' : ''}`} />
                              Resend
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Resend confirmation */}
      <AlertDialog open={!!confirmResend} onOpenChange={(open) => !open && setConfirmResend(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend SMS?</AlertDialogTitle>
            <AlertDialogDescription>
              This will resend the message to <strong>{confirmResend?.recipient_phone}</strong>. Charges may apply.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmResend && handleResend(confirmResend)}>
              Resend SMS
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
