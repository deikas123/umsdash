-- ============================================================
-- UMS IT COMMAND CENTRE — centralised endpoint, identity, security
-- and IT operations management. All tables prefixed it_ to avoid
-- conflicts with existing UMS modules (hr_, ops_).
-- ============================================================

-- ── Extend app_role enum with IT roles ──
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'it_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'it_staff';

-- ── IT-specific enums ──
DO $$ BEGIN CREATE TYPE public.it_account_status    AS ENUM ('active','suspended','deactivated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.it_lifecycle_event   AS ENUM ('onboarded','transferred','offboarded','suspended','reactivated','role_changed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.it_device_status     AS ENUM ('active','offline','maintenance','retired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.it_assignment_type   AS ENUM ('primary','shared','unassigned'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.it_security_status    AS ENUM ('secure','review','critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.it_hardware_category AS ENUM ('desktop','laptop','printer','router','switch','server','monitor','ups','external_drive','phone','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.it_asset_status      AS ENUM ('in_use','in_storage','under_repair','retired','lost'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.it_session_type      AS ENUM ('remote_desktop','terminal','file_transfer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.it_session_status    AS ENUM ('requested','authorised','active','ended','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.it_software_status   AS ENUM ('installed','missing','update_available','unauthorised'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.it_update_type        AS ENUM ('os','application','driver','firmware'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.it_update_status      AS ENUM ('pending','scheduled','installed','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.it_maintenance_type   AS ENUM ('preventive','corrective','upgrade','inspection'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.it_maintenance_status AS ENUM ('scheduled','in_progress','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.it_login_outcome      AS ENUM ('success','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.it_incident_severity  AS ENUM ('low','medium','high','critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.it_incident_status    AS ENUM ('open','investigating','contained','resolved','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.it_ticket_category    AS ENUM ('hardware','software','network','access','email','printer','phone','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.it_ticket_priority    AS ENUM ('low','medium','high','urgent'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.it_ticket_status      AS ENUM ('open','assigned','investigating','resolved','escalated','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.it_vps_status         AS ENUM ('up','down','degraded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.it_cloud_status       AS ENUM ('operational','degraded','outage','maintenance'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.it_db_status          AS ENUM ('up','down','degraded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.it_backup_status      AS ENUM ('success','failed','running','skipped','partial'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── RLS helper functions ──
CREATE OR REPLACE FUNCTION public.it_is_it_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('it_admin','admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.it_is_it_staff()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('it_admin','it_staff','admin')
  )
$$;

-- Helper: my it_employees row (linked via profiles.hr_employee_id is HR-only;
-- IT links the auth user directly to it_employees.user_id).
CREATE OR REPLACE FUNCTION public.it_get_my_employee_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.it_employees WHERE user_id = auth.uid()
$$;

-- ============================================================
-- PEOPLE
-- ============================================================

-- ── it_departments ──
CREATE TABLE IF NOT EXISTS public.it_departments (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL UNIQUE,
  description TEXT,
  hod_user_id UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.it_departments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER it_dept_updated_at BEFORE UPDATE ON public.it_departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "it_dept_select" ON public.it_departments FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_dept_all"    ON public.it_departments FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());

-- ── it_employees (identity directory; not an auth provider) ──
CREATE TABLE IF NOT EXISTS public.it_employees (
  id                UUID               NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID               REFERENCES auth.users(id) ON DELETE SET NULL,
  hr_employee_id    UUID               REFERENCES public.hr_employees(id) ON DELETE SET NULL,
  full_name         TEXT               NOT NULL,
  email             TEXT               NOT NULL,
  department_id     UUID               REFERENCES public.it_departments(id) ON DELETE SET NULL,
  department        TEXT               NOT NULL DEFAULT '',
  job_title         TEXT               NOT NULL DEFAULT '',
  account_username  TEXT               NOT NULL DEFAULT '',
  identity_provider TEXT               NOT NULL DEFAULT 'local',  -- local | entra | google
  account_status    it_account_status  NOT NULL DEFAULT 'active',
  mfa_enrolled      BOOLEAN            NOT NULL DEFAULT false,
  deactivated_at     TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ        NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_it_emp_dept ON public.it_employees(department_id);
ALTER TABLE public.it_employees ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER it_emp_updated_at BEFORE UPDATE ON public.it_employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "it_emp_select" ON public.it_employees FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_emp_all"    ON public.it_employees FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());

-- ── it_access_groups ──
CREATE TABLE IF NOT EXISTS public.it_access_groups (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.it_access_groups ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER it_grp_updated_at BEFORE UPDATE ON public.it_access_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "it_grp_select" ON public.it_access_groups FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_grp_all"    ON public.it_access_groups FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());

-- ── it_employee_groups (join) ──
CREATE TABLE IF NOT EXISTS public.it_employee_groups (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID        NOT NULL REFERENCES public.it_employees(id) ON DELETE CASCADE,
  group_id    UUID        NOT NULL REFERENCES public.it_access_groups(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, group_id)
);
ALTER TABLE public.it_employee_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "it_empgrp_select" ON public.it_employee_groups FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_empgrp_all"    ON public.it_employee_groups FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());

-- ── it_lifecycle_events ──
CREATE TABLE IF NOT EXISTS public.it_lifecycle_events (
  id          UUID                NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID                NOT NULL REFERENCES public.it_employees(id) ON DELETE CASCADE,
  event_type  it_lifecycle_event  NOT NULL,
  event_date  DATE                NOT NULL DEFAULT CURRENT_DATE,
  details     JSONB               NOT NULL DEFAULT '{}'::jsonb,
  performed_by UUID,
  notes       TEXT,
  created_at  TIMESTAMPTZ         NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_it_life_emp ON public.it_lifecycle_events(employee_id, event_date);
ALTER TABLE public.it_lifecycle_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "it_life_select" ON public.it_lifecycle_events FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_life_all"    ON public.it_lifecycle_events FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());

-- ============================================================
-- DEVICES
-- ============================================================

-- ── it_devices (the six laptops and all endpoints) ──
CREATE TABLE IF NOT EXISTS public.it_devices (
  id                 UUID              NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id           TEXT              NOT NULL UNIQUE,
  device_name        TEXT              NOT NULL,
  serial_number      TEXT              NOT NULL DEFAULT '',
  manufacturer       TEXT              NOT NULL DEFAULT '',
  model              TEXT              NOT NULL DEFAULT '',
  processor          TEXT              NOT NULL DEFAULT '',
  ram_gb             INT               NOT NULL DEFAULT 0,
  storage_gb         INT               NOT NULL DEFAULT 0,
  os_version         TEXT              NOT NULL DEFAULT '',
  os_edition         TEXT              NOT NULL DEFAULT '',
  department         TEXT              NOT NULL DEFAULT '',
  assigned_employee_id UUID            REFERENCES public.it_employees(id) ON DELETE SET NULL,
  assignment_type    it_assignment_type NOT NULL DEFAULT 'unassigned',
  status             it_device_status  NOT NULL DEFAULT 'active',
  last_check_in      TIMESTAMPTZ,
  security_status    it_security_status NOT NULL DEFAULT 'review',
  warranty_expiry     DATE,
  qr_code            TEXT,
  notes              TEXT,
  created_at         TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ       NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_it_dev_status ON public.it_devices(status);
CREATE INDEX IF NOT EXISTS idx_it_dev_assignee ON public.it_devices(assigned_employee_id);
ALTER TABLE public.it_devices ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER it_dev_updated_at BEFORE UPDATE ON public.it_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "it_dev_select" ON public.it_devices FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_dev_all"    ON public.it_devices FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());

-- ── it_device_assignments (history of who used each device) ──
CREATE TABLE IF NOT EXISTS public.it_device_assignments (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id   UUID        NOT NULL REFERENCES public.it_devices(id) ON DELETE CASCADE,
  employee_id UUID        REFERENCES public.it_employees(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  returned_at TIMESTAMPTZ,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_it_asgn_dev ON public.it_device_assignments(device_id);
ALTER TABLE public.it_device_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "it_asgn_select" ON public.it_device_assignments FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_asgn_all"    ON public.it_device_assignments FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());

-- ── it_hardware_inventory (broader asset register beyond laptops) ──
CREATE TABLE IF NOT EXISTS public.it_hardware_inventory (
  id             UUID                 NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id       TEXT                 NOT NULL UNIQUE,
  name           TEXT                 NOT NULL,
  category       it_hardware_category NOT NULL DEFAULT 'other',
  manufacturer   TEXT                 NOT NULL DEFAULT '',
  model          TEXT                 NOT NULL DEFAULT '',
  serial_number  TEXT                 NOT NULL DEFAULT '',
  purchase_date  DATE,
  purchase_cost  NUMERIC(12,2)        NOT NULL DEFAULT 0,
  assigned_to    TEXT                 NOT NULL DEFAULT '',
  location       TEXT                 NOT NULL DEFAULT '',
  status         it_asset_status      NOT NULL DEFAULT 'in_storage',
  warranty_expiry DATE,
  notes          TEXT,
  created_at     TIMESTAMPTZ          NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ          NOT NULL DEFAULT now()
);
ALTER TABLE public.it_hardware_inventory ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER it_hw_updated_at BEFORE UPDATE ON public.it_hardware_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "it_hw_select" ON public.it_hardware_inventory FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_hw_all"    ON public.it_hardware_inventory FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());

-- ── it_device_compliance (security baseline per device) ──
CREATE TABLE IF NOT EXISTS public.it_device_compliance (
  id                UUID      NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id         UUID      NOT NULL REFERENCES public.it_devices(id) ON DELETE CASCADE,
  antivirus_ok      BOOLEAN   NOT NULL DEFAULT false,
  disk_encryption_ok BOOLEAN  NOT NULL DEFAULT false,
  firewall_ok       BOOLEAN   NOT NULL DEFAULT false,
  os_supported      BOOLEAN   NOT NULL DEFAULT false,
  mfa_enrolled      BOOLEAN   NOT NULL DEFAULT false,
  last_checked      TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.it_device_compliance ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER it_comp_updated_at BEFORE UPDATE ON public.it_device_compliance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "it_comp_select" ON public.it_device_compliance FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_comp_all"    ON public.it_device_compliance FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());

-- ============================================================
-- OPERATIONS
-- ============================================================

-- ── it_remote_sessions (authorised remote support) ──
CREATE TABLE IF NOT EXISTS public.it_remote_sessions (
  id             UUID              NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id      UUID              REFERENCES public.it_devices(id) ON DELETE SET NULL,
  technician_id  UUID              REFERENCES public.it_employees(id) ON DELETE SET NULL,
  session_type   it_session_type   NOT NULL DEFAULT 'remote_desktop',
  status         it_session_status NOT NULL DEFAULT 'requested',
  started_at     TIMESTAMPTZ,
  ended_at       TIMESTAMPTZ,
  authorised_by  UUID,
  notes          TEXT,
  created_at     TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ       NOT NULL DEFAULT now()
);
ALTER TABLE public.it_remote_sessions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER it_sess_updated_at BEFORE UPDATE ON public.it_remote_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "it_sess_select" ON public.it_remote_sessions FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_sess_all"    ON public.it_remote_sessions FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());

-- ── it_software_catalogue (approved software list) ──
CREATE TABLE IF NOT EXISTS public.it_software_catalogue (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT        NOT NULL,
  vendor          TEXT        NOT NULL DEFAULT '',
  category        TEXT        NOT NULL DEFAULT '',
  approved        BOOLEAN     NOT NULL DEFAULT true,
  current_version TEXT        NOT NULL DEFAULT '',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.it_software_catalogue ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER it_swcat_updated_at BEFORE UPDATE ON public.it_software_catalogue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "it_swcat_select" ON public.it_software_catalogue FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_swcat_all"    ON public.it_software_catalogue FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());

-- ── it_software_inventory (what's installed on each device) ──
CREATE TABLE IF NOT EXISTS public.it_software_inventory (
  id          UUID              NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id   UUID              NOT NULL REFERENCES public.it_devices(id) ON DELETE CASCADE,
  name        TEXT              NOT NULL,
  version     TEXT              NOT NULL DEFAULT '',
  status      it_software_status NOT NULL DEFAULT 'installed',
  last_seen   TIMESTAMPTZ       NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ       NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_it_sw_dev ON public.it_software_inventory(device_id);
ALTER TABLE public.it_software_inventory ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER it_sw_updated_at BEFORE UPDATE ON public.it_software_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "it_sw_select" ON public.it_software_inventory FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_sw_all"    ON public.it_software_inventory FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());

-- ── it_updates (Windows / app update tracking) ──
CREATE TABLE IF NOT EXISTS public.it_updates (
  id           UUID              NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id    UUID              NOT NULL REFERENCES public.it_devices(id) ON DELETE CASCADE,
  update_name  TEXT              NOT NULL,
  type         it_update_type     NOT NULL DEFAULT 'os',
  status       it_update_status   NOT NULL DEFAULT 'pending',
  released_at  DATE,
  installed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ       NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_it_upd_dev ON public.it_updates(device_id, status);
ALTER TABLE public.it_updates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER it_upd_updated_at BEFORE UPDATE ON public.it_updates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "it_upd_select" ON public.it_updates FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_upd_all"    ON public.it_updates FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());

-- ── it_maintenance ──
CREATE TABLE IF NOT EXISTS public.it_maintenance (
  id            UUID                 NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id     UUID                 REFERENCES public.it_devices(id) ON DELETE SET NULL,
  hardware_id   UUID                 REFERENCES public.it_hardware_inventory(id) ON DELETE SET NULL,
  type          it_maintenance_type  NOT NULL DEFAULT 'preventive',
  status        it_maintenance_status NOT NULL DEFAULT 'scheduled',
  scheduled_date DATE,
  performed_by  TEXT                  NOT NULL DEFAULT '',
  description   TEXT                  NOT NULL DEFAULT '',
  cost          NUMERIC(12,2)         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ          NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ          NOT NULL DEFAULT now()
);
ALTER TABLE public.it_maintenance ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER it_maint_updated_at BEFORE UPDATE ON public.it_maintenance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "it_maint_select" ON public.it_maintenance FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_maint_all"    ON public.it_maintenance FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());

-- ============================================================
-- SECURITY
-- ============================================================

-- ── it_login_activity ──
CREATE TABLE IF NOT EXISTS public.it_login_activity (
  id          UUID             NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID             REFERENCES public.it_employees(id) ON DELETE SET NULL,
  device_id   UUID             REFERENCES public.it_devices(id) ON DELETE SET NULL,
  login_at    TIMESTAMPTZ       NOT NULL DEFAULT now(),
  ip_address  TEXT             NOT NULL DEFAULT '',
  outcome     it_login_outcome  NOT NULL DEFAULT 'success',
  mfa_used    BOOLEAN           NOT NULL DEFAULT false,
  location    TEXT              NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_it_login_emp ON public.it_login_activity(employee_id, login_at);
CREATE INDEX IF NOT EXISTS idx_it_login_at ON public.it_login_activity(login_at);
ALTER TABLE public.it_login_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "it_login_select" ON public.it_login_activity FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_login_all"    ON public.it_login_activity FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());

-- ── it_mfa_compliance ──
CREATE TABLE IF NOT EXISTS public.it_mfa_compliance (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id   UUID        NOT NULL REFERENCES public.it_employees(id) ON DELETE CASCADE,
  enrolled      BOOLEAN     NOT NULL DEFAULT false,
  method        TEXT        NOT NULL DEFAULT '',
  enrolled_at   TIMESTAMPTZ,
  last_verified TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.it_mfa_compliance ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER it_mfa_updated_at BEFORE UPDATE ON public.it_mfa_compliance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "it_mfa_select" ON public.it_mfa_compliance FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_mfa_all"    ON public.it_mfa_compliance FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());

-- ── it_security_incidents ──
CREATE TABLE IF NOT EXISTS public.it_security_incidents (
  id                UUID                 NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title             TEXT                 NOT NULL,
  description       TEXT                 NOT NULL DEFAULT '',
  severity          it_incident_severity  NOT NULL DEFAULT 'medium',
  status            it_incident_status    NOT NULL DEFAULT 'open',
  reported_by       UUID,
  affected_device_id UUID                 REFERENCES public.it_devices(id) ON DELETE SET NULL,
  affected_employee_id UUID               REFERENCES public.it_employees(id) ON DELETE SET NULL,
  assigned_to       UUID,
  resolution_notes  TEXT,
  created_at        TIMESTAMPTZ          NOT NULL DEFAULT now(),
  resolved_at       TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ          NOT NULL DEFAULT now()
);
ALTER TABLE public.it_security_incidents ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER it_sec_updated_at BEFORE UPDATE ON public.it_security_incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "it_sec_select" ON public.it_security_incidents FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_sec_all"    ON public.it_security_incidents FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());

-- ============================================================
-- SUPPORT — IT HELPDESK (ticket workflow)
-- ============================================================

-- Human-readable ticket id sequence
CREATE SEQUENCE IF NOT EXISTS public.it_ticket_seq START 1;

CREATE TABLE IF NOT EXISTS public.it_tickets (
  id                    UUID              NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id             TEXT              NOT NULL UNIQUE,
  title                 TEXT              NOT NULL,
  description           TEXT              NOT NULL DEFAULT '',
  reporting_employee_id UUID              REFERENCES public.it_employees(id) ON DELETE SET NULL,
  department            TEXT              NOT NULL DEFAULT '',
  affected_device_id    UUID              REFERENCES public.it_devices(id) ON DELETE SET NULL,
  category              it_ticket_category NOT NULL DEFAULT 'other',
  priority              it_ticket_priority NOT NULL DEFAULT 'medium',
  status                it_ticket_status  NOT NULL DEFAULT 'open',
  assigned_technician_id UUID             REFERENCES public.it_employees(id) ON DELETE SET NULL,
  response_time_minutes INT,
  resolution_time_minutes INT,
  resolution_notes      TEXT,
  employee_confirmed    BOOLEAN           NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ       NOT NULL DEFAULT now(),
  assigned_at           TIMESTAMPTZ,
  resolved_at           TIMESTAMPTZ,
  closed_at             TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ       NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_it_tk_status ON public.it_tickets(status);
CREATE INDEX IF NOT EXISTS idx_it_tk_tech   ON public.it_tickets(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_it_tk_created ON public.it_tickets(created_at);
ALTER TABLE public.it_tickets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER it_tk_updated_at BEFORE UPDATE ON public.it_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate human-readable ticket id: IT-YYYY-NNNN
CREATE OR REPLACE FUNCTION public.it_set_ticket_id()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.ticket_id IS NULL OR NEW.ticket_id = '' THEN
    NEW.ticket_id := 'IT-' || extract(year FROM now())::text || '-' || lpad(nextval('it_ticket_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER it_tk_ticket_id BEFORE INSERT ON public.it_tickets
  FOR EACH ROW EXECUTE FUNCTION public.it_set_ticket_id();

-- Stamp status transition timestamps
CREATE OR REPLACE FUNCTION public.it_ticket_status_stamps()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF NEW.status <> OLD.status THEN
      IF NEW.status = 'assigned' AND NEW.assigned_at IS NULL THEN NEW.assigned_at := now(); END IF;
      IF NEW.status IN ('resolved','escalated') AND NEW.resolved_at IS NULL THEN NEW.resolved_at := now(); END IF;
      IF NEW.status = 'closed' AND NEW.closed_at IS NULL THEN NEW.closed_at := now(); END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER it_tk_status_stamp BEFORE INSERT OR UPDATE ON public.it_tickets
  FOR EACH ROW EXECUTE FUNCTION public.it_ticket_status_stamps();

CREATE POLICY "it_tk_select" ON public.it_tickets FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_tk_all"    ON public.it_tickets FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());
-- Staff may create tickets (report issues) and update their own
CREATE POLICY "it_tk_staff_insert" ON public.it_tickets FOR INSERT TO authenticated
  WITH CHECK (public.it_is_it_staff());
CREATE POLICY "it_tk_staff_update" ON public.it_tickets FOR UPDATE TO authenticated
  USING (public.it_is_it_staff()) WITH CHECK (public.it_is_it_staff());

-- ── it_ticket_comments ──
CREATE TABLE IF NOT EXISTS public.it_ticket_comments (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id  UUID        NOT NULL REFERENCES public.it_tickets(id) ON DELETE CASCADE,
  author_id  UUID,
  author_name TEXT       NOT NULL DEFAULT '',
  body       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_it_tc_tk ON public.it_ticket_comments(ticket_id, created_at);
ALTER TABLE public.it_ticket_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "it_tc_select" ON public.it_ticket_comments FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_tc_insert" ON public.it_ticket_comments FOR INSERT TO authenticated WITH CHECK (public.it_is_it_staff());
CREATE POLICY "it_tc_update"  ON public.it_ticket_comments FOR UPDATE  TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());

-- ============================================================
-- INFRASTRUCTURE
-- ============================================================

-- ── it_vps_monitors ──
CREATE TABLE IF NOT EXISTS public.it_vps_monitors (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  host        TEXT        NOT NULL DEFAULT '',
  ip_address  TEXT        NOT NULL DEFAULT '',
  provider    TEXT        NOT NULL DEFAULT '',
  status      it_vps_status NOT NULL DEFAULT 'up',
  uptime_pct  NUMERIC(5,2) NOT NULL DEFAULT 100,
  cpu_pct     NUMERIC(5,2) NOT NULL DEFAULT 0,
  ram_pct     NUMERIC(5,2) NOT NULL DEFAULT 0,
  disk_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
  last_checked TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.it_vps_monitors ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER it_vps_updated_at BEFORE UPDATE ON public.it_vps_monitors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "it_vps_select" ON public.it_vps_monitors FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_vps_all"    ON public.it_vps_monitors FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());

-- ── it_cloud_services ──
CREATE TABLE IF NOT EXISTS public.it_cloud_services (
  id          UUID            NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT            NOT NULL,
  provider    TEXT            NOT NULL DEFAULT '',
  category    TEXT            NOT NULL DEFAULT '',
  status      it_cloud_status NOT NULL DEFAULT 'operational',
  last_checked TIMESTAMPTZ   NOT NULL DEFAULT now(),
  url         TEXT            NOT NULL DEFAULT '',
  notes       TEXT,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT now()
);
ALTER TABLE public.it_cloud_services ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER it_cloud_updated_at BEFORE UPDATE ON public.it_cloud_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "it_cloud_select" ON public.it_cloud_services FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_cloud_all"    ON public.it_cloud_services FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());

-- ── it_database_monitors ──
CREATE TABLE IF NOT EXISTS public.it_database_monitors (
  id            UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT         NOT NULL,
  engine        TEXT         NOT NULL DEFAULT 'postgresql',
  host          TEXT         NOT NULL DEFAULT '',
  status        it_db_status NOT NULL DEFAULT 'up',
  size_mb       NUMERIC(12,2) NOT NULL DEFAULT 0,
  connections    INT          NOT NULL DEFAULT 0,
  slow_queries  INT          NOT NULL DEFAULT 0,
  last_checked  TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.it_database_monitors ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER it_db_updated_at BEFORE UPDATE ON public.it_database_monitors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "it_db_select" ON public.it_database_monitors FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_db_all"    ON public.it_database_monitors FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());

-- ── it_backup_monitors ──
CREATE TABLE IF NOT EXISTS public.it_backup_monitors (
  id             UUID             NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_name    TEXT             NOT NULL,
  type           TEXT             NOT NULL DEFAULT 'full',
  status         it_backup_status NOT NULL DEFAULT 'success',
  size_mb        NUMERIC(12,2)    NOT NULL DEFAULT 0,
  completed_at   TIMESTAMPTZ,
  next_scheduled TIMESTAMPTZ,
  retention_days INT              NOT NULL DEFAULT 30,
  notes          TEXT,
  created_at     TIMESTAMPTZ      NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ      NOT NULL DEFAULT now()
);
ALTER TABLE public.it_backup_monitors ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER it_bk_updated_at BEFORE UPDATE ON public.it_backup_monitors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "it_bk_select" ON public.it_backup_monitors FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_bk_all"    ON public.it_backup_monitors FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());

-- ============================================================
-- REPORTS — snapshot store for generated reports
-- ============================================================
CREATE TABLE IF NOT EXISTS public.it_report_snapshots (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT        NOT NULL,
  period      TEXT        NOT NULL DEFAULT '',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by UUID,
  summary     JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.it_report_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "it_rep_select" ON public.it_report_snapshots FOR SELECT TO authenticated USING (public.it_is_it_staff());
CREATE POLICY "it_rep_all"    ON public.it_report_snapshots FOR ALL    TO authenticated USING (public.it_is_it_admin()) WITH CHECK (public.it_is_it_admin());

-- ============================================================
-- SEED DATA (illustrative, matches the vision doc examples)
-- ============================================================
INSERT INTO public.it_access_groups (name, description) VALUES
  ('All Staff','Every UMS employee'),
  ('IT','IT department personnel'),
  ('Customer Service','Customer service agents and supervisors'),
  ('Finance','Finance team')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.it_software_catalogue (name, vendor, category, approved, current_version) VALUES
  ('Google Chrome','Google','Browser',true,'120'),
  ('Microsoft Office','Microsoft','Productivity',true,'2021'),
  ('Antivirus','Various','Security',true,'—'),
  ('Windows Updates','Microsoft','OS',true,'23H2'),
  ('UMS POS','UMS','Business',true,'1.0')
ON CONFLICT DO NOTHING;

-- Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.it_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.it_security_incidents;
