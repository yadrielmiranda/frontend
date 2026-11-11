type Bounds = { left: number; top: number; width: number; height: number };
export type BarcodeRegionCrop = { x: number; y: number; width: number; height: number };

function validBounds(bounds: Bounds): boolean {
  return [bounds.left, bounds.top, bounds.width, bounds.height].every(Number.isFinite)
    && bounds.width > 0 && bounds.height > 0;
}

/** Map the clear guide to native pixels in a centered, object-fit: contain video. */
export function barcodeRegionCrop(
  videoWidth: number,
  videoHeight: number,
  videoBounds: Bounds,
  regionBounds: Bounds,
): BarcodeRegionCrop | null {
  if (!Number.isFinite(videoWidth) || !Number.isFinite(videoHeight)
    || videoWidth <= 0 || videoHeight <= 0
    || !validBounds(videoBounds) || !validBounds(regionBounds)) return null;

  const scale = Math.min(videoBounds.width / videoWidth, videoBounds.height / videoHeight);
  const imageLeft = videoBounds.left + (videoBounds.width - videoWidth * scale) / 2;
  const imageTop = videoBounds.top + (videoBounds.height - videoHeight * scale) / 2;

  // Round inward so a partial edge pixel can never include an outside barcode.
  const x = Math.max(0, Math.ceil((regionBounds.left - imageLeft) / scale));
  const y = Math.max(0, Math.ceil((regionBounds.top - imageTop) / scale));
  const right = Math.min(videoWidth, Math.floor((regionBounds.left + regionBounds.width - imageLeft) / scale));
  const bottom = Math.min(videoHeight, Math.floor((regionBounds.top + regionBounds.height - imageTop) / scale));
  if (right <= x || bottom <= y) return null;
  return { x, y, width: right - x, height: bottom - y };
}

/** Capture only the visible guide. Invalid layout skips this frame, never scans the full video. */
export function readBarcodeRegion(
  video: HTMLVideoElement,
  region: HTMLElement,
  canvas: HTMLCanvasElement,
): HTMLCanvasElement | null {
  if (video.readyState < 2) return null;
  const crop = barcodeRegionCrop(
    video.videoWidth,
    video.videoHeight,
    video.getBoundingClientRect(),
    region.getBoundingClientRect(),
  );
  if (!crop) return null;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("The barcode scanning canvas is unavailable.");
  if (canvas.width !== crop.width) canvas.width = crop.width;
  if (canvas.height !== crop.height) canvas.height = crop.height;
  context.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return canvas;
}
