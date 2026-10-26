import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/hr/integrations/supabase/types';

export type ChecklistItem = { label: string; required: boolean; assignee_role?: string };
export type ChecklistItemState = { label: string; done: boolean; done_by?: string | null; done_at?: string | null; notes?: string };

export type DbChecklistTemplate = Tables<'checklist_templates'>;
export type DbEmployeeChecklist = Tables<'employee_checklists'> & {
  employees?: { first_name: string; last_name: string; staff_number: string; departments?: { name: string } | null } | null;
  checklist_templates?: { name: string; items: any } | null;
};

export function useChecklistTemplates() {
  return useQuery({
    queryKey: ['checklist_templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_checklist_templates').select('*').order('type');
      if (error) throw error;
      return data as DbChecklistTemplate[];
    },
  });
}

export function useEmployeeChecklists() {
  return useQuery({
    queryKey: ['employee_checklists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_employee_checklists')
        .select('*, employees(first_name, last_name, staff_number, departments(name)), checklist_templates(name, items)')
        .order('started_at', { ascending: false });
      if (error) throw error;
      return data as DbEmployeeChecklist[];
    },
  });
}

export function useStartChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, type }: { employeeId: string; type: 'onboarding' | 'offboarding' }) => {
      // pick first template of that type
      const { data: tmpl, error: tErr } = await supabase
        .from('hr_checklist_templates').select('*').eq('type', type).limit(1).maybeSingle();
      if (tErr) throw tErr;
      if (!tmpl) throw new Error(`No ${type} template configured.`);
      const items = (tmpl.items as ChecklistItem[]) || [];
      const initial: ChecklistItemState[] = items.map(i => ({ label: i.label, done: false }));
      const { data, error } = await supabase
        .from('hr_employee_checklists')
        .insert({ employee_id: employeeId, template_id: tmpl.id, type, items_state: initial as any })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee_checklists'] }),
  });
}

export function useUpdateChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, items_state, status, completed_at }: { id: string; items_state: ChecklistItemState[]; status?: 'in_progress' | 'completed'; completed_at?: string | null }) => {
      const update: any = { items_state };
      if (status) update.status = status;
      if (completed_at !== undefined) update.completed_at = completed_at;
      const { data, error } = await supabase.from('hr_employee_checklists').update(update).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee_checklists'] }),
  });
}

export function useDeleteChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hr_employee_checklists').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee_checklists'] }),
  });
}