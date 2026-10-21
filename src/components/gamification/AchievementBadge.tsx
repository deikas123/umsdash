import { Lock } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AchievementBadgeProps {
  icon: string;
  name: string;
  description: string;
  earned: boolean;
  earned_at?: string;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function AchievementBadge({
  icon,
  name,
  description,
  earned,
  earned_at,
}: AchievementBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={[
            'relative flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors',
            earned
              ? 'border-primary/30 bg-primary/5 cursor-default'
              : 'border-border bg-muted/40 cursor-default',
          ].join(' ')}
          style={earned ? undefined : { filter: 'grayscale(1)', opacity: 0.5 }}
          aria-label={`${name}${earned ? ' (earned)' : ' (locked)'}`}
        >
          <span className="text-3xl leading-none">{icon}</span>
          <span className="text-xs font-medium leading-tight">{name}</span>

          {!earned && (
            <span className="absolute inset-0 flex items-center justify-center rounded-lg">
              <Lock className="h-5 w-5 text-muted-foreground/60" />
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-center">
        <p className="font-medium">{name}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
        <p className="mt-1 text-xs">
          {earned && earned_at
            ? `Earned ${formatDate(earned_at)}`
            : 'Not yet earned'}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
