import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFolders } from '@/hooks/useFolders';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface MoveDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName: string;
  currentFolderId?: string;
  onMoved?: () => void;
}

export function MoveDocumentDialog({
  open, onOpenChange, documentId, documentName, currentFolderId, onMoved,
}: MoveDocumentDialogProps) {
  const { folders } = useFolders();
  const [targetFolderId, setTargetFolderId] = useState('');
  const [moving, setMoving] = useState(false);
  const { toast } = useToast();

  const handleMove = async () => {
    if (!targetFolderId) return;
    setMoving(true);
    try {
      // Update folder_documents table
      const { error } = await supabase
        .from('folder_documents')
        .update({ folder_id: targetFolderId })
        .eq('id', documentId);

      if (error) throw error;

      toast({ title: 'Document moved', description: `${documentName} moved successfully.` });
      onMoved?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setMoving(false);
    }
  };

  const availableFolders = folders.filter(f => f.id !== currentFolderId && f.is_owner);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Move <strong>{documentName}</strong> to another folder.
          </p>
          <Select value={targetFolderId} onValueChange={setTargetFolderId}>
            <SelectTrigger>
              <SelectValue placeholder="Select destination folder" />
            </SelectTrigger>
            <SelectContent>
              {availableFolders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleMove} disabled={!targetFolderId || moving}>
            {moving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
