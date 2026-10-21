import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, History, MessageSquare, Download, Loader2, Send, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DocumentVersionsCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
}

interface Version {
  id: string;
  version_number: number;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by: string | null;
  notes: string | null;
  created_at: string;
  uploader_name?: string;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name?: string;
}

export function DocumentVersionsCommentsDialog({
  open,
  onOpenChange,
  documentId,
  documentTitle,
}: DocumentVersionsCommentsDialogProps) {
  const { user, isAdmin, isStaff } = useAuth();
  const { toast } = useToast();
  const [versions, setVersions] = useState<Version[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [versionNotes, setVersionNotes] = useState('');

  const fetchVersions = async () => {
    setLoadingVersions(true);
    const { data } = await supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false });

    if (data) {
      const uploaderIds = [...new Set(data.map(v => v.uploaded_by).filter(Boolean))] as string[];
      let uploaderMap: Record<string, string> = {};
      if (uploaderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', uploaderIds);
        if (profiles) {
          uploaderMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
        }
      }
      setVersions(data.map(v => ({
        ...v,
        uploader_name: v.uploaded_by ? uploaderMap[v.uploaded_by] : undefined,
      })));
    }
    setLoadingVersions(false);
  };

  const fetchComments = async () => {
    setLoadingComments(true);
    const { data } = await supabase
      .from('document_comments')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });

    if (data) {
      const userIds = [...new Set(data.map(c => c.user_id))] as string[];
      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        if (profiles) {
          userMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
        }
      }
      setComments(data.map(c => ({
        ...c,
        user_name: userMap[c.user_id] || 'Unknown',
      })));
    }
    setLoadingComments(false);
  };

  useEffect(() => {
    if (open && documentId) {
      fetchVersions();
      fetchComments();
    }
  }, [open, documentId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingVersion(true);
    try {
      const nextVersion = (versions[0]?.version_number || 0) + 1;
      const filePath = `versions/${documentId}/${nextVersion}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('document_versions')
        .insert({
          document_id: documentId,
          version_number: nextVersion,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user.id,
          notes: versionNotes || null,
        });

      if (insertError) throw insertError;

      toast({ title: 'Version uploaded', description: `Version ${nextVersion} has been added.` });
      setVersionNotes('');
      fetchVersions();
    } catch (error) {
      toast({ title: 'Upload failed', description: 'Could not upload new version.', variant: 'destructive' });
    } finally {
      setUploadingVersion(false);
    }
  };

  const handleDownloadVersion = async (version: Version) => {
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(version.file_path, 300);

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    setSubmittingComment(true);
    try {
      const { error } = await supabase
        .from('document_comments')
        .insert({
          document_id: documentId,
          user_id: user.id,
          content: newComment.trim(),
        });

      if (error) throw error;

      setNewComment('');
      fetchComments();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add comment.', variant: 'destructive' });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from('document_comments')
      .delete()
      .eq('id', commentId);

    if (!error) {
      fetchComments();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate">{documentTitle}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="versions" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="versions" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Versions ({versions.length})
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments ({comments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="versions" className="flex-1 overflow-hidden flex flex-col mt-4">
            {/* Upload new version */}
            {(isAdmin || isStaff) && (
              <div className="space-y-2 mb-4">
                <Label>Upload New Version</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Version notes (optional)"
                    value={versionNotes}
                    onChange={(e) => setVersionNotes(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="outline" disabled={uploadingVersion} asChild>
                    <label className="cursor-pointer">
                      {uploadingVersion ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploadingVersion}
                      />
                    </label>
                  </Button>
                </div>
              </div>
            )}

            <ScrollArea className="flex-1">
              {loadingVersions ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : versions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No versions uploaded yet.</p>
              ) : (
                <div className="space-y-3">
                  {versions.map((version, idx) => (
                    <div key={version.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={idx === 0 ? 'default' : 'outline'} className="text-xs">
                            v{version.version_number}
                          </Badge>
                          {idx === 0 && (
                            <Badge variant="secondary" className="text-xs">Latest</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium truncate mt-1">{version.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(version.file_size)} • {version.uploader_name || 'Unknown'} • {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                        </p>
                        {version.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">"{version.notes}"</p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadVersion(version)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="comments" className="flex-1 overflow-hidden flex flex-col mt-4">
            <ScrollArea className="flex-1 mb-4">
              {loadingComments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No comments yet. Be the first to comment.</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-sm font-medium">{comment.user_name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {comment.user_id === user?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm mt-1">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {(isAdmin || isStaff) && (
              <div className="flex gap-2">
                <Textarea
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 min-h-[60px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || submittingComment}
                  size="icon"
                  className="self-end"
                >
                  {submittingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
