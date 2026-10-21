-- Add color column to document_categories table
ALTER TABLE public.document_categories 
ADD COLUMN color text DEFAULT '#3b82f6';

-- Update existing categories with distinct colors
UPDATE public.document_categories SET color = '#ef4444' WHERE name ILIKE '%Registration%';
UPDATE public.document_categories SET color = '#f59e0b' WHERE name ILIKE '%Service%';
UPDATE public.document_categories SET color = '#22c55e' WHERE name ILIKE '%Billing%' OR name ILIKE '%Payment%';
UPDATE public.document_categories SET color = '#8b5cf6' WHERE name ILIKE '%Legal%' OR name ILIKE '%Compliance%';
UPDATE public.document_categories SET color = '#06b6d4' WHERE name ILIKE '%Support%' OR name ILIKE '%Complaint%';
UPDATE public.document_categories SET color = '#6b7280' WHERE name ILIKE '%Archived%';