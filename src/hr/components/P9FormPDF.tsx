import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { buildP9Rows, p9Totals, PayrollRow } from '@/hr/lib/p9Calculator';

type Props = {
  employee: { first_name: string; last_name: string; staff_number: string; kra_pin: string; id_number: string };
  records: PayrollRow[];
  year: number;
  companyName?: string;
  companyKraPin?: string;
  onClose: () => void;
};

function fmt(n: number) { return n > 0 ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'; }

export default function P9FormPDF({ employee, records, year, companyName = 'UMS Kenya Ltd', companyKraPin = '—', onClose }: Props) {
  const rows = buildP9Rows(records, year);
  const totals = p9Totals(rows);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 overflow-y-auto print:bg-white print:relative print:overflow-visible">
      <div className="max-w-6xl mx-auto p-6 print:p-0">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <h2 className="text-lg font-semibold text-foreground">P9A Tax Deduction Card — {year}</h2>
          <div className="flex gap-2">
            <Button onClick={() => window.print()} className="gap-2"><Printer className="h-4 w-4" /> Print / Save as PDF</Button>
            <Button variant="outline" onClick={onClose} className="gap-2"><X className="h-4 w-4" /> Close</Button>
          </div>
        </div>

        <div id="p9-print" className="bg-white text-black p-6 rounded border print:border-0 print:shadow-none">
          <div className="text-center mb-4 border-b-2 border-black pb-3">
            <h1 className="text-base font-bold uppercase">Republic of Kenya — Kenya Revenue Authority</h1>
            <p className="text-xs">DOMESTIC TAXES DEPARTMENT — INCOME TAX</p>
            <p className="text-sm font-bold mt-1">P9A — TAX DEDUCTION CARD — YEAR {year}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div><strong>Employer's Name:</strong> {companyName}</div>
            <div><strong>Employer's PIN:</strong> {companyKraPin}</div>
            <div><strong>Employee's Name:</strong> {employee.first_name} {employee.last_name}</div>
            <div><strong>Employee's PIN:</strong> {employee.kra_pin}</div>
            <div><strong>Staff Number:</strong> {employee.staff_number}</div>
            <div><strong>ID Number:</strong> {employee.id_number}</div>
          </div>

          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-gray-200">
                {['Month', 'Basic Salary', 'Benefits/Allow', 'Gross Pay', 'Pension (NSSF)', 'Taxable Pay', 'Tax Charged', 'Personal Relief', 'Insurance Relief', 'PAYE Net'].map(h => (
                  <th key={h} className="border border-black px-1 py-1 text-left">{h}</th>
                ))}
              </tr>
              <tr className="bg-gray-100 text-[9px] text-center text-gray-700">
                {['A','B','C','D = B+C','E','F = D-E','G','H','I','J = G-H-I'].map(c => (
                  <th key={c} className="border border-black px-1 py-0.5 font-normal">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.month}>
                  <td className="border border-black px-1 py-1 font-medium">{r.monthLabel}</td>
                  <td className="border border-black px-1 py-1 text-right tabular-nums">{fmt(r.basic)}</td>
                  <td className="border border-black px-1 py-1 text-right tabular-nums">{fmt(r.benefits)}</td>
                  <td className="border border-black px-1 py-1 text-right tabular-nums">{fmt(r.grossPay)}</td>
                  <td className="border border-black px-1 py-1 text-right tabular-nums">{fmt(r.pension)}</td>
                  <td className="border border-black px-1 py-1 text-right tabular-nums">{fmt(r.taxablePay)}</td>
                  <td className="border border-black px-1 py-1 text-right tabular-nums">{fmt(r.paye)}</td>
                  <td className="border border-black px-1 py-1 text-right tabular-nums">{fmt(r.personalRelief)}</td>
                  <td className="border border-black px-1 py-1 text-right tabular-nums">{fmt(r.insuranceRelief)}</td>
                  <td className="border border-black px-1 py-1 text-right tabular-nums font-medium">{fmt(r.payeNet)}</td>
                </tr>
              ))}
              <tr className="bg-gray-200 font-bold">
                <td className="border border-black px-1 py-1">TOTAL</td>
                <td className="border border-black px-1 py-1 text-right tabular-nums">{fmt(totals.basic)}</td>
                <td className="border border-black px-1 py-1 text-right tabular-nums">{fmt(totals.benefits)}</td>
                <td className="border border-black px-1 py-1 text-right tabular-nums">{fmt(totals.grossPay)}</td>
                <td className="border border-black px-1 py-1 text-right tabular-nums">{fmt(totals.pension)}</td>
                <td className="border border-black px-1 py-1 text-right tabular-nums">{fmt(totals.taxablePay)}</td>
                <td className="border border-black px-1 py-1 text-right tabular-nums">{fmt(totals.paye)}</td>
                <td className="border border-black px-1 py-1 text-right tabular-nums">{fmt(totals.personalRelief)}</td>
                <td className="border border-black px-1 py-1 text-right tabular-nums">{fmt(totals.insuranceRelief)}</td>
                <td className="border border-black px-1 py-1 text-right tabular-nums">{fmt(totals.payeNet)}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-6 grid grid-cols-2 gap-6 text-[10px]">
            <div>
              <p className="border-t border-black pt-1">Employer's Signature & Stamp</p>
            </div>
            <div>
              <p className="border-t border-black pt-1">Date</p>
            </div>
          </div>
          <p className="text-[9px] text-center mt-4 text-gray-600">This P9A is computer-generated from payroll records. For KRA filing reference only.</p>
        </div>
      </div>

      <style>{`@media print { body * { visibility: hidden; } #p9-print, #p9-print * { visibility: visible; } #p9-print { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
    </div>
  );
}