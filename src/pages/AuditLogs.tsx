import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { ClipboardList, FileText, User, Eye, Download, Search, X, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';

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
        // prefer highest privilege if multiple
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

  const getActionIcon = (action: string) => {
    if (action.includes('document')) return <FileText className="h-4 w-4" />;
    if (action.includes('user') || action.includes('customer')) return <User className="h-4 w-4" />;
    return <Eye className="h-4 w-4" />;
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('created') || action.includes('uploaded')) return 'default';
    if (action.includes('deleted')) return 'destructive';
    if (action.includes('updated')) return 'secondary';
    return 'outline';
  };

  const formatAction = (action: string) =>
    action.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

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

  return (
    <AppLayout title="Audit Logs" description="View system activity and access history">
      <PageHeader
        title="Audit Logs"
        description={`${filtered.length} of ${logs.length} entries`}
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
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
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
                    {filtered.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="font-medium">{log.user_name}</TableCell>
                        <TableCell>{roleBadge(log.user_role)}</TableCell>
                        <TableCell>
                          <Badge variant={getActionBadgeVariant(log.action)} className="gap-1">
                            {getActionIcon(log.action)}
                            {formatAction(log.action)}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{log.entity_type}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-xs truncate">
                          {log.details ? JSON.stringify(log.details) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="p-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
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
                  {/* Vertical line */}
                  <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                  <div className="space-y-4">
                    {filtered.map((log) => (
                      <div key={log.id} className="relative flex items-start gap-3">
                        {/* Dot + icon */}
                        <div className="absolute -left-4 flex h-5 w-5 items-center justify-center rounded-full bg-secondary border border-border text-muted-foreground z-10">
                          {getActionIcon(log.action)}
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <Badge variant={getActionBadgeVariant(log.action)} className="text-xs">
                              {formatAction(log.action)}
                            </Badge>
                            <span className="text-xs text-muted-foreground capitalize">{log.entity_type}{log.entity_id ? ` · ${log.entity_id.slice(0, 8)}…` : ''}</span>
                          </div>
                          <p className="text-xs text-foreground font-medium">{log.user_name}</p>
                          {log.user_role && <span className="text-xs text-muted-foreground">{roleBadge(log.user_role)}</span>}
                        </div>
                        <span className="flex-shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), 'MMM d, HH:mm')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
