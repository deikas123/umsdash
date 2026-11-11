import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ItAppLayout from '@/it/components/ItAppLayout';

// Overview
import Overview from '@/it/pages/Overview';

// People
import EmployeeDirectory from '@/it/pages/people/EmployeeDirectory';
import Departments       from '@/it/pages/people/Departments';
import AccessGroups      from '@/it/pages/people/AccessGroups';
import AccountLifecycle  from '@/it/pages/people/AccountLifecycle';

// Devices
import AllDevices        from '@/it/pages/devices/AllDevices';
import DeviceDetails     from '@/it/pages/devices/DeviceDetails';
import DeviceAssignments from '@/it/pages/devices/DeviceAssignments';
import HardwareInventory from '@/it/pages/devices/HardwareInventory';
import DeviceCompliance  from '@/it/pages/devices/DeviceCompliance';

// Operations
import RemoteSupport     from '@/it/pages/ops/RemoteSupport';
import SoftwareInventory from '@/it/pages/ops/SoftwareInventory';
import UpdateManagement  from '@/it/pages/ops/UpdateManagement';
import Maintenance       from '@/it/pages/ops/Maintenance';

// Security
import SecurityOverview  from '@/it/pages/security/SecurityOverview';
import LoginActivity     from '@/it/pages/security/LoginActivity';
import MfaCompliance     from '@/it/pages/security/MfaCompliance';
import SecurityIncidents from '@/it/pages/security/SecurityIncidents';

// Support
import Helpdesk          from '@/it/pages/support/Helpdesk';
import AssignedTickets   from '@/it/pages/support/AssignedTickets';
import ServiceReports    from '@/it/pages/support/ServiceReports';

// Infrastructure
import VpsMonitoring     from '@/it/pages/infra/VpsMonitoring';
import CloudServices     from '@/it/pages/infra/CloudServices';
import DatabaseMonitoring from '@/it/pages/infra/DatabaseMonitoring';
import BackupMonitoring  from '@/it/pages/infra/BackupMonitoring';

// Reports
import MonthlyReport     from '@/it/pages/reports/MonthlyReport';
import AssetReport       from '@/it/pages/reports/AssetReport';
import ComplianceReport  from '@/it/pages/reports/ComplianceReport';

function ItNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-4xl font-bold mb-2">404</p>
      <p className="text-muted-foreground">This IT page doesn't exist.</p>
    </div>
  );
}

function ItContent() {
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
    <ItAppLayout>
      <Routes>
        {/* Overview */}
        <Route index element={<Overview />} />

        {/* People */}
        <Route path="people/directory"  element={<EmployeeDirectory />} />
        <Route path="people/departments" element={<Departments />} />
        <Route path="people/groups"     element={<AccessGroups />} />
        <Route path="people/lifecycle"  element={<AccountLifecycle />} />

        {/* Devices */}
        <Route path="devices"            element={<AllDevices />} />
        <Route path="devices/details"    element={<DeviceDetails />} />
        <Route path="devices/assignments" element={<DeviceAssignments />} />
        <Route path="devices/inventory"  element={<HardwareInventory />} />
        <Route path="devices/compliance" element={<DeviceCompliance />} />

        {/* Operations */}
        <Route path="ops/remote"     element={<RemoteSupport />} />
        <Route path="ops/software"   element={<SoftwareInventory />} />
        <Route path="ops/updates"    element={<UpdateManagement />} />
        <Route path="ops/maintenance" element={<Maintenance />} />

        {/* Security */}
        <Route path="security"           element={<SecurityOverview />} />
        <Route path="security/logins"    element={<LoginActivity />} />
        <Route path="security/mfa"       element={<MfaCompliance />} />
        <Route path="security/incidents" element={<SecurityIncidents />} />

        {/* Support */}
        <Route path="support"          element={<Helpdesk />} />
        <Route path="support/assigned" element={<AssignedTickets />} />
        <Route path="support/reports"  element={<ServiceReports />} />

        {/* Infrastructure */}
        <Route path="infra/vps"      element={<VpsMonitoring />} />
        <Route path="infra/cloud"    element={<CloudServices />} />
        <Route path="infra/database" element={<DatabaseMonitoring />} />
        <Route path="infra/backup"   element={<BackupMonitoring />} />

        {/* Reports */}
        <Route path="reports/monthly"    element={<MonthlyReport />} />
        <Route path="reports/assets"     element={<AssetReport />} />
        <Route path="reports/compliance" element={<ComplianceReport />} />

        <Route path="*" element={<ItNotFound />} />
      </Routes>
    </ItAppLayout>
  );
}

export default function ItRoot() {
  return <ItContent />;
}
