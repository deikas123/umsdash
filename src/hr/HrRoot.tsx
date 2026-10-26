import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import HrAppLayout from '@/hr/components/HrAppLayout';
import Dashboard from '@/hr/pages/Dashboard';
import Employees from '@/hr/pages/Employees';
import Payroll from '@/hr/pages/Payroll';
import LeaveManagement from '@/hr/pages/LeaveManagement';
import Departments from '@/hr/pages/Departments';
import Reports from '@/hr/pages/Reports';
import SettingsPage from '@/hr/pages/SettingsPage';
import Loans from '@/hr/pages/Loans';
import RoleManagement from '@/hr/pages/RoleManagement';
import Attendance from '@/hr/pages/Attendance';
import MyProfile from '@/hr/pages/MyProfile';
import StaffDirectory from '@/hr/pages/StaffDirectory';
import Overtime from '@/hr/pages/Overtime';
import Announcements from '@/hr/pages/Announcements';
import Checklists from '@/hr/pages/Checklists';
import Suggestions from '@/hr/pages/Suggestions';
import Surveys from '@/hr/pages/Surveys';
import Messages from '@/hr/pages/Messages';
import NotFound from '@/hr/pages/NotFound';

function HrRoleGuard({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { role } = useAuth();
  const currentRole = role === 'hr_manager' ? 'hr' : (role ?? 'staff');
  if (!roles.includes(currentRole)) return <Navigate to="/hr/profile" replace />;
  return <>{children}</>;
}

function HrProtectedContent() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" replace />;

  return (
    <HrAppLayout>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="employees" element={<HrRoleGuard roles={['gm','hr','hod']}><Employees /></HrRoleGuard>} />
        <Route path="payroll" element={<HrRoleGuard roles={['gm','hr']}><Payroll /></HrRoleGuard>} />
        <Route path="leave" element={<LeaveManagement />} />
        <Route path="departments" element={<HrRoleGuard roles={['gm','hr']}><Departments /></HrRoleGuard>} />
        <Route path="reports" element={<HrRoleGuard roles={['gm','hr']}><Reports /></HrRoleGuard>} />
        <Route path="settings" element={<HrRoleGuard roles={['gm','hr']}><SettingsPage /></HrRoleGuard>} />
        <Route path="loans" element={<Loans />} />
        <Route path="roles" element={<RoleManagement />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="overtime" element={<Overtime />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="checklists" element={<HrRoleGuard roles={['gm','hr','hod']}><Checklists /></HrRoleGuard>} />
        <Route path="suggestions" element={<Suggestions />} />
        <Route path="surveys" element={<Surveys />} />
        <Route path="messages" element={<Messages />} />
        <Route path="directory" element={<StaffDirectory />} />
        <Route path="profile" element={<MyProfile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HrAppLayout>
  );
}

export default function HrRoot() {
  return <HrProtectedContent />;
}
