import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/hr/integrations/supabase/types';

export type DbEmployeeDocument = Tables<'employee_documents'> & {
  employees?: { first_name: string; last_name: string; staff_number: string; phone: string } | null;
};

export function useEmployeeDocuments(employeeId?: string) {
  return useQuery({
    queryKey: ['employee_documents', employeeId],
    queryFn: async () => {
      let q = supabase
        .from('hr_employee_documents')
        .select('*, hr_employees(first_name, last_name, staff_number, phone)')
        .order('created_at', { ascending: false });
      if (employeeId) q = q.eq('employee_id', employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return data as DbEmployeeDocument[];
    },
  });
}

export function useCreateEmployeeDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: TablesInsert<'employee_documents'>) => {
      const { data, error } = await supabase.from('hr_employee_documents').insert(doc).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee_documents'] }),
  });
}

export function useDeleteEmployeeDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath?: string }) => {
      const { error } = await supabase.from('hr_employee_documents').delete().eq('id', id);
      if (error) throw error;
      if (filePath) {
        await supabase.storage.from('employee-documents').remove([filePath]);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee_documents'] }),
  });
}

export function getDocumentStatus(expiry_date: string | null | undefined): 'no_expiry' | 'valid' | 'expiring' | 'expired' {
  if (!expiry_date) return 'no_expiry';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiry_date);
  const diffDays = Math.round((exp.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'expiring';
  return 'valid';
}

export function daysUntilExpiry(expiry_date: string | null | undefined): number | null {
  if (!expiry_date) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiry_date);
  return Math.round((exp.getTime() - today.getTime()) / 86400000);
}
