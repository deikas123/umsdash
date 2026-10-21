
-- Staff position enum
CREATE TYPE public.staff_position AS ENUM ('super_admin', 'hr', 'hod', 'staff');

-- Add position column to profiles
ALTER TABLE public.profiles ADD COLUMN position staff_position DEFAULT 'staff';

-- ===================== REMINDERS =====================
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reminder_date TIMESTAMPTZ NOT NULL,
  recurrence TEXT NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'snoozed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reminders" ON public.reminders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own reminders" ON public.reminders FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own reminders" ON public.reminders FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own reminders" ON public.reminders FOR DELETE USING (user_id = auth.uid());
CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===================== TASK SYSTEM =====================
CREATE TYPE public.task_priority AS ENUM ('low', 'normal', 'high');
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed');

-- Helper functions
CREATE OR REPLACE FUNCTION public.get_user_position(_user_id uuid)
RETURNS staff_position LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$ SELECT position FROM public.profiles WHERE user_id = _user_id LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.can_manage_tasks(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$ SELECT has_role(_user_id, 'admin') OR (has_role(_user_id, 'staff') AND get_user_position(_user_id) IN ('hr', 'hod', 'super_admin')) $$;

-- Tables first (before function that references them)
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  due_date TIMESTAMPTZ,
  priority task_priority NOT NULL DEFAULT 'normal',
  status task_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

CREATE TABLE public.task_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  upload_type TEXT NOT NULL DEFAULT 'attachment' CHECK (upload_type IN ('attachment', 'submission')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Now the function that references task_assignees
CREATE OR REPLACE FUNCTION public.is_task_assignee(_user_id uuid, _task_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.task_assignees WHERE task_id = _task_id AND user_id = _user_id) $$;

-- RLS: tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers can view all tasks" ON public.tasks FOR SELECT USING (can_manage_tasks(auth.uid()));
CREATE POLICY "Assignees can view their tasks" ON public.tasks FOR SELECT USING (is_task_assignee(auth.uid(), id));
CREATE POLICY "Managers can create tasks" ON public.tasks FOR INSERT WITH CHECK (can_manage_tasks(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Managers can update all tasks" ON public.tasks FOR UPDATE USING (can_manage_tasks(auth.uid()));
CREATE POLICY "Assignees can update their tasks" ON public.tasks FOR UPDATE USING (is_task_assignee(auth.uid(), id));
CREATE POLICY "Admins can delete tasks" ON public.tasks FOR DELETE USING (has_role(auth.uid(), 'admin') OR (can_manage_tasks(auth.uid()) AND created_by = auth.uid()));
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: task_assignees
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers can view all assignees" ON public.task_assignees FOR SELECT USING (can_manage_tasks(auth.uid()));
CREATE POLICY "Users can view own assignments" ON public.task_assignees FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Managers can assign tasks" ON public.task_assignees FOR INSERT WITH CHECK (can_manage_tasks(auth.uid()));
CREATE POLICY "Managers can remove assignees" ON public.task_assignees FOR DELETE USING (can_manage_tasks(auth.uid()));

-- RLS: task_files
ALTER TABLE public.task_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers can view all task files" ON public.task_files FOR SELECT USING (can_manage_tasks(auth.uid()));
CREATE POLICY "Assignees can view task files" ON public.task_files FOR SELECT USING (is_task_assignee(auth.uid(), task_id));
CREATE POLICY "Managers can upload attachments" ON public.task_files FOR INSERT WITH CHECK (can_manage_tasks(auth.uid()) AND uploaded_by = auth.uid());
CREATE POLICY "Assignees can upload submissions" ON public.task_files FOR INSERT WITH CHECK (is_task_assignee(auth.uid(), task_id) AND uploaded_by = auth.uid() AND upload_type = 'submission');
CREATE POLICY "Admins can delete task files" ON public.task_files FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Uploaders can delete own files" ON public.task_files FOR DELETE USING (uploaded_by = auth.uid());

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('task-files', 'task-files', false);
CREATE POLICY "Auth users can upload task files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'task-files' AND auth.uid() IS NOT NULL);
CREATE POLICY "Auth users can view task files" ON storage.objects FOR SELECT USING (bucket_id = 'task-files' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own task files" ON storage.objects FOR DELETE USING (bucket_id = 'task-files' AND auth.uid()::text = (storage.foldername(name))[1]);
