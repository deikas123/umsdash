import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/hr/integrations/supabase/types';

export type DbHoliday = Tables<'public_holidays'>;

export function useHolidays() {
  return useQuery({
    queryKey: ['public_holidays'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_public_holidays').select('*').order('date');
      if (error) throw error;
      return data as DbHoliday[];
    },
  });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (h: TablesInsert<'public_holidays'>) => {
      const { data, error } = await supabase.from('hr_public_holidays').insert(h).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['public_holidays'] }),
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hr_public_holidays').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['public_holidays'] }),
  });
}