import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/hr/integrations/supabase/types';

// ============ DEPARTMENTS ============
export type DbDepartment = Tables<'departments'>;

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_departments').select('*').order('name');
      if (error) throw error;
      return data as DbDepartment[];
    },
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dept: TablesInsert<'departments'>) => {
      const { data, error } = await supabase.from('hr_departments').insert(dept).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'departments'> & { id: string }) => {
      const { data, error } = await supabase.from('hr_departments').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['departments'] }),
  });
}

// ============ EMPLOYEES ============
export type DbEmployee = Tables<'employees'> & { departments?: { name: string } | null };

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_employees')
        .select('*, departments(name)')
        .order('staff_number');
      if (error) throw error;
      return data as DbEmployee[];
    },
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (emp: TablesInsert<'employees'>) => {
      const { data, error } = await supabase.from('hr_employees').insert(emp).select('*, departments(name)').single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'employees'> & { id: string }) => {
      const { data, error } = await supabase.from('hr_employees').update(updates).eq('id', id).select('*, departments(name)').single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hr_employees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

// ============ LEAVE REQUESTS ============
export type DbLeaveRequest = Tables<'leave_requests'> & {
  employees?: { first_name: string; last_name: string; departments: { name: string } | null } | null;
};

export function useLeaveRequests() {
  return useQuery({
    queryKey: ['leave_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_leave_requests')
        .select('*, employees(first_name, last_name, departments(name))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbLeaveRequest[];
    },
  });
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: TablesInsert<'leave_requests'>) => {
      const { data, error } = await supabase.from('hr_leave_requests').insert(req).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave_requests'] }),
  });
}

export function useUpdateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'leave_requests'> & { id: string }) => {
      const { data, error } = await supabase.from('hr_leave_requests').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave_requests'] }),
  });
}

// ============ PAYROLL ============
export type DbPayrollRecord = Tables<'payroll_records'> & {
  employees?: { first_name: string; last_name: string; staff_number: string } | null;
};

export function usePayrollRecords(month?: string) {
  return useQuery({
    queryKey: ['payroll_records', month],
    queryFn: async () => {
      let query = supabase
        .from('hr_payroll_records')
        .select('*, employees(first_name, last_name, staff_number)')
        .order('created_at', { ascending: false });
      if (month) query = query.eq('month', month);
      const { data, error } = await query;
      if (error) throw error;
      return data as DbPayrollRecord[];
    },
  });
}

export function useSavedPayrollMonths() {
  return useQuery({
    queryKey: ['payroll_months'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_payroll_records')
        .select('month')
        .order('month', { ascending: false });
      if (error) throw error;
      const unique = [...new Set((data || []).map(d => d.month))];
      return unique;
    },
  });
}

export function useSavePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (records: TablesInsert<'payroll_records'>[]) => {
      const { error } = await supabase.from('hr_payroll_records').insert(records);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll_records'] });
      qc.invalidateQueries({ queryKey: ['payroll_months'] });
    },
  });
}

// ============ LOANS ============
export type DbLoan = Tables<'loans'> & {
  employees?: { first_name: string; last_name: string; staff_number: string } | null;
};
export type DbLoanPayment = Tables<'loan_payments'>;

export function useLoans() {
  return useQuery({
    queryKey: ['loans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_loans')
        .select('*, employees(first_name, last_name, staff_number)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbLoan[];
    },
  });
}

export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (loan: TablesInsert<'loans'>) => {
      const { data, error } = await supabase.from('hr_loans').insert(loan).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans'] }),
  });
}

export function useUpdateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'loans'> & { id: string }) => {
      const { data, error } = await supabase.from('hr_loans').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loans'] }),
  });
}

export function useLoanPayments(loanId?: string) {
  return useQuery({
    queryKey: ['loan_payments', loanId],
    enabled: !!loanId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_loan_payments')
        .select('*')
        .eq('loan_id', loanId!)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data as DbLoanPayment[];
    },
  });
}

export function useCreateLoanPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payment: TablesInsert<'loan_payments'>) => {
      const { data, error } = await supabase.from('hr_loan_payments').insert(payment).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loan_payments'] });
      qc.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

// ============ PROFILES & ROLES ============
export type DbProfile = Tables<'profiles'>;
export type DbUserRole = Tables<'user_roles'>;

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name');
      if (error) throw error;
      return data as DbProfile[];
    },
  });
}

export function useUserRoles() {
  return useQuery({
    queryKey: ['user_roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      return data as DbUserRole[];
    },
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      // Upsert: delete existing then insert new
      await supabase.from('user_roles').delete().eq('user_id', userId);
      const { error } = await supabase.from('user_roles').insert({
        user_id: userId,
        role: role as any,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user_roles'] }),
  });
}

export function useLinkProfileToEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, employeeId }: { userId: string; employeeId: string | null }) => {
      const { error } = await supabase.from('profiles').update({ employee_id: employeeId }).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

export function useMyProfile() {
  return useQuery({
    queryKey: ['my_profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      if (error) throw error;
      return data as DbProfile;
    },
  });
}
