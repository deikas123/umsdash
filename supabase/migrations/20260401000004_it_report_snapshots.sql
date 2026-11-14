-- Phase 3 Feature 14: IT report snapshots
-- Table it_report_snapshots already created in 20261111000001_it_command_centre.sql.
-- This migration adds the generated_at column alias and ensures index exists for queries.

ALTER TABLE public.it_report_snapshots
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_it_report_snapshots_type_gen
  ON public.it_report_snapshots (report_type, generated_at DESC);
