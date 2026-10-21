import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Folder, Loader2 } from 'lucide-react';
import { type Folder as FolderType } from '@/hooks/useFolders';

interface MoveDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: FolderType[];
  currentFolderId: string;
  documentName: string;
  onMove: (targetFolderId: string) => Promise<void>;
}

export function MoveDocumentDialog({
  open,
  onOpenChange,
  folders,
  currentFolderId,
  documentName,
  onMove,
}: MoveDocumentDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Only show folders the user can edit, excluding current folder
  const availableFolders = folders.filter(
    (f) => f.can_edit && f.id !== currentFolderId
  );

  const handleMove = async () => {
    if (!selectedFolderId) return;
    setLoading(true);
    try {
      await onMove(selectedFolderId);
      onOpenChange(false);
      setSelectedFolderId('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move Document</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Select a folder to move "<span className="font-medium">{documentName}</span>" to:
          </p>

          {availableFolders.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Folder className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No other folders available</p>
            </div>
          ) : (
            <RadioGroup
              value={selectedFolderId}
              onValueChange={setSelectedFolderId}
              className="space-y-2"
            >
              {availableFolders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer"
                  onClick={() => setSelectedFolderId(folder.id)}
                >
                  <RadioGroupItem value={folder.id} id={folder.id} />
                  <Label
                    htmlFor={folder.id}
                    className="flex-1 cursor-pointer flex items-center gap-2"
                  >
                    <Folder className="h-4 w-4 text-primary" />
                    <span>{folder.name}</span>
                    {!folder.is_owner && (
                      <span className="text-xs text-muted-foreground">(shared)</span>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={!selectedFolderId || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Moving...
              </>
            ) : (
              'Move'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
