import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeaderboard } from '@/hooks/useGamification';
import { useAuth } from '@/contexts/AuthContext';

const RANK_EMOJI: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}

export function Leaderboard() {
  const { leaderboard, loading } = useLeaderboard();
  const { user } = useAuth();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">🏆 Leaderboard</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-6" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No data yet — start uploading!</p>
          ) : (
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
                {leaderboard.map((entry, idx) => {
                  const rank = idx + 1;
                  const isCurrentUser = user?.id === entry.user_id;
                  return (
                    <tr
                      key={entry.user_id}
                      className={[
                        'border-b last:border-0 transition-colors',
                        isCurrentUser ? 'bg-primary/10' : 'hover:bg-muted/40',
                      ].join(' ')}
                    >
                      <td className="px-4 py-2 font-medium">
                        {RANK_EMOJI[rank] ?? rank}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={entry.avatar_url ?? undefined} alt={entry.full_name} />
                            <AvatarFallback className="text-xs">
                              {getInitials(entry.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className={isCurrentUser ? 'font-semibold' : ''}>
                            {entry.full_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {entry.level}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-medium tabular-nums">
                        {entry.total_xp.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
