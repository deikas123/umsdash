import { motion } from 'framer-motion';

interface XPBarProps {
  total_xp: number;
  level: number;
}

export function XPBar({ total_xp, level }: XPBarProps) {
  // XP thresholds per level: level N starts at (N-1)^2 * 100, ends at N^2 * 100
  const xpForLevel = (level - 1) * (level - 1) * 100;
  const xpForNext = level * level * 100;
  const xpInLevel = total_xp - xpForLevel;
  const xpRange = xpForNext - xpForLevel;
  const rawPct = xpRange > 0 ? (xpInLevel / xpRange) * 100 : 0;
  const pct = Math.min(100, Math.max(0, rawPct));
  const xpToNext = xpForNext - total_xp;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          Level {level}
        </span>
        <span className="text-sm font-medium">{total_xp} XP</span>
      </div>

      {/* Animated progress bar */}
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: '0%' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      <p className="text-right text-xs text-muted-foreground">
        {xpToNext > 0 ? `${xpToNext} XP to Level ${level + 1}` : 'Max level reached!'}
      </p>
    </div>
  );
}
