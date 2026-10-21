import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Upload, FileText, Search, Users, ClipboardList, Settings,
  FolderOpen, FolderLock, LogOut, Bell, ListTodo, Trash2, MessageSquare,
  Activity, BarChart3, CalendarClock, HardDrive, Flame, DatabaseBackup,
  AlertTriangle, FileWarning, KeyRound, Siren, Home, Trophy, ChevronDown,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import umsLogo from '@/assets/ums-logo.png';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';

const SUPER_ADMIN_EMAIL = 'amsterntechhub@gmail.com';

// Document Vault — staff/admin items
const docNavItems = [
  { title: 'Dashboard', url: '/docs', icon: LayoutDashboard },
  { title: 'Upload Document', url: '/docs/upload', icon: Upload },
  { title: 'All Documents', url: '/docs/documents', icon: FileText },
  { title: 'Doc Expiry', url: '/docs/document-expiry', icon: CalendarClock },
  { title: 'Private Folders', url: '/docs/folders', icon: FolderLock },
  { title: 'Tasks', url: '/docs/tasks', icon: ListTodo, badge: 'tasks' },
  { title: 'Reminders', url: '/docs/reminders', icon: Bell, badge: 'reminders' },
  { title: 'Team Chat', url: '/docs/chat', icon: MessageSquare },
  { title: 'My Progress', url: '/docs/gamification', icon: Trophy },
  { title: 'Search', url: '/docs/search', icon: Search },
  { title: 'Customers', url: '/docs/customers', icon: Users },
];

// Document Vault — customer items
const docCustomerItems = [
  { title: 'My Documents', url: '/docs/my-documents', icon: FolderOpen },
  { title: 'Shared Folders', url: '/docs/folders', icon: FolderLock },
  { title: 'Tasks', url: '/docs/tasks', icon: ListTodo, badge: 'tasks' },
  { title: 'Reminders', url: '/docs/reminders', icon: Bell, badge: 'reminders' },
  { title: 'Team Chat', url: '/docs/chat', icon: MessageSquare },
  { title: 'My Progress', url: '/docs/gamification', icon: Trophy },
];

// Operations Hub nav items (admin/staff only)
const opsNavItems = [
  { title: 'Ops Dashboard', url: '/ops', icon: LayoutDashboard },
  { title: 'Vendor Issues', url: '/ops/vendor-issues', icon: AlertTriangle },
  { title: 'Vendor Uptime', url: '/ops/vendor-uptime', icon: Activity },
  { title: 'Incidents', url: '/ops/incidents', icon: FileWarning },
  { title: 'Passwords', url: '/ops/passwords', icon: KeyRound },
  { title: 'Documents', url: '/ops/documents', icon: FolderOpen },
  { title: 'Analytics', url: '/ops/analytics', icon: BarChart3 },
  { title: 'SMS Logs', url: '/ops/sms-logs', icon: MessageSquare },
  { title: 'Escalations', url: '/ops/escalations', icon: Siren },
  { title: 'Users', url: '/ops/users', icon: Users },
];

// Administration — admin-only doc items
const adminDocItems = [
  { title: 'User Management', url: '/docs/users', icon: Users },
  { title: 'Reports', url: '/docs/reports', icon: BarChart3 },
  { title: 'Activity Feed', url: '/docs/activity', icon: Activity },
  { title: 'Notifications', url: '/docs/notifications', icon: MessageSquare },
  { title: 'Deletion Requests', url: '/docs/deletion-requests', icon: Trash2, badge: 'deletions' },
  { title: 'Categories', url: '/docs/categories', icon: FolderOpen },
  { title: 'Audit Logs', url: '/docs/audit-logs', icon: ClipboardList },
  { title: 'Storage Analytics', url: '/docs/storage-analytics', icon: HardDrive },
  { title: 'Activity Heatmap', url: '/docs/activity-heatmap', icon: Flame },
  { title: 'Database Export', url: '/docs/database-export', icon: DatabaseBackup, superAdminOnly: true },
];

function NavItem({
  item,
  badgeCount = 0,
  isActive,
}: {
  item: { title: string; url: string; icon: React.ElementType };
  badgeCount?: number;
  isActive: boolean;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title} className="nav-item" data-active={isActive}>
        <NavLink to={item.url} className="flex items-center gap-3" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
          <item.icon className="h-4 w-4" />
          <span>{item.title}</span>
          {badgeCount > 0 && (
            <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] px-1.5 text-[10px] font-semibold">
              {badgeCount > 9 ? '9+' : badgeCount}
            </Badge>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { isAdmin, isStaff, isCustomer, profile, user, signOut } = useAuth();
  const { pendingTasksCount, pendingRemindersCount, pendingDeletionsCount } = useNotificationCounts();
  const isSuperAdmin = (user?.email ?? profile?.email ?? '').toLowerCase() === SUPER_ADMIN_EMAIL;
  const visibleAdminItems = adminDocItems.filter(i => !i.superAdminOnly || isSuperAdmin);
  const collapsed = state === 'collapsed';

  const [docsOpen, setDocsOpen] = useState<boolean>(() => {
    try { return localStorage.getItem('umshub_sidebar_docs_open') !== 'false'; } catch { return true; }
  });
  const [opsOpen, setOpsOpen] = useState<boolean>(() => {
    try { return localStorage.getItem('umshub_sidebar_ops_open') !== 'false'; } catch { return true; }
  });
  const [adminOpen, setAdminOpen] = useState<boolean>(() => {
    try { return localStorage.getItem('umshub_sidebar_admin_open') !== 'false'; } catch { return true; }
  });

  const handleDocsToggle = (open: boolean) => {
    setDocsOpen(open);
    try { localStorage.setItem('umshub_sidebar_docs_open', String(open)); } catch (_e) { /* storage unavailable */ }
  };
  const handleOpsToggle = (open: boolean) => {
    setOpsOpen(open);
    try { localStorage.setItem('umshub_sidebar_ops_open', String(open)); } catch (_e) { /* storage unavailable */ }
  };
  const handleAdminToggle = (open: boolean) => {
    setAdminOpen(open);
    try { localStorage.setItem('umshub_sidebar_admin_open', String(open)); } catch (_e) { /* storage unavailable */ }
  };

  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path + '/'));

  const getBadgeCount = (badge?: string) => {
    if (badge === 'tasks') return pendingTasksCount;
    if (badge === 'reminders') return pendingRemindersCount;
    if (badge === 'deletions') return pendingDeletionsCount;
    return 0;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <img src={umsLogo} alt="UMS Hub" className="h-10 w-auto object-contain" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground text-sm">UMS Hub</span>
              <span className="text-xs text-sidebar-foreground/70">Unified Platform</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Home link */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem item={{ title: 'Home', url: '/', icon: Home }} isActive={location.pathname === '/'} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Document Vault */}
        <Collapsible open={docsOpen} onOpenChange={handleDocsToggle}>
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                Document Vault
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${docsOpen ? '' : '-rotate-90'}`} />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {(isAdmin || isStaff) && docNavItems.map(item => (
                    <NavItem key={item.url} item={item} badgeCount={getBadgeCount((item as any).badge)} isActive={isActive(item.url)} />
                  ))}
                  {isCustomer && docCustomerItems.map(item => (
                    <NavItem key={item.url} item={item} badgeCount={getBadgeCount((item as any).badge)} isActive={isActive(item.url)} />
                  ))}
                  {/* Settings always visible */}
                  <NavItem item={{ title: 'Settings', url: '/docs/settings', icon: Settings }} isActive={isActive('/docs/settings')} />
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Operations Hub — staff/admin only */}
        {(isAdmin || isStaff) && (
          <Collapsible open={opsOpen} onOpenChange={handleOpsToggle}>
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between">
                  Operations Hub
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${opsOpen ? '' : '-rotate-90'}`} />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {opsNavItems.map(item => (
                      <NavItem key={item.url} item={item} isActive={isActive(item.url)} />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Administration — admin only */}
        {isAdmin && (
          <Collapsible open={adminOpen} onOpenChange={handleAdminToggle}>
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center justify-between">
                  Administration
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${adminOpen ? '' : '-rotate-90'}`} />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleAdminItems.map(item => (
                      <NavItem key={item.url} item={item} badgeCount={getBadgeCount((item as any).badge)} isActive={isActive(item.url)} />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex flex-col gap-3">
          {!collapsed && profile && (
            <div className="flex items-center gap-2 text-sm min-w-0">
              <Avatar className="h-8 w-8 flex-shrink-0">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name} />}
                <AvatarFallback className="text-xs">
                  {profile.full_name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-sidebar-foreground truncate">{profile.full_name}</span>
                <span className="text-xs text-sidebar-foreground/70 truncate">{profile.email}</span>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            onClick={signOut}
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
