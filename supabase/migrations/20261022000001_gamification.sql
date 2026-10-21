-- =============================================================================
-- Gamification System Migration
-- Creates tables, RLS policies, SECURITY DEFINER functions, triggers, and seed data
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABLE DEFINITIONS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.upload_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_upload_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  xp_reward INT NOT NULL DEFAULT 0,
  category TEXT
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL REFERENCES public.achievements(key) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);

CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  type TEXT NOT NULL,
  target_count INT NOT NULL DEFAULT 1,
  xp_reward INT NOT NULL DEFAULT 50,
  label TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🎯'
);

CREATE TABLE IF NOT EXISTS public.user_daily_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL REFERENCES public.daily_challenges(date) ON DELETE CASCADE,
  progress INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, challenge_date)
);

CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  reason TEXT NOT NULL,
  ref_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

-- user_xp: allow all authenticated users to read (for leaderboard)
CREATE POLICY "Users can view xp for leaderboard"
  ON public.user_xp FOR SELECT
  TO authenticated
  USING (true);

-- upload_streaks: own rows only
CREATE POLICY "Users view own upload streaks"
  ON public.upload_streaks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- achievements: reference data, all can read
CREATE POLICY "Users can view achievements"
  ON public.achievements FOR SELECT
  TO authenticated
  USING (true);

-- user_achievements: own rows only
CREATE POLICY "Users view own achievements"
  ON public.user_achievements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- daily_challenges: reference data, all can read
CREATE POLICY "Users can view daily challenges"
  ON public.daily_challenges FOR SELECT
  TO authenticated
  USING (true);

-- user_daily_progress: own rows only
CREATE POLICY "Users view own daily progress"
  ON public.user_daily_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- xp_transactions: own rows only
CREATE POLICY "Users view own xp transactions"
  ON public.xp_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. SECURITY DEFINER FUNCTIONS
-- ---------------------------------------------------------------------------

-- award_xp: inserts xp_transaction and upserts user_xp with level recalc
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_ref_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.xp_transactions(user_id, amount, reason, ref_id)
  VALUES (p_user_id, p_amount, p_reason, p_ref_id);

  INSERT INTO public.user_xp(user_id, total_xp, level)
  VALUES (p_user_id, p_amount, 1)
  ON CONFLICT(user_id) DO UPDATE
    SET total_xp   = public.user_xp.total_xp + p_amount,
        level      = GREATEST(1, floor(1 + sqrt((public.user_xp.total_xp + p_amount)::float / 100))::int),
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_xp(UUID, INT, TEXT, UUID) TO authenticated;

-- insert_in_app_notification_for_user: SECURITY DEFINER wrapper for in_app_notifications
CREATE OR REPLACE FUNCTION public.insert_in_app_notification_for_user(
  p_user_id UUID,
  p_title   TEXT,
  p_message TEXT,
  p_type    TEXT DEFAULT 'gamification'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.in_app_notifications(user_id, title, message, type, is_read)
  VALUES (p_user_id, p_title, p_message, p_type, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_in_app_notification_for_user(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- process_document_upload: streak logic, XP, daily challenge, achievements
CREATE OR REPLACE FUNCTION public.process_document_upload(
  p_user_id UUID,
  p_doc_id  UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak       INT;
  v_longest      INT;
  v_last_date    DATE;
  v_new_streak   INT;
  v_new_longest  INT;
  v_challenge_id UUID;
  v_doc_count    INT;
BEGIN
  -- ---- Streak upsert ----
  SELECT current_streak, longest_streak, last_upload_date
    INTO v_streak, v_longest, v_last_date
    FROM public.upload_streaks
   WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    v_new_streak  := 1;
    v_new_longest := 1;
    INSERT INTO public.upload_streaks(user_id, current_streak, longest_streak, last_upload_date, updated_at)
    VALUES (p_user_id, v_new_streak, v_new_longest, CURRENT_DATE, now());
  ELSIF v_last_date = CURRENT_DATE THEN
    -- Same-day re-upload: no change to streak counts
    v_new_streak  := v_streak;
    v_new_longest := v_longest;
  ELSIF v_last_date = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Consecutive day: increment streak
    v_new_streak  := v_streak + 1;
    v_new_longest := GREATEST(v_longest, v_new_streak);
    UPDATE public.upload_streaks
       SET current_streak   = v_new_streak,
           longest_streak   = v_new_longest,
           last_upload_date = CURRENT_DATE,
           updated_at       = now()
     WHERE user_id = p_user_id;
  ELSE
    -- Gap > 1 day: reset streak
    v_new_streak  := 1;
    v_new_longest := GREATEST(v_longest, 1);
    UPDATE public.upload_streaks
       SET current_streak   = v_new_streak,
           longest_streak   = v_new_longest,
           last_upload_date = CURRENT_DATE,
           updated_at       = now()
     WHERE user_id = p_user_id;
  END IF;

  -- ---- Award XP ----
  PERFORM public.award_xp(p_user_id, 50, 'document_upload', p_doc_id);

  -- ---- Daily challenge progress ----
  SELECT id INTO v_challenge_id
    FROM public.daily_challenges
   WHERE date = CURRENT_DATE
     AND type = 'upload'
   LIMIT 1;

  IF v_challenge_id IS NOT NULL THEN
    INSERT INTO public.user_daily_progress(user_id, challenge_date, progress, completed, completed_at)
    VALUES (p_user_id, CURRENT_DATE, 1, TRUE, now())
    ON CONFLICT(user_id, challenge_date) DO UPDATE
      SET progress     = LEAST(public.user_daily_progress.progress + 1,
                               (SELECT target_count FROM public.daily_challenges WHERE date = CURRENT_DATE AND type = 'upload' LIMIT 1)),
          completed    = (public.user_daily_progress.progress + 1 >=
                         (SELECT target_count FROM public.daily_challenges WHERE date = CURRENT_DATE AND type = 'upload' LIMIT 1)),
          completed_at = CASE
                           WHEN public.user_daily_progress.completed = FALSE
                                AND (public.user_daily_progress.progress + 1 >=
                                     (SELECT target_count FROM public.daily_challenges WHERE date = CURRENT_DATE AND type = 'upload' LIMIT 1))
                           THEN now()
                           ELSE public.user_daily_progress.completed_at
                         END;
  END IF;

  -- ---- First upload achievement ----
  INSERT INTO public.user_achievements(user_id, achievement_key)
  VALUES (p_user_id, 'first_upload')
  ON CONFLICT(user_id, achievement_key) DO NOTHING;

  -- ---- Streak milestone achievements ----
  IF v_new_streak >= 3 THEN
    INSERT INTO public.user_achievements(user_id, achievement_key)
    VALUES (p_user_id, 'streak_3')
    ON CONFLICT(user_id, achievement_key) DO NOTHING;

    IF NOT EXISTS (
      SELECT 1 FROM public.user_achievements
       WHERE user_id = p_user_id AND achievement_key = 'streak_3'
    ) THEN
      PERFORM public.insert_in_app_notification_for_user(
        p_user_id,
        '🔥 3-Day Streak!',
        'You''ve uploaded documents 3 days in a row. Keep it up!',
        'gamification'
      );
    END IF;
  END IF;

  IF v_new_streak >= 7 THEN
    INSERT INTO public.user_achievements(user_id, achievement_key)
    VALUES (p_user_id, 'streak_7')
    ON CONFLICT(user_id, achievement_key) DO NOTHING;

    IF NOT EXISTS (
      SELECT 1 FROM public.user_achievements
       WHERE user_id = p_user_id AND achievement_key = 'streak_7'
    ) THEN
      PERFORM public.insert_in_app_notification_for_user(
        p_user_id,
        '⚡ Week Warrior!',
        'Amazing! 7-day upload streak achieved.',
        'gamification'
      );
    END IF;
  END IF;

  IF v_new_streak >= 14 THEN
    INSERT INTO public.user_achievements(user_id, achievement_key)
    VALUES (p_user_id, 'streak_14')
    ON CONFLICT(user_id, achievement_key) DO NOTHING;

    IF NOT EXISTS (
      SELECT 1 FROM public.user_achievements
       WHERE user_id = p_user_id AND achievement_key = 'streak_14'
    ) THEN
      PERFORM public.insert_in_app_notification_for_user(
        p_user_id,
        '🏆 Fortnight Fire!',
        'You''ve uploaded documents for 14 days straight!',
        'gamification'
      );
    END IF;
  END IF;

  IF v_new_streak >= 30 THEN
    INSERT INTO public.user_achievements(user_id, achievement_key)
    VALUES (p_user_id, 'streak_30')
    ON CONFLICT(user_id, achievement_key) DO NOTHING;

    IF NOT EXISTS (
      SELECT 1 FROM public.user_achievements
       WHERE user_id = p_user_id AND achievement_key = 'streak_30'
    ) THEN
      PERFORM public.insert_in_app_notification_for_user(
        p_user_id,
        '👑 Monthly Master!',
        'Incredible! 30-day upload streak. You are a legend!',
        'gamification'
      );
    END IF;
  END IF;

  -- ---- Volume achievements (count-based) — handled by check_and_award_achievements ----
  SELECT count(*) INTO v_doc_count
    FROM public.documents
   WHERE uploaded_by = p_user_id;

  IF v_doc_count >= 10 THEN
    INSERT INTO public.user_achievements(user_id, achievement_key)
    VALUES (p_user_id, 'uploads_10')
    ON CONFLICT(user_id, achievement_key) DO NOTHING;
  END IF;

  IF v_doc_count >= 50 THEN
    INSERT INTO public.user_achievements(user_id, achievement_key)
    VALUES (p_user_id, 'uploads_50')
    ON CONFLICT(user_id, achievement_key) DO NOTHING;
  END IF;

END;
$$;

GRANT EXECUTE ON FUNCTION public.process_document_upload(UUID, UUID) TO authenticated;

-- check_and_award_achievements: evaluates upload count and awards achievements
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc_count INT;
BEGIN
  SELECT count(*) INTO v_doc_count
    FROM public.documents
   WHERE uploaded_by = p_user_id;

  IF v_doc_count >= 10 THEN
    INSERT INTO public.user_achievements(user_id, achievement_key)
    VALUES (p_user_id, 'uploads_10')
    ON CONFLICT(user_id, achievement_key) DO NOTHING;
  END IF;

  IF v_doc_count >= 50 THEN
    INSERT INTO public.user_achievements(user_id, achievement_key)
    VALUES (p_user_id, 'uploads_50')
    ON CONFLICT(user_id, achievement_key) DO NOTHING;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_award_achievements(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. TRIGGER FUNCTIONS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_fn_document_upload_gamification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.uploaded_by IS NOT NULL THEN
    PERFORM public.process_document_upload(NEW.uploaded_by, NEW.id);
    PERFORM public.check_and_award_achievements(NEW.uploaded_by);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_fn_task_completion_gamification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.award_xp(NEW.user_id, 30, 'task_completed', NEW.task_id);

  INSERT INTO public.user_achievements(user_id, achievement_key)
  VALUES (NEW.user_id, 'task_complete')
  ON CONFLICT(user_id, achievement_key) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_fn_reminder_completion_gamification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.award_xp(NEW.user_id, 20, 'reminder_completed', NEW.id);

  INSERT INTO public.user_achievements(user_id, achievement_key)
  VALUES (NEW.user_id, 'reminder_champion')
  ON CONFLICT(user_id, achievement_key) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. TRIGGERS
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS gamification_on_document_upload ON public.documents;
CREATE TRIGGER gamification_on_document_upload
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_document_upload_gamification();

DROP TRIGGER IF EXISTS gamification_on_task_complete ON public.task_assignees;
CREATE TRIGGER gamification_on_task_complete
  AFTER UPDATE ON public.task_assignees
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status <> 'completed')
  EXECUTE FUNCTION public.trg_fn_task_completion_gamification();

DROP TRIGGER IF EXISTS gamification_on_reminder_complete ON public.reminders;
CREATE TRIGGER gamification_on_reminder_complete
  AFTER UPDATE ON public.reminders
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status <> 'completed')
  EXECUTE FUNCTION public.trg_fn_reminder_completion_gamification();

-- ---------------------------------------------------------------------------
-- 6. SEED DATA — ACHIEVEMENTS
-- ---------------------------------------------------------------------------

INSERT INTO public.achievements (key, name, description, icon, xp_reward, category) VALUES
  ('first_upload',       'First Upload',      'Upload your first document',          '📄', 50,  'upload'),
  ('streak_3',           '3-Day Streak',      'Upload documents 3 days in a row',    '🔥', 75,  'streak'),
  ('streak_7',           'Week Warrior',      'Upload 7 days in a row',              '⚡', 150, 'streak'),
  ('streak_14',          'Fortnight Fire',    '14-day upload streak',                '🏆', 300, 'streak'),
  ('streak_30',          'Monthly Master',    '30-day upload streak',                '👑', 500, 'streak'),
  ('uploads_10',         'Document Hoarder',  'Upload 10 documents',                 '📚', 100, 'volume'),
  ('uploads_50',         'Archive Legend',    'Upload 50 documents',                 '🗄️', 250, 'volume'),
  ('task_complete',      'Task Crusher',      'Complete your first task',            '✅', 30,  'tasks'),
  ('reminder_champion',  'On Time',           'Complete a reminder on time',         '⏰', 20,  'reminders')
ON CONFLICT(key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. SEED DATA — DAILY CHALLENGES (next 7 days)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  i INT;
  v_date DATE;
  v_type TEXT;
  v_label TEXT;
  v_icon TEXT;
  v_xp INT;
BEGIN
  FOR i IN 0..6 LOOP
    v_date := CURRENT_DATE + i;
    IF (i % 2) = 0 THEN
      v_type  := 'upload';
      v_label := 'Upload a document today';
      v_icon  := '📤';
      v_xp    := 50;
    ELSE
      v_type  := 'task';
      v_label := 'Complete a task today';
      v_icon  := '✅';
      v_xp    := 30;
    END IF;

    INSERT INTO public.daily_challenges(date, type, target_count, xp_reward, label, icon)
    VALUES (v_date, v_type, 1, v_xp, v_label, v_icon)
    ON CONFLICT(date) DO NOTHING;
  END LOOP;
END;
$$;
