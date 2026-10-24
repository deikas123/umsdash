import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/EmptyState';
import { useTasks, Task } from '@/hooks/useTasks';
import { ReassignTaskDialog } from '@/components/tasks/ReassignTaskDialog';
import { EditTaskDialog } from '@/components/tasks/EditTaskDialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TaskComments } from '@/components/tasks/TaskComments';
import { SmsBanner } from '@/components/SmsBanner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, ListTodo, Clock, PlayCircle, CheckCircle2, Trash2, Pencil,
  Upload, Download, AlertTriangle, ChevronDown, ChevronUp, Paperclip, User, Users, UserPlus,
  LayoutGrid, List,
} from 'lucide-react';
import { format } from 'date-fns';

const priorityConfig = {
  low: { label: 'Low', color: 'bg-muted text-muted-foreground', border: 'border-l-green-500' },
  normal: { label: 'Normal', color: 'bg-primary/10 text-primary', border: 'border-l-orange-400' },
  high: { label: 'High', color: 'bg-destructive/10 text-destructive', border: 'border-l-red-500' },
};

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  in_progress: { label: 'In Progress', icon: PlayCircle, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

const kanbanColumns: { key: 'pending' | 'in_progress' | 'completed'; label: string; color: string }[] = [
  { key: 'pending', label: 'Pending', color: 'border-t-amber-400' },
  { key: 'in_progress', label: 'In Progress', color: 'border-t-blue-500' },
  { key: 'completed', label: 'Completed', color: 'border-t-green-500' },
];

interface StaffProfile {
  user_id: string;
  full_name: string;
  email: string;
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function TaskCard({
  task,
  user,
  canManage,
  isAdmin,
  expandedTask,
  setExpandedTask,
  updateAssigneeStatus,
  updateTaskStatus,
  setEditingTask,
  setReassignTaskId,
  setReassignCurrentIds,
  triggerUpload,
  deleteTask,
  downloadTaskFile,
}: {
  task: Task;
  user: ReturnType<typeof useAuth>['user'];
  canManage: boolean;
  isAdmin: boolean;
  expandedTask: string | null;
  setExpandedTask: (id: string | null) => void;
  updateAssigneeStatus: (taskId: string, userId: string, status: string) => void;
  updateTaskStatus: (taskId: string, status: string) => void;
  setEditingTask: (task: Task) => void;
  setReassignTaskId: (id: string) => void;
  setReassignCurrentIds: (ids: string[]) => void;
  triggerUpload: (taskId: string, type: 'attachment' | 'submission') => void;
  deleteTask: (taskId: string) => void;
  downloadTaskFile: (file: Task['files'][0]) => void;
}) {
  const sConfig = statusConfig[task.status];
  const pConfig = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.normal;
  const StatusIcon = sConfig.icon;
  const isExpanded = expandedTask === task.id;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
  const isAssignee = task.assignees?.some(a => a.user_id === user?.id);
  const isCreator = task.created_by === user?.id;
  const myAssignment = task.assignees?.find(a => a.user_id === user?.id);
  const completedCount = task.assignees?.filter(a => a.status === 'completed').length || 0;
  const totalAssignees = task.assignees?.length || 0;
  const progressPercent = totalAssignees > 0 ? Math.round((completedCount / totalAssignees) * 100) : 0;

  return (
    <Card className={`transition-all hover:shadow-md border-l-4 ${pConfig.border} ${isOverdue ? 'border-destructive/40 bg-destructive/5' : ''} ${task.status === 'completed' ? 'opacity-80' : ''}`}>
      <CardContent className="p-0">
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h3 className="font-semibold text-base">{task.title}</h3>
                {isOverdue && (
                  <Badge variant="destructive" className="text-[10px] gap-0.5 animate-pulse">
                    <AlertTriangle className="h-2.5 w-2.5" /> Overdue
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`text-[10px] ${sConfig.color}`}>
                  <StatusIcon className="h-3 w-3 mr-0.5" />{sConfig.label}
                </Badge>
                <Badge className={`text-[10px] ${pConfig.color}`}>
                  {task.priority === 'high' && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
                  {pConfig.label} Priority
                </Badge>
              </div>
            </div>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 flex-shrink-0" onClick={() => setExpandedTask(isExpanded ? null : task.id)}>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2 flex-wrap">
            <span className="flex items-center gap-1"><User className="h-3 w-3" /> {task.creator_name}</span>
            {task.due_date && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-destructive font-medium' : ''}`}>
                <Clock className="h-3 w-3" /> {format(new Date(task.due_date), 'MMM d, yyyy')}
              </span>
            )}
            {task.files && task.files.length > 0 && (
              <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" />{task.files.length} files</span>
            )}
          </div>

          {/* Assignee avatars */}
          {totalAssignees > 0 && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <div className="flex -space-x-1.5">
                    {task.assignees!.slice(0, 4).map(a => (
                      <Avatar key={a.id} className="h-6 w-6 border-2 border-background">
                        <AvatarFallback className={`text-[9px] ${a.status === 'completed' ? 'bg-green-100 text-green-700' : a.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {getInitials(a.profile?.full_name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  {totalAssignees > 4 && <span className="text-[10px] text-muted-foreground ml-1">+{totalAssignees - 4}</span>}
                </div>
                <span className="text-[10px] text-muted-foreground">{completedCount}/{totalAssignees} done</span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>
          )}
        </div>

        <div className="border-t px-4 py-2 flex items-center gap-1 flex-wrap bg-muted/30">
          {isAssignee && myAssignment && myAssignment.status === 'pending' && (
            <Button size="sm" variant="outline" onClick={() => updateAssigneeStatus(task.id, user!.id, 'in_progress')} className="h-7 text-xs gap-1">
              <PlayCircle className="h-3 w-3" />Start Task
            </Button>
          )}
          {isAssignee && myAssignment && myAssignment.status === 'in_progress' && (
            <Button size="sm" variant="outline" onClick={() => updateAssigneeStatus(task.id, user!.id, 'completed')} className="h-7 text-xs gap-1 text-green-600 border-green-200 hover:bg-green-50">
              <CheckCircle2 className="h-3 w-3" />Mark Complete
            </Button>
          )}
          {canManage && task.status === 'pending' && (
            <Button size="sm" variant="ghost" onClick={() => updateTaskStatus(task.id, 'in_progress')} className="h-7 text-xs gap-1">
              <PlayCircle className="h-3 w-3" />Start
            </Button>
          )}
          {canManage && task.status === 'in_progress' && (
            <Button size="sm" variant="ghost" onClick={() => updateTaskStatus(task.id, 'completed')} className="h-7 text-xs gap-1">
              <CheckCircle2 className="h-3 w-3" />Complete
            </Button>
          )}
          {canManage && (
            <>
              <Button size="sm" variant="ghost" onClick={() => setEditingTask(task)} className="h-7 text-xs gap-1">
                <Pencil className="h-3 w-3" />Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => {
                setReassignTaskId(task.id);
                setReassignCurrentIds(task.assignees?.map(a => a.user_id) || []);
              }} className="h-7 text-xs gap-1">
                <UserPlus className="h-3 w-3" />Reassign
              </Button>
              <Button size="sm" variant="ghost" onClick={() => triggerUpload(task.id, 'attachment')} className="h-7 text-xs gap-1">
                <Upload className="h-3 w-3" />Attach
              </Button>
            </>
          )}
          {isAssignee && !canManage && (
            <Button size="sm" variant="ghost" onClick={() => triggerUpload(task.id, 'submission')} className="h-7 text-xs gap-1">
              <Upload className="h-3 w-3" />Submit File
            </Button>
          )}
          <div className="ml-auto">
            {(isAdmin || isCreator) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive">
                    <Trash2 className="h-3 w-3" />Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Task</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "<strong>{task.title}</strong>"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteTask(task.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete Task
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="border-t p-4 space-y-4 bg-muted/10">
            {task.description && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm text-muted-foreground">{task.description}</p>
              </div>
            )}

            {task.assignees && task.assignees.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" /> Assignee Progress</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {task.assignees.map(a => {
                    const aStatusConf = statusConfig[a.status as keyof typeof statusConfig] || statusConfig.pending;
                    const AStatusIcon = aStatusConf.icon;
                    return (
                      <div key={a.id} className="flex flex-col gap-1.5 p-3 rounded-lg border bg-background">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {getInitials(a.profile?.full_name || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium flex-1 truncate">{a.profile?.full_name || 'Unknown'}</span>
                          <Badge className={`text-[10px] ${aStatusConf.color}`}>
                            <AStatusIcon className="h-2.5 w-2.5 mr-0.5" />{aStatusConf.label}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground ml-9 space-y-0.5">
                          {a.started_at && (
                            <p className="flex items-center gap-1"><PlayCircle className="h-3 w-3 text-blue-500" /> Started: {format(new Date(a.started_at), 'MMM d, yyyy HH:mm')}</p>
                          )}
                          {a.completed_at && (
                            <p className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Completed: {format(new Date(a.completed_at), 'MMM d, yyyy HH:mm')}</p>
                          )}
                          {!a.started_at && a.status === 'pending' && (
                            <p className="italic text-muted-foreground/60">Not started yet</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {task.files && task.files.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Paperclip className="h-4 w-4 text-primary" /> Files</p>
                <div className="space-y-1.5">
                  {task.files.map(f => (
                    <div key={f.id} className="flex items-center gap-2 text-sm p-2 rounded-lg border bg-background hover:bg-muted/50 transition-colors">
                      <Paperclip className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate flex-1">{f.file_name}</span>
                      <Badge variant="outline" className="text-[10px] flex-shrink-0">{f.upload_type}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => downloadTaskFile(f)} className="h-6 text-xs gap-1">
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <TaskComments taskId={task.id} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Tasks() {
  const { tasks, loading, createTask, updateTask, updateTaskStatus, updateAssigneeStatus, deleteTask, reassignTask, uploadTaskFile, downloadTaskFile } = useTasks();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { user, isAdmin, isStaff } = useAuth();
  const [open, setOpen] = useState(false);
  const [reassignTaskId, setReassignTaskId] = useState<string | null>(null);
  const [reassignCurrentIds, setReassignCurrentIds] = useState<string[]>([]);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [form, setForm] = useState({
    title: '', description: '', due_date: '', priority: 'normal', assignee_ids: [] as string[],
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFor, setUploadingFor] = useState<{ taskId: string; type: 'attachment' | 'submission' } | null>(null);

  const [canManage, setCanManage] = useState(false);
  useEffect(() => {
    async function checkPermission() {
      if (!user) return;
      if (isAdmin) { setCanManage(true); return; }
      if (isStaff) {
        const { data } = await supabase.from('profiles').select('position').eq('user_id', user.id).maybeSingle();
        if (data && ['hr', 'hod', 'super_admin'].includes(data.position || '')) {
          setCanManage(true);
        }
      }
    }
    checkPermission();
  }, [user, isAdmin, isStaff]);

  useEffect(() => {
    async function fetchStaff() {
      if (!canManage) return;
      const { data } = await supabase.from('profiles').select('user_id, full_name, email');
      if (data) setStaffProfiles(data);
    }
    fetchStaff();
  }, [canManage]);

  const handleSubmit = async () => {
    if (!form.title) return;
    await createTask({
      title: form.title,
      description: form.description,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : undefined,
      priority: form.priority,
      assignee_ids: form.assignee_ids,
    });
    setOpen(false);
    setForm({ title: '', description: '', due_date: '', priority: 'normal', assignee_ids: [] });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !uploadingFor) return;
    await uploadTaskFile(uploadingFor.taskId, e.target.files[0], uploadingFor.type);
    setUploadingFor(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerUpload = (taskId: string, type: 'attachment' | 'submission') => {
    setUploadingFor({ taskId, type });
    fileInputRef.current?.click();
  };

  const toggleAssignee = (userId: string) => {
    setForm(f => ({
      ...f,
      assignee_ids: f.assignee_ids.includes(userId)
        ? f.assignee_ids.filter(id => id !== userId)
        : [...f.assignee_ids, userId],
    }));
  };

  const filtered = tasks.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (assigneeFilter !== 'all' && !t.assignees?.some(a => a.user_id === assigneeFilter)) return false;
    return true;
  });

  const taskStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };
  const completionRate = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0;

  const sharedCardProps = {
    user,
    canManage,
    isAdmin,
    expandedTask,
    setExpandedTask,
    updateAssigneeStatus,
    updateTaskStatus,
    setEditingTask,
    setReassignTaskId,
    setReassignCurrentIds,
    triggerUpload,
    deleteTask,
    downloadTaskFile,
  };

  return (
    <AppLayout title="Tasks" description="Task assignment and management">
      <SmsBanner />
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

      {/* Page header */}
      <div className="flex flex-col gap-1 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Task assignment and management</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center border rounded-md p-0.5 bg-muted/50">
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                className="h-7 w-7 p-0"
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                className="h-7 w-7 p-0"
                onClick={() => setViewMode('kanban')}
                title="Kanban view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
            </div>
            {canManage && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" />Create Task</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input placeholder="What needs to be done?" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea placeholder="Add details (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input type="datetime-local" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                        <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Assign to</Label>
                      <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                        {staffProfiles.filter(p => p.user_id !== user?.id).map(p => (
                          <label key={p.user_id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors">
                            <Checkbox
                              checked={form.assignee_ids.includes(p.user_id)}
                              onCheckedChange={() => toggleAssignee(p.user_id)}
                            />
                            <div className="min-w-0">
                              <span className="text-sm font-medium block truncate">{p.full_name}</span>
                              <span className="text-xs text-muted-foreground block truncate">{p.email}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                      {form.assignee_ids.length > 0 && (
                        <p className="text-xs text-muted-foreground">{form.assignee_ids.length} assignee(s) selected</p>
                      )}
                    </div>
                    <Button onClick={handleSubmit} className="w-full" disabled={!form.title}>
                      Create Task
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {canManage && tasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
        >
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ListTodo className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{taskStats.total}</p>
                <p className="text-xs text-muted-foreground">Total Tasks</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{taskStats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <PlayCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{taskStats.in_progress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{completionRate}%</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
              <Progress value={completionRate} className="h-2" />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Filter bar */}
      <Card className="mb-6">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            {canManage && staffProfiles.length > 0 && (
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by Assignee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {staffProfiles.map(p => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="sm:ml-auto flex items-center gap-2">
              {(statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all') && (
                <Button variant="ghost" size="sm" onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); setAssigneeFilter('all'); }}>
                  Clear filters
                </Button>
              )}
              <Badge variant="secondary" className="text-xs">
                {filtered.length} of {tasks.length}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No tasks found"
          description={canManage ? 'Create a task to get started.' : 'No tasks assigned to you yet.'}
          action={
            canManage ? (
              <Button variant="outline" onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Task
              </Button>
            ) : undefined
          }
        />
      ) : viewMode === 'list' ? (
        <motion.div layout className="space-y-4">
          <AnimatePresence>
            {filtered.map(task => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <TaskCard task={task} {...sharedCardProps} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        /* Kanban view */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {kanbanColumns.map(col => {
            const colTasks = filtered.filter(t => t.status === col.key);
            return (
              <div key={col.key} className="space-y-3">
                <div className={`rounded-lg border-t-4 ${col.color} bg-muted/40 px-3 py-2 flex items-center justify-between`}>
                  <span className="font-semibold text-sm">{col.label}</span>
                  <Badge variant="secondary" className="text-xs">{colTasks.length}</Badge>
                </div>
                <div className="space-y-3 min-h-[100px]">
                  <AnimatePresence>
                    {colTasks.length === 0 ? (
                      <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 p-6 text-center">
                        <p className="text-xs text-muted-foreground">No tasks</p>
                      </div>
                    ) : (
                      colTasks.map(task => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                        >
                          <TaskCard task={task} {...sharedCardProps} />
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reassignTaskId && (
        <ReassignTaskDialog
          open={!!reassignTaskId}
          onOpenChange={(open) => { if (!open) setReassignTaskId(null); }}
          taskId={reassignTaskId}
          currentAssigneeIds={reassignCurrentIds}
          onReassign={reassignTask}
        />
      )}

      {editingTask && (
        <EditTaskDialog
          open={!!editingTask}
          onOpenChange={(open) => { if (!open) setEditingTask(null); }}
          task={editingTask}
          onSave={updateTask}
        />
      )}
    </AppLayout>
  );
}
