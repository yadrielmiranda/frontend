type FrameColorChoice = { id: number; color: string; isActive?: boolean };

export function positiveFrameColorId(value: unknown): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Choices belong to the current series; inactive catalog colors cannot be restored. */
export function restoreFrameColorAfterDesign<T extends FrameColorChoice>({
  previousFrameColorId,
  estimateFrameColorId,
  systemDefaultFrameColorId,
  availableFrameColors,
}: {
  previousFrameColorId?: number | null;
  estimateFrameColorId?: number | null;
  systemDefaultFrameColorId?: number | null;
  availableFrameColors: readonly T[];
}): T | null {
  for (const candidate of [previousFrameColorId, estimateFrameColorId, systemDefaultFrameColorId]) {
    const id = positiveFrameColorId(candidate);
    const color = availableFrameColors.find(item => item.id === id && item.isActive !== false);
    if (color) return color;
  }
  return null;
}
