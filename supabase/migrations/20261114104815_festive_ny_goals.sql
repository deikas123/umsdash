-- hr_ny_goals
CREATE TABLE IF NOT EXISTS public.hr_ny_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INT NOT NULL,
  goal TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, year)
);

ALTER TABLE public.hr_ny_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ny_goals_own" ON public.hr_ny_goals;
CREATE POLICY "ny_goals_own" ON public.hr_ny_goals
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "ny_goals_hr_read" ON public.hr_ny_goals;
CREATE POLICY "ny_goals_hr_read" ON public.hr_ny_goals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('hr_manager','gm','admin')
    )
  );
