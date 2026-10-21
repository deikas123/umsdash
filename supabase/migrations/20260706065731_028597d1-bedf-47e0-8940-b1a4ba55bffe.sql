
ALTER TABLE public.folder_shares
  ADD COLUMN IF NOT EXISTS include_subfolders boolean NOT NULL DEFAULT true;

-- Access: owner of any ancestor, direct share on this folder,
-- or share on an ancestor with include_subfolders = true
CREATE OR REPLACE FUNCTION public.has_folder_access(_user_id uuid, _folder_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE chain AS (
    SELECT id, parent_id, owner_id, 0 AS depth
    FROM public.folders WHERE id = _folder_id
    UNION ALL
    SELECT f.id, f.parent_id, f.owner_id, c.depth + 1
    FROM public.folders f
    JOIN chain c ON f.id = c.parent_id
  )
  SELECT
    EXISTS (SELECT 1 FROM chain WHERE owner_id = _user_id)
    OR EXISTS (
      SELECT 1 FROM public.folder_shares s
      JOIN chain c ON c.id = s.folder_id
      WHERE s.shared_with_user_id = _user_id
        AND (c.depth = 0 OR s.include_subfolders = true)
    )
$$;

-- Same rule for edit-share when adding documents
DROP POLICY IF EXISTS "Users with edit access can add documents" ON public.folder_documents;
CREATE POLICY "Users with edit access can add documents"
ON public.folder_documents
FOR INSERT
WITH CHECK (
  public.is_folder_owner(auth.uid(), folder_id)
  OR EXISTS (
    WITH RECURSIVE chain AS (
      SELECT id, parent_id, 0 AS depth
      FROM public.folders WHERE id = folder_documents.folder_id
      UNION ALL
      SELECT f.id, f.parent_id, c.depth + 1
      FROM public.folders f JOIN chain c ON f.id = c.parent_id
    )
    SELECT 1 FROM public.folder_shares s
    JOIN chain c ON c.id = s.folder_id
    WHERE s.shared_with_user_id = auth.uid()
      AND s.can_edit = true
      AND (c.depth = 0 OR s.include_subfolders = true)
  )
);
