-- RBAC System: custom roles, granular permissions, user role assignments
-- Migration: 20261023000002_rbac_system.sql

CREATE TABLE IF NOT EXISTS public.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  base_role text NOT NULL DEFAULT 'staff',
  color text NOT NULL DEFAULT '#6366f1',
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission_key)
);

CREATE TABLE IF NOT EXISTS public.user_custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Enable RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_roles ENABLE ROW LEVEL SECURITY;

-- SELECT: open to all authenticated users
CREATE POLICY "authenticated users can read custom_roles"
  ON public.custom_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated users can read role_permissions"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated users can read user_custom_roles"
  ON public.user_custom_roles FOR SELECT TO authenticated USING (true);

-- INSERT/UPDATE/DELETE: super admin only (gated on profiles email)
CREATE POLICY "super admin manages custom_roles"
  ON public.custom_roles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND email = 'amsterntechhub@gmail.com'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND email = 'amsterntechhub@gmail.com'));

CREATE POLICY "super admin manages role_permissions"
  ON public.role_permissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND email = 'amsterntechhub@gmail.com'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND email = 'amsterntechhub@gmail.com'));

CREATE POLICY "super admin manages user_custom_roles"
  ON public.user_custom_roles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND email = 'amsterntechhub@gmail.com'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND email = 'amsterntechhub@gmail.com'));

-- Seed system roles
INSERT INTO public.custom_roles (name, display_name, description, base_role, color, is_system)
VALUES
  ('admin',    'Administrator', 'Full system access',          'admin',    '#ef4444', true),
  ('staff',    'Staff Member',  'Standard staff access',       'staff',    '#3b82f6', true),
  ('customer', 'Customer',      'Customer portal access only', 'customer', '#10b981', true)
ON CONFLICT (name) DO NOTHING;

-- Helper function: check if a user has a permission via any assigned custom role
CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id uuid, p_permission_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_custom_roles ucr
    JOIN public.role_permissions rp ON rp.role_id = ucr.role_id
    WHERE ucr.user_id = p_user_id
      AND rp.permission_key = p_permission_key
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_has_permission(uuid, text) TO authenticated;
