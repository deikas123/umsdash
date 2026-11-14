// src/components/festive/HolidayCountdown.tsx
import { useState, useEffect } from 'react';
import { isFestivePeriod, isYearInReview } from '@/lib/festiveCalendar';
import { X } from 'lucide-react';

function getTarget(): { label: string; emoji: string; date: Date } | null {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();

  if (m === 12 && d >= 24 && d <= 26)
    return { label: 'Happy Holidays', emoji: '🎁', date: new Date(now.getFullYear(), 11, 25) };
  if (m === 12 && d < 24)
    return { label: 'Christmas', emoji: '🎄', date: new Date(now.getFullYear(), 11, 25) };
  if ((m === 12 && d >= 27) || (m === 1 && d < 1))
    return { label: 'New Year', emoji: '🎆', date: new Date(now.getFullYear() + 1, 0, 1) };
  if (m === 1 && d === 1)
    return { label: '🎆 Happy New Year!', emoji: '🎉', date: new Date() };
  return null;
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return '🎉';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  return `${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
}

export function HolidayCountdown() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('ums_holiday_countdown_dismissed') === new Date().getFullYear().toString(); } catch { return false; }
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const show = isFestivePeriod() || isYearInReview();
  if (!show || dismissed) return null;

  const target = getTarget();
  if (!target) return null;

  const msLeft = target.date.getTime() - Date.now();
  const timeStr = formatTimeLeft(msLeft);

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem('ums_holiday_countdown_dismissed', new Date().getFullYear().toString()); } catch {}
  };

  return (
    <div className="rounded-xl border bg-gradient-to-r from-red-600/90 via-green-700/90 to-red-600/90 text-white p-3 shadow-md mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{target.emoji}</span>
        <div>
          <p className="text-xs text-white/70 leading-none">{target.label} in</p>
          <p className="text-xl font-bold font-mono tracking-wide leading-tight">{timeStr}</p>
        </div>
      </div>
      <button onClick={dismiss} className="text-white/60 hover:text-white p-1" title="Dismiss">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
