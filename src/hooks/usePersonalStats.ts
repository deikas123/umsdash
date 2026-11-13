// src/hooks/usePersonalStats.ts
import { useQuery } from '@tanstack/react-query';
import { startOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export interface PersonalStats {
  myDocsThisMonth: number;
  leaveBalance: number | null;
  myOpenTickets: number;
}

export function usePersonalStats(userId: string) {
  return useQuery<PersonalStats>({
    queryKey: ['personal-stats', userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const monthStart = startOfMonth(new Date()).toISOString();

      let myDocsThisMonth = 0;
      let leaveBalance: number | null = null;
      let myOpenTickets = 0;

      // 1. Docs uploaded by user this month
      try {
        const { count } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('uploaded_by', userId)
          .gte('created_at', monthStart);
        myDocsThisMonth = count ?? 0;
      } catch {}

      // 2. Leave balance via profile → employee record
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('employee_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (profile?.employee_id) {
          const { data: emp } = await supabase
            .from('hr_employees')
            .select('annual_leave_balance')
            .eq('id', profile.employee_id)
            .maybeSingle();

          if (emp != null) {
            leaveBalance = (emp as any).annual_leave_balance ?? null;
          }
        }
      } catch {}

      // 3. Open tickets assigned to user
      try {
        const { count } = await supabase
          .from('it_helpdesk_tickets')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', userId)
          .in('status', ['open', 'assigned']);
        myOpenTickets = count ?? 0;
      } catch {}

      return { myDocsThisMonth, leaveBalance, myOpenTickets };
    },
  });
}
