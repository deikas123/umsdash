import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/hr/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

export type Suggestion = Tables<'suggestions'>;
export type SuggestionCategory = 'suggestion' | 'complaint' | 'whistleblower' | 'compliment';
export type SuggestionStatus = 'new' | 'reviewing' | 'actioned' | 'dismissed';

/** GM-only — RLS will return empty for everyone else. */
export function useSuggestions() {
  return useQuery({
    queryKey: ['suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_suggestions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Suggestion[];
    },
  });
}

export function useCreateSuggestion() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { category: SuggestionCategory; subject: string; body: string }) => {
      if (!user) throw new Error('Not authenticated');
      const payload: TablesInsert<'suggestions'> = {
        submitter_user_id: user.id,
        category: input.category,
        subject: input.subject,
        body: input.body,
      };
      const { data, error } = await supabase.from('hr_suggestions').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suggestions'] }),
  });
}

export function useUpdateSuggestion() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { id: string; status?: SuggestionStatus; gm_notes?: string }) => {
      const { id, ...patch } = input;
      const { data, error } = await supabase
        .from('hr_suggestions')
        .update({ ...patch, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suggestions'] }),
  });
}