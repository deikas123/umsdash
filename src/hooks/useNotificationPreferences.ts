import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NotificationPreferences {
  in_app_task_assigned: boolean;
  in_app_reminder_due: boolean;
  in_app_mention: boolean;
  in_app_achievement: boolean;
  sms_task_assigned: boolean;
  sms_reminder_due: boolean;
}

const DEFAULTS: NotificationPreferences = {
  in_app_task_assigned: true,
  in_app_reminder_due: true,
  in_app_mention: true,
  in_app_achievement: true,
  sms_task_assigned: false,
  sms_reminder_due: false,
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data = DEFAULTS, isLoading } = useQuery<NotificationPreferences>({
    queryKey: ['notification_prefs', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('user_id', user!.id)
        .single();
      return ((data as any)?.notification_preferences as NotificationPreferences) ?? DEFAULTS;
    },
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: async (prefs: Partial<NotificationPreferences>) => {
      const merged = { ...data, ...prefs };
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: merged as any })
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification_prefs', user?.id] }),
  });

  return { preferences: data, loading: isLoading, update: updateMutation };
}
