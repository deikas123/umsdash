-- FEAT-002: DB triggers for HR event SMS notifications via hr-notify-sms edge function
-- Each trigger function wraps the net.http_post call in BEGIN/EXCEPTION WHEN OTHERS THEN NULL
-- to ensure DML is never blocked if the notification fails.

-- ============================================================
-- Helper: base URL for edge functions
-- ============================================================
-- We read SUPABASE_URL from app.settings set during project provisioning.
-- The net extension must be enabled (SELECT net.http_post requires pg_net).

-- ============================================================
-- 1. Leave request — INSERT (leave_submitted)
-- ============================================================
CREATE OR REPLACE FUNCTION trg_hr_notify_leave_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _url text;
BEGIN
  BEGIN
    _url := current_setting('app.settings.supabase_url', true) || '/functions/v1/hr-notify-sms';
    PERFORM net.http_post(
      url     := _url,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body    := jsonb_build_object('event', 'leave_submitted', 'record_id', NEW.id::text)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hr_notify_leave_insert ON hr_leave_requests;
CREATE TRIGGER trg_hr_notify_leave_insert
  AFTER INSERT ON hr_leave_requests
  FOR EACH ROW EXECUTE FUNCTION trg_hr_notify_leave_insert();

-- ============================================================
-- 2. Leave request — UPDATE OF status (leave_status_changed)
-- ============================================================
CREATE OR REPLACE FUNCTION trg_hr_notify_leave_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _url text;
BEGIN
  BEGIN
    _url := current_setting('app.settings.supabase_url', true) || '/functions/v1/hr-notify-sms';
    PERFORM net.http_post(
      url     := _url,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body    := jsonb_build_object('event', 'leave_status_changed', 'record_id', NEW.id::text)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hr_notify_leave_update ON hr_leave_requests;
CREATE TRIGGER trg_hr_notify_leave_update
  AFTER UPDATE OF status ON hr_leave_requests
  FOR EACH ROW EXECUTE FUNCTION trg_hr_notify_leave_update();

-- ============================================================
-- 3. Overtime request — INSERT (overtime_submitted)
-- ============================================================
CREATE OR REPLACE FUNCTION trg_hr_notify_ot_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _url text;
BEGIN
  BEGIN
    _url := current_setting('app.settings.supabase_url', true) || '/functions/v1/hr-notify-sms';
    PERFORM net.http_post(
      url     := _url,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body    := jsonb_build_object('event', 'overtime_submitted', 'record_id', NEW.id::text)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hr_notify_ot_insert ON hr_overtime_requests;
CREATE TRIGGER trg_hr_notify_ot_insert
  AFTER INSERT ON hr_overtime_requests
  FOR EACH ROW EXECUTE FUNCTION trg_hr_notify_ot_insert();

-- ============================================================
-- 4. Overtime request — UPDATE OF status (overtime_status_changed)
-- ============================================================
CREATE OR REPLACE FUNCTION trg_hr_notify_ot_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _url text;
BEGIN
  BEGIN
    _url := current_setting('app.settings.supabase_url', true) || '/functions/v1/hr-notify-sms';
    PERFORM net.http_post(
      url     := _url,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body    := jsonb_build_object('event', 'overtime_status_changed', 'record_id', NEW.id::text)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hr_notify_ot_update ON hr_overtime_requests;
CREATE TRIGGER trg_hr_notify_ot_update
  AFTER UPDATE OF status ON hr_overtime_requests
  FOR EACH ROW EXECUTE FUNCTION trg_hr_notify_ot_update();

-- ============================================================
-- 5. Announcements — INSERT (announcement_published)
-- ============================================================
CREATE OR REPLACE FUNCTION trg_hr_notify_announcement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _url text;
BEGIN
  BEGIN
    _url := current_setting('app.settings.supabase_url', true) || '/functions/v1/hr-notify-sms';
    PERFORM net.http_post(
      url     := _url,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body    := jsonb_build_object('event', 'announcement_published', 'record_id', NEW.id::text)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hr_notify_announcement ON hr_announcements;
CREATE TRIGGER trg_hr_notify_announcement
  AFTER INSERT ON hr_announcements
  FOR EACH ROW EXECUTE FUNCTION trg_hr_notify_announcement();

-- ============================================================
-- 6. Employee documents — INSERT (document_uploaded)
-- ============================================================
CREATE OR REPLACE FUNCTION trg_hr_notify_doc_upload()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _url text;
BEGIN
  BEGIN
    _url := current_setting('app.settings.supabase_url', true) || '/functions/v1/hr-notify-sms';
    PERFORM net.http_post(
      url     := _url,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body    := jsonb_build_object('event', 'document_uploaded', 'record_id', NEW.id::text)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hr_notify_doc_upload ON hr_employee_documents;
CREATE TRIGGER trg_hr_notify_doc_upload
  AFTER INSERT ON hr_employee_documents
  FOR EACH ROW EXECUTE FUNCTION trg_hr_notify_doc_upload();

-- ============================================================
-- 7. Task assignees — INSERT (task_assigned)
-- Note: body uses user_id + task_id instead of record_id
-- ============================================================
CREATE OR REPLACE FUNCTION trg_hr_notify_task_assigned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _url text;
BEGIN
  BEGIN
    _url := current_setting('app.settings.supabase_url', true) || '/functions/v1/hr-notify-sms';
    PERFORM net.http_post(
      url     := _url,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body    := jsonb_build_object(
        'event',   'task_assigned',
        'user_id', NEW.user_id::text,
        'task_id', NEW.task_id::text
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hr_notify_task_assigned ON task_assignees;
CREATE TRIGGER trg_hr_notify_task_assigned
  AFTER INSERT ON task_assignees
  FOR EACH ROW EXECUTE FUNCTION trg_hr_notify_task_assigned();
