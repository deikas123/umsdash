import { useState, useRef } from 'react';
import { useLeaveRequests, useCreateLeaveRequest, useUpdateLeaveRequest, useEmployees, useMyProfile } from '@/hr/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarDays, Plus, Check, X, Download, Paperclip, FileText } from 'lucide-react';
import { smsLeaveSubmitted, smsLeaveApproved, smsLeaveRejected, smsLeaveApprovalNeeded } from '@/hr/lib/smsTemplates';
import { useProfiles, useUserRoles } from '@/hr/hooks/useSupabaseData';
import { useHolidays } from '@/hr/hooks/useHolidays';
import { countWorkingDays } from '@/hr/lib/dateHelpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import LeaveFormPDF from '@/hr/components/LeaveFormPDF';

type LeaveType = 'annual' | 'sick' | 'maternity' | 'paternity' | 'compassionate' | 'study';

const statusColors: Record<string, string> = {
  pending_hod: 'bg-warning/10 text-warning border-warning/20',
  pending_hr: 'bg-info/10 text-info border-info/20',
  pending_gm: 'bg-accent text-accent-foreground border-accent',
  approved: 'bg-success/10 text-success border-success/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusLabels: Record<string, string> = {
  pending_hod: 'Pending HOD', pending_hr: 'Pending HR', pending_gm: 'Pending GM',
  approved: 'Approved', rejected: 'Rejected',
};

const leaveTypeLabels: Record<LeaveType, string> = {
  annual: 'Annual Leave', sick: 'Sick Leave', maternity: 'Maternity Leave',
  paternity: 'Paternity Leave', compassionate: 'Compassionate Leave', study: 'Study Leave',
};

function calculateDays(start: string, end: string, holidays: string[] = []): number {
  return countWorkingDays(start, end, holidays);
}

export default function LeaveManagement() {
  const { role: currentRole } = useAuth();
  const { data: leaves = [], isLoading } = useLeaveRequests();
  const { data: employees = [] } = useEmployees();
  const { data: myProfile } = useMyProfile();
  const { data: holidays = [] } = useHolidays();
  const createLeave = useCreateLeaveRequest();
  const updateLeave = useUpdateLeaveRequest();

  const [showApply, setShowApply] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [leaveType, setLeaveType] = useState<LeaveType>('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [nextOfKin, setNextOfKin] = useState('');
  const [nextOfKinPhone, setNextOfKinPhone] = useState('');
  const [relieverName, setRelieverName] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const myEmployeeId = myProfile?.employee_id;
  const myEmployee = employees.find(e => e.id === myEmployeeId);

  const filteredLeaves = leaves.filter(l => {
    if (filterStatus !== 'all' && l.status !== filterStatus) return false;
    if (currentRole === 'staff') return l.employee_id === myEmployeeId;
    return true;
  });

  const canApprove = (leave: typeof leaves[0]) => {
    if (currentRole === 'hod' && leave.status === 'pending_hod') return true;
    if (currentRole === 'hr_manager' && leave.status === 'pending_hr') return true;
    if (currentRole === 'gm' && leave.status === 'pending_gm') return true;
    return false;
  };

  const { data: profiles = [] } = useProfiles();
  const { data: userRoles = [] } = useUserRoles();

  const findUserPhone = (role: string): { phone: string; name: string } | null => {
    const roleEntry = userRoles.find(r => r.role === role);
    if (!roleEntry) return null;
    const profile = profiles.find(p => p.user_id === roleEntry.user_id);
    const emp = employees.find(e => e.id === profile?.employee_id);
    if (emp?.phone) return { phone: emp.phone, name: emp.first_name };
    return null;
  };

  const handleApprove = async (leaveId: string, approved: boolean) => {
    const leave = leaves.find(l => l.id === leaveId);
    if (!leave) return;
    const now = new Date().toISOString().slice(0, 10);
    const updates: any = {};

    if (currentRole === 'hod') {
      updates.hod_approval = { approved, date: now };
      updates.status = approved ? 'pending_hr' : 'rejected';
    } else if (currentRole === 'hr_manager') {
      updates.hr_approval = { approved, date: now };
      updates.status = approved ? 'pending_gm' : 'rejected';
    } else if (currentRole === 'gm') {
      updates.gm_approval = { approved, date: now };
      updates.status = approved ? 'approved' : 'rejected';
    }

    try {
      await updateLeave.mutateAsync({ id: leaveId, ...updates });
      const empName = leave.employees ? `${leave.employees.first_name} ${leave.employees.last_name}` : 'Employee';
      const employee = employees.find(e => e.id === leave.employee_id);

      if (employee?.phone) {
        if (approved) {
          const nextStep = updates.status === 'approved' ? 'Your leave is fully approved!' : `Now pending ${updates.status === 'pending_hr' ? 'HR' : 'GM'} approval.`;
          smsLeaveApproved(employee.phone, employee.first_name, leave.start_date, leave.end_date, currentRole.toUpperCase(), nextStep);
        } else {
          smsLeaveRejected(employee.phone, employee.first_name, leave.start_date, leave.end_date, currentRole.toUpperCase());
        }
      }

      if (approved && updates.status === 'pending_hr') {
        const hr = findUserPhone('hr');
        if (hr) smsLeaveApprovalNeeded(hr.phone, hr.name, empName, leave.leave_type, leave.days, leave.start_date);
      } else if (approved && updates.status === 'pending_gm') {
        const gm = findUserPhone('gm');
        if (gm) smsLeaveApprovalNeeded(gm.phone, gm.name, empName, leave.leave_type, leave.days, leave.start_date);
      }

      toast({ title: approved ? '✅ Leave approved' : '❌ Leave rejected', description: `${empName}'s leave has been ${approved ? 'approved' : 'rejected'}.` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleSubmit = async () => {
    if (!startDate || !endDate || !reason || !myEmployeeId) {
      toast({ title: 'Missing fields', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    if (leaveType === 'sick' && !documentFile) {
      toast({ title: 'Doctor\'s note required', description: 'Please attach a doctor\'s note or medical certificate for sick leave.', variant: 'destructive' });
      return;
    }
    const holidayDates = holidays.map(h => h.date);
    const days = calculateDays(startDate, endDate, holidayDates);
    try {
      setUploading(true);
      let documentUrl: string | null = null;

      // Upload document if provided
      if (documentFile) {
        const { data: { user } } = await supabase.auth.getUser();
        const filePath = `${user?.id}/${Date.now()}_${documentFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('leave-documents')
          .upload(filePath, documentFile);
        if (uploadError) throw uploadError;
        documentUrl = filePath;
      }

      await createLeave.mutateAsync({
        employee_id: myEmployeeId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        days,
        reason,
        status: 'pending_hod',
        contact_phone: contactPhone,
        contact_email: contactEmail,
        next_of_kin: nextOfKin,
        next_of_kin_phone: nextOfKinPhone,
        reliever_name: relieverName,
        document_url: documentUrl,
      });
      setShowApply(false);
      setStartDate(''); setEndDate(''); setReason('');
      setContactPhone(''); setContactEmail(''); setNextOfKin(''); setNextOfKinPhone(''); setRelieverName('');
      setDocumentFile(null);

      if (myEmployee?.phone) {
        smsLeaveSubmitted(myEmployee.phone, myEmployee.first_name, leaveTypeLabels[leaveType], startDate, endDate, days);
      }

      if (myEmployee?.department_id) {
        const dept = await supabase.from('hr_departments').select('hod_user_id').eq('id', myEmployee.department_id).single();
        if (dept.data?.hod_user_id) {
          const hodProfile = profiles.find(p => p.user_id === dept.data.hod_user_id);
          const hodEmp = employees.find(e => e.id === hodProfile?.employee_id);
          if (hodEmp?.phone) {
            smsLeaveApprovalNeeded(hodEmp.phone, hodEmp.first_name, `${myEmployee.first_name} ${myEmployee.last_name}`, leaveTypeLabels[leaveType], days, startDate);
          }
        }
      }

      toast({ title: 'Leave request submitted', description: `Your ${leaveTypeLabels[leaveType]} request has been submitted.` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleViewDocument = async (docUrl: string) => {
    const { data } = await supabase.storage.from('leave-documents').createSignedUrl(docUrl, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const leaveBalance = myEmployee ? myEmployee.annual_leave_days - myEmployee.used_leave_days : 0;

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">Apply and manage leave requests with multi-level approval</p>
        </div>
        <Button className="gap-2" onClick={() => setShowApply(true)}>
          <Plus className="h-4 w-4" /> Apply for Leave
        </Button>
      </div>

      {myEmployee && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div className="stat-card">
            <p className="text-xs text-muted-foreground">Annual Entitlement</p>
            <p className="text-2xl font-bold text-foreground">{myEmployee.annual_leave_days} days</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground">Days Used</p>
            <p className="text-2xl font-bold text-warning">{myEmployee.used_leave_days} days</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-2xl font-bold text-success">{leaveBalance} days</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-muted-foreground">Pending Requests</p>
            <p className="text-2xl font-bold text-primary">
              {leaves.filter(l => l.employee_id === myEmployeeId && l.status.startsWith('pending')).length}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending_hod">Pending HOD</SelectItem>
            <SelectItem value="pending_hr">Pending HR</SelectItem>
            <SelectItem value="pending_gm">Pending GM</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Employee</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Period</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Days</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Approval Flow</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeaves.map(leave => {
              const empName = leave.employees ? `${leave.employees.first_name} ${leave.employees.last_name}` : '—';
              const deptName = leave.employees?.departments?.name || '—';
              const hodApproval = leave.hod_approval as any;
              const hrApproval = leave.hr_approval as any;
              const gmApproval = leave.gm_approval as any;
              const emp = employees.find(e => e.id === leave.employee_id);
              const empLeaveBalance = emp ? emp.annual_leave_days - emp.used_leave_days : undefined;

              return (
                <tr key={leave.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{empName}</p>
                    <p className="text-xs text-muted-foreground">{deptName}</p>
                  </td>
                  <td className="px-4 py-3 text-foreground">{leaveTypeLabels[leave.leave_type as LeaveType] || leave.leave_type}</td>
                  <td className="px-4 py-3 text-foreground whitespace-nowrap">{leave.start_date} to {leave.end_date}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{leave.days}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[leave.status]}`}>{statusLabels[leave.status]}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {[
                        { label: 'HOD', approval: hodApproval },
                        { label: 'HR', approval: hrApproval },
                        { label: 'GM', approval: gmApproval },
                      ].map(({ label, approval }) => (
                        <span key={label} className={`text-xs px-1.5 py-0.5 rounded ${
                          approval?.approved ? 'bg-success/10 text-success'
                            : approval && !approval.approved ? 'bg-destructive/10 text-destructive'
                            : 'bg-muted text-muted-foreground'
                        }`}>{label}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end items-center">
                      <LeaveFormPDF
                        employeeName={empName}
                        department={deptName}
                        leaveType={leave.leave_type}
                        startDate={leave.start_date}
                        endDate={leave.end_date}
                        resumeDate=""
                        days={leave.days}
                        contactPhone={(leave as any).contact_phone || ''}
                        contactEmail={(leave as any).contact_email || ''}
                        nextOfKin={(leave as any).next_of_kin || ''}
                        nextOfKinPhone={(leave as any).next_of_kin_phone || ''}
                        relieverName={(leave as any).reliever_name || ''}
                        applicationDate={leave.created_at?.slice(0, 10) || ''}
                        status={leave.status}
                        hodApproval={hodApproval}
                        hrApproval={hrApproval}
                        gmApproval={gmApproval}
                        leaveBalance={empLeaveBalance}
                        balanceAfter={empLeaveBalance != null ? empLeaveBalance - leave.days : undefined}
                      />
                      {(leave as any).document_url && (
                        <button onClick={() => handleViewDocument((leave as any).document_url)} className="p-1.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="View attached document">
                          <FileText className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {currentRole !== 'staff' && canApprove(leave) && (
                        <>
                          <button onClick={() => handleApprove(leave.id, true)} className="p-1.5 rounded bg-success/10 text-success hover:bg-success/20 transition-colors">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleApprove(leave.id, false)} className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredLeaves.length === 0 && <div className="text-center py-12 text-muted-foreground">No leave requests found</div>}
      </div>

      {/* Apply Dialog */}
      <Dialog open={showApply} onOpenChange={setShowApply}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" /> Leave Application Form
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {!myEmployeeId && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm text-warning">
                Your account is not linked to an employee record. Please ask HR to link your profile.
              </div>
            )}
            <div>
              <Label>Leave Type *</Label>
              <Select value={leaveType} onValueChange={(v) => setLeaveType(v as LeaveType)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(leaveTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date *</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1" />
              </div>
            </div>
            {startDate && endDate && (
              <p className="text-sm text-primary font-medium">
                Working days: {calculateDays(startDate, endDate)} | Balance after: {leaveBalance - calculateDays(startDate, endDate)} days
              </p>
            )}
            <div>
              <Label>Reason *</Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)} className="mt-1" rows={2} placeholder="Reason for leave" />
            </div>

            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Contact Details While On Leave</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Phone Number</Label>
                  <Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="mt-1" placeholder="e.g. 0712345678" />
                </div>
                <div>
                  <Label>Email Address</Label>
                  <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="mt-1" placeholder="email@example.com" />
                </div>
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Next of Kin</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name</Label>
                  <Input value={nextOfKin} onChange={e => setNextOfKin(e.target.value)} className="mt-1" placeholder="Full name" />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input value={nextOfKinPhone} onChange={e => setNextOfKinPhone(e.target.value)} className="mt-1" placeholder="e.g. 0712345678" />
                </div>
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Reliever</p>
              <div>
                <Label>Name of Reliever(s)</Label>
                <Input value={relieverName} onChange={e => setRelieverName(e.target.value)} className="mt-1" placeholder="Person covering your duties" />
              </div>
            </div>

            {leaveType === 'sick' && (
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Medical Documentation *</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={e => setDocumentFile(e.target.files?.[0] || null)}
                />
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {documentFile ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-foreground">
                      <Paperclip className="h-4 w-4 text-primary" />
                      <span>{documentFile.name}</span>
                      <button type="button" onClick={e => { e.stopPropagation(); setDocumentFile(null); }} className="text-destructive hover:underline text-xs ml-2">Remove</button>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      <Paperclip className="h-5 w-5 mx-auto mb-1" />
                      Click to attach doctor's note or medical certificate
                      <p className="text-xs mt-1">PDF, JPG, PNG, DOC (max 5MB)</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button onClick={handleSubmit} className="w-full" disabled={createLeave.isPending || uploading || !myEmployeeId}>
              {uploading ? 'Uploading...' : createLeave.isPending ? 'Submitting...' : 'Submit Leave Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
