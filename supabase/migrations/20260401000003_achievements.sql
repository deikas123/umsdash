-- Phase 3 Feature 12: Additional achievement definitions
-- achievement_definitions and user_achievements tables already exist from gamification migration.
-- Insert missing slugs used by BadgeWall / awardBadgeIfEarned.

INSERT INTO public.achievements (key, name, description, icon, xp_reward, category)
VALUES
  ('docs_100',           'Century Uploader',      'Upload 100 documents',                '💯', 400, 'volume'),
  ('perfect_attendance', 'Perfect Attendance',    'Full month of on-time attendance',    '🌟', 200, 'hr'),
  ('ticket_hero_10',     'Ticket Hero',           'Resolve 10 IT helpdesk tickets',      '🎫', 150, 'it')
ON CONFLICT (key) DO NOTHING;
