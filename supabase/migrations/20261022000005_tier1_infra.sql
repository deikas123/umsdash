-- Tier 1 Infrastructure Migration

-- system_settings table (key/value store for org-level config)
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins can manage system_settings" ON system_settings
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "authenticated users can read system_settings" ON system_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated users can read departments" ON departments FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "admins can manage departments" ON departments
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Add department column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'department') THEN
    ALTER TABLE profiles ADD COLUMN department text;
  END IF;
END $$;

-- Seed default departments
INSERT INTO departments (name, description) VALUES
  ('Sales', 'Sales and business development'),
  ('Finance', 'Finance and accounting'),
  ('HR/Admin', 'Human resources and administration'),
  ('Procurement/Warehouse', 'Procurement and warehouse operations'),
  ('Customer Service & IT', 'Customer service and IT support'),
  ('Operations', 'Operations management')
ON CONFLICT (name) DO NOTHING;

-- Seed default system_settings
INSERT INTO system_settings (key, value) VALUES
  ('org_logo_url', '""'),
  ('announcement', '{"text":"","color":"blue","active":false}'),
  ('maintenance_mode', 'false'),
  ('oncall_schedule', '{}'),
  ('doc_templates', '[]')
ON CONFLICT (key) DO NOTHING;
