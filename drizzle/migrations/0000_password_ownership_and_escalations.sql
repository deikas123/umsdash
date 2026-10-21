ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.passwords
  ADD COLUMN IF NOT EXISTS owner_user_id uuid,
  ADD COLUMN IF NOT EXISTS backup_user_id uuid,
  ADD COLUMN IF NOT EXISTS rotation_days integer NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS last_renewed_at timestamptz;

CREATE TABLE public.password_renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  password_id uuid NOT NULL REFERENCES public.passwords(id) ON DELETE CASCADE,
  renewed_by uuid,
  previous_expiry date,
  new_expiry date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.password_renewals TO authenticated;
GRANT ALL ON public.password_renewals TO service_role;
ALTER TABLE public.password_renewals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View renewals" ON public.password_renewals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Log renewals" ON public.password_renewals FOR INSERT TO authenticated WITH CHECK (renewed_by = auth.uid());

CREATE TABLE public.escalation_levels (
  level integer PRIMARY KEY,
  name text NOT NULL,
  target_role app_role,
  hours_to_next integer
);
GRANT SELECT ON public.escalation_levels TO authenticated;
GRANT ALL ON public.escalation_levels TO service_role;
ALTER TABLE public.escalation_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View levels" ON public.escalation_levels FOR SELECT TO authenticated USING (true);
INSERT INTO public.escalation_levels VALUES
 (1,'Level 1 – Assignee',NULL,4),(2,'Level 2 – Managers','manager',24),(3,'Level 3 – Administrators','admin',NULL);

CREATE TABLE public.escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  title text NOT NULL,
  current_level integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid,
  level_deadline timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
GRANT SELECT ON public.escalations TO authenticated;
GRANT ALL ON public.escalations TO service_role;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View escalations" ON public.escalations FOR SELECT TO authenticated USING (true);

CREATE TABLE public.escalation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_id uuid NOT NULL REFERENCES public.escalations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_level integer,
  to_level integer,
  actor_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.escalation_events TO authenticated;
GRANT ALL ON public.escalation_events TO service_role;
ALTER TABLE public.escalation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View escalation events" ON public.escalation_events FOR SELECT TO authenticated USING (true);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Mark own read" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());