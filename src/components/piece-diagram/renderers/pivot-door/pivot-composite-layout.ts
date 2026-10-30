import { matchMuntinPanels, type ResolvedMuntin } from "../muntin-layer";
import { pivotDoorLayout } from "./pivot-door-layout";

export type PivotCompositeConfiguration = "OXO" | "O/O-O/X" | "O/X-O/O" | "O/O-O/X-O/O";
export type PivotCompositePane = {
  panelIndex: number;
  panelCode: "O" | "X";
  panelLabel: string;
  row: "top" | "bottom";
  column: "left" | "center" | "right";
  rect: { x: number; y: number; width: number; height: number };
  opening: { x: number; y: number; width: number; height: number };
};

export function pivotCompositeLayout(configuration: PivotCompositeConfiguration, width: number, height: number, doorWidth?: number, doorHeight?: number) {
  if (!["OXO", "O/O-O/X", "O/X-O/O", "O/O-O/X-O/O"].includes(configuration)) return null;
  const hasTransom = configuration !== "OXO";
  const codes: ("O" | "X")[] = configuration === "O/O-O/X" ? ["O", "X"]
    : configuration === "O/X-O/O" ? ["X", "O"] : ["O", "X", "O"];
  if (![width, height, doorWidth].every(value => Number.isFinite(value) && Number(value) > 0)
    || doorWidth === undefined || doorWidth >= width
    || (hasTransom && (!Number.isFinite(doorHeight) || !doorHeight || doorHeight <= 0 || doorHeight >= height))) return null;
  const door = pivotDoorLayout(doorWidth, hasTransom ? doorHeight! : height);
  if (!door) return null;
  const units = door.unitsPerInch;
  const sideCount = codes.length - 1;
  const sideliteWidth = (width - doorWidth) / sideCount;
  const sideUnits = sideliteWidth * units;
  const transomHeight = hasTransom ? height - doorHeight! : 0;
  const transomUnits = transomHeight * units;
  const frame = { x: 0, y: 0, width: width * units, height: height * units };
  if (![sideUnits, transomUnits, frame.width, frame.height].every(Number.isFinite)) return null;
  let offset = 0;
  const columns = codes.map((code, index) => {
    const column = index === 0 ? "left" : index === codes.length - 1 ? "right" : "center";
    const columnWidth = code === "X" ? door.frame.width : sideUnits;
    const start = offset;
    offset += columnWidth;
    const left = code === "X" ? start + door.opening.x : index === 0 ? Math.min(30 * door.sx, sideUnits / 3) : start;
    const right = code === "X" ? start + door.opening.x + door.opening.width : index === codes.length - 1 ? frame.width - Math.min(31 * door.sx, sideUnits / 3) : offset;
    return { code, column: column as PivotCompositePane["column"], x: start, width: columnWidth, left, right };
  });
  const doorColumn = columns.find(column => column.code === "X")!;
  const panes: PivotCompositePane[] = [];
  const header = Math.min(door.opening.y, transomUnits / 3);
  if (hasTransom) columns.forEach((column, index) => {
    const rect = { x: column.left, y: header, width: column.right - column.left, height: transomUnits - header };
    panes.push({ panelIndex: index + 1, panelCode: "O", panelLabel: `Top ${column.column[0].toUpperCase()}${column.column.slice(1)}`, row: "top", column: column.column, rect, opening: rect });
  });
  columns.forEach((column, index) => {
    const opening = { x: column.left, y: transomUnits + door.opening.y, width: column.right - column.left, height: door.opening.height };
    const rect = column.code === "X" ? { ...door.glassBounds, x: door.glassBounds.x + column.x, y: door.glassBounds.y + transomUnits } : opening;
    const position = `${column.column[0].toUpperCase()}${column.column.slice(1)}`;
    panes.push({ panelIndex: (hasTransom ? columns.length : 0) + index + 1, panelCode: column.code, panelLabel: hasTransom ? `Bottom ${position}` : position, row: "bottom", column: column.column, rect, opening });
  });
  const verticalDividers = columns.slice(0, -1).map((column, index) => ({
    x: column.right, y: hasTransom ? header : door.opening.y,
    width: columns[index + 1].left - column.right,
    height: frame.height - 30 * door.sy - (hasTransom ? header : door.opening.y),
  }));
  const horizontalDivider = hasTransom ? {
    x: columns[0].left, y: transomUnits,
    width: columns[columns.length - 1].right - columns[0].left, height: door.opening.y,
  } : null;
  return { configuration, frame, door, columns, panes, verticalDividers, horizontalDivider, hasTransom, transomHeight, transomUnits, sideliteWidth, sideCount, doorOffset: doorColumn.x, doorWidth, doorHeight: hasTransom ? doorHeight! : height };
}

export type PivotCompositeLayout = NonNullable<ReturnType<typeof pivotCompositeLayout>>;

/** Manual catalog indices do not establish the order of repeated compound O lights. */
export function matchPivotCompositeMuntin(muntin: ResolvedMuntin | null | undefined, layout: PivotCompositeLayout) {
  if (!muntin || muntin.panels.length !== layout.panes.length || !["flat", "ogee"].includes(muntin.profile)) return [];
  if (!layout.hasTransom) return matchMuntinPanels(muntin, layout.panes);
  const result: { panel: ResolvedMuntin["panels"][number]; glass: PivotCompositePane }[] = [];
  const used = new Set<number>();
  const indices = new Set<number>();
  for (const panel of muntin.panels) {
    if (!Number.isSafeInteger(panel.panelIndex) || panel.panelIndex < 1 || indices.has(panel.panelIndex)) return [];
    indices.add(panel.panelIndex);
    const rawCode = (panel.panelCode ?? "").replace(/([a-z])([A-Z])/g, "$1 $2").toUpperCase().replace(/[_-]/g, " ");
    const label = `${panel.panelLabel.replace(/([a-z])([A-Z])/g, "$1 $2")} ${rawCode}`.toUpperCase().replace(/[_-]/g, " ");
    const rows = ([['top', /\b(TOP|UPPER|SUPERIOR|T)\b/], ['bottom', /\b(BOTTOM|LOWER|INFERIOR|B)\b/]] as const).filter(([, pattern]) => pattern.test(label)).map(([name]) => name);
    const columns = ([['left', /\b(LEFT|IZQUIERD[OA]|L)\b/], ['center', /\b(CENTER|CENTRE|MIDDLE|CENTRAL|C)\b/], ['right', /\b(RIGHT|DERECH[OA]|R)\b/]] as const).filter(([, pattern]) => pattern.test(label)).map(([name]) => name);
    if (rows.length > 1 || columns.length > 1) return [];
    // Catalog codes may be arbitrary (for example A1). Only literal operating
    // codes constrain the role; explicit position labels remain authoritative.
    let code: string | undefined = rawCode.trim() === "X" || rawCode.trim() === "O" ? rawCode.trim() : undefined;
    if (!code && /\b(DOOR|ACTIVE|OPERABLE|PUERTA)\b/.test(label)) code = "X";
    if (!code && /\b(FIXED|FIX|FIJO|FIJA)\b/.test(label)) code = "O";
    const candidates = layout.panes.filter(pane => (!rows.length || pane.row === rows[0])
      && (!columns.length || pane.column === columns[0]) && (!code || pane.panelCode === code));
    if (candidates.length !== 1 || used.has(candidates[0].panelIndex)) return [];
    used.add(candidates[0].panelIndex);
    result.push({ panel, glass: candidates[0] });
  }
  return result;
}
