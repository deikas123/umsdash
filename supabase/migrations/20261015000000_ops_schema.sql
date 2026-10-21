-- Migration: uptime-hub ops schema additions
-- All ums-docs-vault tables already exist. This adds ops-specific tables only.

-- Extend app_role enum to support uptime-hub's 'manager' and 'user' values
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'user';

-- Extend profiles with ops-specific columns (ums-docs-vault may have some already)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Incidents (entirely new — not in ums-docs-vault)
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department TEXT, incident_type TEXT, date_of_incident DATE, time_of_incident TIME,
  date_reported DATE DEFAULT CURRENT_DATE, location TEXT, reported_by TEXT,
  witnesses TEXT, persons_involved TEXT, description TEXT,
  item_description TEXT, item_quantity INTEGER, serial_numbers TEXT,
  estimated_value DECIMAL, supporting_docs TEXT[], safety_impact TEXT[],
  operational_impact TEXT[], financial_impact TEXT, financial_amount DECIMAL,
  severity TEXT, urgency TEXT, immediate_actions TEXT[], containment_details TEXT,
  problem_statement TEXT, why_1 TEXT, why_2 TEXT, why_3 TEXT, why_4 TEXT, why_5 TEXT,
  root_cause_categories TEXT[], root_cause_statement TEXT,
  capa_action TEXT, capa_owner TEXT, capa_deadline DATE, capa_status TEXT DEFAULT 'open',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all incidents" ON public.incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create incidents" ON public.incidents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own incidents" ON public.incidents FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can delete incidents" ON public.incidents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE SEQUENCE IF NOT EXISTS public.incident_number_seq START 48;
CREATE OR REPLACE FUNCTION public.generate_incident_number() RETURNS TRIGGER AS $$
BEGIN NEW.incident_number = 'UMS-INC-' || LPAD(nextval('public.incident_number_seq')::TEXT,3,'0'); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER set_incident_number BEFORE INSERT ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.generate_incident_number();

-- Vendor issues (entirely new)
CREATE TABLE IF NOT EXISTS public.vendor_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor TEXT NOT NULL, system_name TEXT, issue TEXT NOT NULL,
  impact TEXT NOT NULL DEFAULT 'Minor', downtime TEXT,
  status TEXT NOT NULL DEFAULT 'Open', rca_status TEXT DEFAULT 'Pending',
  date_reported DATE DEFAULT CURRENT_DATE,
  uptime_percentage NUMERIC DEFAULT NULL, uptime_start DATE DEFAULT NULL, uptime_end DATE DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all vendor issues" ON public.vendor_issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create vendor issues" ON public.vendor_issues FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update vendor issues" ON public.vendor_issues FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE TRIGGER update_vendor_issues_updated_at BEFORE UPDATE ON public.vendor_issues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Passwords (entirely new)
CREATE TABLE IF NOT EXISTS public.passwords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  system_name TEXT NOT NULL, username TEXT NOT NULL, assigned_to TEXT,
  expiry_date DATE NOT NULL, notified BOOLEAN DEFAULT FALSE, last_notified_at TIMESTAMPTZ,
  phone_number TEXT, owner_user_id UUID, backup_user_id UUID,
  rotation_days INTEGER NOT NULL DEFAULT 90, last_renewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.passwords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all passwords" ON public.passwords FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create passwords" ON public.passwords FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update passwords" ON public.passwords FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete passwords" ON public.passwords FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_passwords_updated_at BEFORE UPDATE ON public.passwords FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Password renewals (new)
CREATE TABLE IF NOT EXISTS public.password_renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  password_id UUID NOT NULL REFERENCES public.passwords(id) ON DELETE CASCADE,
  renewed_by UUID, previous_expiry DATE, new_expiry DATE NOT NULL,
  notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.password_renewals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View renewals" ON public.password_renewals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Log renewals" ON public.password_renewals FOR INSERT TO authenticated WITH CHECK (renewed_by = auth.uid());

-- Escalation levels (new)
CREATE TABLE IF NOT EXISTS public.escalation_levels (
  level INTEGER PRIMARY KEY, name TEXT NOT NULL,
  target_role public.app_role, hours_to_next INTEGER
);
ALTER TABLE public.escalation_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View levels" ON public.escalation_levels FOR SELECT TO authenticated USING (true);
INSERT INTO public.escalation_levels VALUES
  (1,'Level 1 – Assignee',NULL,4),(2,'Level 2 – Managers','manager',24),(3,'Level 3 – Administrators','admin',NULL)
ON CONFLICT DO NOTHING;

-- Escalations (new)
CREATE TABLE IF NOT EXISTS public.escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT NOT NULL, source_id UUID NOT NULL, title TEXT NOT NULL,
  current_level INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID, level_deadline TIMESTAMPTZ, created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View escalations" ON public.escalations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage escalations" ON public.escalations FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

-- Escalation events (new)
CREATE TABLE IF NOT EXISTS public.escalation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_id UUID NOT NULL REFERENCES public.escalations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, from_level INTEGER, to_level INTEGER,
  actor_id UUID, note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.escalation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View escalation events" ON public.escalation_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert escalation events" ON public.escalation_events FOR INSERT TO authenticated WITH CHECK (true);

-- Ops notifications table (separate from ums-docs-vault's in_app_notifications)
-- Named ops_notifications to avoid collision
CREATE TABLE IF NOT EXISTS public.ops_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, title TEXT NOT NULL, body TEXT, link TEXT,
  read BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ops_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own ops notifications" ON public.ops_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Mark own read" ON public.ops_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Insert ops notifications" ON public.ops_notifications FOR INSERT WITH CHECK (true);

-- Extensions needed for cron jobs (may already be enabled in project)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
