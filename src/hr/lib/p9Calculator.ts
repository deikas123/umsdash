import type { Tables } from '@/hr/integrations/supabase/types';

export type PayrollRow = Tables<'payroll_records'>;

export type P9MonthRow = {
  month: string;             // YYYY-MM
  monthLabel: string;        // e.g. "Jan"
  basic: number;
  benefits: number;          // allowances + bonus + leave + overtime
  grossPay: number;
  pension: number;           // employee NSSF
  taxablePay: number;
  paye: number;              // tax payable BEFORE relief
  personalRelief: number;
  insuranceRelief: number;
  payeNet: number;           // after relief
};

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Build a 12-row P9 view for an employee for the given year. Missing months are zero rows. */
export function buildP9Rows(records: PayrollRow[], year: number): P9MonthRow[] {
  const map: Record<string, PayrollRow> = {};
  for (const r of records) if (r.month?.startsWith(`${year}-`)) map[r.month] = r;
  return Array.from({ length: 12 }, (_, i) => {
    const m = `${year}-${String(i + 1).padStart(2, '0')}`;
    const r = map[m];
    if (!r) {
      return {
        month: m, monthLabel: MONTH_LABELS[i],
        basic: 0, benefits: 0, grossPay: 0, pension: 0,
        taxablePay: 0, paye: 0, personalRelief: 0, insuranceRelief: 0, payeNet: 0,
      };
    }
    const benefits = Number(r.house_allowance) + Number(r.transport_allowance) + Number(r.other_allowance) + Number(r.overtime) + Number(r.bonus) + Number(r.leave_pay);
    return {
      month: m, monthLabel: MONTH_LABELS[i],
      basic: Number(r.basic_pay),
      benefits,
      grossPay: Number(r.gross_pay),
      pension: Number(r.employee_nssf),
      taxablePay: Number(r.taxable_pay),
      paye: Number(r.tax_payable),
      personalRelief: Number(r.personal_relief),
      insuranceRelief: Number(r.insurance_relief),
      payeNet: Number(r.paye),
    };
  });
}

export function p9Totals(rows: P9MonthRow[]) {
  return rows.reduce(
    (acc, r) => ({
      basic: acc.basic + r.basic,
      benefits: acc.benefits + r.benefits,
      grossPay: acc.grossPay + r.grossPay,
      pension: acc.pension + r.pension,
      taxablePay: acc.taxablePay + r.taxablePay,
      paye: acc.paye + r.paye,
      personalRelief: acc.personalRelief + r.personalRelief,
      insuranceRelief: acc.insuranceRelief + r.insuranceRelief,
      payeNet: acc.payeNet + r.payeNet,
    }),
    { basic: 0, benefits: 0, grossPay: 0, pension: 0, taxablePay: 0, paye: 0, personalRelief: 0, insuranceRelief: 0, payeNet: 0 },
  );
}