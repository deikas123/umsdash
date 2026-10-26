import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, DollarSign, CalendarDays, Building2,
  FileText, Settings, ChevronLeft, ChevronRight, LogOut, Wallet, Shield, ClipboardList, UserCircle, Contact, Clock, Megaphone, ListChecks, MessageSquare, ClipboardCheck, Lightbulb, ArrowLeft,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadMessageCount } from '@/hr/hooks/useMessaging';
import { useActiveSurveys, useMyParticipation } from '@/hr/hooks/useSurveys';
import umsLogo from '@/assets/ums-logo.png';

type HrRole = 'gm' | 'hr' | 'hod' | 'staff';

const navItems = [
  { path: '/hr', icon: LayoutDashboard, label: 'Dashboard', roles: ['gm', 'hr', 'hod', 'staff'] },
  { path: '/hr/employees', icon: Users, label: 'Employees', roles: ['gm', 'hr', 'hod'] },
  { path: '/hr/payroll', icon: DollarSign, label: 'Payroll', roles: ['gm', 'hr'] },
  { path: '/hr/leave', icon: CalendarDays, label: 'Leave', roles: ['gm', 'hr', 'hod', 'staff'] },
  { path: '/hr/loans', icon: Wallet, label: 'Loans', roles: ['gm', 'hr', 'hod', 'staff'] },
  { path: '/hr/attendance', icon: ClipboardList, label: 'Attendance', roles: ['gm', 'hr', 'hod', 'staff'] },
  { path: '/hr/overtime', icon: Clock, label: 'Overtime', roles: ['gm', 'hr', 'hod', 'staff'] },
  { path: '/hr/checklists', icon: ListChecks, label: 'Checklists', roles: ['gm', 'hr', 'hod'] },
  { path: '/hr/announcements', icon: Megaphone, label: 'Announcements', roles: ['gm', 'hr', 'hod', 'staff'] },
  { path: '/hr/messages', icon: MessageSquare, label: 'Messages', roles: ['gm', 'hr', 'hod', 'staff'] },
  { path: '/hr/surveys', icon: ClipboardCheck, label: 'Surveys', roles: ['gm', 'hr', 'hod', 'staff'] },
  { path: '/hr/suggestions', icon: Lightbulb, label: 'Suggestions', roles: ['gm', 'hr', 'hod', 'staff'] },
  { path: '/hr/departments', icon: Building2, label: 'Departments', roles: ['gm', 'hr'] },
  { path: '/hr/roles', icon: Shield, label: 'Roles', roles: ['gm', 'hr'] },
  { path: '/hr/reports', icon: FileText, label: 'Reports', roles: ['gm', 'hr'] },
  { path: '/hr/directory', icon: Contact, label: 'Directory', roles: ['gm', 'hr', 'hod', 'staff'] },
  { path: '/hr/settings', icon: Settings, label: 'Settings', roles: ['gm', 'hr'] },
  { path: '/hr/profile', icon: UserCircle, label: 'My Portal', roles: ['gm', 'hr', 'hod', 'staff'] },
];

const roleLabels: Record<HrRole, string> = {
  gm: 'General Manager',
  hr: 'HR Manager',
  hod: 'Head of Department',
  staff: 'Staff Member',
};

export default function HrSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { role, user, signOut } = useAuth();
  const navigate = useNavigate();
  const currentRole: HrRole = role === 'hr_manager' ? 'hr' : ((role as HrRole) ?? 'staff');
  const location = useLocation();
  const { data: unreadMessages = 0 } = useUnreadMessageCount();
  const { data: activeSurveys = [] } = useActiveSurveys();
  const { data: participated = new Set<string>() } = useMyParticipation();
  const pendingSurveys = activeSurveys.filter(s =>
    !participated.has(s.id) && ((s as any).reminder_channel === 'inapp' || (s as any).reminder_channel === 'both')
  ).length;

  const SUPER_ADMIN_EMAIL = 'amsterntechhub@gmail.com';
  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

  const visibleItems = navItems.filter(item =>
    isSuperAdmin || item.roles.includes(currentRole)
  );

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 z-50 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo + Back to UMS Hub */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <img src={umsLogo} alt="UMS Kenya" className="h-8 w-auto flex-shrink-0" />
        {!collapsed && (
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-bold text-sidebar-primary-foreground">UMS Kenya</span>
            <span className="text-xs text-sidebar-muted">HR System</span>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => navigate('/')}
            title="Back to UMS Hub"
            className="flex-shrink-0 flex items-center gap-1 text-[10px] text-sidebar-muted hover:text-sidebar-foreground transition-colors px-1.5 py-1 rounded hover:bg-sidebar-accent"
          >
            <ArrowLeft className="h-3 w-3" />
            Hub
          </button>
        )}
      </div>

      {/* Role Badge */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-sidebar-border">
          <span className="text-xs px-2 py-1 rounded-full bg-sidebar-primary/20 text-sidebar-primary">
            {isSuperAdmin ? 'Super Admin' : roleLabels[currentRole]}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {visibleItems.map(item => {
            const isActive = location.pathname === item.path || (item.path === '/hr' && location.pathname === '/hr/');
            const badgeCount =
              item.path === '/hr/messages' ? unreadMessages :
              item.path === '/hr/surveys' ? pendingSurveys : 0;
            const showBadge = badgeCount > 0;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <div className="relative shrink-0">
                    <item.icon className="h-5 w-5" />
                    {showBadge && collapsed && (
                      <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </span>
                    )}
                  </div>
                  {!collapsed && (
                    <span className="flex-1 flex items-center justify-between">
                      {item.label}
                      {showBadge && (
                        <span className="h-5 min-w-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                          {badgeCount > 9 ? '9+' : badgeCount}
                        </span>
                      )}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Current User & Logout */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center text-xs font-bold text-sidebar-primary-foreground">
              {(user?.email || '??').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-accent-foreground truncate">
                {user?.user_metadata?.full_name || user?.email || 'User'}
              </p>
              <p className="text-xs text-sidebar-muted truncate">{user?.email}</p>
            </div>
            <button
              onClick={signOut}
              className="text-sidebar-muted hover:text-destructive transition-colors p-1"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-110 transition-transform"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
