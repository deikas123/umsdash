-- M3: Asset depreciation columns on it_hardware_inventory
-- Applied directly to live DB; this file tracks it for re-deploy / CI.

ALTER TABLE public.it_hardware_inventory
  ADD COLUMN IF NOT EXISTS useful_life_years INT          NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS residual_value     NUMERIC(12,2) NOT NULL DEFAULT 0;
