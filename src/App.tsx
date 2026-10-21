import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PasswordExpiryGate } from "@/components/PasswordExpiryGate";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import { useNotifications } from "@/hooks/useNotifications";

// Pages
import Auth from "./pages/Auth";
import SetupAdmin from "./pages/SetupAdmin";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Documents from "./pages/Documents";
import MyDocuments from "./pages/MyDocuments";
import SearchPage from "./pages/Search";
import Customers from "./pages/Customers";
import Users from "./pages/Users";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Inactivity timeout wrapper
function InactivityWrapper({ children }: { children: React.ReactNode }) {
  useInactivityTimeout();
  useNotifications();
  return <PasswordExpiryGate>{children}</PasswordExpiryGate>;
}

// Route handler for authenticated users
function AuthenticatedRedirect() {
  const { user, role, loading } = useAuth();

  if (loading) return null;

  if (user) {
    if (role === 'customer') {
      return <Navigate to="/my-documents" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/auth" replace />;
}

// Auth page wrapper to redirect if already logged in
function AuthPageWrapper() {
  const { user, role, loading } = useAuth();

  if (loading) return null;

  if (user) {
    if (role === 'customer') {
      return <Navigate to="/my-documents" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Auth />;
}

const AppRoutes = () => (
  <InactivityWrapper>
    <Routes>
      {/* Public Routes */}
      <Route path="/auth" element={<AuthPageWrapper />} />
      <Route path="/setup" element={<SetupAdmin />} />

      {/* Root redirect */}
      <Route path="/" element={<AuthenticatedRedirect />} />

      {/* Staff/Admin Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/upload"
        element={
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <Upload />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <Documents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <SearchPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <Customers />
          </ProtectedRoute>
        }
      />

      {/* Folders - Admin/Staff can create, all can view shared */}
      <Route
        path="/folders"
        element={
          <ProtectedRoute>
            <Folders />
          </ProtectedRoute>
        }
      />

      {/* Reminders & Tasks - All authenticated users */}
      <Route
        path="/reminders"
        element={
          <ProtectedRoute>
            <Reminders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <Tasks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />

      {/* Admin Only Routes */}
      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users/:userId/activity"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <UserActivityLog />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AuditLogs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/categories"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Categories />
          </ProtectedRoute>
        }
      />
      <Route
        path="/deletion-requests"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DeletionRequests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <Notifications />
          </ProtectedRoute>
        }
        />
      <Route
        path="/in-app-notifications"
        element={
          <ProtectedRoute>
            <InAppNotifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ActivityFeed />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/document-expiry"
        element={
          <ProtectedRoute allowedRoles={['admin', 'staff']}>
            <DocumentExpiry />
          </ProtectedRoute>
        }
      />
      <Route
        path="/storage-analytics"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <StorageAnalytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/activity-heatmap"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ActivityHeatmap />
          </ProtectedRoute>
        }
      />
      <Route
        path="/database-export"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DatabaseExport />
          </ProtectedRoute>
        }
      />



      {/* Customer Routes */}
      <Route
        path="/my-documents"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <MyDocuments />
          </ProtectedRoute>
        }
      />

      {/* Shared Routes */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </InactivityWrapper>
);

const App = () => (
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
);

export default App;
