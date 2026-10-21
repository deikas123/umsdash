import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, SwitchCamera, ZoomIn, ZoomOut } from 'lucide-react';
import { DocumentCropper } from './DocumentCropper';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
}

type CameraStep = 'viewfinder' | 'crop';

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [zoom, setZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [step, setStep] = useState<CameraStep>('viewfinder');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async (facing: 'environment' | 'user' = facingMode) => {
    try {
      setError(null);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      setStream(mediaStream);

      const track = mediaStream.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities?.() as any;
        if (capabilities?.zoom) {
          setMaxZoom(Math.min(capabilities.zoom.max, 5));
          setZoom(1);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Unable to access camera. Please check permissions and try again.');
    }
  }, [facingMode, stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const handleOpen = async () => {
    setIsOpen(true);
    setCapturedImage(null);
    setStep('viewfinder');
    setZoom(1);
    setTimeout(() => startCamera(), 100);
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setError(null);
    setZoom(1);
    setStep('viewfinder');
    setIsOpen(false);
  };

  const handleSwitchCamera = async () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    await startCamera(newFacing);
  };

  const handleZoom = async (newZoom: number) => {
    const clamped = Math.max(1, Math.min(newZoom, maxZoom));
    setZoom(clamped);
    if (stream) {
      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          await (track as any).applyConstraints({ advanced: [{ zoom: clamped }] });
        } catch { /* zoom not supported */ }
      }
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.92);
        setCapturedImage(imageData);
        stopCamera();
        setStep('crop');
      }
    }
  };

  const handleRetake = async () => {
    setCapturedImage(null);
    setStep('viewfinder');
    setZoom(1);
    await startCamera();
  };

  const handleCropConfirm = (croppedBlob: Blob) => {
    const file = new File(
      [croppedBlob],
      `document-${Date.now()}.jpg`,
      { type: 'image/jpeg' }
    );
    onCapture(file);
    handleClose();
  };

  // Prevent body scroll when camera is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) {
    return (
      <Button type="button" variant="outline" onClick={handleOpen} className="gap-2">
        <Camera className="h-4 w-4" />
        Take Photo
      </Button>
    );
  }

  // Crop step
  if (step === 'crop' && capturedImage) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col">
        <DocumentCropper
          imageData={capturedImage}
          onConfirm={handleCropConfirm}
          onRetake={handleRetake}
        />
      </div>
    );
  }

  // Viewfinder step
  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
        <button
          onClick={handleClose}
          className="text-white p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
        <h2 className="text-white font-medium text-base">Capture Document</h2>
        <button
          onClick={handleSwitchCamera}
          className="text-white p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
          disabled={!stream}
        >
          <SwitchCamera className="h-5 w-5" />
        </button>
      </div>

      {/* Viewfinder */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
        {error ? (
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <Camera className="h-8 w-8 text-red-400" />
            </div>
            <p className="text-white/80 text-sm leading-relaxed">{error}</p>
            <Button variant="outline" onClick={handleClose} className="mt-2 border-white/20 text-white hover:bg-white/10">
              Close
            </Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Document guide overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-6 sm:inset-12 border-2 border-white/30 rounded-lg">
                <div className="absolute -top-[1px] -left-[1px] w-6 h-6 border-t-[3px] border-l-[3px] border-white rounded-tl-lg" />
                <div className="absolute -top-[1px] -right-[1px] w-6 h-6 border-t-[3px] border-r-[3px] border-white rounded-tr-lg" />
                <div className="absolute -bottom-[1px] -left-[1px] w-6 h-6 border-b-[3px] border-l-[3px] border-white rounded-bl-lg" />
                <div className="absolute -bottom-[1px] -right-[1px] w-6 h-6 border-b-[3px] border-r-[3px] border-white rounded-br-lg" />
              </div>
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <span className="text-white/60 text-xs bg-black/40 px-3 py-1 rounded-full">
                  Align document within the frame
                </span>
              </div>
            </div>
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Zoom controls */}
      {!error && maxZoom > 1 && (
        <div className="flex items-center justify-center gap-4 py-2 bg-black/80">
          <button
            onClick={() => handleZoom(zoom - 0.5)}
            disabled={zoom <= 1}
            className="text-white p-1.5 rounded-full hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-white/70 text-xs font-mono min-w-[3ch] text-center">
            {zoom.toFixed(1)}x
          </span>
          <button
            onClick={() => handleZoom(zoom + 0.5)}
            disabled={zoom >= maxZoom}
            className="text-white p-1.5 rounded-full hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Shutter button */}
      {!error && (
        <div className="px-6 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-black/80 backdrop-blur-sm">
          <div className="flex items-center justify-center">
            <button
              onClick={capturePhoto}
              disabled={!stream}
              className="w-[72px] h-[72px] rounded-full border-[4px] border-white flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform"
            >
              <div className="w-[58px] h-[58px] rounded-full bg-white active:bg-white/80 transition-colors" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
