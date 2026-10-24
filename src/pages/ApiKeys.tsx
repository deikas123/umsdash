import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import { KeyRound, Plus, Trash2, Copy, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

function generateKey(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return 'umshub_' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashKey(key: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function ApiKeys() {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['api_keys'],
    queryFn: async () => {
      const { data, error } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const fullKey = generateKey();
      const hash = await hashKey(fullKey);
      const prefix = fullKey.slice(0, 16);
      const { error } = await supabase.from('api_keys').insert({
        name,
        key_prefix: prefix,
        key_hash: hash,
        scopes: ['read'],
        created_by: user?.id,
      });
      if (error) throw error;
      return fullKey;
    },
    onSuccess: (key) => {
      qc.invalidateQueries({ queryKey: ['api_keys'] });
      setGeneratedKey(key);
      setNewKeyName('');
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('api_keys').update({ revoked: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['api_keys'] }); toast({ title: 'Key revoked' }); },
  });

  if (!isAdmin) return <AppLayout title="API Keys"><p className="text-muted-foreground">Admin access required.</p></AppLayout>;

  return (
    <AppLayout title="API Keys" description="Manage programmatic access keys">
      <PageHeader
        title="API Keys"
        description="Generate and manage API keys for programmatic access."
        actions={
          <Button size="sm" onClick={() => { setOpen(true); setGeneratedKey(null); }}>
            <Plus className="h-4 w-4 mr-1.5" /> Generate Key
          </Button>
        }
      />
      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : keys.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <KeyRound className="mx-auto h-10 w-10 mb-3 opacity-30" />
          <p>No API keys yet. Generate one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((k: any) => (
            <Card key={k.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <KeyRound className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{k.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{k.key_prefix}••••••••••••</p>
                  <p className="text-xs text-muted-foreground">Created {format(new Date(k.created_at), 'MMM d, yyyy')}</p>
                </div>
                <Badge variant={k.revoked ? 'destructive' : 'default'}>{k.revoked ? 'Revoked' : 'Active'}</Badge>
                {!k.revoked && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => revokeMutation.mutate(k.id)}
                    title="Revoke key"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setGeneratedKey(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate API Key</DialogTitle>
            <DialogDescription>The full key is shown once — copy it now.</DialogDescription>
          </DialogHeader>
          {!generatedKey ? (
            <div className="space-y-3">
              <div><Label className="text-xs">Key Name</Label><Input className="mt-1" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="e.g. Production Integration" /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={() => createMutation.mutate(newKeyName)} disabled={createMutation.isPending || !newKeyName}>Generate</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">⚠ Copy this key now — it won't be shown again.</p>
              <div className="flex items-center gap-2">
                <Input
                  className="font-mono text-xs"
                  type={showKey ? 'text' : 'password'}
                  readOnly
                  value={generatedKey}
                />
                <Button variant="ghost" size="icon" onClick={() => setShowKey(!showKey)}>
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(generatedKey); toast({ title: 'Copied to clipboard' }); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button className="w-full" onClick={() => setOpen(false)}>Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
