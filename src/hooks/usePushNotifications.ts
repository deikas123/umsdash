import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const VAPID_PUBLIC_KEY = ''; // Set this when you have a real VAPID key

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    if (!supported || !user) return;

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    }).catch(() => setIsSubscribed(false));
  }, [user]);

  const subscribe = async () => {
    if (!isSupported || !user) return;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error('Permission denied');

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC_KEY || undefined,
      });

      const subJson = sub.toJSON();
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subJson.endpoint ?? '',
        auth: subJson.keys?.auth ?? '',
        p256dh: subJson.keys?.p256dh ?? '',
      });
      if (error) throw error;
      setIsSubscribed(true);
    } catch (e) {
      console.error('[push] subscribe failed:', e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();

      await supabase.from('push_subscriptions').delete().eq('user_id', user.id);
      setIsSubscribed(false);
    } catch (e) {
      console.error('[push] unsubscribe failed:', e);
    } finally {
      setLoading(false);
    }
  };

  return { isSubscribed, isSupported, subscribe, unsubscribe, loading };
}
