// src/it/pages/QrScanner.tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, QrCode } from 'lucide-react';

const DEVICE_QR_RE = /\/it\/support\?device=([^&]+)/;

export default function QrScanner() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [hasBarcodeDetector] = useState(() => 'BarcodeDetector' in window);

  // Start camera
  useEffect(() => {
    if (!hasBarcodeDetector) return;

    let animId: number;
    let detector: any;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setScanning(true);
        }

        // @ts-ignore — BarcodeDetector is not in lib.dom.d.ts yet
        detector = new BarcodeDetector({ formats: ['qr_code'] });

        async function tick() {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            animId = requestAnimationFrame(tick);
            return;
          }
          try {
            const barcodes: any[] = await detector.detect(videoRef.current);
            for (const bc of barcodes) {
              const raw: string = bc.rawValue ?? '';
              const m = raw.match(DEVICE_QR_RE);
              if (m) {
                stopCamera();
                navigate(`/it/support?device=${decodeURIComponent(m[1])}`);
                return;
              }
            }
          } catch (_) {}
          animId = requestAnimationFrame(tick);
        }
        animId = requestAnimationFrame(tick);
      } catch (err: any) {
        setError(err?.message ?? 'Camera access denied');
      }
    }

    start();

    return () => {
      cancelAnimationFrame(animId);
      stopCamera();
    };
  }, [hasBarcodeDetector, navigate]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  function handleManual(e: React.FormEvent) {
    e.preventDefault();
    const val = manualInput.trim();
    if (!val) return;
    const m = val.match(DEVICE_QR_RE);
    if (m) {
      navigate(`/it/support?device=${decodeURIComponent(m[1])}`);
    } else {
      // Treat the raw input as a device identifier
      navigate(`/it/support?device=${encodeURIComponent(val)}`);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate('/it')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-semibold text-foreground">QR Scanner</h1>
          <p className="text-xs text-muted-foreground">Scan a device QR code to log a support ticket</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
        {!hasBarcodeDetector ? (
          <div className="text-center space-y-3 max-w-sm">
            <QrCode className="h-16 w-16 mx-auto text-muted-foreground" />
            <p className="font-semibold">QR scanning not available</p>
            <p className="text-sm text-muted-foreground">
              Your browser does not support the BarcodeDetector API. Use the manual input below or try Chrome on Android / Edge on Windows.
            </p>
          </div>
        ) : (
          <div className="relative w-full max-w-sm">
            {/* Camera viewport */}
            <div className="relative overflow-hidden rounded-2xl bg-black aspect-square">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Animated corner brackets */}
              {scanning && (
                <>
                  <span className="absolute top-4 left-4 h-8 w-8 border-t-4 border-l-4 border-primary rounded-tl-lg animate-pulse" />
                  <span className="absolute top-4 right-4 h-8 w-8 border-t-4 border-r-4 border-primary rounded-tr-lg animate-pulse" />
                  <span className="absolute bottom-4 left-4 h-8 w-8 border-b-4 border-l-4 border-primary rounded-bl-lg animate-pulse" />
                  <span className="absolute bottom-4 right-4 h-8 w-8 border-b-4 border-r-4 border-primary rounded-br-lg animate-pulse" />
                  {/* Scan line */}
                  <div className="absolute left-4 right-4 top-1/2 h-0.5 bg-primary/60 animate-bounce" />
                </>
              )}

              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 p-4 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </div>

            {scanning && (
              <p className="text-center text-xs text-muted-foreground mt-2">
                Point the camera at a device QR code
              </p>
            )}
          </div>
        )}

        {/* Manual input fallback */}
        <div className="w-full max-w-sm space-y-2">
          <p className="text-xs text-muted-foreground text-center font-medium uppercase tracking-wide">
            — or enter manually —
          </p>
          <form onSubmit={handleManual} className="flex gap-2">
            <Input
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Device ID or QR URL"
              className="flex-1"
            />
            <Button type="submit">Go</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
