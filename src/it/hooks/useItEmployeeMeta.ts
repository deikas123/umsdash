import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ItEmployeeMeta = {
  id: string;
  hr_employee_id: string;
  account_username: string;
  identity_provider: string;
  account_status: 'active' | 'suspended' | 'deactivated';
  mfa_enrolled: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function useItEmployeeMeta(hrEmployeeId?: string) {
  return useQuery({
    queryKey: ['it_employee_meta', hrEmployeeId],
    queryFn: async () => {
      let q = supabase.from('it_employee_meta').select('*');
      if (hrEmployeeId) q = q.eq('hr_employee_id', hrEmployeeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ItEmployeeMeta[];
    },
  });
}

export function useUpsertItEmployeeMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (meta: Omit<ItEmployeeMeta, 'id' | 'created_at' | 'updated_at'> & { hr_employee_id: string }) => {
      const { data, error } = await supabase
        .from('it_employee_meta')
        .upsert(meta, { onConflict: 'hr_employee_id' })
        .select()
        .single();
      if (error) throw error;
      return data as ItEmployeeMeta;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['it_employee_meta'] }),
  });
}
