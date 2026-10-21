
-- Fix 1: SMS preferences - remove broad read, add admin+staff scoped read
DROP POLICY IF EXISTS "Authenticated users can read sms prefs for notifications" ON public.sms_preferences;
CREATE POLICY "Staff can read sms prefs for notifications" ON public.sms_preferences
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Audit logs - restrict INSERT to own user_id only
DROP POLICY IF EXISTS "Users can insert their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert own audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Fix 3: Storage - replace broad documents SELECT with scoped policies
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;

CREATE POLICY "Staff and admins can read documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND (
      public.has_role(auth.uid(), 'admin'::app_role) OR
      public.has_role(auth.uid(), 'staff'::app_role)
    )
  );

CREATE POLICY "Customers can read own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.customers c ON c.id = d.customer_id
      WHERE d.file_path = name AND c.user_id = auth.uid()
    )
  );
