// src/components/ActivityTimeline.tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { FileText, CalendarDays, Terminal } from 'lucide-react';

interface TimelineItem {
  id: string;
  label: string;
  time: string;
  module: 'docs' | 'hr' | 'it';
  colorClass: string;
  Icon: React.ElementType;
}

function ModuleBadge({ module }: { module: string }) {
  const colors: Record<string, string> = {
    docs: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    hr: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    it: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide ${colors[module] ?? 'bg-muted text-muted-foreground'}`}>
      {module}
    </span>
  );
}

export function ActivityTimeline() {
  const { data: items = [], isLoading } = useQuery<TimelineItem[]>({
    queryKey: ['cross-module-activity-timeline'],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const all: TimelineItem[] = [];

      // a. Documents
      try {
        const { data } = await supabase
          .from('documents')
          .select('id, title, created_at')
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(20);
        (data ?? []).forEach((d) => {
          all.push({
            id: `docs-${d.id}`,
            label: d.title ?? 'Untitled document',
            time: d.created_at,
            module: 'docs',
            colorClass: 'text-blue-500',
            Icon: FileText,
          });
        });
      } catch (_) { /* ignore */ }

      // b. HR leave requests
      try {
        const { data } = await supabase
          .from('hr_leave_requests')
          .select('id, leave_type, created_at, status')
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(20);
        (data ?? []).forEach((r) => {
          all.push({
            id: `hr-${r.id}`,
            label: `${(r.leave_type ?? 'Leave').replace(/_/g, ' ')} request · ${r.status ?? 'pending'}`,
            time: r.created_at,
            module: 'hr',
            colorClass: 'text-orange-500',
            Icon: CalendarDays,
          });
        });
      } catch (_) { /* ignore */ }

      // c. IT helpdesk tickets
      try {
        const { data } = await supabase
          .from('it_helpdesk_tickets')
          .select('id, title, created_at, priority')
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(20);
        (data ?? []).forEach((t) => {
          all.push({
            id: `it-${t.id}`,
            label: t.title ?? 'Support ticket',
            time: t.created_at,
            module: 'it',
            colorClass: 'text-cyan-500',
            Icon: Terminal,
          });
        });
      } catch (_) { /* ignore */ }

      // Sort descending by time, take top 15
      all.sort((a, b) => b.time.localeCompare(a.time));
      return all.slice(0, 15);
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="mt-1 h-3 w-3 rounded-full bg-muted flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-2 bg-muted rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">No activity in the last 7 days</div>
    );
  }

  return (
    <div className="p-4">
      <div className="relative pl-4 border-l border-border space-y-4">
        {items.map((item) => {
          const { Icon } = item;
          return (
            <div key={item.id} className="relative flex gap-3 group">
              {/* Dot on the vertical line */}
              <span
                className={`absolute -left-[21px] mt-1 h-3 w-3 rounded-full border-2 border-background ${item.colorClass.replace('text-', 'bg-')}`}
              />
              {/* Icon */}
              <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${item.colorClass}`} />
              {/* Content */}
              <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-foreground leading-snug truncate">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
                  </p>
                </div>
                <ModuleBadge module={item.module} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
