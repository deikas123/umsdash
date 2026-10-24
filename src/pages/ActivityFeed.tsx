import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { exportToCSV, exportToPDF, activityLogExportColumns } from '@/lib/export-utils';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Activity,
  FileText,
  Upload,
  UserPlus,
  CheckCircle,
  Trash2,
  Edit,
  Key,
  MessageSquare,
  ListTodo,
  Bell,
  Search,
  RefreshCw,
  Clock,
  Archive,
  Download,
  Calendar as CalendarIcon,
  X,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

type AppRole = 'admin' | 'staff' | 'customer' | 'manager' | 'user';

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: any;
  created_at: string;
  ip_address: string | null;
  user_name?: string;
  user_role?: AppRole | 'system';
}

const actionIcons: Record<string, any> = {
  upload: Upload,
  document_approved: CheckCircle,
  document_archived: Archive,
  document_pending: Clock,
  delete: Trash2,
  create: UserPlus,
  update: Edit,
  password_reset_by_admin: Key,
  chat_message: MessageSquare,
  task: ListTodo,
  reminder: Bell,
};

// Timeline dot colors by action category
const actionTimelineColors: Record<string, string> = {
  create: 'bg-green-500',
  update: 'bg-blue-500',
  delete: 'bg-red-500',
  login: 'bg-gray-400',
  upload: 'bg-blue-500',
  document_approved: 'bg-green-500',
  document_archived: 'bg-gray-400',
  document_pending: 'bg-blue-400',
  password_reset: 'bg-amber-500',
  chat: 'bg-purple-500',
  task: 'bg-purple-500',
  reminder: 'bg-purple-400',
};

const actionColors: Record<string, string> = {
  upload: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  document_approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  document_archived: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  create: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  password_reset_by_admin: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  login: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  chat: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  task: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  reminder: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

function getIcon(action: string) {
  for (const [key, Icon] of Object.entries(actionIcons)) {
    if (action.toLowerCase().includes(key)) return Icon;
  }
  return Activity;
}

function getColor(action: string) {
  for (const [key, color] of Object.entries(actionColors)) {
    if (action.toLowerCase().includes(key)) return color;
  }
  return 'bg-muted text-muted-foreground';
}

function getDotColor(action: string) {
  for (const [key, color] of Object.entries(actionTimelineColors)) {
    if (action.toLowerCase().includes(key)) return color;
  }
  return 'bg-purple-500';
}

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export default function ActivityFeed() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [entityFilter, setEntityFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState<'all' | AppRole | 'system'>('all');
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (entityFilter !== 'all') query = query.eq('entity_type', entityFilter);
      if (fromDate) query = query.gte('created_at', fromDate.toISOString());
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        query = query.lte('created_at', end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const userIds = [...new Set((data || []).map(l => l.user_id).filter(Boolean))] as string[];
      const [profilesRes, rolesRes] = await Promise.all([
        userIds.length
          ? supabase.from('profiles').select('user_id, full_name').in('user_id', userIds)
          : Promise.resolve({ data: [] as { user_id: string; full_name: string }[] }),
        userIds.length
          ? supabase.from('user_roles').select('user_id, role').in('user_id', userIds)
          : Promise.resolve({ data: [] as { user_id: string; role: AppRole }[] }),
      ]);
      const nameMap = Object.fromEntries((profilesRes.data || []).map(p => [p.user_id, p.full_name]));
      const roleMap: Record<string, AppRole> = {};
      const rank: Record<AppRole, number> = { admin: 5, manager: 4, staff: 3, user: 2, customer: 1 };
      (rolesRes.data || []).forEach(r => {
        if (!roleMap[r.user_id] || rank[r.role] > rank[roleMap[r.user_id]]) {
          roleMap[r.user_id] = r.role;
        }
      });

      setLogs((data || []).map(l => ({
        ...l,
        user_name: l.user_id ? nameMap[l.user_id] || 'Unknown' : 'System',
        user_role: l.user_id ? roleMap[l.user_id] || 'customer' : 'system',
      })));
    } catch (e) {
      console.error('Error fetching activity:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [entityFilter, fromDate, toDate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    const s = debouncedSearch.toLowerCase();
    return logs.filter(l => {
      if (roleFilter !== 'all' && l.user_role !== roleFilter) return false;
      if (!s) return true;
      return (
        l.action.toLowerCase().includes(s) ||
        l.entity_type.toLowerCase().includes(s) ||
        l.user_name?.toLowerCase().includes(s) ||
        (l.entity_id || '').toLowerCase().includes(s) ||
        JSON.stringify(l.details || {}).toLowerCase().includes(s)
      );
    });
  }, [logs, debouncedSearch, roleFilter]);

  // Group by date
  const grouped = filtered.reduce<Record<string, AuditLog[]>>((acc, log) => {
    const date = format(new Date(log.created_at), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const yesterdayStr = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');

  function getDateLabel(dateStr: string) {
    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';
    return format(new Date(dateStr), 'EEEE, MMMM d, yyyy');
  }

  const prepareExportData = () =>
    filtered.map(l => ({
      created_at: format(new Date(l.created_at), 'yyyy-MM-dd HH:mm:ss'),
      user_name: l.user_name || 'System',
      user_role: l.user_role || '-',
      action: formatAction(l.action),
      entity_type: l.entity_type,
      entity_id: l.entity_id || '-',
      ip_address: l.ip_address || '-',
      details: l.details ? JSON.stringify(l.details) : '-',
    }));

  const stamp = format(new Date(), 'yyyy-MM-dd-HHmm');
  const handleExportCSV = () => exportToCSV(prepareExportData(), `activity-feed-${stamp}`, activityLogExportColumns);
  const handleExportPDF = () => exportToPDF(prepareExportData(), `activity-feed-${stamp}`, activityLogExportColumns, 'Activity Feed Report');

  const hasFilters = search || entityFilter !== 'all' || roleFilter !== 'all' || fromDate || toDate;
  const clearFilters = () => {
    setSearch(''); setEntityFilter('all'); setRoleFilter('all'); setFromDate(undefined); setToDate(undefined);
  };

  const roleBadge = (r?: AuditLog['user_role']) => {
    if (!r || r === 'system') return <Badge variant="outline" className="text-[10px]">system</Badge>;
    const cls =
      r === 'admin' ? 'bg-primary/10 text-primary border-primary/30'
      : r === 'staff' ? 'bg-accent/10 text-accent border-accent/30'
      : 'bg-muted text-muted-foreground';
    return <Badge variant="outline" className={cn('text-[10px] capitalize', cls)}>{r}</Badge>;
  };

  return (
    <AppLayout title="Activity Feed" description="Real-time system activity and audit trail">
      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user, action, entity, ID, or details..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing} title="Refresh">
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={!filtered.length}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>Export as PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={roleFilter} onValueChange={v => setRoleFilter(v as any)}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="task">Tasks</SelectItem>
              <SelectItem value="customer">Customers</SelectItem>
              <SelectItem value="reminder">Reminders</SelectItem>
              <SelectItem value="folder">Folders</SelectItem>
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn(!fromDate && 'text-muted-foreground')}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                {fromDate ? format(fromDate, 'MMM d, yyyy') : 'From'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn(!toDate && 'text-muted-foreground')}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                {toDate ? format(toDate, 'MMM d, yyyy') : 'To'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus />
            </PopoverContent>
          </Popover>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} of {logs.length}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{logs.length}</p>
              <p className="text-xs text-muted-foreground">Total Actions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Upload className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{logs.filter(l => l.action.includes('upload')).length}</p>
              <p className="text-xs text-muted-foreground">Uploads</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <UserPlus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{logs.filter(l => l.entity_type === 'user').length}</p>
              <p className="text-xs text-muted-foreground">User Actions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <ListTodo className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{logs.filter(l => l.entity_type === 'task').length}</p>
              <p className="text-xs text-muted-foreground">Task Actions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Activity className="mx-auto h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">No activity found</p>
            <p className="text-sm">Activity will appear here as actions are performed</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateStr, items]) => (
            <div key={dateStr}>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground">{getDateLabel(dateStr)}</h3>
                <div className="flex-1 h-px bg-border" />
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>
              {/* Timeline */}
              <div className="relative pl-6">
                {/* Vertical line */}
                <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
                <div className="space-y-3">
                  {items.map((log, idx) => {
                    const Icon = getIcon(log.action);
                    const color = getColor(log.action);
                    const dotColor = getDotColor(log.action);
                    const detail = log.details as any;
                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.025, duration: 0.2 }}
                        className="relative"
                      >
                        {/* Timeline dot */}
                        <div className={`absolute -left-[18px] top-3 w-2.5 h-2.5 rounded-full border-2 border-background ${dotColor}`} />
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="p-3 flex items-start gap-3">
                            <div className={`p-2 rounded-lg flex-shrink-0 ${color}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{log.user_name}</span>
                                {roleBadge(log.user_role)}
                                <span className="text-muted-foreground text-sm">{formatAction(log.action)}</span>
                              </div>
                              {detail && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                  {detail.document_title || detail.target_full_name || detail.task_title || detail.message || ''}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">{log.entity_type}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                </span>
                                {log.ip_address && (
                                  <span className="text-xs text-muted-foreground hidden sm:inline">{log.ip_address}</span>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
