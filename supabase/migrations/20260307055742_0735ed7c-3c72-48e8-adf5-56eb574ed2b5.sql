
-- Allow assignees to update their own assignment status
CREATE POLICY "Assignees can update own assignment status"
ON public.task_assignees
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
