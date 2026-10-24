-- Unified User Management infrastructure
-- Adds the user_app_access table (per-app access grants) and a
-- user_activity_summary view that joins profiles, roles, activity and
-- gamification data for the unified User Hub admin page.
--
-- NOTE: the gamification tables in this project are `upload_streaks`
-- (with current_streak) and `user_xp` (with level, not level_name), so the
-- view sources current_streak from upload_streaks and exposes user_xp.level
-- as the view column `level_name`.

CREATE TABLE IF NOT EXISTS public.user_app_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id text NOT NULL CHECK (app_id IN ('docs','ops')),
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, app_id)
);
ALTER TABLE user_app_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage app access" ON user_app_access FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "users view own access" ON user_app_access FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.user_activity_summary AS
SELECT p.user_id, p.full_name, p.email, p.phone, p.department, p.avatar_url, p.must_reset_password,
  ur.role,
  (SELECT COUNT(*) FROM documents WHERE uploaded_by = p.user_id)::int as docs_uploaded,
  (SELECT COUNT(*) FROM tasks WHERE created_by = p.user_id)::int as tasks_created,
  (SELECT COUNT(*) FROM audit_logs WHERE user_id = p.user_id)::int as audit_events,
  (SELECT MAX(created_at) FROM audit_logs WHERE user_id = p.user_id) as last_active_at,
  (SELECT current_streak FROM upload_streaks WHERE user_id = p.user_id) as current_streak,
  (SELECT total_xp FROM user_xp WHERE user_id = p.user_id) as total_xp,
  (SELECT level FROM user_xp WHERE user_id = p.user_id) as level_name
FROM profiles p LEFT JOIN user_roles ur ON ur.user_id = p.user_id;
GRANT SELECT ON user_activity_summary TO authenticated;

INSERT INTO user_app_access (user_id, app_id)
SELECT user_id, 'docs' FROM user_roles ON CONFLICT DO NOTHING;
INSERT INTO user_app_access (user_id, app_id)
SELECT user_id, 'ops' FROM user_roles WHERE role IN ('admin','staff') ON CONFLICT DO NOTHING;
