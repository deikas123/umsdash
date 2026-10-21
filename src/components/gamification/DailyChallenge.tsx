import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useDailyChallenge } from '@/hooks/useGamification';

export function DailyChallenge() {
  const { challenge, progress, loading } = useDailyChallenge();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  if (!challenge) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Challenge</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No challenge today — check back tomorrow.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentProgress = progress?.progress ?? 0;
  const completed = progress?.completed ?? false;
  const progressPct = Math.min(
    100,
    Math.round((currentProgress / challenge.target_count) * 100),
  );

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span>{challenge.icon}</span>
          Daily Challenge
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm font-medium">{challenge.label}</p>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>
              {currentProgress} / {challenge.target_count}
            </span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>

        <div className="flex items-center justify-between">
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            +{challenge.xp_reward} XP
          </span>
        </div>
      </CardContent>

      {/* Completed overlay */}
      <AnimatePresence>
        {completed && (
          <motion.div
            key="completed-overlay"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-emerald-500/90"
          >
            <span className="text-4xl">🎉</span>
            <p className="mt-1 text-base font-bold text-white">Completed!</p>
            <p className="text-xs text-emerald-100">+{challenge.xp_reward} XP earned</p>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
