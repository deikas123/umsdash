import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface InAppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export function useInAppNotifications() {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  // Unique channel name per hook instance to avoid conflicts with StrictMode double-mount
  const channelId = useRef(`in-app-notifications-${Math.random().toString(36).slice(2)}`);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('in_app_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) {
      setNotifications(data as InAppNotification[]);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
    }
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase
      .from('in_app_notifications')
      .update({ is_read: true })
      .eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from('in_app_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (id: string) => {
    const notif = notifications.find(n => n.id === id);
    await supabase.from('in_app_notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notif && !notif.is_read) setUnreadCount(prev => Math.max(0, prev - 1));
  };

  useEffect(() => {
    fetchNotifications();

    if (!user) return;
    const channel = supabase
      .channel(channelId.current)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'in_app_notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchNotifications())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications]);

  return { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, refetch: fetchNotifications };
}
