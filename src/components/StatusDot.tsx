import { STATUS_CONFIG, UserStatusValue } from '@/hooks/useUserStatus';

interface StatusDotProps {
  status: UserStatusValue;
  className?: string;
}

export function StatusDot({ status, className = '' }: StatusDotProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.away;
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 ${cfg.dot} ${className}`}
      title={cfg.label}
      aria-label={cfg.label}
    />
  );
}
