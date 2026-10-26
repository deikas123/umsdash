import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees, useMyProfile } from '@/hr/hooks/useSupabaseData';
import { useOvertimeRequests, useCreateOvertimeRequest, useDecideOvertimeRequest, DbOvertimeRequest } from '@/hr/hooks/useOvertime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Check, X, Filter } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { sendSmsNotification } from '@/hr/hooks/useSmsNotification';

const PREFIX = 'UMS Kenya:';

function statusColor(s: string) {
  if (s === 'approved') return 'bg-success/10 text-success border-success/30';
  if (s === 'rejected') return 'bg-destructive/10 text-destructive border-destructive/30';
  return 'bg-warning/10 text-warning border-warning/30';
}

export default function Overtime() {
  const { user, role: currentRole } = useAuth();
  const { data: profile } = useMyProfile();
  const { data: employees = [] } = useEmployees();
  const isApprover = currentRole === 'hod' || currentRole === 'hr_manager' || currentRole === 'gm';

  const [tab, setTab] = useState(isApprover ? 'approvals' : 'mine');
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [showForm, setShowForm] = useState(false);
  const [decideOn, setDecideOn] = useState<DbOvertimeRequest | null>(null);
  const [decideNotes, setDecideNotes] = useState('');

  // Form state
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [hours, setHours] = useState<string>('1');
  const [rateType, setRateType] = useState<'1.5x' | '2x'>('1.5x');
  const [reason, setReason] = useState('');

  const { data: allRequests = [], isLoading } = useOvertimeRequests();
  const createReq = useCreateOvertimeRequest();
  const decideReq = useDecideOvertimeRequest();

  const myEmployeeId = profile?.employee_id || null;

  const myRequests = useMemo(
    () => allRequests.filter(r => r.employee_id === myEmployeeId),
    [allRequests, myEmployeeId]
  );
  const approvalQueue = useMemo(
    () => allRequests.filter(r => filterStatus === 'all' ? true : r.status === filterStatus),
    [allRequests, filterStatus]
  );

  const handleSubmit = async () => {
    if (!myEmployeeId) {
      toast({ title: 'No employee profile', description: 'Your account is not linked to an employee record.', variant: 'destructive' });
      return;
    }
    const h = Number(hours);
    if (!h || h <= 0 || h > 24) {
      toast({ title: 'Invalid hours', description: 'Hours must be between 0 and 24.', variant: 'destructive' });
      return;
    }
    if (!reason.trim()) {
      toast({ title: 'Reason required', description: 'Please provide a justification.', variant: 'destructive' });
      return;
    }
    try {
      await createReq.mutateAsync({
        employee_id: myEmployeeId,
        work_date: workDate,
        hours: h,
        rate_type: rateType,
        reason: reason.trim(),
      });
      toast({ title: 'Request submitted', description: 'Your overtime request is pending approval.' });
      setShowForm(false);
      setReason('');
      setHours('1');
      // Notify approvers in same department via simple SMS to HOD if linkable — best-effort
      const me = employees.find(e => e.id === myEmployeeId);
      if (me) {
        const hod = employees.find(e => e.department_id === me.department_id && e.designation?.toLowerCase().includes('head'));
        if (hod?.phone) {
          sendSmsNotification(hod.phone, `${PREFIX} ${me.first_name} ${me.last_name} submitted ${h}h overtime (${rateType}) for ${workDate}. Please review.`);
        }
      }
    } catch (e: any) {
      toast({ title: 'Submission failed', description: e.message, variant: 'destructive' });
    }
  };

  const handleDecide = async (decision: 'approved' | 'rejected') => {
    if (!decideOn || !user) return;
    try {
      await decideReq.mutateAsync({
        id: decideOn.id,
        decision,
        notes: decideNotes,
        approverId: user.id,
      });
      const emp = decideOn.employees;
      if (emp?.phone) {
        const verb = decision === 'approved' ? 'approved' : 'rejected';
        sendSmsNotification(
          emp.phone,
          `${PREFIX} Dear ${emp.first_name}, your overtime request for ${decideOn.work_date} (${decideOn.hours}h ${decideOn.rate_type}) has been ${verb}.`
        );
      }
      toast({ title: `Request ${decision}`, description: 'Employee has been notified.' });
      setDecideOn(null);
      setDecideNotes('');
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  const renderRequestRow = (r: DbOvertimeRequest, showEmployee: boolean) => (
    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-3 py-2.5 text-foreground tabular-nums">{r.work_date}</td>
      {showEmployee && (
        <td className="px-3 py-2.5">
          <p className="font-medium text-foreground">{r.employees?.first_name} {r.employees?.last_name}</p>
          <p className="text-xs text-muted-foreground">{r.employees?.staff_number} · {r.employees?.departments?.name || '—'}</p>
        </td>
      )}
      <td className="px-3 py-2.5 text-foreground tabular-nums">{Number(r.hours).toFixed(2)}h</td>
      <td className="px-3 py-2.5"><Badge variant="outline">{r.rate_type}</Badge></td>
      <td className="px-3 py-2.5 text-muted-foreground max-w-[280px] truncate" title={r.reason}>{r.reason || '—'}</td>
      <td className="px-3 py-2.5"><span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${statusColor(r.status)}`}>{r.status}</span></td>
      <td className="px-3 py-2.5">
        {showEmployee && r.status === 'pending' && (
          <Button size="sm" variant="outline" onClick={() => setDecideOn(r)}>Review</Button>
        )}
        {r.status !== 'pending' && (
          <span className="text-xs text-muted-foreground">{r.approver_notes || '—'}</span>
        )}
      </td>
    </tr>
  );

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><Clock className="h-6 w-6 text-primary" /> Overtime</h1>
          <p className="page-subtitle">Request and approve overtime hours that feed into payroll</p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Request Overtime
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-4">
        <TabsList>
          <TabsTrigger value="mine">My Requests ({myRequests.length})</TabsTrigger>
          {isApprover && <TabsTrigger value="approvals">Approvals Queue</TabsTrigger>}
        </TabsList>

        <TabsContent value="mine" className="mt-4">
          <div className="bg-card rounded-lg border shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {['Work Date', 'Hours', 'Rate', 'Reason', 'Status', 'Notes'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : myRequests.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No overtime requests yet.</td></tr>
                ) : myRequests.map(r => renderRequestRow(r, false))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {isApprover && (
          <TabsContent value="approvals" className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">{approvalQueue.length} request{approvalQueue.length === 1 ? '' : 's'}</span>
            </div>
            <div className="bg-card rounded-lg border shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {['Work Date', 'Employee', 'Hours', 'Rate', 'Reason', 'Status', 'Action'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {approvalQueue.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No requests in this view.</td></tr>
                  ) : approvalQueue.map(r => renderRequestRow(r, true))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Submit dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Overtime</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Work Date</Label>
              <Input type="date" value={workDate} onChange={e => setWorkDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hours Worked</Label>
                <Input type="number" step="0.5" min="0.5" max="24" value={hours} onChange={e => setHours(e.target.value)} />
              </div>
              <div>
                <Label>Rate</Label>
                <Select value={rateType} onValueChange={v => setRateType(v as '1.5x' | '2x')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1.5x">1.5x — Weekday OT</SelectItem>
                    <SelectItem value="2x">2x — Sunday / Holiday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Reason / Task Performed</Label>
              <Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Stock-take after hours, urgent customer order, system upgrade..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createReq.isPending}>{createReq.isPending ? 'Submitting...' : 'Submit Request'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decide dialog */}
      <Dialog open={!!decideOn} onOpenChange={(o) => { if (!o) { setDecideOn(null); setDecideNotes(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Overtime Request</DialogTitle></DialogHeader>
          {decideOn && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Employee:</span> <span className="font-medium">{decideOn.employees?.first_name} {decideOn.employees?.last_name}</span></div>
                <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{decideOn.work_date}</span></div>
                <div><span className="text-muted-foreground">Hours:</span> <span className="font-medium">{Number(decideOn.hours).toFixed(2)}h</span></div>
                <div><span className="text-muted-foreground">Rate:</span> <span className="font-medium">{decideOn.rate_type}</span></div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Reason</Label>
                <p className="rounded-md border bg-muted/30 p-2">{decideOn.reason || '—'}</p>
              </div>
              <div>
                <Label>Approver Notes (optional)</Label>
                <Textarea rows={2} value={decideNotes} onChange={e => setDecideNotes(e.target.value)} placeholder="Comments or conditions..." />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDecideOn(null); setDecideNotes(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleDecide('rejected')} disabled={decideReq.isPending} className="gap-1"><X className="h-4 w-4" /> Reject</Button>
            <Button onClick={() => handleDecide('approved')} disabled={decideReq.isPending} className="gap-1"><Check className="h-4 w-4" /> Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}