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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import { Plus, Pencil, Trash2, Zap, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AVAILABLE_EVENTS = ['document.uploaded', 'document.approved', 'task.created', 'task.completed', 'incident.created', 'user.created'];

export default function Webhooks() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', url: '', events: [] as string[], secret: '' });

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('webhooks').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name, url: form.url, events: form.events, secret: form.secret || null };
      if (editId) {
        const { error } = await supabase.from('webhooks').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('webhooks').insert({ ...payload, active: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhooks'] });
      setOpen(false);
      setEditId(null);
      setForm({ name: '', url: '', events: [], secret: '' });
      toast({ title: editId ? 'Webhook updated' : 'Webhook created' });
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('webhooks').update({ active }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['webhooks'] });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('webhooks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['webhooks'] }); toast({ title: 'Webhook deleted' }); },
  });

  const testWebhook = async (id: string) => {
    const { error } = await supabase.functions.invoke('trigger-webhook', { body: { webhook_id: id, event: 'test', payload: { message: 'Test from UMS Hub' } } });
    if (error) toast({ title: 'Test failed', description: error.message, variant: 'destructive' });
    else toast({ title: 'Test sent', description: 'Webhook test payload delivered.' });
  };

  const handleEdit = (wh: any) => {
    setEditId(wh.id);
    setForm({ name: wh.name, url: wh.url, events: wh.events ?? [], secret: wh.secret ?? '' });
    setOpen(true);
  };

  const toggleEvent = (ev: string) => {
    setForm(f => ({ ...f, events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev] }));
  };

  if (!isAdmin) return <AppLayout title="Webhooks"><p className="text-muted-foreground">Admin access required.</p></AppLayout>;

  return (
    <AppLayout title="Webhooks" description="Configure outbound webhook integrations">
      <PageHeader
        title="Webhooks"
        description="Send real-time HTTP notifications to external systems."
        actions={
          <Button size="sm" onClick={() => { setEditId(null); setForm({ name: '', url: '', events: [], secret: '' }); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Webhook
          </Button>
        }
      />
      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Zap className="mx-auto h-10 w-10 mb-3 opacity-30" />
          <p>No webhooks configured. Add one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh: any) => (
            <Card key={wh.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{wh.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{wh.url}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(wh.events ?? []).map((ev: string) => <Badge key={ev} variant="secondary" className="text-xs">{ev}</Badge>)}
                  </div>
                </div>
                <Switch checked={wh.active} onCheckedChange={v => toggleActive(wh.id, v)} />
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" title="Test" onClick={() => testWebhook(wh.id)}>
                    <TestTube className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(wh)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(wh.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit Webhook' : 'Add Webhook'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Name</Label><Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My Integration" /></div>
            <div><Label className="text-xs">URL</Label><Input className="mt-1" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://example.com/hook" /></div>
            <div><Label className="text-xs">Secret (optional)</Label><Input className="mt-1" type="password" value={form.secret} onChange={e => setForm(f => ({ ...f, secret: e.target.value }))} placeholder="HMAC signing secret" /></div>
            <div>
              <Label className="text-xs mb-2 block">Events</Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_EVENTS.map(ev => (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => toggleEvent(ev)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${form.events.includes(ev) ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
                  >
                    {ev}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name || !form.url}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
