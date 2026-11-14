import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeviceQrDialogProps {
  assetId: string;
  open: boolean;
  onClose: () => void;
}

export function DeviceQrDialog({ assetId, open, onClose }: DeviceQrDialogProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const deviceUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/it/support?device=${encodeURIComponent(assetId)}`
    : '';

  useEffect(() => {
    if (!open || !assetId) return;
    QRCode.toDataURL(deviceUrl, { width: 256, margin: 2 })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [open, assetId, deviceUrl]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>QR Code — {assetId}</DialogTitle>
        </DialogHeader>

        <style>{`
          @media print {
            body > *:not(#qr-print-area) { display: none !important; }
            #qr-print-area { display: block !important; text-align: center; padding: 24px; }
          }
        `}</style>

        <div className="flex flex-col items-center gap-4 py-2">
          <div id="qr-print-area" className="flex flex-col items-center gap-3">
            {qrDataUrl ? (
              <img src={qrDataUrl} width={200} height={200} alt={`QR code for ${assetId}`} />
            ) : (
              <div className="h-[200px] w-[200px] flex items-center justify-center bg-muted rounded">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <p className="text-xs text-muted-foreground break-all text-center max-w-[200px]">{deviceUrl}</p>
          </div>

          <Button variant="outline" className="w-full" onClick={() => window.print()}>
            Print QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
