import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Crop, RotateCw, Check, Undo2 } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface DocumentCropperProps {
  imageData: string;
  onConfirm: (croppedBlob: Blob) => void;
  onRetake: () => void;
}

/**
 * Attempts simple edge detection by scanning for high-contrast boundaries.
 * Returns 4 corner points (normalized 0-1) or defaults to a padded rectangle.
 */
function detectDocumentEdges(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): [Point, Point, Point, Point] {
  const { width: w, height: h } = canvas;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const brightness = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return (data[i] + data[i + 1] + data[i + 2]) / 3;
  };

  // Scan inward from each edge to find significant brightness changes
  const margin = 0.08;
  let top = margin, bottom = 1 - margin, left = margin, right = 1 - margin;

  // Scan from top
  const scanStep = 4;
  const threshold = 30;

  for (let y = 0; y < h * 0.4; y += scanStep) {
    let edgeCount = 0;
    for (let x = Math.floor(w * 0.2); x < w * 0.8; x += scanStep) {
      if (y + scanStep < h) {
        const diff = Math.abs(brightness(x, y) - brightness(x, y + scanStep));
        if (diff > threshold) edgeCount++;
      }
    }
    if (edgeCount > (w * 0.6) / scanStep * 0.15) {
      top = Math.max(margin, y / h - 0.01);
      break;
    }
  }

  // Scan from bottom
  for (let y = h - 1; y > h * 0.6; y -= scanStep) {
    let edgeCount = 0;
    for (let x = Math.floor(w * 0.2); x < w * 0.8; x += scanStep) {
      if (y - scanStep >= 0) {
        const diff = Math.abs(brightness(x, y) - brightness(x, y - scanStep));
        if (diff > threshold) edgeCount++;
      }
    }
    if (edgeCount > (w * 0.6) / scanStep * 0.15) {
      bottom = Math.min(1 - margin, y / h + 0.01);
      break;
    }
  }

  // Scan from left
  for (let x = 0; x < w * 0.4; x += scanStep) {
    let edgeCount = 0;
    for (let y = Math.floor(h * 0.2); y < h * 0.8; y += scanStep) {
      if (x + scanStep < w) {
        const diff = Math.abs(brightness(x, y) - brightness(x + scanStep, y));
        if (diff > threshold) edgeCount++;
      }
    }
    if (edgeCount > (h * 0.6) / scanStep * 0.15) {
      left = Math.max(margin, x / w - 0.01);
      break;
    }
  }

  // Scan from right
  for (let x = w - 1; x > w * 0.6; x -= scanStep) {
    let edgeCount = 0;
    for (let y = Math.floor(h * 0.2); y < h * 0.8; y += scanStep) {
      if (x - scanStep >= 0) {
        const diff = Math.abs(brightness(x, y) - brightness(x - scanStep, y));
        if (diff > threshold) edgeCount++;
      }
    }
    if (edgeCount > (h * 0.6) / scanStep * 0.15) {
      right = Math.min(1 - margin, x / w + 0.01);
      break;
    }
  }

  return [
    { x: left, y: top },       // top-left
    { x: right, y: top },      // top-right
    { x: right, y: bottom },   // bottom-right
    { x: left, y: bottom },    // bottom-left
  ];
}

export function DocumentCropper({ imageData, onConfirm, onRetake }: DocumentCropperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [corners, setCorners] = useState<[Point, Point, Point, Point] | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [displayedSize, setDisplayedSize] = useState({ width: 0, height: 0 });
  const [rotation, setRotation] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Run edge detection on mount
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const detected = detectDocumentEdges(canvas, ctx);
        setCorners(detected);
      }
    };
    img.src = imageData;
  }, [imageData]);

  // Calculate image display geometry
  useEffect(() => {
    if (!containerRef.current || !imageSize.width) return;

    const updateLayout = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });

      const scale = Math.min(rect.width / imageSize.width, rect.height / imageSize.height);
      const dw = imageSize.width * scale;
      const dh = imageSize.height * scale;
      setDisplayedSize({ width: dw, height: dh });
      setImageOffset({ x: (rect.width - dw) / 2, y: (rect.height - dh) / 2 });
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, [imageSize]);

  const toScreenCoords = useCallback((p: Point) => ({
    x: imageOffset.x + p.x * displayedSize.width,
    y: imageOffset.y + p.y * displayedSize.height,
  }), [imageOffset, displayedSize]);

  const toNormalized = useCallback((screenX: number, screenY: number): Point => ({
    x: Math.max(0, Math.min(1, (screenX - imageOffset.x) / displayedSize.width)),
    y: Math.max(0, Math.min(1, (screenY - imageOffset.y) / displayedSize.height)),
  }), [imageOffset, displayedSize]);

  const getEventPosition = (e: React.TouchEvent | React.MouseEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const handlePointerDown = (index: number) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingIndex(index);
  };

  const handlePointerMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (draggingIndex === null || !corners) return;
    e.preventDefault();
    const pos = getEventPosition(e);
    const normalized = toNormalized(pos.x, pos.y);
    const newCorners = [...corners] as [Point, Point, Point, Point];
    newCorners[draggingIndex] = normalized;
    setCorners(newCorners);
  }, [draggingIndex, corners, toNormalized]);

  const handlePointerUp = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  const handleConfirm = async () => {
    if (!corners) return;
    setIsProcessing(true);

    try {
      const img = new Image();
      img.onload = () => {
        // Compute bounding box from corners
        const minX = Math.min(...corners.map(c => c.x));
        const maxX = Math.max(...corners.map(c => c.x));
        const minY = Math.min(...corners.map(c => c.y));
        const maxY = Math.max(...corners.map(c => c.y));

        const srcX = minX * img.width;
        const srcY = minY * img.height;
        const srcW = (maxX - minX) * img.width;
        const srcH = (maxY - minY) * img.height;

        const canvas = document.createElement('canvas');

        if (rotation === 90 || rotation === 270) {
          canvas.width = srcH;
          canvas.height = srcW;
        } else {
          canvas.width = srcW;
          canvas.height = srcH;
        }

        const ctx = canvas.getContext('2d')!;
        ctx.save();

        if (rotation !== 0) {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          if (rotation === 90 || rotation === 270) {
            ctx.drawImage(img, srcX, srcY, srcW, srcH, -srcH / 2, -srcW / 2, srcH, srcW);
          } else {
            ctx.drawImage(img, srcX, srcY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH);
          }
        } else {
          ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
        }

        ctx.restore();

        canvas.toBlob(
          (blob) => {
            if (blob) onConfirm(blob);
            setIsProcessing(false);
          },
          'image/jpeg',
          0.92
        );
      };
      img.src = imageData;
    } catch {
      setIsProcessing(false);
    }
  };

  const clipPath = corners
    ? corners.map(c => {
        const s = toScreenCoords(c);
        return `${s.x}px ${s.y}px`;
      }).join(', ')
    : '';

  return (
    <div className="flex flex-col h-full w-full bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
        <button
          onClick={onRetake}
          className="text-white p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
        >
          <Undo2 className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 text-white">
          <Crop className="h-4 w-4" />
          <span className="text-sm font-medium">Adjust Crop</span>
        </div>
        <button
          onClick={handleRotate}
          className="text-white p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
        >
          <RotateCw className="h-5 w-5" />
        </button>
      </div>

      {/* Crop area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden touch-none select-none"
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        {/* Dimmed background image */}
        <img
          ref={imageRef}
          src={imageData}
          alt="Document"
          className="absolute object-contain w-full h-full opacity-40"
          style={{ transform: `rotate(${rotation}deg)` }}
          draggable={false}
        />

        {/* Bright crop region */}
        {corners && displayedSize.width > 0 && (
          <>
            {/* Highlighted area using clip-path */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ clipPath: `polygon(${clipPath})` }}
            >
              <img
                src={imageData}
                alt="Cropped area"
                className="absolute object-contain w-full h-full"
                style={{ transform: `rotate(${rotation}deg)` }}
                draggable={false}
              />
            </div>

            {/* Crop lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
              <polygon
                points={corners.map(c => {
                  const s = toScreenCoords(c);
                  return `${s.x},${s.y}`;
                }).join(' ')}
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeDasharray="6 3"
              />
              {/* Grid lines inside crop area */}
              {[1/3, 2/3].map((frac) => {
                const s0 = toScreenCoords(corners[0]);
                const s1 = toScreenCoords(corners[1]);
                const s2 = toScreenCoords(corners[2]);
                const s3 = toScreenCoords(corners[3]);
                // Horizontal
                const hx1 = s0.x + (s3.x - s0.x) * frac;
                const hy1 = s0.y + (s3.y - s0.y) * frac;
                const hx2 = s1.x + (s2.x - s1.x) * frac;
                const hy2 = s1.y + (s2.y - s1.y) * frac;
                // Vertical
                const vx1 = s0.x + (s1.x - s0.x) * frac;
                const vy1 = s0.y + (s1.y - s0.y) * frac;
                const vx2 = s3.x + (s2.x - s3.x) * frac;
                const vy2 = s3.y + (s2.y - s3.y) * frac;
                return (
                  <g key={frac}>
                    <line x1={hx1} y1={hy1} x2={hx2} y2={hy2} stroke="white" strokeWidth="0.5" opacity="0.4" />
                    <line x1={vx1} y1={vy1} x2={vx2} y2={vy2} stroke="white" strokeWidth="0.5" opacity="0.4" />
                  </g>
                );
              })}
            </svg>

            {/* Draggable corner handles */}
            {corners.map((corner, i) => {
              const screen = toScreenCoords(corner);
              return (
                <div
                  key={i}
                  className="absolute z-20"
                  style={{
                    left: screen.x - 18,
                    top: screen.y - 18,
                    width: 36,
                    height: 36,
                    touchAction: 'none',
                  }}
                  onMouseDown={handlePointerDown(i)}
                  onTouchStart={handlePointerDown(i)}
                >
                  {/* Outer touch target is invisible, inner visual dot */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className={`w-5 h-5 rounded-full border-[3px] border-white shadow-lg transition-transform ${
                        draggingIndex === i ? 'scale-125 bg-primary' : 'bg-white/30'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Bottom controls */}
      <div className="px-6 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-black/80 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={onRetake}
            className="flex flex-col items-center gap-1.5 text-white active:opacity-70 transition-opacity"
          >
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <Undo2 className="h-6 w-6" />
            </div>
            <span className="text-xs font-medium">Retake</span>
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex flex-col items-center gap-1.5 text-white active:opacity-70 transition-opacity disabled:opacity-40"
          >
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
              {isProcessing ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="h-6 w-6" />
              )}
            </div>
            <span className="text-xs font-medium">{isProcessing ? 'Cropping...' : 'Confirm'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
