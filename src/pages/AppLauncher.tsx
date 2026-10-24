// src/pages/AppLauncher.tsx
// Unified app launcher — shown at "/" after authentication.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Badge } from '@/components/ui/badge';
import { FileText, Activity, LogOut, ShoppingBag, LayoutGrid, Layers, List } from 'lucide-react';
import { motion } from 'framer-motion';
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

export default function AppLauncher() {
  const { profile, role, isCustomer, signOut, user } = useAuth();
  const navigate = useNavigate();
  const { settings } = useOrgSettings();
  const logoSrc = settings.org_logo_url || umsLogo;

  // B2 — view mode toggle, persisted to localStorage.
  const [viewMode, setViewMode] = useState<'classic' | 'modern' | 'compact'>(
    () => (localStorage.getItem('umshub_launcher_view') as 'classic' | 'modern' | 'compact') || 'classic',
  );

  // B1 — live stats query.
  // NOTE: the spec named the streak table 'user_streaks', but this project's
  // typed Supabase client only knows the 'upload_streaks' table (column
  // 'current_streak'), so we query that to keep the build green.
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

  // Recent activity — fetched once (up to 10) and shared across all three views.
  const { data: recentNotifs = [] } = useQuery({
    queryKey: ['launcher-notifications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('in_app_notifications')
        .select('id, title, message, created_at, is_read')
        .order('created_at', { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const apps = [
    {
      id: 'docs',
      title: 'Document Vault',
      description: 'Manage customer documents, folders, tasks, and reminders.',
      icon: FileText,
      href: '/docs',
      color: 'from-blue-600 to-blue-800',
      visible: true,
      dataTour: 'docs-vault-card',
    },
    {
      id: 'ops',
      title: 'Operations Hub',
      description: 'Track vendor issues, incidents, passwords, and escalations.',
      icon: Activity,
      href: '/ops',
      color: 'from-emerald-600 to-emerald-800',
      visible: !isCustomer,
      dataTour: 'ops-hub-card',
    },
    {
      id: 'apps',
      title: 'App Store',
      description: 'Browse available and upcoming UMS Hub applications.',
      icon: ShoppingBag,
      href: '/apps',
      color: 'from-violet-600 to-violet-800',
      visible: !isCustomer,
      dataTour: 'app-store-card',
    },
  ];

  const visibleApps = apps.filter((a) => a.visible);

  // B4 — featured app = the most recently launched app (Docs by default).
  // Recency is tracked via timestamp companion keys written on launch.
  const featuredId = getFeaturedAppId();
  const featured = visibleApps.find((a) => a.id === featuredId) ?? visibleApps[0];
  const otherApps = featured ? visibleApps.filter((a) => a.id !== featured.id) : visibleApps;

  const initials = profile
    ? profile.full_name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()
    : '';
  const greetingEmoji = getGreetingEmoji();

  // Launching an app records a recency timestamp so the modern view can feature
  // the app the user used most recently.
  const launchApp = (appId: string, href: string) => {
    if (appId === 'docs' || appId === 'ops') {
      try { localStorage.setItem(`umshub_last_${appId}_page_ts`, String(Date.now())); } catch { /* storage unavailable */ }
    }
    navigate(href);
  };
  // Resume an app at the last visited page (falls back to the app root).
  const continueApp = (appId: string, rootHref: string) => {
    const last = getLastPage(appId);
    if (appId === 'docs' || appId === 'ops') {
      try { localStorage.setItem(`umshub_last_${appId}_page_ts`, String(Date.now())); } catch { /* storage unavailable */ }
    }
    navigate(last || rootHref);
  };

  const setMode = (mode: 'classic' | 'modern' | 'compact') => {
    setViewMode(mode);
    try { localStorage.setItem('umshub_launcher_view', mode); } catch { /* storage unavailable */ }
  };

  return (
    <div data-tour="app-launcher" className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <img src={logoSrc} alt="UMS Hub" className="h-8 w-auto object-contain" />
          <div>
            <h1 className="font-bold text-lg leading-none">UMS Hub</h1>
            <p className="text-xs text-muted-foreground">Unified Management Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* B2 — view mode toggle */}
          <div className="flex items-center gap-0.5 border rounded-md p-0.5">
            {(['classic', 'modern', 'compact'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setMode(mode)}
                className={`p-1.5 rounded transition-colors ${viewMode === mode ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                title={mode.charAt(0).toUpperCase() + mode.slice(1)}
              >
                {mode === 'classic' ? <LayoutGrid className="h-3.5 w-3.5" /> : mode === 'modern' ? <Layers className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
          <ThemeToggle />
          {role && <Badge variant="outline" className="capitalize">{role}</Badge>}
          {profile && (
            <div data-tour="user-avatar" className="flex items-center gap-2 tour-target">
              <span className="text-sm text-muted-foreground hidden sm:block">{profile.full_name}</span>
              <Avatar className="h-8 w-8">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 max-w-5xl">
        {/* B3 — Classic view (improved) */}
        {viewMode === 'classic' && (
          <>
            {/* Hero */}
            <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-background to-accent/10 border p-6 sm:p-8 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-semibold">
                  {greetingEmoji} Good {getGreeting()}, {profile?.full_name?.split(' ')[0] ?? 'there'}
                </h2>
                <p className="text-muted-foreground mt-1">Choose an application to get started.</p>
                <div className="flex flex-wrap gap-6 mt-4">
                  <div>
                    <span className="text-2xl font-bold">{s.docsCount.toLocaleString()}</span>
                    <span className="block text-xs text-muted-foreground">Documents</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold">{s.customersCount.toLocaleString()}</span>
                    <span className="block text-xs text-muted-foreground">Customers</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold">{s.streak} 🔥</span>
                    <span className="block text-xs text-muted-foreground">Day Streak</span>
                  </div>
                </div>
              </div>
              {profile && (
                <Avatar className="h-16 w-16">
                  {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
              )}
            </div>

            {/* App cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
              {visibleApps.map((app, i) => {
                const stat = appStatLabel(app, s);
                const last = getLastPage(app.id);
                return (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.06 }}
                  >
                    <Card
                      data-tour={app.dataTour}
                      className="cursor-pointer h-48 flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/20 border-2 hover:border-primary/40 tour-target"
                      onClick={() => launchApp(app.id, app.href)}
                    >
                      <CardHeader className="pb-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center mb-3`}>
                          <app.icon className="h-6 w-6 text-white" />
                        </div>
                        <CardTitle className="text-xl">{app.title}</CardTitle>
                        <CardDescription>{app.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="mt-auto">
                        {stat && <p className="text-xs text-muted-foreground mb-3">{stat}</p>}
                        <Button className="w-full" variant="outline">Open {app.title} →</Button>
                        {last && (
                          <button
                            type="button"
                            className="mt-2 text-xs text-primary hover:underline w-full text-left"
                            onClick={(e) => { e.stopPropagation(); continueApp(app.id, app.href); }}
                          >
                            Continue: {getPageLabel(last)} →
                          </button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            <RecentActivity items={recentNotifs} limit={5} />
          </>
        )}

        {/* B4 — Modern view */}
        {viewMode === 'modern' && featured && (
          <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-6 mb-10">
            {/* Featured app */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card
                data-tour={featured.dataTour}
                className={`relative overflow-hidden border-0 bg-gradient-to-br ${featured.color} text-white cursor-pointer tour-target`}
                onClick={() => continueApp(featured.id, featured.href)}
              >
                <CardContent className="p-8 flex flex-col h-full min-h-[320px]">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                    <featured.icon className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold">{featured.title}</h2>
                  <p className="text-white/80 mt-2 max-w-md">{featured.description}</p>
                  {appStatLabel(featured, s) && (
                    <p className="text-sm text-white/70 mt-3">{appStatLabel(featured, s)}</p>
                  )}
                  <div className="mt-auto pt-6">
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={(e) => { e.stopPropagation(); continueApp(featured.id, featured.href); }}
                    >
                      {getLastPage(featured.id)
                        ? `Continue ${getPageLabel(getLastPage(featured.id) as string)} →`
                        : `Open ${featured.title} →`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Right column: other apps + recent activity */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-3"
            >
              {otherApps.map((app) => (
                <Card
                  key={app.id}
                  data-tour={app.dataTour}
                  className="cursor-pointer tour-target hover:shadow-md transition-shadow"
                  onClick={() => launchApp(app.id, app.href)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${app.color} flex items-center justify-center shrink-0`}>
                      <app.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{app.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{app.description}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); launchApp(app.id, app.href); }}>Open →</Button>
                  </CardContent>
                </Card>
              ))}
              <div className="pt-2">
                <RecentActivity items={recentNotifs} limit={5} />
              </div>
            </motion.div>
          </div>
        )}

        {/* B5 — Compact view */}
        {viewMode === 'compact' && (
          <>
            <div className="mb-10">
              {visibleApps.map((app, i) => (
                <div
                  key={app.id}
                  data-tour={app.dataTour}
                  className={`flex items-center gap-4 py-4 tour-target ${i > 0 ? 'border-t border-border' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${app.color} flex items-center justify-center shrink-0`}>
                    <app.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{app.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{app.description}</p>
                  </div>
                  {appStatLabel(app, s) && (
                    <span className="text-xs text-muted-foreground hidden sm:block whitespace-nowrap">{appStatLabel(app, s)}</span>
                  )}
                  <Button variant="outline" size="sm" onClick={() => launchApp(app.id, app.href)}>Open →</Button>
                </div>
              ))}
            </div>
            <RecentActivity items={recentNotifs} limit={10} />
          </>
        )}
      </main>
    </div>
  );
}

/** Shared recent-activity list, fed by the same query across all views. */
function RecentActivity({ items, limit }: { items: any[]; limit: number }) {
  const list = items.slice(0, limit);
  if (list.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recent Activity</h3>
      <div className="space-y-2">
        {list.map((n: any) => (
          <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg border ${!n.is_read ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{n.title}</p>
              {n.message && <p className="text-xs text-muted-foreground truncate">{n.message}</p>}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {new Date(n.created_at).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function getGreetingEmoji(): string {
  const h = new Date().getHours();
  if (h < 12) return '☀️';
  if (h < 17) return '🌤️';
  return '🌙';
}

// B6 — helper for last page labels.
function getPageLabel(path: string): string {
  const labels: Record<string, string> = {
    '/docs': 'Dashboard', '/docs/documents': 'Documents', '/docs/customers': 'Customers',
    '/docs/tasks': 'Tasks', '/docs/upload': 'Upload', '/docs/chat': 'Team Chat',
    '/docs/folders': 'Folders', '/docs/reminders': 'Reminders', '/docs/gamification': 'My Progress',
    '/ops': 'Ops Dashboard', '/ops/vendor-issues': 'Vendor Issues', '/ops/incidents': 'Incidents',
    '/ops/vendor-uptime': 'Vendor Uptime', '/ops/escalations': 'Escalations', '/ops/analytics': 'Analytics',
  };
  return labels[path] || path.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard';
}

/** Last visited page for an app, written by the sidebar. */
function getLastPage(appId: string): string | null {
  if (appId === 'docs') return localStorage.getItem('umshub_last_docs_page');
  if (appId === 'ops') return localStorage.getItem('umshub_last_ops_page');
  return null;
}

/** Most recently launched app (Docs by default). Recency uses companion
 * timestamp keys written when launching an app from this launcher. */
function getFeaturedAppId(): 'docs' | 'ops' {
  const docsTs = Number(localStorage.getItem('umshub_last_docs_page_ts') ?? 0);
  const opsTs = Number(localStorage.getItem('umshub_last_ops_page_ts') ?? 0);
  return opsTs > docsTs ? 'ops' : 'docs';
}

function appStatLabel(app: { id: string }, s: LauncherStats): string | null {
  if (app.id === 'docs') return `${s.docsCount.toLocaleString()} documents`;
  if (app.id === 'ops') return `${s.incidentsCount} open incidents`;
  return null;
}
