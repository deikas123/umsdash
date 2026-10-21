// src/pages/AppLauncher.tsx
// Unified app launcher — shown at "/" after authentication.
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Badge } from '@/components/ui/badge';
import { FileText, Activity, LogOut } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function AppLauncher() {
  const { profile, role, isCustomer, signOut } = useAuth();
  const navigate = useNavigate();

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

  const apps = [
    {
      id: 'docs',
      title: 'Document Vault',
      description: 'Manage customer documents, folders, tasks, and reminders.',
      icon: FileText,
      href: '/docs',
      color: 'from-blue-600 to-blue-800',
      visible: true,
    },
    {
      id: 'ops',
      title: 'Operations Hub',
      description: 'Track vendor issues, incidents, passwords, and escalations.',
      icon: Activity,
      href: '/ops',
      color: 'from-emerald-600 to-emerald-800',
      visible: !isCustomer,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-bold text-lg leading-none">UMS Hub</h1>
            <p className="text-xs text-muted-foreground">Unified Management Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {role && <Badge variant="outline" className="capitalize">{role}</Badge>}
          {profile && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:block">{profile.full_name}</span>
              <Avatar className="h-8 w-8">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                <AvatarFallback className="text-xs">
                  {profile.full_name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 max-w-5xl">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold">Good {getGreeting()}, {profile?.full_name?.split(' ')[0] ?? 'there'}</h2>
          <p className="text-muted-foreground mt-1">Choose an application to get started.</p>
        </div>

        {/* App cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          {apps.filter(a => a.visible).map(app => (
            <Card
              key={app.id}
              className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 border-2 hover:border-primary/40"
              onClick={() => navigate(app.href)}
            >
              <CardHeader className="pb-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center mb-3`}>
                  <app.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl">{app.title}</CardTitle>
                <CardDescription>{app.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">Open {app.title} →</Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent activity */}
        {recentNotifs.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Recent Activity</h3>
            <div className="space-y-2">
              {recentNotifs.map((n: any) => (
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
        )}
      </main>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
