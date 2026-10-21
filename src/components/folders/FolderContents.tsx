import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  Download, 
  Trash2, 
  Loader2,
  File,
  Image,
  FileVideo,
  FileAudio,
  Eye,
  FolderInput,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useFolderDocuments, useFolders, type Folder, type FolderDocument } from '@/hooks/useFolders';
import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';
import { MoveDocumentDialog } from '@/components/folders/MoveDocumentDialog';
import { CameraCapture } from '@/components/upload/CameraCapture';
import { format } from 'date-fns';

interface FolderContentsProps {
  folder: Folder;
  onBack: () => void;
}

export function FolderContents({ folder, onBack }: FolderContentsProps) {
  const { documents, loading, uploadDocument, deleteDocument, downloadDocument, getDocumentUrl, moveDocument } = useFolderDocuments(folder.id);
  const { folders } = useFolders();
  const [uploading, setUploading] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<FolderDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<FolderDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [moveDoc, setMoveDoc] = useState<FolderDocument | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    for (const file of acceptedFiles) {
      await uploadDocument(file);
    }
    setUploading(false);
  }, [uploadDocument]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: !folder.can_edit,
  });

  const handleCameraCapture = async (file: File) => {
    setUploading(true);
    await uploadDocument(file);
    setUploading(false);
  };

  const handlePreview = async (doc: FolderDocument) => {
    setPreviewDoc(doc);
    const url = await getDocumentUrl(doc.file_path);
    setPreviewUrl(url);
  };

  const handleClosePreview = () => {
    setPreviewDoc(null);
    setPreviewUrl(null);
  };

  const handleMoveDocument = async (targetFolderId: string) => {
    if (!moveDoc) return;
    await moveDocument(moveDoc.id, moveDoc.file_path, targetFolderId, moveDoc.file_name);
    setMoveDoc(null);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />;
    if (fileType.startsWith('video/')) return <FileVideo className="h-8 w-8 text-purple-500" />;
    if (fileType.startsWith('audio/')) return <FileAudio className="h-8 w-8 text-green-500" />;
    if (fileType === 'application/pdf') return <FileText className="h-8 w-8 text-red-500" />;
    return <File className="h-8 w-8 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDelete = () => {
    if (deleteDoc) {
      deleteDocument(deleteDoc.id, deleteDoc.file_path);
      setDeleteDoc(null);
    }
  };

  const canPreview = (fileType: string) => {
    return fileType.startsWith('image/') || fileType === 'application/pdf';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{folder.name}</h2>
          {folder.description && (
            <p className="text-sm text-muted-foreground">{folder.description}</p>
          )}
        </div>
      </div>

      {/* Upload area and camera */}
      {folder.can_edit && (
        <div className="space-y-3">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </div>
            ) : isDragActive ? (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-primary" />
                <p className="text-sm">Drop files here</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop files here, or click to browse
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-center">
            <CameraCapture onCapture={handleCameraCapture} />
          </div>
        </div>
      )}

      {/* Documents list */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No documents in this folder yet</p>
            {folder.can_edit && (
              <p className="text-sm text-muted-foreground mt-1">
                Upload files using the area above or take a photo
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="grid gap-2">
            {documents.map((doc) => (
              <Card key={doc.id} className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {getFileIcon(doc.file_type)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(doc.file_size)} • {format(new Date(doc.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {canPreview(doc.file_type) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePreview(doc)}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => downloadDocument(doc.file_path, doc.file_name)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {folder.can_edit && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMoveDoc(doc)}
                            title="Move to folder"
                          >
                            <FolderInput className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteDoc(doc)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Document Preview Dialog */}
      <DocumentPreviewDialog
        open={!!previewDoc}
        onOpenChange={handleClosePreview}
        url={previewUrl}
        title={previewDoc?.file_name || ''}
        fileType={previewDoc?.file_type || ''}
        onDownload={previewDoc ? () => downloadDocument(previewDoc.file_path, previewDoc.file_name) : undefined}
      />

      {/* Move Document Dialog */}
      {moveDoc && (
        <MoveDocumentDialog
          open={!!moveDoc}
          onOpenChange={() => setMoveDoc(null)}
          folders={folders}
          currentFolderId={folder.id}
          documentName={moveDoc.file_name}
          onMove={handleMoveDocument}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDoc?.file_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
