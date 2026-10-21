import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SmsBanner } from '@/components/SmsBanner';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { useStats } from '@/hooks/useStats';
import { useDocuments } from '@/hooks/useDocuments';
import { useReminders } from '@/hooks/useReminders';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
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
  Plus,
  Search,
  HardDrive,
  Bell,
  ListTodo,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function Dashboard() {
  const { isAdmin, isStaff, isCustomer, profile } = useAuth();
  const { stats, loading: statsLoading } = useStats();
  const { documents, loading: docsLoading } = useDocuments({ limit: 2 });
  const { reminders, loading: remindersLoading } = useReminders();
  const { tasks, loading: tasksLoading } = useTasks();

  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

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
    if (isAdmin) {
      return "You have full access to manage users, documents, and system settings.";
    } else if (isStaff) {
      return "You can upload, manage documents, and assist customers.";
    } else if (isCustomer) {
      return "You can view and upload your documents.";
    }
    return "Welcome to UMS Kenya Document Management Portal.";
  };

  const pendingReminders = reminders.filter(r => r.status === 'pending').slice(0, 5);
  const activeTasks = tasks.filter(t => t.status !== 'completed').slice(0, 5);
  return (
    <>
    <Dialog open={showWelcomeDialog} onOpenChange={setShowWelcomeDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Welcome to UMS Kenya!
          </DialogTitle>
          <DialogDescription>
            {getWelcomeMessage()}
          </DialogDescription>
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
          <Button onClick={handleWelcomeClose}>
            Get Started
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    <AppLayout
      title={`Welcome, ${profile?.full_name || 'User'}`}
      description="UMS Kenya Document Management Dashboard"
    >
      {/* SMS Setup Prompt */}
      <SmsBanner />

      {/* Quick Actions */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
        <Button asChild className="w-full sm:w-auto">
          <Link to="/upload">
            <Plus className="mr-2 h-4 w-4" />
            Upload Document
          </Link>
        </Button>
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link to="/search">
            <Search className="mr-2 h-4 w-4" />
            Search Documents
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 mb-4 sm:mb-6">
        {statsLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4 sm:p-6">
                  <Skeleton className="h-16 sm:h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatsCard
              title="Total Documents"
              value={stats.totalDocuments}
              icon={<FileText className="h-5 w-5 sm:h-6 sm:w-6" />}
              description="All uploaded documents"
            />
            <StatsCard
              title="Pending Review"
              value={stats.pendingDocuments}
              icon={<Clock className="h-5 w-5 sm:h-6 sm:w-6" />}
              description="Documents awaiting approval"
            />
            <StatsCard
              title="Recent Uploads"
              value={stats.recentUploads}
              icon={<TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />}
              description="Last 7 days"
            />
            {(isAdmin || isStaff) && (
              <StatsCard
                title="Total Customers"
                value={stats.totalCustomers}
                icon={<Users className="h-5 w-5 sm:h-6 sm:w-6" />}
                description="Registered accounts"
              />
            )}
            {isAdmin && (
              <StatsCard
                title="Total Users"
                value={stats.totalUsers}
                icon={<Users className="h-5 w-5 sm:h-6 sm:w-6" />}
                description="System users"
              />
            )}
            {isAdmin && (
              <StatsCard
                title="Storage Used"
                value={formatBytes(stats.totalStorageBytes)}
                icon={<HardDrive className="h-5 w-5 sm:h-6 sm:w-6" />}
                description="Total file storage"
              />
            )}
          </>
        )}
      </div>

      {/* Task Statistics - Admin Only */}
      {isAdmin && (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4 mb-4 sm:mb-6">
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Pending Tasks</p>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                    {tasks.filter(t => t.status === 'pending').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-amber-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">In Progress</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {tasks.filter(t => t.status === 'in_progress').length}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 dark:text-green-400 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {tasks.filter(t => t.status === 'completed').length}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-700 dark:text-red-400 font-medium">Overdue</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                    {tasks.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date()).length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming Reminders & Active Tasks - Compact */}
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-2 mb-4">
        {/* Upcoming Reminders */}
        <Card className="py-0">
          <CardHeader className="py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Upcoming Reminders
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
              <Link to="/reminders">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="py-2">
            {remindersLoading ? (
              <div className="space-y-1">{[1, 2].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : pendingReminders.length === 0 ? (
              <div className="text-center py-3 text-muted-foreground">
                <Bell className="mx-auto h-5 w-5 mb-1 opacity-50" />
                <p className="text-xs">No pending reminders</p>
              </div>
            ) : (
              <div className="space-y-1">
                {pendingReminders.slice(0, 2).map(r => {
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
              <Link to="/tasks">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="py-2">
            {tasksLoading ? (
              <div className="space-y-1">{[1, 2].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : activeTasks.length === 0 ? (
              <div className="text-center py-3 text-muted-foreground">
                <CheckCircle2 className="mx-auto h-5 w-5 mb-1 opacity-50" />
                <p className="text-xs">No active tasks</p>
              </div>
            ) : (
              <div className="space-y-1">
                {activeTasks.slice(0, 2).map(t => {
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

      {/* Recent Documents */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Documents</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/documents">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {docsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No documents yet</p>
                <Button variant="link" asChild className="mt-2">
                  <Link to="/upload">Upload your first document</Link>
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
          <CardHeader>
            <CardTitle className="text-lg">Documents by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : stats.documentsByCategory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No documents yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats.documentsByCategory}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {stats.documentsByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(${(index * 360) / stats.documentsByCategory.length}, 70%, 50%)`} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value} docs`, 'Count']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    formatter={(value) => <span className="text-sm">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Storage Breakdown - Admin Only */}
      {isAdmin && (
        <Card className="mt-4 sm:mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : stats.storageByCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No storage data</p>
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
