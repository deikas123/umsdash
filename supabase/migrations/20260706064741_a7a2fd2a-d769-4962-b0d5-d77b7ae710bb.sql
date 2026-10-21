
-- Add parent_id for sub-folders
ALTER TABLE public.folders
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.folders(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS folders_parent_id_idx ON public.folders(parent_id);

-- Owner walks up the ancestor chain: owning any ancestor = owning descendants
CREATE OR REPLACE FUNCTION public.is_folder_owner(_user_id uuid, _folder_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE chain AS (
    SELECT id, parent_id, owner_id FROM public.folders WHERE id = _folder_id
    UNION ALL
    SELECT f.id, f.parent_id, f.owner_id
    FROM public.folders f
    JOIN chain c ON f.id = c.parent_id
  )
  SELECT EXISTS (SELECT 1 FROM chain WHERE owner_id = _user_id)
$$;

-- Access walks up: share on any ancestor grants access to descendants
CREATE OR REPLACE FUNCTION public.has_folder_access(_user_id uuid, _folder_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE chain AS (
    SELECT id, parent_id, owner_id FROM public.folders WHERE id = _folder_id
    UNION ALL
    SELECT f.id, f.parent_id, f.owner_id
    FROM public.folders f
    JOIN chain c ON f.id = c.parent_id
  )
  SELECT
    EXISTS (SELECT 1 FROM chain WHERE owner_id = _user_id)
    OR EXISTS (
      SELECT 1 FROM public.folder_shares s
      JOIN chain c ON c.id = s.folder_id
      WHERE s.shared_with_user_id = _user_id
    )
$$;

-- Extend "view shared folders" policy so shared users see descendants too
DROP POLICY IF EXISTS "Users can view shared folders" ON public.folders;
CREATE POLICY "Users can view shared folders"
ON public.folders
FOR SELECT
USING (public.has_folder_access(auth.uid(), id));

-- Extend edit-share check for adding documents to descendants
DROP POLICY IF EXISTS "Users with edit access can add documents" ON public.folder_documents;
CREATE POLICY "Users with edit access can add documents"
ON public.folder_documents
FOR INSERT
WITH CHECK (
  public.is_folder_owner(auth.uid(), folder_id)
  OR EXISTS (
    WITH RECURSIVE chain AS (
      SELECT id, parent_id FROM public.folders WHERE id = folder_documents.folder_id
      UNION ALL
      SELECT f.id, f.parent_id FROM public.folders f JOIN chain c ON f.id = c.parent_id
    )
    SELECT 1 FROM public.folder_shares s
    JOIN chain c ON c.id = s.folder_id
    WHERE s.shared_with_user_id = auth.uid() AND s.can_edit = true
  )
);
