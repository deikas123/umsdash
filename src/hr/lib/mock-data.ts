import { Department, Employee, LeaveRequest } from './types';

export const departments: Department[] = [
  { id: '1', name: 'Administration' },
  { id: '2', name: 'Finance' },
  { id: '3', name: 'Operations' },
  { id: '4', name: 'Sales & Marketing' },
  { id: '5', name: 'IT' },
  { id: '6', name: 'Human Resources' },
];

export const employees: Employee[] = [
  {
    id: '1', staffNumber: 'UMS001', firstName: 'James', lastName: 'Mwangi',
    email: 'james.mwangi@umskenya.com', idNumber: '12345678', kraPin: 'A001234567X',
    nssfNo: '1234567', nhifNo: '7654321', phone: '+254712345678',
    department: 'Administration', designation: 'General Manager', role: 'gm',
    basicPay: 250000, houseAllowance: 50000, transportAllowance: 20000, otherAllowance: 10000,
    bankName: 'KCB Bank', bankBranch: 'Nairobi', accountNumber: '1234567890', bankCode: '01',
    joinDate: '2018-01-15', status: 'active', annualLeaveDays: 30, usedLeaveDays: 5,
  },
  {
    id: '2', staffNumber: 'UMS002', firstName: 'Grace', lastName: 'Wanjiku',
    email: 'grace.wanjiku@umskenya.com', idNumber: '23456789', kraPin: 'A002345678X',
    nssfNo: '2345678', nhifNo: '8765432', phone: '+254723456789',
    department: 'Human Resources', designation: 'HR Manager', role: 'hr',
    basicPay: 150000, houseAllowance: 30000, transportAllowance: 15000, otherAllowance: 5000,
    bankName: 'Equity Bank', bankBranch: 'Westlands', accountNumber: '2345678901', bankCode: '68',
    joinDate: '2019-03-20', status: 'active', annualLeaveDays: 25, usedLeaveDays: 8,
  },
  {
    id: '3', staffNumber: 'UMS003', firstName: 'Peter', lastName: 'Ochieng',
    email: 'peter.ochieng@umskenya.com', idNumber: '34567890', kraPin: 'A003456789X',
    nssfNo: '3456789', nhifNo: '9876543', phone: '+254734567890',
    department: 'Operations', designation: 'Operations HOD', role: 'hod',
    basicPay: 120000, houseAllowance: 25000, transportAllowance: 12000, otherAllowance: 5000,
    bankName: 'Co-op Bank', bankBranch: 'Industrial Area', accountNumber: '3456789012', bankCode: '11',
    joinDate: '2020-06-10', status: 'active', annualLeaveDays: 25, usedLeaveDays: 3,
  },
  {
    id: '4', staffNumber: 'UMS004', firstName: 'Mary', lastName: 'Akinyi',
    email: 'mary.akinyi@umskenya.com', idNumber: '45678901', kraPin: 'A004567890X',
    nssfNo: '4567890', nhifNo: '0987654', phone: '+254745678901',
    department: 'Finance', designation: 'Finance HOD', role: 'hod',
    basicPay: 130000, houseAllowance: 28000, transportAllowance: 12000, otherAllowance: 5000,
    bankName: 'NCBA', bankBranch: 'CBD', accountNumber: '4567890123', bankCode: '07',
    joinDate: '2019-09-01', status: 'active', annualLeaveDays: 25, usedLeaveDays: 10,
  },
  {
    id: '5', staffNumber: 'UMS005', firstName: 'David', lastName: 'Kamau',
    email: 'david.kamau@umskenya.com', idNumber: '56789012', kraPin: 'A005678901X',
    nssfNo: '5678901', nhifNo: '1098765', phone: '+254756789012',
    department: 'Sales & Marketing', designation: 'Sales Executive', role: 'staff',
    basicPay: 60000, houseAllowance: 10000, transportAllowance: 5000, otherAllowance: 3000,
    bankName: 'Stanbic', bankBranch: 'Mombasa Rd', accountNumber: '5678901234', bankCode: '31',
    joinDate: '2021-02-14', status: 'active', annualLeaveDays: 21, usedLeaveDays: 7,
  },
  {
    id: '6', staffNumber: 'UMS006', firstName: 'Susan', lastName: 'Njeri',
    email: 'susan.njeri@umskenya.com', idNumber: '67890123', kraPin: 'A006789012X',
    nssfNo: '6789012', nhifNo: '2109876', phone: '+254767890123',
    department: 'Operations', designation: 'Operations Officer', role: 'staff',
    basicPay: 55000, houseAllowance: 8000, transportAllowance: 5000, otherAllowance: 2000,
    bankName: 'KCB Bank', bankBranch: 'Thika Rd', accountNumber: '6789012345', bankCode: '01',
    joinDate: '2022-07-01', status: 'active', annualLeaveDays: 21, usedLeaveDays: 2,
  },
  {
    id: '7', staffNumber: 'UMS007', firstName: 'John', lastName: 'Kiprop',
    email: 'john.kiprop@umskenya.com', idNumber: '78901234', kraPin: 'A007890123X',
    nssfNo: '7890123', nhifNo: '3210987', phone: '+254778901234',
    department: 'IT', designation: 'IT Support', role: 'staff',
    basicPay: 70000, houseAllowance: 12000, transportAllowance: 6000, otherAllowance: 3000,
    bankName: 'Equity Bank', bankBranch: 'Kiambu Rd', accountNumber: '7890123456', bankCode: '68',
    joinDate: '2021-11-15', status: 'active', annualLeaveDays: 21, usedLeaveDays: 4,
  },
  {
    id: '8', staffNumber: 'UMS008', firstName: 'Faith', lastName: 'Moraa',
    email: 'faith.moraa@umskenya.com', idNumber: '89012345', kraPin: 'A008901234X',
    nssfNo: '8901234', nhifNo: '4321098', phone: '+254789012345',
    department: 'Finance', designation: 'Accountant', role: 'staff',
    basicPay: 80000, houseAllowance: 15000, transportAllowance: 8000, otherAllowance: 4000,
    bankName: 'ABSA', bankBranch: 'Loita St', accountNumber: '8901234567', bankCode: '03',
    joinDate: '2020-03-01', status: 'active', annualLeaveDays: 21, usedLeaveDays: 6,
  },
];

export const leaveRequests: LeaveRequest[] = [
  {
    id: '1', employeeId: '5', employeeName: 'David Kamau', department: 'Sales & Marketing',
    leaveType: 'annual', startDate: '2026-04-10', endDate: '2026-04-17', days: 5,
    reason: 'Family vacation', status: 'pending_hod', createdAt: '2026-04-01',
  },
  {
    id: '2', employeeId: '6', employeeName: 'Susan Njeri', department: 'Operations',
    leaveType: 'sick', startDate: '2026-03-28', endDate: '2026-03-30', days: 2,
    reason: 'Medical appointment', status: 'pending_hr', createdAt: '2026-03-27',
    hodApproval: { approved: true, date: '2026-03-27', comment: 'Approved' },
  },
  {
    id: '3', employeeId: '7', employeeName: 'John Kiprop', department: 'IT',
    leaveType: 'annual', startDate: '2026-04-20', endDate: '2026-04-25', days: 4,
    reason: 'Personal matters', status: 'approved', createdAt: '2026-03-15',
    hodApproval: { approved: true, date: '2026-03-16' },
    hrApproval: { approved: true, date: '2026-03-17' },
    gmApproval: { approved: true, date: '2026-03-18' },
  },
];
