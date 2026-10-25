import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DensityToggle } from '@/components/DensityToggle';
import { KeyboardShortcutsDialog } from '@/components/KeyboardShortcutsDialog';
import { PasswordExpiryBanner } from '@/components/PasswordExpiryBanner';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { NotificationBell } from '@/components/NotificationBell';
import { CommandPaletteTrigger } from '@/components/CommandPalette';
import { AppBreadcrumb } from './Breadcrumb';
import { MobileNav } from './MobileNav';
import { QuickActions } from '@/components/QuickActions';
import { WhatsNew } from '@/components/WhatsNew';
import { TourController } from '@/components/onboarding/TourController';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export function AppLayout({ children, title, description }: AppLayoutProps) {
  const { role, profile } = useAuth();
  const location = useLocation();

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
      <TourController />
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          {/* Announcement Banner */}
          <AnnouncementBanner />
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
                <WhatsNew />
                <CommandPaletteTrigger />
                <NotificationBell />
                <KeyboardShortcutsDialog />
                <DensityToggle />
                <ThemeToggle />
                {role && (
                  <Badge variant={getRoleBadgeVariant()} className="capitalize text-xs">
                    {role}
                  </Badge>
                )}
                {profile && (
                  <div data-tour="user-avatar" className="flex items-center gap-2 min-w-0 tour-target">
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

          {/* Breadcrumb */}
          <AppBreadcrumb />

          {/* Password Expiry Banner */}
          <PasswordExpiryBanner />

          {/* Main Content with page transition */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto pb-14 md:pb-0"
            >
              {children}
            </motion.main>
          </AnimatePresence>
          <MobileNav />
          <QuickActions />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
