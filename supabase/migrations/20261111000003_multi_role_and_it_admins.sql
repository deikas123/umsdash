-- ============================================================
-- Multi-role support + IT admin assignments
-- Allows one user to hold multiple roles simultaneously.
-- ============================================================

-- 1. Unique constraint on (user_id, role) so ON CONFLICT works cleanly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.user_roles'::regclass
      AND conname = 'user_roles_user_id_role_key'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END;
$$;

-- 2. Assign it_admin to the three IT administrators (keeps existing roles)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'it_admin'::public.app_role
FROM auth.users u
WHERE u.email IN (
  'dennis@umskenya.com',
  'amsterntechhub@gmail.com',
  'wilson.kamau@umskenya.com'
)
ON CONFLICT (user_id, role) DO NOTHING;
