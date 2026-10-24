import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Download, GitCompare, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  documentId: string;
}

interface Version {
  id: string;
  version_number: number;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  notes: string | null;
  created_at: string;
  uploaded_by: string | null;
}

function formatBytes(b: number) {
  if (!b) return '0 B';
  const k = 1024, s = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
}

function isImage(type: string) { return type.startsWith('image/'); }

export function DocumentVersionHistory({ documentId }: Props) {
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);

  const { data: versions = [], isLoading } = useQuery<Version[]>({
    queryKey: ['doc_versions', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Version[];
    },
    enabled: !!documentId,
  });

  const getUrl = async (path: string) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(path, 3600);
    return data?.signedUrl ?? '';
  };

  const download = async (v: Version) => {
    const url = await getUrl(v.file_path);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = v.file_name; a.click();
  };

  const vA = versions.find(v => v.id === compareA);
  const vB = versions.find(v => v.id === compareB);

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (versions.length === 0) return <p className="text-sm text-muted-foreground text-center py-6">No version history available.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <GitCompare className="h-4 w-4" />
        <span>{versions.length} version{versions.length !== 1 ? 's' : ''} recorded</span>
      </div>

      {/* Version list */}
      <div className="space-y-2">
        {versions.map((v) => (
          <div key={v.id} className={`rounded-lg border p-3 transition-colors ${compareA === v.id || compareB === v.id ? 'border-primary bg-primary/5' : 'border-border'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant={v.version_number === versions[0].version_number ? 'default' : 'secondary'} className="text-xs">
                    v{v.version_number}
                  </Badge>
                  <span className="text-sm font-medium truncate">{v.file_name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatBytes(v.file_size)} · {v.file_type} · {format(new Date(v.created_at), 'MMM d, yyyy HH:mm')}
                </p>
                {v.notes && <p className="text-xs mt-1 italic text-muted-foreground">{v.notes}</p>}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="ghost" size="icon"
                  className={`h-7 w-7 ${compareA === v.id ? 'text-primary' : ''}`}
                  title="Compare (left)"
                  onClick={() => setCompareA(a => a === v.id ? null : v.id)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className={`h-7 w-7 ${compareB === v.id ? 'text-primary' : ''}`}
                  title="Compare (right)"
                  onClick={() => setCompareB(b => b === v.id ? null : v.id)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Download" onClick={() => download(v)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Side-by-side comparison */}
      {compareA && compareB && vA && vB && (
        <div>
          <Separator className="my-3" />
          <p className="text-xs font-semibold text-muted-foreground mb-3">Comparison: v{vA.version_number} vs v{vB.version_number}</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[vA, vB].map((v, idx) => (
              <div key={idx} className="rounded-lg border p-3 space-y-1.5">
                <Badge variant={idx === 0 ? 'default' : 'secondary'} className="text-xs">v{v.version_number}</Badge>
                <p><span className="text-muted-foreground">Name:</span> {v.file_name}</p>
                <p><span className="text-muted-foreground">Size:</span> {formatBytes(v.file_size)}</p>
                <p><span className="text-muted-foreground">Type:</span> {v.file_type}</p>
                <p><span className="text-muted-foreground">Date:</span> {format(new Date(v.created_at), 'MMM d, yyyy')}</p>
                {v.notes && <p><span className="text-muted-foreground">Notes:</span> {v.notes}</p>}
                {isImage(v.file_type) ? (
                  <VersionPreviewImage path={v.file_path} />
                ) : v.file_type === 'application/pdf' ? (
                  <p className="text-xs text-muted-foreground italic">PDF — click download to view</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VersionPreviewImage({ path }: { path: string }) {
  const { data: url } = useQuery<string>({
    queryKey: ['ver_img', path],
    queryFn: async () => {
      const { data } = await supabase.storage.from('documents').createSignedUrl(path, 3600);
      return data?.signedUrl ?? '';
    },
  });
  if (!url) return <Skeleton className="h-24 w-full" />;
  return <img src={url} alt="version preview" className="rounded mt-1 max-h-32 object-contain" />;
}
