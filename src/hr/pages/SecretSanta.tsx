// src/hr/pages/SecretSanta.tsx
// /hr/secret-santa — Secret Santa assignment tool + Advent message editor.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmployees } from '@/hr/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Gift, Edit2, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';

const YEAR = new Date().getFullYear();

type Assignment = { id: string; giver_id: string; receiver_id: string; year: number };
type AdventMsg = { id: string; day: number; message: string };

function fisherYatesDerangement(ids: string[]): string[] {
  // Derangement: no one gets themselves
  let arr = [...ids];
  let attempts = 0;
  while (attempts < 100) {
    attempts++;
    // Shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    // Check derangement
    if (arr.every((v, i) => v !== ids[i])) return arr;
    arr = [...ids]; // reset and retry
  }
  // Fallback: rotate by 1
  return [...ids.slice(1), ids[0]];
}

export default function SecretSanta() {
  const { isAdmin, isGM, isHrManager } = useAuth();
  const isHRAdmin = isAdmin || isGM || isHrManager;
  const { data: employees = [] } = useEmployees();
  const qc = useQueryClient();

  const [selected, setSelected] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editMsg, setEditMsg] = useState('');

  // Fetch assignments for this year
  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ['secret-santa', YEAR],
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_secret_santa_assignments').select('*').eq('year', YEAR);
      if (error) throw error;
      return data as Assignment[];
    },
  });

  // Fetch advent messages
  const { data: adventMsgs = [] } = useQuery<AdventMsg[]>({
    queryKey: ['advent-messages-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_advent_messages').select('*').order('day');
      if (error) throw error;
      return data as AdventMsg[];
    },
  });

  const updateAdvent = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      const { error } = await supabase.from('hr_advent_messages').update({ message }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['advent-messages-admin'] }); qc.invalidateQueries({ queryKey: ['advent-messages'] }); },
  });

  const toggleEmployee = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAssign = async () => {
    if (selected.length < 2) { toast({ title: 'Select at least 2 participants', variant: 'destructive' }); return; }
    setAssigning(true);
    try {
      // Clear existing assignments for this year
      await supabase.from('hr_secret_santa_assignments').delete().eq('year', YEAR);

      const receivers = fisherYatesDerangement(selected);
      const rows = selected.map((giverId, i) => ({ giver_id: giverId, receiver_id: receivers[i], year: YEAR }));
      const { error } = await supabase.from('hr_secret_santa_assignments').insert(rows);
      if (error) throw error;

      // Send in-app notifications to each giver
      const notifRows = selected.map((giverId, i) => {
        const receiver = employees.find(e => e.id === receivers[i]);
        const receiverName = receiver ? `${receiver.first_name} ${receiver.last_name}` : 'someone special';
        const giver = employees.find(e => e.id === giverId);
        const giverUserId = giver?.user_id ?? null;
        if (!giverUserId) return null;
        return {
          user_id: giverUserId,
          title: '🎅 Secret Santa Assignment',
          message: `You have been assigned: ${receiverName} 🎁`,
          is_read: false,
        };
      }).filter(Boolean);

      if (notifRows.length > 0) {
        await supabase.from('in_app_notifications').insert(notifRows as any[]);
      }

      qc.invalidateQueries({ queryKey: ['secret-santa'] });
      toast({ title: `🎅 Assigned! ${selected.length} participants paired.` });
    } catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setAssigning(false); }
  };

  const empMap = Object.fromEntries(employees.map(e => [e.id, `${e.first_name} ${e.last_name}`]));

  return (
    <div>
      <div className="page-header flex items-center gap-3 mb-6">
        <span className="text-3xl">🎅</span>
        <div>
          <h1 className="page-title">Secret Santa {YEAR}</h1>
          <p className="page-subtitle">Assign Secret Santa pairs and manage advent calendar messages</p>
        </div>
      </div>

      <Tabs defaultValue="santa">
        <TabsList className="mb-6">
          <TabsTrigger value="santa">🎁 Secret Santa</TabsTrigger>
          <TabsTrigger value="advent">🎄 Advent Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="santa">
          {isHRAdmin ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Participant selector */}
              <div className="bg-card rounded-xl border p-5 shadow-sm">
                <h2 className="font-semibold mb-3">Select Participants ({selected.length})</h2>
                <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                  {employees.map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => toggleEmployee(emp.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-sm ${selected.includes(emp.id) ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
                    >
                      <div className={`h-2 w-2 rounded-full flex-shrink-0 ${selected.includes(emp.id) ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                      {emp.first_name} {emp.last_name}
                      <span className="text-xs text-muted-foreground ml-auto">{(emp as any).hr_departments?.name ?? ''}</span>
                    </button>
                  ))}
                </div>
                <Button className="w-full mt-4 gap-2" onClick={handleAssign} disabled={assigning || selected.length < 2}>
                  <Gift className="h-4 w-4" />{assigning ? 'Assigning…' : 'Assign Pairs'}
                </Button>
              </div>

              {/* Results */}
              <div className="bg-card rounded-xl border p-5 shadow-sm">
                <h2 className="font-semibold mb-3">Assignments {YEAR} ({assignments.length} pairs)</h2>
                {assignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assignments yet. Select participants and click Assign.</p>
                ) : (
                  <div className="space-y-2">
                    {assignments.map(a => (
                      <div key={a.id} className="flex items-center gap-2 text-sm py-1.5 border-b last:border-0">
                        <span className="font-medium flex-1">{empMap[a.giver_id] ?? '—'}</span>
                        <span className="text-muted-foreground">🎁 gives to</span>
                        <span className="font-medium flex-1 text-right">{empMap[a.receiver_id] ?? '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Staff view — only see own assignment */
            <StaffView assignments={assignments} empMap={empMap} />
          )}
        </TabsContent>

        <TabsContent value="advent">
          {isHRAdmin ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {adventMsgs.map(msg => (
                <div key={msg.id} className="bg-card rounded-xl border p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="font-mono">Dec {msg.day}</Badge>
                    <button onClick={() => { setEditingDay(msg.day); setEditMsg(msg.message); }} className="text-muted-foreground hover:text-primary p-1">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {editingDay === msg.day ? (
                    <div className="space-y-2">
                      <Textarea value={editMsg} onChange={e => setEditMsg(e.target.value)} rows={3} className="text-sm" />
                      <Button size="sm" className="gap-1" onClick={async () => {
                        await updateAdvent.mutateAsync({ id: msg.id, message: editMsg });
                        setEditingDay(null);
                        toast({ title: 'Message updated' });
                      }}>
                        <Check className="h-3 w-3" /> Save
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground line-clamp-3">{msg.message}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Only HR managers can edit advent messages.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StaffView({ assignments, empMap }: { assignments: Assignment[]; empMap: Record<string, string> }) {
  const { profile } = useAuth();
  const { data: employees = [] } = useEmployees();
  const me = employees.find(e => e.email === profile?.email);
  const myAssignment = me ? assignments.find(a => a.giver_id === me.id) : null;

  return (
    <div className="max-w-sm mx-auto text-center py-8">
      <p className="text-5xl mb-4">🎅</p>
      {myAssignment ? (
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <p className="text-muted-foreground text-sm mb-2">Your Secret Santa assignment:</p>
          <p className="text-2xl font-bold text-primary">{empMap[myAssignment.receiver_id] ?? '—'}</p>
          <p className="text-xs text-muted-foreground mt-3">🤫 Keep it secret until the day!</p>
        </div>
      ) : (
        <p className="text-muted-foreground">No assignment yet — check back after HR runs the draw.</p>
      )}
    </div>
  );
}
