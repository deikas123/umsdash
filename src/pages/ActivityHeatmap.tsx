import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flame, Clock, Users, Activity } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface HeatmapCell {
  day: number;
  hour: number;
  count: number;
}

export default function ActivityHeatmap() {
  const [period, setPeriod] = useState('30');

  const { data, isLoading } = useQuery({
    queryKey: ['activity-heatmap', period],
    queryFn: async () => {
      const since = subDays(new Date(), parseInt(period)).toISOString();
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('created_at, action, user_id')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      return logs || [];
    },
  });

  // Build heatmap grid
  const heatmapData: HeatmapCell[] = [];
  const cellMap = new Map<string, number>();

  if (data) {
    for (const log of data) {
      const d = new Date(log.created_at);
      const key = `${d.getDay()}-${d.getHours()}`;
      cellMap.set(key, (cellMap.get(key) || 0) + 1);
    }
  }

  for (const day of [0, 1, 2, 3, 4, 5, 6]) {
    for (const hour of HOURS) {
      heatmapData.push({ day, hour, count: cellMap.get(`${day}-${hour}`) || 0 });
    }
  }

  const maxCount = Math.max(1, ...heatmapData.map(c => c.count));

  const getColor = (count: number) => {
    if (count === 0) return 'bg-muted';
    const intensity = count / maxCount;
    if (intensity < 0.25) return 'bg-primary/20';
    if (intensity < 0.5) return 'bg-primary/40';
    if (intensity < 0.75) return 'bg-primary/60';
    return 'bg-primary/90';
  };

  // Top actions
  const actionCounts = new Map<string, number>();
  const uniqueUsers = new Set<string>();
  let peakHour = 0;
  let peakCount = 0;

  if (data) {
    for (const log of data) {
      actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
      if (log.user_id) uniqueUsers.add(log.user_id);
    }
    for (const cell of heatmapData) {
      if (cell.count > peakCount) {
        peakCount = cell.count;
        peakHour = cell.hour;
      }
    }
  }

  const topActions = Array.from(actionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <AppLayout title="Activity Heatmap" description="Visualize peak usage times and user activity patterns">
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{data?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total Actions</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{uniqueUsers.size}</p>
                <p className="text-xs text-muted-foreground">Active Users</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{peakHour}:00</p>
                <p className="text-xs text-muted-foreground">Peak Hour</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Flame className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{peakCount}</p>
                <p className="text-xs text-muted-foreground">Peak Activity</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity Heatmap (Day × Hour)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  {/* Hour labels */}
                  <div className="flex ml-12 mb-1">
                    {HOURS.filter(h => h % 2 === 0).map(h => (
                      <div key={h} className="text-[10px] text-muted-foreground" style={{ width: `${100/12}%`, textAlign: 'center' }}>
                        {h}:00
                      </div>
                    ))}
                  </div>
                  {/* Grid rows */}
                  {DAYS.map((dayName, dayIndex) => (
                    <div key={dayIndex} className="flex items-center gap-1 mb-1">
                      <span className="text-xs text-muted-foreground w-10 text-right">{dayName}</span>
                      <div className="flex gap-[2px] flex-1">
                        {HOURS.map(hour => {
                          const cell = heatmapData.find(c => c.day === dayIndex && c.hour === hour);
                          return (
                            <div
                              key={hour}
                              className={`flex-1 h-6 rounded-sm ${getColor(cell?.count || 0)} transition-colors cursor-default`}
                              title={`${dayName} ${hour}:00 — ${cell?.count || 0} actions`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {/* Legend */}
                  <div className="flex items-center gap-2 mt-3 ml-12">
                    <span className="text-xs text-muted-foreground">Less</span>
                    <div className="h-3 w-3 rounded-sm bg-muted" />
                    <div className="h-3 w-3 rounded-sm bg-primary/20" />
                    <div className="h-3 w-3 rounded-sm bg-primary/40" />
                    <div className="h-3 w-3 rounded-sm bg-primary/60" />
                    <div className="h-3 w-3 rounded-sm bg-primary/90" />
                    <span className="text-xs text-muted-foreground">More</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Most Common Actions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : topActions.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No activity data</p>
            ) : (
              <div className="space-y-3">
                {topActions.map(([action, count]) => {
                  const pct = data ? Math.round((count / data.length) * 100) : 0;
                  return (
                    <div key={action} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">{action.replace(/_/g, ' ')}</span>
                        <span className="text-sm text-muted-foreground">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
