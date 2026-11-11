-- ============================================================
-- IT employee metadata overlay — links HR employees to IT-specific
-- fields without duplicating HR data.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.it_employee_meta (
  id                 UUID                NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hr_employee_id     UUID                NOT NULL UNIQUE REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  account_username   TEXT                NOT NULL DEFAULT '',
  identity_provider  TEXT                NOT NULL DEFAULT 'local',
  account_status     public.it_account_status NOT NULL DEFAULT 'active',
  mfa_enrolled       BOOLEAN             NOT NULL DEFAULT false,
  notes              TEXT,
  created_at         TIMESTAMPTZ         NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ         NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_it_empmeta_hr ON public.it_employee_meta(hr_employee_id);
ALTER TABLE public.it_employee_meta ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER it_empmeta_updated_at BEFORE UPDATE ON public.it_employee_meta
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "it_empmeta_select" ON public.it_employee_meta FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_empmeta_all"    ON public.it_employee_meta FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());
