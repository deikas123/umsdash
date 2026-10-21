CREATE POLICY "Authenticated users can read sms prefs for notifications"
ON public.sms_preferences
FOR SELECT
TO authenticated
USING (true);