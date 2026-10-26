import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert } from '@/hr/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

export type Survey = Tables<'surveys'>;
export type SurveyResponse = Tables<'survey_responses'>;

export type SurveyQuestion =
  | { id: string; type: 'rating'; text: string; scale?: number }
  | { id: string; type: 'text'; text: string }
  | { id: string; type: 'choice'; text: string; options: string[] };

export function useSurveys() {
  return useQuery({
    queryKey: ['surveys'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_surveys').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Survey[];
    },
  });
}

export function useActiveSurveys() {
  return useQuery({
    queryKey: ['surveys_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_surveys')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Survey[];
    },
  });
}

/** Survey IDs the current user has already submitted to. */
export function useMyParticipation() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my_survey_participation', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_survey_participation')
        .select('survey_id')
        .eq('user_id', user!.id);
      if (error) throw error;
      return new Set((data || []).map(p => p.survey_id));
    },
  });
}

export function useCreateSurvey() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Omit<TablesInsert<'surveys'>, 'created_by'>) => {
      const { data, error } = await supabase
        .from('hr_surveys')
        .insert({ ...input, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['surveys'] });
      qc.invalidateQueries({ queryKey: ['surveys_active'] });
    },
  });
}

export function useUpdateSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status?: 'draft' | 'active' | 'closed'; title?: string; description?: string; questions?: any; ends_at?: string | null }) => {
      const { id, ...patch } = input;
      const { data, error } = await supabase.from('hr_surveys').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['surveys'] });
      qc.invalidateQueries({ queryKey: ['surveys_active'] });
    },
  });
}

export function useDeleteSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hr_surveys').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['surveys'] });
      qc.invalidateQueries({ queryKey: ['surveys_active'] });
    },
  });
}

export function useSubmitSurveyResponse() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { survey_id: string; answers: Record<string, any> }) => {
      if (!user) throw new Error('Not authenticated');
      // 1. Anonymous response (no user_id linked to answers)
      const { error: respErr } = await supabase
        .from('hr_survey_responses')
        .insert({ survey_id: input.survey_id, answers: input.answers });
      if (respErr) throw respErr;
      // 2. Mark participation separately so user can't double-submit
      const { error: partErr } = await supabase
        .from('hr_survey_participation')
        .insert({ survey_id: input.survey_id, user_id: user.id });
      if (partErr && !partErr.message.toLowerCase().includes('duplicate')) throw partErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my_survey_participation'] });
      qc.invalidateQueries({ queryKey: ['survey_responses'] });
    },
  });
}

/** HR/GM only: fetch all responses for aggregation. */
export function useSurveyResponses(surveyId: string | null) {
  return useQuery({
    queryKey: ['survey_responses', surveyId],
    enabled: !!surveyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_survey_responses')
        .select('*')
        .eq('survey_id', surveyId!);
      if (error) throw error;
      return data as SurveyResponse[];
    },
  });
}

/** Count of users invited (active employees with a linked profile is approximated by count of profiles). */
export function useSurveyParticipantCount(surveyId: string | null) {
  return useQuery({
    queryKey: ['survey_participant_count', surveyId],
    enabled: !!surveyId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('hr_survey_participation')
        .select('*', { count: 'exact', head: true })
        .eq('survey_id', surveyId!);
      if (error) throw error;
      return count ?? 0;
    },
  });
}