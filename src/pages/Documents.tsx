import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/EmptyState';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';
import { EditDocumentDialog } from '@/components/documents/EditDocumentDialog';
import { useDocuments, useCategories, Document } from '@/hooks/useDocuments';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/useRBAC';
import { addRecent } from '@/hooks/useRecentActivity';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { exportToCSV, exportToPDF, documentExportColumns } from '@/lib/export-utils';
import {
  Search,
  FileText,
  X,
  Download,
  CheckCircle2,
  Archive,
  Trash2,
  ArrowUpDown,
  LayoutGrid,
  LayoutList,
  FolderOpen,
  Tag,
  ScanText,
  Filter,
  ClipboardCheck,
  ExternalLink,
} from 'lucide-react';
import { downloadWithWatermark } from '@/lib/watermark-utils';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type DocumentStatus = Database['public']['Enums']['document_status'];
type SortKey = 'created_desc' | 'created_asc' | 'title_asc' | 'title_desc' | 'size_desc' | 'size_asc';

export default function Documents() {
  const navigate = useNavigate();

  // ── view mode (persistent) ──────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      return (localStorage.getItem('umshub_docs_view_mode') as 'grid' | 'list') || 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    try { localStorage.setItem('umshub_docs_view_mode', mode); } catch (_e) { /* storage unavailable */ }
  };

  // ── filters / sort ──────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm, 250);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('created_desc');

  // ── bulk selection ──────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<null | 'approve' | 'archive' | 'delete' | 'category'>(null);
  const [bulkReason, setBulkReason] = useState('');
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState('');

  // ── single-document delete confirmation ──────────────────────────────────
  const [deleteTargetDoc, setDeleteTargetDoc] = useState<Document | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  // ── preview / edit ──────────────────────────────────────────────────────────
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewFileType, setPreviewFileType] = useState('');
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);

  // ── inline list-row preview (Feature 10) ────────────────────────────────────
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  // ── review / approval (Feature 3) ───────────────────────────────────────────
  const [reviewDoc, setReviewDoc] = useState<Document | null>(null);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // ── data ────────────────────────────────────────────────────────────────────
  const { categories } = useCategories();
  const { documents, loading, refetch } = useDocuments({
    searchTerm: debouncedSearch || undefined,
    categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });
  const { isAdmin, isStaff, user } = useAuth();
  const canUpload = usePermission('docs.documents.upload'); // Permission: docs.documents.upload — controlled via Role Manager
  const canDelete = usePermission('docs.documents.delete'); // Permission: docs.documents.delete — controlled via Role Manager
  const { toast } = useToast();

  // ── recently viewed ─────────────────────────────────────────────────────────
  const { recentIds, addRecentDoc } = useRecentlyViewed();

  // ── sorted list ─────────────────────────────────────────────────────────────
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

  // ── recently-viewed docs (ordered by recency) ────────────────────────────────
  const recentDocs = useMemo(
    () =>
      documents
        .filter(d => recentIds.includes(d.id))
        .sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id)),
    [documents, recentIds],
  );

  // ── selection helpers ────────────────────────────────────────────────────────
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

  // ── document actions ─────────────────────────────────────────────────────────
  const handleView = async (doc: Document) => {
    try {
      const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 3600);
      if (data?.signedUrl) {
        setPreviewUrl(data.signedUrl);
        setPreviewTitle(doc.title);
        setPreviewFileType(doc.file_type);
        setPreviewDoc(doc);
        addRecentDoc(doc.id);
        addRecent({ type: 'document', id: doc.id, label: doc.title, subLabel: doc.customer?.full_name ?? '', href: '/docs/documents', module: 'docs', timestamp: Date.now() });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to open document', variant: 'destructive' });
    }
  };

  // ── inline row expand (Feature 10) ──────────────────────────────────────────
  const handleRowExpand = async (doc: Document) => {
    if (expandedDocId === doc.id) {
      setExpandedDocId(null);
      return;
    }
    setExpandedDocId(doc.id);
    if (!previewUrls[doc.id]) {
      try {
        const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 3600);
        if (data?.signedUrl) {
          setPreviewUrls(prev => ({ ...prev, [doc.id]: data.signedUrl }));
        }
      } catch {
        // preview URL is best-effort
      }
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const profile = user
        ? await supabase.from('profiles').select('full_name, email').eq('user_id', user.id).single()
        : null;
      await downloadWithWatermark(
        doc.file_path,
        doc.file_name,
        doc.file_type,
        profile?.data?.full_name || '',
        profile?.data?.email || user?.email || '',
      );
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

  const handleDelete = (doc: Document) => {
    setDeleteTargetDoc(doc);
    setDeleteReason('');
  };

  const confirmDelete = async () => {
    const doc = deleteTargetDoc;
    if (!doc) return;
    setDeleteTargetDoc(null);
    if (isAdmin) {
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
      const reason = deleteReason.trim() || 'Deletion request';
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
      toast({
        title: 'Success',
        description: `Document is now ${!doc.is_private ? 'private (admin-only)' : 'visible to customer'}`,
      });
      refetch();
    } catch {
      toast({ title: 'Error', description: 'Failed to update document privacy', variant: 'destructive' });
    }
  };

  const handleExtractText = async (doc: Document) => {
    try {
      await supabase.functions.invoke('ocr-extract', { body: { document_id: doc.id } });
      toast({ title: 'Text extraction started', description: 'OCR is processing this document.' });
      refetch();
    } catch {
      toast({ title: 'Error', description: 'Failed to start text extraction', variant: 'destructive' });
    }
  };

  const canExtractText = (doc: Document) => {
    const ft = (doc.file_type || '').toLowerCase();
    return ft.includes('image') || ft.includes('pdf');
  };

  // ── review / approval handlers (Feature 3) ──────────────────────────────────
  const handleOpenReview = async (doc: Document) => {
    setReviewDoc(doc);
    setReviewComment('');
    setRejectReason('');
    setReviewUrl(null);
    setReviewLoading(true);
    try {
      const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 3600);
      if (data?.signedUrl) setReviewUrl(data.signedUrl);
    } catch {
      /* signed URL is best-effort; review can still proceed */
    } finally {
      setReviewLoading(false);
    }
  };

  const closeReview = () => {
    setReviewDoc(null);
    setReviewUrl(null);
    setReviewComment('');
    setRejectReason('');
  };

  const handleApproveReview = async () => {
    const doc = reviewDoc;
    if (!doc || !user) return;
    setReviewSubmitting(true);
    try {
      const { error } = await supabase.from('documents').update({ status: 'approved' }).eq('id', doc.id);
      if (error) throw error;
      await supabase.from('document_review_comments').insert({
        document_id: doc.id,
        reviewer_id: user.id,
        action: 'approved',
        comment: reviewComment.trim(),
      });
      if (doc.uploaded_by) {
        await supabase.from('in_app_notifications').insert({
          user_id: doc.uploaded_by,
          title: 'Document approved',
          message: `Your document '${doc.title}' was approved`,
          link: '/docs/documents',
        });
      }
      toast({ title: 'Document approved', description: `'${doc.title}' is now approved.` });
      closeReview();
      refetch();
    } catch (e: unknown) {
      toast({
        title: 'Failed to approve document',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleRejectReview = async () => {
    const doc = reviewDoc;
    if (!doc || !user || !rejectReason.trim()) return;
    setReviewSubmitting(true);
    try {
      const reason = rejectReason.trim();
      const { error } = await supabase.from('documents').update({ status: 'rejected' }).eq('id', doc.id);
      if (error) throw error;
      await supabase.from('document_review_comments').insert({
        document_id: doc.id,
        reviewer_id: user.id,
        action: 'rejected',
        comment: reason,
      });
      if (doc.uploaded_by) {
        await supabase.from('in_app_notifications').insert({
          user_id: doc.uploaded_by,
          title: 'Document returned',
          message: `Your document '${doc.title}' was returned: ${reason}`,
          link: '/docs/documents',
        });
      }
      toast({ title: 'Document returned', description: `'${doc.title}' has been returned for revision.` });
      closeReview();
      refetch();
    } catch (e: unknown) {
      toast({
        title: 'Failed to return document',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ── bulk actions ─────────────────────────────────────────────────────────────
  const handleBulkCategoryAssign = async (categoryId: string) => {
    setBulkRunning(true);
    try {
      const { error } = await supabase
        .from('documents')
        .update({ category_id: categoryId })
        .in('id', Array.from(selectedIds));
      if (error) throw error;
      toast({ title: `Category assigned to ${selectedIds.size} document(s)` });
      setSelectedIds(new Set());
      refetch();
    } catch (e: unknown) {
      toast({
        title: 'Failed to assign category',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBulkRunning(false);
      setBulkAction(null);
      setBulkCategoryId('');
    }
  };

  const runBulk = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    if (bulkAction === 'category') {
      if (bulkCategoryId) await handleBulkCategoryAssign(bulkCategoryId);
      return;
    }
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
      toast({
        title: 'Bulk action failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBulkRunning(false);
      setBulkAction(null);
      setBulkReason('');
    }
  };

  // ── filter helpers ───────────────────────────────────────────────────────────
  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setStatusFilter('all');
  };

  const hasFilters = searchTerm || categoryFilter !== 'all' || statusFilter !== 'all';

  // ── export ───────────────────────────────────────────────────────────────────
  const prepareExportData = () =>
    sortedDocuments.map(doc => ({
      title: doc.title,
      customer_name: doc.customer?.full_name || '-',
      category_name: doc.category?.name || '-',
      status: doc.status,
      file_type: doc.file_type,
      uploaded_by: doc.uploader_name || '-',
      created_at: format(new Date(doc.created_at), 'MMM d, yyyy HH:mm'),
    }));

  const handleExportCSV = () =>
    exportToCSV(prepareExportData(), `documents-${format(new Date(), 'yyyy-MM-dd')}`, documentExportColumns);
  const handleExportPDF = () =>
    exportToPDF(prepareExportData(), `documents-${format(new Date(), 'yyyy-MM-dd')}`, documentExportColumns, 'Documents Report');

  const canBulkManage = isAdmin || isStaff;

  return (
    <AppLayout title="All Documents" description="Browse and manage all uploaded documents">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">All Documents</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Browse and manage all uploaded documents
              {!loading && (
                <span className="ml-2">
                  <Badge variant="secondary" className="text-xs">{sortedDocuments.length} document{sortedDocuments.length !== 1 ? 's' : ''}</Badge>
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            {canUpload && (
              <Button size="sm" onClick={() => navigate('/docs/upload')}>
                <FileText className="h-4 w-4 mr-1" />Upload
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Recently Viewed ─────────────────────────────────────────────────── */}
      {recentDocs.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Recently Viewed</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentDocs.map(doc => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-shrink-0 w-40 rounded-lg border bg-card p-2 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleView(doc)}
              >
                <FileText className="h-5 w-5 text-muted-foreground mb-1" />
                <p className="text-xs font-medium truncate">{doc.title}</p>
                <p className="text-xs text-muted-foreground truncate">{doc.customer?.full_name || '—'}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filters card ────────────────────────────────────────────────────── */}
      <Card className="mb-4 sm:mb-6">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
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

              <div className="flex gap-2 sm:ml-auto items-center">
                {/* View mode toggle */}
                <div className="flex items-center border rounded-md overflow-hidden">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none h-8 px-2"
                    onClick={() => handleViewModeChange('grid')}
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none h-8 px-2"
                    onClick={() => handleViewModeChange('list')}
                    aria-label="List view"
                  >
                    <LayoutList className="h-4 w-4" />
                  </Button>
                </div>

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

      {/* ── Active filter chips + results count ─────────────────────────── */}
      {(hasFilters || !loading) && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs text-muted-foreground">
            Showing <strong>{sortedDocuments.length}</strong> result{sortedDocuments.length !== 1 ? 's' : ''}
          </span>
          {searchTerm && (
            <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setSearchTerm('')}>
              Search: {searchTerm} <X className="h-3 w-3" />
            </Badge>
          )}
          {categoryFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setCategoryFilter('all')}>
              <Tag className="h-3 w-3" />
              {categories.find(c => c.id === categoryFilter)?.name ?? categoryFilter}
              <X className="h-3 w-3" />
            </Badge>
          )}
          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1 cursor-pointer capitalize" onClick={() => setStatusFilter('all')}>
              <Filter className="h-3 w-3" />
              {statusFilter}
              <X className="h-3 w-3" />
            </Badge>
          )}
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearFilters}>
              Clear all
            </Button>
          )}
        </div>
      )}

      {/* ── Selection / bulk-action strip ───────────────────────────────────── */}
      {canBulkManage && sortedDocuments.length > 0 && (
        <div className={cn(
          "flex flex-wrap items-center gap-2 mb-4 rounded-lg border px-3 py-2 transition-colors",
          someSelected ? "bg-primary/5 border-primary/30" : "bg-muted/30",
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
              {/* Assign Category */}
              {isAdmin && (
                <Button size="sm" variant="outline" onClick={() => { setBulkCategoryId(''); setBulkAction('category'); }}>
                  <Tag className="h-4 w-4 mr-1" />Assign Category
                </Button>
              )}
              {/* Move to Folder */}
              {isAdmin && (
                <Button size="sm" variant="outline" onClick={() => navigate('/docs/folders')}>
                  <FolderOpen className="h-4 w-4 mr-1" />Move to Folder
                </Button>
              )}
              {!allSelected && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setBulkAction('delete')}
                >
                  <Trash2 className="h-4 w-4 mr-1" />{isAdmin ? 'Delete' : 'Request delete'}
                </Button>
              )}
              {allSelected && (
                <span className="text-xs text-muted-foreground italic">
                  Archive and delete are disabled when everything is selected — deselect at least one to enable.
                </span>
              )}
              <Button size="sm" variant="ghost" onClick={clearSelection} className="ml-auto">
                <X className="h-4 w-4 mr-1" />Clear
              </Button>
            </>
          )}
        </div>
      )}

      {/* ── Document list ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (<Skeleton key={i} className="h-40" />))}
        </div>
      ) : sortedDocuments.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents found"
          description={hasFilters ? 'Try adjusting your filters.' : 'Upload your first document to get started.'}
          action={
            !hasFilters && canUpload ? (
              <Button size="sm" onClick={() => navigate('/docs/upload')}>Upload Document</Button>
            ) : undefined
          }
        />
      ) : viewMode === 'grid' ? (
        /* Grid view */
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {sortedDocuments.map((doc) => {
            const selected = selectedIds.has(doc.id);
            return (
              <div
                key={doc.id}
                className={cn(
                  "relative rounded-lg transition-all",
                  selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                )}
              >
                {canBulkManage && (
                  <div
                    className={cn(
                      "absolute top-2 left-2 z-10 rounded-md bg-background/90 backdrop-blur border p-1 shadow-sm transition-opacity",
                      selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 hover:opacity-100",
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
                  onDelete={(isAdmin || isStaff) && canDelete ? () => handleDelete(doc) : undefined}
                  onEdit={(isAdmin || isStaff) ? () => setEditingDoc(doc) : undefined}
                  onPrivacyToggle={isAdmin ? () => handlePrivacyToggle(doc) : undefined}
                  onExtractText={(isAdmin || isStaff) && canExtractText(doc) ? () => handleExtractText(doc) : undefined}
                  onStatusChange={refetch}
                />
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="flex flex-col divide-y rounded-md border">
          {sortedDocuments.map((doc) => {
            const selected = selectedIds.has(doc.id);
            const isExpanded = expandedDocId === doc.id;
            const pUrl = previewUrls[doc.id];
            return (
              <div key={doc.id}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors",
                    selected && "bg-primary/5",
                  )}
                >
                  {canBulkManage && (
                    <Checkbox
                      checked={selected}
                      onCheckedChange={(checked) => {
                        const next = new Set(selectedIds);
                        if (checked) next.add(doc.id); else next.delete(doc.id);
                        setSelectedIds(next);
                      }}
                    />
                  )}
                  <div
                    className="flex flex-1 items-center gap-3 cursor-pointer min-w-0"
                    onClick={() => handleRowExpand(doc)}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 text-sm font-medium truncate">{doc.title}</span>
                    {(isAdmin || isStaff) && (
                      <span className="text-xs text-muted-foreground hidden sm:block w-32 truncate">
                        {doc.customer?.full_name || '—'}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground hidden md:block w-28 truncate">
                      {doc.category?.name || '—'}
                    </span>
                    <span className="text-xs text-muted-foreground hidden lg:block w-24">
                      {doc.created_at ? format(new Date(doc.created_at), 'dd MMM yyyy') : '—'}
                    </span>
                    {(isAdmin || isStaff) && (
                      <span className="text-xs text-muted-foreground hidden xl:block w-28 truncate" title={doc.uploader_name || 'Unknown'}>
                        {doc.uploader_name || '—'}
                      </span>
                    )}
                    <span className="text-xs capitalize w-16 text-right">{doc.status}</span>
                  </div>
                  <div className="flex items-center gap-1 ml-1">
                    {(isAdmin || isStaff) && doc.status === 'pending' && (
                      <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => handleOpenReview(doc)} title="Review document">
                        <ClipboardCheck className="h-3.5 w-3.5 mr-1" />Review
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleView(doc)} aria-label="View">
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(doc)} aria-label="Download">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    {(isAdmin || isStaff) && canExtractText(doc) && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleExtractText(doc)} aria-label="Extract Text" title="Extract Text (OCR)">
                        <ScanText className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {(isAdmin || isStaff) && canDelete && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(doc)} aria-label="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Inline preview panel (Feature 10) */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key="inline-preview"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t bg-muted/30"
                    >
                      <div className="relative p-4">
                        <button
                          className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted text-muted-foreground"
                          onClick={() => setExpandedDocId(null)}
                          aria-label="Close preview"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        {doc.file_type?.startsWith('image/') ? (
                          <img src={pUrl} alt={doc.title} style={{ maxHeight: 200 }} className="object-contain mx-auto rounded" />
                        ) : doc.file_type === 'application/pdf' ? (
                          <iframe src={pUrl} style={{ width: '100%', height: 300 }} title={doc.title} className="rounded border-0" />
                        ) : (
                          <div className="flex items-center gap-4">
                            <FileText className="h-10 w-10 text-muted-foreground/50 flex-shrink-0" />
                            <div className="text-sm space-y-0.5">
                              <p className="font-medium">{doc.title}</p>
                              {doc.file_type && <p className="text-muted-foreground text-xs">Type: {doc.file_type}</p>}
                              {doc.file_size > 0 && <p className="text-muted-foreground text-xs">Size: {(doc.file_size / 1024).toFixed(1)} KB</p>}
                              {doc.uploader_name && <p className="text-muted-foreground text-xs">Uploaded by: {doc.uploader_name}</p>}
                              {doc.created_at && <p className="text-muted-foreground text-xs">Date: {format(new Date(doc.created_at), 'dd MMM yyyy')}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Preview dialog ───────────────────────────────────────────────────── */}
      <DocumentPreviewDialog
        open={!!previewUrl}
        onOpenChange={(open) => { if (!open) { setPreviewUrl(null); setPreviewDoc(null); } }}
        url={previewUrl}
        title={previewTitle}
        fileType={previewFileType}
        documentId={previewDoc?.id}
        onDownload={previewDoc ? () => handleDownload(previewDoc) : undefined}
      />

      {/* ── Edit dialog ──────────────────────────────────────────────────────── */}
      {editingDoc && (
        <EditDocumentDialog
          open={!!editingDoc}
          onOpenChange={(open) => { if (!open) setEditingDoc(null); }}
          document={editingDoc}
          onSaved={refetch}
        />
      )}

      {/* ── Single-document delete confirmation ─────────────────────────────── */}
      <AlertDialog
        open={!!deleteTargetDoc}
        onOpenChange={(open) => {
          if (!open) { setDeleteTargetDoc(null); setDeleteReason(''); }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isAdmin ? 'Delete document?' : 'Request deletion?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isAdmin
                ? `"${deleteTargetDoc?.title}" will be permanently removed and cannot be recovered.`
                : 'An admin will review your deletion request before it is processed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!isAdmin && (
            <Input
              placeholder="Reason (optional)"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className={isAdmin ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {isAdmin ? 'Delete' : 'Submit Request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk action alert dialog ─────────────────────────────────────────── */}
      <AlertDialog
        open={!!bulkAction}
        onOpenChange={(open) => {
          if (!open) { setBulkAction(null); setBulkReason(''); setBulkCategoryId(''); }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === 'approve' && `Approve ${selectedIds.size} document(s)?`}
              {bulkAction === 'archive' && `Archive ${selectedIds.size} document(s)?`}
              {bulkAction === 'delete' && (isAdmin ? `Delete ${selectedIds.size} document(s)?` : `Request deletion of ${selectedIds.size} document(s)?`)}
              {bulkAction === 'category' && `Assign category to ${selectedIds.size} document(s)`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === 'delete' && isAdmin && 'This permanently removes the files and cannot be undone.'}
              {bulkAction === 'delete' && !isAdmin && 'An admin will review and approve each request.'}
              {bulkAction === 'approve' && 'Selected documents will be marked as approved.'}
              {bulkAction === 'archive' && 'Selected documents will be moved to archived status.'}
              {bulkAction === 'category' && 'Choose a category to assign to the selected documents.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {bulkAction === 'delete' && !isAdmin && (
            <Input
              placeholder="Reason (optional)"
              value={bulkReason}
              onChange={(e) => setBulkReason(e.target.value)}
            />
          )}

          {bulkAction === 'category' && (
            <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
              <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkRunning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkRunning || (bulkAction === 'category' && !bulkCategoryId)}
              onClick={runBulk}
              className={bulkAction === 'delete' && isAdmin ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {bulkRunning ? 'Working…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Document review / approval dialog (Feature 3) ─────────────────────── */}
      <Dialog open={!!reviewDoc} onOpenChange={(open) => { if (!open) closeReview(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" /> Review Document
            </DialogTitle>
            <DialogDescription>
              {reviewDoc?.title} — currently <span className="capitalize font-medium text-foreground">{reviewDoc?.status}</span>
            </DialogDescription>
          </DialogHeader>

          {/* Inline preview — mirrors DocumentPreviewDialog PreviewBody */}
          <div className="flex-1 overflow-auto min-h-[180px] max-h-[340px] rounded-lg border bg-muted/30 p-2">
            {reviewLoading ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Loading preview…</div>
            ) : reviewUrl ? (
              reviewDoc?.file_type?.includes('image') ? (
                <img src={reviewUrl} alt={reviewDoc.title} className="max-w-full max-h-[320px] object-contain mx-auto" />
              ) : reviewDoc?.file_type?.includes('pdf') ? (
                <iframe src={`${reviewUrl}#toolbar=1&navpanes=0`} className="w-full h-[320px] rounded border-0" title={reviewDoc?.title} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <FileText className="h-10 w-10 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">This file type cannot be previewed inline.</p>
                  <Button variant="outline" size="sm" onClick={() => window.open(reviewUrl, '_blank')}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open in new tab
                  </Button>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No preview available.</div>
            )}
          </div>

          <div className="space-y-3 mt-2 flex-shrink-0">
            <div>
              <Label>Comment (optional)</Label>
              <Input
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Optional note for the uploader"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Reason for returning <span className="text-destructive">*</span></Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Required only if returning the document"
                className="mt-1"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={closeReview} disabled={reviewSubmitting}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleRejectReview}
              disabled={reviewSubmitting || !rejectReason.trim()}
            >
              {reviewSubmitting ? 'Working…' : 'Return (Reject)'}
            </Button>
            <Button onClick={handleApproveReview} disabled={reviewSubmitting}>
              {reviewSubmitting ? 'Working…' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
