import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

const SLA_HOURS: Record<string, number> = {
  urgent: 2,
  high: 4,
  medium: 8,
  low: 24,
};

interface SlaCountdownProps {
  createdAt: string;
  priority: string;
  status: string;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return 'OVERDUE';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function SlaCountdown({ createdAt, priority, status }: SlaCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  const isClosed = ['resolved', 'closed'].includes(status);

  useEffect(() => {
    if (isClosed) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isClosed]);

  if (isClosed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        Closed
      </span>
    );
  }

  const slaHours = SLA_HOURS[priority] ?? SLA_HOURS.medium;
  const totalMs = slaHours * 60 * 60 * 1000;
  const elapsed = now - new Date(createdAt).getTime();
  const remaining = totalMs - elapsed;
  const pct = Math.max(0, remaining / totalMs);

  const colorClass =
    pct > 0.5
      ? 'text-green-600 dark:text-green-400'
      : pct > 0.25
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400';

  const label = formatDuration(remaining);

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-mono font-medium ${colorClass}`}>
      <Clock className="h-3 w-3 flex-shrink-0" />
      {label}
    </span>
  );
}
