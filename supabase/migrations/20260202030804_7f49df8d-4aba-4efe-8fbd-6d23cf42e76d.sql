-- Fix the incorrect RLS policy for shared folders
-- The current policy has a bug: folder_shares.folder_id = folder_shares.id (should be folders.id)

DROP POLICY IF EXISTS "Users can view shared folders" ON public.folders;

CREATE POLICY "Users can view shared folders"
ON public.folders
FOR SELECT
USING (
  (owner_id = auth.uid()) OR 
  (EXISTS (
    SELECT 1 FROM public.folder_shares
    WHERE folder_shares.folder_id = folders.id 
    AND folder_shares.shared_with_user_id = auth.uid()
  ))
);

-- Add unique constraint to prevent duplicate shares
ALTER TABLE public.folder_shares 
ADD CONSTRAINT unique_folder_share UNIQUE (folder_id, shared_with_user_id);