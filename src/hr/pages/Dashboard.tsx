import { Users, DollarSign, CalendarDays, TrendingUp, Clock, CheckCircle2, UserCheck, UserX, AlertTriangle, Briefcase, CreditCard, Calendar } from 'lucide-react';
import { useEmployees, useLeaveRequests, useDepartments } from '@/hr/hooks/useSupabaseData';
import { computeKenyanPayroll, Employee } from '@/hr/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import AnnouncementsWidget from '@/hr/components/AnnouncementsWidget';
import BirthdaysWidget from '@/hr/components/BirthdaysWidget';
import ExpiringDocsWidget from '@/hr/components/ExpiringDocsWidget';

const statusColors: Record<string, string> = {
  pending_hod: 'bg-warning/10 text-warning border-warning/20',
  pending_hr: 'bg-info/10 text-info border-info/20',
  pending_gm: 'bg-accent text-accent-foreground border-accent',
  approved: 'bg-success/10 text-success border-success/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusLabels: Record<string, string> = {
  pending_hod: 'Pending HOD', pending_hr: 'Pending HR', pending_gm: 'Pending GM',
  approved: 'Approved', rejected: 'Rejected',
};

const leaveTypeLabels: Record<string, string> = {
  annual: 'Annual', sick: 'Sick', maternity: 'Maternity',
  paternity: 'Paternity', compassionate: 'Compassionate', study: 'Study',
};

function useTodayAttendance() {
  const today = new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ['today_attendance', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_attendance')
        .select('status')
        .eq('date', today);
      if (error) throw error;
      const counts = { present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0, total: 0 };
      for (const r of data || []) {
        counts.total++;
        if (r.status in counts) counts[r.status as keyof typeof counts]++;
      }
      return counts;
    },
  });
}

function useMyEmployeeData() {
  return useQuery({
    queryKey: ['my_employee_dashboard'],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('employee_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .single();
      if (!profile?.employee_id) return null;
      const empId = profile.employee_id;

      const [empRes, leavesRes, loansRes, attRes, payRes] = await Promise.all([
        supabase.from('hr_employees').select('*, hr_departments(name)').eq('id', empId).single(),
        supabase.from('hr_leave_requests').select('*').eq('employee_id', empId).order('created_at', { ascending: false }).limit(5),
        supabase.from('hr_loans').select('*').eq('employee_id', empId).in('status', ['active', 'pending']),
        supabase.from('hr_attendance').select('status, date').eq('employee_id', empId).gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)).order('date', { ascending: false }),
        supabase.from('hr_payroll_records').select('month, net_pay').eq('employee_id', empId).order('month', { ascending: false }).limit(1),
      ]);

      return {
        employee: empRes.data,
        leaves: leavesRes.data || [],
        loans: loansRes.data || [],
        attendance: attRes.data || [],
        lastPayslip: payRes.data?.[0] || null,
      };
    },
  });
}

function StaffDashboard() {
  const { data, isLoading } = useMyEmployeeData();

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  if (!data?.employee) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-foreground">Profile Not Linked</h2>
        <p className="text-muted-foreground mt-1">Your account hasn't been linked to an employee record yet. Please contact HR.</p>
      </div>
    );
  }

  const emp = data.employee;
  const attCounts = { present: 0, late: 0, absent: 0, on_leave: 0 };
  for (const a of data.attendance) {
    if (a.status in attCounts) attCounts[a.status as keyof typeof attCounts]++;
  }
  const totalLoanBalance = data.loans.reduce((s, l) => s + Number(l.balance), 0);
  const pendingLeaves = data.leaves.filter(l => l.status.startsWith('pending')).length;
  const remainingLeave = (emp.annual_leave_days ?? 21) - (emp.used_leave_days ?? 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Welcome, {emp.first_name}!</h1>
        <p className="page-subtitle">{emp.designation} — {(emp as any).departments?.name || 'Unassigned'}</p>
      </div>

      {/* Personal stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Last Net Pay</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {data.lastPayslip ? `KES ${Number(data.lastPayslip.net_pay).toLocaleString()}` : '—'}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-success" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">{data.lastPayslip?.month || 'No payslip yet'}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Leave Balance</p>
              <p className="text-2xl font-bold text-foreground mt-1">{remainingLeave} days</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">{pendingLeaves} pending request{pendingLeaves !== 1 ? 's' : ''}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Loan Balance</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {totalLoanBalance > 0 ? `KES ${totalLoanBalance.toLocaleString()}` : 'None'}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-warning" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">{data.loans.length} active loan{data.loans.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold text-foreground mt-1">{attCounts.present + attCounts.late} days</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-accent flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-accent-foreground" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">{attCounts.late} late · {attCounts.absent} absent</p>
        </div>
      </div>

      {/* Recent leave requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border shadow-sm">
          <div className="px-5 py-4 border-b">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" /> My Leave Requests
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {data.leaves.length > 0 ? data.leaves.map(leave => (
              <div key={leave.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                <div>
                  <p className="text-sm font-medium text-foreground">{leaveTypeLabels[leave.leave_type] || leave.leave_type}</p>
                  <p className="text-xs text-muted-foreground">{leave.start_date} ? {leave.end_date} · {leave.days} days</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[leave.status]}`}>{statusLabels[leave.status]}</span>
              </div>
            )) : <p className="text-center text-muted-foreground py-4 text-sm">No leave requests</p>}
          </div>
        </div>

        <div className="bg-card rounded-lg border shadow-sm">
          <div className="px-5 py-4 border-b">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" /> Attendance This Month
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {[
              { label: 'Present', count: attCounts.present, color: 'text-success', bg: 'bg-success/10', icon: UserCheck },
              { label: 'Late', count: attCounts.late, color: 'text-warning', bg: 'bg-warning/10', icon: AlertTriangle },
              { label: 'Absent', count: attCounts.absent, color: 'text-destructive', bg: 'bg-destructive/10', icon: UserX },
              { label: 'On Leave', count: attCounts.on_leave, color: 'text-muted-foreground', bg: 'bg-muted/50', icon: CalendarDays },
            ].map(item => (
              <div key={item.label} className={`flex items-center justify-between p-3 rounded-md ${item.bg}`}>
                <div className="flex items-center gap-2">
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </div>
                <span className={`text-lg font-bold ${item.color}`}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <AnnouncementsWidget />
        <BirthdaysWidget />
      </div>
    </div>
  );
}

function usePayrollTrends() {
  return useQuery({
    queryKey: ['payroll_trends'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_payroll_records')
        .select('month, gross_pay, net_pay, total_deductions')
        .order('month', { ascending: true });
      if (error) throw error;
      const byMonth: Record<string, { month: string; grossPay: number; netPay: number; deductions: number; count: number }> = {};
      for (const r of data || []) {
        if (!byMonth[r.month]) byMonth[r.month] = { month: r.month, grossPay: 0, netPay: 0, deductions: 0, count: 0 };
        byMonth[r.month].grossPay += Number(r.gross_pay);
        byMonth[r.month].netPay += Number(r.net_pay);
        byMonth[r.month].deductions += Number(r.total_deductions);
        byMonth[r.month].count++;
      }
      return Object.values(byMonth).slice(-6);
    },
  });
}

function useAttendanceTrends() {
  return useQuery({
    queryKey: ['attendance_trends'],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const startDate = sixMonthsAgo.toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('hr_attendance')
        .select('date, status')
        .gte('date', startDate);
      if (error) throw error;
      const byMonth: Record<string, { month: string; present: number; absent: number; late: number; total: number }> = {};
      for (const r of data || []) {
        const m = r.date.slice(0, 7);
        if (!byMonth[m]) byMonth[m] = { month: m, present: 0, absent: 0, late: 0, total: 0 };
        byMonth[m].total++;
        if (r.status === 'present') byMonth[m].present++;
        else if (r.status === 'absent') byMonth[m].absent++;
        else if (r.status === 'late') byMonth[m].late++;
      }
      return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)).map(m => ({
        ...m,
        attendanceRate: m.total > 0 ? Math.round(((m.present + m.late) / m.total) * 100) : 0,
      }));
    },
  });
}

function AdminDashboard() {
  const { role: currentRole } = useAuth();
  const { data: employees = [], isLoading } = useEmployees();
  const { data: leaveRequests = [] } = useLeaveRequests();
  const { data: departments = [] } = useDepartments();
  const { data: attendance } = useTodayAttendance();
  const { data: payrollTrends = [] } = usePayrollTrends();
  const { data: attendanceTrends = [] } = useAttendanceTrends();

  const activeEmployees = employees.filter(e => e.status === 'active');

  const totalPayroll = activeEmployees.reduce((sum, emp) => {
    const payEmp: Employee = {
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
    return sum + computeKenyanPayroll(payEmp).netPay;
  }, 0);

  const pendingLeaves = leaveRequests.filter(l => l.status.startsWith('pending'));

  const deptCounts = activeEmployees.reduce((acc, emp) => {
    const name = emp.departments?.name || 'Unassigned';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome to UMS Kenya HR Management System</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Employees</p>
              <p className="text-3xl font-bold text-foreground mt-1">{activeEmployees.length}</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Active staff members</p>
        </div>

        {(currentRole === 'gm' || currentRole === 'hr_manager') && (
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Payroll</p>
                <p className="text-3xl font-bold text-foreground mt-1">KES {(totalPayroll / 1000).toFixed(0)}K</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Net pay this month</p>
          </div>
        )}

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Leaves</p>
              <p className="text-3xl font-bold text-foreground mt-1">{pendingLeaves.length}</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
              <CalendarDays className="h-6 w-6 text-warning" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Awaiting approval</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Departments</p>
              <p className="text-3xl font-bold text-foreground mt-1">{departments.length}</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-accent flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-accent-foreground" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Active departments</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-card rounded-lg border shadow-sm p-5 lg:col-span-1">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" /> Today's Attendance
          </h2>
          {attendance && attendance.total > 0 ? (
            <div className="space-y-3">
              {[
                { label: 'Present', count: attendance.present, color: 'text-success', bg: 'bg-success/10', icon: UserCheck },
                { label: 'Absent', count: attendance.absent, color: 'text-destructive', bg: 'bg-destructive/10', icon: UserX },
                { label: 'Late', count: attendance.late, color: 'text-warning', bg: 'bg-warning/10', icon: AlertTriangle },
                { label: 'On Leave', count: attendance.on_leave, color: 'text-muted-foreground', bg: 'bg-muted/50', icon: CalendarDays },
              ].map(item => (
                <div key={item.label} className={`flex items-center justify-between p-3 rounded-md ${item.bg}`}>
                  <div className="flex items-center gap-2">
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                  </div>
                  <span className={`text-lg font-bold ${item.color}`}>{item.count}</span>
                </div>
              ))}
              <div className="pt-2 border-t text-center">
                <span className="text-xs text-muted-foreground">
                  {attendance.total} of {activeEmployees.length} employees recorded
                </span>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-6 text-sm">No attendance recorded today</p>
          )}
        </div>

        <div className="bg-card rounded-lg border shadow-sm lg:col-span-2">
          <div className="px-5 py-4 border-b">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" /> Recent Leave Requests
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {leaveRequests.slice(0, 5).map(leave => {
              const empName = leave.employees ? `${leave.employees.first_name} ${leave.employees.last_name}` : '—';
              return (
                <div key={leave.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{empName}</p>
                    <p className="text-xs text-muted-foreground">{leaveTypeLabels[leave.leave_type] || leave.leave_type} · {leave.days} days</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[leave.status]}`}>{statusLabels[leave.status]}</span>
                </div>
              );
            })}
            {leaveRequests.length === 0 && <p className="text-center text-muted-foreground py-4">No leave requests yet</p>}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-lg border shadow-sm p-5">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" /> Payroll Trends
          </h2>
          {payrollTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={payrollTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(value: number) => [`KES ${value.toLocaleString()}`, '']} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="grossPay" name="Gross Pay" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                <Bar dataKey="netPay" name="Net Pay" fill="hsl(var(--chart-2, 142 71% 45%))" radius={[4,4,0,0]} />
                <Bar dataKey="deductions" name="Deductions" fill="hsl(var(--destructive))" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground py-12 text-sm">No payroll data yet</p>}
        </div>

        <div className="bg-card rounded-lg border shadow-sm p-5">
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" /> Attendance Rate Over Time
          </h2>
          {attendanceTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={attendanceTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(value: number, name: string) => [name === 'attendanceRate' ? `${value}%` : value, '']} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" dataKey="attendanceRate" name="Attendance %" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="present" name="Present" stroke="hsl(var(--chart-2, 142 71% 45%))" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="absent" name="Absent" stroke="hsl(var(--destructive))" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground py-12 text-sm">No attendance data yet</p>}
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <div className="px-5 py-4 border-b">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" /> Department Overview
          </h2>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(deptCounts).map(([dept, count]) => (
            <div key={dept} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
              <div>
                <p className="text-sm font-medium text-foreground">{dept}</p>
                <p className="text-xs text-muted-foreground">{count} employee{count > 1 ? 's' : ''}</p>
              </div>
              <div className="h-2 w-24 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${(count / activeEmployees.length) * 100}%` }} />
              </div>
            </div>
          ))}
          {Object.keys(deptCounts).length === 0 && <p className="text-center text-muted-foreground py-4 col-span-full">No departments yet</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <AnnouncementsWidget />
        <BirthdaysWidget />
        <ExpiringDocsWidget />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { role: currentRole } = useAuth();

  if (currentRole === 'staff') {
    return <StaffDashboard />;
  }

  return <AdminDashboard />;
}



