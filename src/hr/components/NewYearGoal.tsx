// src/hr/components/NewYearGoal.tsx
// Jan 1–31: New Year goal setter on HR My Portal.
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isGoalSetterMonth } from '@/lib/festiveCalendar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Target, Edit2, Check } from 'lucide-react';

const YEAR = new Date().getFullYear();

type NYGoal = { id: string; user_id: string; year: number; goal: string };

export function NewYearGoal() {
  const { user, isHrManager, isAdmin, isGM } = useAuth();
  const isHRAdmin = isHrManager || isAdmin || isGM;
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const { data: myGoal } = useQuery<NYGoal | null>({
    queryKey: ['ny-goal', user?.id, YEAR],
    enabled: !!user && isGoalSetterMonth(),
    queryFn: async () => {
      const { data } = await supabase.from('hr_ny_goals')
        .select('*').eq('user_id', user!.id).eq('year', YEAR).maybeSingle();
      return data as NYGoal | null;
    },
  });

  const { data: teamGoals = [] } = useQuery<NYGoal[]>({
    queryKey: ['ny-goals-team', YEAR],
    enabled: isHRAdmin && isGoalSetterMonth(),
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_ny_goals').select('*').eq('year', YEAR);
      if (error) throw error;
      return data as NYGoal[];
    },
  });

  const saveGoal = useMutation({
    mutationFn: async (goal: string) => {
      const { error } = await supabase.from('hr_ny_goals')
        .upsert({ user_id: user!.id, year: YEAR, goal }, { onConflict: 'user_id,year' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ny-goal'] });
      qc.invalidateQueries({ queryKey: ['ny-goals-team'] });
      setEditing(false);
      toast({ title: `🎯 Goal saved for ${YEAR}!` });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  if (!isGoalSetterMonth()) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 rounded-xl p-5 mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-5 w-5 text-indigo-500" />
        <h3 className="font-semibold">🎯 My {YEAR} Work Goal</h3>
      </div>

      {editing || !myGoal ? (
        <div className="space-y-3">
          <Textarea
            value={draft || myGoal?.goal || ''}
            onChange={e => setDraft(e.target.value)}
            placeholder={`What do you want to achieve at work in ${YEAR}?`}
            rows={3}
            className="bg-background"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" className="gap-1" onClick={() => saveGoal.mutate(draft || myGoal?.goal || '')} disabled={saveGoal.isPending}>
              <Check className="h-3 w-3" />{saveGoal.isPending ? 'Saving…' : 'Save Goal'}
            </Button>
            {myGoal && <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>}
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm leading-relaxed text-foreground">{myGoal.goal}</p>
          <button onClick={() => { setDraft(myGoal.goal); setEditing(true); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mt-2 transition-colors">
            <Edit2 className="h-3 w-3" /> Edit goal
          </button>
        </div>
      )}

      {isHRAdmin && teamGoals.length > 0 && (
        <div className="mt-4 pt-4 border-t border-indigo-500/20">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Team Goals ({teamGoals.length})</p>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {teamGoals.map(g => (
              <p key={g.id} className="text-xs text-muted-foreground bg-background/50 rounded px-2 py-1 italic">"{g.goal}"</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
