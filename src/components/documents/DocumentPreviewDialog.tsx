import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, ExternalLink, ZoomIn, ZoomOut, RotateCw, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { DocumentVersionHistory } from './DocumentVersionHistory';

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
  title: string;
  fileType: string;
  documentId?: string;
  onDownload?: () => void;
}

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  url,
  title,
  fileType,
  documentId,
  onDownload,
}: DocumentPreviewDialogProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const { isCustomer, profile, user } = useAuth();

  const isImage = fileType?.includes('image');
  const isPdf = fileType?.includes('pdf');
  const isWord = fileType?.includes('word') || fileType?.includes('officedocument.wordprocessing') || fileType?.includes('msword');

  const officeViewerUrl = useMemo(() => {
    if (!url || !isWord) return null;
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  }, [url, isWord]);

  const watermarkText = useMemo(() => {
    if (!isCustomer) return null;
    const who = profile?.full_name || profile?.email || user?.email || 'Customer';
    return `${who} • ${format(new Date(), 'yyyy-MM-dd HH:mm')} • DO NOT DISTRIBUTE`;
  }, [isCustomer, profile, user]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const canZoom = isImage || isPdf;

  const resetView = () => {
    setZoom(100);
    setRotation(0);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetView();
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] sm:h-[85vh] flex flex-col p-3 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <DialogTitle className="truncate pr-4 text-sm sm:text-base">{title}</DialogTitle>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              {canZoom && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleZoomOut}
                    disabled={zoom <= 50}
                    title="Zoom out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs sm:text-sm text-muted-foreground w-10 sm:w-12 text-center">
                    {zoom}%
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleZoomIn}
                    disabled={zoom >= 200}
                    title="Zoom in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </>
              )}
              {isImage && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleRotate}
                  title="Rotate"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              )}
              {url && !isCustomer && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => window.open(url, '_blank')}
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
              {onDownload && (
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={onDownload} title="Download">
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {documentId ? (
          <Tabs defaultValue="preview" className="flex flex-col flex-1 overflow-hidden">
            <TabsList className="flex-shrink-0 w-full sm:w-auto self-start mb-2">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="versions">Versions</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="flex-1 overflow-hidden mt-0">
              <PreviewBody
                url={url}
                title={title}
                isImage={isImage}
                isPdf={isPdf}
                isWord={isWord}
                officeViewerUrl={officeViewerUrl}
                zoom={zoom}
                rotation={rotation}
                isCustomer={isCustomer}
                watermarkText={watermarkText}
              />
            </TabsContent>

            <TabsContent value="versions" className="flex-1 overflow-auto mt-0">
              <div className="p-1">
                <DocumentVersionHistory documentId={documentId} />
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <PreviewBody
            url={url}
            title={title}
            isImage={isImage}
            isPdf={isPdf}
            isWord={isWord}
            officeViewerUrl={officeViewerUrl}
            zoom={zoom}
            rotation={rotation}
            isCustomer={isCustomer}
            watermarkText={watermarkText}
          />
        )}

        {isCustomer && (
          <p className="text-[11px] text-muted-foreground text-center pt-1 flex-shrink-0">
            Preview is watermarked with your identity for traceability.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface PreviewBodyProps {
  url: string | null;
  title: string;
  isImage: boolean;
  isPdf: boolean;
  isWord: boolean;
  officeViewerUrl: string | null;
  zoom: number;
  rotation: number;
  isCustomer: boolean;
  watermarkText: string | null;
}

function PreviewBody({
  url, title, isImage, isPdf, isWord, officeViewerUrl, zoom, rotation, isCustomer, watermarkText,
}: PreviewBodyProps) {
  return (
    <div className="relative flex-1 overflow-hidden bg-muted/50 rounded-lg">
      <div className="w-full h-full overflow-auto">
        {url && isImage ? (
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={url}
              alt={title}
              className="max-w-full max-h-full object-contain transition-transform duration-200 select-none"
              draggable={false}
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              }}
            />
          </div>
        ) : url && isPdf ? (
          <div
            className="w-full h-full origin-top-left transition-transform duration-200"
            style={{ transform: `scale(${zoom / 100})`, width: `${10000 / zoom}%`, height: `${10000 / zoom}%` }}
          >
            <iframe
              src={`${url}#toolbar=1&navpanes=0`}
              className="w-full h-full rounded-lg border-0"
              title={title}
            />
          </div>
        ) : url && isWord && officeViewerUrl ? (
          <iframe
            src={officeViewerUrl}
            className="w-full h-full rounded-lg border-0 bg-white"
            title={title}
          />
        ) : url ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center p-8">
              <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">
                This file type cannot be previewed directly.
              </p>
              {!isCustomer && (
                <Button onClick={() => window.open(url, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Role-aware watermark for customers */}
      {watermarkText && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden select-none"
          style={{
            backgroundImage: `repeating-linear-gradient(-30deg, transparent 0 180px, rgba(0,0,0,0.001) 180px 181px)`,
          }}
        >
          <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-16 opacity-[0.14] rotate-[-24deg] text-foreground text-sm font-semibold tracking-wide">
            {Array.from({ length: 40 }).map((_, i) => (
              <span key={i} className="whitespace-nowrap">{watermarkText}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
