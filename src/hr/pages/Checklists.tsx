import { useState } from 'react';
import { useEmployees } from '@/hr/hooks/useSupabaseData';
import { useEmployeeChecklists, useStartChecklist, useUpdateChecklist, useDeleteChecklist, ChecklistItemState } from '@/hr/hooks/useChecklists';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardList, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Checklists() {
  const { user } = useAuth();
  const { data: checklists = [], isLoading } = useEmployeeChecklists();
  const { data: employees = [] } = useEmployees();
  const startCl = useStartChecklist();
  const updateCl = useUpdateChecklist();
  const deleteCl = useDeleteChecklist();

  const [showStart, setShowStart] = useState(false);
  const [startEmp, setStartEmp] = useState('');
  const [startType, setStartType] = useState<'onboarding' | 'offboarding'>('onboarding');
  const [openCl, setOpenCl] = useState<string | null>(null);

  const handleStart = async () => {
    if (!startEmp) return;
    try {
      await startCl.mutateAsync({ employeeId: startEmp, type: startType });
      toast({ title: `${startType === 'onboarding' ? 'Onboarding' : 'Offboarding'} started` });
      setShowStart(false); setStartEmp('');
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  const toggleItem = async (clId: string, idx: number) => {
    const cl = checklists.find(c => c.id === clId);
    if (!cl) return;
    const items = (cl.items_state as ChecklistItemState[]) || [];
    const newItems = items.map((it, i) => i === idx
      ? { ...it, done: !it.done, done_by: !it.done ? user?.id : null, done_at: !it.done ? new Date().toISOString() : null }
      : it);
    const allDone = newItems.every(i => i.done);
    await updateCl.mutateAsync({
      id: clId,
      items_state: newItems,
      status: allDone ? 'completed' : 'in_progress',
      completed_at: allDone ? new Date().toISOString() : null,
    });
  };

  const renderChecklist = (type: 'onboarding' | 'offboarding') => {
    const filtered = checklists.filter(c => c.type === type);
    return filtered.length === 0 ? (
      <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border">No {type} checklists yet.</div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(cl => {
          const items = (cl.items_state as ChecklistItemState[]) || [];
          const done = items.filter(i => i.done).length;
          const pct = items.length ? Math.round((done / items.length) * 100) : 0;
          return (
            <div key={cl.id} className="bg-card rounded-lg border shadow-sm p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold text-foreground">{cl.employees?.first_name} {cl.employees?.last_name}</p>
                  <p className="text-xs text-muted-foreground">{cl.employees?.staff_number} · {cl.employees?.departments?.name || '—'}</p>
                </div>
                <div className="flex items-center gap-1">
                  {cl.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-success" />}
                  <button onClick={() => deleteCl.mutate(cl.id)} className="text-muted-foreground hover:text-destructive p-1" title="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <Progress value={pct} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground mb-3">{done} of {items.length} complete</p>
              <Button variant="outline" size="sm" className="w-full" onClick={() => setOpenCl(cl.id)}>View / Update</Button>
            </div>
          );
        })}
      </div>
    );
  };

  const detailCl = openCl ? checklists.find(c => c.id === openCl) : null;

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><ClipboardList className="h-6 w-6 text-primary" /> Onboarding & Offboarding</h1>
          <p className="page-subtitle">Track checklists for new hires and exits</p>
        </div>
        <Button className="gap-2" onClick={() => setShowStart(true)}><Plus className="h-4 w-4" /> Start Checklist</Button>
      </div>

      <Tabs defaultValue="onboarding" className="mt-4">
        <TabsList>
          <TabsTrigger value="onboarding">Onboarding ({checklists.filter(c => c.type === 'onboarding').length})</TabsTrigger>
          <TabsTrigger value="offboarding">Offboarding ({checklists.filter(c => c.type === 'offboarding').length})</TabsTrigger>
        </TabsList>
        <TabsContent value="onboarding" className="mt-4">{isLoading ? <div className="text-center py-8">Loading...</div> : renderChecklist('onboarding')}</TabsContent>
        <TabsContent value="offboarding" className="mt-4">{isLoading ? <div className="text-center py-8">Loading...</div> : renderChecklist('offboarding')}</TabsContent>
      </Tabs>

      <Dialog open={showStart} onOpenChange={setShowStart}>
        <DialogContent>
          <DialogHeader><DialogTitle>Start Checklist</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Employee</label>
              <Select value={startEmp} onValueChange={setStartEmp}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.staff_number})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <Select value={startType} onValueChange={v => setStartType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="offboarding">Offboarding</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStart(false)}>Cancel</Button>
            <Button onClick={handleStart} disabled={startCl.isPending}>Start</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openCl} onOpenChange={(o) => { if (!o) setOpenCl(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{detailCl?.employees?.first_name} {detailCl?.employees?.last_name} — {detailCl?.type}</DialogTitle></DialogHeader>
          {detailCl && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {((detailCl.items_state as ChecklistItemState[]) || []).map((it, i) => (
                <label key={i} className="flex items-start gap-3 p-2.5 rounded-md hover:bg-muted/50 cursor-pointer">
                  <input type="checkbox" checked={it.done} onChange={() => toggleItem(detailCl.id, i)} className="mt-1 rounded" />
                  <div className="flex-1">
                    <p className={`text-sm ${it.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{it.label}</p>
                    {it.done_at && <p className="text-[10px] text-muted-foreground">Completed {new Date(it.done_at).toLocaleString()}</p>}
                  </div>
                </label>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}