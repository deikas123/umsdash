import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield, Save } from 'lucide-react';

export function PasswordExpirySettings() {
  const { toast } = useToast();
  const [globalDays, setGlobalDays] = useState<number>(90);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'password_expiry_days')
        .single();
      
      if (data?.value) {
        setGlobalDays(Number(data.value) || 90);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: globalDays as any })
        .eq('key', 'password_expiry_days');

      if (error) throw error;

      toast({
        title: 'Settings saved',
        description: `Password expiry set to ${globalDays} days globally.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save password expiry settings.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Password Expiry Policy
        </CardTitle>
        <CardDescription>
          Set how often users must change their password. Users will see a warning 7 days before expiry.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="globalDays">Password expires after (days)</Label>
          <div className="flex items-center gap-3">
            <Input
              id="globalDays"
              type="number"
              min={7}
              max={365}
              value={globalDays}
              onChange={(e) => setGlobalDays(parseInt(e.target.value) || 90)}
              className="w-32"
            />
            <span className="text-sm text-muted-foreground">days</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Applies to all users. Minimum 7 days, maximum 365 days.
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Policy
        </Button>
      </CardContent>
    </Card>
  );
}
