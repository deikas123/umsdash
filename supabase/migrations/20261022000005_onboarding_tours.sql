-- =============================================================================
-- Onboarding Tour System Migration
-- =============================================================================

-- 1. TABLES
CREATE TABLE IF NOT EXISTS public.tour_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  target_role public.app_role NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_tour_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_key TEXT NOT NULL REFERENCES public.tour_definitions(key) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started',
  current_step INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tour_key)
);

-- 2. RLS
ALTER TABLE public.tour_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tour_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active tour definitions" ON public.tour_definitions;
CREATE POLICY "Anyone can read active tour definitions"
  ON public.tour_definitions FOR SELECT
  TO authenticated
  USING (is_active OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admin manages tour definitions" ON public.tour_definitions;
CREATE POLICY "Super admin manages tour definitions"
  ON public.tour_definitions FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Users read own tour progress" ON public.user_tour_progress;
CREATE POLICY "Users read own tour progress"
  ON public.user_tour_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own tour progress" ON public.user_tour_progress;
CREATE POLICY "Users insert own tour progress"
  ON public.user_tour_progress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own tour progress" ON public.user_tour_progress;
CREATE POLICY "Users update own tour progress"
  ON public.user_tour_progress FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. SEED — 4 default tours
INSERT INTO public.tour_definitions (key, name, description, target_role, is_active, steps, display_order)
VALUES
(
  'platform_welcome',
  'Platform Welcome',
  'A quick walkthrough of UMS Hub for all new users.',
  NULL,
  true,
  jsonb_build_array(
    jsonb_build_object('title','Welcome to UMS Hub!','body','We will take a quick tour to show you around. Click Next to continue.','selector',NULL,'placement','center'),
    jsonb_build_object('title','Document Vault','body','Store and manage customer documents, folders, tasks, and reminders. Click this card to enter.','selector','docs-vault-card','placement','right'),
    jsonb_build_object('title','Operations Hub','body','Track vendor issues, incidents, passwords, and escalations here.','selector','ops-hub-card','placement','left'),
    jsonb_build_object('title','Your Profile','body','Your name, role, and account settings live here. Update your profile any time in Settings.','selector','user-avatar','placement','bottom'),
    jsonb_build_object('title','You are all set!','body','Explore the Document Vault to get started. You can replay this tour any time from Settings → Onboarding Tours.','selector',NULL,'placement','center')
  ),
  1
),
(
  'docs_welcome',
  'Document Vault Tour',
  'A walkthrough of the Document Vault for admin and staff.',
  'admin',
  true,
  jsonb_build_array(
    jsonb_build_object('title','Document Vault','body','This is your central hub for managing all customer documents.','selector',NULL,'placement','center'),
    jsonb_build_object('title','Upload Documents','body','Use the Upload button to add new documents for customers.','selector',NULL,'placement','center'),
    jsonb_build_object('title','Tasks & Reminders','body','Keep track of pending work with Tasks and Reminders in the sidebar.','selector',NULL,'placement','center'),
    jsonb_build_object('title','Ready to go!','body','You are all set to use the Document Vault. Explore the sidebar for more features.','selector',NULL,'placement','center')
  ),
  2
),
(
  'ops_welcome',
  'Operations Hub Tour',
  'A walkthrough of the Operations Hub for admin and staff.',
  'staff',
  true,
  jsonb_build_array(
    jsonb_build_object('title','Operations Hub','body','This is where you manage vendor issues, incidents, and escalations.','selector',NULL,'placement','center'),
    jsonb_build_object('title','Vendor Issues','body','Log and track issues with vendors. Set impact levels and monitor resolution.','selector',NULL,'placement','center'),
    jsonb_build_object('title','Incidents','body','Record incidents with full 5-Why root cause analysis and CAPA tracking.','selector',NULL,'placement','center'),
    jsonb_build_object('title','You are ready!','body','You can now manage operations effectively. Check Analytics for trends.','selector',NULL,'placement','center')
  ),
  3
),
(
  'customer_welcome',
  'Customer Portal Tour',
  'A quick walkthrough for customer portal users.',
  'customer',
  true,
  jsonb_build_array(
    jsonb_build_object('title','Welcome, Customer!','body','This portal gives you access to your documents and shared folders.','selector',NULL,'placement','center'),
    jsonb_build_object('title','My Documents','body','All documents shared with you appear here. Download or preview them any time.','selector',NULL,'placement','center'),
    jsonb_build_object('title','Tasks & Reminders','body','Stay on top of action items with Tasks and Reminders.','selector',NULL,'placement','center'),
    jsonb_build_object('title','You are all set!','body','If you need help, contact your account manager. Enjoy the portal!','selector',NULL,'placement','center')
  ),
  4
)
ON CONFLICT (key) DO NOTHING;
