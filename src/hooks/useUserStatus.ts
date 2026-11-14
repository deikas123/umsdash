import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserStatusValue = 'in_office' | 'wfh' | 'in_meeting' | 'on_leave' | 'away';

export const STATUS_CONFIG: Record<UserStatusValue, { label: string; color: string; dot: string }> = {
  in_office:  { label: 'In Office',   color: 'text-green-600 dark:text-green-400',  dot: 'bg-green-500' },
  wfh:        { label: 'WFH',         color: 'text-blue-600 dark:text-blue-400',    dot: 'bg-blue-500'  },
  in_meeting: { label: 'In Meeting',  color: 'text-amber-600 dark:text-amber-400',  dot: 'bg-amber-500' },
  on_leave:   { label: 'On Leave',    color: 'text-orange-600 dark:text-orange-400',dot: 'bg-orange-500'},
  away:       { label: 'Away',        color: 'text-gray-500 dark:text-gray-400',    dot: 'bg-gray-400'  },
};

export function useMyStatus(userId?: string) {
  return useQuery({
    queryKey: ['user-status', userId],
    queryFn: async () => {
      const id = userId;
      if (!id) return null;
      const { data } = await supabase
        .from('user_status')
        .select('*')
        .eq('user_id', id)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });
}

export function useSetStatus() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ status, expires_at }: { status: UserStatusValue; expires_at?: string | null }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('user_status')
        .upsert(
          { user_id: user.id, status, expires_at: expires_at ?? null, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-status'] });
    },
  });
}
