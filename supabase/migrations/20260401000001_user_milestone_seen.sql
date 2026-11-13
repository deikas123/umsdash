CREATE TABLE IF NOT EXISTS public.user_milestone_seen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  milestone TEXT NOT NULL,
  seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, milestone)
);
ALTER TABLE public.user_milestone_seen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own milestones" ON public.user_milestone_seen FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
