import { PayrollRecord } from '@/hr/lib/types';
import { Employee } from '@/hr/lib/types';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useRef } from 'react';

type PayslipPDFProps = {
  employee: Employee;
  record: PayrollRecord;
  month: string;
};

function formatCurrency(n: number) {
  return `KES ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PayslipPDF({ employee, record, month }: PayslipPDFProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = ref.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip - ${employee.firstName} ${employee.lastName} - ${month}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; color: #1a1a2e; font-size: 12px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1565c0; padding-bottom: 15px; }
          .header h1 { font-size: 18px; color: #1565c0; margin-bottom: 4px; }
          .header p { color: #666; font-size: 11px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 16px; padding: 10px; background: #f5f5f5; border-radius: 4px; }
          .info-item label { color: #888; font-size: 10px; display: block; }
          .info-item span { font-weight: 600; font-size: 11px; }
          .section { margin-bottom: 12px; }
          .section h3 { font-size: 12px; font-weight: 700; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #ddd; color: #1565c0; }
          .row { display: flex; justify-content: space-between; padding: 3px 0; }
          .row.total { border-top: 1px solid #333; font-weight: 700; padding-top: 6px; margin-top: 4px; }
          .row.net { font-size: 14px; color: #2e7d32; border-top: 2px solid #333; padding-top: 8px; margin-top: 8px; }
          .deduction { color: #c62828; }
          .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 9px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1" onClick={handlePrint}>
        <Download className="h-3 w-3" /> Download Payslip
      </Button>

      {/* Hidden printable content */}
      <div ref={ref} style={{ display: 'none' }}>
        <div className="header">
          <h1>UMS KENYA LTD</h1>
          <p>P.O. Box 12345, Nairobi, Kenya</p>
          <p style={{ marginTop: '8px', fontSize: '13px', fontWeight: 700 }}>PAYSLIP - {month}</p>
        </div>

        <div className="info-grid">
          <div className="info-item"><label>Employee Name</label><span>{employee.firstName} {employee.lastName}</span></div>
          <div className="info-item"><label>Staff Number</label><span>{employee.staffNumber}</span></div>
          <div className="info-item"><label>ID Number</label><span>{employee.idNumber}</span></div>
          <div className="info-item"><label>KRA PIN</label><span>{employee.kraPin}</span></div>
          <div className="info-item"><label>Department</label><span>{employee.department}</span></div>
          <div className="info-item"><label>Designation</label><span>{employee.designation}</span></div>
          <div className="info-item"><label>NSSF No</label><span>{employee.nssfNo}</span></div>
          <div className="info-item"><label>NHIF/SHIF No</label><span>{employee.nhifNo}</span></div>
          <div className="info-item"><label>Bank</label><span>{employee.bankName} - {employee.bankBranch}</span></div>
          <div className="info-item"><label>Account No</label><span>{employee.accountNumber}</span></div>
        </div>

        <div className="section">
          <h3>EARNINGS</h3>
          <div className="row"><span>Basic Pay</span><span>{formatCurrency(record.basicPay)}</span></div>
          <div className="row"><span>House Allowance</span><span>{formatCurrency(record.houseAllowance)}</span></div>
          <div className="row"><span>Transport Allowance</span><span>{formatCurrency(record.transportAllowance)}</span></div>
          <div className="row"><span>Other Allowance</span><span>{formatCurrency(record.otherAllowance)}</span></div>
          {record.overtime > 0 && <div className="row"><span>Overtime</span><span>{formatCurrency(record.overtime)}</span></div>}
          {record.bonus > 0 && <div className="row"><span>Bonus</span><span>{formatCurrency(record.bonus)}</span></div>}
          <div className="row total"><span>GROSS PAY</span><span>{formatCurrency(record.grossPay)}</span></div>
        </div>

        <div className="section">
          <h3>DEDUCTIONS</h3>
          <div className="row deduction"><span>PAYE (Income Tax)</span><span>{formatCurrency(record.paye)}</span></div>
          <div className="row deduction"><span>NSSF Contribution</span><span>{formatCurrency(record.employeeNssf)}</span></div>
          <div className="row deduction"><span>SHIF Contribution</span><span>{formatCurrency(record.shif)}</span></div>
          <div className="row deduction"><span>Housing Levy (AHL)</span><span>{formatCurrency(record.housingLevy)}</span></div>
          {(record.helbDeduction ?? 0) > 0 && <div className="row deduction"><span>HELB</span><span>{formatCurrency(record.helbDeduction!)}</span></div>}
          {record.loanDeduction - (record.helbDeduction ?? 0) > 0 && <div className="row deduction"><span>Loan Deduction</span><span>{formatCurrency(record.loanDeduction - (record.helbDeduction ?? 0))}</span></div>}
          {record.insuranceDeduction > 0 && <div className="row deduction"><span>Insurance</span><span>{formatCurrency(record.insuranceDeduction)}</span></div>}
          {record.otherDeduction > 0 && <div className="row deduction"><span>Other Deductions</span><span>{formatCurrency(record.otherDeduction)}</span></div>}
          <div className="row total deduction"><span>TOTAL DEDUCTIONS</span><span>{formatCurrency(record.totalDeductions)}</span></div>
        </div>

        <div className="section">
          <h3>TAX COMPUTATION</h3>
          <div className="row"><span>Pensionable Pay</span><span>{formatCurrency(record.pensionablePay)}</span></div>
          <div className="row"><span>Taxable Pay</span><span>{formatCurrency(record.taxablePay)}</span></div>
          <div className="row"><span>Tax Payable (Before Relief)</span><span>{formatCurrency(record.taxPayable)}</span></div>
          <div className="row"><span>Personal Relief</span><span>{formatCurrency(record.personalRelief)}</span></div>
          <div className="row"><span>Insurance Relief</span><span>{formatCurrency(record.insuranceRelief)}</span></div>
        </div>

        <div className="section">
          <div className="row net"><span>NET PAY</span><span>{formatCurrency(record.netPay)}</span></div>
        </div>

        <div className="section" style={{ marginTop: '16px' }}>
          <h3>EMPLOYER CONTRIBUTIONS</h3>
          <div className="row"><span>Employer NSSF</span><span>{formatCurrency(record.employerNssf)}</span></div>
        </div>

        <div className="footer">
          <p>This is a computer-generated payslip. For queries, contact HR Department.</p>
          <p>Generated on {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </>
  );
}
