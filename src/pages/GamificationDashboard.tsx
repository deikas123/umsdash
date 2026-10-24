import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useGamification, useLeaderboard } from '@/hooks/useGamification';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  DailyChallenge,
  StreakWidget,
} from '@/components/gamification';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Lock, Flame, Trophy, Star } from 'lucide-react';
import { motion } from 'framer-motion';

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  xp_reward: number;
  category: string | null;
}

// ── Level names ──────────────────────────────────────────────────────────────
const LEVEL_NAMES: Record<number, string> = {
  1: 'Newcomer',
  2: 'Contributor',
  3: 'Explorer',
  4: 'Builder',
  5: 'Specialist',
  6: 'Expert',
  7: 'Master',
  8: 'Champion',
  9: 'Legend',
  10: 'Titan',
};
function getLevelName(level: number): string {
  return LEVEL_NAMES[level] ?? `Level ${level}`;
}

// ── Podium colors ────────────────────────────────────────────────────────────
const PODIUM: Record<number, { bg: string; ring: string; text: string; label: string }> = {
  1: { bg: 'bg-yellow-50 dark:bg-yellow-950/40', ring: 'ring-yellow-400', text: 'text-yellow-600 dark:text-yellow-400', label: '🥇' },
  2: { bg: 'bg-slate-50 dark:bg-slate-800/40', ring: 'ring-slate-400', text: 'text-slate-600 dark:text-slate-400', label: '🥈' },
  3: { bg: 'bg-amber-50 dark:bg-amber-950/40', ring: 'ring-amber-500', text: 'text-amber-600 dark:text-amber-500', label: '🥉' },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}

// ── Framer-motion variants ────────────────────────────────────────────────────
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
};

export default function GamificationDashboard() {
  const { userXp, userAchievements, loading } = useGamification();
  const { leaderboard, loading: lbLoading } = useLeaderboard();
  const { profile, user } = useAuth();

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

  // XP bar calculations
  const level = userXp?.level ?? 1;
  const total_xp = userXp?.total_xp ?? 0;
  const xpForLevel = (level - 1) * (level - 1) * 100;
  const xpForNext = level * level * 100;
  const xpInLevel = total_xp - xpForLevel;
  const xpRange = xpForNext - xpForLevel;
  const pct = Math.min(100, Math.max(0, xpRange > 0 ? (xpInLevel / xpRange) * 100 : 0));
  const xpToNext = xpForNext - total_xp;

  // Top 3 + rest
  const podiumEntries = leaderboard.slice(0, 3);
  const restEntries = leaderboard.slice(3);

  return (
    <TooltipProvider>
      <AppLayout title="My Progress" description="Track your XP, streaks, and achievements">
        {/* Page header */}
        <div className="flex flex-col gap-1 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">My Progress</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Track your XP, upload streaks, and achievements.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!loading && (
                <Badge className="gap-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {getLevelName(level)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <motion.div
          className="space-y-6"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {/* ── XP / Level bar ──────────────────────────────────────────────── */}
          <motion.div variants={fadeUp}>
            <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5">
              <CardContent className="pt-6">
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-5 w-full rounded-full" />
                    <Skeleton className="h-4 w-40 ml-auto" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Level + name */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold shadow-md">
                          {level}
                        </div>
                        <div>
                          <p className="text-xl font-bold leading-tight">{getLevelName(level)}</p>
                          <p className="text-xs text-muted-foreground">
                            {profile?.full_name ?? 'Your progress'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold tabular-nums">{total_xp.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">total XP</p>
                      </div>
                    </div>

                    {/* Animated XP bar */}
                    <div className="space-y-1.5">
                      <div className="h-4 w-full overflow-hidden rounded-full bg-muted relative">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                          initial={{ width: '0%' }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
                        />
                        {/* Shimmer overlay */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"
                          initial={{ x: '-100%' }}
                          animate={{ x: '200%' }}
                          transition={{ duration: 1.4, ease: 'easeInOut', delay: 0.8 }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Level {level}</span>
                        <span>
                          {xpToNext > 0
                            ? `${xpToNext.toLocaleString()} XP to Level ${level + 1}`
                            : '🎉 Max level!'}
                        </span>
                        <span>Level {level + 1}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Streak + Daily Challenge ─────────────────────────────────────── */}
          <motion.div variants={fadeUp} className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <StreakWidget />
            <DailyChallenge />
          </motion.div>

          {/* ── Achievements ─────────────────────────────────────────────────── */}
          <motion.div variants={fadeUp}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="text-xl">🏅</span>
                  Achievements
                  {!achLoading && (
                    <Badge variant="secondary" className="ml-1">
                      {userAchievements.length}/{allAchievements.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {achLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full rounded-xl" />
                    ))}
                  </div>
                ) : allAchievements.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                    <span className="text-4xl">🏅</span>
                    <p className="font-medium">No achievements defined yet</p>
                    <p className="text-xs">Come back once achievements have been set up.</p>
                  </div>
                ) : (
                  <motion.div
                    className="space-y-6"
                    variants={stagger}
                    initial="hidden"
                    animate="show"
                  >
                    {Array.from(
                      allAchievements.reduce((map, ach) => {
                        const cat = ach.category ?? 'general';
                        if (!map.has(cat)) map.set(cat, []);
                        map.get(cat)!.push(ach);
                        return map;
                      }, new Map<string, Achievement[]>()),
                    ).map(([category, items]) => (
                      <motion.div key={category} variants={fadeUp}>
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          {category}
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {items.map((ach) => {
                            const ua = userAchievements.find(
                              (u) => u.achievement_key === ach.key,
                            );
                            const earned = !!ua;
                            return (
                              <motion.div key={ach.key} variants={scaleIn}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={[
                                        'relative flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all cursor-default select-none',
                                        earned
                                          ? 'border-primary/30 bg-gradient-to-b from-primary/10 to-primary/5 shadow-sm shadow-primary/10'
                                          : 'border-border bg-muted/30',
                                      ].join(' ')}
                                      style={earned ? undefined : { filter: 'grayscale(1)', opacity: 0.5 }}
                                      aria-label={`${ach.name}${earned ? ' (earned)' : ' (locked)'}`}
                                    >
                                      <span className="text-3xl leading-none">{ach.icon ?? '🏅'}</span>
                                      <span className="text-xs font-semibold leading-tight">{ach.name}</span>
                                      {earned && (
                                        <span className="text-[10px] text-primary font-medium">Earned ✓</span>
                                      )}
                                      {!earned && (
                                        <span className="absolute inset-0 flex items-center justify-center rounded-xl">
                                          <Lock className="h-4 w-4 text-muted-foreground/50" />
                                        </span>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs text-center">
                                    <p className="font-semibold">{ach.name}</p>
                                    <p className="text-muted-foreground text-xs">{ach.description}</p>
                                    <p className="mt-1 text-xs text-primary font-medium">
                                      +{ach.xp_reward} XP
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {earned && ua?.earned_at
                                        ? `Earned ${new Date(ua.earned_at).toLocaleDateString()}`
                                        : 'Not yet earned'}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Leaderboard ─────────────────────────────────────────────────── */}
          <motion.div variants={fadeUp}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lbLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-4 w-6" />
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                    <Trophy className="h-8 w-8 opacity-30" />
                    <p className="font-medium">No leaderboard data yet</p>
                    <p className="text-xs">Start uploading documents to earn XP!</p>
                  </div>
                ) : (
                  <>
                    {/* Podium — top 3 */}
                    {podiumEntries.length > 0 && (
                      <motion.div
                        className="grid grid-cols-3 gap-3 mb-2"
                        variants={stagger}
                        initial="hidden"
                        animate="show"
                      >
                        {podiumEntries.map((entry, idx) => {
                          const rank = idx + 1;
                          const p = PODIUM[rank]!;
                          const isCurrentUser = user?.id === entry.user_id;
                          return (
                            <motion.div
                              key={entry.user_id}
                              variants={scaleIn}
                              className={[
                                'flex flex-col items-center gap-2 rounded-xl border p-3 text-center ring-2',
                                p.bg,
                                p.ring,
                                isCurrentUser ? 'ring-offset-2' : '',
                              ].join(' ')}
                            >
                              <span className="text-2xl">{p.label}</span>
                              <Avatar className={`h-10 w-10 ring-2 ${p.ring}`}>
                                <AvatarImage src={entry.avatar_url ?? undefined} />
                                <AvatarFallback className="text-xs">{getInitials(entry.full_name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className={`text-xs font-bold leading-tight truncate max-w-[80px] ${isCurrentUser ? p.text : ''}`}>
                                  {entry.full_name}
                                </p>
                                <p className={`text-xs font-semibold tabular-nums ${p.text}`}>
                                  {entry.total_xp.toLocaleString()} XP
                                </p>
                              </div>
                              <Badge variant="outline" className={`text-[10px] ${p.text} border-current`}>
                                Lv {entry.level}
                              </Badge>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    )}

                    {/* Rest of the list */}
                    {restEntries.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-xs text-muted-foreground">
                              <th className="px-4 py-2 text-left font-medium">Rank</th>
                              <th className="px-4 py-2 text-left font-medium">User</th>
                              <th className="px-4 py-2 text-center font-medium">Lvl</th>
                              <th className="px-4 py-2 text-right font-medium">XP</th>
                            </tr>
                          </thead>
                          <tbody>
                            {restEntries.map((entry, idx) => {
                              const rank = idx + 4;
                              const isCurrentUser = user?.id === entry.user_id;
                              return (
                                <tr
                                  key={entry.user_id}
                                  className={[
                                    'border-b last:border-0 transition-colors even:bg-muted/30',
                                    isCurrentUser ? 'bg-primary/10 font-semibold' : 'hover:bg-muted/50',
                                  ].join(' ')}
                                >
                                  <td className="px-4 py-3 text-muted-foreground font-medium">{rank}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-7 w-7">
                                        <AvatarImage src={entry.avatar_url ?? undefined} />
                                        <AvatarFallback className="text-xs">
                                          {getInitials(entry.full_name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span>{entry.full_name}</span>
                                      {isCurrentUser && (
                                        <Badge variant="outline" className="text-[10px] py-0">You</Badge>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                      {entry.level}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                                    {entry.total_xp.toLocaleString()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </AppLayout>
    </TooltipProvider>
  );
}
