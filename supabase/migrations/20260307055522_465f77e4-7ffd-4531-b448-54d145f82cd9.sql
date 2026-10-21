
-- Add individual status tracking per assignee
ALTER TABLE public.task_assignees 
ADD COLUMN status text NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'in_progress', 'completed'));
