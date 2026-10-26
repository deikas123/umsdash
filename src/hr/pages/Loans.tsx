import { useState } from 'react';
import { useLoans, useCreateLoan, useUpdateLoan, useCreateLoanPayment, useLoanPayments, useEmployees, DbLoan } from '@/hr/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import { Wallet, Plus, Eye, DollarSign } from 'lucide-react';
import { smsLoanCreated, smsLoanApproved, smsLoanPayment, smsLoanFullyPaid } from '@/hr/lib/smsTemplates';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

const loanTypes = [
  { value: 'salary_advance', label: 'Salary Advance' },
  { value: 'helb', label: 'HELB' },
  { value: 'staff_loan', label: 'Staff Loan' },
  { value: 'emergency_loan', label: 'Emergency Loan' },
  { value: 'equipment_loan', label: 'Equipment Loan' },
];

const statusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  active: 'bg-primary/10 text-primary border-primary/20',
  paid: 'bg-success/10 text-success border-success/20',
  defaulted: 'bg-destructive/10 text-destructive border-destructive/20',
};

function formatCurrency(n: number) {
  return `KES ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Loans() {
  const { role: currentRole } = useAuth();
  const { data: loans = [], isLoading } = useLoans();
  const { data: employees = [] } = useEmployees();
  const createLoan = useCreateLoan();
  const updateLoan = useUpdateLoan();
  const createPayment = useCreateLoanPayment();

  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<DbLoan | null>(null);
  const [showPayment, setShowPayment] = useState<DbLoan | null>(null);

  const [formEmployee, setFormEmployee] = useState('');
  const [formType, setFormType] = useState('salary_advance');
  const [formAmount, setFormAmount] = useState('');
  const [formDeduction, setFormDeduction] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDeductionStart, setFormDeductionStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const { data: detailPayments = [] } = useLoanPayments(showDetail?.id);

  const isHrOrGm = currentRole === 'hr_manager' || currentRole === 'gm';

  const totalOutstanding = loans.filter(l => l.status === 'active').reduce((s, l) => s + Number(l.balance), 0);
  const totalLoaned = loans.reduce((s, l) => s + Number(l.amount), 0);
  const activeLoans = loans.filter(l => l.status === 'active').length;

  const handleCreateLoan = async () => {
    if (!formEmployee || !formAmount) return;
    const amount = Number(formAmount);
    const deduction = Number(formDeduction) || Math.ceil(amount / 12);
    try {
      await createLoan.mutateAsync({
        employee_id: formEmployee,
        loan_type: formType,
        amount,
        balance: amount,
        monthly_deduction: deduction,
        status: 'pending',
        start_date: new Date().toISOString().slice(0, 10),
        deduction_start_date: formDeductionStart,
        description: formDescription,
      } as any);
      // SMS to employee about loan creation
      const emp = employees.find(e => e.id === formEmployee);
      if (emp?.phone) {
        smsLoanCreated(emp.phone, emp.first_name, formatCurrency(amount), formType.replace('_', ' '));
      }

      setShowForm(false);
      setFormEmployee(''); setFormAmount(''); setFormDeduction(''); setFormDescription('');
      setFormDeductionStart(new Date().toISOString().slice(0, 10));
      toast({ title: 'Loan created', description: `${formatCurrency(amount)} loan created.` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleApproveLoan = async (loanId: string) => {
    try {
      await updateLoan.mutateAsync({ id: loanId, status: 'active' });
      const loan = loans.find(l => l.id === loanId);
      const emp = employees.find(e => e.id === loan?.employee_id);
      if (emp?.phone && loan) {
        smsLoanApproved(emp.phone, emp.first_name, formatCurrency(Number(loan.amount)), formatCurrency(Number(loan.monthly_deduction)));
      }
      toast({ title: 'Loan approved' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRecordPayment = async () => {
    if (!showPayment || !payAmount) return;
    const amount = Number(payAmount);
    const newBalance = Math.max(0, Number(showPayment.balance) - amount);
    try {
      await createPayment.mutateAsync({ loan_id: showPayment.id, amount, notes: payNotes });
      await updateLoan.mutateAsync({
        id: showPayment.id,
        balance: newBalance,
        ...(newBalance === 0 ? { status: 'paid' as any } : {}),
      });
      // SMS to employee about payment
      const emp = employees.find(e => e.id === showPayment.employee_id);
      if (emp?.phone) {
        smsLoanPayment(emp.phone, emp.first_name, formatCurrency(amount), formatCurrency(newBalance));
        if (newBalance === 0) smsLoanFullyPaid(emp.phone, emp.first_name);
      }
      toast({ title: 'Payment recorded', description: `New balance: ${formatCurrency(newBalance)}` });
      setShowPayment(null);
      setPayAmount(''); setPayNotes('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Loans & Advances</h1>
          <p className="page-subtitle">Track employee loans, deductions, and balances</p>
        </div>
        {isHrOrGm && (
          <Button className="gap-2" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> New Loan
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="stat-card"><p className="text-xs text-muted-foreground">Total Loaned</p><p className="text-2xl font-bold text-foreground">{formatCurrency(totalLoaned)}</p></div>
        <div className="stat-card"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-2xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</p></div>
        <div className="stat-card"><p className="text-xs text-muted-foreground">Active Loans</p><p className="text-2xl font-bold text-primary">{activeLoans}</p></div>
        <div className="stat-card"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold text-warning">{loans.filter(l => l.status === 'pending').length}</p></div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Employee</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Type</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Amount</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Balance</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Monthly Ded.</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loans.map(loan => {
              const empName = loan.employees ? `${loan.employees.first_name} ${loan.employees.last_name}` : '—';
              return (
                <tr key={loan.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3"><p className="font-medium text-foreground">{empName}</p><p className="text-xs text-muted-foreground">{loan.start_date}</p></td>
                  <td className="px-4 py-3 text-foreground capitalize">{loan.loan_type.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-right text-foreground tabular-nums">{formatCurrency(Number(loan.amount))}</td>
                  <td className="px-4 py-3 text-right font-medium text-foreground tabular-nums">{formatCurrency(Number(loan.balance))}</td>
                  <td className="px-4 py-3 text-right text-foreground tabular-nums">{formatCurrency(Number(loan.monthly_deduction))}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full border ${statusColors[loan.status]}`}>{loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => setShowDetail(loan)} className="text-muted-foreground hover:text-primary p-1"><Eye className="h-4 w-4" /></button>
                      {isHrOrGm && loan.status === 'pending' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleApproveLoan(loan.id)}>Approve</Button>}
                      {isHrOrGm && loan.status === 'active' && <button onClick={() => setShowPayment(loan)} className="text-muted-foreground hover:text-success p-1"><DollarSign className="h-4 w-4" /></button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loans.length === 0 && <div className="text-center py-12 text-muted-foreground">No loans found</div>}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-lg">
          {showDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Loan Details - {showDetail.employees ? `${showDetail.employees.first_name} ${showDetail.employees.last_name}` : '—'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground">Type:</span> <span className="font-medium text-foreground capitalize">{showDetail.loan_type.replace('_', ' ')}</span></div>
                  <div><span className="text-muted-foreground">Status:</span> <span className={`px-2 py-0.5 rounded-full text-xs border ${statusColors[showDetail.status]}`}>{showDetail.status}</span></div>
                  <div><span className="text-muted-foreground">Amount:</span> <span className="font-medium text-foreground">{formatCurrency(Number(showDetail.amount))}</span></div>
                  <div><span className="text-muted-foreground">Balance:</span> <span className="font-bold text-destructive">{formatCurrency(Number(showDetail.balance))}</span></div>
                  <div><span className="text-muted-foreground">Monthly Ded.:</span> <span className="font-medium text-foreground">{formatCurrency(Number(showDetail.monthly_deduction))}</span></div>
                  <div><span className="text-muted-foreground">Start Date:</span> <span className="text-foreground">{showDetail.start_date}</span></div>
                  <div><span className="text-muted-foreground">Deduction Starts:</span> <span className="text-foreground">{(showDetail as any).deduction_start_date || '—'}</span></div>
                </div>
                {showDetail.description && <p className="text-muted-foreground italic">{showDetail.description}</p>}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Repayment Progress</span>
                    <span className="font-medium text-foreground">{Math.round(((Number(showDetail.amount) - Number(showDetail.balance)) / Number(showDetail.amount)) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-success rounded-full transition-all" style={{ width: `${((Number(showDetail.amount) - Number(showDetail.balance)) / Number(showDetail.amount)) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Payment History</h4>
                  {detailPayments.length === 0 && <p className="text-muted-foreground text-xs">No payments yet</p>}
                  {detailPayments.map(p => (
                    <div key={p.id} className="flex justify-between p-2 bg-muted/50 rounded text-xs mb-1">
                      <span className="text-foreground">{p.payment_date} - {p.notes || '—'}</span>
                      <span className="font-medium text-success">{formatCurrency(Number(p.amount))}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New Loan */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Create New Loan</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Employee</Label>
              <Select value={formEmployee} onValueChange={setFormEmployee}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.status === 'active').map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.staff_number})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Loan Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{loanTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount (KES)</Label><Input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} className="mt-1" /></div>
              <div><Label>Monthly Deduction</Label><Input type="number" value={formDeduction} onChange={e => setFormDeduction(e.target.value)} className="mt-1" placeholder="Auto if empty" /></div>
            </div>
            <div>
              <Label>Deduction Start Date</Label>
              <Input type="date" value={formDeductionStart} onChange={e => setFormDeductionStart(e.target.value)} className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Payroll will auto-deduct starting from this month.</p>
            </div>
            <div><Label>Description</Label><Input value={formDescription} onChange={e => setFormDescription(e.target.value)} className="mt-1" /></div>
            <Button onClick={handleCreateLoan} className="w-full" disabled={createLoan.isPending}>{createLoan.isPending ? 'Creating...' : 'Create Loan'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment */}
      <Dialog open={!!showPayment} onOpenChange={() => setShowPayment(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-success" /> Record Payment</DialogTitle></DialogHeader>
          {showPayment && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">Balance: <span className="font-bold text-foreground">{formatCurrency(Number(showPayment.balance))}</span></p>
              <div><Label>Amount (KES)</Label><Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="mt-1" /></div>
              <div><Label>Notes</Label><Input value={payNotes} onChange={e => setPayNotes(e.target.value)} className="mt-1" /></div>
              <Button onClick={handleRecordPayment} className="w-full" disabled={createPayment.isPending}>{createPayment.isPending ? 'Recording...' : 'Record Payment'}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
