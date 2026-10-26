import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/hr/integrations/supabase/types';

export type DbOvertimeRequest = Tables<'overtime_requests'> & {
  employees?: {
    first_name: string;
    last_name: string;
    staff_number: string;
    phone: string;
    department_id: string | null;
    departments?: { name: string } | null;
  } | null;
};

export function useOvertimeRequests(filters?: { month?: string; status?: string }) {
  return useQuery({
    queryKey: ['overtime_requests', filters],
    queryFn: async () => {
      let q = supabase
        .from('hr_overtime_requests')
        .select('*, employees(first_name, last_name, staff_number, phone, department_id, departments(name))')
        .order('work_date', { ascending: false });
      if (filters?.month) q = q.eq('payroll_month', filters.month);
      if (filters?.status) q = q.eq('status', filters.status as any);
      const { data, error } = await q;
      if (error) throw error;
      return data as DbOvertimeRequest[];
    },
  });
}

export function useCreateOvertimeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: Omit<TablesInsert<'overtime_requests'>, 'payroll_month'> & { payroll_month?: string }) => {
      // payroll_month is auto-set by trigger but supply a placeholder to satisfy NOT NULL
      const payload: TablesInsert<'overtime_requests'> = {
        ...req,
        payroll_month: req.payroll_month || req.work_date.slice(0, 7),
      };
      const { data, error } = await supabase.from('hr_overtime_requests').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['overtime_requests'] }),
  });
}

export function useDecideOvertimeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, decision, notes, approverId }: { id: string; decision: 'approved' | 'rejected'; notes?: string; approverId: string }) => {
      const { data, error } = await supabase
        .from('hr_overtime_requests')
        .update({
          status: decision,
          approver_id: approverId,
          approver_notes: notes || '',
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, employees(first_name, last_name, staff_number, phone, department_id)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['overtime_requests'] }),
  });
}

/** Aggregates approved overtime hours per employee for a payroll month, split by rate. */
export function useApprovedOvertimeForMonth(month: string) {
  return useQuery({
    queryKey: ['overtime_approved_month', month],
    enabled: !!month,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_overtime_requests')
        .select('employee_id, hours, rate_type')
        .eq('payroll_month', month)
        .eq('status', 'approved');
      if (error) throw error;
      const map: Record<string, { hours15x: number; hours2x: number }> = {};
      for (const row of data || []) {
        const m = (map[row.employee_id] ||= { hours15x: 0, hours2x: 0 });
        if (row.rate_type === '2x') m.hours2x += Number(row.hours);
        else m.hours15x += Number(row.hours);
      }
      return map;
    },
  });
}