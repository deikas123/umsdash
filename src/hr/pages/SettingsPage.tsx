import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HolidayCalendar from '@/hr/components/HolidayCalendar';

function useCompanySettings() {
  return useQuery({
    queryKey: ['company_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_company_settings').select('*');
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => { map[r.key] = r.value; });
      return map;
    },
  });
}

function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Record<string, string>) => {
      for (const [key, value] of Object.entries(settings)) {
        const { error } = await supabase
          .from('hr_company_settings')
          .upsert({ key, value }, { onConflict: 'key' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company_settings'] });
      toast({ title: 'Settings saved successfully' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useCompanySettings();
  const saveSettings = useSaveSettings();
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = () => saveSettings.mutate(form);

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">System configuration and parameters</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="holidays">Public Holidays</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Info */}
        <div className="bg-card rounded-lg border shadow-sm p-5">
          <h2 className="text-base font-semibold text-foreground mb-4">Company Information</h2>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Company Name</Label>
              <Input value={form.company_name || ''} onChange={e => set('company_name', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">KRA PIN</Label>
              <Input value={form.kra_pin || ''} onChange={e => set('kra_pin', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">NSSF Employer Number</Label>
              <Input value={form.nssf_employer_no || ''} onChange={e => set('nssf_employer_no', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Logo URL</Label>
              <Input value={form.logo_url || ''} onChange={e => set('logo_url', e.target.value)} className="mt-1" placeholder="https://..." />
            </div>
          </div>
        </div>

        {/* Leave Settings */}
        <div className="bg-card rounded-lg border shadow-sm p-5">
          <h2 className="text-base font-semibold text-foreground mb-4">Leave Settings</h2>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Default Annual Leave Days</Label>
              <Input type="number" value={form.default_annual_leave || ''} onChange={e => set('default_annual_leave', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Sick Leave Days (per year)</Label>
              <Input type="number" value={form.sick_leave_days || ''} onChange={e => set('sick_leave_days', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Maternity Leave Days</Label>
              <Input type="number" value={form.maternity_leave_days || ''} onChange={e => set('maternity_leave_days', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Paternity Leave Days</Label>
              <Input type="number" value={form.paternity_leave_days || ''} onChange={e => set('paternity_leave_days', e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>

        {/* Statutory Rates (Read-only reference) */}
        <div className="bg-card rounded-lg border shadow-sm p-5">
          <h2 className="text-base font-semibold text-foreground mb-4">Statutory Rates (Kenya 2024)</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-muted-foreground">NSSF Tier I Limit</Label><Input defaultValue="7,000" className="mt-1" readOnly /></div>
              <div><Label className="text-xs text-muted-foreground">NSSF Tier II Limit</Label><Input defaultValue="36,000" className="mt-1" readOnly /></div>
            </div>
            <div><Label className="text-xs text-muted-foreground">NSSF Rate</Label><Input defaultValue="6%" className="mt-1" readOnly /></div>
            <div><Label className="text-xs text-muted-foreground">SHIF Rate</Label><Input defaultValue="2.75% of Gross Pay" className="mt-1" readOnly /></div>
            <div><Label className="text-xs text-muted-foreground">Housing Levy (AHL) Rate</Label><Input defaultValue="1.5% of Gross Pay" className="mt-1" readOnly /></div>
            <div><Label className="text-xs text-muted-foreground">Personal Relief</Label><Input defaultValue="KES 2,400 per month" className="mt-1" readOnly /></div>
          </div>
        </div>

        {/* PAYE Rates */}
        <div className="bg-card rounded-lg border shadow-sm p-5">
          <h2 className="text-base font-semibold text-foreground mb-4">PAYE Tax Bands (Monthly)</h2>
          <div className="space-y-2 text-sm">
            {[
              ['First KES 24,000', '10%'],
              ['Next KES 8,333', '25%'],
              ['Next KES 467,667', '30%'],
              ['Next KES 300,000', '32.5%'],
              ['Above KES 800,000', '35%'],
            ].map(([band, rate]) => (
              <div key={band} className="flex justify-between p-2 rounded bg-muted/50">
                <span className="text-foreground">{band}</span>
                <span className="font-medium text-primary">{rate}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Button onClick={handleSave} disabled={saveSettings.isPending}>
          {saveSettings.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : 'Save Settings'}
        </Button>
      </div>
        </TabsContent>
        <TabsContent value="holidays">
          <HolidayCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
}
