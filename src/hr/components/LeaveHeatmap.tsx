import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addDays, startOfYear, getDay, getDaysInYear, format, parseISO } from 'date-fns';

function heatColor(count: number, dark = false): string {
  if (count === 0) return dark ? 'bg-muted' : 'bg-muted';
  if (count === 1) return dark ? 'dark:bg-emerald-800 bg-emerald-200' : 'bg-emerald-200';
  if (count <= 3) return dark ? 'dark:bg-emerald-600 bg-emerald-400' : 'bg-emerald-400';
  return dark ? 'dark:bg-emerald-400 bg-emerald-600' : 'bg-emerald-600';
}

export function LeaveHeatmap() {
  const [tooltip, setTooltip] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  const year = new Date().getFullYear();

  const { data: rawLeaves = [], isLoading } = useQuery({
    queryKey: ['leave-heatmap', year],
    queryFn: async () => {
      const { data } = await supabase
        .from('hr_leave_requests')
        .select('start_date, end_date')
        .eq('status', 'approved')
        .gte('start_date', `${year}-01-01`)
        .lte('end_date', `${year}-12-31`);
      return data ?? [];
    },
  });

  // Build date -> count map
  const dateMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const leave of rawLeaves) {
      let cur = parseISO(leave.start_date);
      const end = parseISO(leave.end_date);
      while (cur <= end) {
        const key = format(cur, 'yyyy-MM-dd');
        map[key] = (map[key] ?? 0) + 1;
        cur = addDays(cur, 1);
      }
    }
    return map;
  }, [rawLeaves]);

  // Build 53×7 grid
  const yearStart = startOfYear(new Date(year, 0, 1));
  // Offset so grid column 0 = Sunday
  const startOffset = getDay(yearStart); // 0=Sun … 6=Sat
  const daysInYear = getDaysInYear(new Date(year, 0, 1));

  // Weeks × days grid: cells[weekIndex][dayIndex] = date string | null
  const totalCells = 53 * 7;
  const cells: (string | null)[] = Array(totalCells).fill(null);
  for (let i = 0; i < daysInYear; i++) {
    const d = addDays(yearStart, i);
    cells[startOffset + i] = format(d, 'yyyy-MM-dd');
  }

  // Month labels: find first column index for each month
  const monthLabels: { month: string; col: number }[] = [];
  let lastMonth = -1;
  for (let col = 0; col < 53; col++) {
    for (let row = 0; row < 7; row++) {
      const cell = cells[col * 7 + row];
      if (cell) {
        const m = parseISO(cell).getMonth();
        if (m !== lastMonth) {
          monthLabels.push({ month: format(parseISO(cell), 'MMM'), col });
          lastMonth = m;
        }
        break;
      }
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="bg-card rounded-lg border p-6 shadow-sm relative">
      <h2 className="font-semibold mb-4">Leave Heatmap — {year}</h2>

      <div className="overflow-x-auto pb-2">
        <div className="inline-block min-w-max">
          {/* Month labels */}
          <div className="flex mb-1" style={{ gap: '2px' }}>
            {Array.from({ length: 53 }).map((_, col) => {
              const lbl = monthLabels.find(m => m.col === col);
              return (
                <div key={col} className="w-3 text-[9px] text-muted-foreground leading-none flex-shrink-0">
                  {lbl ? lbl.month : ''}
                </div>
              );
            })}
          </div>

          {/* Day rows */}
          {[0, 1, 2, 3, 4, 5, 6].map(row => (
            <div key={row} className="flex" style={{ gap: '2px', marginBottom: '2px' }}>
              {Array.from({ length: 53 }).map((_, col) => {
                const cell = cells[col * 7 + row];
                const count = cell ? (dateMap[cell] ?? 0) : 0;
                const colorCls = cell ? heatColor(count) : 'bg-transparent';
                return (
                  <div
                    key={col}
                    className={`w-3 h-3 rounded-sm flex-shrink-0 ${colorCls} ${cell ? 'cursor-pointer' : ''}`}
                    onMouseEnter={e => {
                      if (!cell) return;
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setTooltip({ date: cell, count, x: rect.left + window.scrollX, y: rect.top + window.scrollY });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-popover text-popover-foreground border rounded-md px-2 py-1 text-xs shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y - 32 }}
        >
          <span className="font-medium">{format(parseISO(tooltip.date), 'dd MMM yyyy')}</span>
          {' · '}
          <span>{tooltip.count} {tooltip.count === 1 ? 'person on leave' : 'people on leave'}</span>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
        <span>Less</span>
        {['bg-muted', 'bg-emerald-200', 'bg-emerald-400', 'bg-emerald-600'].map(c => (
          <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
