import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { KeyboardShortcutsDialog } from '@/components/KeyboardShortcutsDialog';
import { PasswordExpiryBanner } from '@/components/PasswordExpiryBanner';
import { NotificationBell } from '@/components/NotificationBell';
import { CommandPaletteTrigger } from '@/components/CommandPalette';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export function AppLayout({ children, title, description }: AppLayoutProps) {
  const { role, profile } = useAuth();

  const getRoleBadgeVariant = () => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'staff':
        return 'default';
      case 'customer':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-10 flex h-12 sm:h-14 items-center gap-2 sm:gap-4 border-b bg-background px-3 sm:px-4 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1 flex items-center justify-between min-w-0">
              <div className="min-w-0">
                {title && (
                  <h1 className="text-sm sm:text-lg font-semibold truncate">{title}</h1>
                )}
                {description && (
                  <p className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:block">{description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <CommandPaletteTrigger />
                <NotificationBell />
                <KeyboardShortcutsDialog />
                <ThemeToggle />
                {role && (
                  <Badge variant={getRoleBadgeVariant()} className="capitalize text-xs">
                    {role}
                  </Badge>
                )}
                {profile && (
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs sm:text-sm text-muted-foreground hidden md:block truncate max-w-[150px]">
                      {profile.full_name}
                    </span>
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name} />}
                      <AvatarFallback className="text-[10px]">
                        {profile.full_name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Password Expiry Banner */}
          <PasswordExpiryBanner />

          {/* Main Content */}
          <main className="flex-1 p-3 sm:p-4 lg:p-6 animate-fade-in overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
