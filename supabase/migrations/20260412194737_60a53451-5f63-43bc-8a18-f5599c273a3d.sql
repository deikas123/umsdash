
-- Document Versions table
CREATE TABLE public.document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage document versions" ON public.document_versions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can view document versions" ON public.document_versions FOR SELECT USING (has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff can insert document versions" ON public.document_versions FOR INSERT WITH CHECK (has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Customers can view own doc versions" ON public.document_versions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM documents d
    JOIN customers c ON d.customer_id = c.id
    WHERE d.id = document_versions.document_id
    AND c.user_id = auth.uid()
    AND d.is_private = false
  )
);

CREATE INDEX idx_document_versions_doc_id ON public.document_versions(document_id);

-- Document Comments table
CREATE TABLE public.document_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage document comments" ON public.document_comments FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can view document comments" ON public.document_comments FOR SELECT USING (has_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "Staff can insert document comments" ON public.document_comments FOR INSERT WITH CHECK (has_role(auth.uid(), 'staff'::app_role) AND user_id = auth.uid());
CREATE POLICY "Users can delete own comments" ON public.document_comments FOR DELETE USING (user_id = auth.uid());

CREATE INDEX idx_document_comments_doc_id ON public.document_comments(document_id);

-- System Settings table for global config
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system settings" ON public.system_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can read system settings" ON public.system_settings FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default password expiry setting
INSERT INTO public.system_settings (key, value) VALUES ('password_expiry_days', '90'::jsonb);
