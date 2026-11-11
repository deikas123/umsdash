import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, Shield, KeyRound, UserCog,
  Monitor, HardDrive, GitBranch, CheckSquare,
  Terminal, Package, RefreshCw, Wrench,
  Lock, Activity, ShieldAlert, ShieldCheck,
  Ticket, ClipboardList, BarChart3,
  Server, Cloud, Database, HardDriveDownload,
  FileBarChart, ChevronLeft, ChevronRight, LogOut, ArrowLeft,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import umsLogo from '@/assets/ums-logo.png';

const sections = [
  {
    label: 'OVERVIEW',
    items: [
      { path: '/it', icon: LayoutDashboard, label: 'Overview' },
    ],
  },
  {
    label: 'PEOPLE',
    items: [
      { path: '/it/people/directory',  icon: Users,     label: 'Employee Directory' },
      { path: '/it/people/departments',icon: Building2,  label: 'Departments' },
      { path: '/it/people/groups',     icon: KeyRound,   label: 'Access Groups' },
      { path: '/it/people/lifecycle',  icon: UserCog,    label: 'Account Lifecycle' },
    ],
  },
  {
    label: 'DEVICES',
    items: [
      { path: '/it/devices',            icon: Monitor,     label: 'All Devices' },
      { path: '/it/devices/details',    icon: HardDrive,   label: 'Device Details' },
      { path: '/it/devices/assignments',icon: GitBranch,   label: 'Device Assignments' },
      { path: '/it/devices/inventory',  icon: Package,     label: 'Hardware Inventory' },
      { path: '/it/devices/compliance', icon: CheckSquare, label: 'Device Compliance' },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { path: '/it/ops/remote',    icon: Terminal,    label: 'Remote Support' },
      { path: '/it/ops/software',  icon: Package,     label: 'Software Inventory' },
      { path: '/it/ops/updates',   icon: RefreshCw,   label: 'Update Management' },
      { path: '/it/ops/maintenance',icon: Wrench,     label: 'Maintenance' },
    ],
  },
  {
    label: 'SECURITY',
    items: [
      { path: '/it/security',          icon: ShieldCheck, label: 'Security Overview' },
      { path: '/it/security/logins',   icon: Activity,    label: 'Login Activity' },
      { path: '/it/security/mfa',      icon: Lock,        label: 'MFA Compliance' },
      { path: '/it/security/incidents',icon: ShieldAlert,  label: 'Security Incidents' },
    ],
  },
  {
    label: 'SUPPORT',
    items: [
      { path: '/it/support',           icon: Ticket,       label: 'IT Helpdesk' },
      { path: '/it/support/assigned',  icon: ClipboardList,label: 'Assigned Tickets' },
      { path: '/it/support/reports',   icon: BarChart3,    label: 'Service Reports' },
    ],
  },
  {
    label: 'INFRASTRUCTURE',
    items: [
      { path: '/it/infra/vps',      icon: Server,            label: 'VPS Monitoring' },
      { path: '/it/infra/cloud',    icon: Cloud,             label: 'Cloud Services' },
      { path: '/it/infra/database', icon: Database,          label: 'Database Monitoring' },
      { path: '/it/infra/backup',   icon: HardDriveDownload, label: 'Backup Monitoring' },
    ],
  },
  {
    label: 'REPORTS',
    items: [
      { path: '/it/reports/monthly',  icon: FileBarChart, label: 'Monthly IT Report' },
      { path: '/it/reports/assets',   icon: HardDrive,    label: 'Asset Report' },
      { path: '/it/reports/compliance',icon: Shield,       label: 'Compliance Report' },
    ],
  },
];

export default function ItSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 z-50 ${collapsed ? 'w-16' : 'w-64'}`}
    >
      {/* Logo + back */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <img src={umsLogo} alt="UMS" className="h-8 w-auto flex-shrink-0" />
        {!collapsed && (
          <>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-bold text-sidebar-primary-foreground">IT Command Centre</span>
              <span className="text-xs text-sidebar-muted">UMS Kenya</span>
            </div>
            <button
              onClick={() => navigate('/')}
              title="Back to UMS Hub"
              className="flex-shrink-0 flex items-center gap-1 text-[10px] text-sidebar-muted hover:text-sidebar-foreground transition-colors px-1.5 py-1 rounded hover:bg-sidebar-accent"
            >
              <ArrowLeft className="h-3 w-3" />
              Hub
            </button>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label} className="mb-1">
            {!collapsed && (
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold tracking-widest text-sidebar-muted uppercase">
                {section.label}
              </p>
            )}
            <ul className="space-y-0.5 px-2">
              {section.items.map((item) => {
                const isActive =
                  item.path === '/it'
                    ? location.pathname === '/it' || location.pathname === '/it/'
                    : location.pathname.startsWith(item.path);
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      }`}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User + sign out */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center text-xs font-bold text-sidebar-primary-foreground">
              {(user?.email || '??').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.user_metadata?.full_name || user?.email || 'User'}</p>
              <p className="text-xs text-sidebar-muted truncate">{user?.email}</p>
            </div>
            <button onClick={signOut} className="text-sidebar-muted hover:text-destructive transition-colors p-1" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
