-- system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "admins manage settings" ON system_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY IF NOT EXISTS "all read settings" ON system_settings FOR SELECT USING (true);
INSERT INTO system_settings (key, value) VALUES
  ('announcement', '{"active":false,"text":"","type":"info"}'::jsonb),
  ('org_logo_url', '""'::jsonb),
  ('maintenance_mode', '{"active":false,"message":"System under maintenance."}'::jsonb),
  ('oncall_schedule', '{}'::jsonb),
  ('doc_templates', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- departments
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "all read departments" ON departments FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "admins manage departments" ON departments FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department text;

-- webhooks
CREATE TABLE IF NOT EXISTS public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  secret text, active boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz, created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "admins manage webhooks" ON webhooks FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- api_keys
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, key_hash text NOT NULL UNIQUE, key_prefix text NOT NULL,
  created_by uuid REFERENCES auth.users(id), last_used_at timestamptz,
  expires_at timestamptz, active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "admins manage api keys" ON api_keys FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{}'::jsonb;
