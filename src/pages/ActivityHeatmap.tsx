import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Flame, Clock, Users, Activity } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/PageHeader';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface HeatmapCell {
  day: number;
  hour: number;
  count: number;
}

const LEGEND_STEPS = [
  { label: 'None', cls: 'bg-muted' },
  { label: 'Low', cls: 'bg-primary/20' },
  { label: 'Medium', cls: 'bg-primary/45' },
  { label: 'High', cls: 'bg-primary/70' },
  { label: 'Very High', cls: 'bg-primary/95' },
];

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

  const maxCount = Math.max(1, ...heatmapData.map((c) => c.count));

  const getColorClass = (count: number) => {
    if (count === 0) return 'bg-muted hover:bg-muted/70';
    const intensity = count / maxCount;
    if (intensity < 0.25) return 'bg-primary/20 hover:bg-primary/30';
    if (intensity < 0.5) return 'bg-primary/45 hover:bg-primary/55';
    if (intensity < 0.75) return 'bg-primary/70 hover:bg-primary/80';
    return 'bg-primary/95 hover:bg-primary';
  };

  // Stats
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

  const statCards = [
    { icon: Activity, label: 'Total Actions', value: data?.length || 0, color: 'text-primary' },
    { icon: Users, label: 'Active Users', value: uniqueUsers.size, color: 'text-blue-500' },
    { icon: Clock, label: 'Peak Hour', value: `${peakHour}:00`, color: 'text-amber-500' },
    { icon: Flame, label: 'Peak Activity', value: peakCount, color: 'text-orange-500' },
  ];

  return (
    <AppLayout title="Activity Heatmap" description="Visualize peak usage times and user activity patterns">
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <PageHeader
          title="Activity Heatmap"
          description="Visualize peak usage times and user activity patterns"
          actions={
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
          }
        />

        {/* Summary Stats */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          {statCards.map(({ icon: Icon, label, value, color }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-md bg-muted p-2 flex-shrink-0">
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-6 w-12 mb-1" />
                  ) : (
                    <p className="text-xl font-bold">{value}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Heatmap */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Activity by Day &amp; Hour</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[240px] w-full rounded-lg" />
            ) : (
              <TooltipProvider>
                <div className="overflow-x-auto">
                  <div className="min-w-[580px]">
                    {/* Hour labels — show every 3 hours */}
                    <div className="flex ml-14 mb-1.5 pr-1">
                      {HOURS.map((h) =>
                        h % 3 === 0 ? (
                          <div
                            key={h}
                            className="text-[10px] text-muted-foreground flex-1 text-center leading-none"
                          >
                            {h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`}
                          </div>
                        ) : (
                          <div key={h} className="flex-1" />
                        )
                      )}
                    </div>

                    {/* Grid rows */}
                    {DAYS.map((dayName, dayIndex) => (
                      <div key={dayIndex} className="flex items-center gap-1 mb-1">
                        <span className="text-xs font-medium text-muted-foreground w-12 text-right pr-2">
                          {dayName}
                        </span>
                        <div className="flex gap-[3px] flex-1">
                          {HOURS.map((hour) => {
                            const cell = heatmapData.find(
                              (c) => c.day === dayIndex && c.hour === hour,
                            );
                            const count = cell?.count || 0;
                            return (
                              <Tooltip key={hour}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`flex-1 h-6 rounded-sm transition-all cursor-default ${getColorClass(count)}`}
                                  />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  <span className="font-medium">{dayName} {hour}:00–{hour + 1}:00</span>
                                  <br />
                                  {count === 0 ? 'No activity' : `${count} action${count === 1 ? '' : 's'}`}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Legend */}
                    <div className="flex items-center gap-3 mt-4 ml-14">
                      <span className="text-xs text-muted-foreground">Activity level:</span>
                      {LEGEND_STEPS.map(({ label, cls }) => (
                        <div key={label} className="flex items-center gap-1">
                          <div className={`h-3.5 w-3.5 rounded-sm ${cls}`} />
                          <span className="text-[10px] text-muted-foreground">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>

        {/* Top Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Most Common Actions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-2.5 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : topActions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Activity className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">No activity data for this period</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topActions.map(([action, count], i) => {
                  const pct = data ? Math.round((count / data.length) * 100) : 0;
                  return (
                    <div key={action} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">
                          {action.replace(/_/g, ' ')}
                        </span>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{count.toLocaleString()}</span>
                          <span className="text-xs bg-muted rounded px-1 py-0.5">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AppLayout>
  );
}
