// src/it/pages/QrScanner.tsx
// Scan a device QR code in two modes:
//   support      → navigates to /it/support?device=ASSET_ID  (default)
//   maintenance  → checks device in for maintenance (updates status + inserts record)
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, QrCode, Wrench, Ticket, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const DEVICE_QR_RE = /\/it\/support\?device=([^&\s]+)/;

type Mode = 'support' | 'maintenance';

type DeviceInfo = {
  id: string;
  asset_id: string;
  device_name: string;
  manufacturer: string;
  model: string;
  status: string;
};

export default function QrScanner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode: Mode = searchParams.get('mode') === 'maintenance' ? 'maintenance' : 'support';

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [hasBarcodeDetector] = useState(() => 'BarcodeDetector' in window);

  // Maintenance mode state
  const [confirmDevice, setConfirmDevice] = useState<DeviceInfo | null>(null);
  const [checkedInDevice, setCheckedInDevice] = useState<DeviceInfo | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  // ── camera ──────────────────────────────────────────────────────────────────
  const handleScanned = useCallback((assetId: string) => {
    stopCamera();
    if (mode === 'support') {
      navigate(`/it/support?device=${encodeURIComponent(assetId)}`);
      return;
    }
    // maintenance — look up device first
    lookupDevice(assetId);
  }, [mode, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  async function lookupDevice(assetId: string) {
    const { data, error } = await supabase
      .from('it_devices')
      .select('id,asset_id,device_name,manufacturer,model,status')
      .or(`asset_id.eq.${assetId},asset_id.ilike.%${assetId}%`)
      .maybeSingle();
    if (error || !data) {
      setError(`Device "${assetId}" not found in the system.`);
      return;
    }
    setConfirmDevice(data as DeviceInfo);
  }

  useEffect(() => {
    if (!hasBarcodeDetector) return;
    let animId: number;
    let detector: any;
    let done = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setScanning(true);
        }
        // @ts-ignore
        detector = new BarcodeDetector({ formats: ['qr_code'] });

        async function tick() {
          if (done) return;
          if (!videoRef.current || videoRef.current.readyState < 2) {
            animId = requestAnimationFrame(tick); return;
          }
          try {
            const barcodes: any[] = await detector.detect(videoRef.current);
            for (const bc of barcodes) {
              const raw: string = bc.rawValue ?? '';
              const m = raw.match(DEVICE_QR_RE);
              if (m) { done = true; handleScanned(decodeURIComponent(m[1])); return; }
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
    return () => { done = true; cancelAnimationFrame(animId); stopCamera(); };
  }, [hasBarcodeDetector, handleScanned]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  // ── maintenance check-in ────────────────────────────────────────────────────
  async function handleCheckIn() {
    if (!confirmDevice) return;
    setCheckingIn(true);
    try {
      // Update device status to 'maintenance'
      await supabase.from('it_devices').update({ status: 'maintenance' }).eq('id', confirmDevice.id);

      // Insert maintenance record
      await supabase.from('it_maintenance').insert({
        device_id: confirmDevice.id,
        type: 'corrective',
        status: 'in_progress',
        scheduled_date: format(new Date(), 'yyyy-MM-dd'),
        description: 'Device checked in via QR scan',
        performed_by: 'IT Staff',
        cost: 0,
      });

      setCheckedInDevice(confirmDevice);
      setConfirmDevice(null);
      toast.success(`${confirmDevice.asset_id} checked in for maintenance`);
    } catch (err: any) {
      toast.error(`Check-in failed: ${err.message}`);
    } finally {
      setCheckingIn(false);
    }
  }

  // ── manual fallback ──────────────────────────────────────────────────────────
  function handleManual(e: React.FormEvent) {
    e.preventDefault();
    const val = manualInput.trim();
    if (!val) return;
    const m = val.match(DEVICE_QR_RE);
    const assetId = m ? decodeURIComponent(m[1]) : val;
    if (mode === 'support') {
      navigate(`/it/support?device=${encodeURIComponent(assetId)}`);
    } else {
      lookupDevice(assetId);
    }
  }

  // ── mode toggle clears state ─────────────────────────────────────────────────
  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setConfirmDevice(null);
    setCheckedInDevice(null);
    navigate(`/it/scan${next === 'maintenance' ? '?mode=maintenance' : ''}`, { replace: true });
  }

  // ── success screen ───────────────────────────────────────────────────────────
  if (checkedInDevice) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 gap-6 text-center">
        <CheckCircle2 className="h-16 w-16 text-success" />
        <div>
          <h1 className="text-2xl font-bold">Checked In</h1>
          <p className="text-muted-foreground mt-1">{checkedInDevice.asset_id} — {checkedInDevice.device_name}</p>
          <p className="text-sm text-muted-foreground mt-1">{checkedInDevice.manufacturer} {checkedInDevice.model}</p>
        </div>
        <p className="text-sm text-muted-foreground">Status updated to <strong>Maintenance</strong> and a maintenance record has been created.</p>
        <div className="flex gap-3">
          <Button onClick={() => navigate('/it/devices')} variant="outline">View Devices</Button>
          <Button onClick={() => navigate('/it/ops/maintenance')}>View Maintenance</Button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setCheckedInDevice(null); setManualInput(''); }}>
          Scan another device
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate('/it')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold text-foreground">QR Scanner</h1>
          <p className="text-xs text-muted-foreground">
            {mode === 'support' ? 'Scan a device QR code to log a support ticket' : 'Scan a device QR code to check it in for maintenance'}
          </p>
        </div>
        {/* Mode toggle */}
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <button
            onClick={() => switchMode('support')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'support' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Ticket className="h-3.5 w-3.5" /> Support
          </button>
          <button
            onClick={() => switchMode('maintenance')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'maintenance' ? 'bg-orange-500 text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Wrench className="h-3.5 w-3.5" /> Maintenance
          </button>
        </div>
      </div>

      {/* Mode indicator banner */}
      {mode === 'maintenance' && (
        <div className="bg-orange-500/10 border-b border-orange-500/20 px-4 py-2 text-xs text-orange-700 dark:text-orange-400 flex items-center gap-2">
          <Wrench className="h-3.5 w-3.5" />
          Maintenance mode — scanning will check the device in for repair and update its status
        </div>
      )}

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
            <div className="relative overflow-hidden rounded-2xl bg-black aspect-square">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />

              {/* Scanning brackets */}
              {scanning && (
                <>
                  <span className="absolute top-4 left-4 h-8 w-8 border-t-4 border-l-4 border-primary rounded-tl-lg animate-pulse" />
                  <span className="absolute top-4 right-4 h-8 w-8 border-t-4 border-r-4 border-primary rounded-tr-lg animate-pulse" />
                  <span className="absolute bottom-4 left-4 h-8 w-8 border-b-4 border-l-4 border-primary rounded-bl-lg animate-pulse" />
                  <span className="absolute bottom-4 right-4 h-8 w-8 border-b-4 border-r-4 border-primary rounded-br-lg animate-pulse" />
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

        {/* Manual input */}
        <form onSubmit={handleManual} className="flex gap-2 w-full max-w-sm">
          <Input
            placeholder="Enter asset ID or paste URL…"
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="outline">Go</Button>
        </form>
      </div>

      {/* Maintenance confirmation dialog */}
      <Dialog open={!!confirmDevice} onOpenChange={() => setConfirmDevice(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-orange-500" />
              Check in for Maintenance
            </DialogTitle>
          </DialogHeader>
          {confirmDevice && (
            <div className="space-y-3 py-2">
              <div className="bg-muted rounded-lg p-4 space-y-1">
                <p className="font-semibold">{confirmDevice.asset_id}</p>
                <p className="text-sm text-muted-foreground">{confirmDevice.device_name}</p>
                <p className="text-sm text-muted-foreground">{confirmDevice.manufacturer} {confirmDevice.model}</p>
                <p className="text-xs mt-2">
                  Current status: <span className="font-medium capitalize">{confirmDevice.status}</span>
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                This will update the device status to <strong>Maintenance</strong> and create a corrective maintenance record for today.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDevice(null)}>Cancel</Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleCheckIn}
              disabled={checkingIn}
            >
              {checkingIn ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Checking in…</> : 'Confirm Check-in'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
