import { useState } from 'react';
import { SmsBanner } from '@/components/SmsBanner';
import { AppLayout } from '@/components/layout/AppLayout';
import { useReminders, Reminder } from '@/hooks/useReminders';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Bell, Clock, CheckCircle2, PauseCircle, Trash2, Edit, RotateCcw, AlertTriangle, Calendar, List } from 'lucide-react';
import { format, isToday, isTomorrow, isThisWeek, isBefore } from 'date-fns';

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  snoozed: { label: 'Snoozed', icon: PauseCircle, color: 'bg-muted text-muted-foreground' },
};

const recurrenceLabels: Record<string, string> = {
  none: 'One-time',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

function getUrgencyStyle(r: Reminder): { border: string; bg: string; badge?: JSX.Element } {
  const now = new Date();
  const date = new Date(r.reminder_date);
  if (r.status === 'completed') {
    return { border: 'border-l-gray-300', bg: '' };
  }
  if (r.status === 'snoozed') {
    return { border: 'border-l-slate-400', bg: '' };
  }
  if (isBefore(date, now)) {
    return { border: 'border-l-red-500', bg: 'bg-red-50/50 dark:bg-red-950/10', badge: <Badge variant="destructive" className="text-[10px] gap-0.5"><AlertTriangle className="h-2.5 w-2.5" /> Overdue</Badge> };
  }
  if (isToday(date) || isTomorrow(date)) {
    return { border: 'border-l-orange-400', bg: 'bg-orange-50/50 dark:bg-orange-950/10', badge: <Badge className="text-[10px] bg-orange-100 text-orange-700">Due Soon</Badge> };
  }
  if (isThisWeek(date)) {
    return { border: 'border-l-blue-400', bg: '', badge: <Badge className="text-[10px] bg-blue-100 text-blue-700">This Week</Badge> };
  }
  return { border: 'border-l-slate-300', bg: '' };
}

/** Simple calendar month view showing days with reminders */
function CalendarView({ reminders }: { reminders: Reminder[] }) {
  const [viewDate, setViewDate] = useState(new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  // Map day-of-month → reminders
  const dayMap: Record<number, Reminder[]> = {};
  reminders.forEach(r => {
    const d = new Date(r.reminder_date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!dayMap[day]) dayMap[day] = [];
      dayMap[day].push(r);
    }
  });

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={prevMonth}>‹</Button>
          <span className="font-semibold">{format(viewDate, 'MMMM yyyy')}</span>
          <Button variant="ghost" size="sm" onClick={nextMonth}>›</Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {dayNames.map(d => (
            <div key={d} className="text-[11px] font-medium text-muted-foreground py-1">{d}</div>
          ))}
          {/* Blank cells for first week offset */}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`blank-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isTodays = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            const dayReminders = dayMap[day] || [];
            const hasOverdue = dayReminders.some(r => r.status === 'pending' && isBefore(new Date(r.reminder_date), today));
            return (
              <div
                key={day}
                className={`relative rounded-md p-1 min-h-[36px] text-sm ${isTodays ? 'bg-primary text-primary-foreground font-bold' : 'hover:bg-muted/50'}`}
              >
                {day}
                {dayReminders.length > 0 && (
                  <div className="mt-0.5 flex justify-center gap-0.5 flex-wrap">
                    {dayReminders.slice(0, 3).map((r, ri) => (
                      <span
                        key={ri}
                        className={`inline-block w-1.5 h-1.5 rounded-full ${
                          r.status === 'completed' ? 'bg-green-500' :
                          hasOverdue && r.status === 'pending' ? 'bg-red-500' :
                          'bg-orange-400'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Reminders() {
  const { reminders, loading, createReminder, updateReminder, deleteReminder } = useReminders();
  const [open, setOpen] = useState(false);
  const [editReminder, setEditReminder] = useState<Reminder | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [form, setForm] = useState({ title: '', description: '', reminder_date: '', recurrence: 'none' });

  const resetForm = () => setForm({ title: '', description: '', reminder_date: '', recurrence: 'none' });

  const handleSubmit = async () => {
    if (!form.title || !form.reminder_date) return;
    if (editReminder) {
      await updateReminder(editReminder.id, {
        title: form.title,
        description: form.description || null,
        reminder_date: new Date(form.reminder_date).toISOString(),
        recurrence: form.recurrence as Reminder['recurrence'],
      });
    } else {
      await createReminder({
        ...form,
        reminder_date: new Date(form.reminder_date).toISOString(),
      });
    }
    setOpen(false);
    setEditReminder(null);
    resetForm();
  };

  const handleEdit = (r: Reminder) => {
    setEditReminder(r);
    setForm({
      title: r.title,
      description: r.description || '',
      reminder_date: format(new Date(r.reminder_date), "yyyy-MM-dd'T'HH:mm"),
      recurrence: r.recurrence,
    });
    setOpen(true);
  };

  const filtered = reminders.filter(r => filter === 'all' || r.status === filter);

  const now = new Date();
  const reminderStats = {
    total: reminders.length,
    pending: reminders.filter(r => r.status === 'pending').length,
    overdue: reminders.filter(r => r.status === 'pending' && isBefore(new Date(r.reminder_date), now)).length,
    upcoming: reminders.filter(r => r.status === 'pending' && !isBefore(new Date(r.reminder_date), now)).length,
    completed: reminders.filter(r => r.status === 'completed').length,
  };

  return (
    <AppLayout title="Reminders" description="Your personal reminders and notifications">
      <SmsBanner />

      {/* Page header */}
      <div className="flex flex-col gap-1 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reminders</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Your personal reminders and notifications</p>
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
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                className="h-7 w-7 p-0"
                onClick={() => setViewMode('calendar')}
                title="Calendar view"
              >
                <Calendar className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditReminder(null); resetForm(); } }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" />New Reminder</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editReminder ? 'Edit Reminder' : 'Create Reminder'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input placeholder="What do you need to remember?" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea placeholder="Add details (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Date & Time *</Label>
                    <Input type="datetime-local" value={form.reminder_date} onChange={e => setForm(f => ({ ...f, reminder_date: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Recurrence</Label>
                    <Select value={form.recurrence} onValueChange={v => setForm(f => ({ ...f, recurrence: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">One-time</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSubmit} className="w-full" disabled={!form.title || !form.reminder_date}>
                    {editReminder ? 'Update Reminder' : 'Create Reminder'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {reminders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
        >
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reminderStats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{reminderStats.overdue}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{reminderStats.upcoming}</p>
                <p className="text-xs text-muted-foreground">Upcoming</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{reminderStats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Calendar view */}
      {viewMode === 'calendar' && (
        <div className="mb-6">
          <CalendarView reminders={reminders} />
        </div>
      )}

      {/* Filter bar */}
      <Card className="mb-6">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reminders</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="snoozed">Snoozed</SelectItem>
              </SelectContent>
            </Select>
            <div className="sm:ml-auto flex items-center gap-2">
              {filter !== 'all' && (
                <Button variant="ghost" size="sm" onClick={() => setFilter('all')}>Clear filters</Button>
              )}
              <Badge variant="secondary" className="text-xs">
                {filtered.length} of {reminders.length}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-1">No reminders found</h3>
            <p className="text-sm text-muted-foreground mb-4">Create a reminder to stay on top of your tasks</p>
            <Button variant="outline" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Reminder
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map(r => {
              const config = statusConfig[r.status];
              const StatusIcon = config.icon;
              const urgency = getUrgencyStyle(r);
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  <Card className={`transition-all hover:shadow-md border-l-4 ${urgency.border} ${urgency.bg}`}>
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold truncate">{r.title}</h3>
                          <Badge className={`text-xs ${config.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                          {urgency.badge}
                          {r.recurrence !== 'none' && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <RotateCcw className="h-3 w-3" />
                              {recurrenceLabels[r.recurrence]}
                            </Badge>
                          )}
                        </div>
                        {r.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-1">{r.description}</p>}
                        <p className={`text-xs ${r.status === 'pending' && isBefore(new Date(r.reminder_date), new Date()) ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                          📅 {format(new Date(r.reminder_date), 'PPp')}
                        </p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
                        {r.status === 'pending' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => updateReminder(r.id, { status: 'completed' })} className="gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />Complete
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => updateReminder(r.id, { status: 'snoozed' })} className="gap-1">
                              <PauseCircle className="h-3.5 w-3.5" />Snooze
                            </Button>
                          </>
                        )}
                        {r.status !== 'pending' && (
                          <Button size="sm" variant="outline" onClick={() => updateReminder(r.id, { status: 'pending' })} className="gap-1">
                            <Clock className="h-3.5 w-3.5" />Reactivate
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(r)} className="gap-1">
                          <Edit className="h-3.5 w-3.5" />Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive gap-1">
                              <Trash2 className="h-3.5 w-3.5" />Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Reminder</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "<strong>{r.title}</strong>"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteReminder(r.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </AppLayout>
  );
}
