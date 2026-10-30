export type PivotPoint = Readonly<{ x: number; y: number }>;
export type PivotQuad = Readonly<{ tl: PivotPoint; tr: PivotPoint; br: PivotPoint; bl: PivotPoint }>;

const UNITS_PER_INCH = 10;
const SOURCE_X_SCALE = 600 / 609;
const SOURCE_Y_SCALE = 1000 / 1009;

export function pivotQuadPoint(quad: PivotQuad, u: number, v: number): PivotPoint {
  const top = { x: quad.tl.x + (quad.tr.x - quad.tl.x) * u, y: quad.tl.y + (quad.tr.y - quad.tl.y) * u };
  const bottom = { x: quad.bl.x + (quad.br.x - quad.bl.x) * u, y: quad.bl.y + (quad.br.y - quad.bl.y) * u };
  return { x: top.x + (bottom.x - top.x) * v, y: top.y + (bottom.y - top.y) * v };
}

export function pivotPolygon(points: readonly PivotPoint[]): string {
  return `${points.map(({ x, y }, index) => `${index ? "L" : "M"}${Number(x.toFixed(4))} ${Number(y.toFixed(4))}`).join(" ")}Z`;
}

export function pivotQuadPath(quad: PivotQuad): string {
  return pivotPolygon([quad.tl, quad.tr, quad.br, quad.bl]);
}

/** Approved 60 × 100 artwork, with fixed physical profiles and adjustable rails. */
export function pivotDoorLayout(width: number, height: number) {
  if (![width, height].every(value => Number.isFinite(value) && value > 0)) return null;
  const w = width * UNITS_PER_INCH;
  const h = height * UNITS_PER_INCH;
  if (![w, h].every(Number.isFinite)) return null;
  // Only very small transient inputs compress the profiles so the preview
  // never produces negative glass or hardware dimensions.
  const profileScale = Math.min(1, w / 220, h / 240);
  const sx = SOURCE_X_SCALE * profileScale;
  const sy = SOURCE_Y_SCALE * profileScale;
  const frame = { x: 0, y: 0, width: w, height: h };
  const opening = { x: 30 * sx, y: 29 * sy, width: w - 61 * sx, height: h - 59 * sy };
  const leafLeft = opening.x + 12 * sx;
  const leafWidth = opening.width * (460 / 548);
  const leaf: PivotQuad = {
    tl: { x: leafLeft, y: opening.y + 4 * sy },
    tr: { x: leafLeft + leafWidth, y: opening.y - 36 * sy },
    br: { x: leafLeft + leafWidth, y: h - 30 * sy + 38 * sy },
    bl: { x: leafLeft, y: h - 30 * sy - 4 * sy },
  };
  const glassLeftU = 60 * sx / leafWidth;
  const glassRightU = 1 - 61 * sx / leafWidth;
  const glassCorner = (u: number, top: boolean): PivotPoint => {
    const edge = pivotQuadPoint(leaf, u, top ? 0 : 1);
    const rail = (top ? 60.783 : 61.697) * sy * (1 + 82 * u / 942);
    return { x: edge.x, y: edge.y + (top ? rail : -rail) };
  };
  const glass: PivotQuad = {
    tl: glassCorner(glassLeftU, true), tr: glassCorner(glassRightU, true),
    br: glassCorner(glassRightU, false), bl: glassCorner(glassLeftU, false),
  };
  const handleCenterX = leaf.tr.x - 73.8 * sx;
  const handleU = (handleCenterX - leafLeft) / leafWidth;
  const handleCenter = pivotQuadPoint(leaf, handleU, 0.5);
  const handleHeight = Math.min(516.1 * sy, (glass.bl.y - glass.tl.y) * 0.8);
  const handle = {
    x: handleCenterX - 6.2 * sx,
    y: handleCenter.y + 5.99 * sy - handleHeight / 2,
    width: 12.4 * sx,
    height: handleHeight,
    radius: 6.2 * sx,
  };
  const glassBounds = {
    x: glass.tl.x, y: Math.min(glass.tl.y, glass.tr.y),
    width: glass.tr.x - glass.tl.x,
    height: Math.max(glass.bl.y, glass.br.y) - Math.min(glass.tl.y, glass.tr.y),
  };
  return { frame, opening, leaf, glass, glassBounds, handle, profileScale, sx, sy, unitsPerInch: UNITS_PER_INCH };
}

export type PivotDoorLayout = NonNullable<ReturnType<typeof pivotDoorLayout>>;

/** A fixed sidelite keeps its ordinary profiles even at the catalog's 10-inch width. */
export function pivotFixedLayout(width: number, height: number) {
  if (![width, height].every(value => Number.isFinite(value) && value > 0)) return null;
  const w = width * UNITS_PER_INCH;
  const h = height * UNITS_PER_INCH;
  if (![w, h].every(Number.isFinite)) return null;
  const profileScale = Math.min(1, w / 80, h / 80);
  const sx = SOURCE_X_SCALE * profileScale;
  const sy = SOURCE_Y_SCALE * profileScale;
  const frame = { x: 0, y: 0, width: w, height: h };
  const glass = { x: 30 * sx, y: 29 * sy, width: w - 61 * sx, height: h - 59 * sy };
  return { frame, glass, profileScale, sx, sy, unitsPerInch: UNITS_PER_INCH };
}

/** One shared jamb joins the approved door segment to its fixed sidelite. */
export function pivotSideliteLayout(width: number, height: number, doorWidth: number | undefined, configuration: "XO" | "OX") {
  if (![width, height, doorWidth].every(value => Number.isFinite(value) && Number(value) > 0)
    || doorWidth === undefined || doorWidth >= width) return null;
  const door = pivotDoorLayout(doorWidth, height);
  if (!door) return null;
  const sideliteWidth = width - doorWidth;
  const sideliteUnits = sideliteWidth * door.unitsPerInch;
  const totalWidth = width * door.unitsPerInch;
  if (![sideliteUnits, totalWidth].every(Number.isFinite)) return null;
  const side = configuration === "OX" ? "left" : "right";
  const doorOffset = side === "left" ? sideliteUnits : 0;
  const doorUnits = door.frame.width;
  const outerProfile = Math.min((side === "left" ? 30 : 31) * door.sx, sideliteUnits / 3);
  const glass = {
    x: side === "left" ? outerProfile : doorUnits,
    y: door.opening.y,
    width: sideliteUnits - outerProfile,
    height: door.opening.height,
  };
  const divider = {
    x: side === "left" ? sideliteUnits : doorUnits - 31 * door.sx,
    y: door.opening.y,
    width: (side === "left" ? 30 : 31) * door.sx,
    height: door.opening.height,
  };
  const frame = { x: 0, y: 0, width: totalWidth, height: door.frame.height };
  return {
    frame, door, glass, divider, doorOffset, sideliteWidth, sideliteUnits, side,
    doorPanelIndex: side === "left" ? 2 : 1,
    fixedPanelIndex: side === "left" ? 1 : 2,
    split: side === "left" ? sideliteUnits : doorUnits,
  };
}
