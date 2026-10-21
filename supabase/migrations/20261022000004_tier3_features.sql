-- Tier 3 Features Migration

-- GROUP 12: OCR / full-text search infrastructure
CREATE TABLE IF NOT EXISTS document_text_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE UNIQUE,
  extracted_text text,
  extraction_status text NOT NULL DEFAULT 'pending',
  extracted_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE document_text_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff can read text content" ON document_text_content FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','staff'))
);
CREATE INDEX IF NOT EXISTS document_text_content_search_idx
  ON document_text_content USING gin(to_tsvector('english', coalesce(extracted_text, '')));

-- GROUP 13: Export scheduler
CREATE TABLE IF NOT EXISTS export_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  schedule_type text NOT NULL,
  day_of_week integer,
  day_of_month integer,
  export_type text NOT NULL,
  format text NOT NULL DEFAULT 'csv',
  email_to text[],
  last_run_at timestamptz,
  next_run_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE export_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage schedules" ON export_schedules FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admins insert schedules" ON export_schedules FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admins update schedules" ON export_schedules FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
