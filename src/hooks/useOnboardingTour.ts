// src/hooks/useOnboardingTour.ts
// Onboarding Tour context, provider, and hook.
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import TourController from '@/components/onboarding/TourController';
import type { Database } from '@/integrations/supabase/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TourStep = {
  title: string;
  body: string;
  selector: string | null;
  route?: string | null;
  placement?: 'center' | 'top' | 'bottom' | 'left' | 'right';
};

export type TourDefinition = Omit<
  Database['public']['Tables']['tour_definitions']['Row'],
  'steps'
> & {
  steps: TourStep[];
};

export type TourStatus = 'not_started' | 'in_progress' | 'completed' | 'dismissed';

export type UserTourProgress =
  Database['public']['Tables']['user_tour_progress']['Row'];

export interface OnboardingTourContextValue {
  activeTour: TourDefinition | null;
  currentStep: number;
  totalSteps: number;
  isOpen: boolean;
  tours: TourDefinition[];
  isLoading: boolean;
  progress: Record<string, UserTourProgress>;
  startTour: (key: string) => void;
  next: () => void;
  prev: () => void;
  close: () => void;
  dismiss: () => void;
  complete: () => void;
  resetTour: (key: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const OnboardingTourContext = createContext<OnboardingTourContextValue | undefined>(
  undefined,
);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function OnboardingTourProvider({ children }: { children: ReactNode }) {
  const { user, loading, role } = useAuth();
  const queryClient = useQueryClient();

  const [activeTour, setActiveTour] = useState<TourDefinition | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const autoStartedRef = useRef<Set<string>>(new Set());

  // ── Query ──────────────────────────────────────────────────────────────────

  const { data: queryData, isLoading } = useQuery({
    queryKey: ['onboarding-tours', user?.id, role],
    enabled: !!user && !loading,
    queryFn: async () => {
      const [defsResult, progressResult] = await Promise.all([
        supabase
          .from('tour_definitions')
          .select('*')
          .order('display_order', { ascending: true }),
        supabase
          .from('user_tour_progress')
          .select('*')
          .eq('user_id', user!.id),
      ]);

      const defs: TourDefinition[] = (defsResult.data ?? []).map((row) => ({
        ...row,
        steps: Array.isArray(row.steps)
          ? (row.steps as TourStep[])
          : JSON.parse(row.steps as string) as TourStep[],
      }));

      const progressRows: UserTourProgress[] = progressResult.data ?? [];

      // Client-filter: active tours for this role
      const filtered = defs.filter(
        (t) =>
          t.is_active &&
          (t.target_role === null || t.target_role === role),
      );

      return { tours: filtered, progressRows };
    },
  });

  // ── Mutation ───────────────────────────────────────────────────────────────

  const upsertProgress = useMutation({
    mutationFn: async (payload: {
      tour_key: string;
      status: string;
      current_step: number;
      completed_at: string | null;
    }) => {
      await supabase.from('user_tour_progress').upsert(
        {
          user_id: user!.id,
          tour_key: payload.tour_key,
          status: payload.status,
          current_step: payload.current_step,
          completed_at: payload.completed_at,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,tour_key' },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-tours'] });
    },
  });

  // ── Derived ────────────────────────────────────────────────────────────────

  const totalSteps = activeTour?.steps.length ?? 0;

  const progress: Record<string, UserTourProgress> = (
    queryData?.progressRows ?? []
  ).reduce<Record<string, UserTourProgress>>((acc, row) => {
    acc[row.tour_key] = row;
    return acc;
  }, {});

  // ── Methods ────────────────────────────────────────────────────────────────

  const startTour = (key: string) => {
    const tour = queryData?.tours.find((t) => t.key === key);
    if (!tour) return;
    setActiveTour(tour);
    setCurrentStep(0);
    setIsOpen(true);
    upsertProgress.mutate({
      tour_key: key,
      status: 'in_progress',
      current_step: 0,
      completed_at: null,
    });
  };

  const next = () => {
    if (!activeTour) return;
    if (currentStep < totalSteps - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      upsertProgress.mutate({
        tour_key: activeTour.key,
        status: 'in_progress',
        current_step: nextStep,
        completed_at: null,
      });
    } else {
      complete();
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const close = () => {
    setIsOpen(false);
    // Does NOT change DB status — keeps 'in_progress'
  };

  const dismiss = () => {
    if (!activeTour) return;
    upsertProgress.mutate({
      tour_key: activeTour.key,
      status: 'dismissed',
      current_step: currentStep,
      completed_at: null,
    });
    setIsOpen(false);
    setActiveTour(null);
  };

  const complete = () => {
    if (!activeTour) return;
    upsertProgress.mutate({
      tour_key: activeTour.key,
      status: 'completed',
      current_step: totalSteps - 1,
      completed_at: new Date().toISOString(),
    });
    setIsOpen(false);
    setActiveTour(null);
  };

  const resetTour = (key: string) => {
    upsertProgress.mutate({
      tour_key: key,
      status: 'not_started',
      current_step: 0,
      completed_at: null,
    });
    // Caller starts tour separately
  };

  // ── Auto-start ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (loading || !user || isOpen || !queryData) return;

    const timer = setTimeout(() => {
      if (isOpen) return; // guard in case state changed during delay
      const first = queryData.tours.find((tour) => {
        if (autoStartedRef.current.has(tour.key)) return false;
        const prog = progress[tour.key];
        return !prog || prog.status === 'not_started';
      });

      if (first) {
        autoStartedRef.current.add(first.key);
        startTour(first.key);
      }
    }, 600);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryData, user]);

  // ── Context value ──────────────────────────────────────────────────────────

  const value: OnboardingTourContextValue = {
    activeTour,
    currentStep,
    totalSteps,
    isOpen,
    tours: queryData?.tours ?? [],
    isLoading,
    progress,
    startTour,
    next,
    prev,
    close,
    dismiss,
    complete,
    resetTour,
  };

  return React.createElement(
    OnboardingTourContext.Provider,
    { value },
    React.createElement(React.Fragment, null,
      children,
      React.createElement(TourController, null),
    ),
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOnboardingTour(): OnboardingTourContextValue {
  const ctx = useContext(OnboardingTourContext);
  if (!ctx) {
    throw new Error('useOnboardingTour must be used within OnboardingTourProvider');
  }
  return ctx;
}
