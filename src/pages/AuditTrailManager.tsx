import { useState, useMemo, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { exportToCSV } from '@/lib/export-utils';
import { format } from 'date-fns';
import { Download, ChevronDown, ChevronRight } from 'lucide-react';

interface AuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  details: unknown;
  created_at: string;
  user_name: string;
}

const ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  document_upload: 'Document Upload',
  document_uploaded: 'Document Upload',
  document_deleted: 'Document Deleted',
  document_viewed: 'Document Viewed',
  document_approved: 'Document Approved',
  document_archived: 'Document Archived',
  user_created: 'User Created',
  customer_created: 'Customer Created',
  password_reset_by_admin: 'Password Reset',
};

function labelAction(action: string) {
  return ACTION_LABELS[action] ?? action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

type DateRange = '7d' | '30d' | '90d' | 'custom';

const PAGE_SIZE = 2000;
const TRUNCATION_WARN = 1900;

export default function AuditTrailManager() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [truncated, setTruncated] = useState(false);
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      setTruncated(false);
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (dateRange === '7d' || dateRange === '30d' || dateRange === '90d') {
        const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        query = query.gte('created_at', since);
      } else if (dateRange === 'custom') {
        if (customFrom) query = query.gte('created_at', new Date(customFrom).toISOString());
        if (customTo) {
          // include the full customTo day
          const toDate = new Date(customTo);
          toDate.setDate(toDate.getDate() + 1);
          query = query.lt('created_at', toDate.toISOString());
        }
      }

      const { data, error } = await query;
      if (error) { setLoading(false); return; }

      const rows = data || [];
      if (rows.length >= TRUNCATION_WARN) setTruncated(true);

      const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))] as string[];
      let nameMap: Record<string, string> = {};
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));
      }

      setEntries(rows.map(r => ({
        ...r,
        user_name: r.user_id ? (nameMap[r.user_id] || 'Unknown') : 'System',
      })));
      setLoading(false);
    };
    fetchEntries();
  }, [dateRange, customFrom, customTo]);

  const distinctActions = useMemo(() => [...new Set(entries.map(e => e.action))].sort(), [entries]);
  const distinctUsers = useMemo(() => [...new Set(entries.map(e => e.user_name))].sort(), [entries]);

  const filtered = useMemo(() => entries.filter(e => {
    if (actionFilter !== 'all' && e.action !== actionFilter) return false;
    if (userFilter !== 'all' && e.user_name !== userFilter) return false;
    return true;
  }), [entries, actionFilter, userFilter]);

  const handleExport = () => {
    const cols = [
      { key: 'created_at', header: 'Timestamp' },
      { key: 'user_name', header: 'User' },
      { key: 'action', header: 'Action' },
      { key: 'entity_type', header: 'Entity Type' },
      { key: 'details', header: 'Details' },
    ];
    const data = filtered.map(e => ({
      created_at: format(new Date(e.created_at), 'yyyy-MM-dd HH:mm:ss'),
      user_name: e.user_name,
      action: labelAction(e.action),
      entity_type: e.entity_type,
      details: e.details ? JSON.stringify(e.details) : '',
    }));
    exportToCSV(data, `audit-trail-${format(new Date(), 'yyyy-MM-dd')}`, cols);
  };

  const detailsSummary = (details: unknown): string => {
    if (!details) return '—';
    if (typeof details === 'object') {
      const entries = Object.entries(details as Record<string, unknown>).slice(0, 3);
      return entries.map(([k, v]) => `${k}: ${String(v)}`).join(', ');
    }
    return String(details).slice(0, 80);
  };

  return (
    <AppLayout title="Audit Trail">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Audit Trail</h1>
          <p className="page-subtitle">Who did what across the platform</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2" disabled={!filtered.length}>
          <Download className="h-4 w-4" /> Export to CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={dateRange} onValueChange={v => setDateRange(v as DateRange)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="custom">Custom range</SelectItem>
          </SelectContent>
        </Select>
        {dateRange === 'custom' && (
          <>
            <Input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="w-40 h-9 text-sm"
              placeholder="From"
            />
            <Input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="w-40 h-9 text-sm"
              placeholder="To"
            />
          </>
        )}
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {distinctActions.map(a => (
              <SelectItem key={a} value={a}>{labelAction(a)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Users" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {distinctUsers.map(u => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground self-center">{filtered.length} entries</span>
      </div>
      {truncated && (
        <div className="mb-4 px-4 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          Results are limited to {PAGE_SIZE} rows. Narrow the date range or use a custom range to see more.
        </div>
      )}

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase w-6"></th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Timestamp</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Action</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Entity Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No entries found.</td></tr>
            )}
            {!loading && filtered.map(e => (
              <>
                <tr
                  key={e.id}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {expandedId === e.id
                      ? <ChevronDown className="h-3.5 w-3.5" />
                      : <ChevronRight className="h-3.5 w-3.5" />
                    }
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {format(new Date(e.created_at), 'dd MMM yyyy HH:mm')}
                  </td>
                  <td className="px-4 py-3 font-medium">{e.user_name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">{labelAction(e.action)}</Badge>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{e.entity_type}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{detailsSummary(e.details)}</td>
                </tr>
                {expandedId === e.id && (
                  <tr key={`${e.id}-expanded`} className="bg-muted/20 border-b">
                    <td colSpan={6} className="px-8 py-3">
                      <pre className="text-xs text-foreground bg-muted rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap">
                        {JSON.stringify(e.details, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
