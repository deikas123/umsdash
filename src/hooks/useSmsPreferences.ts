import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface SmsPreferences {
  id: string;
  user_id: string;
  sms_enabled: boolean;
  phone_number: string | null;
  notify_reminders: boolean;
  notify_tasks: boolean;
  notify_task_updates: boolean;
}

export function useSmsPreferences() {
  const [prefs, setPrefs] = useState<SmsPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchPrefs = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('sms_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setPrefs(data as SmsPreferences | null);
    } catch (e) {
      console.error('Error fetching SMS prefs:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  const savePrefs = async (updates: Partial<Omit<SmsPreferences, 'id' | 'user_id'>>) => {
    if (!user) return;
    try {
      if (prefs) {
        const { error } = await supabase
          .from('sms_preferences')
          .update(updates as any)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sms_preferences')
          .insert({ user_id: user.id, ...updates } as any);
        if (error) throw error;
      }
      toast({ title: 'SMS preferences saved' });
      fetchPrefs();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const sendSms = async (mobile: string, message: string, type: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: { mobile, message, type },
      });
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('Failed to send SMS:', e);
      return null;
    }
  };

  return { prefs, loading, savePrefs, sendSms, refetch: fetchPrefs };
}
