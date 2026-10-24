import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { exportToCSV, exportToPDF, auditLogExportColumns } from '@/lib/export-utils';
import { ClipboardList, FileText, User, Eye, Download, Search, X, Calendar as CalendarIcon, LogIn, Plus, Edit, Trash2, Activity } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type AppRole = 'admin' | 'staff' | 'customer' | 'manager' | 'user';

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: unknown;
  ip_address: string | null;
  created_at: string;
  user_name?: string;
  user_role?: AppRole | 'system';
}

// ── Action badge color helpers ─────────────────────────────────────────────────

function getActionCategory(action: string): 'create' | 'update' | 'delete' | 'login' | 'other' {
  if (action.includes('created') || action.includes('uploaded') || action.includes('added')) return 'create';
  if (action.includes('updated') || action.includes('changed') || action.includes('approved') || action.includes('archived') || action.includes('reset')) return 'update';
  if (action.includes('deleted') || action.includes('removed')) return 'delete';
  if (action.includes('login') || action.includes('logout') || action.includes('signin')) return 'login';
  return 'other';
}

function getActionBadgeClass(action: string): string {
  const cat = getActionCategory(action);
  switch (cat) {
    case 'create': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700';
    case 'update': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700';
    case 'delete': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700';
    case 'login': return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/60 dark:text-gray-300 dark:border-gray-600';
    case 'other': return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700';
  }
}

function getActionIcon(action: string) {
  const cat = getActionCategory(action);
  switch (cat) {
    case 'create': return <Plus className="h-3 w-3" />;
    case 'update': return <Edit className="h-3 w-3" />;
    case 'delete': return <Trash2 className="h-3 w-3" />;
    case 'login': return <LogIn className="h-3 w-3" />;
    default:
      if (action.includes('document')) return <FileText className="h-3 w-3" />;
      if (action.includes('user') || action.includes('customer')) return <User className="h-3 w-3" />;
      return <Eye className="h-3 w-3" />;
  }
}

function getActionTimelineIcon(action: string) {
  const cat = getActionCategory(action);
  const cls =
    cat === 'create' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
    : cat === 'update' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
    : cat === 'delete' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
    : cat === 'login' ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400';
  return { cls, icon: getActionIcon(action) };
}

// ── helpers ─────────────────────────────────────────────────────────────────────

function userInitials(name: string): string {
  if (!name || name === 'System') return 'SYS';
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

function userAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 55% 45%)`;
}

const formatAction = (action: string) =>
  action.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState<'all' | AppRole | 'system'>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (actionFilter !== 'all') query = query.eq('action', actionFilter);
      if (entityFilter !== 'all') query = query.eq('entity_type', entityFilter);
      if (fromDate) query = query.gte('created_at', fromDate.toISOString());
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        query = query.lte('created_at', end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const userIds = [...new Set((data || []).map((l) => l.user_id).filter(Boolean))] as string[];

      const [profilesRes, rolesRes] = await Promise.all([
        userIds.length
          ? supabase.from('profiles').select('user_id, full_name').in('user_id', userIds)
          : Promise.resolve({ data: [] as { user_id: string; full_name: string }[] }),
        userIds.length
          ? supabase.from('user_roles').select('user_id, role').in('user_id', userIds)
          : Promise.resolve({ data: [] as { user_id: string; role: AppRole }[] }),
      ]);

      const nameMap = Object.fromEntries((profilesRes.data || []).map((p) => [p.user_id, p.full_name]));
      const roleMap: Record<string, AppRole> = {};
      (rolesRes.data || []).forEach((r) => {
        const rank: Record<AppRole, number> = { admin: 5, manager: 4, staff: 3, user: 2, customer: 1 };
        if (!roleMap[r.user_id] || rank[r.role] > rank[roleMap[r.user_id]]) {
          roleMap[r.user_id] = r.role;
        }
      });

      setLogs(
        (data || []).map((l) => ({
          ...l,
          user_name: l.user_id ? nameMap[l.user_id] || 'Unknown' : 'System',
          user_role: l.user_id ? roleMap[l.user_id] || 'customer' : 'system',
        })),
      );
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter, fromDate, toDate]);

  const filtered = useMemo(() => {
    const s = debouncedSearch.trim().toLowerCase();
    return logs.filter((l) => {
      if (roleFilter !== 'all' && l.user_role !== roleFilter) return false;
      if (!s) return true;
      return (
        l.action.toLowerCase().includes(s) ||
        l.entity_type.toLowerCase().includes(s) ||
        (l.user_name || '').toLowerCase().includes(s) ||
        (l.entity_id || '').toLowerCase().includes(s) ||
        JSON.stringify(l.details || {}).toLowerCase().includes(s)
      );
    });
  }, [logs, debouncedSearch, roleFilter]);

  const prepareExportData = () =>
    filtered.map((log) => ({
      created_at: format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      user_name: log.user_name || 'System',
      user_role: log.user_role || '-',
      action: formatAction(log.action),
      entity_type: log.entity_type,
      entity_id: log.entity_id || '-',
      ip_address: log.ip_address || '-',
      details: log.details ? JSON.stringify(log.details) : '-',
    }));

  const stamp = format(new Date(), 'yyyy-MM-dd-HHmm');
  const handleExportCSV = () => exportToCSV(prepareExportData(), `audit-logs-${stamp}`, auditLogExportColumns);
  const handleExportPDF = () => exportToPDF(prepareExportData(), `audit-logs-${stamp}`, auditLogExportColumns, 'Audit Logs Report');

  const hasFilters = search || actionFilter !== 'all' || entityFilter !== 'all' || roleFilter !== 'all' || fromDate || toDate;
  const clearFilters = () => {
    setSearch('');
    setActionFilter('all');
    setEntityFilter('all');
    setRoleFilter('all');
    setFromDate(undefined);
    setToDate(undefined);
  };

  const roleBadge = (r?: AuditLog['user_role']) => {
    if (!r || r === 'system') return <Badge variant="outline" className="text-xs">System</Badge>;
    const cls =
      r === 'admin' ? 'bg-primary/10 text-primary border-primary/30'
      : r === 'staff' ? 'bg-accent/10 text-accent border-accent/30'
      : 'bg-muted text-muted-foreground';
    return <Badge variant="outline" className={cn('text-xs capitalize', cls)}>{r}</Badge>;
  };

  const SkeletonRow = () => (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </TableCell>
      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-5 w-28 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
    </TableRow>
  );

  return (
    <AppLayout title="Audit Logs" description="View system activity and access history">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <PageHeader
          title="Audit Logs"
          description={loading ? 'Loading entries…' : `${filtered.length} of ${logs.length} entries`}
          actions={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={!filtered.length}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportCSV}>Export as CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>Export as PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />

        {/* Filter bar */}
        <Card className="mb-4">
          <CardContent className="p-3 sm:p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by user, action, entity, ID, or details..."
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
                <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Entity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="folder">Folder</SelectItem>
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Action" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="document_uploaded">Document Uploaded</SelectItem>
                  <SelectItem value="document_deleted">Document Deleted</SelectItem>
                  <SelectItem value="document_viewed">Document Viewed</SelectItem>
                  <SelectItem value="document_approved">Document Approved</SelectItem>
                  <SelectItem value="document_archived">Document Archived</SelectItem>
                  <SelectItem value="user_created">User Created</SelectItem>
                  <SelectItem value="customer_created">Customer Created</SelectItem>
                  <SelectItem value="password_reset_by_admin">Password Reset</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn('h-9', !fromDate && 'text-muted-foreground')}>
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
                  <Button variant="outline" size="sm" className={cn('h-9', !toDate && 'text-muted-foreground')}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {toDate ? format(toDate, 'MMM d, yyyy') : 'To'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus />
                </PopoverContent>
              </Popover>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
                  <X className="h-4 w-4 mr-1" /> Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="table">
          <TabsList className="mb-4">
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="table">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead className="hidden lg:table-cell">Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <SkeletonRow key={i} />)}
                    </TableBody>
                  </Table>
                ) : filtered.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      icon={ClipboardList}
                      title="No matching entries"
                      description={hasFilters ? 'Try adjusting your filters or clearing them to see all logs.' : 'System activity will appear here.'}
                      action={hasFilters ? <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button> : undefined}
                    />
                  </div>
                ) : (
                  <TooltipProvider>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Entity</TableHead>
                            <TableHead className="hidden lg:table-cell">Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map((log, i) => {
                            const dt = new Date(log.created_at);
                            const relative = formatDistanceToNow(dt, { addSuffix: true });
                            const full = format(dt, 'MMM d, yyyy HH:mm:ss');
                            const name = log.user_name || 'System';
                            return (
                              <motion.tr
                                key={log.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                                className="border-b transition-colors hover:bg-muted/50"
                              >
                                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="cursor-default underline decoration-dashed decoration-muted-foreground/40 underline-offset-2">
                                        {relative}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                      {full}
                                    </TooltipContent>
                                  </Tooltip>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Avatar className="h-7 w-7 flex-shrink-0">
                                      <AvatarFallback
                                        className="text-[10px] font-semibold text-white"
                                        style={{ backgroundColor: userAvatarColor(name) }}
                                      >
                                        {userInitials(name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium truncate">{name}</span>
                                  </div>
                                </TableCell>
                                <TableCell>{roleBadge(log.user_role)}</TableCell>
                                <TableCell>
                                  <span className={cn(
                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium',
                                    getActionBadgeClass(log.action)
                                  )}>
                                    {getActionIcon(log.action)}
                                    {formatAction(log.action)}
                                  </span>
                                </TableCell>
                                <TableCell className="capitalize">{log.entity_type}</TableCell>
                                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-xs truncate">
                                  {log.details ? JSON.stringify(log.details) : '-'}
                                </TableCell>
                              </motion.tr>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </TooltipProvider>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardContent className="p-4">
                {loading ? (
                  <div className="space-y-4 pl-6">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-3 w-20 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <EmptyState
                    icon={ClipboardList}
                    title="No matching entries"
                    description={hasFilters ? 'Try adjusting your filters.' : 'System activity will appear here.'}
                    action={hasFilters ? <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button> : undefined}
                  />
                ) : (
                  <div className="relative pl-6">
                    <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                    <div className="space-y-4">
                      {filtered.map((log, i) => {
                        const { cls, icon } = getActionTimelineIcon(log.action);
                        const dt = new Date(log.created_at);
                        const relative = formatDistanceToNow(dt, { addSuffix: true });
                        return (
                          <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(i * 0.02, 0.3) }}
                            className="relative flex items-start gap-3"
                          >
                            <div className={cn(
                              'absolute -left-4 flex h-6 w-6 items-center justify-center rounded-full border border-background z-10',
                              cls
                            )}>
                              {icon}
                            </div>
                            <div className="min-w-0 flex-1 pt-0.5">
                              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                <span className={cn(
                                  'inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium',
                                  getActionBadgeClass(log.action)
                                )}>
                                  {icon}
                                  {formatAction(log.action)}
                                </span>
                                <span className="text-xs text-muted-foreground capitalize">
                                  {log.entity_type}{log.entity_id ? ` · ${log.entity_id.slice(0, 8)}…` : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Avatar className="h-5 w-5 flex-shrink-0">
                                  <AvatarFallback
                                    className="text-[8px] font-semibold text-white"
                                    style={{ backgroundColor: userAvatarColor(log.user_name || 'System') }}
                                  >
                                    {userInitials(log.user_name || 'System')}
                                  </AvatarFallback>
                                </Avatar>
                                <p className="text-xs font-medium">{log.user_name}</p>
                                {log.user_role && roleBadge(log.user_role)}
                              </div>
                            </div>
                            <span className="flex-shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                              {relative}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </AppLayout>
  );
}
