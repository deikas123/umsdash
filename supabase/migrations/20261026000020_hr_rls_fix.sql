-- Fix HR RLS: allow UMS Hub admins to manage HR data
-- and allow all authenticated users to read HR employees/departments (for directory)

-- Update hr_is_hr_or_gm() to include 'admin' role
CREATE OR REPLACE FUNCTION public.hr_is_hr_or_gm()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('hr_manager', 'gm', 'admin')
  )
$$;

-- Allow all authenticated users to read hr_employees (staff directory)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hr_employees' AND policyname='hr_emp_all_select') THEN
    CREATE POLICY "hr_emp_all_select" ON public.hr_employees FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Allow all authenticated users to read hr_departments
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='hr_departments' AND policyname='hr_dept_all_select') THEN
    CREATE POLICY "hr_dept_all_select" ON public.hr_departments FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
