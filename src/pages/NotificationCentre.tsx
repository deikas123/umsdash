import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, CheckCheck, Trash2, ChevronLeft, ChevronRight, BellOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export default function NotificationCentre() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'all' | 'unread' | 'read'>('all');
  const [page, setPage] = useState(1);

  const { data: notifications = [], isLoading } = useQuery<NotificationRow[]>({
    queryKey: ['in_app_notifications_all'],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('in_app_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as NotificationRow[];
    },
    enabled: !!user,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filtered = notifications.filter((n) => {
    if (tab === 'unread') return !n.is_read;
    if (tab === 'read') return n.is_read;
    return true;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['in_app_notifications_all'] });
    qc.invalidateQueries({ queryKey: ['launcher-notifications'] });
  };

  const handleMarkRead = async (id: string) => {
    const { error } = await supabase.from('in_app_notifications').update({ is_read: true }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    invalidate();
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('in_app_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'All notifications marked as read' });
    invalidate();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('in_app_notifications').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    invalidate();
  };

  const onTabChange = (value: string) => {
    setTab(value as 'all' | 'unread' | 'read');
    setPage(1);
  };

  return (
    <AppLayout title="Notifications" description="All your notifications in one place">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {notifications.length} total · {unreadCount} unread
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="h-4 w-4 mr-1" /> Mark all as read
            </Button>
          )}
        </div>

        <Tabs value={tab} onValueChange={onTabChange} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all" className="gap-1 text-xs">
              All
              {notifications.length > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{notifications.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="unread" className="gap-1 text-xs">
              Unread
              {unreadCount > 0 && <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">{unreadCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="read" className="gap-1 text-xs">
              Read
            </TabsTrigger>
          </TabsList>

          {(['all', 'unread', 'read'] as const).map((t) => (
            <TabsContent key={t} value={t}>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 rounded-lg border bg-card animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={t === 'unread' ? Bell : BellOff}
                  title={t === 'unread' ? 'No unread notifications' : t === 'read' ? 'No read notifications' : 'No notifications yet'}
                  description={t === 'all' ? 'Notifications about documents, leave and tickets will appear here.' : undefined}
                />
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {pageItems.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          'flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors',
                          !n.is_read && 'border-primary/30 bg-primary/5',
                        )}
                      >
                        <div className="mt-1 flex-shrink-0">
                          {n.is_read ? (
                            <span className="block h-2 w-2 rounded-full bg-muted-foreground/30" />
                          ) : (
                            <span className="block h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                          <p
                            className="text-[10px] text-muted-foreground mt-1 cursor-help"
                            title={new Date(n.created_at).toLocaleString()}
                          >
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {!n.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleMarkRead(n.id)}
                              title="Mark as read"
                              aria-label="Mark as read"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(n.id)}
                            title="Delete"
                            aria-label="Delete notification"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {pageCount > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-muted-foreground">
                        Page {safePage} of {pageCount} · {filtered.length} notifications
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={safePage <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          <ChevronLeft className="h-4 w-4" /> Prev
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={safePage >= pageCount}
                          onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                        >
                          Next <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
