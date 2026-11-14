-- hr_secret_santa_assignments
CREATE TABLE IF NOT EXISTS public.hr_secret_santa_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  giver_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  year INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, giver_id)
);

ALTER TABLE public.hr_secret_santa_assignments ENABLE ROW LEVEL SECURITY;

-- HR/GM can see all; employees see only their own giver row
DROP POLICY IF EXISTS "santa_hr_all" ON public.hr_secret_santa_assignments;
CREATE POLICY "santa_hr_all" ON public.hr_secret_santa_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('hr_manager','gm','admin')
    )
  );

DROP POLICY IF EXISTS "santa_own" ON public.hr_secret_santa_assignments;
CREATE POLICY "santa_own" ON public.hr_secret_santa_assignments
  FOR SELECT TO authenticated
  USING (
    giver_id IN (
      SELECT e.id FROM public.hr_employees e
        JOIN public.profiles p ON p.employee_id = e.id
       WHERE p.id = auth.uid()
    )
  );
