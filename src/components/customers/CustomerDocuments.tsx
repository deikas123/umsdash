import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FileText, Lock, Unlock, Eye, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Document {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_path: string;
  status: string;
  is_private: boolean;
  created_at: string;
  category: {
    id: string;
    name: string;
    color: string | null;
  } | null;
}

interface CustomerDocumentsProps {
  customerId: string;
  customerName: string;
}

export function CustomerDocuments({ customerId, customerName }: CustomerDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();

  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('documents')
      .select(`
        id, title, file_name, file_type, file_path, status, is_private, created_at,
        category:document_categories(id, name, color)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDocuments(data as Document[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, [customerId]);

  const togglePrivate = async (docId: string, currentPrivate: boolean) => {
    const { error } = await supabase
      .from('documents')
      .update({ is_private: !currentPrivate })
      .eq('id', docId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update document privacy',
        variant: 'destructive',
      });
      return;
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      action: currentPrivate ? 'document_made_public' : 'document_made_private',
      entity_type: 'document',
      entity_id: docId,
      details: { is_private: !currentPrivate },
    });

    toast({
      title: 'Success',
      description: `Document is now ${!currentPrivate ? 'private (admin-only)' : 'visible to customer'}`,
    });

    fetchDocuments();
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download document',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No documents found for this customer</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {documents.map((doc) => (
        <div key={doc.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium truncate">{doc.title}</span>
              {doc.is_private && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Lock className="h-3 w-3" />
                  Private
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
              <span>{doc.file_name}</span>
              <span>•</span>
              <span>{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
              {doc.category && (
                <>
                  <span>•</span>
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{
                      backgroundColor: doc.category.color ? `${doc.category.color}20` : undefined,
                      borderColor: doc.category.color || undefined,
                      color: doc.category.color || undefined,
                    }}
                  >
                    {doc.category.name}
                  </Badge>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Switch
                  id={`private-${doc.id}`}
                  checked={doc.is_private}
                  onCheckedChange={() => togglePrivate(doc.id, doc.is_private)}
                />
                <Label htmlFor={`private-${doc.id}`} className="text-xs cursor-pointer">
                  {doc.is_private ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                </Label>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
