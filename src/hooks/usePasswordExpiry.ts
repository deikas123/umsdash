import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PasswordExpiryInfo {
  isExpired: boolean;
  daysUntilExpiry: number | null;
  isWarning: boolean;
  mustReset: boolean;
  loading: boolean;
}

export function usePasswordExpiry(): PasswordExpiryInfo {
  const { user, profile } = useAuth();
  const [info, setInfo] = useState<PasswordExpiryInfo>({
    isExpired: false,
    daysUntilExpiry: null,
    isWarning: false,
    mustReset: false,
    loading: true,
  });

  useEffect(() => {
    if (!user || !profile) {
      setInfo(prev => ({ ...prev, loading: false }));
      return;
    }

    let cancelled = false;

    const checkExpiry = async () => {
      const { data: settingData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'password_expiry_days')
        .maybeSingle();

      const rawGlobal = settingData?.value;
      const globalDays = rawGlobal != null ? Number(rawGlobal) : 90;

      const { data } = await supabase
        .from('profiles')
        .select('password_changed_at, password_expiry_days, must_reset_password')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      const mustReset = !!(data as any)?.must_reset_password;

      if (!data || !data.password_changed_at) {
        setInfo({ isExpired: mustReset, daysUntilExpiry: null, isWarning: false, mustReset, loading: false });
        return;
      }

      const expiryDays = data.password_expiry_days ?? globalDays;
      const changedAt = new Date(data.password_changed_at);
      const expiryDate = new Date(changedAt.getTime() + expiryDays * 24 * 60 * 60 * 1000);
      const now = new Date();
      const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      setInfo({
        isExpired: daysLeft <= 0 || mustReset,
        daysUntilExpiry: daysLeft,
        isWarning: daysLeft > 0 && daysLeft <= 7,
        mustReset,
        loading: false,
      });
    };

    checkExpiry();

    // Recheck when tab regains focus (catches admin policy changes / day rollover)
    const onFocus = () => checkExpiry();
    window.addEventListener('focus', onFocus);
    const interval = window.setInterval(checkExpiry, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      window.clearInterval(interval);
    };
  }, [user, profile]);

  return info;
}
