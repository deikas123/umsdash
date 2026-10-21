import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { CheckCircle, XCircle, Archive, MoreHorizontal, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type DocumentStatus = Database['public']['Enums']['document_status'];

interface DocumentStatusActionsProps {
  documentId: string;
  documentTitle: string;
  currentStatus: DocumentStatus;
  onStatusChange?: () => void;
}

export function DocumentStatusActions({
  documentId,
  documentTitle,
  currentStatus,
  onStatusChange,
}: DocumentStatusActionsProps) {
  const [updating, setUpdating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    status: DocumentStatus;
    title: string;
    description: string;
  }>({
    open: false,
    status: 'pending',
    title: '',
    description: '',
  });
  const { toast } = useToast();
  const { user, isAdmin, isStaff } = useAuth();

  if (!isAdmin && !isStaff) return null;

  const updateStatus = async (newStatus: DocumentStatus) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('documents')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', documentId);

      if (error) throw error;

      // Log the status change
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        action: `document_${newStatus}`,
        entity_type: 'document',
        entity_id: documentId,
        details: {
          document_title: documentTitle,
          previous_status: currentStatus,
          new_status: newStatus,
        },
      });

      toast({
        title: 'Status Updated',
        description: `Document has been ${newStatus === 'approved' ? 'approved' : newStatus === 'archived' ? 'archived' : 'set to pending'}`,
      });

      onStatusChange?.();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update document status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };

  const handleApprove = () => {
    setConfirmDialog({
      open: true,
      status: 'approved',
      title: 'Approve Document',
      description: `Are you sure you want to approve "${documentTitle}"? This will mark the document as verified.`,
    });
  };

  const handleReject = () => {
    setConfirmDialog({
      open: true,
      status: 'pending',
      title: 'Reject Document',
      description: `Are you sure you want to reject "${documentTitle}"? This will set the document status back to pending.`,
    });
  };

  const handleArchive = () => {
    setConfirmDialog({
      open: true,
      status: 'archived',
      title: 'Archive Document',
      description: `Are you sure you want to archive "${documentTitle}"? Archived documents are moved to the archives section.`,
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={updating}>
            {updating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <MoreHorizontal className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Status</span>
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {currentStatus !== 'approved' && (
            <DropdownMenuItem onClick={handleApprove} className="text-green-600">
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </DropdownMenuItem>
          )}
          {currentStatus === 'approved' && (
            <DropdownMenuItem onClick={handleReject} className="text-orange-600">
              <XCircle className="h-4 w-4 mr-2" />
              Reject (Pending)
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {currentStatus !== 'archived' && (
            <DropdownMenuItem onClick={handleArchive} className="text-muted-foreground">
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
          )}
          {currentStatus === 'archived' && (
            <DropdownMenuItem onClick={() => updateStatus('pending')} className="text-blue-600">
              <XCircle className="h-4 w-4 mr-2" />
              Restore to Pending
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => updateStatus(confirmDialog.status)}
              disabled={updating}
            >
              {updating ? 'Updating...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
