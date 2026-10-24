import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrgSettings {
  org_logo_url: string;
  announcement: { text: string; color: string; active: boolean };
  maintenance_mode: boolean;
  oncall_schedule: Record<string, string>;
  doc_templates: Array<{ id: string; name: string; category: string; description: string }>;
}

const DEFAULTS: OrgSettings = {
  org_logo_url: '',
  announcement: { text: '', color: 'blue', active: false },
  maintenance_mode: false,
  oncall_schedule: {},
  doc_templates: [],
};

async function fetchSettings(): Promise<OrgSettings> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('key, value');
  if (error) return DEFAULTS;
  const map: Record<string, unknown> = {};
  (data ?? []).forEach((row) => { map[row.key] = row.value; });
  return {
    org_logo_url: (map['org_logo_url'] as string) ?? '',
    announcement: (map['announcement'] as OrgSettings['announcement']) ?? DEFAULTS.announcement,
    maintenance_mode: (map['maintenance_mode'] as boolean) ?? false,
    oncall_schedule: (map['oncall_schedule'] as OrgSettings['oncall_schedule']) ?? {},
    doc_templates: (map['doc_templates'] as OrgSettings['doc_templates']) ?? [],
  };
}

export function useOrgSettings() {
  const { data = DEFAULTS, isLoading } = useQuery<OrgSettings>({
    queryKey: ['org_settings'],
    queryFn: fetchSettings,
    staleTime: 60_000,
  });
  return { settings: data, loading: isLoading };
}

export function useUpdateOrgSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key, value: value as any, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['org_settings'] }),
  });
}
