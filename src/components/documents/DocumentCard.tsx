import { useState } from 'react';
import { FileText, Download, Eye, MoreVertical, Calendar, User, Trash2, Lock, Unlock, Upload, Pencil, History, MessageSquare, Stamp, ScanText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DocumentStatusActions } from './DocumentStatusActions';
import { DocumentVersionsCommentsDialog } from './DocumentVersionsCommentsDialog';
import { Document } from '@/hooks/useDocuments';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface DocumentCardProps {
  document: Document;
  onView?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onStatusChange?: () => void;
  onPrivacyToggle?: () => void;
  onExtractText?: () => void;
  showCustomer?: boolean;
}

export function DocumentCard({
  document,
  onView,
  onDownload,
  onDelete,
  onEdit,
  onStatusChange,
  onPrivacyToggle,
  onExtractText,
  showCustomer = true,
}: DocumentCardProps) {
  const { isAdmin, isStaff } = useAuth();
  const [versionsOpen, setVersionsOpen] = useState(false);
  
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) {
      return <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-destructive" />;
    } else if (fileType.includes('image')) {
      return <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-accent" />;
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />;
    }
    return <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'archived':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'archived':
        return 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400';
      default:
        return '';
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
    <Card className="document-card">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* File Icon */}
          <div className="flex-shrink-0 p-1.5 sm:p-2 bg-muted rounded-lg">
            {getFileIcon(document.file_type)}
          </div>

          {/* Document Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm sm:text-base truncate">{document.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {document.file_name}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {(isAdmin || isStaff) && (
                  <DocumentStatusActions
                    documentId={document.id}
                    documentTitle={document.title}
                    currentStatus={document.status}
                    onStatusChange={onStatusChange}
                  />
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {onView && (
                      <DropdownMenuItem onClick={onView}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                    )}
                    {onDownload && (
                      <DropdownMenuItem onClick={onDownload}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                    )}
                    {onEdit && (isAdmin || isStaff) && (
                      <DropdownMenuItem onClick={onEdit}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {(isAdmin || isStaff) && (
                      <DropdownMenuItem onClick={() => setVersionsOpen(true)}>
                        <History className="mr-2 h-4 w-4" />
                        Versions & Comments
                      </DropdownMenuItem>
                    )}
                    {onExtractText && (isAdmin || isStaff) && (
                      <DropdownMenuItem onClick={onExtractText}>
                        <ScanText className="mr-2 h-4 w-4" />
                        Extract Text
                      </DropdownMenuItem>
                    )}
                    {onPrivacyToggle && isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onPrivacyToggle}>
                          {document.is_private ? (
                            <>
                              <Unlock className="mr-2 h-4 w-4" />
                              Make Public
                            </>
                          ) : (
                            <>
                              <Lock className="mr-2 h-4 w-4" />
                              Make Private
                            </>
                          )}
                        </DropdownMenuItem>
                      </>
                    )}
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onDelete} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Metadata */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {showCustomer && document.customer && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span className="truncate max-w-[100px] sm:max-w-none">
                    {document.customer.account_number}
                  </span>
                </span>
              )}
              {document.uploader_name && (
                <span className="flex items-center gap-1">
                  <Upload className="h-3 w-3" />
                  <span className="truncate max-w-[120px] sm:max-w-none">
                    {document.uploader_name}
                  </span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span className="hidden sm:inline">
                  {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
                </span>
                <span className="sm:hidden">
                  {formatDistanceToNow(new Date(document.created_at), { addSuffix: true }).replace(' ago', '')}
                </span>
              </span>
              <span>{formatFileSize(document.file_size)}</span>
            </div>

            {/* Tags */}
            <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
              {document.is_private && (
                <Badge 
                  variant="secondary" 
                  className="text-xs px-1.5 sm:px-2 gap-1"
                >
                  <Lock className="h-3 w-3" />
                  Private
                </Badge>
              )}
              {document.category && (
                <Badge 
                  variant="outline" 
                  className="text-xs px-1.5 sm:px-2"
                  style={{ 
                    backgroundColor: document.category.color ? `${document.category.color}20` : undefined,
                    borderColor: document.category.color || undefined,
                    color: document.category.color || undefined,
                  }}
                >
                  {document.category.name}
                </Badge>
              )}
              <Badge 
                variant="outline" 
                className={`text-xs capitalize px-1.5 sm:px-2 ${getStatusColor(document.status)}`}
              >
                {document.status}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>

      <DocumentVersionsCommentsDialog
        open={versionsOpen}
        onOpenChange={setVersionsOpen}
        documentId={document.id}
        documentTitle={document.title}
      />
    </Card>
  );
}
