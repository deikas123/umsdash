import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/** All announcement IDs the current user has marked read. */
export function useMyReadAnnouncementIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my_announcement_reads', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_announcement_reads')
        .select('announcement_id')
        .eq('user_id', user!.id);
      if (error) throw error;
      return new Set((data || []).map(r => r.announcement_id));
    },
  });
}

/** HR/GM read counts per announcement (returns map of announcement_id -> count). */
export function useReadCountsByAnnouncement(ids: string[]) {
  return useQuery({
    queryKey: ['announcement_read_counts', ids.sort().join(',')],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_announcement_reads')
        .select('announcement_id')
        .in('announcement_id', ids);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const r of data || []) counts[r.announcement_id] = (counts[r.announcement_id] || 0) + 1;
      return counts;
    },
  });
}

export function useMarkAnnouncementRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (announcement_id: string) => {
      if (!user) return;
      // Idempotent insert; ignore unique-violation
      const { error } = await supabase
        .from('hr_announcement_reads')
        .insert({ announcement_id, user_id: user.id });
      if (error && !error.message.toLowerCase().includes('duplicate')) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my_announcement_reads'] });
      qc.invalidateQueries({ queryKey: ['announcement_read_counts'] });
    },
  });
}