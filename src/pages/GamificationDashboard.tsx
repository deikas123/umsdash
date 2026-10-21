import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useGamification } from '@/hooks/useGamification';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  XPBar,
  StreakWidget,
  AchievementBadge,
  DailyChallenge,
  Leaderboard,
} from '@/components/gamification';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  xp_reward: number;
  category: string | null;
}

export default function GamificationDashboard() {
  const { userXp, userAchievements, loading } = useGamification();
  const { profile } = useAuth();

  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [achLoading, setAchLoading] = useState(true);

  useEffect(() => {
    async function fetchAchievements() {
      try {
        const { data } = await supabase
          .from('achievements')
          .select('*')
          .order('category');
        setAllAchievements((data as Achievement[]) ?? []);
      } catch (err) {
        console.error('GamificationDashboard fetchAchievements error:', err);
      } finally {
        setAchLoading(false);
      }
    }
    fetchAchievements();
  }, []);

  return (
    <TooltipProvider>
      <AppLayout
        title="My Progress"
        description="Track your XP, upload streaks, and achievements"
      >
        {/* XP Bar — full width */}
        <div className="mb-4">
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <XPBar
                  total_xp={userXp?.total_xp ?? 0}
                  level={userXp?.level ?? 1}
                />
              )}
              {profile && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {profile.full_name}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Two-column: Streak | Daily Challenge */}
        <div className="mb-4 grid gap-4 grid-cols-1 lg:grid-cols-2">
          <StreakWidget />
          <DailyChallenge />
        </div>

        {/* Achievements */}
        <div className="mb-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">🏅 Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              {achLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : allAchievements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No achievements defined yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {allAchievements.map((ach) => {
                    const ua = userAchievements.find(
                      (u) => u.achievement_key === ach.key,
                    );
                    return (
                      <AchievementBadge
                        key={ach.key}
                        icon={ach.icon ?? '🏅'}
                        name={ach.name}
                        description={ach.description ?? ''}
                        earned={!!ua}
                        earned_at={ua?.earned_at}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard — full width */}
        <Leaderboard />
      </AppLayout>
    </TooltipProvider>
  );
}
