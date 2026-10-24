import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Folder as FolderIcon, Loader2, ChevronRight, Home, FolderPlus, FolderOpen } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Private Folders</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Organize and manage your private document folders
                {!loading && folders.length > 0 && (
                  <span className="ml-2 text-xs">· {folders.filter(f => f.parent_id === null).length} folders</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
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
          </div>
        </div>

        {/* Breadcrumb */}
        {syncedPathStack.length > 0 && (
          <nav className="flex items-center gap-1 text-sm flex-wrap bg-muted/30 rounded-lg px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2"
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
                  className="h-7 px-2 font-medium"
                  onClick={() => goToLevel(i)}
                  disabled={i === syncedPathStack.length - 1}
                >
                  {folder.name}
                </Button>
              </div>
            ))}
          </nav>
        )}

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={currentFolder ? 'Search sub-folders...' : 'Search folders...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Sub-folders grid */}
            {currentFolder ? (
              <div className="space-y-4">
                <h2 className="text-base font-semibold text-muted-foreground">
                  Sub-folders {filteredFolders.length > 0 && `(${filteredFolders.length})`}
                </h2>
                {filteredFolders.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FolderIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="font-medium">No sub-folders yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {canCreateHere ? 'Create a sub-folder to organize documents here.' : 'No sub-folders in this folder.'}
                      </p>
                      {canCreateHere && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => setCreateDialogOpen(true)}
                        >
                          <FolderPlus className="h-4 w-4 mr-2" />
                          Create Sub-folder
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredFolders.map((folder, i) => (
                      <motion.div
                        key={folder.id}
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <FolderCard
                          folder={folder}
                          onClick={() => openFolder(folder)}
                          onEdit={() => setEditFolder(folder)}
                          onShare={() => setShareFolder(folder)}
                          onDelete={() => deleteFolder(folder.id)}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Current folder's documents */}
                <div className="pt-4 border-t">
                  <FolderContents folder={currentFolder} onBack={goBack} />
                </div>
              </div>
            ) : folders.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <FolderOpen className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">No folders yet</h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {canCreateFolder
                      ? 'Create your first private folder to organize documents.'
                      : 'No folders have been shared with you yet.'}
                  </p>
                  {canCreateFolder && (
                    <Button className="mt-5" onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Folder
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                {myFolders.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-base font-semibold">My Folders <span className="text-sm text-muted-foreground font-normal">({myFolders.length})</span></h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {myFolders.map((folder, i) => (
                        <motion.div
                          key={folder.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                        >
                          <FolderCard
                            folder={folder}
                            onClick={() => openFolder(folder)}
                            onEdit={() => setEditFolder(folder)}
                            onShare={() => setShareFolder(folder)}
                            onDelete={() => deleteFolder(folder.id)}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {sharedFolders.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-base font-semibold">Shared with Me <span className="text-sm text-muted-foreground font-normal">({sharedFolders.length})</span></h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {sharedFolders.map((folder, i) => (
                        <motion.div
                          key={folder.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                        >
                          <FolderCard
                            folder={folder}
                            onClick={() => openFolder(folder)}
                          />
                        </motion.div>
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
