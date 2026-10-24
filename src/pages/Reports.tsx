import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { exportToCSV, exportToPDF } from '@/lib/export-utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart,
} from 'recharts';
import {
  FileText, Users, ListTodo, MessageSquare, Download, TrendingUp,
  Calendar, BarChart3, PieChart as PieChartIcon, FileDown, ArrowRight,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

const COLORS = ['hsl(221, 83%, 53%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(262, 83%, 58%)', 'hsl(174, 72%, 40%)'];

export default function Reports() {
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);
  const [docStats, setDocStats] = useState<any>({ byCategory: [], byStatus: [], byDay: [], total: 0 });
  const [taskStats, setTaskStats] = useState<any>({ byStatus: [], byPriority: [], completionRate: 0, total: 0 });
  const [userStats, setUserStats] = useState<any>({ byRole: [], total: 0 });
  const [smsStats, setSmsStats] = useState<any>({ byType: [], byStatus: [], total: 0, delivered: 0 });

  useEffect(() => {
    fetchAllStats();
  }, [period]);

  const fetchAllStats = async () => {
    setLoading(true);
    const since = subDays(new Date(), parseInt(period)).toISOString();
    await Promise.all([
      fetchDocStats(since),
      fetchTaskStats(since),
      fetchUserStats(),
      fetchSmsStats(since),
    ]);
    setLoading(false);
  };

  const fetchDocStats = async (since: string) => {
    const { data: docs } = await supabase.from('documents').select('id, status, category_id, created_at, file_size').gte('created_at', since);
    const { data: cats } = await supabase.from('document_categories').select('id, name');
    const catMap = Object.fromEntries((cats || []).map(c => [c.id, c.name]));

    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byDay: Record<string, number> = {};

    (docs || []).forEach(d => {
      const catName = catMap[d.category_id] || 'Unknown';
      byCategory[catName] = (byCategory[catName] || 0) + 1;
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
      const day = format(new Date(d.created_at), 'MMM d');
      byDay[day] = (byDay[day] || 0) + 1;
    });

    setDocStats({
      byCategory: Object.entries(byCategory).map(([name, count]) => ({ name, count })),
      byStatus: Object.entries(byStatus).map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count })),
      byDay: Object.entries(byDay).map(([name, count]) => ({ name, count })),
      total: docs?.length || 0,
    });
  };

  const fetchTaskStats = async (since: string) => {
    const { data: tasks } = await supabase.from('tasks').select('id, status, priority, created_at').gte('created_at', since);
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    (tasks || []).forEach(t => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    });
    const completed = byStatus['completed'] || 0;
    const total = tasks?.length || 0;

    setTaskStats({
      byStatus: Object.entries(byStatus).map(([name, count]) => ({ name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()), count })),
      byPriority: Object.entries(byPriority).map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count })),
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      total,
    });
  };

  const fetchUserStats = async () => {
    const { data: roles } = await supabase.from('user_roles').select('role');
    const byRole: Record<string, number> = {};
    (roles || []).forEach(r => {
      byRole[r.role] = (byRole[r.role] || 0) + 1;
    });
    setUserStats({
      byRole: Object.entries(byRole).map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count })),
      total: roles?.length || 0,
    });
  };

  const fetchSmsStats = async (since: string) => {
    const { data: sms } = await supabase.from('sms_logs').select('id, sms_type, status, created_at').gte('created_at', since);
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    (sms || []).forEach(s => {
      byType[s.sms_type] = (byType[s.sms_type] || 0) + 1;
      byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    });

    setSmsStats({
      byType: Object.entries(byType).map(([name, count]) => ({ name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), count })),
      byStatus: Object.entries(byStatus).map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count })),
      total: sms?.length || 0,
      delivered: (sms || []).filter(s => s.status === 'delivered').length,
    });
  };

  const exportExecutiveSummary = () => {
    const summaryData: { metric: string; value: string | number }[] = [
      { metric: 'Total Documents', value: docStats.total },
      ...docStats.byCategory.map((c: any) => ({ metric: `Documents — ${c.name}`, value: c.count })),
      ...docStats.byStatus.map((s: any) => ({ metric: `Doc Status — ${s.name}`, value: s.count })),
      { metric: 'Total Tasks', value: taskStats.total },
      { metric: 'Task Completion Rate', value: `${taskStats.completionRate}%` },
      ...taskStats.byStatus.map((s: any) => ({ metric: `Task Status — ${s.name}`, value: s.count })),
      { metric: 'Total Users', value: userStats.total },
      { metric: 'Total SMS Sent', value: smsStats.total },
      { metric: 'SMS Delivered', value: smsStats.delivered },
    ];
    exportToPDF(
      summaryData,
      'executive-summary',
      [{ key: 'metric', header: 'Metric' }, { key: 'value', header: 'Value' }],
      'UMS Hub — Executive Summary',
    );
  };

  const exportDocReport = () => {
    const data = docStats.byCategory.map((c: any) => ({ category: c.name, documents: c.count }));
    exportToPDF(data, 'document-report', [
      { key: 'category', header: 'Category' },
      { key: 'documents', header: 'Documents' },
    ], `Document Report - Last ${period} Days`);
  };

  const exportTaskReport = () => {
    const data = taskStats.byStatus.map((s: any) => ({ status: s.name, count: s.count }));
    exportToPDF(data, 'task-report', [
      { key: 'status', header: 'Status' },
      { key: 'count', header: 'Count' },
    ], `Task Report - Last ${period} Days`);
  };

  const exportSmsReport = () => {
    const data = smsStats.byType.map((t: any) => ({ type: t.name, count: t.count }));
    exportToCSV(data, 'sms-report', [
      { key: 'type', header: 'SMS Type' },
      { key: 'count', header: 'Count' },
    ]);
  };

  return (
    <AppLayout title="Reports & Analytics" description="System performance metrics and downloadable reports">
      {/* Reports Hub upgrade banner */}
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 px-4 py-3 text-sm">
        <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <div className="flex-1">
          <span className="font-medium text-blue-900 dark:text-blue-200">
            New: Reports Hub is now available.
          </span>{' '}
          <span className="text-blue-700 dark:text-blue-300">
            Generate customized reports across all UMS Hub data, build custom queries, and export to CSV, PDF, or Excel.
          </span>
        </div>
        <Link
          to="/admin/reports"
          className="flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 whitespace-nowrap"
        >
          Open Reports Hub <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Period Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="365">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportDocReport}>
            <FileDown className="h-4 w-4 mr-2" />
            Documents PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportTaskReport}>
            <FileDown className="h-4 w-4 mr-2" />
            Tasks PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportSmsReport}>
            <Download className="h-4 w-4 mr-2" />
            SMS CSV
          </Button>
          <Button variant="default" size="sm" onClick={exportExecutiveSummary} disabled={loading}>
            <FileDown className="h-4 w-4 mr-2" />
            Executive Summary PDF
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {loading ? (
          [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{docStats.total}</p>
                  <p className="text-xs text-muted-foreground">Documents</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-900/30">
                  <ListTodo className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{taskStats.total}</p>
                  <p className="text-xs text-muted-foreground">Tasks ({taskStats.completionRate}% done)</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userStats.total}</p>
                  <p className="text-xs text-muted-foreground">Users</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                  <MessageSquare className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{smsStats.total}</p>
                  <p className="text-xs text-muted-foreground">SMS ({smsStats.delivered} delivered)</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[300px]" />)}
        </div>
      ) : (
        <>
          {/* Document Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Documents by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                {docStats.byCategory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={docStats.byCategory}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4" /> Documents by Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {docStats.byStatus.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={docStats.byStatus} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                        {docStats.byStatus.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Upload Trend */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Upload Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {docStats.byDay.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={docStats.byDay}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="hsl(221, 83%, 53%)" fill="hsl(221, 83%, 53%)" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Task & SMS Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ListTodo className="h-4 w-4" /> Tasks by Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {taskStats.byStatus.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={taskStats.byStatus} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                        {taskStats.byStatus.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> SMS by Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                {smsStats.byType.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={smsStats.byType} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Users by Role */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Users by Role
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {userStats.byRole.map((r: any, i: number) => (
                  <div key={r.name} className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <div>
                      <p className="font-semibold text-lg">{r.count}</p>
                      <p className="text-sm text-muted-foreground">{r.name}s</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </AppLayout>
  );
}
