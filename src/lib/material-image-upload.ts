const MAX_BYTES = 5 * 1024 * 1024;
const MAX_EDGE = 1600;

/** Validate and size product photos before upload, keeping the catalog light. */
export async function prepareMaterialImage(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Choose a JPG, PNG or WebP image.");
  }
  if (!file.size || file.size > MAX_BYTES) throw new Error("Choose an image smaller than 5 MB.");

  const objectUrl = URL.createObjectURL(file);
  try {
    const picture = new Image();
    picture.src = objectUrl;
    try { await picture.decode(); } catch { throw new Error("This image could not be opened. Choose another photo."); }
    const width = picture.naturalWidth;
    const height = picture.naturalHeight;
    if (!width || !height || width * height > 40_000_000) {
      throw new Error("Choose an image with fewer than 40 million pixels.");
    }
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not prepare the image. Try again in another browser.");
    context.drawImage(picture, 0, 0, canvas.width, canvas.height);
    const optimized = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.84));
    if (!optimized) throw new Error("This image could not be prepared. Choose another photo.");
    // Re-encoding also removes camera metadata; browsers without WebP encoding use PNG.
    const extension = optimized.type === "image/webp" ? "webp" : "png";
    if (optimized.size > MAX_BYTES) throw new Error("The prepared image is too large. Choose a smaller photo.");
    return new File([optimized], `product.${extension}`, { type: optimized.type });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
