import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';
import { useDocuments, useCategories } from '@/hooks/useDocuments';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FolderOpen } from 'lucide-react';

export default function MyDocuments() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewFileType, setPreviewFileType] = useState('');
  const [previewDoc, setPreviewDoc] = useState<typeof documents[0] | null>(null);

  const { categories, loading: categoriesLoading } = useCategories();
  const { documents, loading: docsLoading } = useDocuments({
    categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
  });
  const { toast } = useToast();

  const handleView = async (doc: typeof documents[0]) => {
    try {
      const { data } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_path, 3600);

      if (data?.signedUrl) {
        setPreviewUrl(data.signedUrl);
        setPreviewTitle(doc.title);
        setPreviewFileType(doc.file_type);
        setPreviewDoc(doc);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to open document',
        variant: 'destructive',
      });
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
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download document',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout title="My Documents" description="View and download your documents">
      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all">All</TabsTrigger>
          {!categoriesLoading &&
            categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id} className="text-sm">
                {cat.name}
              </TabsTrigger>
            ))}
        </TabsList>
      </Tabs>

      {/* Documents Grid */}
      {docsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No documents yet</h3>
          <p className="text-muted-foreground">
            Your documents will appear here once they are uploaded by staff.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              showCustomer={false}
              onView={() => handleView(doc)}
              onDownload={() => handleDownload(doc)}
            />
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <DocumentPreviewDialog
        open={!!previewUrl}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewUrl(null);
            setPreviewDoc(null);
          }
        }}
        url={previewUrl}
        title={previewTitle}
        fileType={previewFileType}
        onDownload={previewDoc ? () => handleDownload(previewDoc) : undefined}
      />
    </AppLayout>
  );
}
