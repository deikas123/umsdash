
-- Add password tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS password_expiry_days INTEGER DEFAULT 90;
