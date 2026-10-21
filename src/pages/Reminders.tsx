import { useState } from 'react';
import { SmsBanner } from '@/components/SmsBanner';
import { AppLayout } from '@/components/layout/AppLayout';
import { useReminders, Reminder } from '@/hooks/useReminders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Bell, Clock, CheckCircle2, PauseCircle, Trash2, Edit, RotateCcw, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, variant: 'default' as const, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  completed: { label: 'Completed', icon: CheckCircle2, variant: 'secondary' as const, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  snoozed: { label: 'Snoozed', icon: PauseCircle, variant: 'outline' as const, color: 'bg-muted text-muted-foreground' },
};

const recurrenceLabels: Record<string, string> = {
  none: 'One-time',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

export default function Reminders() {
  const { reminders, loading, createReminder, updateReminder, deleteReminder } = useReminders();
  const [open, setOpen] = useState(false);
  const [editReminder, setEditReminder] = useState<Reminder | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [form, setForm] = useState({ title: '', description: '', reminder_date: '', recurrence: 'none' });

  const resetForm = () => setForm({ title: '', description: '', reminder_date: '', recurrence: 'none' });

  const handleSubmit = async () => {
    if (!form.title || !form.reminder_date) return;
    if (editReminder) {
      await updateReminder(editReminder.id, {
        title: form.title,
        description: form.description || null,
        reminder_date: new Date(form.reminder_date).toISOString(),
        recurrence: form.recurrence as any,
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

  const reminderStats = {
    total: reminders.length,
    pending: reminders.filter(r => r.status === 'pending').length,
    overdue: reminders.filter(r => r.status === 'pending' && new Date(r.reminder_date) < new Date()).length,
    completed: reminders.filter(r => r.status === 'completed').length,
  };

  return (
    <AppLayout title="Reminders" description="Your personal reminders and notifications">
      <SmsBanner />

      {/* Stats */}
      {reminders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{reminderStats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{reminderStats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{reminderStats.overdue}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{reminderStats.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
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

        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reminders</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="snoozed">Snoozed</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
          {filtered.map(r => {
            const config = statusConfig[r.status];
            const StatusIcon = config.icon;
            const isPast = new Date(r.reminder_date) < new Date() && r.status === 'pending';
            return (
              <Card key={r.id} className={`transition-all hover:shadow-md ${isPast ? 'border-destructive/50 bg-destructive/5' : ''}`}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold truncate">{r.title}</h3>
                      <Badge className={`text-xs ${config.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                      {r.recurrence !== 'none' && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <RotateCcw className="h-3 w-3" />
                          {recurrenceLabels[r.recurrence]}
                        </Badge>
                      )}
                      {isPast && (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Overdue
                        </Badge>
                      )}
                    </div>
                    {r.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-1">{r.description}</p>}
                    <p className={`text-xs ${isPast ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
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
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
