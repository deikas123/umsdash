import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';
import { EditDocumentDialog } from '@/components/documents/EditDocumentDialog';
import { useDocuments, useCategories, Document } from '@/hooks/useDocuments';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { exportToCSV, exportToPDF, documentExportColumns } from '@/lib/export-utils';
import { Search, FileText, X, Download, CheckCircle2, Archive, Trash2, ArrowUpDown } from 'lucide-react';
import { downloadWithWatermark } from '@/lib/watermark-utils';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type DocumentStatus = Database['public']['Enums']['document_status'];
type SortKey = 'created_desc' | 'created_asc' | 'title_asc' | 'title_desc' | 'size_desc' | 'size_asc';

export default function Documents() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm, 250);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<null | 'approve' | 'archive' | 'delete'>(null);
  const [bulkReason, setBulkReason] = useState('');
  const [bulkRunning, setBulkRunning] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewFileType, setPreviewFileType] = useState('');
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);

  const { categories } = useCategories();
  const { documents, loading, refetch } = useDocuments({
    searchTerm: debouncedSearch || undefined,
    categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });
  const { isAdmin, isStaff, user } = useAuth();
  const { toast } = useToast();

  const sortedDocuments = useMemo(() => {
    const arr = [...documents];
    switch (sortKey) {
      case 'created_asc': arr.sort((a, b) => a.created_at.localeCompare(b.created_at)); break;
      case 'title_asc': arr.sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'title_desc': arr.sort((a, b) => b.title.localeCompare(a.title)); break;
      case 'size_desc': arr.sort((a, b) => b.file_size - a.file_size); break;
      case 'size_asc': arr.sort((a, b) => a.file_size - b.file_size); break;
      default: arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return arr;
  }, [documents, sortKey]);

  const allSelected = sortedDocuments.length > 0 && sortedDocuments.every(d => selectedIds.has(d.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedDocuments.map(d => d.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleView = async (doc: Document) => {
    try {
      const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 3600);
      if (data?.signedUrl) {
        setPreviewUrl(data.signedUrl);
        setPreviewTitle(doc.title);
        setPreviewFileType(doc.file_type);
        setPreviewDoc(doc);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to open document', variant: 'destructive' });
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const profile = user ? await supabase.from('profiles').select('full_name, email').eq('user_id', user.id).single() : null;
      await downloadWithWatermark(doc.file_path, doc.file_name, doc.file_type, profile?.data?.full_name || '', profile?.data?.email || user?.email || '');
      toast({ title: 'Download started', description: 'Document downloaded with watermark.' });
    } catch {
      try {
        const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 3600);
        if (data?.signedUrl) {
          const link = document.createElement('a');
          link.href = data.signedUrl;
          link.download = doc.file_name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to download document', variant: 'destructive' });
      }
    }
  };

  const handleDelete = async (doc: Document) => {
    if (isAdmin) {
      if (!confirm('Are you sure you want to delete this document?')) return;
      try {
        await supabase.storage.from('documents').remove([doc.file_path]);
        const { error } = await supabase.from('documents').delete().eq('id', doc.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Document deleted successfully' });
        refetch();
      } catch {
        toast({ title: 'Error', description: 'Failed to delete document', variant: 'destructive' });
      }
    } else {
      const reason = prompt('Please provide a reason for deleting this document:');
      if (!reason) return;
      try {
        const { error } = await supabase.from('deletion_requests').insert({
          document_id: doc.id, requested_by: user?.id || '', reason,
        });
        if (error) throw error;
        toast({ title: 'Request Submitted', description: 'Deletion request sent to admin for approval' });
      } catch {
        toast({ title: 'Error', description: 'Failed to submit deletion request', variant: 'destructive' });
      }
    }
  };

  const handlePrivacyToggle = async (doc: Document) => {
    try {
      const { error } = await supabase.from('documents').update({ is_private: !doc.is_private }).eq('id', doc.id);
      if (error) throw error;
      toast({ title: 'Success', description: `Document is now ${!doc.is_private ? 'private (admin-only)' : 'visible to customer'}` });
      refetch();
    } catch {
      toast({ title: 'Error', description: 'Failed to update document privacy', variant: 'destructive' });
    }
  };

  const runBulk = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    setBulkRunning(true);
    const ids = Array.from(selectedIds);
    try {
      if (bulkAction === 'approve' || bulkAction === 'archive') {
        const status: DocumentStatus = bulkAction === 'approve' ? 'approved' : 'archived';
        const { error } = await supabase.from('documents').update({ status }).in('id', ids);
        if (error) throw error;
        toast({ title: 'Updated', description: `${ids.length} document(s) ${status}.` });
      } else if (bulkAction === 'delete') {
        if (isAdmin) {
          const paths = sortedDocuments.filter(d => selectedIds.has(d.id)).map(d => d.file_path);
          if (paths.length) await supabase.storage.from('documents').remove(paths);
          const { error } = await supabase.from('documents').delete().in('id', ids);
          if (error) throw error;
          toast({ title: 'Deleted', description: `${ids.length} document(s) removed.` });
        } else {
          const reason = bulkReason.trim() || 'Bulk deletion request';
          const rows = ids.map(document_id => ({ document_id, requested_by: user?.id || '', reason }));
          const { error } = await supabase.from('deletion_requests').insert(rows);
          if (error) throw error;
          toast({ title: 'Requested', description: `${ids.length} deletion request(s) sent for approval.` });
        }
      }
      clearSelection();
      refetch();
    } catch (e) {
      toast({ title: 'Bulk action failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setBulkRunning(false);
      setBulkAction(null);
      setBulkReason('');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setStatusFilter('all');
  };

  const hasFilters = searchTerm || categoryFilter !== 'all' || statusFilter !== 'all';

  const prepareExportData = () => sortedDocuments.map(doc => ({
    title: doc.title,
    customer_name: doc.customer?.full_name || '-',
    category_name: doc.category?.name || '-',
    status: doc.status,
    file_type: doc.file_type,
    created_at: format(new Date(doc.created_at), 'MMM d, yyyy HH:mm'),
  }));

  const handleExportCSV = () => exportToCSV(prepareExportData(), `documents-${format(new Date(), 'yyyy-MM-dd')}`, documentExportColumns);
  const handleExportPDF = () => exportToPDF(prepareExportData(), `documents-${format(new Date(), 'yyyy-MM-dd')}`, documentExportColumns, 'Documents Report');

  const canBulkManage = isAdmin || isStaff;

  return (
    <AppLayout title="All Documents" description="Browse and manage all uploaded documents">
      <Card className="mb-4 sm:mb-6">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search documents..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as DocumentStatus | 'all')}>
                <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                <SelectTrigger className="w-full sm:w-44">
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_desc">Newest first</SelectItem>
                  <SelectItem value="created_asc">Oldest first</SelectItem>
                  <SelectItem value="title_asc">Title A–Z</SelectItem>
                  <SelectItem value="title_desc">Title Z–A</SelectItem>
                  <SelectItem value="size_desc">Largest first</SelectItem>
                  <SelectItem value="size_asc">Smallest first</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2 sm:ml-auto">
                {hasFilters && (
                  <Button variant="ghost" onClick={clearFilters} size="sm">
                    <X className="h-4 w-4 mr-1" />Clear
                  </Button>
                )}
                {sortedDocuments.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={handleExportCSV}>Export as CSV</DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportPDF}>Export as PDF</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selection strip */}
      {canBulkManage && sortedDocuments.length > 0 && (
        <div className={cn(
          "flex flex-wrap items-center gap-2 mb-4 rounded-lg border px-3 py-2 transition-colors",
          someSelected ? "bg-primary/5 border-primary/30" : "bg-muted/30"
        )}>
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
            {someSelected ? `${selectedIds.size} selected` : 'Select all'}
          </label>
          {someSelected && (
            <>
              <div className="h-4 w-px bg-border mx-1" />
              {isAdmin && (
                <Button size="sm" variant="outline" onClick={() => setBulkAction('approve')}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />Approve
                </Button>
              )}
              {isAdmin && !allSelected && (
                <Button size="sm" variant="outline" onClick={() => setBulkAction('archive')}>
                  <Archive className="h-4 w-4 mr-1" />Archive
                </Button>
              )}
              {!allSelected && (
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setBulkAction('delete')}>
                  <Trash2 className="h-4 w-4 mr-1" />{isAdmin ? 'Delete' : 'Request delete'}
                </Button>
              )}
              {allSelected && (
                <span className="text-xs text-muted-foreground italic">Archive and delete are disabled when everything is selected — deselect at least one to enable.</span>
              )}
              <Button size="sm" variant="ghost" onClick={clearSelection} className="ml-auto">
                <X className="h-4 w-4 mr-1" />Clear
              </Button>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (<Skeleton key={i} className="h-40" />))}
        </div>
      ) : sortedDocuments.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No documents found</h3>
          <p className="text-muted-foreground">{hasFilters ? 'Try adjusting your filters' : 'Upload your first document to get started'}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {sortedDocuments.map((doc) => {
            const selected = selectedIds.has(doc.id);
            return (
              <div key={doc.id} className={cn("relative rounded-lg transition-all", selected && "ring-2 ring-primary ring-offset-2 ring-offset-background")}>
                {canBulkManage && (
                  <div
                    className={cn(
                      "absolute top-2 left-2 z-10 rounded-md bg-background/90 backdrop-blur border p-1 shadow-sm transition-opacity",
                      selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 hover:opacity-100"
                    )}
                    style={{ opacity: selected ? 1 : undefined }}
                  >
                    <Checkbox checked={selected} onCheckedChange={() => toggleSelect(doc.id)} />
                  </div>
                )}
                <DocumentCard
                  document={doc}
                  showCustomer={isAdmin || isStaff}
                  onView={() => handleView(doc)}
                  onDownload={() => handleDownload(doc)}
                  onDelete={(isAdmin || isStaff) ? () => handleDelete(doc) : undefined}
                  onEdit={(isAdmin || isStaff) ? () => setEditingDoc(doc) : undefined}
                  onPrivacyToggle={isAdmin ? () => handlePrivacyToggle(doc) : undefined}
                  onStatusChange={refetch}
                />
              </div>
            );
          })}
        </div>
      )}

      <DocumentPreviewDialog
        open={!!previewUrl}
        onOpenChange={(open) => { if (!open) { setPreviewUrl(null); setPreviewDoc(null); } }}
        url={previewUrl}
        title={previewTitle}
        fileType={previewFileType}
        onDownload={previewDoc ? () => handleDownload(previewDoc) : undefined}
      />

      {editingDoc && (
        <EditDocumentDialog
          open={!!editingDoc}
          onOpenChange={(open) => { if (!open) setEditingDoc(null); }}
          document={editingDoc}
          onSaved={refetch}
        />
      )}

      <AlertDialog open={!!bulkAction} onOpenChange={(open) => { if (!open) { setBulkAction(null); setBulkReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === 'approve' && `Approve ${selectedIds.size} document(s)?`}
              {bulkAction === 'archive' && `Archive ${selectedIds.size} document(s)?`}
              {bulkAction === 'delete' && (isAdmin ? `Delete ${selectedIds.size} document(s)?` : `Request deletion of ${selectedIds.size} document(s)?`)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === 'delete' && isAdmin && 'This permanently removes the files and cannot be undone.'}
              {bulkAction === 'delete' && !isAdmin && 'An admin will review and approve each request.'}
              {bulkAction === 'approve' && 'Selected documents will be marked as approved.'}
              {bulkAction === 'archive' && 'Selected documents will be moved to archived status.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {bulkAction === 'delete' && !isAdmin && (
            <Input placeholder="Reason (optional)" value={bulkReason} onChange={(e) => setBulkReason(e.target.value)} />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkRunning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkRunning}
              onClick={runBulk}
              className={bulkAction === 'delete' && isAdmin ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {bulkRunning ? 'Working…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
