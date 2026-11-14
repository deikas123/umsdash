// src/hooks/useAchievements.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** All achievement slugs surfaced in the BadgeWall (superset of gamification seeds). */
export const ALL_BADGE_SLUGS = [
  'first_upload',
  'docs_100',
  'perfect_attendance',
  'ticket_hero_10',
  'streak_7',
  'streak_30',
] as const;

export type BadgeSlug = (typeof ALL_BADGE_SLUGS)[number];

/** Award a badge to a user if they haven't already earned it. No-op when already earned. */
export async function awardBadgeIfEarned(userId: string, slug: string): Promise<void> {
  if (!userId || !slug) return;
  try {
    // Check if already earned
    const { data: existing } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_key', slug)
      .maybeSingle();

    if (existing) return; // already earned

    await supabase.from('user_achievements').insert({
      user_id: userId,
      achievement_key: slug,
    });
  } catch (_) {
    // Best-effort — don't surface errors to the user
  }
}

export interface AchievementDef {
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  xp_reward: number;
  category: string | null;
}

export interface UserAchievementRow {
  achievement_key: string;
  earned_at: string;
}

export function useMyAchievements(userId?: string) {
  return useQuery({
    queryKey: ['my-achievements', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const [defsRes, earnedRes] = await Promise.all([
        supabase
          .from('achievements')
          .select('key, name, description, icon, xp_reward, category')
          .in('key', ALL_BADGE_SLUGS as unknown as string[]),
        supabase
          .from('user_achievements')
          .select('achievement_key, earned_at')
          .eq('user_id', userId!),
      ]);

      const defs: AchievementDef[] = (defsRes.data ?? []) as AchievementDef[];
      const earned: UserAchievementRow[] = (earnedRes.data ?? []) as UserAchievementRow[];

      return { defs, earned };
    },
  });
}
