-- ============================================================
-- HR Hub schema — all tables prefixed hr_ to avoid conflicts
-- Merged into shared Supabase project mmnpopwzfjyfasvzzatg
-- ============================================================

-- ── Extend existing app_role enum ──
-- 'staff' already exists and is shared
-- 'hr' would be a SQL keyword conflict; use 'hr_manager'
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gm';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hr_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hod';

-- ── Extend profiles table with HR fields ──
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS staff_number   text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS designation    text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hr_employee_id uuid;  -- FK added after hr_employees is created
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hr_department  text;  -- denormalized for quick reads

-- ── HR-specific enums ──
DO $$ BEGIN
  CREATE TYPE public.hr_employee_status   AS ENUM ('active', 'inactive', 'terminated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hr_leave_type AS ENUM ('annual', 'sick', 'maternity', 'paternity', 'compassionate', 'study');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hr_leave_status AS ENUM ('pending_hod', 'pending_hr', 'pending_gm', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hr_loan_status AS ENUM ('pending', 'active', 'paid', 'defaulted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hr_attendance_status AS ENUM ('present', 'absent', 'late', 'half_day', 'on_leave');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hr_overtime_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hr_overtime_rate_type AS ENUM ('1.5x', '2x');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hr_checklist_type AS ENUM ('onboarding', 'offboarding');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hr_checklist_status AS ENUM ('in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hr_announcement_audience AS ENUM ('all', 'department', 'role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hr_suggestion_category AS ENUM ('suggestion', 'complaint', 'whistleblower', 'compliment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hr_suggestion_status AS ENUM ('new', 'reviewing', 'actioned', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hr_survey_status AS ENUM ('draft', 'active', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── RLS helper functions (hr_ prefixed) ──

CREATE OR REPLACE FUNCTION public.hr_is_hr_or_gm()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('hr_manager', 'gm')
  )
$$;

CREATE OR REPLACE FUNCTION public.hr_has_role(_user_id UUID, _role text)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.hr_get_my_employee_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT hr_employee_id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- ── hr_departments ──
CREATE TABLE IF NOT EXISTS public.hr_departments (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL UNIQUE,
  description TEXT,
  hod_user_id UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_departments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER hr_dept_updated_at BEFORE UPDATE ON public.hr_departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "hr_dept_select" ON public.hr_departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "hr_dept_all"    ON public.hr_departments FOR ALL    TO authenticated USING (public.hr_is_hr_or_gm()) WITH CHECK (public.hr_is_hr_or_gm());

-- ── hr_employees ──
CREATE TABLE IF NOT EXISTS public.hr_employees (
  id                   UUID              NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID              REFERENCES auth.users(id) ON DELETE SET NULL,
  staff_number         TEXT              NOT NULL UNIQUE,
  first_name           TEXT              NOT NULL,
  last_name            TEXT              NOT NULL,
  email                TEXT              NOT NULL,
  id_number            TEXT              NOT NULL DEFAULT '',
  kra_pin              TEXT              NOT NULL DEFAULT '',
  nssf_no              TEXT              NOT NULL DEFAULT '',
  nhif_no              TEXT              NOT NULL DEFAULT '',
  phone                TEXT              NOT NULL DEFAULT '',
  department_id        UUID              REFERENCES public.hr_departments(id),
  designation          TEXT              NOT NULL DEFAULT '',
  basic_pay            NUMERIC(12,2)     NOT NULL DEFAULT 0,
  house_allowance      NUMERIC(12,2)     NOT NULL DEFAULT 0,
  transport_allowance  NUMERIC(12,2)     NOT NULL DEFAULT 0,
  other_allowance      NUMERIC(12,2)     NOT NULL DEFAULT 0,
  bank_name            TEXT              NOT NULL DEFAULT '',
  bank_branch          TEXT              NOT NULL DEFAULT '',
  account_number       TEXT              NOT NULL DEFAULT '',
  bank_code            TEXT              NOT NULL DEFAULT '',
  join_date            DATE              NOT NULL DEFAULT CURRENT_DATE,
  status               hr_employee_status NOT NULL DEFAULT 'active',
  annual_leave_days    INT               NOT NULL DEFAULT 21,
  used_leave_days      INT               NOT NULL DEFAULT 0,
  date_of_birth        DATE,
  created_at           TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ       NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_employees ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER hr_emp_updated_at BEFORE UPDATE ON public.hr_employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "hr_emp_hr_gm"  ON public.hr_employees FOR ALL    TO authenticated USING (public.hr_is_hr_or_gm()) WITH CHECK (public.hr_is_hr_or_gm());
CREATE POLICY "hr_emp_hod"    ON public.hr_employees FOR SELECT TO authenticated
  USING (department_id IN (SELECT id FROM public.hr_departments WHERE hod_user_id = auth.uid()));
CREATE POLICY "hr_emp_self"   ON public.hr_employees FOR SELECT TO authenticated
  USING (id = public.hr_get_my_employee_id());

-- Add FK from profiles to hr_employees now that hr_employees exists
ALTER TABLE public.profiles
  ADD CONSTRAINT IF NOT EXISTS profiles_hr_employee_id_fkey
  FOREIGN KEY (hr_employee_id) REFERENCES public.hr_employees(id) ON DELETE SET NULL;

-- Helper: is user HOD of given hr_department
CREATE OR REPLACE FUNCTION public.hr_is_hod_of_department(_dept_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hr_departments
    WHERE id = _dept_id AND hod_user_id = auth.uid()
  )
$$;

-- ── hr_company_settings ──
CREATE TABLE IF NOT EXISTS public.hr_company_settings (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key        TEXT        NOT NULL UNIQUE,
  value      TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_company_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER hr_settings_updated_at BEFORE UPDATE ON public.hr_company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "hr_settings_select" ON public.hr_company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "hr_settings_all"    ON public.hr_company_settings FOR ALL    TO authenticated USING (public.hr_is_hr_or_gm()) WITH CHECK (public.hr_is_hr_or_gm());
INSERT INTO public.hr_company_settings (key, value) VALUES
  ('company_name',          'UMS KENYA LTD'),
  ('kra_pin',               'P051234567Z'),
  ('nssf_employer_no',      '12345'),
  ('default_annual_leave',  '21'),
  ('sick_leave_days',       '14'),
  ('maternity_leave_days',  '90'),
  ('paternity_leave_days',  '13'),
  ('payroll_month_default', ''),
  ('logo_url',              '')
ON CONFLICT (key) DO NOTHING;

-- ── hr_leave_requests ──
CREATE TABLE IF NOT EXISTS public.hr_leave_requests (
  id               UUID              NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id      UUID              NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  leave_type       hr_leave_type     NOT NULL,
  start_date       DATE              NOT NULL,
  end_date         DATE              NOT NULL,
  days             INT               NOT NULL,
  reason           TEXT              NOT NULL DEFAULT '',
  status           hr_leave_status   NOT NULL DEFAULT 'pending_hod',
  hod_approval     JSONB,
  hr_approval      JSONB,
  gm_approval      JSONB,
  document_url     TEXT,
  contact_phone    TEXT              DEFAULT '',
  contact_email    TEXT              DEFAULT '',
  next_of_kin      TEXT              DEFAULT '',
  next_of_kin_phone TEXT             DEFAULT '',
  reliever_name    TEXT              DEFAULT '',
  created_at       TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ       NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_leave_requests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER hr_leave_updated_at BEFORE UPDATE ON public.hr_leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "hr_leave_hrgm" ON public.hr_leave_requests FOR ALL    TO authenticated USING (public.hr_is_hr_or_gm()) WITH CHECK (public.hr_is_hr_or_gm());
CREATE POLICY "hr_leave_hod_select" ON public.hr_leave_requests FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.hr_employees WHERE public.hr_is_hod_of_department(department_id)));
CREATE POLICY "hr_leave_hod_update" ON public.hr_leave_requests FOR UPDATE TO authenticated
  USING (employee_id IN (SELECT id FROM public.hr_employees WHERE public.hr_is_hod_of_department(department_id)));
CREATE POLICY "hr_leave_self_select" ON public.hr_leave_requests FOR SELECT TO authenticated USING (employee_id = public.hr_get_my_employee_id());
CREATE POLICY "hr_leave_self_insert" ON public.hr_leave_requests FOR INSERT TO authenticated WITH CHECK (employee_id = public.hr_get_my_employee_id());
ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_leave_requests;

-- ── hr_payroll_records ──
CREATE TABLE IF NOT EXISTS public.hr_payroll_records (
  id                   UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id          UUID          NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  month                TEXT          NOT NULL,
  basic_pay            NUMERIC(12,2) NOT NULL DEFAULT 0,
  house_allowance      NUMERIC(12,2) NOT NULL DEFAULT 0,
  transport_allowance  NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_allowance      NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime             NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus                NUMERIC(12,2) NOT NULL DEFAULT 0,
  leave_pay            NUMERIC(12,2) NOT NULL DEFAULT 0,
  gross_pay            NUMERIC(12,2) NOT NULL DEFAULT 0,
  pensionable_pay      NUMERIC(12,2) NOT NULL DEFAULT 0,
  employer_nssf        NUMERIC(12,2) NOT NULL DEFAULT 0,
  employee_nssf        NUMERIC(12,2) NOT NULL DEFAULT 0,
  taxable_pay          NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_payable          NUMERIC(12,2) NOT NULL DEFAULT 0,
  insurance_relief     NUMERIC(12,2) NOT NULL DEFAULT 0,
  personal_relief      NUMERIC(12,2) NOT NULL DEFAULT 0,
  paye                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  shif                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  housing_levy         NUMERIC(12,2) NOT NULL DEFAULT 0,
  loan_deduction       NUMERIC(12,2) NOT NULL DEFAULT 0,
  insurance_deduction  NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_deduction      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_deductions     NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_pay              NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE(employee_id, month)
);
ALTER TABLE public.hr_payroll_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_pay_hrgm"        ON public.hr_payroll_records FOR ALL    TO authenticated USING (public.hr_is_hr_or_gm()) WITH CHECK (public.hr_is_hr_or_gm());
CREATE POLICY "hr_pay_hod_select"  ON public.hr_payroll_records FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.hr_employees WHERE public.hr_is_hod_of_department(department_id)));
CREATE POLICY "hr_pay_self_select" ON public.hr_payroll_records FOR SELECT TO authenticated USING (employee_id = public.hr_get_my_employee_id());

-- ── hr_loans ──
CREATE TABLE IF NOT EXISTS public.hr_loans (
  id                   UUID           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id          UUID           NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  loan_type            TEXT           NOT NULL DEFAULT 'salary_advance',
  amount               NUMERIC(12,2)  NOT NULL,
  balance              NUMERIC(12,2)  NOT NULL,
  monthly_deduction    NUMERIC(12,2)  NOT NULL DEFAULT 0,
  status               hr_loan_status NOT NULL DEFAULT 'pending',
  start_date           DATE,
  end_date             DATE,
  deduction_start_date DATE,
  description          TEXT,
  created_at           TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ    NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_loans ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER hr_loans_updated_at BEFORE UPDATE ON public.hr_loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "hr_loans_hrgm"       ON public.hr_loans FOR ALL    TO authenticated USING (public.hr_is_hr_or_gm()) WITH CHECK (public.hr_is_hr_or_gm());
CREATE POLICY "hr_loans_hod_select" ON public.hr_loans FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.hr_employees WHERE public.hr_is_hod_of_department(department_id)));
CREATE POLICY "hr_loans_self"       ON public.hr_loans FOR SELECT TO authenticated USING (employee_id = public.hr_get_my_employee_id());

-- ── hr_loan_payments ──
CREATE TABLE IF NOT EXISTS public.hr_loan_payments (
  id           UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id      UUID          NOT NULL REFERENCES public.hr_loans(id) ON DELETE CASCADE,
  amount       NUMERIC(12,2) NOT NULL,
  payment_date DATE          NOT NULL DEFAULT CURRENT_DATE,
  notes        TEXT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_loan_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_loanpay_hrgm" ON public.hr_loan_payments FOR ALL    TO authenticated USING (public.hr_is_hr_or_gm()) WITH CHECK (public.hr_is_hr_or_gm());
CREATE POLICY "hr_loanpay_self" ON public.hr_loan_payments FOR SELECT TO authenticated
  USING (loan_id IN (SELECT id FROM public.hr_loans WHERE employee_id = public.hr_get_my_employee_id()));

-- ── hr_attendance ──
CREATE TABLE IF NOT EXISTS public.hr_attendance (
  id          UUID                  NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID                  NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  date        DATE                  NOT NULL DEFAULT CURRENT_DATE,
  clock_in    TIME,
  clock_out   TIME,
  status      hr_attendance_status  NOT NULL DEFAULT 'present',
  notes       TEXT                  DEFAULT '',
  created_at  TIMESTAMPTZ           NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ           NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);
ALTER TABLE public.hr_attendance ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER hr_att_updated_at BEFORE UPDATE ON public.hr_attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "hr_att_hrgm"       ON public.hr_attendance FOR ALL    TO authenticated USING (public.hr_is_hr_or_gm()) WITH CHECK (public.hr_is_hr_or_gm());
CREATE POLICY "hr_att_hod_select" ON public.hr_attendance FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.hr_employees WHERE public.hr_is_hod_of_department(department_id)));
CREATE POLICY "hr_att_self"       ON public.hr_attendance FOR SELECT TO authenticated USING (employee_id = public.hr_get_my_employee_id());

-- ── hr_overtime_requests ──
CREATE TABLE IF NOT EXISTS public.hr_overtime_requests (
  id             UUID                   NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id    UUID                   NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  work_date      DATE                   NOT NULL,
  hours          NUMERIC(5,2)           NOT NULL CHECK (hours > 0 AND hours <= 24),
  rate_type      hr_overtime_rate_type  NOT NULL DEFAULT '1.5x',
  reason         TEXT                   NOT NULL DEFAULT '',
  status         hr_overtime_status     NOT NULL DEFAULT 'pending',
  approver_id    UUID,
  approver_notes TEXT,
  approved_at    TIMESTAMPTZ,
  payroll_month  TEXT                   NOT NULL,
  created_at     TIMESTAMPTZ            NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ            NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hr_ot_employee ON public.hr_overtime_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_ot_month    ON public.hr_overtime_requests(payroll_month, status);
ALTER TABLE public.hr_overtime_requests ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.hr_set_overtime_payroll_month()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.payroll_month = to_char(NEW.work_date, 'YYYY-MM'); RETURN NEW; END; $$;
CREATE TRIGGER hr_ot_payroll_month BEFORE INSERT OR UPDATE OF work_date ON public.hr_overtime_requests
  FOR EACH ROW EXECUTE FUNCTION public.hr_set_overtime_payroll_month();
CREATE TRIGGER hr_ot_updated_at BEFORE UPDATE ON public.hr_overtime_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "hr_ot_self_select" ON public.hr_overtime_requests FOR SELECT TO authenticated USING (employee_id = public.hr_get_my_employee_id());
CREATE POLICY "hr_ot_self_insert" ON public.hr_overtime_requests FOR INSERT TO authenticated WITH CHECK (employee_id = public.hr_get_my_employee_id() AND status = 'pending');
CREATE POLICY "hr_ot_hod_select"  ON public.hr_overtime_requests FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.hr_employees WHERE public.hr_is_hod_of_department(department_id)));
CREATE POLICY "hr_ot_hod_update"  ON public.hr_overtime_requests FOR UPDATE TO authenticated
  USING (employee_id IN (SELECT id FROM public.hr_employees WHERE public.hr_is_hod_of_department(department_id)));
CREATE POLICY "hr_ot_hrgm"        ON public.hr_overtime_requests FOR ALL    TO authenticated USING (public.hr_is_hr_or_gm()) WITH CHECK (public.hr_is_hr_or_gm());

-- ── hr_public_holidays ──
CREATE TABLE IF NOT EXISTS public.hr_public_holidays (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date         DATE        NOT NULL UNIQUE,
  name         TEXT        NOT NULL,
  is_recurring BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_public_holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_hol_select" ON public.hr_public_holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "hr_hol_all"    ON public.hr_public_holidays FOR ALL    TO authenticated USING (public.hr_is_hr_or_gm()) WITH CHECK (public.hr_is_hr_or_gm());
INSERT INTO public.hr_public_holidays (date, name, is_recurring) VALUES
  ('2026-01-01','New Year''s Day',true),('2026-04-03','Good Friday',false),
  ('2026-04-06','Easter Monday',false),('2026-05-01','Labour Day',true),
  ('2026-06-01','Madaraka Day',true),('2026-10-20','Mashujaa Day',true),
  ('2026-12-12','Jamhuri Day',true),('2026-12-25','Christmas Day',true),
  ('2026-12-26','Boxing Day',true),('2026-03-20','Eid al-Fitr (estimated)',false),
  ('2026-05-27','Eid al-Adha (estimated)',false)
ON CONFLICT (date) DO NOTHING;

-- ── hr_checklist_templates & hr_employee_checklists ──
CREATE TABLE IF NOT EXISTS public.hr_checklist_templates (
  id         UUID              NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type       hr_checklist_type NOT NULL,
  name       TEXT              NOT NULL,
  items      JSONB             NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ       NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_checklist_templates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER hr_chtmpl_updated_at BEFORE UPDATE ON public.hr_checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "hr_chtmpl_select" ON public.hr_checklist_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "hr_chtmpl_all"    ON public.hr_checklist_templates FOR ALL    TO authenticated USING (public.hr_is_hr_or_gm()) WITH CHECK (public.hr_is_hr_or_gm());

CREATE TABLE IF NOT EXISTS public.hr_employee_checklists (
  id          UUID               NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID               NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  template_id UUID               REFERENCES public.hr_checklist_templates(id) ON DELETE SET NULL,
  type        hr_checklist_type  NOT NULL,
  status      hr_checklist_status NOT NULL DEFAULT 'in_progress',
  items_state JSONB              NOT NULL DEFAULT '[]'::jsonb,
  started_at  TIMESTAMPTZ        NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ        NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_employee_checklists ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER hr_checklist_updated_at BEFORE UPDATE ON public.hr_employee_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "hr_chk_self" ON public.hr_employee_checklists FOR SELECT TO authenticated USING (employee_id = public.hr_get_my_employee_id());
CREATE POLICY "hr_chk_hod"  ON public.hr_employee_checklists FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.hr_employees WHERE public.hr_is_hod_of_department(department_id)));
CREATE POLICY "hr_chk_hrgm" ON public.hr_employee_checklists FOR ALL    TO authenticated USING (public.hr_is_hr_or_gm()) WITH CHECK (public.hr_is_hr_or_gm());

-- ── hr_employee_documents ──
CREATE TABLE IF NOT EXISTS public.hr_employee_documents (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id   UUID        NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  document_type TEXT        NOT NULL,
  title         TEXT        NOT NULL,
  file_url      TEXT        NOT NULL,
  issue_date    DATE,
  expiry_date   DATE,
  notes         TEXT,
  uploaded_by   UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hr_empdoc_emp    ON public.hr_employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_empdoc_expiry ON public.hr_employee_documents(expiry_date) WHERE expiry_date IS NOT NULL;
ALTER TABLE public.hr_employee_documents ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER hr_empdoc_updated_at BEFORE UPDATE ON public.hr_employee_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "hr_empdoc_self" ON public.hr_employee_documents FOR SELECT TO authenticated USING (employee_id = public.hr_get_my_employee_id());
CREATE POLICY "hr_empdoc_hod"  ON public.hr_employee_documents FOR SELECT TO authenticated
  USING (employee_id IN (SELECT id FROM public.hr_employees WHERE public.hr_is_hod_of_department(department_id)));
CREATE POLICY "hr_empdoc_hrgm" ON public.hr_employee_documents FOR ALL    TO authenticated USING (public.hr_is_hr_or_gm()) WITH CHECK (public.hr_is_hr_or_gm());

-- ── hr_announcements & hr_announcement_reads ──
CREATE TABLE IF NOT EXISTS public.hr_announcements (
  id             UUID                      NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title          TEXT                      NOT NULL,
  body           TEXT                      NOT NULL,
  audience       hr_announcement_audience  NOT NULL DEFAULT 'all',
  audience_value TEXT,
  pinned         BOOLEAN                   NOT NULL DEFAULT false,
  published_at   TIMESTAMPTZ               NOT NULL DEFAULT now(),
  expires_at     TIMESTAMPTZ,
  created_by     UUID,
  created_at     TIMESTAMPTZ               NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ               NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_announcements ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER hr_ann_updated_at BEFORE UPDATE ON public.hr_announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "hr_ann_select" ON public.hr_announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "hr_ann_all"    ON public.hr_announcements FOR ALL    TO authenticated USING (public.hr_is_hr_or_gm()) WITH CHECK (public.hr_is_hr_or_gm());

CREATE TABLE IF NOT EXISTS public.hr_announcement_reads (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID        NOT NULL REFERENCES public.hr_announcements(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL,
  read_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);
ALTER TABLE public.hr_announcement_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_annread_insert" ON public.hr_announcement_reads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "hr_annread_self"   ON public.hr_announcement_reads FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "hr_annread_hrgm"   ON public.hr_announcement_reads FOR SELECT TO authenticated USING (public.hr_is_hr_or_gm());

-- ── hr_suggestions ──
CREATE TABLE IF NOT EXISTS public.hr_suggestions (
  id                UUID                    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submitter_user_id UUID                    NOT NULL,
  category          hr_suggestion_category  NOT NULL DEFAULT 'suggestion',
  subject           TEXT                    NOT NULL,
  body              TEXT                    NOT NULL,
  status            hr_suggestion_status    NOT NULL DEFAULT 'new',
  gm_notes          TEXT,
  reviewed_by       UUID,
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ             NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ             NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_suggestions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER hr_sug_updated_at BEFORE UPDATE ON public.hr_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "hr_sug_insert" ON public.hr_suggestions FOR INSERT TO authenticated WITH CHECK (submitter_user_id = auth.uid());
CREATE POLICY "hr_sug_gm"     ON public.hr_suggestions FOR SELECT TO authenticated USING (public.hr_has_role(auth.uid(), 'gm'));
CREATE POLICY "hr_sug_gm_upd" ON public.hr_suggestions FOR UPDATE TO authenticated USING (public.hr_has_role(auth.uid(), 'gm'));

-- ── hr_surveys, hr_survey_responses, hr_survey_participation ──
CREATE TABLE IF NOT EXISTS public.hr_surveys (
  id                    UUID             NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title                 TEXT             NOT NULL,
  description           TEXT,
  questions             JSONB            NOT NULL DEFAULT '[]'::jsonb,
  status                hr_survey_status NOT NULL DEFAULT 'draft',
  starts_at             TIMESTAMPTZ      NOT NULL DEFAULT now(),
  ends_at               TIMESTAMPTZ,
  reminder_channel      TEXT             NOT NULL DEFAULT 'inapp' CHECK (reminder_channel IN ('none','inapp','sms','both')),
  reminder_day_of_month INT              CHECK (reminder_day_of_month BETWEEN 1 AND 28),
  reminder_interval_days INT             CHECK (reminder_interval_days BETWEEN 1 AND 60),
  last_reminder_at      TIMESTAMPTZ,
  created_by            UUID,
  created_at            TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ      NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_surveys ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER hr_survey_updated_at BEFORE UPDATE ON public.hr_surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "hr_surveys_select" ON public.hr_surveys FOR SELECT TO authenticated USING (status = 'active' OR public.hr_is_hr_or_gm());
CREATE POLICY "hr_surveys_all"    ON public.hr_surveys FOR ALL    TO authenticated USING (public.hr_is_hr_or_gm()) WITH CHECK (public.hr_is_hr_or_gm());

CREATE TABLE IF NOT EXISTS public.hr_survey_responses (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id    UUID        NOT NULL REFERENCES public.hr_surveys(id) ON DELETE CASCADE,
  answers      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_survey_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_surresp_insert" ON public.hr_survey_responses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "hr_surresp_hrgm"   ON public.hr_survey_responses FOR SELECT TO authenticated USING (public.hr_is_hr_or_gm());

CREATE TABLE IF NOT EXISTS public.hr_survey_participation (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id    UUID        NOT NULL REFERENCES public.hr_surveys(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(survey_id, user_id)
);
ALTER TABLE public.hr_survey_participation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_surpart_insert" ON public.hr_survey_participation FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "hr_surpart_self"   ON public.hr_survey_participation FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "hr_surpart_hrgm"   ON public.hr_survey_participation FOR SELECT TO authenticated USING (public.hr_is_hr_or_gm());

-- ── hr_message_threads & hr_messages ──
CREATE TABLE IF NOT EXISTS public.hr_message_threads (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_a          UUID        NOT NULL,
  user_b          UUID        NOT NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hr_msg_threads_user_order CHECK (user_a < user_b),
  UNIQUE(user_a, user_b)
);
CREATE INDEX IF NOT EXISTS idx_hr_threads_a ON public.hr_message_threads(user_a, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_hr_threads_b ON public.hr_message_threads(user_b, last_message_at DESC);
ALTER TABLE public.hr_message_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_threads_select" ON public.hr_message_threads FOR SELECT TO authenticated USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "hr_threads_insert" ON public.hr_message_threads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "hr_threads_update" ON public.hr_message_threads FOR UPDATE TO authenticated USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE TABLE IF NOT EXISTS public.hr_messages (
  id        UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID        NOT NULL REFERENCES public.hr_message_threads(id) ON DELETE CASCADE,
  sender_id UUID        NOT NULL,
  body      TEXT        NOT NULL,
  read_at   TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hr_msg_thread ON public.hr_messages(thread_id, created_at);
ALTER TABLE public.hr_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.hr_is_thread_participant(_thread_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.hr_message_threads WHERE id = _thread_id AND (_user_id = user_a OR _user_id = user_b))
$$;
CREATE POLICY "hr_msg_select" ON public.hr_messages FOR SELECT TO authenticated USING (public.hr_is_thread_participant(thread_id, auth.uid()));
CREATE POLICY "hr_msg_insert" ON public.hr_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.hr_is_thread_participant(thread_id, auth.uid()));
CREATE POLICY "hr_msg_update" ON public.hr_messages FOR UPDATE TO authenticated USING (public.hr_is_thread_participant(thread_id, auth.uid()) AND sender_id <> auth.uid());

CREATE OR REPLACE FUNCTION public.hr_bump_thread_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN UPDATE public.hr_message_threads SET last_message_at = NEW.created_at WHERE id = NEW.thread_id; RETURN NEW; END; $$;
CREATE TRIGGER hr_trg_bump_thread AFTER INSERT ON public.hr_messages
  FOR EACH ROW EXECUTE FUNCTION public.hr_bump_thread_on_message();

ALTER TABLE public.hr_messages        REPLICA IDENTITY FULL;
ALTER TABLE public.hr_message_threads REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_message_threads;

-- ── Storage buckets ──
INSERT INTO storage.buckets (id, name, public) VALUES ('hr-leave-documents',    'hr-leave-documents',    false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('hr-employee-documents', 'hr-employee-documents', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "hr_leave_docs_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'hr-leave-documents');
CREATE POLICY "hr_leave_docs_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'hr-leave-documents');
CREATE POLICY "hr_emp_docs_self_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'hr-employee-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "hr_emp_docs_self_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'hr-employee-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "hr_emp_docs_hrgm_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'hr-employee-documents' AND public.hr_is_hr_or_gm());
CREATE POLICY "hr_emp_docs_hrgm_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'hr-employee-documents' AND public.hr_is_hr_or_gm());
CREATE POLICY "hr_emp_docs_hrgm_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'hr-employee-documents' AND public.hr_is_hr_or_gm());
