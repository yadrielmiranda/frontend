export const DIMENSION_COLOR = "#2F3B45";
export const DIMENSION_FONT_FAMILY = "Arial, Helvetica, sans-serif";
export const DIMENSION_FONT_WEIGHT = 700;

const STROKE_RATIO = 4 / 2048;
const TERMINAL_LENGTH_RATIO = 13 / 2048;
const TERMINAL_HALF_WIDTH_RATIO = 7 / 2048;
const FONT_SIZE_RATIO = 64 / 2048;

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
