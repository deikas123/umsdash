import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, ReferenceLine,
} from 'recharts';
import {
  FileText, Users, Activity, Settings2, ChevronDown, Trash2, Save, Download,
  FileSpreadsheet, FileDown, BarChart3, RefreshCw, Plus, X,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { useReports, ReportFilters } from '@/hooks/useReports';
import { exportToCSV, exportToPDF, exportToExcel } from '@/lib/export-utils';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/PageHeader';

// ── types ─────────────────────────────────────────────────────────────────────

interface ReportItem {
  id: string;
  label: string;
  icon: string;
  description: string;
}

interface ReportGroup {
  id: string;
  label: string;
  Icon: React.ElementType;
  reports: ReportItem[];
}

interface SavedReport {
  id: string;
  label: string;
  reportType: string;
  filters: ReportFilters;
  savedAt: string;
}

// ── catalog ───────────────────────────────────────────────────────────────────

const REPORT_CATALOG: ReportGroup[] = [
  {
    id: 'document-vault',
    label: 'Document Vault Reports',
    Icon: FileText,
    reports: [
      { id: 'document-summary', label: 'Document Summary', icon: '📄', description: 'Total docs by category/status/customer' },
      { id: 'customer-report', label: 'Customer Report', icon: '👥', description: 'Customer list with doc counts and activity' },
      { id: 'document-expiry', label: 'Document Expiry', icon: '📅', description: 'Docs expiring in 30/60/90 days' },
      { id: 'upload-activity', label: 'Upload Activity', icon: '📤', description: 'Uploads per user per month' },
      { id: 'category-distribution', label: 'Category Distribution', icon: '🗂️', description: 'Docs per category with chart' },
      { id: 'deletion-requests', label: 'Deletion Requests', icon: '🗑️', description: 'All deletion requests with status' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations Reports',
    Icon: Activity,
    reports: [
      { id: 'incident-report', label: 'Incident Report', icon: '⚠️', description: 'Incidents by severity, status, resolution time' },
      { id: 'vendor-sla', label: 'Vendor SLA Report', icon: '📊', description: 'Vendor uptime %, SLA compliance' },
      { id: 'password-expiry', label: 'Password Expiry', icon: '🔑', description: 'System passwords expiring soon' },
      { id: 'escalation-report', label: 'Escalation Report', icon: '🚨', description: 'Escalations by status and resolution time' },
      { id: 'sms-activity', label: 'SMS Activity', icon: '📱', description: 'SMS logs with delivery status' },
    ],
  },
  {
    id: 'user-system',
    label: 'User & System Reports',
    Icon: Users,
    reports: [
      { id: 'user-activity', label: 'User Activity', icon: '👤', description: 'Users with last active, docs, tasks' },
      { id: 'gamification', label: 'Gamification Report', icon: '🏅', description: 'Leaderboard, XP, streaks, achievements' },
      { id: 'audit-trail', label: 'Audit Trail', icon: '🔍', description: 'Filtered audit log export' },
      { id: 'storage-usage', label: 'Storage Usage', icon: '💾', description: 'Storage used per user, per bucket' },
    ],
  },
  {
    id: 'custom',
    label: 'Custom Report Builder',
    Icon: Settings2,
    reports: [
      { id: 'custom', label: 'Custom Report', icon: '🔧', description: 'Build your own query' },
    ],
  },
];

// ── summary card configs ──────────────────────────────────────────────────────

const SUMMARY_CONFIG: Record<string, { key: string; label: string; icon: string }[]> = {
  'document-summary': [
    { key: 'total', label: 'Total Docs', icon: '📄' },
    { key: 'pending', label: 'Pending', icon: '⏳' },
    { key: 'approved', label: 'Approved', icon: '✅' },
    { key: 'archived', label: 'Archived', icon: '🗄️' },
  ],
  'customer-report': [
    { key: 'totalCustomers', label: 'Total Customers', icon: '👥' },
    { key: 'customersWithDocs', label: 'With Docs', icon: '📁' },
    { key: 'avgDocsPerCustomer', label: 'Avg Docs/Customer', icon: '📊' },
    { key: 'totalDocs', label: 'Total Docs', icon: '📄' },
  ],
  'document-expiry': [
    { key: 'expiring30', label: 'Expiring in 30d', icon: '🔴' },
    { key: 'expiring60', label: 'Expiring in 60d', icon: '🟡' },
    { key: 'expiring90', label: 'Expiring in 90d', icon: '🟢' },
    { key: 'alreadyExpired', label: 'Already Expired', icon: '❌' },
  ],
  'upload-activity': [
    { key: 'totalUploads', label: 'Total Uploads', icon: '📤' },
    { key: 'topUploader', label: 'Top Uploader', icon: '🏆' },
    { key: 'uploadsThisMonth', label: 'This Month', icon: '📅' },
    { key: 'uniqueUploaders', label: 'Unique Uploaders', icon: '👤' },
  ],
  'category-distribution': [
    { key: 'totalCategories', label: 'Categories', icon: '🗂️' },
    { key: 'totalDocs', label: 'Total Docs', icon: '📄' },
    { key: 'largestCategory', label: 'Largest Category', icon: '🏆' },
    { key: 'emptyCategoryCount', label: 'Empty Categories', icon: '⚪' },
  ],
  'deletion-requests': [
    { key: 'total', label: 'Total Requests', icon: '🗑️' },
    { key: 'pending', label: 'Pending', icon: '⏳' },
    { key: 'approved', label: 'Approved', icon: '✅' },
    { key: 'rejected', label: 'Rejected', icon: '❌' },
  ],
  'incident-report': [
    { key: 'total', label: 'Total Incidents', icon: '⚠️' },
    { key: 'open', label: 'Open', icon: '🔴' },
    { key: 'resolved', label: 'Resolved', icon: '✅' },
    { key: 'critical', label: 'Critical/High', icon: '🚨' },
  ],
  'vendor-sla': [
    { key: 'totalVendors', label: 'Total Vendors', icon: '🏢' },
    { key: 'meetingSLA', label: 'Meeting SLA', icon: '✅' },
    { key: 'breachingSLA', label: 'Breaching SLA', icon: '❌' },
    { key: 'avgUptimePercent', label: 'Avg Uptime', icon: '📈' },
  ],
  'password-expiry': [
    { key: 'totalPasswords', label: 'Total Passwords', icon: '🔑' },
    { key: 'expiredCount', label: 'Expired', icon: '❌' },
    { key: 'expiring30Days', label: 'Expiring <30d', icon: '🔴' },
    { key: 'expiring60Days', label: 'Expiring <60d', icon: '🟡' },
  ],
  'escalation-report': [
    { key: 'total', label: 'Total', icon: '🚨' },
    { key: 'open', label: 'Open', icon: '🔴' },
    { key: 'resolved', label: 'Resolved', icon: '✅' },
    { key: 'avgResolutionHours', label: 'Avg Resolution', icon: '⏱️' },
  ],
  'sms-activity': [
    { key: 'total', label: 'Total SMS', icon: '📱' },
    { key: 'delivered', label: 'Delivered', icon: '✅' },
    { key: 'failed', label: 'Failed', icon: '❌' },
    { key: 'successRate', label: 'Success Rate', icon: '📊' },
  ],
  'user-activity': [
    { key: 'total', label: 'Total Users', icon: '👤' },
    { key: 'activeLast30', label: 'Active 30d', icon: '🟢' },
    { key: 'inactive', label: 'Inactive', icon: '⚪' },
    { key: 'adminCount', label: 'Admins', icon: '🛡️' },
  ],
  'gamification': [
    { key: 'totalXpAwarded', label: 'Total XP', icon: '⚡' },
    { key: 'activeStreaks', label: 'Active Streaks', icon: '🔥' },
    { key: 'achievementsUnlocked', label: 'Achievements', icon: '🏅' },
    { key: 'avgLevel', label: 'Avg Level', icon: '📈' },
  ],
  'audit-trail': [
    { key: 'totalEvents', label: 'Total Events', icon: '🔍' },
    { key: 'todayEvents', label: 'Today', icon: '📅' },
    { key: 'thisWeekEvents', label: 'This Week', icon: '📊' },
    { key: 'uniqueUsers', label: 'Unique Users', icon: '👤' },
  ],
  'storage-usage': [
    { key: 'totalStorageMB', label: 'Total Storage', icon: '💾' },
    { key: 'topConsumer', label: 'Top Consumer', icon: '🏆' },
    { key: 'avgPerUserMB', label: 'Avg Per User', icon: '📊' },
    { key: 'totalFiles', label: 'Total Files', icon: '📁' },
  ],
  'custom': [
    { key: 'totalRows', label: 'Total Rows', icon: '📊' },
  ],
};

// ── table column definitions ──────────────────────────────────────────────────

type ColDef = { key: string; header: string; render?: (val: any, row: any) => React.ReactNode };

function statusBadge(val: string) {
  const color = val === 'approved' || val === 'resolved' || val === 'delivered' || val === 'active'
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    : val === 'pending' || val === 'open' || val === 'in_progress'
    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    : val === 'rejected' || val === 'failed' || val === 'critical'
    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    : val === 'high' || val === 'medium'
    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>{val}</span>;
}

function expiryCell(days: number) {
  const cls = days < 0 ? 'text-gray-500' : days <= 30 ? 'text-red-600 font-semibold' : days <= 60 ? 'text-amber-600 font-semibold' : 'text-green-700';
  return <span className={cls}>{days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days}d`}</span>;
}

function fmtDate(val: string) {
  if (!val) return '—';
  try { return format(new Date(val), 'dd MMM yyyy'); } catch { return val; }
}
function fmtDateTime(val: string) {
  if (!val) return '—';
  try { return format(new Date(val), 'dd MMM yyyy HH:mm'); } catch { return val; }
}

const TABLE_COLUMNS: Record<string, ColDef[]> = {
  'document-summary': [
    { key: 'title', header: 'Title' },
    { key: 'customer_name', header: 'Customer' },
    { key: 'category_name', header: 'Category' },
    { key: 'status', header: 'Status', render: v => statusBadge(v) },
    { key: 'uploader_name', header: 'Uploaded By' },
    { key: 'created_at', header: 'Created', render: v => fmtDate(v) },
  ],
  'customer-report': [
    { key: 'full_name', header: 'Name' },
    { key: 'account_number', header: 'Account No.' },
    { key: 'email', header: 'Email' },
    { key: 'doc_count', header: 'Doc Count' },
    { key: 'last_upload_date', header: 'Last Upload' },
  ],
  'document-expiry': [
    { key: 'title', header: 'Title' },
    { key: 'customer_name', header: 'Customer' },
    { key: 'expiry_date', header: 'Expiry Date', render: v => fmtDate(v) },
    { key: 'days_remaining', header: 'Days Remaining', render: v => expiryCell(Number(v)) },
  ],
  'upload-activity': [
    { key: 'uploader_name', header: 'Uploader' },
    { key: 'month', header: 'Month' },
    { key: 'upload_count', header: 'Uploads' },
  ],
  'category-distribution': [
    { key: 'category_name', header: 'Category' },
    { key: 'doc_count', header: 'Doc Count' },
    { key: 'percentage', header: 'Percentage' },
  ],
  'deletion-requests': [
    { key: 'document_title', header: 'Document' },
    { key: 'requested_by_name', header: 'Requested By' },
    { key: 'reason', header: 'Reason' },
    { key: 'status', header: 'Status', render: v => statusBadge(v) },
    { key: 'reviewed_by_name', header: 'Reviewed By' },
    { key: 'reviewed_at', header: 'Reviewed At', render: v => v ? fmtDate(v) : 'Pending' },
    { key: 'created_at', header: 'Created', render: v => fmtDate(v) },
  ],
  'incident-report': [
    { key: 'incident_number', header: 'Incident #' },
    { key: 'incident_type', header: 'Type' },
    { key: 'severity', header: 'Severity', render: v => statusBadge(v) },
    { key: 'department', header: 'Department' },
    { key: 'status', header: 'Status', render: v => statusBadge(v) },
    { key: 'created_at', header: 'Created', render: v => fmtDate(v) },
    { key: 'resolution_time', header: 'Resolution Time' },
  ],
  'vendor-sla': [
    { key: 'vendor', header: 'Vendor' },
    { key: 'total_issues', header: 'Total Issues' },
    { key: 'downtime_hours', header: 'Downtime' },
    { key: 'avg_uptime_pct', header: 'Avg Uptime' },
    { key: 'sla_target', header: 'SLA Target' },
    { key: 'sla_status', header: 'SLA Status' },
  ],
  'password-expiry': [
    { key: 'system_name', header: 'System' },
    { key: 'username', header: 'Username' },
    { key: 'expiry_date', header: 'Expiry Date', render: v => fmtDate(v) },
    { key: 'days_remaining', header: 'Days Remaining', render: v => v != null ? expiryCell(Number(v)) : '—' },
    { key: 'rotation_days', header: 'Rotation (days)' },
    { key: 'assigned_to', header: 'Assigned To' },
  ],
  'escalation-report': [
    { key: 'title', header: 'Title' },
    { key: 'status', header: 'Status', render: v => statusBadge(v) },
    { key: 'current_level', header: 'Level' },
    { key: 'source_table', header: 'Source' },
    { key: 'created_at', header: 'Created', render: v => fmtDate(v) },
    { key: 'resolved_at', header: 'Resolved', render: v => v ? fmtDate(v) : '—' },
    { key: 'resolution_hours', header: 'Resolution Time' },
  ],
  'sms-activity': [
    { key: 'recipient_name', header: 'Recipient' },
    { key: 'recipient_phone', header: 'Phone' },
    { key: 'sms_type', header: 'Type' },
    { key: 'status', header: 'Status', render: v => statusBadge(v) },
    { key: 'created_at', header: 'Sent At', render: v => fmtDateTime(v) },
    { key: 'message_preview', header: 'Message' },
  ],
  'user-activity': [
    { key: 'full_name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: v => statusBadge(v) },
    { key: 'department', header: 'Department', render: v => v || '—' },
    { key: 'docs_uploaded', header: 'Docs Uploaded' },
    { key: 'tasks_created', header: 'Tasks Created' },
    { key: 'last_active_at', header: 'Last Active', render: v => v ? fmtDateTime(v) : 'Never' },
    { key: 'current_streak', header: 'Streak' },
  ],
  'gamification': [
    { key: 'full_name', header: 'Name' },
    { key: 'level', header: 'Level' },
    { key: 'total_xp', header: 'Total XP' },
    { key: 'weekly_xp', header: 'Weekly XP' },
    { key: 'current_streak', header: 'Streak' },
    { key: 'longest_streak', header: 'Longest Streak' },
    { key: 'achievements_count', header: 'Achievements' },
  ],
  'audit-trail': [
    { key: 'created_at', header: 'Timestamp', render: v => fmtDateTime(v) },
    { key: 'user_name', header: 'User' },
    { key: 'action', header: 'Action' },
    { key: 'entity_type', header: 'Entity Type' },
    { key: 'entity_id_short', header: 'Entity ID' },
    { key: 'ip_address', header: 'IP' },
    { key: 'details_preview', header: 'Details' },
  ],
  'storage-usage': [
    { key: 'full_name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'bucket', header: 'Bucket' },
    { key: 'file_count', header: 'Files' },
    { key: 'total_mb', header: 'Storage (MB)' },
  ],
};

const CHART_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
  '#f97316', '#10b981', '#ec4899', '#6366f1',
];

// ── Saved Reports hook ────────────────────────────────────────────────────────

function useSavedReports() {
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);

  useEffect(() => {
    const local: SavedReport[] = JSON.parse(localStorage.getItem('umshub_saved_reports') || '[]');
    supabase.from('system_settings').select('value').eq('key', 'saved_reports').maybeSingle().then(({ data }) => {
      const db: SavedReport[] = Array.isArray((data as any)?.value) ? (data as any).value : [];
      const merged = [...local];
      db.forEach(r => { if (!merged.find(m => m.id === r.id)) merged.push(r); });
      setSavedReports(merged);
    }).catch(() => setSavedReports(local));
  }, []);

  const saveReport = useCallback(async (config: SavedReport) => {
    setSavedReports(prev => {
      const updated = [...prev.filter(r => r.id !== config.id), config];
      localStorage.setItem('umshub_saved_reports', JSON.stringify(updated));
      return updated;
    });
    try {
      const { data: row } = await supabase.from('system_settings').select('id, value').eq('key', 'saved_reports').maybeSingle();
      const existing: SavedReport[] = Array.isArray((row as any)?.value) ? (row as any).value : [];
      const updated = [...existing.filter(r => r.id !== config.id), config];
      if ((row as any)?.id) {
        await supabase.from('system_settings').update({ value: updated as any }).eq('id', (row as any).id);
      } else {
        await supabase.from('system_settings').insert({ key: 'saved_reports', value: updated as any });
      }
    } catch (_e) { /* ignore DB errors — localStorage is the fallback */ }
  }, []);

  const deleteReport = useCallback(async (id: string) => {
    setSavedReports(prev => {
      const updated = prev.filter(r => r.id !== id);
      localStorage.setItem('umshub_saved_reports', JSON.stringify(updated));
      return updated;
    });
    try {
      const { data: row } = await supabase.from('system_settings').select('id, value').eq('key', 'saved_reports').maybeSingle();
      const existing: SavedReport[] = Array.isArray((row as any)?.value) ? (row as any).value : [];
      const updated = existing.filter(r => r.id !== id);
      if ((row as any)?.id) {
        await supabase.from('system_settings').update({ value: updated as any }).eq('id', (row as any).id);
      }
    } catch (_e) { /* ignore */ }
  }, []);

  return { savedReports, saveReport, deleteReport };
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({ summary, reportType, isLoading }: {
  summary: Record<string, string | number>;
  reportType: string;
  isLoading: boolean;
}) {
  const configs = SUMMARY_CONFIG[reportType] || [];
  if (configs.length === 0) return null;

  return (
    <div className={`grid gap-3 mb-4 ${configs.length === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
      {configs.map(c => (
        <Card key={c.key}>
          <CardContent className="p-4 flex items-center gap-3">
            <span className="text-2xl">{c.icon}</span>
            <div className="min-w-0">
              {isLoading
                ? <Skeleton className="h-7 w-16 mb-1" />
                : <p className="text-xl font-bold truncate">{summary[c.key] ?? 0}</p>
              }
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Chart component ───────────────────────────────────────────────────────────

function ReportChart({ chartData, chartData2, reportType, isLoading }: {
  chartData: { name: string; value: number }[];
  chartData2?: { name: string; value: number }[];
  reportType: string;
  isLoading: boolean;
}) {
  if (isLoading) return <Skeleton className="h-[280px] w-full mb-4" />;

  const PIE_TYPES = ['document-summary', 'category-distribution', 'sms-activity'];
  const TWO_TAB_TYPES = ['incident-report', 'category-distribution', 'sms-activity', 'gamification'];
  const LINE_TYPES = ['audit-trail', 'gamification'];

  const renderBar = (data: { name: string; value: number }[], refLine?: number) => (
    data.length === 0
      ? <p className="text-center text-muted-foreground py-10 text-sm">No chart data</p>
      : <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {refLine && <ReferenceLine y={refLine} stroke="#ef4444" strokeDasharray="4 4" label={{ value: `${refLine}%`, fill: '#ef4444', fontSize: 10 }} />}
            <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
  );

  const renderPie = (data: { name: string; value: number }[]) => (
    data.length === 0
      ? <p className="text-center text-muted-foreground py-10 text-sm">No chart data</p>
      : <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
  );

  const renderLine = (data: { name: string; value: number }[]) => (
    data.length === 0
      ? <p className="text-center text-muted-foreground py-10 text-sm">No chart data</p>
      : <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 40, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
  );

  if (TWO_TAB_TYPES.includes(reportType) && chartData2) {
    const tab1Label = reportType === 'incident-report' ? 'By Month' : reportType === 'gamification' ? 'Top 10 XP' : 'Pie';
    const tab2Label = reportType === 'incident-report' ? 'By Severity' : reportType === 'gamification' ? 'XP Over Time' : 'Bar';
    return (
      <div className="mb-4">
        <Tabs defaultValue="tab1">
          <TabsList className="mb-2">
            <TabsTrigger value="tab1">{tab1Label}</TabsTrigger>
            <TabsTrigger value="tab2">{tab2Label}</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">
            {PIE_TYPES.includes(reportType) && reportType !== 'incident-report' && reportType !== 'gamification'
              ? renderPie(chartData)
              : reportType === 'gamification'
              ? renderBar(chartData)
              : renderBar(chartData)}
          </TabsContent>
          <TabsContent value="tab2">
            {reportType === 'incident-report' ? renderPie(chartData2) : reportType === 'gamification' ? renderLine(chartData2) : renderBar(chartData2)}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  if (reportType === 'audit-trail') return <div className="mb-4">{renderLine(chartData)}</div>;
  if (reportType === 'document-summary') return <div className="mb-4">{renderPie(chartData)}</div>;
  if (reportType === 'vendor-sla') return <div className="mb-4">{renderBar(chartData, 99.5)}</div>;

  return <div className="mb-4">{renderBar(chartData)}</div>;
}

// ── Data Table ────────────────────────────────────────────────────────────────

function ReportTable({ data, columns, isLoading }: {
  data: Record<string, unknown>[];
  columns: ColDef[];
  isLoading: boolean;
}) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(key); setSortDir('asc'); }
  };

  const sorted = sortCol
    ? [...data].sort((a, b) => {
        const av = a[sortCol]; const bv = b[sortCol];
        const cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : data;

  const displayed = sorted.slice(0, 500);
  const overflow = data.length > 500;

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div>
      {overflow && (
        <p className="text-xs text-muted-foreground mb-2">Showing first 500 rows. Use Export for the full dataset.</p>
      )}
      <div className="border rounded-lg overflow-auto max-h-[400px]">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              {columns.map(c => (
                <TableHead
                  key={c.key}
                  className="cursor-pointer select-none whitespace-nowrap text-xs"
                  onClick={() => handleSort(c.key)}
                >
                  {c.header} {sortCol === c.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayed.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8 text-sm">
                  No data for the selected filters
                </TableCell>
              </TableRow>
            ) : (
              displayed.map((row, i) => (
                <TableRow key={i}>
                  {columns.map(c => (
                    <TableCell key={c.key} className="text-xs py-2">
                      {c.render ? c.render(row[c.key], row) : (row[c.key] != null ? String(row[c.key]) : '—')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Filters Bar ───────────────────────────────────────────────────────────────

function FiltersBar({ reportType, filters, onChange, onRun, isLoading }: {
  reportType: string;
  filters: ReportFilters;
  onChange: (f: ReportFilters) => void;
  onRun: () => void;
  isLoading: boolean;
}) {
  const set = (key: string, value: string) => onChange({ ...filters, [key]: value });
  const showDateRange = reportType !== 'password-expiry';

  // Fetch document categories for the document-summary category filter
  const [docCategories, setDocCategories] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (reportType === 'document-summary') {
      supabase.from('document_categories').select('id, name').then(({ data }) => {
        if (data) setDocCategories(data);
      });
    }
  }, [reportType]);

  return (
    <div className="flex flex-wrap items-end gap-3 p-4 bg-muted/30 border rounded-lg mb-4">
      {showDateRange && (
        <>
          <div>
            <Label className="text-xs mb-1 block">From</Label>
            <Input type="date" className="h-8 text-xs w-36" value={filters.dateFrom || ''} onChange={e => set('dateFrom', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs mb-1 block">To</Label>
            <Input type="date" className="h-8 text-xs w-36" value={filters.dateTo || ''} onChange={e => set('dateTo', e.target.value)} />
          </div>
        </>
      )}

      {reportType === 'document-summary' && (
        <>
          <div>
            <Label className="text-xs mb-1 block">Category</Label>
            <Select value={filters.category || 'all'} onValueChange={v => set('category', v)}>
              <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {docCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Status</Label>
            <Select value={filters.status || 'all'} onValueChange={v => set('status', v)}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {reportType === 'document-expiry' && (
        <div>
          <Label className="text-xs mb-1 block">Window</Label>
          <Select value={filters.window || '90'} onValueChange={v => set('window', v)}>
            <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="60">60 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {reportType === 'deletion-requests' && (
        <div>
          <Label className="text-xs mb-1 block">Status</Label>
          <Select value={filters.status || 'all'} onValueChange={v => set('status', v)}>
            <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {reportType === 'incident-report' && (
        <>
          <div>
            <Label className="text-xs mb-1 block">Severity</Label>
            <Select value={filters.severity || 'all'} onValueChange={v => set('severity', v)}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Status</Label>
            <Select value={filters.status || 'all'} onValueChange={v => set('status', v)}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Department</Label>
            <Input className="h-8 text-xs w-36" placeholder="e.g. IT, HR..." value={filters.department || ''} onChange={e => set('department', e.target.value)} />
          </div>
        </>
      )}

      {reportType === 'password-expiry' && (
        <>
          <div>
            <Label className="text-xs mb-1 block">Window</Label>
            <Select value={filters.window || '30'} onValueChange={v => set('window', v)}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="30">Expiring in 30 Days</SelectItem>
                <SelectItem value="60">Expiring in 60 Days</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {reportType === 'escalation-report' && (
        <>
          <div>
            <Label className="text-xs mb-1 block">Status</Label>
            <Select value={filters.status || 'all'} onValueChange={v => set('status', v)}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Level</Label>
            <Select value={filters.level || 'all'} onValueChange={v => set('level', v)}>
              <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="1">Level 1</SelectItem>
                <SelectItem value="2">Level 2</SelectItem>
                <SelectItem value="3">Level 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {reportType === 'sms-activity' && (
        <>
          <div>
            <Label className="text-xs mb-1 block">Status</Label>
            <Select value={filters.status || 'all'} onValueChange={v => set('status', v)}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Type</Label>
            <Input className="h-8 text-xs w-32" placeholder="SMS type..." value={filters.sms_type || ''} onChange={e => set('sms_type', e.target.value)} />
          </div>
        </>
      )}

      {reportType === 'user-activity' && (
        <>
          <div>
            <Label className="text-xs mb-1 block">Role</Label>
            <Select value={filters.role || 'all'} onValueChange={v => set('role', v)}>
              <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Activity</Label>
            <Select value={filters.activity || 'all'} onValueChange={v => set('activity', v)}>
              <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active (30d)</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {reportType === 'audit-trail' && (
        <>
          <div>
            <Label className="text-xs mb-1 block">User</Label>
            <Input className="h-8 text-xs w-36" placeholder="Search user..." value={filters.user || ''} onChange={e => set('user', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Action</Label>
            <Input className="h-8 text-xs w-32" placeholder="Action..." value={filters.action || ''} onChange={e => set('action', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Entity Type</Label>
            <Input className="h-8 text-xs w-32" placeholder="Entity type..." value={filters.entity_type || ''} onChange={e => set('entity_type', e.target.value)} />
          </div>
        </>
      )}

      <Button size="sm" className="h-8" onClick={onRun} disabled={isLoading}>
        {isLoading ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
        Run Report
      </Button>
    </div>
  );
}

// ── Export Bar ────────────────────────────────────────────────────────────────

function ExportBar({ data, reportType, reportLabel, isLoading }: {
  data: Record<string, unknown>[];
  reportType: string;
  reportLabel: string;
  isLoading: boolean;
}) {
  const cols = TABLE_COLUMNS[reportType] || [];
  // strip renderers for export
  const exportCols = cols.map(c => ({ key: c.key, header: c.header }));
  const disabled = isLoading || data.length === 0;
  const fn = `${reportType}-report`;

  return (
    <div className="flex gap-2 pt-4 border-t mt-4">
      <Button variant="outline" size="sm" disabled={disabled} onClick={() => exportToCSV(data, fn, exportCols)}>
        <Download className="h-3 w-3 mr-1" /> CSV
      </Button>
      <Button variant="outline" size="sm" disabled={disabled} onClick={() => exportToPDF(data, fn, exportCols, `${reportLabel} — ${new Date().toLocaleDateString()}`)}>
        <FileDown className="h-3 w-3 mr-1" /> PDF
      </Button>
      <Button variant="outline" size="sm" disabled={disabled} onClick={() => exportToExcel(data, fn, exportCols)}>
        <FileSpreadsheet className="h-3 w-3 mr-1" /> Excel
      </Button>
    </div>
  );
}

// ── Custom Report Builder ─────────────────────────────────────────────────────

const CUSTOM_BUILDER_TABLES: Record<string, string[]> = {
  documents: ['id', 'title', 'status', 'file_type', 'file_size', 'created_at', 'expiry_date', 'category_id', 'customer_id', 'uploaded_by'],
  customers: ['id', 'full_name', 'account_number', 'email', 'phone', 'created_at'],
  incidents: ['id', 'incident_number', 'incident_type', 'severity', 'status', 'department', 'created_at', 'updated_at'],
  audit_logs: ['id', 'action', 'entity_type', 'entity_id', 'user_id', 'created_at', 'ip_address'],
  profiles: ['user_id', 'full_name', 'email', 'department', 'created_at'],
  vendor_issues: ['id', 'vendor', 'issue', 'impact', 'status', 'uptime_percentage', 'created_at'],
  tasks: ['id', 'title', 'status', 'priority', 'created_at', 'due_date', 'created_by'],
};

type CustomFilter = { column: string; operator: string; value: string };

function CustomReportBuilder({ onFiltersChange }: { onFiltersChange: (f: ReportFilters) => void }) {
  const [table, setTable] = useState('');
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [customFilters, setCustomFilters] = useState<CustomFilter[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [chartType, setChartType] = useState('none');
  const [chartColumn, setChartColumn] = useState('');

  const availableCols = table ? CUSTOM_BUILDER_TABLES[table] || [] : [];

  const toggleCol = (col: string) => {
    setSelectedCols(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };

  const addFilter = () => {
    if (customFilters.length < 5) setCustomFilters(prev => [...prev, { column: '', operator: 'equals', value: '' }]);
  };

  const removeFilter = (i: number) => setCustomFilters(prev => prev.filter((_, idx) => idx !== i));

  const updateFilter = (i: number, field: keyof CustomFilter, value: string) => {
    setCustomFilters(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: value } : f));
  };

  const handleRun = () => {
    onFiltersChange({ table, columns: selectedCols, customFilters, dateFrom, dateTo, chartType, chartColumn });
  };

  return (
    <div className="space-y-6 p-4">
      {/* Step 1 — Data source */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Step 1 — Select Data Source</h3>
        <Select value={table} onValueChange={v => { setTable(v); setSelectedCols([]); setCustomFilters([]); }}>
          <SelectTrigger className="w-52 h-8 text-xs"><SelectValue placeholder="Choose a table..." /></SelectTrigger>
          <SelectContent>
            {Object.keys(CUSTOM_BUILDER_TABLES).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Step 2 — Columns */}
      {table && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Step 2 — Select Columns</h3>
          <div className="flex flex-wrap gap-2">
            {availableCols.map(col => (
              <label key={col} className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox checked={selectedCols.includes(col)} onCheckedChange={() => toggleCol(col)} />
                {col}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Step 3 — Filters */}
      {table && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Step 3 — Add Filters <span className="text-muted-foreground font-normal">(up to 5)</span></h3>
          <div className="space-y-2">
            {customFilters.map((f, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Select value={f.column} onValueChange={v => updateFilter(i, 'column', v)}>
                  <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Column" /></SelectTrigger>
                  <SelectContent>{availableCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={f.operator} onValueChange={v => updateFilter(i, 'operator', v)}>
                  <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">equals</SelectItem>
                    <SelectItem value="contains">contains</SelectItem>
                    <SelectItem value="greater_than">greater than</SelectItem>
                    <SelectItem value="less_than">less than</SelectItem>
                  </SelectContent>
                </Select>
                <Input className="h-7 text-xs w-32" value={f.value} onChange={e => updateFilter(i, 'value', e.target.value)} placeholder="Value" />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFilter(i)}><X className="h-3 w-3" /></Button>
              </div>
            ))}
            {customFilters.length < 5 && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addFilter}>
                <Plus className="h-3 w-3 mr-1" /> Add Filter
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Step 4 — Date range */}
      {table && availableCols.includes('created_at') && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Step 4 — Date Range</h3>
          <div className="flex gap-3">
            <div>
              <Label className="text-xs mb-1 block">From</Label>
              <Input type="date" className="h-8 text-xs w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">To</Label>
              <Input type="date" className="h-8 text-xs w-36" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Step 5 — Chart config */}
      {selectedCols.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Step 5 — Chart Config</h3>
          <div className="flex gap-3 items-end">
            <div>
              <Label className="text-xs mb-1 block">Chart Type</Label>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="pie">Pie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {chartType !== 'none' && (
              <div>
                <Label className="text-xs mb-1 block">Group By Column</Label>
                <Select value={chartColumn} onValueChange={setChartColumn}>
                  <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Choose..." /></SelectTrigger>
                  <SelectContent>{selectedCols.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 6 — Run */}
      {table && selectedCols.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Step 6 — Run Report</h3>
          <Button onClick={handleRun} size="sm">
            <RefreshCw className="h-3 w-3 mr-1" /> Run Report
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Custom Report Results ─────────────────────────────────────────────────────

function CustomResults({ data, filters, isLoading, chartData }: {
  data: Record<string, unknown>[];
  filters: ReportFilters;
  isLoading: boolean;
  chartData: { name: string; value: number }[];
}) {
  const cols: ColDef[] = (filters.columns as string[] || []).map(c => ({ key: c, header: c }));

  const renderCustomChart = () => {
    if (!filters.chartType || filters.chartType === 'none' || chartData.length === 0) return null;
    const h = 240;
    if (filters.chartType === 'pie') return (
      <ResponsiveContainer width="100%" height={h}>
        <PieChart><Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
          {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Pie><Tooltip /><Legend /></PieChart>
      </ResponsiveContainer>
    );
    if (filters.chartType === 'line') return (
      <ResponsiveContainer width="100%" height={h}>
        <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} />
          <Tooltip /><Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
    return (
      <ResponsiveContainer width="100%" height={h}>
        <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} />
          <Tooltip /><Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]}>
            {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  if (isLoading) return <Skeleton className="h-48 w-full mt-4" />;
  if (!filters.table || !filters.columns) return null;

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <p className="text-xl font-bold">{data.length}</p>
            <p className="text-xs text-muted-foreground">Total Rows</p>
          </div>
        </CardContent>
      </Card>
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Chart</CardTitle></CardHeader>
          <CardContent>{renderCustomChart()}</CardContent>
        </Card>
      )}
      <ReportTable data={data} columns={cols} isLoading={false} />
      <ExportBar data={data} reportType="custom" reportLabel="Custom Report" isLoading={false} />
    </div>
  );
}

// ── Report Viewer ─────────────────────────────────────────────────────────────

function ReportViewer({ reportItem, onSave }: {
  reportItem: ReportItem;
  onSave: (config: SavedReport) => void;
}) {
  const thirtyAgo = subDays(new Date(), 30).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  const defaultFilters: ReportFilters = reportItem.id === 'password-expiry'
    ? { window: '30' }
    : reportItem.id === 'document-expiry'
    ? { window: '90', dateFrom: thirtyAgo, dateTo: today }
    : reportItem.id === 'custom'
    ? {}
    : { dateFrom: thirtyAgo, dateTo: today };

  const [filters, setFilters] = useState<ReportFilters>(defaultFilters);
  const [runFilters, setRunFilters] = useState<ReportFilters>(defaultFilters);

  const { data, summary, chartData, chartData2, isLoading, refetch } = useReports(
    reportItem.id === 'custom' && !runFilters.table ? '' : reportItem.id,
    runFilters
  );

  const handleRun = () => { setRunFilters({ ...filters }); };

  const handleSave = () => {
    const id = crypto.randomUUID();
    const label = `${reportItem.label} — ${new Date().toLocaleDateString()}`;
    onSave({ id, label, reportType: reportItem.id, filters: runFilters, savedAt: new Date().toISOString() });
  };

  const tableColumns = TABLE_COLUMNS[reportItem.id] || [];

  if (reportItem.id === 'custom') {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">{reportItem.icon} {reportItem.label}</h2>
            <p className="text-sm text-muted-foreground">{reportItem.description}</p>
          </div>
        </div>
        <CustomReportBuilder onFiltersChange={f => { setFilters(f); setRunFilters(f); }} />
        <CustomResults
          data={data}
          filters={runFilters}
          isLoading={isLoading}
          chartData={chartData}
        />
        {data.length > 0 && (
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="h-3 w-3 mr-1" /> Save Report
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold">{reportItem.icon} {reportItem.label}</h2>
          <p className="text-sm text-muted-foreground">{reportItem.description}</p>
        </div>
        {data.length > 0 && !isLoading && (
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="h-3 w-3 mr-1" /> Save Report
          </Button>
        )}
      </div>

      <FiltersBar
        reportType={reportItem.id}
        filters={filters}
        onChange={setFilters}
        onRun={handleRun}
        isLoading={isLoading}
      />

      {reportItem.id === 'audit-trail' && (
        <p className="text-xs text-muted-foreground mb-2">Showing most recent 1,000 entries. Use Export for the full dataset.</p>
      )}

      <SummaryCards summary={summary} reportType={reportItem.id} isLoading={isLoading} />

      <Card className="mb-4">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Chart</CardTitle></CardHeader>
        <CardContent>
          <ReportChart chartData={chartData} chartData2={chartData2} reportType={reportItem.id} isLoading={isLoading} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Data</CardTitle></CardHeader>
        <CardContent>
          <ReportTable data={data} columns={tableColumns} isLoading={isLoading} />
          <ExportBar data={data} reportType={reportItem.id} reportLabel={reportItem.label} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Welcome Placeholder ───────────────────────────────────────────────────────

function WelcomePlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
      <BarChart3 className="h-16 w-16 text-muted-foreground/30 mb-4" />
      <h3 className="text-xl font-semibold mb-2">Select a Report</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Choose a report from the catalog on the left to get started. You can filter, view charts, and export data in multiple formats.
      </p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReportsHub() {
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'document-vault': true, 'operations': true, 'user-system': true, 'custom': true, 'saved': true,
  });
  const { savedReports, saveReport, deleteReport } = useSavedReports();

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = (config: SavedReport) => {
    saveReport(config);
  };

  return (
    <AppLayout title="Reports Hub" description="Generate, customize and export reports across all UMS Hub data">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col h-[calc(100vh-7rem)]"
      >
        <PageHeader
          title="Reports Hub"
          description="Generate, customize and export reports across all UMS Hub data"
          className="mb-3 sm:mb-4 flex-shrink-0"
        />
      <div className="flex flex-1 min-h-0 border rounded-xl overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-[240px] sm:w-[260px] flex-shrink-0 border-r bg-muted/30 overflow-y-auto">
          <div className="p-2">
            {REPORT_CATALOG.map(group => (
              <div key={group.id} className="mb-1">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <group.Icon className="h-3.5 w-3.5" />
                    <span>{group.label}</span>
                  </div>
                  <ChevronDown className={`h-3 w-3 transition-transform ${openGroups[group.id] ? '' : '-rotate-90'}`} />
                </button>
                {openGroups[group.id] && (
                  <div className="space-y-0.5">
                    {group.reports.map(r => (
                      <button
                        key={r.id}
                        onClick={() => setSelectedReport(r)}
                        className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${selectedReport?.id === r.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'}`}
                      >
                        <span className="text-base leading-none">{r.icon}</span>
                        <span className="truncate text-xs">{r.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Saved Reports section */}
            {savedReports.length > 0 && (
              <div className="mb-1">
                <button
                  onClick={() => toggleGroup('saved')}
                  className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <Save className="h-3.5 w-3.5" />
                    <span>Saved Reports</span>
                  </div>
                  <ChevronDown className={`h-3 w-3 transition-transform ${openGroups['saved'] ? '' : '-rotate-90'}`} />
                </button>
                {openGroups['saved'] && (
                  <div className="space-y-0.5">
                    {savedReports.map(s => {
                      const allReports = REPORT_CATALOG.flatMap(g => g.reports);
                      const rItem = allReports.find(r => r.id === s.reportType);
                      const savedItem: ReportItem = rItem
                        ? { ...rItem, id: s.reportType }
                        : { id: s.reportType, label: s.label, icon: '📋', description: 'Saved report' };
                      return (
                        <div key={s.id} className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedReport(savedItem);
                            }}
                            className={`flex-1 text-left flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors ${selectedReport?.id === s.reportType && selectedReport?.label === s.label ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'}`}
                          >
                            <span>{savedItem.icon}</span>
                            <span className="truncate">{s.label}</span>
                          </button>
                          <button
                            onClick={() => deleteReport(s.id)}
                            className="p-1 hover:text-destructive transition-colors text-muted-foreground flex-shrink-0"
                            title="Delete saved report"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Right main area */}
        <main className="flex-1 overflow-y-auto bg-background">
          {selectedReport
            ? <ReportViewer key={selectedReport.id} reportItem={selectedReport} onSave={handleSave} />
            : <WelcomePlaceholder />
          }
        </main>
      </div>
      </motion.div>
    </AppLayout>
  );
}
