export const DIMENSION_COLOR = "#2F3B45";
export const DIMENSION_FONT_FAMILY = "Arial, Helvetica, sans-serif";
export const DIMENSION_FONT_WEIGHT = 700;

const STROKE_RATIO = 4 / 2048;
const TERMINAL_LENGTH_RATIO = 13 / 2048;
const TERMINAL_HALF_WIDTH_RATIO = 7 / 2048;
const FONT_SIZE_RATIO = 80 / 2048;

export type DiagramBounds = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type DiagramMargins = Readonly<{
  top: number;
  right: number;
  bottom: number;
  left: number;
}>;

/**
 * Keeps dimension lines, terminal tips, and labels visually identical across
 * renderers that use different SVG coordinate systems.
 */
export function dimensionMetrics(referenceSize: number) {
  return {
    strokeWidth: referenceSize * STROKE_RATIO,
    terminalLength: referenceSize * TERMINAL_LENGTH_RATIO,
    terminalHalfWidth: referenceSize * TERMINAL_HALF_WIDTH_RATIO,
    fontSize: referenceSize * FONT_SIZE_RATIO,
  } as const;
}

/**
 * Crops renderer-specific empty canvas while keeping the product and its
 * dimension annotations inside the SVG viewport.
 */
export function expandedViewBox(
  bounds: DiagramBounds,
  margins: DiagramMargins,
): string {
  return [
    bounds.x - margins.left,
    bounds.y - margins.top,
    bounds.width + margins.left + margins.right,
    bounds.height + margins.top + margins.bottom,
  ].join(" ");
}
