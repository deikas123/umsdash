import { Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useStreakWidget } from '@/hooks/useStreakWidget';

const STREAK_MILESTONES = [3, 7, 14, 30];

function getNextMilestone(current: number): number {
  const next = STREAK_MILESTONES.find((m) => m > current);
  return next ?? STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
}

function getMilestonePrev(milestone: number): number {
  const idx = STREAK_MILESTONES.indexOf(milestone);
  return idx > 0 ? STREAK_MILESTONES[idx - 1] : 0;
}

export function StreakWidget() {
  const { currentStreak, longestStreak, todayXp, uploadedToday, loading } = useStreakWidget();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-16" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-4 w-24" />
        </CardContent>
      </Card>
    );
  }

  const nextMilestone = getNextMilestone(currentStreak);
  const prevMilestone = getMilestonePrev(nextMilestone);
  const progressPct = nextMilestone === prevMilestone
    ? 100
    : Math.round(((currentStreak - prevMilestone) / (nextMilestone - prevMilestone)) * 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Flame className="h-5 w-5 text-orange-500" />
          Upload Streak
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold">{currentStreak}</span>
          <span className="text-sm text-muted-foreground">day{currentStreak !== 1 ? 's' : ''}</span>
        </div>

        {uploadedToday && (
          <p className="text-xs text-emerald-600 font-medium">✅ Uploaded today!</p>
        )}

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Next milestone: {nextMilestone} days</span>
            <span>{currentStreak}/{nextMilestone}</span>
          </div>
          <Progress value={Math.min(progressPct, 100)} className="h-2" />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Longest: {longestStreak} days</span>
          {todayXp > 0 && <span className="text-amber-600">+{todayXp} XP today</span>}
        </div>
      </CardContent>
    </Card>
  );
}
