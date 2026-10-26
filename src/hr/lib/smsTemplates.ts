// Centralized SMS message templates for UMS Kenya HR system
import { sendSmsNotification } from '@/hr/hooks/useSmsNotification';

const PREFIX = 'UMS Kenya:';

// ============ LEAVE ============
export function smsLeaveSubmitted(phone: string, empName: string, leaveType: string, startDate: string, endDate: string, days: number) {
  sendSmsNotification(phone, `${PREFIX} Dear ${empName}, your ${leaveType} leave request (${startDate} to ${endDate}, ${days} days) has been submitted and is pending HOD approval.`);
}

export function smsLeaveApproved(phone: string, empName: string, startDate: string, endDate: string, approverRole: string, nextStep: string) {
  sendSmsNotification(phone, `${PREFIX} Dear ${empName}, your leave (${startDate}-${endDate}) has been approved by ${approverRole}. ${nextStep}`);
}

export function smsLeaveRejected(phone: string, empName: string, startDate: string, endDate: string, rejectedBy: string) {
  sendSmsNotification(phone, `${PREFIX} Dear ${empName}, your leave (${startDate}-${endDate}) has been rejected by ${rejectedBy}. Contact HR for details.`);
}

export function smsLeaveApprovalNeeded(phone: string, approverName: string, empName: string, leaveType: string, days: number, startDate: string) {
  sendSmsNotification(phone, `${PREFIX} Dear ${approverName}, ${empName} has applied for ${days} days ${leaveType} leave starting ${startDate}. Please review and approve/reject in the HR system.`);
}

// ============ LOANS ============
export function smsLoanCreated(phone: string, empName: string, amount: string, loanType: string) {
  sendSmsNotification(phone, `${PREFIX} Dear ${empName}, a ${loanType} of ${amount} has been created for you and is pending approval.`);
}

export function smsLoanApproved(phone: string, empName: string, amount: string, monthlyDed: string) {
  sendSmsNotification(phone, `${PREFIX} Dear ${empName}, your loan of ${amount} has been approved. Monthly deduction: ${monthlyDed}. Contact HR for any queries.`);
}

export function smsLoanPayment(phone: string, empName: string, paymentAmount: string, balance: string) {
  sendSmsNotification(phone, `${PREFIX} Dear ${empName}, a payment of ${paymentAmount} has been recorded on your loan. Remaining balance: ${balance}.`);
}

export function smsLoanFullyPaid(phone: string, empName: string) {
  sendSmsNotification(phone, `${PREFIX} Dear ${empName}, congratulations! Your loan has been fully repaid.`);
}

// ============ PAYROLL ============
export function smsPayrollProcessed(phone: string, empName: string, month: string, netPay: string) {
  sendSmsNotification(phone, `${PREFIX} Dear ${empName}, your salary for ${month} has been processed. Net pay: ${netPay}. Check your portal for the full payslip.`);
}

// ============ ATTENDANCE ============
export function smsAttendanceMarkedAbsent(phone: string, empName: string, date: string) {
  sendSmsNotification(phone, `${PREFIX} Dear ${empName}, you have been marked absent on ${date}. If this is an error, please contact HR.`);
}

// ============ ACCOUNT ============
export function smsAccountCreated(phone: string, fullName: string, email: string, origin: string) {
  sendSmsNotification(phone, `${PREFIX} Dear ${fullName}, your HR system account has been created. Login at ${origin} with email: ${email} and your assigned password. Please change your password after first login.`);
}

export function smsPasswordReset(phone: string, fullName: string) {
  sendSmsNotification(phone, `${PREFIX} Dear ${fullName}, your password has been reset by admin. Please login with the new password and change it immediately.`);
}

// ============ DOCUMENTS ============
export function smsDocumentExpiring(phone: string, empName: string, docTitle: string, daysLeft: number) {
  sendSmsNotification(phone, `${PREFIX} Dear ${empName}, your document "${docTitle}" expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Please renew and re-upload via the HR portal.`);
}

export function smsDocumentExpiringHr(phone: string, hrName: string, empName: string, docTitle: string, daysLeft: number) {
  sendSmsNotification(phone, `${PREFIX} Dear ${hrName}, ${empName}'s "${docTitle}" expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Please follow up.`);
}

// ============ ANNOUNCEMENTS ============
export function smsAnnouncement(phone: string, empName: string, title: string) {
  sendSmsNotification(phone, `${PREFIX} Dear ${empName}, new announcement: "${title}". Login to the HR portal to read more.`);
}

// ============ BIRTHDAYS ============
export function smsBirthday(phone: string, empName: string) {
  sendSmsNotification(phone, `${PREFIX} Happy Birthday ${empName}! 🎉 Wishing you a wonderful year ahead from the entire UMS Kenya team.`);
}

// ============ OVERTIME ============
export function smsOvertimeSubmitted(phone: string, empName: string, hours: number, workDate: string) {
  sendSmsNotification(phone, `${PREFIX} Dear ${empName}, your overtime request (${hours}h on ${workDate}) has been submitted and is pending approval.`);
}

export function smsOvertimeDecision(phone: string, empName: string, hours: number, workDate: string, approved: boolean) {
  sendSmsNotification(phone, `${PREFIX} Dear ${empName}, your overtime request (${hours}h on ${workDate}) has been ${approved ? 'APPROVED and will reflect in payroll' : 'REJECTED'}.`);
}

// ============ PULSE SURVEY ============
export function smsPulseReminder(phone: string, empName: string, surveyTitle: string) {
  sendSmsNotification(phone, `${PREFIX} Hi ${empName}, please take 2 minutes to complete the pulse survey "${surveyTitle}" on the HR portal. Your responses are anonymous.`);
}
