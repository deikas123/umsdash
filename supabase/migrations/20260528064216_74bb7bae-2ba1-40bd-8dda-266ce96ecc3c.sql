
-- 1) Restrict sms_preferences: remove broad staff/admin read access
DROP POLICY IF EXISTS "Staff can read sms prefs for notifications" ON public.sms_preferences;
DROP POLICY IF EXISTS "Service can read all sms prefs" ON public.sms_preferences;

-- 2) Tighten task-files storage policies: scope to task participants
DROP POLICY IF EXISTS "Auth users can upload task files" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can view task files" ON storage.objects;

-- Upload: file must be under user's own folder AND user must be assignee of the task OR be able to manage tasks
CREATE POLICY "Task participants can upload task files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-files'
  AND auth.uid() IS NOT NULL
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND (
    public.can_manage_tasks(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.task_assignees ta
      WHERE ta.task_id::text = (storage.foldername(name))[2]
        AND ta.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id::text = (storage.foldername(name))[2]
        AND t.created_by = auth.uid()
    )
  )
);

-- View: only task assignees, task creator, or task managers
CREATE POLICY "Task participants can view task files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'task-files'
  AND auth.uid() IS NOT NULL
  AND (
    public.can_manage_tasks(auth.uid())
    OR (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.task_assignees ta
      WHERE ta.task_id::text = (storage.foldername(name))[2]
        AND ta.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id::text = (storage.foldername(name))[2]
        AND t.created_by = auth.uid()
    )
  )
);
