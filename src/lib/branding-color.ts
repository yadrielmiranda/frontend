export const DEFAULT_BRANDING_COLOR = "#000000";

export const BRANDING_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function normalizeBrandingColor(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_BRANDING_COLOR;

  const normalized = value.trim().toUpperCase();
  return BRANDING_COLOR_PATTERN.test(normalized)
    ? normalized
    : DEFAULT_BRANDING_COLOR;
}

export function getReadableTextColor(backgroundColor: unknown): string {
  const color = normalizeBrandingColor(backgroundColor);
  const channels = [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
  ];
  const [red, green, blue] = channels.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  const whiteContrast = 1.05 / (luminance + 0.05);
  const blackContrast = (luminance + 0.05) / 0.05;

  return whiteContrast >= blackContrast ? "#FFFFFF" : "#000000";
}
