-- Add is_private column to documents for admin-only visibility
ALTER TABLE public.documents ADD COLUMN is_private boolean NOT NULL DEFAULT false;

-- Add DELETE policy for customers (only if no documents exist)
CREATE POLICY "Admins can delete customers" 
ON public.customers 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update document SELECT policies to respect is_private flag
-- Drop existing policies first
DROP POLICY IF EXISTS "Customers can view their own documents" ON public.documents;

-- Recreate customer policy: customers can only see non-private documents
CREATE POLICY "Customers can view their own documents" 
ON public.documents 
FOR SELECT 
USING (
  customer_id = get_customer_id_for_user(auth.uid()) 
  AND is_private = false
);