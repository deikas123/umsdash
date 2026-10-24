import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { useDocuments, useCategories, useCustomers, Document } from '@/hooks/useDocuments';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search as SearchIcon, FileText, X, Check, ChevronsUpDown, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import type { Database } from '@/integrations/supabase/types';

type DocumentStatus = Database['public']['Enums']['document_status'];

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [customerFilter, setCustomerFilter] = useState('');
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  // OCR full-text search state
  const [ocrResults, setOcrResults] = useState<Document[]>([]);
  const [ocrLoading, setOcrLoading] = useState(false);

  const { categories } = useCategories();
  const { customers } = useCustomers(customerSearch);
  const selectedCustomer = customers.find((c) => c.id === customerFilter);

  const { documents, loading } = useDocuments({
    searchTerm: searchTerm || undefined,
    categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    customerId: customerFilter || undefined,
  });

  const { isAdmin, isStaff } = useAuth();
  const { toast } = useToast();

  const handleView = async (doc: typeof documents[0]) => {
    try {
      const { data } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_path, 3600);

      if (data?.signedUrl) {
        if (doc.file_type.includes('pdf') || doc.file_type.includes('image')) {
          setPreviewUrl(data.signedUrl);
          setPreviewTitle(doc.title);
        } else {
          window.open(data.signedUrl, '_blank');
        }
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to open document', variant: 'destructive' });
    }
  };

  const handleDownload = async (doc: typeof documents[0]) => {
    try {
      const { data } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_path, 3600);

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
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setCustomerFilter('');
    setCustomerSearch('');
    setOcrResults([]);
  };

  // Run OCR full-text search whenever searchTerm changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setOcrResults([]);
      return;
    }
    let cancelled = false;
    setOcrLoading(true);
    (async () => {
      try {
        const { data: textRows, error: textErr } = await supabase
          .from('document_text_content')
          .select('document_id, extracted_text')
          .ilike('extracted_text', `%${searchTerm}%`);

        if (textErr || !textRows || textRows.length === 0) {
          if (!cancelled) setOcrResults([]);
          return;
        }

        const docIds = [...new Set(textRows.map((r) => r.document_id))];

        const { data: docs, error: docsErr } = await supabase
          .from('documents')
          .select('*, category:categories(id, name), customer:profiles(id, full_name, account_number)')
          .in('id', docIds);

        if (!cancelled) {
          setOcrResults(docsErr ? [] : (docs ?? []) as unknown as Document[]);
        }
      } catch {
        if (!cancelled) setOcrResults([]);
      } finally {
        if (!cancelled) setOcrLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [searchTerm]);

  const hasFilters = searchTerm || categoryFilter !== 'all' || statusFilter !== 'all' || customerFilter;

  // Build active filter chips
  const activeChips: { label: string; onRemove: () => void }[] = [];
  if (searchTerm) activeChips.push({ label: `"${searchTerm}"`, onRemove: () => setSearchTerm('') });
  if (categoryFilter !== 'all') {
    const cat = categories.find(c => c.id === categoryFilter);
    activeChips.push({ label: cat?.name || categoryFilter, onRemove: () => setCategoryFilter('all') });
  }
  if (statusFilter !== 'all') activeChips.push({ label: statusFilter, onRemove: () => setStatusFilter('all') });
  if (customerFilter && selectedCustomer) activeChips.push({ label: selectedCustomer.account_number, onRemove: () => setCustomerFilter('') });

  return (
    <AppLayout title="Search Documents" description="Find documents by account number, name, or category">
      {/* Page header */}
      <div className="flex flex-col gap-1 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Search Documents</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Find documents by title, content, customer, or category</p>
          </div>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
                <X className="h-3.5 w-3.5" />Clear all
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Prominent search bar */}
      <div className="relative mb-4">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search by title, filename, or document content…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-11 pr-4 h-12 text-base rounded-xl border-2 focus-visible:border-primary"
          autoFocus
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-full"
            onClick={() => setSearchTerm('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0 hidden sm:block" />

            {/* Customer filter */}
            {(isAdmin || isStaff) && (
              <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full sm:w-52 justify-between h-9 text-sm">
                    {selectedCustomer ? selectedCustomer.account_number : 'All customers'}
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search customers…" value={customerSearch} onValueChange={setCustomerSearch} />
                    <CommandList>
                      <CommandEmpty>No customers found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="" onSelect={() => { setCustomerFilter(''); setCustomerOpen(false); }}>
                          <Check className={cn('mr-2 h-4 w-4', !customerFilter ? 'opacity-100' : 'opacity-0')} />
                          All customers
                        </CommandItem>
                        {customers.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={`${c.account_number} ${c.full_name}`}
                            onSelect={() => { setCustomerFilter(c.id); setCustomerOpen(false); }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', customerFilter === c.id ? 'opacity-100' : 'opacity-0')} />
                            {c.account_number} – {c.full_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}

            {/* Category filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-44 h-9 text-sm">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as DocumentStatus | 'all')}>
              <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <div className="sm:ml-auto flex items-center gap-2">
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                  Clear filters
                </Button>
              )}
              <Badge variant="secondary" className="text-xs whitespace-nowrap">
                {loading ? 'Searching…' : `${documents.length} result${documents.length !== 1 ? 's' : ''}`}
              </Badge>
            </div>
          </div>

          {/* Active filter chips */}
          {activeChips.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-2 pt-2 border-t">
              {activeChips.map((chip, i) => (
                <Badge key={i} variant="outline" className="text-xs gap-1 pr-1 cursor-pointer hover:bg-destructive/10 hover:border-destructive/30">
                  {chip.label}
                  <button onClick={chip.onRemove} className="ml-0.5 rounded-full hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results tabs */}
      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="documents">
            Documents {!loading && <Badge variant="secondary" className="ml-1.5 text-xs">{documents.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="ocr">
            Full Text (OCR) {!ocrLoading && searchTerm && <Badge variant="secondary" className="ml-1.5 text-xs">{ocrResults.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Documents tab */}
        <TabsContent value="documents">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-40" />)}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">No documents found</h3>
              <p className="text-muted-foreground text-sm">
                {hasFilters ? 'Try adjusting your filters or search term.' : 'Upload documents to start searching.'}
              </p>
              {hasFilters && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />Clear filters
                </Button>
              )}
            </div>
          ) : (
            <motion.div
              layout
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  showCustomer={isAdmin || isStaff}
                  onView={() => handleView(doc)}
                  onDownload={() => handleDownload(doc)}
                />
              ))}
            </motion.div>
          )}
        </TabsContent>

        {/* Full Text (OCR) tab */}
        <TabsContent value="ocr">
          {!searchTerm.trim() ? (
            <div className="text-center py-16">
              <SearchIcon className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">Enter a search term above</h3>
              <p className="text-muted-foreground text-sm">Type a word or phrase to search extracted document text</p>
            </div>
          ) : ocrLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
            </div>
          ) : ocrResults.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">No OCR results</h3>
              <p className="text-muted-foreground text-sm">No documents contain "{searchTerm}" in their extracted content</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Found <strong>{ocrResults.length}</strong> document{ocrResults.length !== 1 ? 's' : ''} containing "{searchTerm}"
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {ocrResults.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    showCustomer={isAdmin || isStaff}
                    onView={() => handleView(doc)}
                    onDownload={() => handleDownload(doc)}
                  />
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {previewUrl && (
              <iframe
                src={previewUrl}
                className="w-full h-full rounded-lg"
                title="Document Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
