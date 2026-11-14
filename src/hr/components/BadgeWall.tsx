// src/hr/components/BadgeWall.tsx
import { useMyAchievements, ALL_BADGE_SLUGS, AchievementDef } from '@/hooks/useAchievements';
import { format } from 'date-fns';

interface BadgeWallProps {
  userId: string;
}

export function BadgeWall({ userId }: BadgeWallProps) {
  const { data, isLoading } = useMyAchievements(userId || undefined);

  if (!userId) return null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
        {ALL_BADGE_SLUGS.map((s) => (
          <div key={s} className="h-24 rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  const defs: AchievementDef[] = data?.defs ?? [];
  const earnedMap = new Map((data?.earned ?? []).map((e) => [e.achievement_key, e.earned_at]));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {ALL_BADGE_SLUGS.map((slug) => {
        const def = defs.find((d) => d.key === slug);
        const earnedAt = earnedMap.get(slug);
        const earned = !!earnedAt;

        return (
          <div
            key={slug}
            className={`rounded-lg border p-4 flex flex-col items-center text-center gap-1.5 transition-all ${
              earned
                ? 'bg-card shadow-sm border-border'
                : 'bg-muted/40 opacity-40 grayscale border-border/50'
            }`}
          >
            <span className="text-3xl" role="img" aria-label={def?.name ?? slug}>
              {def?.icon ?? '🏅'}
            </span>
            <p className="text-sm font-semibold text-foreground leading-tight">{def?.name ?? slug}</p>
            <p className="text-xs text-muted-foreground leading-tight">{def?.description ?? ''}</p>
            {earned && earnedAt && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Earned {format(new Date(earnedAt), 'dd MMM yyyy')}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
