import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMyProfile, useEmployees, usePayrollRecords, useLoans, useLoanPayments, useLeaveRequests } from '@/hr/hooks/useSupabaseData';
import { useAttendance } from '@/hr/hooks/useAttendanceData';
import { supabase } from '@/integrations/supabase/client';
import { User, Mail, Phone, Building2, Briefcase, CreditCard, Lock, FileText, CalendarDays, Clock, Wallet, AlertTriangle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import DocumentVault from '@/hr/components/DocumentVault';
import P9FormPDF from '@/hr/components/P9FormPDF';

const roleLabels: Record<string, string> = {
  gm: 'General Manager', hr: 'HR Manager', hod: 'Head of Department', staff: 'Staff Member',
};

function formatCurrency(n: number) {
  return `KES ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const statusColors: Record<string, string> = {
  pending_hod: 'bg-warning/10 text-warning', pending_hr: 'bg-info/10 text-info',
  pending_gm: 'bg-accent text-accent-foreground', approved: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
};

export default function MyProfile() {
  const { user, role: currentRole } = useAuth();
  const { data: myProfile } = useMyProfile();
  const { data: employees = [] } = useEmployees();
  const { data: allPayroll = [] } = usePayrollRecords();
  const { data: allLoans = [] } = useLoans();
  const { data: allLeaves = [] } = useLeaveRequests();
  const { data: allAttendance = [] } = useAttendance();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const { data: loanPayments = [] } = useLoanPayments(selectedLoanId || undefined);
  const [showP9, setShowP9] = useState(false);
  const [p9Year, setP9Year] = useState(new Date().getFullYear());

  const myEmployee = employees.find(e => e.id === myProfile?.employee_id);
  const myPayroll = allPayroll.filter(p => p.employee_id === myProfile?.employee_id);
  const myLoans = allLoans.filter(l => l.employee_id === myProfile?.employee_id);
  const myLeaves = allLeaves.filter(l => l.employee_id === myProfile?.employee_id);
  const myAttendance = allAttendance.filter(a => a.employee_id === myProfile?.employee_id);

  const handlePasswordReset = async () => {
    if (newPassword.length < 6) { toast({ title: 'Error', description: 'Password must be at least 6 characters.', variant: 'destructive' }); return; }
    if (newPassword !== confirmPassword) { toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Password updated' });
      setShowPasswordDialog(false); setNewPassword(''); setConfirmPassword('');
    } catch (error: any) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const leaveBalance = myEmployee ? myEmployee.annual_leave_days - myEmployee.used_leave_days : 0;

  const handleDownloadPayslip = (p: any) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Payslip - ${myEmployee?.first_name} ${myEmployee?.last_name} - ${p.month}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:20px;color:#1a1a2e;font-size:12px}
.header{text-align:center;margin-bottom:20px;border-bottom:2px solid #1565c0;padding-bottom:15px}
.header h1{font-size:18px;color:#1565c0;margin-bottom:4px}.header p{color:#666;font-size:11px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:16px;padding:10px;background:#f5f5f5;border-radius:4px}
.info-item label{color:#888;font-size:10px;display:block}.info-item span{font-weight:600;font-size:11px}
.section{margin-bottom:12px}.section h3{font-size:12px;font-weight:700;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #ddd;color:#1565c0}
.row{display:flex;justify-content:space-between;padding:3px 0}.row.total{border-top:1px solid #333;font-weight:700;padding-top:6px;margin-top:4px}
.row.net{font-size:14px;color:#2e7d32;border-top:2px solid #333;padding-top:8px;margin-top:8px}
.deduction{color:#c62828}.footer{margin-top:20px;padding-top:10px;border-top:1px solid #ddd;text-align:center;color:#999;font-size:9px}
@media print{body{padding:0}}</style></head><body>
<div class="header"><h1>UMS KENYA LTD</h1><p>P.O. Box 12345, Nairobi, Kenya</p><p style="margin-top:8px;font-size:13px;font-weight:700">PAYSLIP - ${p.month}</p></div>
<div class="info-grid">
<div class="info-item"><label>Employee Name</label><span>${myEmployee?.first_name} ${myEmployee?.last_name}</span></div>
<div class="info-item"><label>Staff Number</label><span>${myEmployee?.staff_number}</span></div>
<div class="info-item"><label>ID Number</label><span>${myEmployee?.id_number}</span></div>
<div class="info-item"><label>KRA PIN</label><span>${myEmployee?.kra_pin}</span></div>
<div class="info-item"><label>Department</label><span>${myEmployee?.departments?.name || '—'}</span></div>
<div class="info-item"><label>Designation</label><span>${myEmployee?.designation}</span></div>
</div>
<div class="section"><h3>EARNINGS</h3>
<div class="row"><span>Basic Pay</span><span>${formatCurrency(Number(p.basic_pay))}</span></div>
<div class="row"><span>House Allowance</span><span>${formatCurrency(Number(p.house_allowance))}</span></div>
<div class="row"><span>Transport Allowance</span><span>${formatCurrency(Number(p.transport_allowance))}</span></div>
<div class="row"><span>Other Allowance</span><span>${formatCurrency(Number(p.other_allowance))}</span></div>
${Number(p.overtime) > 0 ? `<div class="row"><span>Overtime</span><span>${formatCurrency(Number(p.overtime))}</span></div>` : ''}
<div class="row total"><span>GROSS PAY</span><span>${formatCurrency(Number(p.gross_pay))}</span></div></div>
<div class="section"><h3>DEDUCTIONS</h3>
<div class="row deduction"><span>PAYE</span><span>${formatCurrency(Number(p.paye))}</span></div>
<div class="row deduction"><span>NSSF</span><span>${formatCurrency(Number(p.employee_nssf))}</span></div>
<div class="row deduction"><span>SHIF</span><span>${formatCurrency(Number(p.shif))}</span></div>
<div class="row deduction"><span>Housing Levy</span><span>${formatCurrency(Number(p.housing_levy))}</span></div>
${Number(p.loan_deduction) > 0 ? `<div class="row deduction"><span>Loan</span><span>${formatCurrency(Number(p.loan_deduction))}</span></div>` : ''}
<div class="row total deduction"><span>TOTAL DEDUCTIONS</span><span>${formatCurrency(Number(p.total_deductions))}</span></div></div>
<div class="section"><div class="row net"><span>NET PAY</span><span>${formatCurrency(Number(p.net_pay))}</span></div></div>
<div class="footer"><p>Computer-generated payslip. For queries, contact HR.</p><p>Generated ${new Date().toLocaleDateString()}</p></div>
</body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">My Portal</h1>
          <p className="page-subtitle">View your profile, payslips, attendance, loans, and leave history</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setShowPasswordDialog(true)}>
          <Lock className="h-4 w-4" /> Change Password
        </Button>
      </div>

      {!myProfile?.employee_id && (
        <div className="mb-6 p-4 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
          <div>
            <p className="font-medium text-warning">Profile Not Linked</p>
            <p className="text-sm text-muted-foreground">Your account is not linked to an employee record. Please contact HR to link your profile so you can access payslips, attendance, and other self-service features.</p>
          </div>
        </div>
      )}

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="profile" className="gap-1 text-xs"><User className="h-3 w-3" /> Profile</TabsTrigger>
          <TabsTrigger value="payslips" className="gap-1 text-xs"><FileText className="h-3 w-3" /> Payslips</TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1 text-xs"><Clock className="h-3 w-3" /> Attendance</TabsTrigger>
          <TabsTrigger value="loans" className="gap-1 text-xs"><Wallet className="h-3 w-3" /> Loans</TabsTrigger>
          <TabsTrigger value="leave" className="gap-1 text-xs"><CalendarDays className="h-3 w-3" /> Leave</TabsTrigger>
          <TabsTrigger value="docs" className="gap-1 text-xs"><FileText className="h-3 w-3" /> Documents</TabsTrigger>
        </TabsList>

        {/* PROFILE TAB */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg border shadow-sm p-5">
              <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> Account</h2>
              <div className="space-y-3">
                {[
                  ['Full Name', myProfile?.full_name || user?.user_metadata?.full_name || '—'],
                  ['Email', user?.email || '—'],
                  ['System Role', roleLabels[currentRole] || currentRole],
                  ['Employee Record', myEmployee ? `${myEmployee.first_name} ${myEmployee.last_name} (${myEmployee.staff_number})` : 'Not linked — contact HR'],
                ].map(([label, value]) => (
                  <div key={label}><Label className="text-xs text-muted-foreground">{label}</Label><p className="text-sm font-medium text-foreground">{value}</p></div>
                ))}
              </div>
            </div>
            {myEmployee && (
              <>
                <div className="bg-card rounded-lg border shadow-sm p-5">
                  <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" /> Employment</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Staff Number', myEmployee.staff_number], ['ID Number', myEmployee.id_number],
                      ['KRA PIN', myEmployee.kra_pin], ['NSSF No.', myEmployee.nssf_no],
                      ['SHIF No.', myEmployee.nhif_no], ['Phone', myEmployee.phone],
                      ['Department', myEmployee.departments?.name || '—'], ['Designation', myEmployee.designation],
                      ['Join Date', myEmployee.join_date], ['Status', myEmployee.status],
                    ].map(([label, value]) => (
                      <div key={label}><Label className="text-xs text-muted-foreground">{label}</Label><p className="text-sm font-medium text-foreground capitalize">{value || '—'}</p></div>
                    ))}
                  </div>
                </div>
                <div className="bg-card rounded-lg border shadow-sm p-5">
                  <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2"><CreditCard className="h-4 w-4 text-muted-foreground" /> Compensation</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Basic Pay', formatCurrency(Number(myEmployee.basic_pay))],
                      ['House Allowance', formatCurrency(Number(myEmployee.house_allowance))],
                      ['Transport Allowance', formatCurrency(Number(myEmployee.transport_allowance))],
                      ['Other Allowance', formatCurrency(Number(myEmployee.other_allowance))],
                    ].map(([label, value]) => (
                      <div key={label}><Label className="text-xs text-muted-foreground">{label}</Label><p className="text-sm font-medium text-foreground">{value}</p></div>
                    ))}
                  </div>
                </div>
                <div className="bg-card rounded-lg border shadow-sm p-5">
                  <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" /> Bank & Leave</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Bank', myEmployee.bank_name], ['Branch', myEmployee.bank_branch],
                      ['Account No.', myEmployee.account_number], ['Bank Code', myEmployee.bank_code],
                      ['Annual Leave', `${myEmployee.annual_leave_days} days`], ['Used', `${myEmployee.used_leave_days} days`],
                      ['Balance', `${leaveBalance} days`],
                    ].map(([label, value]) => (
                      <div key={label}><Label className="text-xs text-muted-foreground">{label}</Label><p className="text-sm font-medium text-foreground">{value || '—'}</p></div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* PAYSLIPS TAB */}
        <TabsContent value="payslips">
          {myPayroll.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{myProfile?.employee_id ? 'No payslips found yet.' : 'Link your profile to view payslips.'}</div>
          ) : (
            <>
              <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <p className="text-sm text-foreground"><span className="font-semibold">KRA P9A Form</span> — annual tax deduction card for filing your KRA returns.</p>
                </div>
                <div className="flex items-center gap-2">
                  <select value={p9Year} onChange={e => setP9Year(Number(e.target.value))} className="text-sm rounded border border-border bg-background px-2 py-1">
                    {[2026, 2025, 2024].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <Button size="sm" onClick={() => setShowP9(true)} disabled={!myEmployee}>
                    <Download className="h-3 w-3 mr-1" /> Download P9
                  </Button>
                </div>
              </div>
            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Month</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Gross Pay</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Total Ded.</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Net Pay</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Payslip</th>
                </tr></thead>
                <tbody>
                  {myPayroll.sort((a, b) => b.month.localeCompare(a.month)).map(p => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">{p.month}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">{formatCurrency(Number(p.gross_pay))}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-destructive">{formatCurrency(Number(p.total_deductions))}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-success">{formatCurrency(Number(p.net_pay))}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs" onClick={() => handleDownloadPayslip(p)}>
                          <Download className="h-3 w-3" /> Download
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </TabsContent>

        {/* ATTENDANCE TAB */}
        <TabsContent value="attendance">
          {myAttendance.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{myProfile?.employee_id ? 'No attendance records found.' : 'Link your profile to view attendance.'}</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                {[
                  ['Total Days', myAttendance.length, 'text-foreground'],
                  ['Present', myAttendance.filter(a => a.status === 'present').length, 'text-success'],
                  ['Late', myAttendance.filter(a => a.status === 'late').length, 'text-warning'],
                  ['Absent', myAttendance.filter(a => a.status === 'absent').length, 'text-destructive'],
                  ['On Leave', myAttendance.filter(a => a.status === 'on_leave').length, 'text-primary'],
                ].map(([label, count, color]) => (
                  <div key={label as string} className="stat-card">
                    <p className="text-xs text-muted-foreground">{label as string}</p>
                    <p className={`text-2xl font-bold ${color}`}>{count as number}</p>
                  </div>
                ))}
              </div>
              <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Clock In</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Clock Out</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Notes</th>
                  </tr></thead>
                  <tbody>
                    {myAttendance.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50).map(a => (
                      <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 text-foreground">{a.date}</td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${
                          a.status === 'present' ? 'bg-success/10 text-success' :
                          a.status === 'absent' ? 'bg-destructive/10 text-destructive' :
                          a.status === 'late' ? 'bg-warning/10 text-warning' :
                          'bg-primary/10 text-primary'
                        }`}>{a.status.replace('_', ' ')}</span></td>
                        <td className="px-4 py-3 text-foreground">{a.clock_in || '—'}</td>
                        <td className="px-4 py-3 text-foreground">{a.clock_out || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{a.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </TabsContent>

        {/* LOANS TAB */}
        <TabsContent value="loans">
          {myLoans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{myProfile?.employee_id ? 'No loans found.' : 'Link your profile to view loans.'}</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <div className="stat-card"><p className="text-xs text-muted-foreground">Active Loans</p><p className="text-2xl font-bold text-primary">{myLoans.filter(l => l.status === 'active').length}</p></div>
                <div className="stat-card"><p className="text-xs text-muted-foreground">Total Outstanding</p><p className="text-2xl font-bold text-destructive">{formatCurrency(myLoans.filter(l => l.status === 'active').reduce((s, l) => s + Number(l.balance), 0))}</p></div>
                <div className="stat-card"><p className="text-xs text-muted-foreground">Monthly Deductions</p><p className="text-2xl font-bold text-warning">{formatCurrency(myLoans.filter(l => l.status === 'active').reduce((s, l) => s + Number(l.monthly_deduction), 0))}</p></div>
              </div>
              <div className="space-y-4">
                {myLoans.map(loan => (
                  <div key={loan.id} className="bg-card rounded-lg border shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground capitalize">{loan.loan_type.replace('_', ' ')}</h3>
                        <p className="text-xs text-muted-foreground">Started: {loan.start_date || '—'}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full border ${
                        loan.status === 'active' ? 'bg-primary/10 text-primary border-primary/20' :
                        loan.status === 'paid' ? 'bg-success/10 text-success border-success/20' :
                        'bg-muted text-muted-foreground border-border'
                      }`}>{loan.status}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-sm mb-3">
                      <div><Label className="text-xs text-muted-foreground">Amount</Label><p className="font-medium text-foreground">{formatCurrency(Number(loan.amount))}</p></div>
                      <div><Label className="text-xs text-muted-foreground">Balance</Label><p className="font-bold text-destructive">{formatCurrency(Number(loan.balance))}</p></div>
                      <div><Label className="text-xs text-muted-foreground">Monthly Ded.</Label><p className="font-medium text-foreground">{formatCurrency(Number(loan.monthly_deduction))}</p></div>
                      <div><Label className="text-xs text-muted-foreground">Repaid</Label><p className="font-medium text-success">{Math.round(((Number(loan.amount) - Number(loan.balance)) / Number(loan.amount)) * 100)}%</p></div>
                    </div>
                    <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-success rounded-full transition-all" style={{ width: `${((Number(loan.amount) - Number(loan.balance)) / Number(loan.amount)) * 100}%` }} />
                    </div>
                    {loan.description && <p className="text-xs text-muted-foreground italic mt-2">{loan.description}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* LEAVE TAB */}
        <TabsContent value="leave">
          {myEmployee && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="stat-card"><p className="text-xs text-muted-foreground">Annual Entitlement</p><p className="text-2xl font-bold text-foreground">{myEmployee.annual_leave_days} days</p></div>
              <div className="stat-card"><p className="text-xs text-muted-foreground">Days Used</p><p className="text-2xl font-bold text-warning">{myEmployee.used_leave_days} days</p></div>
              <div className="stat-card"><p className="text-xs text-muted-foreground">Balance</p><p className="text-2xl font-bold text-success">{leaveBalance} days</p></div>
              <div className="stat-card"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold text-primary">{myLeaves.filter(l => l.status.startsWith('pending')).length}</p></div>
            </div>
          )}
          {myLeaves.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{myProfile?.employee_id ? 'No leave requests found.' : 'Link your profile to view leave history.'}</div>
          ) : (
            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Period</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Days</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Approval Flow</th>
                </tr></thead>
                <tbody>
                  {myLeaves.sort((a, b) => b.created_at.localeCompare(a.created_at)).map(leave => {
                    const hod = leave.hod_approval as any;
                    const hr = leave.hr_approval as any;
                    const gm = leave.gm_approval as any;
                    return (
                      <tr key={leave.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 capitalize text-foreground">{leave.leave_type.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-foreground whitespace-nowrap">{leave.start_date} to {leave.end_date}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{leave.days}</td>
                        <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${statusColors[leave.status] || ''}`}>{leave.status.replace('_', ' ')}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {[{ label: 'HOD', a: hod }, { label: 'HR', a: hr }, { label: 'GM', a: gm }].map(({ label, a }) => (
                              <span key={label} className={`text-xs px-1.5 py-0.5 rounded ${a?.approved ? 'bg-success/10 text-success' : a && !a.approved ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>{label}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="docs">
          {!myProfile?.employee_id ? (
            <div className="text-center py-12 text-muted-foreground">Link your profile to view documents.</div>
          ) : (
            <DocumentVault employeeId={myProfile.employee_id} />
          )}
        </TabsContent>
      </Tabs>

      {showP9 && myEmployee && (
        <P9FormPDF
          employee={{
            first_name: myEmployee.first_name,
            last_name: myEmployee.last_name,
            staff_number: myEmployee.staff_number,
            kra_pin: myEmployee.kra_pin,
            id_number: myEmployee.id_number,
          }}
          records={myPayroll as any}
          year={p9Year}
          onClose={() => setShowP9(false)}
        />
      )}

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>New Password</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="mt-1" minLength={6} /></div>
            <div><Label>Confirm Password</Label><Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="mt-1" /></div>
            <Button onClick={handlePasswordReset} className="w-full" disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
