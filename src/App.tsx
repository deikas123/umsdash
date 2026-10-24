import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PasswordExpiryGate } from "@/components/PasswordExpiryGate";
import { MaintenanceGate } from "@/components/MaintenanceGate";
import { AppLayout } from "@/components/layout/AppLayout";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import { useNotifications } from "@/hooks/useNotifications";
import { OnboardingTourProvider } from "@/hooks/useOnboardingTour";
import ChunkErrorBoundary from "@/components/operations/ChunkErrorBoundary";

// Launcher
import AppLauncher from "./pages/AppLauncher";

// Auth pages
import Auth from "./pages/Auth";
import SetupAdmin from "./pages/SetupAdmin";
import NotFound from "./pages/NotFound";

// Document Vault pages
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Documents from "./pages/Documents";
import MyDocuments from "./pages/MyDocuments";
import SearchPage from "./pages/Search";
import Customers from "./pages/Customers";
import Users from "./pages/Users";
import UserHub from "./pages/UserHub";
import AuditLogs from "./pages/AuditLogs";
import Categories from "./pages/Categories";
import Settings from "./pages/Settings";
import Folders from "./pages/Folders";
import Reminders from "./pages/Reminders";
import Tasks from "./pages/Tasks";
import DeletionRequests from "./pages/DeletionRequests";
import Notifications from "./pages/Notifications";
import InAppNotifications from "./pages/InAppNotifications";
import Chat from "./pages/Chat";
import ActivityFeed from "./pages/ActivityFeed";
import Reports from "./pages/Reports";
import DocumentExpiry from "./pages/DocumentExpiry";
import StorageAnalytics from "./pages/StorageAnalytics";
import ActivityHeatmap from "./pages/ActivityHeatmap";
import UserActivityLog from "./pages/UserActivityLog";
import DatabaseExport from "./pages/DatabaseExport";
import GamificationDashboard from "./pages/GamificationDashboard";
import Sessions from "./pages/Sessions";
import Webhooks from "./pages/Webhooks";
import ApiKeys from "./pages/ApiKeys";
import CustomerActivity from "./pages/CustomerActivity";
import ExportScheduler from "./pages/ExportScheduler";
import DocumentTemplates from "./pages/DocumentTemplates";
import AppStore from "./pages/AppStore";
import TourManager from "./pages/TourManager";
import ReportsHub from "./pages/ReportsHub";
import RoleManager from "./pages/RoleManager";

// Operations Hub pages
import OpDashboard from "./pages/operations/OpDashboard";
import OpVendorIssues from "./pages/operations/OpVendorIssues";
import OpVendorUptime from "./pages/operations/OpVendorUptime";
import OpIncidents from "./pages/operations/OpIncidents";
import OpPasswords from "./pages/operations/OpPasswords";
import OpDocuments from "./pages/operations/OpDocuments";
import OpAnalytics from "./pages/operations/OpAnalytics";
import OpSmsLogs from "./pages/operations/OpSmsLogs";
import OpEscalations from "./pages/operations/OpEscalations";
import OpUserManagement from "./pages/operations/OpUserManagement";
import OpForcePasswordChange from "./pages/operations/OpForcePasswordChange";
import OpVendorScorecard from "./pages/operations/OpVendorScorecard";
import OpOnCall from "./pages/operations/OpOnCall";

const queryClient = new QueryClient();

// Inactivity timeout wrapper
function InactivityWrapper({ children }: { children: React.ReactNode }) {
  useInactivityTimeout();
  useNotifications();
  return (
    <OnboardingTourProvider>
      <PasswordExpiryGate>{children}</PasswordExpiryGate>
    </OnboardingTourProvider>
  );
}

// Auth page wrapper to redirect if already logged in
function AuthPageWrapper() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Auth />;
}

// Plain shell for nested routes — docs pages render their own AppLayout
function DocShell() {
  return <Outlet />;
}

// Ops pages don't include AppLayout themselves, so the shell provides it
function OpsShell() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

const AppRoutes = () => (
  <InactivityWrapper>
    <MaintenanceGate>
    <Routes>
      {/* Public routes */}
      <Route path="/auth" element={<AuthPageWrapper />} />
      <Route path="/setup" element={<SetupAdmin />} />

      {/* Root — App Launcher (any authenticated role) */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLauncher />
          </ProtectedRoute>
        }
      />

      {/* App Store */}
      <Route
        path="/apps"
        element={
          <ProtectedRoute>
            <AppStore />
          </ProtectedRoute>
        }
      />

      {/* ── Document Vault (/docs/*) ── */}
      <Route
        path="/docs"
        element={
          <ProtectedRoute>
            <DocShell />
          </ProtectedRoute>
        }
      >
        {/* Staff/Admin */}
        <Route index element={<ProtectedRoute allowedRoles={['admin', 'staff']}><Dashboard /></ProtectedRoute>} />
        <Route path="upload" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><Upload /></ProtectedRoute>} />
        <Route path="documents" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><Documents /></ProtectedRoute>} />
        <Route path="document-expiry" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><DocumentExpiry /></ProtectedRoute>} />
        <Route path="search" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><SearchPage /></ProtectedRoute>} />
        <Route path="customers" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><Customers /></ProtectedRoute>} />
        <Route path="notifications" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><Notifications /></ProtectedRoute>} />

        {/* All authenticated */}
        <Route path="folders" element={<ProtectedRoute><Folders /></ProtectedRoute>} />
        <Route path="reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
        <Route path="tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
        <Route path="chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="in-app-notifications" element={<ProtectedRoute><InAppNotifications /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="gamification" element={<ProtectedRoute><GamificationDashboard /></ProtectedRoute>} />
        <Route path="sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />

        {/* Customer only */}
        <Route path="my-documents" element={<ProtectedRoute allowedRoles={['customer']}><MyDocuments /></ProtectedRoute>} />

        {/* Admin only */}
        <Route path="users" element={<ProtectedRoute allowedRoles={['admin']}><Users /></ProtectedRoute>} />
        <Route path="users/:userId/activity" element={<ProtectedRoute allowedRoles={['admin']}><UserActivityLog /></ProtectedRoute>} />
        <Route path="audit-logs" element={<ProtectedRoute allowedRoles={['admin']}><AuditLogs /></ProtectedRoute>} />
        <Route path="categories" element={<ProtectedRoute allowedRoles={['admin']}><Categories /></ProtectedRoute>} />
        <Route path="deletion-requests" element={<ProtectedRoute allowedRoles={['admin']}><DeletionRequests /></ProtectedRoute>} />
        <Route path="activity" element={<ProtectedRoute allowedRoles={['admin']}><ActivityFeed /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>} />
        <Route path="storage-analytics" element={<ProtectedRoute allowedRoles={['admin']}><StorageAnalytics /></ProtectedRoute>} />
        <Route path="activity-heatmap" element={<ProtectedRoute allowedRoles={['admin']}><ActivityHeatmap /></ProtectedRoute>} />
        <Route path="database-export" element={<ProtectedRoute allowedRoles={['admin']}><DatabaseExport /></ProtectedRoute>} />
        <Route path="tour-manager" element={<ProtectedRoute requireSuperAdmin><TourManager /></ProtectedRoute>} />
        <Route path="webhooks" element={<ProtectedRoute allowedRoles={['admin']}><Webhooks /></ProtectedRoute>} />
        <Route path="api-keys" element={<ProtectedRoute allowedRoles={['admin']}><ApiKeys /></ProtectedRoute>} />
        <Route path="customer-activity" element={<ProtectedRoute allowedRoles={['admin']}><CustomerActivity /></ProtectedRoute>} />
        <Route path="export-scheduler" element={<ProtectedRoute allowedRoles={['admin']}><ExportScheduler /></ProtectedRoute>} />
        <Route path="templates" element={<ProtectedRoute allowedRoles={['admin']}><DocumentTemplates /></ProtectedRoute>} />
      </Route>

      {/* ── Operations Hub (/ops/*) ── */}
      <Route
        path="/ops"
        element={
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <OpsShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<ProtectedRoute allowedRoles={['admin', 'staff']}><OpDashboard /></ProtectedRoute>} />
        <Route path="vendor-issues" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><OpVendorIssues /></ProtectedRoute>} />
        <Route path="vendor-uptime" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><OpVendorUptime /></ProtectedRoute>} />
        <Route path="incidents" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><OpIncidents /></ProtectedRoute>} />
        <Route path="passwords" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><OpPasswords /></ProtectedRoute>} />
        <Route path="documents" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><OpDocuments /></ProtectedRoute>} />
        <Route path="analytics" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><OpAnalytics /></ProtectedRoute>} />
        <Route path="escalations" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><OpEscalations /></ProtectedRoute>} />
        <Route path="force-password-change" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><OpForcePasswordChange /></ProtectedRoute>} />
        <Route path="scorecard" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><OpVendorScorecard /></ProtectedRoute>} />
        <Route path="oncall" element={<ProtectedRoute allowedRoles={['admin', 'staff']}><OpOnCall /></ProtectedRoute>} />
        <Route path="sms-logs" element={<ProtectedRoute allowedRoles={['admin']}><OpSmsLogs /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute allowedRoles={['admin']}><OpUserManagement /></ProtectedRoute>} />
      </Route>

      {/* ── User Hub (/admin/users) ── */}
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <UserHub />
          </ProtectedRoute>
        }
      />

      {/* ── Reports Hub (/admin/reports) ── */}
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ReportsHub />
          </ProtectedRoute>
        }
      />

      {/* ── Role Manager (/admin/roles) — super admin only ── */}
      <Route
        path="/admin/roles"
        element={
          <ProtectedRoute requireSuperAdmin>
            <RoleManager />
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </MaintenanceGate>
  </InactivityWrapper>
);

const App = () => (
  <ChunkErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ChunkErrorBoundary>
);

export default App;
