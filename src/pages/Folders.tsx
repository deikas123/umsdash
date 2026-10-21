import { useState } from 'react';
import { Plus, Folder as FolderIcon, Loader2, ChevronRight, Home, FolderPlus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useFolders, type Folder } from '@/hooks/useFolders';
import { FolderCard } from '@/components/folders/FolderCard';
import { CreateFolderDialog } from '@/components/folders/CreateFolderDialog';
import { EditFolderDialog } from '@/components/folders/EditFolderDialog';
import { FolderShareDialog } from '@/components/folders/FolderShareDialog';
import { FolderContents } from '@/components/folders/FolderContents';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function Folders() {
  const { folders, loading, createFolder, updateFolder, deleteFolder, canCreateFolder } = useFolders();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editFolder, setEditFolder] = useState<Folder | null>(null);
  const [shareFolder, setShareFolder] = useState<Folder | null>(null);
  const [pathStack, setPathStack] = useState<Folder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const currentFolder = pathStack[pathStack.length - 1] ?? null;
  const currentParentId = currentFolder?.id ?? null;

  // Keep pathStack in sync if the current folder's data changes (e.g. rename)
  const syncedPathStack = pathStack.map(
    (p) => folders.find((f) => f.id === p.id) ?? p
  );

  const filteredFolders = folders.filter((folder) => {
    if (folder.parent_id !== currentParentId) return false;
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      folder.name.toLowerCase().includes(q) ||
      folder.description?.toLowerCase().includes(q)
    );
  });

  const myFolders = filteredFolders.filter((f) => f.is_owner);
  const sharedFolders = filteredFolders.filter((f) => !f.is_owner);

  const openFolder = (folder: Folder) => {
    setPathStack((prev) => [...prev, folder]);
    setSearchTerm('');
  };

  const goToRoot = () => {
    setPathStack([]);
    setSearchTerm('');
  };

  const goToLevel = (index: number) => {
    setPathStack((prev) => prev.slice(0, index + 1));
    setSearchTerm('');
  };

  const goBack = () => {
    setPathStack((prev) => prev.slice(0, -1));
    setSearchTerm('');
  };

  const handleCreate = async (name: string, description?: string) => {
    return await createFolder(name, description, currentParentId);
  };

  const canCreateHere = currentFolder
    ? currentFolder.can_edit
    : canCreateFolder;

  const subFolderCount = (folderId: string) =>
    folders.filter((f) => f.parent_id === folderId).length;

  return (
    <AppLayout title="Private Folders" description="Manage your private document folders">
      <div className="space-y-6">
        {/* Breadcrumb */}
        {syncedPathStack.length > 0 && (
          <nav className="flex items-center gap-1 text-sm flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2"
              onClick={goToRoot}
            >
              <Home className="h-3.5 w-3.5" />
              Private Folders
            </Button>
            {syncedPathStack.map((folder, i) => (
              <div key={folder.id} className="flex items-center gap-1">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 font-medium"
                  onClick={() => goToLevel(i)}
                  disabled={i === syncedPathStack.length - 1}
                >
                  {folder.name}
                </Button>
              </div>
            ))}
          </nav>
        )}

        {/* Header / actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={currentFolder ? 'Search sub-folders...' : 'Search folders...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          {canCreateHere && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              {currentFolder ? (
                <>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Sub-folder
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  New Folder
                </>
              )}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Sub-folders grid */}
            {currentFolder ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">
                  Sub-folders {filteredFolders.length > 0 && (
                    <span className="text-sm text-muted-foreground font-normal">
                      ({filteredFolders.length})
                    </span>
                  )}
                </h2>
                {filteredFolders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg">
                    <FolderIcon className="h-10 w-10 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No sub-folders yet
                    </p>
                    {canCreateHere && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setCreateDialogOpen(true)}
                      >
                        Create a sub-folder
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredFolders.map((folder) => (
                      <FolderCard
                        key={folder.id}
                        folder={folder}
                        onClick={() => openFolder(folder)}
                        onEdit={() => setEditFolder(folder)}
                        onShare={() => setShareFolder(folder)}
                        onDelete={() => deleteFolder(folder.id)}
                      />
                    ))}
                  </div>
                )}

                {/* Current folder's documents */}
                <div className="pt-4 border-t">
                  <FolderContents folder={currentFolder} onBack={goBack} />
                </div>
              </div>
            ) : folders.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <FolderIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">No folders yet</h3>
                <p className="text-muted-foreground mt-1">
                  {canCreateFolder
                    ? 'Create your first private folder to organize documents.'
                    : 'No folders have been shared with you yet.'}
                </p>
                {canCreateFolder && (
                  <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Folder
                  </Button>
                )}
              </div>
            ) : (
              <>
                {myFolders.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold">My Folders</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {myFolders.map((folder) => (
                        <FolderCard
                          key={folder.id}
                          folder={folder}
                          onClick={() => openFolder(folder)}
                          onEdit={() => setEditFolder(folder)}
                          onShare={() => setShareFolder(folder)}
                          onDelete={() => deleteFolder(folder.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {sharedFolders.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Shared with Me</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {sharedFolders.map((folder) => (
                        <FolderCard
                          key={folder.id}
                          folder={folder}
                          onClick={() => openFolder(folder)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <CreateFolderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
      />

      <EditFolderDialog
        open={!!editFolder}
        onOpenChange={(open) => !open && setEditFolder(null)}
        folder={editFolder}
        onSubmit={updateFolder}
      />

      {shareFolder && (
        <FolderShareDialog
          open={!!shareFolder}
          onOpenChange={() => setShareFolder(null)}
          folderId={shareFolder.id}
          folderName={shareFolder.name}
        />
      )}
    </AppLayout>
  );
}
