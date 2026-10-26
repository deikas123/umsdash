import { useState } from 'react';
import { useEmployees, usePayrollRecords, useSavedPayrollMonths, useDepartments, useLoans } from '@/hr/hooks/useSupabaseData';
import { computeKenyanPayroll, Employee } from '@/hr/lib/types';
import { Download, FileText, Package, FileBarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import JSZip from 'jszip';
import P9FormPDF from '@/hr/components/P9FormPDF';

function toPayrollEmployee(emp: any): Employee {
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

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  toast({ title: 'Report downloaded', description: filename });
}

const monthOptions = [
  { value: '2026-04', label: 'April 2026' }, { value: '2026-03', label: 'March 2026' },
  { value: '2026-02', label: 'February 2026' }, { value: '2026-01', label: 'January 2026' },
  { value: '2025-12', label: 'December 2025' }, { value: '2025-11', label: 'November 2025' },
];

export default function Reports() {
  const { data: employees = [], isLoading } = useEmployees();
  const { data: departments = [] } = useDepartments();
  const { data: savedMonths = [] } = useSavedPayrollMonths();
  const { data: loans = [] } = useLoans();
  const { data: allPayroll = [] } = usePayrollRecords();
  const [month, setMonth] = useState('2026-04');
  const [p9EmpId, setP9EmpId] = useState<string>('');
  const [p9Year, setP9Year] = useState<number>(2026);
  const [showP9, setShowP9] = useState(false);

  const activeEmployees = employees.filter(e => e.status === 'active');
  const payrollData = activeEmployees.map(emp => {
    const payEmp = toPayrollEmployee(emp);
    // Include loan deductions
    const empLoans = loans.filter(l => l.employee_id === emp.id && l.status === 'active');
    const loanDeduction = empLoans.reduce((s, l) => s + Number(l.monthly_deduction), 0);
    return { employee: payEmp, dbEmployee: emp, record: computeKenyanPayroll(payEmp, { loanDeduction }) };
  });

  const totals = {
    grossPay: payrollData.reduce((s, d) => s + d.record.grossPay, 0),
    netPay: payrollData.reduce((s, d) => s + d.record.netPay, 0),
    paye: payrollData.reduce((s, d) => s + d.record.paye, 0),
    nssf: payrollData.reduce((s, d) => s + d.record.employeeNssf, 0),
    employerNssf: payrollData.reduce((s, d) => s + d.record.employerNssf, 0),
    shif: payrollData.reduce((s, d) => s + d.record.shif, 0),
    ahl: payrollData.reduce((s, d) => s + d.record.housingLevy, 0),
    totalDeductions: payrollData.reduce((s, d) => s + d.record.totalDeductions, 0),
  };

  const deptAnalysis = payrollData.reduce((acc, { employee, record }) => {
    const dept = employee.department || 'Unassigned';
    if (!acc[dept]) acc[dept] = { count: 0, grossPay: 0, netPay: 0, paye: 0, nssf: 0, shif: 0, ahl: 0 };
    acc[dept].count++;
    acc[dept].grossPay += record.grossPay;
    acc[dept].netPay += record.netPay;
    acc[dept].paye += record.paye;
    acc[dept].nssf += record.employeeNssf;
    acc[dept].shif += record.shif;
    acc[dept].ahl += record.housingLevy;
    return acc;
  }, {} as Record<string, { count: number; grossPay: number; netPay: number; paye: number; nssf: number; shif: number; ahl: number }>);

  const genPayrollSummary = () => {
    downloadCSV(`Payroll_Summary_${month}.csv`,
      ['Staff No', 'Name', 'Department', 'Basic Pay', 'House Allowance', 'Transport', 'Other', 'Gross Pay', 'PAYE', 'NSSF', 'SHIF', 'AHL', 'Loan Ded.', 'Total Deductions', 'Net Pay'],
      payrollData.map(({ employee: e, record: r }) => [
        e.staffNumber, `${e.firstName} ${e.lastName}`, e.department,
        r.basicPay.toFixed(2), r.houseAllowance.toFixed(2), r.transportAllowance.toFixed(2), r.otherAllowance.toFixed(2),
        r.grossPay.toFixed(2), r.paye.toFixed(2), r.employeeNssf.toFixed(2), r.shif.toFixed(2), r.housingLevy.toFixed(2),
        r.loanDeduction.toFixed(2), r.totalDeductions.toFixed(2), r.netPay.toFixed(2),
      ])
    );
  };

  const genNSSFReturn = () => {
    downloadCSV(`NSSF_Return_${month}.csv`,
      ['Payroll No', 'Surname', 'Other Names', 'ID No', 'KRA PIN', 'NSSF No', 'Gross Pay', 'Employee Contribution', 'Employer Contribution', 'Voluntary Contribution'],
      payrollData.map(({ employee: e, record: r }) => [
        e.staffNumber, e.lastName, e.firstName, e.idNumber, e.kraPin, e.nssfNo,
        r.grossPay.toFixed(2), r.employeeNssf.toFixed(2), r.employerNssf.toFixed(2), '0.00',
      ])
    );
  };

  const genSHIFReturn = () => {
    downloadCSV(`SHIF_Return_${month}.csv`,
      ['Employer Code', 'Contribution Month', 'Payroll No', 'First Name', 'Last Name', 'ID Type', 'ID No', 'KRA PIN', 'SHIF No', 'Amount', 'Phone Number'],
      payrollData.map(({ employee: e, record: r }) => [
        'UMS-KENYA', month, e.staffNumber, e.firstName, e.lastName, 'National ID', e.idNumber, e.kraPin, e.nhifNo, r.shif.toFixed(2), e.phone,
      ])
    );
  };

  const genAHLReturn = () => {
    downloadCSV(`AHL_Housing_Levy_${month}.csv`,
      ['KRA PIN', 'Employee Name', 'ID Number', 'Housing Levy Amount'],
      payrollData.map(({ employee: e, record: r }) => [e.kraPin, `${e.firstName} ${e.lastName}`, e.idNumber, r.housingLevy.toFixed(2)])
    );
  };

  const genPAYEReturn = () => {
    downloadCSV(`PAYE_KRA_Return_${month}.csv`,
      ['KRA PIN', 'Employee Name', 'Resident Status', 'Employment Type', 'Basic Salary', 'Housing', 'Transport', 'Other',
       'Gross Pay', 'Pension (NSSF)', 'SHIF', 'Housing Levy', 'Taxable Pay', 'Tax Payable', 'Personal Relief', 'Insurance Relief', 'PAYE'],
      payrollData.map(({ employee: e, record: r }) => [
        e.kraPin, `${e.firstName} ${e.lastName}`, 'Resident', 'Primary',
        r.basicPay.toFixed(2), r.houseAllowance.toFixed(2), r.transportAllowance.toFixed(2), r.otherAllowance.toFixed(2),
        r.grossPay.toFixed(2), r.employeeNssf.toFixed(2), r.shif.toFixed(2), r.housingLevy.toFixed(2),
        r.taxablePay.toFixed(2), r.taxPayable.toFixed(2), r.personalRelief.toFixed(2), r.insuranceRelief.toFixed(2), r.paye.toFixed(2),
      ])
    );
  };

  const genBankTransfer = () => {
    downloadCSV(`Bank_Transfer_${month}.csv`,
      ['Staff No', 'Employee Name', 'Bank Name', 'Branch', 'Account Number', 'Bank Code', 'Net Pay (Transfer Amount)', 'Month'],
      payrollData.map(({ employee: e, record: r }) => [
        e.staffNumber, `${e.firstName} ${e.lastName}`, e.bankName, e.bankBranch, e.accountNumber, e.bankCode, r.netPay.toFixed(2), month,
      ])
    );
  };

  const genLeaveReport = () => {
    downloadCSV(`Leave_Report_${month}.csv`,
      ['Staff No', 'Employee Name', 'Department', 'Annual Entitlement', 'Days Used', 'Balance'],
      employees.filter(e => e.status === 'active').map(e => [
        e.staff_number, `${e.first_name} ${e.last_name}`, e.departments?.name || '', String(e.annual_leave_days), String(e.used_leave_days), String(e.annual_leave_days - e.used_leave_days),
      ])
    );
  };

  const genDeptAnalysis = () => {
    downloadCSV(`Departmental_Analysis_${month}.csv`,
      ['Department', 'Staff Count', 'Gross Pay', 'PAYE', 'NSSF', 'SHIF', 'AHL', 'Net Pay'],
      Object.entries(deptAnalysis).map(([dept, d]) => [
        dept, String(d.count), d.grossPay.toFixed(2), d.paye.toFixed(2), d.nssf.toFixed(2), d.shif.toFixed(2), d.ahl.toFixed(2), d.netPay.toFixed(2),
      ])
    );
  };

  const genStatutoryBundle = async () => {
    const zip = new JSZip();
    const csvOf = (headers: string[], rows: string[][]) =>
      [headers.join(','), ...rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(','))].join('\n');

    zip.file(`P10_PAYE_iTax_${month}.csv`, csvOf(
      ['KRA PIN', 'Employee Name', 'Resident Status', 'Employment Type', 'Basic Salary', 'Housing', 'Transport', 'Other',
       'Gross Pay', 'Pension (NSSF)', 'SHIF', 'Housing Levy', 'Taxable Pay', 'Tax Payable', 'Personal Relief', 'Insurance Relief', 'PAYE'],
      payrollData.map(({ employee: e, record: r }) => [
        e.kraPin, `${e.firstName} ${e.lastName}`, 'Resident', 'Primary',
        r.basicPay.toFixed(2), r.houseAllowance.toFixed(2), r.transportAllowance.toFixed(2), r.otherAllowance.toFixed(2),
        r.grossPay.toFixed(2), r.employeeNssf.toFixed(2), r.shif.toFixed(2), r.housingLevy.toFixed(2),
        r.taxablePay.toFixed(2), r.taxPayable.toFixed(2), r.personalRelief.toFixed(2), r.insuranceRelief.toFixed(2), r.paye.toFixed(2),
      ])
    ));

    zip.file(`NSSF_Return_${month}.csv`, csvOf(
      ['Payroll No', 'Surname', 'Other Names', 'ID No', 'KRA PIN', 'NSSF No', 'Gross Pay', 'Employee Contribution', 'Employer Contribution', 'Voluntary Contribution'],
      payrollData.map(({ employee: e, record: r }) => [
        e.staffNumber, e.lastName, e.firstName, e.idNumber, e.kraPin, e.nssfNo,
        r.grossPay.toFixed(2), r.employeeNssf.toFixed(2), r.employerNssf.toFixed(2), '0.00',
      ])
    ));

    zip.file(`SHIF_Return_${month}.csv`, csvOf(
      ['Employer Code', 'Contribution Month', 'Payroll No', 'First Name', 'Last Name', 'ID Type', 'ID No', 'KRA PIN', 'SHIF No', 'Amount', 'Phone Number'],
      payrollData.map(({ employee: e, record: r }) => [
        'UMS-KENYA', month, e.staffNumber, e.firstName, e.lastName, 'National ID', e.idNumber, e.kraPin, e.nhifNo, r.shif.toFixed(2), e.phone,
      ])
    ));

    zip.file(`AHL_Housing_Levy_${month}.csv`, csvOf(
      ['KRA PIN', 'Employee Name', 'ID Number', 'Housing Levy Amount'],
      payrollData.map(({ employee: e, record: r }) => [e.kraPin, `${e.firstName} ${e.lastName}`, e.idNumber, r.housingLevy.toFixed(2)])
    ));

    zip.file(`Bank_Transfer_${month}.csv`, csvOf(
      ['Staff No', 'Employee Name', 'Bank Name', 'Branch', 'Account Number', 'Bank Code', 'Net Pay (Transfer Amount)', 'Month'],
      payrollData.map(({ employee: e, record: r }) => [
        e.staffNumber, `${e.firstName} ${e.lastName}`, e.bankName, e.bankBranch, e.accountNumber, e.bankCode, r.netPay.toFixed(2), month,
      ])
    ));

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Statutory_Bundle_${month}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Statutory bundle ready', description: `5 returns zipped for ${month}` });
  };

  const p9Employee = employees.find(e => e.id === p9EmpId);
  const p9Records = allPayroll.filter(p => p.employee_id === p9EmpId);

  const reports = [
    { title: 'Payroll Summary', description: 'Full payroll with earnings, deductions and net pay', icon: '📊', action: genPayrollSummary },
    { title: 'KRA PAYE Return', description: 'Employee details formatted for iTax/KRA upload', icon: '🏛️', action: genPAYEReturn },
    { title: 'NSSF Return', description: 'NSSF contribution return with Tier I & II', icon: '🛡️', action: genNSSFReturn },
    { title: 'SHIF Return', description: 'SHIF contribution return for submission', icon: '🏥', action: genSHIFReturn },
    { title: 'Housing Levy (AHL)', description: 'Affordable Housing Levy return', icon: '🏠', action: genAHLReturn },
    { title: 'Bank Transfer File', description: 'Bank transfer details for salary payments', icon: '🏦', action: genBankTransfer },
    { title: 'Departmental Analysis', description: 'Payroll breakdown by department', icon: '📈', action: genDeptAnalysis },
    { title: 'Leave Report', description: 'Leave utilization and balance report', icon: '📅', action: genLeaveReport },
  ];

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Reports & Returns</h1>
          <p className="page-subtitle">Generate payroll, statutory returns and compliance reports</p>
        </div>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>{monthOptions.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">Statutory Reports</TabsTrigger>
          <TabsTrigger value="summary">Payroll Summary</TabsTrigger>
          <TabsTrigger value="dept">Departmental</TabsTrigger>
          <TabsTrigger value="bank">Bank Transfer</TabsTrigger>
          <TabsTrigger value="p9">P9 Forms</TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <div className="mt-4 mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Statutory Bundle (one-click)</h3>
                <p className="text-xs text-muted-foreground">Download all KRA, NSSF, SHIF, AHL, and bank-transfer returns for {month} as a single ZIP.</p>
              </div>
            </div>
            <Button size="sm" className="gap-2" onClick={genStatutoryBundle}>
              <Download className="h-4 w-4" /> Download Bundle
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {reports.map(report => (
              <div key={report.title} className="bg-card rounded-lg border shadow-sm p-4 hover:shadow-md transition-shadow group">
                <div className="text-2xl mb-2">{report.icon}</div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{report.title}</h3>
                <p className="text-xs text-muted-foreground mb-3">{report.description}</p>
                <Button variant="outline" size="sm" className="gap-1 text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors" onClick={report.action}>
                  <Download className="h-3 w-3" /> Download CSV
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="summary">
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Gross Pay', value: totals.grossPay, color: 'text-foreground' },
                { label: 'Total PAYE', value: totals.paye, color: 'text-destructive' },
                { label: 'Total NSSF (Emp)', value: totals.nssf, color: 'text-warning' },
                { label: 'Total NSSF (Employer)', value: totals.employerNssf, color: 'text-warning' },
                { label: 'Total SHIF', value: totals.shif, color: 'text-info' },
                { label: 'Total AHL', value: totals.ahl, color: 'text-accent-foreground' },
                { label: 'Total Deductions', value: totals.totalDeductions, color: 'text-destructive' },
                { label: 'Total Net Pay', value: totals.netPay, color: 'text-success' },
              ].map(item => (
                <div key={item.label} className="stat-card">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`text-lg font-bold ${item.color} mt-1`}>KES {item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              ))}
            </div>
            <div className="text-right">
              <Button variant="outline" size="sm" className="gap-1" onClick={genPayrollSummary}>
                <Download className="h-3 w-3" /> Download Full Summary
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="dept">
          <div className="mt-4 bg-card rounded-lg border shadow-sm">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Departmental Payroll Analysis</h2>
              <Button variant="outline" size="sm" className="gap-1" onClick={genDeptAnalysis}>
                <Download className="h-3 w-3" /> Download
              </Button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {['Department', 'Staff', 'Gross Pay', 'PAYE', 'NSSF', 'SHIF', 'AHL', 'Net Pay'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(deptAnalysis).map(([dept, data]) => (
                  <tr key={dept} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{dept}</td>
                    <td className="px-4 py-3 text-foreground">{data.count}</td>
                    <td className="px-4 py-3 text-foreground tabular-nums">KES {data.grossPay.toLocaleString()}</td>
                    <td className="px-4 py-3 text-destructive tabular-nums">KES {data.paye.toLocaleString()}</td>
                    <td className="px-4 py-3 text-foreground tabular-nums">KES {data.nssf.toLocaleString()}</td>
                    <td className="px-4 py-3 text-foreground tabular-nums">KES {data.shif.toLocaleString()}</td>
                    <td className="px-4 py-3 text-foreground tabular-nums">KES {data.ahl.toLocaleString()}</td>
                    <td className="px-4 py-3 text-success font-medium tabular-nums">KES {data.netPay.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {Object.keys(deptAnalysis).length === 0 && <div className="text-center py-12 text-muted-foreground">No data</div>}
          </div>
        </TabsContent>

        <TabsContent value="bank">
          <div className="mt-4 bg-card rounded-lg border shadow-sm">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Bank Transfer Details</h2>
                <p className="text-xs text-muted-foreground">Net salary payment transfer list for {monthOptions.find(m => m.value === month)?.label || month}</p>
              </div>
              <Button variant="outline" size="sm" className="gap-1" onClick={genBankTransfer}>
                <Download className="h-3 w-3" /> Download
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {['#', 'Employee', 'Bank', 'Branch', 'Account No', 'Bank Code', 'Net Pay'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payrollData.map(({ employee: e, record: r }, i) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-2.5"><p className="font-medium text-foreground">{e.firstName} {e.lastName}</p><p className="text-xs text-muted-foreground">{e.staffNumber}</p></td>
                      <td className="px-4 py-2.5 text-foreground">{e.bankName}</td>
                      <td className="px-4 py-2.5 text-foreground">{e.bankBranch}</td>
                      <td className="px-4 py-2.5 font-mono text-foreground">{e.accountNumber}</td>
                      <td className="px-4 py-2.5 text-foreground">{e.bankCode}</td>
                      <td className="px-4 py-2.5 font-bold text-success tabular-nums">KES {r.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 font-bold">
                    <td className="px-4 py-3" colSpan={6}>Total Transfer</td>
                    <td className="px-4 py-3 text-success tabular-nums">KES {totals.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="p9">
          <div className="mt-4 bg-card rounded-lg border shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileBarChart className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">KRA P9A Tax Deduction Card</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Generate the official 12-month P9A form for any employee. Used by employees when filing their annual KRA returns.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Employee</label>
                <Select value={p9EmpId} onValueChange={setP9EmpId}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {activeEmployees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.staff_number})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Year</label>
                <Select value={String(p9Year)} onValueChange={v => setP9Year(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2026, 2025, 2024].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setShowP9(true)} disabled={!p9EmpId} className="gap-2">
                <FileText className="h-4 w-4" /> Generate P9 Form
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {showP9 && p9Employee && (
        <P9FormPDF
          employee={{
            first_name: p9Employee.first_name,
            last_name: p9Employee.last_name,
            staff_number: p9Employee.staff_number,
            kra_pin: p9Employee.kra_pin,
            id_number: p9Employee.id_number,
          }}
          records={p9Records as any}
          year={p9Year}
          onClose={() => setShowP9(false)}
        />
      )}
    </div>
  );
}
