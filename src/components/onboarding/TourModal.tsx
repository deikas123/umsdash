// src/components/onboarding/TourModal.tsx
// Centered overlay card for steps where step.selector is null.
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { TourStep } from '@/hooks/useOnboardingTour';

interface TourModalProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onDismiss: () => void;
  isLast: boolean;
}

export function TourModal({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onDismiss,
  isLast,
}: TourModalProps) {
  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="max-w-md w-full mx-4"
        >
          <Card>
            <CardHeader>
              <CardTitle>{step.title}</CardTitle>
              <CardDescription>{step.body}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Footer */}
              <div className="flex items-center justify-between mt-2">
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
                className="flex items-center justify-center gap-1.5 mt-4"
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
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}

export default TourModal;
