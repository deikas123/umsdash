
-- Fix folder RLS: Remove admin-sees-all policies to make folders truly private
DROP POLICY IF EXISTS "Admins can manage all folders" ON public.folders;
DROP POLICY IF EXISTS "Admins can manage all folder documents" ON public.folder_documents;
DROP POLICY IF EXISTS "Admins can manage all folder shares" ON public.folder_shares;

-- Admins can only manage their OWN folders (same as staff)
CREATE POLICY "Admins can manage own folders"
ON public.folders FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

-- Admins can only manage documents in their own folders or shared folders
CREATE POLICY "Admins can manage own folder documents"
ON public.folder_documents FOR ALL
USING (is_folder_owner(auth.uid(), folder_id));

-- Admins can manage shares only for folders they own
CREATE POLICY "Admins can manage own folder shares"
ON public.folder_shares FOR ALL
USING (is_folder_owner(auth.uid(), folder_id));

-- Create deletion_requests table for document deletion approval workflow
CREATE TABLE public.deletion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can request deletion"
ON public.deletion_requests FOR INSERT
WITH CHECK ((has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) AND requested_by = auth.uid());

CREATE POLICY "Admins can view all deletion requests"
ON public.deletion_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view own deletion requests"
ON public.deletion_requests FOR SELECT
USING (requested_by = auth.uid());

CREATE POLICY "Admins can update deletion requests"
ON public.deletion_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete deletion requests"
ON public.deletion_requests FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
