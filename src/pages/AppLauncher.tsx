// src/pages/AppLauncher.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Badge } from '@/components/ui/badge';
import {
  FileText, Activity, LogOut, ShoppingBag, Users2, Terminal,
  ArrowRight, Bell, ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { WeatherHero } from '@/components/WeatherHero';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgSettings } from '@/hooks/useOrgSettings';
import umsLogo from '@/assets/ums-logo.png';

type LauncherStats = {
  docsCount: number;
  customersCount: number;
  incidentsCount: number;
  streak: number;
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 160, damping: 18 } },
};

export default function AppLauncher() {
  const { profile, role, roles, isCustomer, signOut, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { settings } = useOrgSettings();
  const logoSrc = settings.org_logo_url || umsLogo;

  // Clear legacy view-mode key so stale 'modern'/'compact' doesn't confuse anything
  try { localStorage.removeItem('umshub_launcher_view'); } catch {}

  const [showWelcome, setShowWelcome] = useState(
    () => !sessionStorage.getItem('umshub_welcome_seen')
  );
  const handleWelcomeComplete = () => {
    sessionStorage.setItem('umshub_welcome_seen', '1');
    setShowWelcome(false);
  };

  const { data: stats } = useQuery<LauncherStats>({
    queryKey: ['launcher-stats'],
    queryFn: async () => {
      const [docs, customers, incidents, streak] = await Promise.all([
        supabase.from('documents').select('*', { count: 'exact', head: true }),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('upload_streaks').select('current_streak').eq('user_id', user?.id ?? '').maybeSingle(),
      ]);
      return {
        docsCount: docs.count ?? 0,
        customersCount: customers.count ?? 0,
        incidentsCount: incidents.count ?? 0,
        streak: streak.data?.current_streak ?? 0,
      };
    },
    enabled: !!user,
  });
  const s: LauncherStats = stats ?? { docsCount: 0, customersCount: 0, incidentsCount: 0, streak: 0 };

  const { data: recentNotifs = [] } = useQuery({
    queryKey: ['launcher-notifications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('in_app_notifications')
        .select('id, title, message, created_at, is_read')
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  // Only hide non-docs apps if we KNOW the user is a customer (never hide during loading)
  const hideNonDocs = !authLoading && isCustomer;

  const apps = [
    {
      id: 'docs',
      title: 'Document Vault',
      description: 'Customer documents, folders, tasks, reminders and document expiry tracking.',
      icon: FileText,
      href: '/docs',
      gradient: 'from-blue-500 via-blue-600 to-blue-700',
      accent: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      stat: `${s.docsCount.toLocaleString()} documents`,
      visible: true,
    },
    {
      id: 'ops',
      title: 'Operations Hub',
      description: 'Vendor issues, incidents, passwords, escalations and on-call scheduling.',
      icon: Activity,
      href: '/ops',
      gradient: 'from-emerald-500 via-emerald-600 to-teal-700',
      accent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      stat: `${s.incidentsCount} open incidents`,
      visible: !hideNonDocs,
    },
    {
      id: 'hr',
      title: 'HR Hub',
      description: 'Employees, payroll, leave, attendance, loans, announcements and surveys.',
      icon: Users2,
      href: '/hr',
      gradient: 'from-orange-500 via-orange-600 to-amber-700',
      accent: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
      stat: null,
      visible: !hideNonDocs,
    },
    {
      id: 'it',
      title: 'IT Command Centre',
      description: 'Endpoints, identity, security, helpdesk, infrastructure and compliance.',
      icon: Terminal,
      href: '/it',
      gradient: 'from-sky-500 via-cyan-600 to-cyan-700',
      accent: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
      stat: 'IT management',
      visible: !hideNonDocs,
    },
    {
      id: 'apps',
      title: 'App Store',
      description: 'Browse available and upcoming UMS Hub applications and integrations.',
      icon: ShoppingBag,
      href: '/apps',
      gradient: 'from-violet-500 via-purple-600 to-purple-700',
      accent: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
      stat: 'Coming soon',
      visible: !hideNonDocs,
    },
  ].filter(a => a.visible);

  const initials = profile
    ? profile.full_name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email ?? '??').slice(0, 2).toUpperCase();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return { text: 'Good morning', emoji: '☀️' };
    if (h < 17) return { text: 'Good afternoon', emoji: '🌤️' };
    return { text: 'Good evening', emoji: '🌙' };
  })();

  const firstName = profile?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';

  const allRoles = roles.length > 0 ? roles : (role ? [role] : []);

  const launchApp = (appId: string, href: string) => {
    try { localStorage.setItem(`umshub_last_${appId}_page_ts`, String(Date.now())); } catch {}
    navigate(href);
  };

  return (
    <div data-tour="app-launcher" className="min-h-screen bg-background">
      {showWelcome && <WelcomeScreen onComplete={handleWelcomeComplete} />}

      {/* ── Top navigation bar ── */}
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <img src={logoSrc} alt="UMS Hub" className="h-7 w-auto object-contain" />
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-none">UMS Hub</p>
              <p className="text-[10px] text-muted-foreground">Unified Management Platform</p>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Role badges */}
            <div className="hidden md:flex items-center gap-1">
              {allRoles.slice(0, 3).map(r => (
                <Badge key={r} variant="secondary" className="text-[10px] capitalize px-1.5 py-0.5">{r.replace('_', ' ')}</Badge>
              ))}
            </div>
            {/* Notifications dot */}
            {recentNotifs.some((n: any) => !n.is_read) && (
              <div className="relative">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
              </div>
            )}
            <ThemeToggle />
            {profile && (
              <div data-tour="user-avatar" className="flex items-center gap-2 pl-1 border-l">
                <span className="text-sm text-muted-foreground hidden sm:block truncate max-w-[140px]">{profile.full_name}</span>
                <Avatar className="h-7 w-7">
                  {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                  <AvatarFallback className="text-[10px] font-bold">{initials}</AvatarFallback>
                </Avatar>
              </div>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={signOut} title="Sign out">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Hero banner ── */}
        <WeatherHero
          greeting={greeting}
          firstName={firstName}
          stats={s}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── App cards grid ── */}
          <div className="lg:col-span-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Applications</h2>
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {apps.map((app) => {
                const last = (() => {
                  try { return localStorage.getItem(`umshub_last_${app.id}_page`); } catch { return null; }
                })();
                return (
                  <motion.div key={app.id} variants={item} data-tour={`${app.id}-card`}>
                    <button
                      onClick={() => launchApp(app.id, app.href)}
                      className="group w-full text-left rounded-xl border bg-card hover:bg-card/80 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 overflow-hidden"
                    >
                      {/* Coloured top strip */}
                      <div className={`h-1.5 w-full bg-gradient-to-r ${app.gradient}`} />

                      <div className="p-5">
                        {/* Icon + title row */}
                        <div className="flex items-start justify-between mb-3">
                          <div className={`p-2.5 rounded-xl ${app.accent}`}>
                            <app.icon className="h-5 w-5" />
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all mt-1" />
                        </div>

                        <h3 className="font-semibold text-foreground text-base mb-1">{app.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{app.description}</p>

                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                          <span className="text-xs text-muted-foreground">{app.stat}</span>
                          {last && (
                            <span className="text-xs text-primary font-medium">Resume →</span>
                          )}
                        </div>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>

          {/* ── Right panel: activity + quick links ── */}
          <div className="space-y-4">
            {/* Recent activity */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Activity</h2>
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                {recentNotifs.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No recent activity</div>
                ) : (
                  <div className="divide-y divide-border">
                    {recentNotifs.map((n: any) => (
                      <div key={n.id} className={`flex items-start gap-3 px-4 py-3 ${!n.is_read ? 'bg-primary/5' : ''}`}>
                        {!n.is_read && <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />}
                        {n.is_read && <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{n.title}</p>
                          {n.message && <p className="text-xs text-muted-foreground truncate">{n.message}</p>}
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                          {new Date(n.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick access */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Access</h2>
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden divide-y divide-border">
                {[
                  { label: 'IT Helpdesk', sub: 'Log a support ticket', href: '/it/support', color: 'text-sky-500' },
                  { label: 'HR Portal', sub: 'Leave, payslips, attendance', href: '/hr/profile', color: 'text-orange-500' },
                  { label: 'Document Upload', sub: 'Add new documents', href: '/docs/upload', color: 'text-blue-500' },
                  { label: 'Open Incidents', sub: 'View active incidents', href: '/ops/incidents', color: 'text-emerald-500' },
                ].filter(() => !isCustomer).map(link => (
                  <button
                    key={link.href}
                    onClick={() => navigate(link.href)}
                    className="group w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className={`h-2 w-2 rounded-full ${link.color.replace('text-', 'bg-')}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{link.label}</p>
                      <p className="text-xs text-muted-foreground">{link.sub}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Account info */}
            <div className="rounded-xl border bg-card shadow-sm p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                  <AvatarFallback className="text-sm font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{profile?.full_name ?? user?.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {allRoles.map(r => (
                  <Badge key={r} variant="outline" className="text-[10px] capitalize">{r.replace('_', ' ')}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function getPageLabel(path: string): string {
  const labels: Record<string, string> = {
    '/docs': 'Dashboard', '/docs/documents': 'Documents', '/docs/customers': 'Customers',
    '/docs/tasks': 'Tasks', '/docs/upload': 'Upload', '/docs/chat': 'Team Chat',
    '/ops': 'Ops Dashboard', '/ops/vendor-issues': 'Vendor Issues', '/ops/incidents': 'Incidents',
    '/hr': 'HR Dashboard', '/hr/employees': 'Employees', '/hr/leave': 'Leave',
    '/it': 'IT Overview', '/it/support': 'Helpdesk', '/it/devices': 'Devices',
  };
  return labels[path] || path.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard';
}
