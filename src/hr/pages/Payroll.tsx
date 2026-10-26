import { useState, useMemo, useEffect } from 'react';
import { useEmployees, usePayrollRecords, useSavedPayrollMonths, useSavePayroll, useLoans, DbEmployee } from '@/hr/hooks/useSupabaseData';
import { computeKenyanPayroll, PayrollRecord, Employee } from '@/hr/lib/types';
import { DollarSign, Download, Eye, Save, History, TrendingUp, TrendingDown, Edit2, CalendarClock } from 'lucide-react';
import { smsPayrollProcessed } from '@/hr/lib/smsTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import PayslipPDF from '@/hr/components/PayslipPDF';
import { useMonthlyAttendanceSummary } from '@/hr/hooks/useAttendanceSummary';
import { useApprovedOvertimeForMonth } from '@/hr/hooks/useOvertime';

function formatCurrency(amount: number) {
  return `KES ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const months = [
  { value: '2026-04', label: 'April 2026' }, { value: '2026-03', label: 'March 2026' },
  { value: '2026-02', label: 'February 2026' }, { value: '2026-01', label: 'January 2026' },
  { value: '2025-12', label: 'December 2025' }, { value: '2025-11', label: 'November 2025' },
];

function toPayrollEmployee(emp: DbEmployee): Employee {
  return {
    id: emp.id, staffNumber: emp.staff_number, firstName: emp.first_name, lastName: emp.last_name,
    email: emp.email, idNumber: emp.id_number, kraPin: emp.kra_pin, nssfNo: emp.nssf_no,
    nhifNo: emp.nhif_no, phone: emp.phone, department: emp.departments?.name || '',
    designation: emp.designation, role: 'staff',
    basicPay: Number(emp.basic_pay), houseAllowance: Number(emp.house_allowance),
    transportAllowance: Number(emp.transport_allowance), otherAllowance: Number(emp.other_allowance),
    bankName: emp.bank_name, bankBranch: emp.bank_branch, accountNumber: emp.account_number,
    bankCode: emp.bank_code, joinDate: emp.join_date, status: emp.status as any,
    annualLeaveDays: emp.annual_leave_days, usedLeaveDays: emp.used_leave_days,
  };
}

type Extras = { overtime15x: number; overtime2x: number; bonus: number; leavePay: number; busFare: number; welfare: number; foodItems: number; insurance: number; otherDed: number };
const emptyExtras: Extras = { overtime15x: 0, overtime2x: 0, bonus: 0, leavePay: 0, busFare: 0, welfare: 0, foodItems: 0, insurance: 0, otherDed: 0 };

export default function Payroll() {
  const [month, setMonth] = useState('2026-04');
  const [showPayslip, setShowPayslip] = useState<{ record: PayrollRecord; employee: Employee } | null>(null);
  const [tab, setTab] = useState('current');
  const [compareMonth, setCompareMonth] = useState('');
  const [historyMonth, setHistoryMonth] = useState('');
  const [showExtras, setShowExtras] = useState<string | null>(null);
  const [extrasMap, setExtrasMap] = useState<Record<string, Extras>>({});
  const [autoOT, setAutoOT] = useState(true);

  const { data: dbEmployees = [], isLoading } = useEmployees();
  const { data: savedMonths = [] } = useSavedPayrollMonths();
  const { data: loans = [] } = useLoans();
  const { data: attendanceSummary } = useMonthlyAttendanceSummary(month);
  const { data: approvedOT = {} } = useApprovedOvertimeForMonth(month);
  const savePayroll = useSavePayroll();

  const { data: historyRecords = [] } = usePayrollRecords(historyMonth || undefined);
  const { data: compareRecords = [] } = usePayrollRecords(compareMonth || undefined);

  const activeEmployees = dbEmployees.filter(e => e.status === 'active');

  const payrollData = useMemo(() => activeEmployees.map(emp => {
    const payEmp = toPayrollEmployee(emp);
    const ex = extrasMap[emp.id] || emptyExtras;
    const hourlyRate = Number(emp.basic_pay) / (8 * 22);

    // Auto-pull overtime from attendance if enabled
    const attSummary = attendanceSummary?.[emp.id];
    const approved = approvedOT[emp.id];
    // Approved OT requests take precedence; fall back to manual extras, then attendance.
    let overtime15xHours = approved?.hours15x ?? ex.overtime15x;
    let overtime2xHours = approved?.hours2x ?? ex.overtime2x;
    const otSource: 'approved' | 'attendance' | 'manual' = approved
      ? 'approved'
      : (ex.overtime15x || ex.overtime2x ? 'manual' : 'attendance');
    let absentDeduction = 0;

    if (autoOT && attSummary) {
      // Only top up from attendance if no approved OT exists
      if (!approved) {
        overtime15xHours = Math.max(overtime15xHours, attSummary.overtime_hours);
      }
      // Absenteeism deduction: absent days * daily rate
      absentDeduction = attSummary.absent_days * (Number(emp.basic_pay) / 22);
    }

    const overtime = (overtime15xHours * hourlyRate * 1.5) + (overtime2xHours * hourlyRate * 2);
    // Only deduct loans whose deduction_start_date has arrived by the end of the payroll month
    // and that still have a balance.
    const [yr, mo] = month.split('-').map(Number);
    const monthEnd = new Date(yr, mo, 0).toISOString().slice(0, 10); // last day of month
    const empLoans = loans.filter(l => {
      if (l.employee_id !== emp.id) return false;
      if (l.status !== 'active') return false;
      if (Number(l.balance) <= 0) return false;
      const startStr = (l as any).deduction_start_date || l.start_date;
      return !startStr || startStr <= monthEnd;
    });
    const helbDeduction = empLoans.filter(l => l.loan_type === 'helb').reduce((s, l) => s + Number(l.monthly_deduction), 0);
    const otherLoanDeduction = empLoans.filter(l => l.loan_type !== 'helb').reduce((s, l) => s + Number(l.monthly_deduction), 0);
    const loanDeduction = helbDeduction + otherLoanDeduction;
    const otherDeduction = ex.busFare + ex.welfare + ex.foodItems + ex.otherDed + absentDeduction;
    const record = computeKenyanPayroll(payEmp, {
      overtime, bonus: ex.bonus, leavePay: ex.leavePay,
      loanDeduction, helbDeduction, insuranceDeduction: ex.insurance, otherDeduction,
    });
    return {
      employee: payEmp, dbEmployee: emp, record, extras: ex, otSource,
      attendanceSummary: attSummary || null, absentDeduction,
    };
  }), [activeEmployees, extrasMap, loans, attendanceSummary, autoOT, approvedOT]);

  const totals = useMemo(() => ({
    grossPay: payrollData.reduce((s, d) => s + d.record.grossPay, 0),
    netPay: payrollData.reduce((s, d) => s + d.record.netPay, 0),
    paye: payrollData.reduce((s, d) => s + d.record.paye, 0),
    nssf: payrollData.reduce((s, d) => s + d.record.employeeNssf, 0),
    shif: payrollData.reduce((s, d) => s + d.record.shif, 0),
    ahl: payrollData.reduce((s, d) => s + d.record.housingLevy, 0),
    totalDeductions: payrollData.reduce((s, d) => s + d.record.totalDeductions, 0),
  }), [payrollData]);

  const compareTotals = useMemo(() => {
    if (!compareRecords.length) return null;
    return {
      grossPay: compareRecords.reduce((s, r) => s + Number(r.gross_pay), 0),
      netPay: compareRecords.reduce((s, r) => s + Number(r.net_pay), 0),
      paye: compareRecords.reduce((s, r) => s + Number(r.paye), 0),
      nssf: compareRecords.reduce((s, r) => s + Number(r.employee_nssf), 0),
      shif: compareRecords.reduce((s, r) => s + Number(r.shif), 0),
      ahl: compareRecords.reduce((s, r) => s + Number(r.housing_levy), 0),
      totalDeductions: compareRecords.reduce((s, r) => s + Number(r.total_deductions), 0),
    };
  }, [compareRecords]);

  const handleSavePayroll = async () => {
    if (savedMonths.includes(month)) {
      toast({ title: 'Already saved', description: `Payroll for ${months.find(m => m.value === month)?.label} is already saved.`, variant: 'destructive' });
      return;
    }
    try {
      const records = payrollData.map(({ dbEmployee, record }) => ({
        employee_id: dbEmployee.id, month,
        basic_pay: record.basicPay, house_allowance: record.houseAllowance,
        transport_allowance: record.transportAllowance, other_allowance: record.otherAllowance,
        overtime: record.overtime, bonus: record.bonus, leave_pay: record.leavePay,
        gross_pay: record.grossPay, pensionable_pay: record.pensionablePay,
        employer_nssf: record.employerNssf, employee_nssf: record.employeeNssf,
        taxable_pay: record.taxablePay, tax_payable: record.taxPayable,
        insurance_relief: record.insuranceRelief, personal_relief: record.personalRelief,
        paye: record.paye, shif: record.shif, housing_levy: record.housingLevy,
        loan_deduction: record.loanDeduction, insurance_deduction: record.insuranceDeduction,
        other_deduction: record.otherDeduction, total_deductions: record.totalDeductions, net_pay: record.netPay,
      }));
      await savePayroll.mutateAsync(records);
      // SMS each employee about their payroll
      const monthLabel = months.find(m => m.value === month)?.label || month;
      for (const row of payrollData) {
        if (row.dbEmployee?.phone) {
          smsPayrollProcessed(row.dbEmployee.phone, row.dbEmployee.first_name, monthLabel, formatCurrency(row.record.netPay));
        }
      }
      toast({ title: 'Payroll saved', description: `${monthLabel} payroll saved and SMS notifications sent.` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const renderChange = (current: number, previous: number) => {
    const diff = current - previous;
    const pct = previous > 0 ? ((diff / previous) * 100).toFixed(1) : '0';
    if (diff === 0) return null;
    return (
      <span className={`flex items-center gap-0.5 text-xs ${diff > 0 ? 'text-destructive' : 'text-success'}`}>
        {diff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {diff > 0 ? '+' : ''}{pct}%
      </span>
    );
  };

  const currentExtras = showExtras ? (extrasMap[showExtras] || { ...emptyExtras }) : null;
  const updateExtra = (field: keyof Extras, value: number) => {
    if (!showExtras) return;
    setExtrasMap(prev => ({ ...prev, [showExtras]: { ...(prev[showExtras] || emptyExtras), [field]: value } }));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Payroll Processing</h1>
          <p className="page-subtitle">Monthly payroll with Kenyan statutory deductions</p>
        </div>
        <div className="flex gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={handleSavePayroll} disabled={savePayroll.isPending}>
            <Save className="h-4 w-4" /> {savePayroll.isPending ? 'Saving...' : 'Save Payroll'}
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="current">Current Payroll</TabsTrigger>
          <TabsTrigger value="history" className="gap-1"><History className="h-3.5 w-3.5" /> History ({savedMonths.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 mt-4">
            {[
              { label: 'Gross Pay', value: totals.grossPay, color: 'text-foreground', key: 'grossPay' },
              { label: 'PAYE', value: totals.paye, color: 'text-destructive', key: 'paye' },
              { label: 'NSSF', value: totals.nssf, color: 'text-warning', key: 'nssf' },
              { label: 'SHIF', value: totals.shif, color: 'text-info', key: 'shif' },
              { label: 'Housing Levy', value: totals.ahl, color: 'text-accent-foreground', key: 'ahl' },
              { label: 'Net Pay', value: totals.netPay, color: 'text-success', key: 'netPay' },
            ].map(item => (
              <div key={item.label} className="stat-card">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`text-lg font-bold ${item.color} mt-1`}>{(item.value / 1000).toFixed(0)}K</p>
                {compareTotals && renderChange(item.value, (compareTotals as any)[item.key])}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Compare with:</span>
              <Select value={compareMonth} onValueChange={setCompareMonth}>
                <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Select month" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No comparison</SelectItem>
                  {savedMonths.map(m => <SelectItem key={m} value={m}>{months.find(mo => mo.value === m)?.label || m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={autoOT} onChange={e => setAutoOT(e.target.checked)} className="rounded border-input" />
              <CalendarClock className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">Auto-calculate OT & absenteeism from attendance</span>
            </label>
          </div>


          <div className="bg-card rounded-lg border shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {['#', 'Employee', 'Basic Pay', 'Allowances', 'OT/Bonus', 'Gross Pay', 'PAYE', 'NSSF', 'SHIF', 'AHL', 'Loans', 'Other Ded.', 'Net Pay', ''].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payrollData.map(({ employee: emp, record: r, otSource }, i) => (
                  <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-foreground whitespace-nowrap">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-muted-foreground">{emp.staffNumber}</p>
                    </td>
                    <td className="px-3 py-2.5 text-foreground tabular-nums">{r.basicPay.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-foreground tabular-nums">{(r.houseAllowance + r.transportAllowance + r.otherAllowance).toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-foreground tabular-nums">
                      {(r.overtime + r.bonus + r.leavePay) > 0 ? (
                        <span className="inline-flex items-center gap-1.5">
                          {(r.overtime + r.bonus + r.leavePay).toLocaleString()}
                          {r.overtime > 0 && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full border ${otSource === 'approved' ? 'bg-success/10 text-success border-success/30' : otSource === 'manual' ? 'bg-warning/10 text-warning border-warning/30' : 'bg-info/10 text-info border-info/30'}`}
                              title={`OT source: ${otSource}`}
                            >
                              {otSource === 'approved' ? 'OT✓' : otSource === 'manual' ? 'OT✎' : 'OT⏱'}
                            </span>
                          )}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-foreground tabular-nums">{r.grossPay.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-destructive tabular-nums">{r.paye.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-foreground tabular-nums">{r.employeeNssf.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-foreground tabular-nums">{r.shif.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-foreground tabular-nums">{r.housingLevy.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-foreground tabular-nums">{r.loanDeduction > 0 ? r.loanDeduction.toLocaleString() : '—'}</td>
                    <td className="px-3 py-2.5 text-foreground tabular-nums">{(r.insuranceDeduction + r.otherDeduction) > 0 ? (r.insuranceDeduction + r.otherDeduction).toLocaleString() : '—'}</td>
                    <td className="px-3 py-2.5 font-bold text-success tabular-nums">{r.netPay.toLocaleString()}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => setShowExtras(emp.id)} className="text-muted-foreground hover:text-primary transition-colors" title="Edit extras">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => setShowPayslip({ record: r, employee: emp })} className="text-muted-foreground hover:text-primary transition-colors" title="View payslip">
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-bold text-foreground">
                  <td className="px-3 py-3" colSpan={2}>Totals ({payrollData.length} employees)</td>
                  <td className="px-3 py-3 tabular-nums">{payrollData.reduce((s, d) => s + d.record.basicPay, 0).toLocaleString()}</td>
                  <td className="px-3 py-3 tabular-nums">{payrollData.reduce((s, d) => s + d.record.houseAllowance + d.record.transportAllowance + d.record.otherAllowance, 0).toLocaleString()}</td>
                  <td className="px-3 py-3 tabular-nums">{payrollData.reduce((s, d) => s + d.record.overtime + d.record.bonus + d.record.leavePay, 0).toLocaleString()}</td>
                  <td className="px-3 py-3 tabular-nums">{totals.grossPay.toLocaleString()}</td>
                  <td className="px-3 py-3 text-destructive tabular-nums">{totals.paye.toLocaleString()}</td>
                  <td className="px-3 py-3 tabular-nums">{totals.nssf.toLocaleString()}</td>
                  <td className="px-3 py-3 tabular-nums">{totals.shif.toLocaleString()}</td>
                  <td className="px-3 py-3 tabular-nums">{totals.ahl.toLocaleString()}</td>
                  <td className="px-3 py-3 tabular-nums">{payrollData.reduce((s, d) => s + d.record.loanDeduction, 0).toLocaleString()}</td>
                  <td className="px-3 py-3 tabular-nums">{payrollData.reduce((s, d) => s + d.record.insuranceDeduction + d.record.otherDeduction, 0).toLocaleString()}</td>
                  <td className="px-3 py-3 text-success tabular-nums">{totals.netPay.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="mt-4 space-y-4">
            {savedMonths.length === 0 && (
              <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border">No saved payrolls yet.</div>
            )}
            <div className="flex gap-2 mb-4">
              <Select value={historyMonth} onValueChange={setHistoryMonth}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Select month to view" /></SelectTrigger>
                <SelectContent>{savedMonths.map(m => <SelectItem key={m} value={m}>{months.find(mo => mo.value === m)?.label || m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {historyMonth && historyRecords.length > 0 && (
              <div className="bg-card rounded-lg border shadow-sm">
                <div className="px-5 py-4 border-b">
                  <h3 className="font-semibold text-foreground">{months.find(m => m.value === historyMonth)?.label || historyMonth}</h3>
                  <p className="text-xs text-muted-foreground">{historyRecords.length} employees</p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      {['Employee', 'Gross Pay', 'PAYE', 'NSSF', 'SHIF', 'AHL', 'Loan Ded.', 'Net Pay'].map(h => (
                        <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historyRecords.map(r => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2 text-foreground">{r.employees ? `${r.employees.first_name} ${r.employees.last_name}` : '—'}</td>
                        <td className="px-4 py-2 text-foreground tabular-nums">{Number(r.gross_pay).toLocaleString()}</td>
                        <td className="px-4 py-2 text-destructive tabular-nums">{Number(r.paye).toLocaleString()}</td>
                        <td className="px-4 py-2 text-foreground tabular-nums">{Number(r.employee_nssf).toLocaleString()}</td>
                        <td className="px-4 py-2 text-foreground tabular-nums">{Number(r.shif).toLocaleString()}</td>
                        <td className="px-4 py-2 text-foreground tabular-nums">{Number(r.housing_levy).toLocaleString()}</td>
                        <td className="px-4 py-2 text-foreground tabular-nums">{Number(r.loan_deduction).toLocaleString()}</td>
                        <td className="px-4 py-2 font-bold text-success tabular-nums">{Number(r.net_pay).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Extras Dialog */}
      <Dialog open={!!showExtras} onOpenChange={() => setShowExtras(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-primary" />
              Overtime, Bonus & Deductions
              {showExtras && (() => {
                const emp = activeEmployees.find(e => e.id === showExtras);
                return emp ? <span className="text-muted-foreground font-normal text-sm ml-1">— {emp.first_name} {emp.last_name}</span> : null;
              })()}
            </DialogTitle>
          </DialogHeader>
          {currentExtras && (
            <div className="space-y-4 mt-2">
              {/* Attendance summary info */}
              {autoOT && showExtras && attendanceSummary?.[showExtras] && (() => {
                const s = attendanceSummary[showExtras];
                return (
                  <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                    <p className="font-semibold text-foreground flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Attendance Summary (auto-detected)</p>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <div>Present: <span className="font-medium text-success">{s.present_days}d</span></div>
                      <div>Absent: <span className="font-medium text-destructive">{s.absent_days}d</span></div>
                      <div>Late: <span className="font-medium text-warning">{s.late_days}d</span></div>
                      <div>Half Day: <span className="font-medium">{s.half_days}d</span></div>
                      <div>OT Hours: <span className="font-medium text-primary">{s.overtime_hours.toFixed(1)}h</span></div>
                      <div>On Leave: <span className="font-medium">{s.leave_days}d</span></div>
                    </div>
                  </div>
                );
              })()}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Overtime</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">OT Hours (1.5x)</Label><Input type="number" value={currentExtras.overtime15x || ''} onChange={e => updateExtra('overtime15x', Number(e.target.value))} className="mt-1" placeholder="0" /></div>
                  <div><Label className="text-xs">OT Hours (2x)</Label><Input type="number" value={currentExtras.overtime2x || ''} onChange={e => updateExtra('overtime2x', Number(e.target.value))} className="mt-1" placeholder="0" /></div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Additional Earnings</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Bonus (KES)</Label><Input type="number" value={currentExtras.bonus || ''} onChange={e => updateExtra('bonus', Number(e.target.value))} className="mt-1" placeholder="0" /></div>
                  <div><Label className="text-xs">Leave Pay (KES)</Label><Input type="number" value={currentExtras.leavePay || ''} onChange={e => updateExtra('leavePay', Number(e.target.value))} className="mt-1" placeholder="0" /></div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Additional Deductions</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Bus Fare (KES)</Label><Input type="number" value={currentExtras.busFare || ''} onChange={e => updateExtra('busFare', Number(e.target.value))} className="mt-1" placeholder="0" /></div>
                  <div><Label className="text-xs">Welfare (KES)</Label><Input type="number" value={currentExtras.welfare || ''} onChange={e => updateExtra('welfare', Number(e.target.value))} className="mt-1" placeholder="0" /></div>
                  <div><Label className="text-xs">Food Items (KES)</Label><Input type="number" value={currentExtras.foodItems || ''} onChange={e => updateExtra('foodItems', Number(e.target.value))} className="mt-1" placeholder="0" /></div>
                  <div><Label className="text-xs">Insurance (KES)</Label><Input type="number" value={currentExtras.insurance || ''} onChange={e => updateExtra('insurance', Number(e.target.value))} className="mt-1" placeholder="0" /></div>
                  <div><Label className="text-xs">Other Deduction (KES)</Label><Input type="number" value={currentExtras.otherDed || ''} onChange={e => updateExtra('otherDed', Number(e.target.value))} className="mt-1" placeholder="0" /></div>
                </div>
              </div>
              <Button onClick={() => { setShowExtras(null); toast({ title: 'Extras updated', description: 'Payroll recalculated.' }); }} className="w-full">Apply & Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payslip Dialog */}
      <Dialog open={!!showPayslip} onOpenChange={() => setShowPayslip(null)}>
        <DialogContent className="max-w-lg">
          {showPayslip && (() => {
            const emp = showPayslip.employee;
            const r = showPayslip.record;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" /> Payslip - {emp.firstName} {emp.lastName}
                  </DialogTitle>
                </DialogHeader>
                <div className="border rounded-lg p-4 mt-2 space-y-4 text-sm">
                  <div className="text-center border-b pb-3">
                    <p className="font-bold text-foreground text-lg">UMS KENYA LTD</p>
                    <p className="text-muted-foreground">Payslip for {months.find(m => m.value === month)?.label}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Name:</span> <span className="font-medium text-foreground">{emp.firstName} {emp.lastName}</span></div>
                    <div><span className="text-muted-foreground">Staff #:</span> <span className="font-medium text-foreground">{emp.staffNumber}</span></div>
                    <div><span className="text-muted-foreground">ID:</span> <span className="font-medium text-foreground">{emp.idNumber}</span></div>
                    <div><span className="text-muted-foreground">KRA PIN:</span> <span className="font-medium text-foreground">{emp.kraPin}</span></div>
                  </div>
                  <div className="border-t pt-3">
                    <p className="font-semibold text-foreground mb-2">Earnings</p>
                    {[['Basic Pay', r.basicPay], ['House Allowance', r.houseAllowance], ['Transport Allowance', r.transportAllowance], ['Other Allowance', r.otherAllowance],
                      ...(r.overtime > 0 ? [['Overtime', r.overtime]] : []),
                      ...(r.bonus > 0 ? [['Bonus', r.bonus]] : []),
                      ...(r.leavePay > 0 ? [['Leave Pay', r.leavePay]] : []),
                    ].map(([label, val]) => (
                      <div key={label as string} className="flex justify-between py-0.5">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="text-foreground tabular-nums">{formatCurrency(val as number)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1 font-bold border-t mt-1">
                      <span className="text-foreground">Gross Pay</span>
                      <span className="text-foreground tabular-nums">{formatCurrency(r.grossPay)}</span>
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <p className="font-semibold text-foreground mb-2">Deductions</p>
                    {[['PAYE', r.paye], ['NSSF', r.employeeNssf], ['SHIF', r.shif], ['Housing Levy (AHL)', r.housingLevy],
                      ...(r.loanDeduction > 0 ? [['Loan Deduction', r.loanDeduction]] : []),
                      ...(r.insuranceDeduction > 0 ? [['Insurance', r.insuranceDeduction]] : []),
                      ...(r.otherDeduction > 0 ? [['Other Deductions', r.otherDeduction]] : []),
                    ].map(([label, val]) => (
                      <div key={label as string} className="flex justify-between py-0.5">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="text-destructive tabular-nums">{formatCurrency(val as number)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1 font-bold border-t mt-1">
                      <span className="text-foreground">Total Deductions</span>
                      <span className="text-destructive tabular-nums">{formatCurrency(r.totalDeductions)}</span>
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-foreground">Net Pay</span>
                      <span className="text-success tabular-nums">{formatCurrency(r.netPay)}</span>
                    </div>
                    <div className="mt-3">
                      <PayslipPDF employee={emp} record={r} month={months.find(m => m.value === month)?.label || month} />
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
