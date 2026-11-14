-- hr_advent_messages
CREATE TABLE IF NOT EXISTS public.hr_advent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day INT NOT NULL CHECK (day BETWEEN 1 AND 25),
  message TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(day)
);

ALTER TABLE public.hr_advent_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "advent_read_all" ON public.hr_advent_messages;
CREATE POLICY "advent_read_all" ON public.hr_advent_messages
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "advent_hr_write" ON public.hr_advent_messages;
CREATE POLICY "advent_hr_write" ON public.hr_advent_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('hr_manager','gm','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('hr_manager','gm','admin')
    )
  );

-- Pre-seed 25 fun/motivational messages (INSERT OR IGNORE)
INSERT INTO public.hr_advent_messages (day, message) VALUES
  (1,  '🌟 Welcome to December! You are the reason UMS Kenya shines every day.'),
  (2,  '☕ Grab a warm drink — you have earned it. Your dedication is noticed.'),
  (3,  '🤝 Teamwork makes the dream work. Shout out to every colleague who helped you this year.'),
  (4,  '📈 Did you know? UMS Kenya has grown every single year. You are part of that story.'),
  (5,  '🎵 Fun fact: humming while you work actually boosts concentration. Try it today!'),
  (6,  '🌍 UMS Kenya serves clients across the country — your work has a real impact.'),
  (7,  '💡 Your best idea of the year might still be ahead of you. Keep thinking big.'),
  (8,  '🏆 Celebrating every win, big or small. What was YOUR win this week?'),
  (9,  '🌱 Growth is not always visible day to day — but it is always happening. Keep going.'),
  (10, '🎉 10 days in! You are a December champion already.'),
  (11, '🦸 Behind every great company are great people. You are one of them.'),
  (12, '📚 Learning something new takes courage. Proud of everyone who stepped up this year.'),
  (13, '🌈 Diversity of thought is UMS Kenya''s superpower — including yours.'),
  (14, '🕯️ Halfway through December! The festive energy is real. Enjoy it.'),
  (15, '💬 A kind word to a colleague costs nothing and means everything.'),
  (16, '🚀 Remember January 2026? Look how far we have come together.'),
  (17, '🎄 The best Christmas gift you can give a teammate: genuine appreciation.'),
  (18, '🧩 Every role at UMS Kenya is a piece of the puzzle. Without you, it is incomplete.'),
  (19, '🌟 You showed up. Even on the hard days. That matters more than you know.'),
  (20, '🎁 Five more sleeps! The office is officially in holiday mode.'),
  (21, '🌙 The longest night of the year — but every dawn after this is a little brighter.'),
  (22, '🤗 Check in on a colleague today. Sometimes a quick message changes someone''s whole day.'),
  (23, '🛷 Almost there! Finish strong — the holiday is just around the corner.'),
  (24, '🎅 Christmas Eve! Wishing every member of the UMS Kenya family warmth and joy tonight.'),
  (25, '🎄 Merry Christmas! Today we celebrate — you, your family, and everything we have built together. See you in the New Year! 🎆')
ON CONFLICT (day) DO NOTHING;
