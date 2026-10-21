
-- Security-definer helper that safely checks the super admin without exposing auth.users to callers
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = _user_id
      AND lower(u.email) = 'amsterntechhub@gmail.com'
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, anon, service_role;

-- Replace the offending policy that referenced auth.users directly
DROP POLICY IF EXISTS "Super admin manages db-exports" ON storage.objects;

CREATE POLICY "Super admin manages db-exports"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'db-exports' AND public.is_super_admin(auth.uid()))
WITH CHECK (bucket_id = 'db-exports' AND public.is_super_admin(auth.uid()));
