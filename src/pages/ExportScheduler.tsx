import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import { Plus, Pencil, Trash2, PlayCircle, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type Schedule = {
  id: string; name: string; schedule_type: string; export_type: string;
  format: string; email_to: string[] | null; active: boolean; last_run_at: string | null;
};

const emptyForm = { name: '', schedule_type: 'weekly', export_type: 'documents', format: 'csv', email_to: '' };

export default function ExportScheduler() {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['export_schedules'],
    queryFn: async () => {
      const { data, error } = await supabase.from('export_schedules').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Schedule[];
    },
    enabled: isAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const emails = form.email_to.split(',').map(e => e.trim()).filter(Boolean);
      const payload = { name: form.name, schedule_type: form.schedule_type, export_type: form.export_type, format: form.format, email_to: emails };
      if (editId) {
        const { error } = await supabase.from('export_schedules').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('export_schedules').insert({ ...payload, active: true, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['export_schedules'] });
      setOpen(false); setEditId(null); setForm(emptyForm);
      toast({ title: editId ? 'Schedule updated' : 'Schedule created' });
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('export_schedules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['export_schedules'] }); toast({ title: 'Schedule deleted' }); },
  });

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('export_schedules').update({ active }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['export_schedules'] });
  };

  const runNow = async (id: string) => {
    const { error } = await supabase.functions.invoke('run-scheduled-export', { body: { schedule_id: id } });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Export triggered' }); qc.invalidateQueries({ queryKey: ['export_schedules'] }); }
  };

  const handleEdit = (s: Schedule) => {
    setEditId(s.id);
    setForm({ name: s.name, schedule_type: s.schedule_type, export_type: s.export_type, format: s.format, email_to: (s.email_to ?? []).join(', ') });
    setOpen(true);
  };

  if (!isAdmin) return <AppLayout title="Export Scheduler"><p className="text-muted-foreground">Admin access required.</p></AppLayout>;

  return (
    <AppLayout title="Export Scheduler" description="Automate recurring data exports">
      <PageHeader
        title="Export Scheduler"
        description="Schedule automatic data exports delivered to email recipients."
        actions={<Button size="sm" onClick={() => { setEditId(null); setForm(emptyForm); setOpen(true); }}><Plus className="h-4 w-4 mr-1.5" /> New Schedule</Button>}
      />
      {isLoading ? <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-16" />)}</div> :
      schedules.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="mx-auto h-10 w-10 mb-3 opacity-30" />
          <p>No export schedules. Create one to automate data delivery.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map(s => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.schedule_type} · {s.export_type} · {s.format.toUpperCase()}
                    {s.last_run_at && ` · Last run: ${format(new Date(s.last_run_at), 'MMM d HH:mm')}`}
                  </p>
                </div>
                <Switch checked={s.active} onCheckedChange={v => toggleActive(s.id, v)} />
                <Button variant="ghost" size="icon" title="Run Now" onClick={() => runNow(s.id)}><PlayCircle className="h-4 w-4 text-green-500" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit Schedule' : 'New Export Schedule'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Name</Label><Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Monthly Documents Export" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Frequency</Label>
                <Select value={form.schedule_type} onValueChange={v => setForm(f => ({ ...f, schedule_type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Export Type</Label>
                <Select value={form.export_type} onValueChange={v => setForm(f => ({ ...f, export_type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="documents">Documents</SelectItem><SelectItem value="tasks">Tasks</SelectItem><SelectItem value="audit_logs">Audit Logs</SelectItem><SelectItem value="customers">Customers</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Format</Label>
              <Select value={form.format} onValueChange={v => setForm(f => ({ ...f, format: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="csv">CSV</SelectItem><SelectItem value="excel">Excel</SelectItem><SelectItem value="pdf">PDF</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Email Recipients (comma-separated)</Label><Input className="mt-1" value={form.email_to} onChange={e => setForm(f => ({ ...f, email_to: e.target.value }))} placeholder="admin@example.com, reports@example.com" /></div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
