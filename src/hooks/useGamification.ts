import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface UserXp {
  id: string;
  user_id: string;
  total_xp: number;
  level: number;
  updated_at: string;
}

export interface UploadStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_upload_date: string | null;
  updated_at: string;
}

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  xp_reward: number;
  category: string | null;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_key: string;
  earned_at: string;
  achievement?: Achievement;
}

export interface XpTransaction {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  ref_id: string | null;
  created_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  total_xp: number;
  level: number;
  full_name: string;
  avatar_url: string | null;
}

export interface DailyChallenge {
  id: string;
  date: string;
  type: string;
  target_count: number;
  xp_reward: number;
  label: string;
  icon: string;
}

export interface UserDailyProgress {
  id: string;
  user_id: string;
  challenge_date: string;
  progress: number;
  completed: boolean;
  completed_at: string | null;
}

// ── useGamification ──────────────────────────────────────────────────────────

export function useGamification() {
  const { user } = useAuth();
  const [userXp, setUserXp] = useState<UserXp | null>(null);
  const [streak, setStreak] = useState<UploadStreak | null>(null);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [xpTransactions, setXpTransactions] = useState<XpTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Unique channel name per hook instance — avoids StrictMode double-mount conflict
  const channelId = useRef('gamification-' + Math.random().toString(36).slice(2));

  const fetchAll = useCallback(async () => {
    if (!user) return;
    try {
      const [xpRes, streakRes, achievementsRes, txRes] = await Promise.all([
        supabase
          .from('user_xp')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('upload_streaks')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('user_achievements')
          .select('*, achievement:achievements(*)')
          .eq('user_id', user.id),
        supabase
          .from('xp_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      setUserXp((xpRes.data as UserXp) ?? null);
      setStreak((streakRes.data as UploadStreak) ?? null);
      setUserAchievements((achievementsRes.data as UserAchievement[]) ?? []);
      setXpTransactions((txRes.data as XpTransaction[]) ?? []);
    } catch (err) {
      console.error('useGamification fetchAll error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAll();
    if (!user) return;

    const channel = supabase
      .channel(channelId.current)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_xp',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchAll(),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchAll]);

  return { userXp, streak, userAchievements, xpTransactions, loading, refetch: fetchAll };
}

// ── useLeaderboard ───────────────────────────────────────────────────────────

export function useLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        // Try the join approach first
        const { data, error } = await supabase
          .from('user_xp')
          .select('total_xp, level, user_id, profiles!inner(full_name, avatar_url)')
          .order('total_xp', { ascending: false })
          .limit(10);

        if (!error && data) {
          const entries: LeaderboardEntry[] = (data as Array<{
            user_id: string;
            total_xp: number;
            level: number;
            profiles: { full_name: string; avatar_url: string | null };
          }>).map((row) => ({
            user_id: row.user_id,
            total_xp: row.total_xp,
            level: row.level,
            full_name: row.profiles.full_name,
            avatar_url: row.profiles.avatar_url,
          }));
          setLeaderboard(entries);
          return;
        }

        // Fallback: two separate queries
        const { data: xpData } = await supabase
          .from('user_xp')
          .select('total_xp, level, user_id')
          .order('total_xp', { ascending: false })
          .limit(10);

        if (!xpData) return;

        const userIds = xpData.map((r) => r.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        const profileMap = new Map(
          (profilesData ?? []).map((p) => [p.user_id, p]),
        );

        const entries: LeaderboardEntry[] = xpData.map((row) => {
          const profile = profileMap.get(row.user_id);
          return {
            user_id: row.user_id,
            total_xp: row.total_xp,
            level: row.level,
            full_name: profile?.full_name ?? 'Unknown',
            avatar_url: profile?.avatar_url ?? null,
          };
        });
        setLeaderboard(entries);
      } catch (err) {
        console.error('useLeaderboard error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  return { leaderboard, loading };
}

// ── useDailyChallenge ────────────────────────────────────────────────────────

export function useDailyChallenge() {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [progress, setProgress] = useState<UserDailyProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChallenge() {
      if (!user) return;
      try {
        const today = new Date().toISOString().split('T')[0];

        const { data: challengeData } = await supabase
          .from('daily_challenges')
          .select('*')
          .eq('date', today)
          .maybeSingle();

        setChallenge((challengeData as DailyChallenge) ?? null);

        if (challengeData) {
          const { data: progressData } = await supabase
            .from('user_daily_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('challenge_date', today)
            .maybeSingle();
          setProgress((progressData as UserDailyProgress) ?? null);
        }
      } catch (err) {
        console.error('useDailyChallenge error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchChallenge();
  }, [user]);

  return { challenge, progress, loading };
}
