import { supabase } from '@/integrations/supabase/client';

/**
 * Downloads a document with a watermark overlay.
 * For images: adds text watermark using canvas.
 * For other files: downloads normally with audit trail via edge function.
 */
export async function downloadWithWatermark(
  filePath: string,
  fileName: string,
  fileType: string,
  userName: string,
  userEmail: string
): Promise<void> {
  // Call the watermark edge function to get signed URL and watermark text
  const { data, error } = await supabase.functions.invoke('watermark-download', {
    body: { filePath, userName, userEmail },
  });

  if (error || !data?.signedUrl) {
    throw new Error('Failed to generate watermarked download');
  }

  const { signedUrl, watermarkText } = data;

  // For images, apply client-side watermark
  if (fileType.includes('image')) {
    await watermarkImage(signedUrl, fileName, watermarkText);
  } else {
    // For non-image files, just download with audit trail already logged
    const link = document.createElement('a');
    link.href = signedUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

async function watermarkImage(
  imageUrl: string,
  fileName: string,
  watermarkText: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Watermark settings
      const fontSize = Math.max(16, Math.floor(img.width / 40));
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = 'rgba(128, 128, 128, 0.4)';
      ctx.textAlign = 'center';

      // Rotate and tile watermark across the image
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-Math.PI / 6);

      const textWidth = ctx.measureText(watermarkText).width;
      const stepX = textWidth + 100;
      const stepY = fontSize * 4;

      for (let y = -canvas.height; y < canvas.height * 2; y += stepY) {
        for (let x = -canvas.width; x < canvas.width * 2; x += stepX) {
          ctx.fillText(watermarkText, x, y);
        }
      }
      ctx.restore();

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          resolve();
        } else {
          reject(new Error('Failed to create watermarked image'));
        }
      }, 'image/jpeg', 0.95);
    };
    img.onerror = () => reject(new Error('Failed to load image for watermarking'));
    img.src = imageUrl;
  });
}
