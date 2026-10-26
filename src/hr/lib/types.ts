export type UserRole = 'gm' | 'hr' | 'hod' | 'staff';

export type Department = {
  id: string;
  name: string;
  hodId?: string;
};

export type Employee = {
  id: string;
  staffNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  idNumber: string;
  kraPin: string;
  nssfNo: string;
  nhifNo: string;
  phone: string;
  department: string;
  designation: string;
  role: UserRole;
  basicPay: number;
  houseAllowance: number;
  transportAllowance: number;
  otherAllowance: number;
  bankName: string;
  bankBranch: string;
  accountNumber: string;
  bankCode: string;
  joinDate: string;
  status: 'active' | 'inactive' | 'terminated';
  annualLeaveDays: number;
  usedLeaveDays: number;
};

export type LeaveType = 'annual' | 'sick' | 'maternity' | 'paternity' | 'compassionate' | 'study';

export type LeaveStatus = 'pending_hod' | 'pending_hr' | 'pending_gm' | 'approved' | 'rejected';

export type LeaveRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
  hodApproval?: { approved: boolean; date: string; comment?: string };
  hrApproval?: { approved: boolean; date: string; comment?: string };
  gmApproval?: { approved: boolean; date: string; comment?: string };
};

export type PayrollRecord = {
  employeeId: string;
  month: string;
  basicPay: number;
  houseAllowance: number;
  transportAllowance: number;
  otherAllowance: number;
  overtime: number;
  bonus: number;
  leavePay: number;
  grossPay: number;
  pensionablePay: number;
  employerNssf: number;
  employeeNssf: number;
  taxablePay: number;
  taxPayable: number;
  insuranceRelief: number;
  personalRelief: number;
  paye: number;
  shif: number;
  housingLevy: number;
  loanDeduction: number;
  helbDeduction?: number;
  insuranceDeduction: number;
  otherDeduction: number;
  totalDeductions: number;
  netPay: number;
};

// Kenya tax computation helpers
export function computeKenyanPayroll(employee: Employee, extras: {
  overtime?: number; bonus?: number; leavePay?: number;
  loanDeduction?: number; helbDeduction?: number; insuranceDeduction?: number; otherDeduction?: number;
} = {}): PayrollRecord {
  const overtime = extras.overtime || 0;
  const bonus = extras.bonus || 0;
  const leavePay = extras.leavePay || 0;

  const grossPay = employee.basicPay + employee.houseAllowance + employee.transportAllowance +
    employee.otherAllowance + overtime + bonus + leavePay;

  const pensionablePay = employee.basicPay + employee.houseAllowance;

  // NSSF (Tier I & II) - 2024 rates
  const tierILimit = 7000;
  const tierIILimit = 36000;
  let employeeNssf = 0;
  if (pensionablePay <= tierILimit) {
    employeeNssf = pensionablePay * 0.06;
  } else if (pensionablePay <= tierIILimit) {
    employeeNssf = tierILimit * 0.06 + (pensionablePay - tierILimit) * 0.06;
  } else {
    employeeNssf = tierILimit * 0.06 + (tierIILimit - tierILimit) * 0.06;
  }
  employeeNssf = Math.min(employeeNssf, 2160);
  const employerNssf = employeeNssf;

  // Taxable pay
  const taxablePay = grossPay - employeeNssf;

  // PAYE - Kenya 2024 rates (monthly)
  let taxPayable = 0;
  const bands = [
    { limit: 24000, rate: 0.10 },
    { limit: 8333, rate: 0.25 },
    { limit: 467667, rate: 0.30 },
    { limit: 300000, rate: 0.325 },
    { limit: Infinity, rate: 0.35 },
  ];
  let remaining = taxablePay;
  for (const band of bands) {
    if (remaining <= 0) break;
    const taxableInBand = Math.min(remaining, band.limit);
    taxPayable += taxableInBand * band.rate;
    remaining -= taxableInBand;
  }

  // Personal relief
  const personalRelief = 2400;
  // Insurance relief (15% of SHIF, max 5000)
  const shif = grossPay * 0.0275;
  const insuranceRelief = Math.min(shif * 0.15, 5000);

  const paye = Math.max(0, taxPayable - personalRelief - insuranceRelief);

  // Housing Levy (AHL) - 1.5% of gross
  const housingLevy = grossPay * 0.015;

  const loanDeduction = extras.loanDeduction || 0;
  const helbDeduction = extras.helbDeduction || 0;
  const insuranceDeduction = extras.insuranceDeduction || 0;
  const otherDeduction = extras.otherDeduction || 0;

  const totalDeductions = paye + employeeNssf + shif + housingLevy +
    loanDeduction + insuranceDeduction + otherDeduction;

  const netPay = grossPay - totalDeductions;

  return {
    employeeId: employee.id,
    month: new Date().toISOString().slice(0, 7),
    basicPay: employee.basicPay,
    houseAllowance: employee.houseAllowance,
    transportAllowance: employee.transportAllowance,
    otherAllowance: employee.otherAllowance,
    overtime, bonus, leavePay,
    grossPay,
    pensionablePay,
    employerNssf,
    employeeNssf,
    taxablePay,
    taxPayable,
    insuranceRelief,
    personalRelief,
    paye: Math.round(paye * 100) / 100,
    shif: Math.round(shif * 100) / 100,
    housingLevy: Math.round(housingLevy * 100) / 100,
    loanDeduction,
    helbDeduction,
    insuranceDeduction,
    otherDeduction,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netPay: Math.round(netPay * 100) / 100,
  };
}
