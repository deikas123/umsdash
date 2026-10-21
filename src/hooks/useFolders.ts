import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Folder {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  is_owner: boolean;
  can_edit: boolean;
}

export interface FolderShare {
  id: string;
  folder_id: string;
  shared_with_user_id: string;
  can_edit: boolean;
  include_subfolders: boolean;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export interface FolderDocument {
  id: string;
  folder_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin, isStaff } = useAuth();
  const { toast } = useToast();

  const fetchFolders = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check ownership and edit permissions for each folder
      const foldersWithPermissions = await Promise.all(
        (data || []).map(async (folder) => {
          const isOwner = folder.owner_id === user.id;
          let canEdit = isOwner || isAdmin;

          if (!isOwner && !isAdmin) {
            const { data: shareData } = await supabase
              .from('folder_shares')
              .select('can_edit')
              .eq('folder_id', folder.id)
              .eq('shared_with_user_id', user.id)
              .single();

            canEdit = shareData?.can_edit || false;
          }

          return {
            ...folder,
            is_owner: isOwner,
            can_edit: canEdit,
          };
        })
      );

      setFolders(foldersWithPermissions);
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch folders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, toast]);

  const createFolder = async (name: string, description?: string, parentId?: string | null) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('folders')
        .insert({
          name,
          description,
          owner_id: user.id,
          parent_id: parentId ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: parentId ? 'Sub-folder created successfully' : 'Folder created successfully',
      });

      await fetchFolders();
      return data;
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to create folder',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateFolder = async (folderId: string, name: string, description?: string) => {
    try {
      const { error } = await supabase
        .from('folders')
        .update({ name, description })
        .eq('id', folderId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Folder updated successfully',
      });

      await fetchFolders();
    } catch (error) {
      console.error('Error updating folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to update folder',
        variant: 'destructive',
      });
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Folder deleted successfully',
      });

      await fetchFolders();
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete folder',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  return {
    folders,
    loading,
    createFolder,
    updateFolder,
    deleteFolder,
    refetch: fetchFolders,
    canCreateFolder: isAdmin || isStaff,
  };
}

export function useFolderShares(folderId: string) {
  const [shares, setShares] = useState<FolderShare[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchShares = useCallback(async () => {
    if (!folderId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('folder_shares')
        .select('*')
        .eq('folder_id', folderId);

      if (error) throw error;

      // Fetch user info for each share
      const sharesWithUserInfo = await Promise.all(
        (data || []).map(async (share) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', share.shared_with_user_id)
            .single();

          return {
            ...share,
            user_name: profileData?.full_name,
            user_email: profileData?.email,
          };
        })
      );

      setShares(sharesWithUserInfo);
    } catch (error) {
      console.error('Error fetching shares:', error);
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  const addShare = async (
    userId: string,
    canEdit: boolean = false,
    includeSubfolders: boolean = true,
  ) => {
    try {
      const { error } = await supabase
        .from('folder_shares')
        .insert({
          folder_id: folderId,
          shared_with_user_id: userId,
          can_edit: canEdit,
          include_subfolders: includeSubfolders,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Folder shared successfully',
      });

      await fetchShares();
    } catch (error: any) {
      console.error('Error sharing folder:', error);
      toast({
        title: 'Error',
        description: error.message?.includes('duplicate')
          ? 'Already shared with this user'
          : 'Failed to share folder',
        variant: 'destructive',
      });
    }
  };

  const updateShare = async (
    shareId: string,
    updates: { can_edit?: boolean; include_subfolders?: boolean },
  ) => {
    try {
      const { error } = await supabase
        .from('folder_shares')
        .update(updates)
        .eq('id', shareId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Share permissions updated',
      });

      await fetchShares();
    } catch (error) {
      console.error('Error updating share:', error);
      toast({
        title: 'Error',
        description: 'Failed to update share permissions',
        variant: 'destructive',
      });
    }
  };

  const removeShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('folder_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Share removed',
      });

      await fetchShares();
    } catch (error) {
      console.error('Error removing share:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove share',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  return {
    shares,
    loading,
    addShare,
    updateShare,
    removeShare,
    refetch: fetchShares,
  };
}

export function useFolderDocuments(folderId: string) {
  const [documents, setDocuments] = useState<FolderDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchDocuments = useCallback(async () => {
    if (!folderId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('folder_documents')
        .select('*')
        .eq('folder_id', folderId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching folder documents:', error);
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  const uploadDocument = async (file: File) => {
    if (!user || !folderId) return null;

    try {
      // Upload file to storage
      const filePath = `folders/${folderId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data, error } = await supabase
        .from('folder_documents')
        .insert({
          folder_id: folderId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
      });

      await fetchDocuments();
      return data;
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload document',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteDocument = async (documentId: string, filePath: string) => {
    try {
      // Delete from storage
      await supabase.storage.from('documents').remove([filePath]);

      // Delete record
      const { error } = await supabase
        .from('folder_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      });

      await fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive',
      });
    }
  };

  const downloadDocument = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: 'Error',
        description: 'Failed to download document',
        variant: 'destructive',
      });
    }
  };

  const getDocumentUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting document URL:', error);
      return null;
    }
  };

  const moveDocument = async (documentId: string, oldFilePath: string, targetFolderId: string, fileName: string) => {
    if (!user) return false;

    try {
      // Download the file first
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(oldFilePath);

      if (downloadError) throw downloadError;

      // Upload to new location
      const newFilePath = `folders/${targetFolderId}/${Date.now()}_${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(newFilePath, fileData);

      if (uploadError) throw uploadError;

      // Update the record
      const { error: updateError } = await supabase
        .from('folder_documents')
        .update({
          folder_id: targetFolderId,
          file_path: newFilePath,
        })
        .eq('id', documentId);

      if (updateError) throw updateError;

      // Delete old file
      await supabase.storage.from('documents').remove([oldFilePath]);

      toast({
        title: 'Success',
        description: 'Document moved successfully',
      });

      await fetchDocuments();
      return true;
    } catch (error) {
      console.error('Error moving document:', error);
      toast({
        title: 'Error',
        description: 'Failed to move document',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    documents,
    loading,
    uploadDocument,
    deleteDocument,
    downloadDocument,
    getDocumentUrl,
    moveDocument,
    refetch: fetchDocuments,
  };
}
