import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  FileText,
  Search,
  Users,
  ClipboardList,
  Settings,
  FolderOpen,
  FolderLock,
  LogOut,
  Bell,
  ListTodo,
  Trash2,
  MessageSquare,
  Activity,
  BarChart3,
  CalendarClock,
  HardDrive,
  Flame,
  DatabaseBackup,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import umsLogo from '@/assets/ums-logo.png';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';

const staffNavItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Upload Document', url: '/upload', icon: Upload },
  { title: 'All Documents', url: '/documents', icon: FileText },
  { title: 'Doc Expiry', url: '/document-expiry', icon: CalendarClock },
  { title: 'Private Folders', url: '/folders', icon: FolderLock },
  { title: 'Tasks', url: '/tasks', icon: ListTodo, badge: 'tasks' },
  { title: 'Reminders', url: '/reminders', icon: Bell, badge: 'reminders' },
  { title: 'Team Chat', url: '/chat', icon: MessageSquare },
  { title: 'Search', url: '/search', icon: Search },
  { title: 'Customers', url: '/customers', icon: Users },
];

const SUPER_ADMIN_EMAIL = 'amsterntechhub@gmail.com';

const adminNavItems = [
  { title: 'User Management', url: '/users', icon: Users },
  { title: 'Reports', url: '/reports', icon: BarChart3 },
  { title: 'Activity Feed', url: '/activity', icon: Activity },
  { title: 'Notifications', url: '/notifications', icon: MessageSquare },
  { title: 'Deletion Requests', url: '/deletion-requests', icon: Trash2, badge: 'deletions' },
  { title: 'Categories', url: '/categories', icon: FolderOpen },
  { title: 'Audit Logs', url: '/audit-logs', icon: ClipboardList },
  { title: 'Storage Analytics', url: '/storage-analytics', icon: HardDrive },
  { title: 'Activity Heatmap', url: '/activity-heatmap', icon: Flame },
  { title: 'Database Export', url: '/database-export', icon: DatabaseBackup, superAdminOnly: true },
];

const customerNavItems = [
  { title: 'My Documents', url: '/my-documents', icon: FolderOpen },
  { title: 'Shared Folders', url: '/folders', icon: FolderLock },
  { title: 'Tasks', url: '/tasks', icon: ListTodo, badge: 'tasks' },
  { title: 'Reminders', url: '/reminders', icon: Bell, badge: 'reminders' },
  { title: 'Team Chat', url: '/chat', icon: MessageSquare },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { isAdmin, isStaff, isCustomer, profile, user, signOut } = useAuth();
  const { pendingTasksCount, pendingRemindersCount, pendingDeletionsCount } = useNotificationCounts();
  const isSuperAdmin = (user?.email ?? profile?.email ?? '').toLowerCase() === SUPER_ADMIN_EMAIL;
  const visibleAdminItems = adminNavItems.filter((i) => !i.superAdminOnly || isSuperAdmin);
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <img 
            src={umsLogo} 
            alt="UMS Kenya" 
            className="h-10 w-auto object-contain"
          />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground text-sm">
                UMS Kenya
              </span>
              <span className="text-xs text-sidebar-foreground/70">
                Document Portal
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Staff/Admin navigation */}
              {(isAdmin || isStaff) && staffNavItems.map((item) => {
                const badgeCount = item.badge === 'tasks' ? pendingTasksCount : item.badge === 'reminders' ? pendingRemindersCount : 0;
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="nav-item"
                      data-active={active}
                    >
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
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
              })}

              {/* Customer navigation */}
              {isCustomer && customerNavItems.map((item) => {
                const badgeCount = item.badge === 'tasks' ? pendingTasksCount : item.badge === 'reminders' ? pendingRemindersCount : 0;
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="nav-item"
                      data-active={active}
                    >
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
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
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Only Navigation */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
              {visibleAdminItems.map((item) => {
                const badgeCount = (item as any).badge === 'deletions' ? pendingDeletionsCount : 0;
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="nav-item"
                      data-active={active}
                    >
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
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
              })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Settings */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={isActive('/settings')}
                  tooltip="Settings"
                >
                  <NavLink
                    to="/settings"
                    className="flex items-center gap-3"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex flex-col gap-3">
          {!collapsed && profile && (
            <div className="flex items-center gap-2 text-sm min-w-0">
              <Avatar className="h-8 w-8 flex-shrink-0">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name} />}
                <AvatarFallback className="text-xs">
                  {profile.full_name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-sidebar-foreground truncate">
                  {profile.full_name}
                </span>
                <span className="text-xs text-sidebar-foreground/70 truncate">
                  {profile.email}
                </span>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            onClick={handleSignOut}
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
