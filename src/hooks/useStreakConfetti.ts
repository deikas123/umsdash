// src/hooks/useStreakConfetti.ts
import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '@/integrations/supabase/client';

const MILESTONES = [7, 30, 100] as const;

export function useStreakConfetti(streak: number, userId: string) {
  useEffect(() => {
    if (!userId || streak === 0) return;

    async function checkMilestones() {
      for (const milestone of MILESTONES) {
        if (streak < milestone) continue;

        try {
          const { data } = await supabase
            .from('user_milestone_seen')
            .select('id')
            .eq('user_id', userId)
            .eq('milestone', String(milestone))
            .maybeSingle();

          if (data === null) {
            // Not yet seen — insert and fire confetti
            await supabase.from('user_milestone_seen').insert({
              user_id: userId,
              milestone: String(milestone),
            });

            confetti({
              particleCount: 160,
              spread: 90,
              origin: { y: 0.5 },
              colors: ['#FCD34D', '#34D399', '#60A5FA', '#F472B6', '#A78BFA'],
            });
          }
        } catch {
          // Non-blocking — ignore errors
        }
      }
    }

    checkMilestones();
  }, [streak, userId]);
}
