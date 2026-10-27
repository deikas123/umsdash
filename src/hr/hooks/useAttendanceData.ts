import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type DbAttendance = {
  id: string;
  employee_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employees?: { first_name: string; last_name: string; staff_number: string } | null;
};

export function useAttendance(date?: string) {
  return useQuery({
    queryKey: ['attendance', date],
    queryFn: async () => {
      let query = supabase
        .from('hr_attendance' as any)
        .select('*, hr_employees(first_name, last_name, staff_number)')
        .order('created_at', { ascending: false });
      if (date) query = query.eq('date', date);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as DbAttendance[];
    },
  });
}

export function useCreateAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: {
      employee_id: string; date: string; clock_in: string | null;
      clock_out: string | null; status: string; notes: string;
    }) => {
      const { data, error } = await supabase.from('hr_attendance' as any).insert(record).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  });
}

export function useUpdateAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; clock_in?: string | null; clock_out?: string | null; status?: string; notes?: string }) => {
      const { data, error } = await supabase.from('hr_attendance' as any).update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  });
}

