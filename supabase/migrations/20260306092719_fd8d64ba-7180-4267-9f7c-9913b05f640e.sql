
-- SMS preferences table
CREATE TABLE public.sms_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  sms_enabled boolean NOT NULL DEFAULT true,
  phone_number text,
  notify_reminders boolean NOT NULL DEFAULT true,
  notify_tasks boolean NOT NULL DEFAULT true,
  notify_task_updates boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sms prefs" ON public.sms_preferences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own sms prefs" ON public.sms_preferences FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own sms prefs" ON public.sms_preferences FOR UPDATE USING (user_id = auth.uid());

-- Admins can read all for sending notifications
CREATE POLICY "Service can read all sms prefs" ON public.sms_preferences FOR SELECT USING (has_role(auth.uid(), 'admin'));
