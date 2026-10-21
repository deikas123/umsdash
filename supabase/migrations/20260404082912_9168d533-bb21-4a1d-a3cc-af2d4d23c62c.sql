
CREATE TABLE public.sms_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sent_by uuid NOT NULL,
  recipient_phone text NOT NULL,
  recipient_name text,
  message text NOT NULL,
  sms_type text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'sent',
  api_response jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all sms logs"
ON public.sms_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view all sms logs"
ON public.sms_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Users can view own sms logs"
ON public.sms_logs FOR SELECT TO authenticated
USING (sent_by = auth.uid());

CREATE POLICY "Authenticated users can insert sms logs"
ON public.sms_logs FOR INSERT TO authenticated
WITH CHECK (sent_by = auth.uid());

CREATE INDEX idx_sms_logs_created_at ON public.sms_logs (created_at DESC);
CREATE INDEX idx_sms_logs_sent_by ON public.sms_logs (sent_by);
