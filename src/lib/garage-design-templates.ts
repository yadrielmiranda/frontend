export type GarageDesignMaterial = "slat" | "glass";

export interface GarageDesignTemplate {
  version: 1;
  columns: number[];
  rows: number[];
  cells: GarageDesignMaterial[][];
}

export const DEFAULT_GARAGE_SLAT_COLOR = "#A1612F";
const MAX_DIVISIONS = 12;

function proportions(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.length <= MAX_DIVISIONS
    && Array.from(value).every(part => typeof part === "number" && Number.isFinite(part) && part > 0 && part <= 1)
    && Math.abs(value.reduce((sum, part) => sum + part, 0) - 1) <= 1e-6;
}

/** Accept bounded database geometry only; SVG, markup, URLs and extra properties are rejected. */
export function validateGarageDesignTemplate(value: unknown): GarageDesignTemplate | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).some(key => !["version", "columns", "rows", "cells"].includes(key))) return null;
  if (candidate.version !== 1 || !proportions(candidate.columns) || !proportions(candidate.rows)) return null;
  const cells = candidate.cells;
  const columnCount = candidate.columns.length;
  if (!Array.isArray(cells) || cells.length !== candidate.rows.length
    || !Array.from(cells).every(row => Array.isArray(row) && row.length === columnCount
      && Array.from(row).every(cell => cell === "slat" || cell === "glass"))) return null;
  return { version: 1, columns: [...candidate.columns], rows: [...candidate.rows], cells: cells.map(row => [...row]) };
}

/** Null means the template cannot establish whether the design includes glass. */
export function garageDesignHasGlass(value: unknown): boolean | null {
  const template = validateGarageDesignTemplate(value);
  return template ? template.cells.some(row => row.includes("glass")) : null;
}

function safeColor(value?: string | null): string {
  return typeof value === "string" && /^#[\da-f]{6}$/i.test(value) ? value.toUpperCase() : DEFAULT_GARAGE_SLAT_COLOR;
}

function shade(hex: string, amount: number): string {
  const target = amount < 0 ? 0 : 255;
  const blend = Math.abs(amount);
  return `#${[1, 3, 5].map(start => {
    const channel = parseInt(hex.slice(start, start + 2), 16);
    return Math.round(channel + (target - channel) * blend).toString(16).padStart(2, "0");
  }).join("").toUpperCase()}`;
}

function escapeXml(value: string): string {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

const number = (value: number) => String(Number(value.toFixed(4)));

/** Render database geometry. Color changes slats only; glass stays blue. */
export function buildGarageDesignSvg(template: GarageDesignTemplate, hexColor?: string | null, title?: string): string | null {
  const geometry = validateGarageDesignTemplate(template);
  if (!geometry) return null;
  const color = safeColor(hexColor);
  const label = escapeXml((title || "Garage door design").slice(0, 240));
  const sections: string[] = [];
  const gap = 1;
  const availableWidth = 369 - gap * (geometry.columns.length - 1);
  const availableHeight = 274 - gap * (geometry.rows.length - 1);
  let y = 3;
  geometry.rows.forEach((heightRatio, row) => {
    const height = availableHeight * heightRatio;
    let x = 3;
    const cells = geometry.columns.map((widthRatio, column) => {
      const width = availableWidth * widthRatio;
      const material = geometry.cells[row][column];
      const border = material === "glass" ? "#8D9EAF" : shade(color, -0.25);
      const cell = `<rect data-column="${column + 1}" data-material="${material}" x="${number(x)}" y="${number(y)}" width="${number(width)}" height="${number(height)}" fill="url(#${material})" stroke="${border}" stroke-width="0.35"/>`;
      x += width + gap;
      return cell;
    });
    sections.push(`  <g data-row="${row + 1}">${cells.join("")}</g>`);
    y += height + gap;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="375" height="280" viewBox="0 0 375 280" role="img" aria-labelledby="garage-title" data-template-version="1" data-slat-color="${color}">
  <title id="garage-title">${label}</title>
  <defs>
    <linearGradient id="slat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(color, 0.08)}"/><stop offset="1" stop-color="${shade(color, -0.25)}"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D4E9F0"/><stop offset="1" stop-color="#B7D6E1"/></linearGradient>
  </defs>
  <rect x="1.5" y="1.5" width="372" height="277" fill="#ECEEF0" stroke="#B9C0C7"/>
${sections.join("\n")}
</svg>
`;
}
