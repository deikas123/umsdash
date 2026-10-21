
-- Task comments table
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Managers can view all comments
CREATE POLICY "Managers can view all comments" ON public.task_comments
FOR SELECT USING (can_manage_tasks(auth.uid()));

-- Assignees can view comments on their tasks
CREATE POLICY "Assignees can view task comments" ON public.task_comments
FOR SELECT USING (is_task_assignee(auth.uid(), task_id));

-- Managers can add comments
CREATE POLICY "Managers can add comments" ON public.task_comments
FOR INSERT WITH CHECK (can_manage_tasks(auth.uid()) AND user_id = auth.uid());

-- Assignees can add comments
CREATE POLICY "Assignees can add comments" ON public.task_comments
FOR INSERT WITH CHECK (is_task_assignee(auth.uid(), task_id) AND user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON public.task_comments
FOR DELETE USING (user_id = auth.uid());

-- Push notification subscriptions table
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subscriptions" ON public.push_subscriptions
FOR ALL USING (user_id = auth.uid());
