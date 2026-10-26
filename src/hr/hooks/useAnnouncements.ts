import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/hr/integrations/supabase/types';

export type DbAnnouncement = Tables<'announcements'>;

export function useAnnouncements() {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_announcements')
        .select('*')
        .order('pinned', { ascending: false })
        .order('published_at', { ascending: false });
      if (error) throw error;
      return data as DbAnnouncement[];
    },
  });
}

export function useActiveAnnouncements(limit = 5) {
  return useQuery({
    queryKey: ['announcements_active', limit],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('hr_announcements')
        .select('*')
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .lte('published_at', nowIso)
        .order('pinned', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as DbAnnouncement[];
    },
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: TablesInsert<'announcements'>) => {
      const { data, error } = await supabase.from('hr_announcements').insert(a).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      qc.invalidateQueries({ queryKey: ['announcements_active'] });
    },
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hr_announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      qc.invalidateQueries({ queryKey: ['announcements_active'] });
    },
  });
}