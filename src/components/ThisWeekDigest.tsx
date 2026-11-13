// src/components/ThisWeekDigest.tsx
import { useState } from 'react';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getISOWeek, getYear, startOfWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface DigestData {
  docsThisWeek: number;
  pendingLeave: number;
  openTickets: number;
  holidays: Array<{ name: string; date: string }>;
}

export function ThisWeekDigest() {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const storageKey = `umshub_digest_dismissed_w${getYear(new Date())}-${getISOWeek(new Date())}`;

  const [dismissed, setDismissed] = useState(() => {
    try {
      return !!localStorage.getItem(storageKey);
    } catch {
      return false;
    }
  });

  const { data } = useQuery<DigestData>({
    queryKey: ['this-week-digest'],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const plus14 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      let docsThisWeek = 0;
      let pendingLeave = 0;
      let openTickets = 0;
      let holidays: Array<{ name: string; date: string }> = [];

      try {
        const { count } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', weekStart.toISOString());
        docsThisWeek = count ?? 0;
      } catch {}

      try {
        const { count } = await supabase
          .from('hr_leave_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        pendingLeave = count ?? 0;
      } catch {}

      try {
        const { count } = await supabase
          .from('it_helpdesk_tickets')
          .select('*', { count: 'exact', head: true })
          .in('status', ['open', 'assigned']);
        openTickets = count ?? 0;
      } catch {}

      try {
        const { data: hols } = await supabase
          .from('hr_public_holidays')
          .select('name,date')
          .gte('date', today)
          .lte('date', plus14)
          .order('date')
          .limit(3);
        holidays = hols ?? [];
      } catch {}

      return { docsThisWeek, pendingLeave, openTickets, holidays };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(storageKey, '1');
    } catch {}
    setDismissed(true);
  };

  const chips = [
    { label: 'Docs this week', value: data?.docsThisWeek ?? 0, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    { label: 'Pending leave', value: data?.pendingLeave ?? 0, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
    { label: 'Open tickets', value: data?.openTickets ?? 0, color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
    {
      label: 'Upcoming holiday',
      value: data?.holidays?.length
        ? data.holidays[0].name
        : '—',
      color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    },
  ];

  return (
    <div className="mb-6 rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700/50 px-4 py-3 flex items-start justify-between gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0">
        <span className="text-sm font-semibold text-amber-800 dark:text-amber-200 whitespace-nowrap">
          📋 This Week at UMS
        </span>
        <div className="flex flex-wrap gap-2">
          {chips.map(chip => (
            <span key={chip.label} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${chip.color}`}>
              <span className="font-bold">{chip.value}</span>
              <span className="opacity-80">{chip.label}</span>
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss weekly digest"
        className="flex-shrink-0 rounded-md p-1 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-800/40 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
