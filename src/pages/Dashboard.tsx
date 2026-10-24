import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { SmsBanner } from '@/components/SmsBanner';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { useStats } from '@/hooks/useStats';
import { useDocuments } from '@/hooks/useDocuments';
import { useReminders } from '@/hooks/useReminders';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { useStreakWidget } from '@/hooks/useStreakWidget';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  FileText,
  Users,
  Upload,
  Clock,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  HardDrive,
  Bell,
  ListTodo,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Flame,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Zap,
  FolderOpen,
  Eye,
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, subDays } from 'date-fns';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.3, ease: 'easeOut' } }),
};

export default function Dashboard() {
  const { isAdmin, isStaff, isCustomer, profile } = useAuth();
  const { stats, loading: statsLoading } = useStats();
  const { documents, loading: docsLoading } = useDocuments({ limit: 2 });
  const { reminders, loading: remindersLoading } = useReminders();
  const { tasks, loading: tasksLoading } = useTasks();

  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const { currentStreak, todayXp } = useStreakWidget();

  // Upload trend — uploads per month (last 6 months)
  const { data: uploadTrend = [] } = useQuery({
    queryKey: ['dashboard_upload_trend'],
    queryFn: async () => {
      const months: Array<{ name: string; count: number; fullName: string }> = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const from = startOfMonth(d).toISOString();
        const to = endOfMonth(d).toISOString();
        const { count } = await supabase.from('documents').select('*', { count: 'exact', head: true }).gte('created_at', from).lte('created_at', to);
        months.push({ name: format(d, 'MMM'), fullName: format(d, 'MMMM yyyy'), count: count ?? 0 });
      }
      return months;
    },
    enabled: isAdmin || isStaff,
  });

  // Uploads this week (by day)
  const { data: weeklyUploads = [] } = useQuery({
    queryKey: ['dashboard_weekly_uploads'],
    queryFn: async () => {
      const days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
      const results = await Promise.all(days.map(async (d) => {
        const from = new Date(d); from.setHours(0, 0, 0, 0);
        const to = new Date(d); to.setHours(23, 59, 59, 999);
        const { count } = await supabase.from('documents').select('*', { count: 'exact', head: true }).gte('created_at', from.toISOString()).lte('created_at', to.toISOString());
        return { name: format(d, 'EEE'), fullName: format(d, 'EEEE, MMM d'), count: count ?? 0 };
      }));
      return results;
    },
    enabled: isAdmin || isStaff,
  });

  // Top uploaders (last 30 days)
  const { data: topUploaders = [] } = useQuery({
    queryKey: ['dashboard_top_uploaders'],
    queryFn: async () => {
      const since = subDays(new Date(), 30).toISOString();
      const { data } = await supabase.from('documents').select('uploaded_by').gte('created_at', since);
      if (!data) return [];
      const counts: Record<string, number> = {};
      data.forEach(d => { if (d.uploaded_by) counts[d.uploaded_by] = (counts[d.uploaded_by] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', sorted.map(s => s[0]));
      const nameMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p.full_name]));
      return sorted.map(([uid, count]) => ({ name: nameMap[uid] || 'Unknown', count }));
    },
    enabled: isAdmin || isStaff,
  });

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setShowWelcomeDialog(true);
    }
  }, []);

  const handleWelcomeClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('hasSeenWelcome', 'true');
    }
    setShowWelcomeDialog(false);
  };

  const getWelcomeMessage = () => {
    if (isAdmin) return "You have full access to manage users, documents, and system settings.";
    if (isStaff) return "You can upload, manage documents, and assist customers.";
    if (isCustomer) return "You can view and upload your documents.";
    return "Welcome to UMS Kenya Document Management Portal.";
  };

  const pendingReminders = reminders.filter(r => r.status === 'pending').slice(0, 5);
  const activeTasks = tasks.filter(t => t.status !== 'completed').slice(0, 5);

  // Compute trend vs previous month
  const currentMonthCount = uploadTrend[uploadTrend.length - 1]?.count ?? 0;
  const prevMonthCount = uploadTrend[uploadTrend.length - 2]?.count ?? 0;
  const uploadTrendPct = prevMonthCount > 0
    ? Math.round(((currentMonthCount - prevMonthCount) / prevMonthCount) * 100)
    : 0;

  const weekTotal = weeklyUploads.reduce((s, d) => s + d.count, 0);
  const prevWeekTotal = weekTotal; // placeholder — we only have current week

  return (
    <>
      <Dialog open={showWelcomeDialog} onOpenChange={setShowWelcomeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Welcome to UMS Kenya!
            </DialogTitle>
            <DialogDescription>{getWelcomeMessage()}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-2">
            <Checkbox
              id="dontShowAgain"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <Label htmlFor="dontShowAgain" className="text-sm cursor-pointer">
              Don't show this again
            </Label>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleWelcomeClose}>Get Started</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AppLayout
        title={`Welcome, ${profile?.full_name || 'User'}`}
        description="UMS Kenya Document Management Dashboard"
      >
        {/* SMS Setup Prompt */}
        <SmsBanner />

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Your activity overview and quick access</p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild size="sm">
                <Link to="/docs/upload">
                  <Plus className="mr-2 h-4 w-4" />
                  Upload
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/docs/search">
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* ── Quick Actions ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Upload Document', icon: Upload, href: '/docs/upload', color: 'bg-primary/10 text-primary' },
            { label: 'Browse Documents', icon: FolderOpen, href: '/docs/documents', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
            { label: 'Search', icon: Search, href: '/docs/search', color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
            { label: 'View Reports', icon: BarChart3, href: '/docs/reports', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
          ].map((action, i) => (
            <motion.div key={action.href} custom={i} variants={fadeUp} initial="hidden" animate="visible">
              <Link to={action.href}>
                <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${action.color}`}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">{action.label}</span>
                    <ArrowUpRight className="h-4 w-4 ml-auto text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* ── Stats Cards ────────────────────────────────────────────────────── */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {statsLoading ? (
            [1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
                <StatsCard
                  title="Total Documents"
                  value={stats.totalDocuments}
                  icon={<FileText className="h-5 w-5 sm:h-6 sm:w-6" />}
                  description="All uploaded documents"
                  trend={uploadTrendPct !== 0 ? { value: Math.abs(uploadTrendPct), isPositive: uploadTrendPct > 0 } : undefined}
                />
              </motion.div>
              <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
                <StatsCard
                  title="Pending Review"
                  value={stats.pendingDocuments}
                  icon={<Clock className="h-5 w-5 sm:h-6 sm:w-6" />}
                  description="Awaiting approval"
                />
              </motion.div>
              <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible">
                <StatsCard
                  title="Recent Uploads"
                  value={stats.recentUploads}
                  icon={<TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />}
                  description="Last 7 days"
                />
              </motion.div>
              {(isAdmin || isStaff) && (
                <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible">
                  <StatsCard
                    title="Total Customers"
                    value={stats.totalCustomers}
                    icon={<Users className="h-5 w-5 sm:h-6 sm:w-6" />}
                    description="Registered accounts"
                  />
                </motion.div>
              )}
              {isAdmin && (
                <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible">
                  <StatsCard
                    title="Total Users"
                    value={stats.totalUsers}
                    icon={<Users className="h-5 w-5 sm:h-6 sm:w-6" />}
                    description="System users"
                  />
                </motion.div>
              )}
              {isAdmin && (
                <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible">
                  <StatsCard
                    title="Storage Used"
                    value={formatBytes(stats.totalStorageBytes)}
                    icon={<HardDrive className="h-5 w-5 sm:h-6 sm:w-6" />}
                    description="Total file storage"
                  />
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* ── Task Statistics - Admin Only ──────────────────────────────────── */}
        {isAdmin && (
          <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4 mb-6">
            {[
              { label: 'Pending Tasks', count: tasks.filter(t => t.status === 'pending').length, color: 'amber', icon: Clock },
              { label: 'In Progress', count: tasks.filter(t => t.status === 'in_progress').length, color: 'blue', icon: TrendingUp },
              { label: 'Completed', count: tasks.filter(t => t.status === 'completed').length, color: 'green', icon: CheckCircle2 },
              { label: 'Overdue', count: tasks.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date()).length, color: 'red', icon: AlertTriangle },
            ].map((item, i) => (
              <motion.div key={item.label} custom={i} variants={fadeUp} initial="hidden" animate="visible">
                <Card className={`bg-${item.color}-50 dark:bg-${item.color}-950/20 border-${item.color}-200 dark:border-${item.color}-800 hover:shadow-md transition-shadow`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs text-${item.color}-700 dark:text-${item.color}-400 font-medium`}>{item.label}</p>
                        <p className={`text-2xl font-bold text-${item.color}-700 dark:text-${item.color}-400`}>{item.count}</p>
                      </div>
                      <item.icon className={`h-8 w-8 text-${item.color}-500 opacity-50`} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Weekly Activity + Reminders + Tasks ──────────────────────────── */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3 mb-6">
          {/* Weekly activity summary card */}
          {(isAdmin || isStaff) && (
            <Card className="lg:col-span-1">
              <CardHeader className="py-3 pb-0 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Weekly Uploads
                </CardTitle>
                <Badge variant="secondary" className="text-xs">{weekTotal} this week</Badge>
              </CardHeader>
              <CardContent className="pt-3 pb-4">
                {weeklyUploads.length === 0 ? (
                  <Skeleton className="h-28 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={110}>
                    <BarChart data={weeklyUploads} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: 12 }}
                        formatter={(value: number) => [`${value} upload${value !== 1 ? 's' : ''}`, '']}
                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName ?? label}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Reminders */}
          <Card className="py-0">
            <CardHeader className="py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Upcoming Reminders
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
                <Link to="/docs/reminders">View All</Link>
              </Button>
            </CardHeader>
            <CardContent className="py-2">
              {remindersLoading ? (
                <div className="space-y-1">{[1, 2].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : pendingReminders.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Bell className="mx-auto h-6 w-6 mb-2 opacity-30" />
                  <p className="text-xs font-medium">No pending reminders</p>
                  <p className="text-xs">You're all caught up</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {pendingReminders.slice(0, 3).map(r => {
                    const isPast = new Date(r.reminder_date) < new Date();
                    return (
                      <div key={r.id} className={`flex items-center justify-between p-2 rounded text-xs ${isPast ? 'bg-destructive/10' : 'bg-muted/50'}`}>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{r.title}</p>
                          <p className={`text-xs ${isPast ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {isPast ? 'Overdue: ' : ''}{format(new Date(r.reminder_date), 'MMM d, p')}
                          </p>
                        </div>
                        {r.recurrence !== 'none' && (
                          <Badge variant="outline" className="text-xs ml-1">{r.recurrence}</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Tasks */}
          <Card className="py-0">
            <CardHeader className="py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                Active Tasks
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
                <Link to="/docs/tasks">View All</Link>
              </Button>
            </CardHeader>
            <CardContent className="py-2">
              {tasksLoading ? (
                <div className="space-y-1">{[1, 2].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : activeTasks.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle2 className="mx-auto h-6 w-6 mb-2 opacity-30" />
                  <p className="text-xs font-medium">No active tasks</p>
                  <p className="text-xs">All tasks completed</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {activeTasks.slice(0, 3).map(t => {
                    const isOverdue = t.due_date && new Date(t.due_date) < new Date();
                    return (
                      <div key={t.id} className={`flex items-center justify-between p-2 rounded text-xs ${isOverdue ? 'bg-destructive/10' : 'bg-muted/50'}`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p className="font-medium truncate">{t.title}</p>
                            {t.priority === 'high' && <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />}
                          </div>
                          <p className={`text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {t.due_date ? `${isOverdue ? 'Overdue: ' : 'Due: '}${format(new Date(t.due_date), 'MMM d')}` : 'No due date'}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs ml-1">
                          {t.status === 'in_progress' ? 'In Progress' : 'Pending'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Gamification + Recent Docs + Category Chart ──────────────────── */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3 mb-6">
          {/* Gamification */}
          <Card>
            <CardHeader className="py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                My Progress
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
                <Link to="/docs/gamification">View →</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                <Flame className="h-6 w-6 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold">{currentStreak} day streak</p>
                  <p className="text-xs text-muted-foreground">Keep uploading daily!</p>
                </div>
              </div>
              {todayXp > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <Sparkles className="h-5 w-5 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-400">+{todayXp} XP today</p>
                    <p className="text-xs text-muted-foreground">Great work!</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Zap className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Keep it up!</p>
                  <p className="text-xs text-muted-foreground">Upload docs to earn XP badges</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Documents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Recent Documents
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
                <Link to="/docs/documents">View All</Link>
              </Button>
            </CardHeader>
            <CardContent className="pb-4">
              {docsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <FileText className="mx-auto h-10 w-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No documents yet</p>
                  <Button variant="link" size="sm" asChild className="mt-1">
                    <Link to="/docs/upload">Upload your first document</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      showCustomer={isAdmin || isStaff}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents by Category */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Eye className="h-4 w-4" />
                By Category
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {statsLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : stats.documentsByCategory.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <BarChart3 className="mx-auto h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">No documents yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={stats.documentsByCategory}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {stats.documentsByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${(index * 360) / stats.documentsByCategory.length}, 65%, 50%)`} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value} docs`, 'Count']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: 12 }}
                    />
                    <Legend
                      layout="vertical"
                      verticalAlign="middle"
                      align="right"
                      iconSize={8}
                      formatter={(value) => <span style={{ fontSize: 11 }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Upload Trend Chart (Admin/Staff) ────────────────────────────── */}
        {(isAdmin || isStaff) && (
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Upload Trend</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Documents uploaded per month — last 6 months</p>
              </div>
              {uploadTrendPct !== 0 && (
                <Badge
                  variant="outline"
                  className={`gap-1 ${uploadTrendPct > 0 ? 'text-green-600 border-green-300' : 'text-destructive border-destructive/30'}`}
                >
                  {uploadTrendPct > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(uploadTrendPct)}% vs last month
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {uploadTrend.length === 0 ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={uploadTrend} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: 12 }}
                      formatter={(value: number) => [`${value} document${value !== 1 ? 's' : ''}`, 'Uploads']}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName ?? label}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      formatter={() => <span style={{ fontSize: 12 }}>Uploads</span>}
                    />
                    <Bar dataKey="count" name="Uploads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Top Uploaders (Admin) ───────────────────────────────────────── */}
        {isAdmin && topUploaders.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Top Uploaders (last 30 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topUploaders.map((uploader, i) => (
                  <div key={uploader.name} className="flex items-center gap-3">
                    <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium truncate">{uploader.name}</span>
                        <span className="text-muted-foreground ml-2 flex-shrink-0">{uploader.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${(uploader.count / (topUploaders[0]?.count || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Storage Breakdown - Admin Only ──────────────────────────────── */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Storage by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : stats.storageByCategory.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <HardDrive className="mx-auto h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">No storage data</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.storageByCategory.map((cat) => {
                    const pct = stats.totalStorageBytes > 0
                      ? Math.round((cat.bytes / stats.totalStorageBytes) * 100)
                      : 0;
                    return (
                      <div key={cat.name} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{cat.name}</span>
                          <span className="text-sm text-muted-foreground flex-shrink-0 ml-2">
                            {formatBytes(cat.bytes)} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </AppLayout>
    </>
  );
}
