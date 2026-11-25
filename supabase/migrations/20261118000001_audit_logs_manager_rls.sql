-- M2: Audit logs RLS — GM sees all, HOD sees own department's logs
-- Applied directly to live DB; this file tracks it for re-deploy / CI.

-- GMs can view all audit logs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_logs' AND policyname='GMs can view audit logs') THEN
    CREATE POLICY "GMs can view audit logs" ON public.audit_logs
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() AND ur.role = 'gm'::public.app_role
      ));
  END IF;
END $$;

-- HODs can view audit logs for users in their department only
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_logs' AND policyname='HODs can view audit logs (own dept)') THEN
    CREATE POLICY "HODs can view audit logs (own dept)" ON public.audit_logs
      FOR SELECT TO authenticated
      USING (
        user_id IS NOT NULL AND EXISTS (
          SELECT 1
          FROM public.profiles p
          JOIN public.hr_employees e ON p.hr_employee_id = e.id
          JOIN public.hr_departments d ON e.department_id = d.id
          WHERE p.user_id = audit_logs.user_id
            AND d.hod_user_id = auth.uid()
        )
      );
  END IF;
END $$;
