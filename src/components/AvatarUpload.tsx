import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Camera, Loader2, Trash2 } from 'lucide-react';

// Validation constants
const ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/webp'] as const;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB raw upload
const MIN_DIM = 96;
const MAX_DIM = 8000;
const OUTPUT_SIZE = 512; // final square output
const PREVIEW_SIZE = 280;

// Magic-byte check against declared MIME
async function verifyMagicBytes(file: File): Promise<boolean> {
  const buf = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const hex = Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
  // PNG: 89504e470d0a1a0a
  if (file.type === 'image/png') return hex.startsWith('89504e470d0a1a0a');
  // JPEG: ffd8ff
  if (file.type === 'image/jpeg') return hex.startsWith('ffd8ff');
  // WebP: RIFF....WEBP -> 52494646 ........ 57454250
  if (file.type === 'image/webp')
    return hex.startsWith('52494646') && hex.slice(16, 24) === '57454250';
  return false;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = src;
  });
}

export function AvatarUpload() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);

  // Cropper state
  const [editorOpen, setEditorOpen] = useState(false);
  const [sourceImg, setSourceImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0); // -1 .. 1
  const [offsetY, setOffsetY] = useState(0);

  const initials = (profile?.full_name || profile?.email || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Draw the live preview whenever crop params change
  useEffect(() => {
    if (!editorOpen || !sourceImg) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = PREVIEW_SIZE;
    canvas.height = PREVIEW_SIZE;
    ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

    // Cover-fit base scale, then user zoom
    const baseScale = Math.max(PREVIEW_SIZE / sourceImg.width, PREVIEW_SIZE / sourceImg.height);
    const scale = baseScale * zoom;
    const drawW = sourceImg.width * scale;
    const drawH = sourceImg.height * scale;
    const slackX = Math.max(0, (drawW - PREVIEW_SIZE) / 2);
    const slackY = Math.max(0, (drawH - PREVIEW_SIZE) / 2);
    const dx = PREVIEW_SIZE / 2 - drawW / 2 + offsetX * slackX;
    const dy = PREVIEW_SIZE / 2 - drawH / 2 + offsetY * slackY;
    ctx.drawImage(sourceImg, dx, dy, drawW, drawH);
  }, [editorOpen, sourceImg, zoom, offsetX, offsetY]);

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input so re-selecting the same file fires change again
    if (fileRef.current) fileRef.current.value = '';
    if (!file || !user) return;

    if (!(ALLOWED_MIMES as readonly string[]).includes(file.type)) {
      toast({
        title: 'Unsupported format',
        description: 'Please choose a PNG, JPG, or WebP image.',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: 'Image too large', description: 'Maximum file size is 5 MB.', variant: 'destructive' });
      return;
    }
    // Verify the file actually matches its declared content type
    const ok = await verifyMagicBytes(file);
    if (!ok) {
      toast({
        title: 'File content does not match its type',
        description: 'This file may be renamed or corrupt. Please choose a real PNG, JPG, or WebP image.',
        variant: 'destructive',
      });
      return;
    }

    let img: HTMLImageElement;
    try {
      img = await loadImage(URL.createObjectURL(file));
    } catch {
      toast({ title: 'Could not read image', variant: 'destructive' });
      return;
    }

    if (img.width < MIN_DIM || img.height < MIN_DIM) {
      toast({
        title: 'Image too small',
        description: `Minimum ${MIN_DIM}×${MIN_DIM} pixels.`,
        variant: 'destructive',
      });
      return;
    }
    if (img.width > MAX_DIM || img.height > MAX_DIM) {
      toast({
        title: 'Image too large',
        description: `Maximum ${MAX_DIM}×${MAX_DIM} pixels.`,
        variant: 'destructive',
      });
      return;
    }

    setSourceImg(img);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setEditorOpen(true);
  };

  const handleSaveCrop = async () => {
    if (!sourceImg || !user) return;
    setUploading(true);
    try {
      // Render full-resolution OUTPUT_SIZE square using same math as preview
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');
      ctx.imageSmoothingQuality = 'high';

      const baseScale = Math.max(OUTPUT_SIZE / sourceImg.width, OUTPUT_SIZE / sourceImg.height);
      const scale = baseScale * zoom;
      const drawW = sourceImg.width * scale;
      const drawH = sourceImg.height * scale;
      const slackX = Math.max(0, (drawW - OUTPUT_SIZE) / 2);
      const slackY = Math.max(0, (drawH - OUTPUT_SIZE) / 2);
      const dx = OUTPUT_SIZE / 2 - drawW / 2 + offsetX * slackX;
      const dy = OUTPUT_SIZE / 2 - drawH / 2 + offsetY * slackY;
      ctx.drawImage(sourceImg, dx, dy, drawW, drawH);

      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Encoding failed'))),
          'image/jpeg',
          0.9
        )
      );

      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${Date.now()}`;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('user_id', user.id);
      if (profileError) throw profileError;

      setAvatarUrl(url);
      setEditorOpen(false);
      setSourceImg(null);
      toast({ title: 'Profile picture updated' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err?.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!user) return;
    setUploading(true);
    try {
      await supabase.from('profiles').update({ avatar_url: null }).eq('user_id', user.id);
      setAvatarUrl(null);
      toast({ title: 'Profile picture removed' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-20 w-20 border-2 border-border">
        {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile picture" />}
        <AvatarFallback className="text-lg">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleSelect}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
          {avatarUrl ? 'Change photo' : 'Upload photo'}
        </Button>
        {avatarUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={uploading}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          PNG, JPG, or WebP · {MIN_DIM}×{MIN_DIM} to {MAX_DIM}×{MAX_DIM} · max 5 MB
        </p>
      </div>

      <Dialog
        open={editorOpen}
        onOpenChange={(open) => {
          if (!open && !uploading) {
            setEditorOpen(false);
            setSourceImg(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust your photo</DialogTitle>
            <DialogDescription>
              Zoom and reposition. We&apos;ll save a square {OUTPUT_SIZE}×{OUTPUT_SIZE} version.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4">
            <div
              className="rounded-full overflow-hidden border-2 border-border bg-muted"
              style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
            >
              <canvas
                ref={previewCanvasRef}
                width={PREVIEW_SIZE}
                height={PREVIEW_SIZE}
                className="block"
              />
            </div>

            <div className="w-full space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Zoom</Label>
                <Slider
                  min={1}
                  max={4}
                  step={0.05}
                  value={[zoom]}
                  onValueChange={(v) => setZoom(v[0])}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Horizontal position</Label>
                <Slider
                  min={-1}
                  max={1}
                  step={0.02}
                  value={[offsetX]}
                  onValueChange={(v) => setOffsetX(v[0])}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Vertical position</Label>
                <Slider
                  min={-1}
                  max={1}
                  step={0.02}
                  value={[offsetY]}
                  onValueChange={(v) => setOffsetY(v[0])}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditorOpen(false);
                setSourceImg(null);
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveCrop} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save photo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
