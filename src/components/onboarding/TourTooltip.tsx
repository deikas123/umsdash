// src/components/onboarding/TourTooltip.tsx
// Anchored tooltip for steps where step.selector resolves to a DOM element.
import { createPortal } from 'react-dom';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { TourStep } from '@/hooks/useOnboardingTour';

interface TourTooltipProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  targetRect: DOMRect;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onDismiss: () => void;
  isLast: boolean;
}

const TOOLTIP_WIDTH = 280;
const ESTIMATED_HEIGHT = 180;

export function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  onNext,
  onPrev,
  onDismiss,
  isLast,
}: TourTooltipProps) {
  const { left, top, arrowPlacement } = useMemo(() => {
    const placement = step.placement ?? 'bottom';
    let l = 0;
    let t = 0;

    switch (placement) {
      case 'right':
        l = targetRect.right + 12;
        t = targetRect.top;
        break;
      case 'left':
        l = targetRect.left - TOOLTIP_WIDTH - 12;
        t = targetRect.top;
        break;
      case 'top':
        l = targetRect.left;
        t = targetRect.top - 12 - ESTIMATED_HEIGHT;
        break;
      case 'bottom':
      default:
        l = targetRect.left;
        t = targetRect.bottom + 12;
        break;
    }

    // Clamp to viewport
    l = Math.max(8, Math.min(l, window.innerWidth - TOOLTIP_WIDTH - 8));
    t = Math.max(8, Math.min(t, window.innerHeight - 200));

    return { left: l, top: t, arrowPlacement: placement };
  }, [step.placement, targetRect]);

  const arrowClasses = useMemo(() => {
    switch (arrowPlacement) {
      case 'right':
        return 'absolute left-[-4px] top-3 rotate-45';
      case 'left':
        return 'absolute right-[-4px] top-3 rotate-45';
      case 'top':
        return 'absolute bottom-[-4px] left-3 rotate-45';
      case 'bottom':
      default:
        return 'absolute top-[-4px] left-3 rotate-45';
    }
  }, [arrowPlacement]);

  return createPortal(
    <motion.div
      style={{ position: 'fixed', left, top, width: TOOLTIP_WIDTH, zIndex: 100 }}
      className="bg-popover text-popover-foreground border rounded-lg shadow-xl p-4"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15 }}
    >
      {/* Arrow */}
      <div
        className={`${arrowClasses} h-2 w-2 bg-popover border`}
        aria-hidden="true"
      />

      {/* Content */}
      <h3 className="font-semibold text-sm">{step.title}</h3>
      <p className="text-sm mt-1 text-muted-foreground">{step.body}</p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3">
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Skip tour
        </Button>
        <div className="flex items-center gap-2">
          {stepIndex > 0 && (
            <Button variant="outline" size="sm" onClick={onPrev}>
              ← Prev
            </Button>
          )}
          <Button size="sm" onClick={onNext}>
            {isLast ? 'Finish' : 'Next →'}
          </Button>
        </div>
      </div>

      {/* Dot progress */}
      <div
        className="flex items-center justify-center gap-1.5 mt-3"
        aria-label={`Step ${stepIndex + 1} of ${totalSteps}`}
      >
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              i === stepIndex ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>
    </motion.div>,
    document.body,
  );
}

export default TourTooltip;
