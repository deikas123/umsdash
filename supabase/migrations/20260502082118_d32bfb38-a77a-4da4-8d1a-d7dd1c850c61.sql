
-- 1) Auto-approve uploaded documents
CREATE OR REPLACE FUNCTION public.auto_approve_document()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NULL OR NEW.status = 'pending' THEN
    NEW.status := 'approved';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_approve_document ON public.documents;
CREATE TRIGGER trg_auto_approve_document
BEFORE INSERT ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.auto_approve_document();

-- 2) Notify user when assigned to a task
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_title TEXT;
BEGIN
  SELECT title INTO v_task_title FROM public.tasks WHERE id = NEW.task_id;
  INSERT INTO public.in_app_notifications (user_id, title, message, type, link)
  VALUES (
    NEW.user_id,
    'New task assigned',
    COALESCE('You were assigned to: ' || v_task_title, 'You have a new task assignment'),
    'task',
    '/tasks'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_assignment ON public.task_assignees;
CREATE TRIGGER trg_notify_task_assignment
AFTER INSERT ON public.task_assignees
FOR EACH ROW
EXECUTE FUNCTION public.notify_task_assignment();

-- 3) Notify customer when a document is uploaded for them
CREATE OR REPLACE FUNCTION public.notify_document_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_user_id UUID;
BEGIN
  IF NEW.is_private = true THEN
    RETURN NEW;
  END IF;
  SELECT user_id INTO v_customer_user_id FROM public.customers WHERE id = NEW.customer_id;
  IF v_customer_user_id IS NOT NULL THEN
    INSERT INTO public.in_app_notifications (user_id, title, message, type, link)
    VALUES (
      v_customer_user_id,
      'New document available',
      'A new document "' || NEW.title || '" has been uploaded to your account.',
      'document',
      '/my-documents'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_document_upload ON public.documents;
CREATE TRIGGER trg_notify_document_upload
AFTER INSERT ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.notify_document_upload();

-- 4) Function to create reminder due notifications (called by cron)
CREATE OR REPLACE FUNCTION public.create_due_reminder_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.in_app_notifications (user_id, title, message, type, link)
  SELECT
    r.user_id,
    'Reminder due',
    r.title || COALESCE(' — ' || r.description, ''),
    'reminder',
    '/reminders'
  FROM public.reminders r
  WHERE r.status = 'pending'
    AND r.reminder_date <= now()
    AND r.reminder_date > now() - interval '15 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM public.in_app_notifications n
      WHERE n.user_id = r.user_id
        AND n.type = 'reminder'
        AND n.message LIKE r.title || '%'
        AND n.created_at > now() - interval '1 hour'
    );
END;
$$;

-- 5) Schedule it every 5 minutes
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('create-due-reminder-notifications')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'create-due-reminder-notifications');

SELECT cron.schedule(
  'create-due-reminder-notifications',
  '*/5 * * * *',
  $$ SELECT public.create_due_reminder_notifications(); $$
);
