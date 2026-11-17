// src/hooks/useStreakConfetti.ts
// Fires canvas-confetti when user hits 7 / 30 / 100-day streak milestones.
// Deduplication: localStorage (immediate, never re-fires in same browser)
// + Supabase DB (persists across devices). Both gates must pass to fire.
import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '@/integrations/supabase/client';

const MILESTONES = [7, 30, 100] as const;

function localKey(userId: string, milestone: number) {
  return `ums_confetti_${userId}_${milestone}`;
}

function alreadySeenLocally(userId: string, milestone: number): boolean {
  try { return localStorage.getItem(localKey(userId, milestone)) === '1'; } catch { return false; }
}

function markSeenLocally(userId: string, milestone: number) {
  try { localStorage.setItem(localKey(userId, milestone), '1'); } catch {}
}

export function useStreakConfetti(streak: number, userId: string) {
  useEffect(() => {
    if (!userId || streak === 0) return;

    async function checkMilestones() {
      for (const milestone of MILESTONES) {
        if (streak < milestone) continue;

        // Gate 1: localStorage — fast, synchronous, survives page refresh
        if (alreadySeenLocally(userId, milestone)) continue;

        // Gate 2: DB check (best-effort — if it fails we still use localStorage gate)
        try {
          const { data, error } = await supabase
            .from('user_milestone_seen')
            .select('id')
            .eq('user_id', userId)
            .eq('milestone', String(milestone))
            .maybeSingle();

          if (error) {
            // DB unavailable / RLS error — fall through to localStorage-only gate
            // localStorage was already checked above, so safe to fire once
          } else if (data !== null) {
            // Already recorded in DB — mark locally so we skip next time
            markSeenLocally(userId, milestone);
            continue;
          } else {
            // Not in DB yet — try to insert
            await supabase.from('user_milestone_seen').insert({
              user_id: userId,
              milestone: String(milestone),
            });
          }
        } catch {
          // Non-blocking — proceed with localStorage gate only
        }

        // Mark locally BEFORE firing so a fast double-render doesn't double-fire
        markSeenLocally(userId, milestone);

        // Fire confetti 🎉
        confetti({
          particleCount: 180,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#FCD34D', '#34D399', '#60A5FA', '#F472B6', '#A78BFA'],
        });

        // Only fire for the highest milestone reached this session
        break;
      }
    }

    checkMilestones();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak, userId]);
}
