// src/components/festive/YearInReview.tsx
// Dec 26 – Jan 7: Personal 2026 year-in-review card on launcher.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isYearInReview } from '@/lib/festiveCalendar';
import { X, Share2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const YEAR = 2026;
const DISMISS_KEY = `ums_year_review_dismissed_${YEAR}`;

type ReviewData = {
  docsUploaded: number;
  itResolved: number;
  leaveDays: number;
  streakRecord: number;
  monthsActive: number;
};

export function YearInReview() {
  const { user, profile } = useAuth();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  const { data, isLoading } = useQuery<ReviewData>({
    queryKey: ['year-in-review', user?.id, YEAR],
    enabled: !!user && isYearInReview() && !dismissed,
    queryFn: async () => {
      const yearStart = `${YEAR}-01-01`;

      const [docs, streak, hrEmp] = await Promise.all([
        supabase.from('documents').select('*', { count: 'exact', head: true })
          .eq('uploaded_by', user!.id).gte('created_at', yearStart),
        supabase.from('upload_streaks').select('current_streak').eq('user_id', user!.id).maybeSingle(),
        supabase.from('hr_employees').select('id,join_date').eq('email', user!.email ?? '').maybeSingle(),
      ]);

      let leaveDays = 0;
      let itResolved = 0;
      if (hrEmp.data) {
        const [leave, tickets] = await Promise.all([
          supabase.from('hr_leave_requests').select('days')
            .eq('employee_id', hrEmp.data.id).eq('status', 'approved').gte('start_date', yearStart),
          supabase.from('it_tickets').select('*', { count: 'exact', head: true })
            .eq('assigned_technician_id', hrEmp.data.id).in('status', ['resolved','closed']).gte('created_at', yearStart),
        ]);
        leaveDays = (leave.data ?? []).reduce((s, r) => s + (r.days ?? 0), 0);
        itResolved = tickets.count ?? 0;

        // Months active from join date
      }

      const joinDate = hrEmp.data?.join_date ? new Date(hrEmp.data.join_date) : new Date(user!.created_at ?? yearStart);
      const monthsActive = Math.max(1, Math.round((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));

      return {
        docsUploaded: docs.count ?? 0,
        itResolved,
        leaveDays,
        streakRecord: streak.data?.current_streak ?? 0,
        monthsActive: Math.min(monthsActive, 12),
      };
    },
  });

  if (!isYearInReview() || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
  };

  const share = async () => {
    if (!data) return;
    const text = `🎉 My ${YEAR} at UMS Kenya:\n📄 ${data.docsUploaded} documents uploaded\n🎫 ${data.itResolved} IT tickets resolved\n🏖️ ${data.leaveDays} leave days taken\n🔥 ${data.streakRecord}-day streak record\n📅 ${data.monthsActive} months active\n\n#UMSKenya #YearInReview`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Could not copy');
    }
  };

  const stats = data ? [
    { emoji: '📄', value: data.docsUploaded, label: 'Documents uploaded' },
    { emoji: '🎫', value: data.itResolved,   label: 'IT tickets resolved' },
    { emoji: '🏖️', value: data.leaveDays,    label: 'Leave days taken' },
    { emoji: '🔥', value: data.streakRecord, label: 'Day streak record' },
    { emoji: '📅', value: data.monthsActive, label: 'Months active' },
  ] : [];

  return (
    <div className="rounded-xl border bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white p-5 shadow-lg mb-4 relative">
      <button onClick={dismiss} className="absolute top-3 right-3 text-white/60 hover:text-white p-1">
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🎉</span>
        <div>
          <p className="font-bold text-base leading-tight">{YEAR} in review</p>
          <p className="text-xs text-white/70">{profile?.full_name?.split(' ')[0] ?? 'Your'} year at UMS Kenya</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-white/70 text-sm py-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your year…
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
          {stats.map(s => (
            <div key={s.label} className="bg-white/10 rounded-lg p-2 text-center">
              <p className="text-lg">{s.emoji}</p>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-[10px] text-white/70 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {data && (
        <button onClick={share} className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white transition-colors mt-1">
          <Share2 className="h-3 w-3" /> Share
        </button>
      )}
    </div>
  );
}
