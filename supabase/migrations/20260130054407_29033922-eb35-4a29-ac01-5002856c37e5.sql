-- Create folders table for private folders
CREATE TABLE public.folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create folder sharing table
CREATE TABLE public.folder_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(folder_id, shared_with_user_id)
);

-- Create folder documents table to link documents to folders
CREATE TABLE public.folder_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_documents ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has folder access
CREATE OR REPLACE FUNCTION public.has_folder_access(_user_id UUID, _folder_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.folders WHERE id = _folder_id AND owner_id = _user_id
    UNION
    SELECT 1 FROM public.folder_shares WHERE folder_id = _folder_id AND shared_with_user_id = _user_id
  )
$$;

-- Helper function to check if user is folder owner
CREATE OR REPLACE FUNCTION public.is_folder_owner(_user_id UUID, _folder_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.folders WHERE id = _folder_id AND owner_id = _user_id
  )
$$;

-- Folders policies (Admin and Staff can create)
CREATE POLICY "Admins can manage all folders"
ON public.folders FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can create folders"
ON public.folders FOR INSERT
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Staff can manage their own folders"
ON public.folders FOR ALL
USING (has_role(auth.uid(), 'staff'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Users can view shared folders"
ON public.folders FOR SELECT
USING (
  owner_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.folder_shares WHERE folder_id = id AND shared_with_user_id = auth.uid())
);

-- Folder shares policies
CREATE POLICY "Admins can manage all folder shares"
ON public.folder_shares FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Folder owners can manage shares"
ON public.folder_shares FOR ALL
USING (is_folder_owner(auth.uid(), folder_id));

CREATE POLICY "Users can view their shares"
ON public.folder_shares FOR SELECT
USING (shared_with_user_id = auth.uid());

-- Folder documents policies
CREATE POLICY "Admins can manage all folder documents"
ON public.folder_documents FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Folder owners can manage documents"
ON public.folder_documents FOR ALL
USING (is_folder_owner(auth.uid(), folder_id));

CREATE POLICY "Users with folder access can view documents"
ON public.folder_documents FOR SELECT
USING (has_folder_access(auth.uid(), folder_id));

CREATE POLICY "Users with edit access can add documents"
ON public.folder_documents FOR INSERT
WITH CHECK (
  is_folder_owner(auth.uid(), folder_id) OR
  EXISTS (SELECT 1 FROM public.folder_shares WHERE folder_id = folder_documents.folder_id AND shared_with_user_id = auth.uid() AND can_edit = true)
);

-- Update timestamp trigger for folders
CREATE TRIGGER update_folders_updated_at
BEFORE UPDATE ON public.folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();