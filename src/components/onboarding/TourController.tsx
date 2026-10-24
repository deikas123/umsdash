// src/components/onboarding/TourController.tsx
// Global controller — reads context and renders TourModal or TourTooltip.
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { useOnboardingTour } from '@/hooks/useOnboardingTour';
import TourModal from './TourModal';
import TourTooltip from './TourTooltip';

export function TourController() {
  const { isOpen, activeTour, currentStep, totalSteps, next, prev, close, dismiss } =
    useOnboardingTour();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const prevHighlightRef = useRef<Element | null>(null);

  const step = activeTour?.steps[currentStep];
  const isLast = currentStep === totalSteps - 1;

  // Compute target element rect and apply highlight ring
  useEffect(() => {
    // Remove highlight from previous element
    if (prevHighlightRef.current) {
      prevHighlightRef.current.classList.remove(
        'ring-2',
        'ring-primary',
        'ring-offset-2',
        'rounded-lg',
        'outline-none',
      );
      prevHighlightRef.current = null;
    }

    if (!isOpen || !step?.selector) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(`[data-tour="${step.selector}"]`);
    if (!el) {
      setTargetRect(null);
      return;
    }

    setTargetRect(el.getBoundingClientRect());
    el.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'rounded-lg', 'outline-none');
    prevHighlightRef.current = el;

    // rAF-throttled scroll/resize listener to recompute rect
    let rafId: number | null = null;
    const recompute = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const updated = document.querySelector(`[data-tour="${step.selector}"]`);
        if (updated) setTargetRect(updated.getBoundingClientRect());
      });
    };

    window.addEventListener('scroll', recompute, { passive: true });
    window.addEventListener('resize', recompute, { passive: true });

    return () => {
      window.removeEventListener('scroll', recompute);
      window.removeEventListener('resize', recompute);
      if (rafId !== null) cancelAnimationFrame(rafId);
      // Clean up highlight on unmount/step change
      if (prevHighlightRef.current) {
        prevHighlightRef.current.classList.remove(
          'ring-2',
          'ring-primary',
          'ring-offset-2',
          'rounded-lg',
          'outline-none',
        );
        prevHighlightRef.current = null;
      }
    };
  }, [isOpen, activeTour, currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen || !activeTour || !step) return null;

  const showTooltip = !!(step.selector && targetRect);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — only for modal steps (no selector or element not found) */}
          {!showTooltip && (
            <div
              className="fixed inset-0 bg-black/40 z-[90]"
              onClick={close}
              aria-hidden="true"
            />
          )}
          {showTooltip ? (
            <TourTooltip
              step={step}
              stepIndex={currentStep}
              totalSteps={totalSteps}
              targetRect={targetRect}
              onNext={next}
              onPrev={prev}
              onClose={close}
              onDismiss={dismiss}
              isLast={isLast}
            />
          ) : (
            <TourModal
              step={step}
              stepIndex={currentStep}
              totalSteps={totalSteps}
              onNext={next}
              onPrev={prev}
              onClose={close}
              onDismiss={dismiss}
              isLast={isLast}
            />
          )}
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default TourController;
