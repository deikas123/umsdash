import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, UserPlus, Trash2, Search } from 'lucide-react';
import { useFolderShares, type FolderShare } from '@/hooks/useFolders';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
}

interface FolderShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderName: string;
}

export function FolderShareDialog({
  open,
  onOpenChange,
  folderId,
  folderName,
}: FolderShareDialogProps) {
  const { shares, loading, addShare, updateShare, removeShare } = useFolderShares(folderId);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingUser, setAddingUser] = useState<string | null>(null);
  const [includeSubfolders, setIncludeSubfolders] = useState(true);

  useEffect(() => {
    const searchUsers = async () => {
      if (searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, email')
          .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
          .limit(10);

        if (error) throw error;

        const sharedUserIds = shares.map((s) => s.shared_with_user_id);
        const filteredResults = (data || []).filter(
          (user) => !sharedUserIds.includes(user.user_id)
        );

        setSearchResults(filteredResults);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, shares]);

  const handleAddUser = async (userId: string) => {
    setAddingUser(userId);
    await addShare(userId, false, includeSubfolders);
    setAddingUser(null);
    setSearchTerm('');
    setSearchResults([]);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share "{folderName}"</DialogTitle>
          <DialogDescription>
            Share this folder with specific users and manage their permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search for users */}
          <div className="space-y-3">
            <Label>Add people</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-start justify-between gap-3 rounded-md border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="new-include-subfolders" className="text-sm">
                  Include sub-folders
                </Label>
                <p className="text-xs text-muted-foreground">
                  {includeSubfolders
                    ? 'Shares this folder and everything inside it.'
                    : 'Shares only this folder — sub-folders stay private.'}
                </p>
              </div>
              <Switch
                id="new-include-subfolders"
                checked={includeSubfolders}
                onCheckedChange={setIncludeSubfolders}
              />
            </div>
            {searching && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="border rounded-md divide-y">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 hover:bg-accent"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddUser(user.user_id)}
                      disabled={addingUser === user.user_id}
                    >
                      {addingUser === user.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-1" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current shares */}
          <div className="space-y-2">
            <Label>People with access</Label>
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : shares.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                This folder is not shared with anyone yet.
              </p>
            ) : (
              <ScrollArea className="h-[240px]">
                <div className="space-y-2">
                  {shares.map((share) => (
                    <ShareItem
                      key={share.id}
                      share={share}
                      onUpdatePermission={(canEdit) =>
                        updateShare(share.id, { can_edit: canEdit })
                      }
                      onUpdateIncludeSubfolders={(include) =>
                        updateShare(share.id, { include_subfolders: include })
                      }
                      onRemove={() => removeShare(share.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShareItem({
  share,
  onUpdatePermission,
  onUpdateIncludeSubfolders,
  onRemove,
}: {
  share: FolderShare;
  onUpdatePermission: (canEdit: boolean) => void;
  onUpdateIncludeSubfolders: (include: boolean) => void;
  onRemove: () => void;
}) {
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="p-3 border rounded-md space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {getInitials(share.user_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{share.user_name || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground truncate">{share.user_email}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onRemove}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-11">
        <div className="flex items-center gap-2">
          <Switch
            id={`edit-${share.id}`}
            checked={share.can_edit}
            onCheckedChange={onUpdatePermission}
          />
          <Label htmlFor={`edit-${share.id}`} className="text-xs">
            Can edit
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id={`sub-${share.id}`}
            checked={share.include_subfolders}
            onCheckedChange={onUpdateIncludeSubfolders}
          />
          <Label htmlFor={`sub-${share.id}`} className="text-xs">
            Include sub-folders
          </Label>
        </div>
      </div>
    </div>
  );
}
