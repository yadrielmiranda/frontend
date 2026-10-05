import type { SlidingGlassDoorRect } from "./sliding-glass-door-spec";

type Rect = SlidingGlassDoorRect;
type Interval = readonly [number, number];

export type SlidingGlassDoorSlice = { source: Rect; target: Rect };

function median(values: number[]): number {
  const sorted = values.filter((value) => value > 0).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function createAxis(
  sourceStart: number,
  sourceLength: number,
  targetStart: number,
  targetLength: number,
  flexible: readonly Interval[],
  requestedProfileScale: number,
) {
  const sourceEnd = sourceStart + sourceLength;
  const affineScale = targetLength / sourceLength;
  const intervals = flexible
    .map(([start, end]) => [Math.max(start, sourceStart), Math.min(end, sourceEnd)] as const)
    .filter(([start, end]) => end > start);
  const cuts = [...new Set([sourceStart, sourceEnd, ...intervals.flat()])].sort((a, b) => a - b);
  const segments = cuts.slice(0, -1).map((start, index) => {
    const end = cuts[index + 1];
    return { start, end, flexible: intervals.some(([left, right]) => start >= left && end <= right) };
  });
  const fixedLength = segments.reduce((sum, segment) => sum + (segment.flexible ? 0 : segment.end - segment.start), 0);
  const flexibleLength = sourceLength - fixedLength;
  // Even an unusually narrow input must retain positive, ordered glass areas.
  const profileScale = fixedLength > 0 && flexibleLength > 0
    ? Math.min(requestedProfileScale, Math.max(affineScale, targetLength * 0.65 / fixedLength))
    : affineScale;
  const glassScale = flexibleLength > 0
    ? (targetLength - fixedLength * profileScale) / flexibleLength
    : affineScale;
  let target = targetStart;
  const mapped = segments.map((segment) => {
    const start = target;
    const scale = segment.flexible ? glassScale : profileScale;
    target += (segment.end - segment.start) * scale;
    return { ...segment, target: start, scale };
  });
  const map = (value: number): number => {
    if (value <= sourceStart) return targetStart + (value - sourceStart) * affineScale;
    if (value >= sourceEnd) return targetStart + targetLength + (value - sourceEnd) * affineScale;
    const segment = mapped.find((item) => value <= item.end)!;
    return segment.target + (value - segment.start) * segment.scale;
  };
  return { map, cuts };
}

/**
 * Resize the glass portions of a wide catalog image instead of compressing its
 * entire frame. The existing OX image supplies the visual profile proportions;
 * these are illustration dimensions, never a product or pricing calculation.
 */
export function resolveSlidingGlassDoorLayout({
  dimension,
  asset,
  product,
  glass,
}: {
  dimension: Rect;
  asset: Rect;
  product: Rect;
  glass: readonly Rect[];
}) {
  const sx = product.width / dimension.width;
  const sy = product.height / dimension.height;
  // Fade the correction in as the source becomes compressed, so editing an
  // opening width cannot abruptly switch between two different frame sizes.
  const adaptation = glass.length ? Math.min(1, Math.max(0, (0.85 - sx / sy) / 0.2)) : 0;
  const adapted = adaptation > 0;
  const ordered = [...glass].sort((a, b) => a.x - b.x);
  const first = ordered[0] ?? dimension;
  const gaps = ordered.slice(1).map((rect, index) => rect.x - ordered[index].x - ordered[index].width);
  const typicalGap = median(gaps.length ? gaps : [
    first.x - dimension.x,
    dimension.x + dimension.width - first.x - first.width,
  ]) || dimension.height * 33 / 790;
  // Keep a strip beside each DLO with the frame. Original handles can extend
  // slightly across that edge, so cutting exactly at the glass would warp them.
  const flexibleX: Interval[] = adapted ? ordered.map((rect) => {
    const inset = Math.min(dimension.height * 0.035, rect.width * 0.12);
    return [rect.x + inset, rect.x + rect.width - inset];
  }) : [];
  const top = glass.length ? Math.max(...glass.map((rect) => rect.y)) : dimension.y;
  const bottom = glass.length ? Math.min(...glass.map((rect) => rect.y + rect.height)) : dimension.y + dimension.height;
  const rail = median([
    Math.min(...glass.map((rect) => rect.y)) - dimension.y,
    dimension.y + dimension.height - Math.max(...glass.map((rect) => rect.y + rect.height)),
  ]) || dimension.height * 39 / 790;
  const insetY = Math.min(dimension.height * 0.025, Math.max(0, bottom - top) * 0.1);
  const x = createAxis(dimension.x, dimension.width, product.x, product.width,
    flexibleX, sx + (Math.max(sx, product.height * (33 / 790) / typicalGap) - sx) * adaptation);
  const y = createAxis(dimension.y, dimension.height, product.y, product.height,
    adapted ? [[top + insetY, bottom - insetY]] : [],
    sy + (Math.max(sy, product.height * (39 / 790) / rail) - sy) * adaptation);
  const mapRect = (rect: Rect): Rect => ({
    x: x.map(rect.x),
    y: y.map(rect.y),
    width: x.map(rect.x + rect.width) - x.map(rect.x),
    height: y.map(rect.y + rect.height) - y.map(rect.y),
  });
  const assetCuts = (start: number, length: number, cuts: number[]) =>
    [start, ...cuts.filter((cut) => cut > start && cut < start + length), start + length];
  const xCuts = assetCuts(asset.x, asset.width, adapted ? x.cuts : []);
  const yCuts = assetCuts(asset.y, asset.height, adapted ? y.cuts : []);
  const slices: SlidingGlassDoorSlice[] = xCuts.slice(0, -1).flatMap((left, column) =>
    yCuts.slice(0, -1).map((upper, row) => {
      const source = { x: left, y: upper, width: xCuts[column + 1] - left, height: yCuts[row + 1] - upper };
      return { source, target: mapRect(source) };
    }));
  return { adapted, mapRect, slices };
}
