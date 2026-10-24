import { useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns';

const DAYS = 84; // 12 weeks

function getColor(count: number): string {
  if (count === 0) return 'bg-muted/30';
  if (count <= 2) return 'bg-green-200 dark:bg-green-900';
  if (count <= 5) return 'bg-green-400 dark:bg-green-700';
  if (count <= 10) return 'bg-green-600 dark:bg-green-500';
  return 'bg-green-800 dark:bg-green-400';
}

export default function CustomerActivity() {
  const { isAdmin } = useAuth();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['customer_activity_heatmap'],
    queryFn: async () => {
      const since = subDays(new Date(), DAYS).toISOString();
      const { data, error } = await supabase
        .from('audit_logs')
        .select('created_at, entity_type, user_id')
        .gte('created_at', since)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const { heatmap, totalEvents, activeCustomers } = useMemo(() => {
    const counts: Record<string, number> = {};
    (logs as any[]).forEach(log => {
      const d = format(startOfDay(new Date(log.created_at)), 'yyyy-MM-dd');
      counts[d] = (counts[d] || 0) + 1;
    });
    const days = eachDayOfInterval({ start: subDays(new Date(), DAYS - 1), end: new Date() });
    const heatmap = days.map(d => ({ date: d, count: counts[format(d, 'yyyy-MM-dd')] || 0 }));
    const uniqueUsers = new Set((logs as any[]).map(l => l.user_id));
    return { heatmap, totalEvents: logs.length, activeCustomers: uniqueUsers.size };
  }, [logs]);

  if (!isAdmin) return <AppLayout title="Customer Activity"><p className="text-muted-foreground">Admin access required.</p></AppLayout>;

  const weeks: typeof heatmap[] = [];
  for (let i = 0; i < heatmap.length; i += 7) {
    weeks.push(heatmap.slice(i, i + 7));
  }

  return (
    <AppLayout title="Customer Activity" description="Document activity heatmap from audit logs">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{totalEvents}</p><p className="text-sm text-muted-foreground">Events (last {DAYS / 7} weeks)</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{activeCustomers}</p><p className="text-sm text-muted-foreground">Active users</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{heatmap.filter(d => d.count > 0).length}</p><p className="text-sm text-muted-foreground">Active days</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Activity Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-32 w-full" /> : (
            <div className="overflow-x-auto">
              <div className="flex gap-1">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-1">
                    {week.map((day, di) => (
                      <div
                        key={di}
                        title={`${format(day.date, 'MMM d')}: ${day.count} events`}
                        className={`w-3 h-3 rounded-sm ${getColor(day.count)} cursor-pointer transition-opacity hover:opacity-75`}
                      />
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <span>Less</span>
                {[0, 2, 5, 10, 15].map(n => (
                  <div key={n} className={`w-3 h-3 rounded-sm ${getColor(n)}`} />
                ))}
                <span>More</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
