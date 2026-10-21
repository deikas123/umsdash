import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface StreakWidgetData {
  currentStreak: number;
  longestStreak: number;
  todayXp: number;
  uploadedToday: boolean;
  loading: boolean;
}

export function useStreakWidget(): StreakWidgetData {
  const { user } = useAuth();
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [todayXp, setTodayXp] = useState(0);
  const [uploadedToday, setUploadedToday] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchStreakData() {
      try {
        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);
        const todayIso = todayMidnight.toISOString();

        const [streakRes, xpRes, docsRes] = await Promise.all([
          // 1. Upload streak for this user
          supabase
            .from('upload_streaks')
            .select('current_streak, longest_streak')
            .eq('user_id', user.id)
            .maybeSingle(),

          // 2. Sum of today's XP transactions
          supabase
            .from('xp_transactions')
            .select('amount')
            .eq('user_id', user.id)
            .gte('created_at', todayIso),

          // 3. Documents uploaded today
          supabase
            .from('documents')
            .select('id', { count: 'exact', head: true })
            .eq('uploaded_by', user.id)
            .gte('created_at', todayIso),
        ]);

        if (streakRes.data) {
          setCurrentStreak(streakRes.data.current_streak);
          setLongestStreak(streakRes.data.longest_streak);
        }

        if (xpRes.data) {
          const sum = xpRes.data.reduce((acc, tx) => acc + (tx.amount ?? 0), 0);
          setTodayXp(sum);
        }

        setUploadedToday((docsRes.count ?? 0) > 0);
      } catch (err) {
        console.error('useStreakWidget error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStreakData();
  }, [user]);

  return { currentStreak, longestStreak, todayXp, uploadedToday, loading };
}
