export type LabelPrintSettings = {
  mode: 'sheet' | 'thermal';
  paper: 'letter' | 'a4';
  widthMm: number;
  heightMm: number;
  copies: number;
  marginMm: number;
  gapMm: number;
};

export type LabelPrintContent = {
  productName: string;
  presentationName: string;
  quantityText: string;
  productCode: string;
  barcode: string;
  barcodeSvg: string;
};

export type LabelLayout = {
  pageWidthMm: number;
  pageHeightMm: number;
  columns: number;
  rows: number;
  labelsPerPage: number;
  pageCount: number;
  error: string | null;
};

export const LABEL_PRINT_STORAGE_KEY = 'material-label-print-settings-v1';

export const DEFAULT_LABEL_PRINT_SETTINGS: LabelPrintSettings = {
  mode: 'sheet',
  paper: 'letter',
  widthMm: 70,
  heightMm: 40,
  copies: 1,
  marginMm: 10,
  gapMm: 3,
};

const inRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

/** Preferences only: a previous print quantity must never create unexpected copies. */
export function normalizeStoredLabelSettings(raw: unknown): LabelPrintSettings {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Partial<LabelPrintSettings>
    : {};
  const settings: LabelPrintSettings = {
    ...DEFAULT_LABEL_PRINT_SETTINGS,
    mode: source.mode === 'thermal' ? 'thermal' : 'sheet',
    paper: source.paper === 'a4' ? 'a4' : 'letter',
    widthMm: inRange(source.widthMm, 30, 200) ? source.widthMm : 70,
    heightMm: inRange(source.heightMm, 20, 200) ? source.heightMm : 40,
    marginMm: inRange(source.marginMm, 0, 25) ? source.marginMm : 10,
    gapMm: inRange(source.gapMm, 0, 10) ? source.gapMm : 3,
    copies: 1,
  };
  if (getLabelLayout(settings).error) {
    settings.widthMm = DEFAULT_LABEL_PRINT_SETTINGS.widthMm;
    settings.heightMm = DEFAULT_LABEL_PRINT_SETTINGS.heightMm;
  }
  return settings;
}

export function getLabelLayout(settings: LabelPrintSettings): LabelLayout {
  const sheetWidth = settings.paper === 'a4' ? 210 : 215.9;
  const sheetHeight = settings.paper === 'a4' ? 297 : 279.4;
  const pageWidthMm = settings.mode === 'thermal' ? settings.widthMm : sheetWidth;
  const pageHeightMm = settings.mode === 'thermal' ? settings.heightMm : sheetHeight;
  const empty = { pageWidthMm, pageHeightMm, columns: 0, rows: 0, labelsPerPage: 0, pageCount: 0 };
  if (settings.mode !== 'sheet' && settings.mode !== 'thermal') {
    return { ...empty, error: 'Choose a print format.' };
  }
  if (settings.paper !== 'letter' && settings.paper !== 'a4') {
    return { ...empty, error: 'Choose Letter or A4 paper.' };
  }
  if (!inRange(settings.widthMm, 30, 200) || !inRange(settings.heightMm, 20, 200)) {
    return { ...empty, error: 'Label width must be 30–200 mm and height must be 20–200 mm.' };
  }
  if (!inRange(settings.copies, 1, 200) || !Number.isInteger(settings.copies)) {
    return { ...empty, error: 'Enter a whole number of labels from 1 to 200.' };
  }
  if (settings.mode === 'thermal') {
    return { pageWidthMm, pageHeightMm, columns: 1, rows: 1, labelsPerPage: 1, pageCount: settings.copies, error: null };
  }
  if (!inRange(settings.marginMm, 0, 25) || !inRange(settings.gapMm, 0, 10)) {
    return { ...empty, error: 'Page margins must be 0–25 mm and spacing must be 0–10 mm.' };
  }
  // The tiny tolerance compensates for binary rounding at an exact physical fit.
  const columns = Math.floor((sheetWidth - settings.marginMm * 2 + settings.gapMm + 1e-8) / (settings.widthMm + settings.gapMm));
  const rows = Math.floor((sheetHeight - settings.marginMm * 2 + settings.gapMm + 1e-8) / (settings.heightMm + settings.gapMm));
  if (columns < 1 || rows < 1) {
    return { ...empty, error: 'This label does not fit the selected paper. Reduce its size or the page margins.' };
  }
  const labelsPerPage = columns * rows;
  return { pageWidthMm, pageHeightMm, columns, rows, labelsPerPage, pageCount: Math.ceil(settings.copies / labelsPerPage), error: null };
}

const escapeHtml = (value: string) => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character] ?? character));

/** Shared by the modal preview and print document, with physical label dimensions. */
export const MATERIAL_LABEL_CSS = `
.material-label { box-sizing:border-box; width:var(--label-width); height:var(--label-height); padding:2mm; display:flex; flex-direction:column; overflow:hidden; background:#fff; color:#111; font-family:Arial,Helvetica,sans-serif; text-align:left; }
.material-label * { box-sizing:border-box; }
.material-label__header { flex:none; display:flex; align-items:flex-start; gap:2mm; min-width:0; }
.material-label__name { min-width:0; flex:1; font-size:10pt; font-weight:700; line-height:1.15; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow-wrap:anywhere; }
.material-label__sku { flex:0 1 28%; min-width:0; padding-top:.3mm; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; text-align:right; font-size:6pt; line-height:1.2; color:#444; }
.material-label__details { flex:none; min-width:0; margin-top:.6mm; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:7.5pt; line-height:1.2; }
.material-label__barcode { display:flex; align-items:center; justify-content:center; flex:1; min-height:0; margin:1.2mm 0 .5mm; }
.material-label__barcode img { display:block; width:100%; height:100%; max-height:18mm; object-fit:fill; }
.material-label__value { flex:none; width:100%; overflow-wrap:anywhere; text-align:center; font-family:Arial,Helvetica,sans-serif; font-size:8pt; font-weight:500; line-height:1.05; letter-spacing:.15mm; }
.material-label--compact .material-label__name { font-size:7pt; -webkit-line-clamp:1; }
.material-label--compact .material-label__sku { padding-top:0; font-size:5pt; }
.material-label--compact .material-label__details { margin-top:.3mm; font-size:6pt; line-height:1.1; }
.material-label--compact .material-label__barcode { margin:.6mm 0 .3mm; }
.material-label--compact .material-label__barcode img { max-height:11mm; }
.material-label--compact .material-label__value { font-size:6pt; line-height:1; letter-spacing:0; }
`;

export function buildMaterialLabelMarkup(content: LabelPrintContent, settings: LabelPrintSettings): string {
  const layout = getLabelLayout(settings);
  if (layout.error) throw new Error(layout.error);
  // SVG stays in an image context; neither generated SVG nor user text becomes HTML.
  const barcodeSource = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content.barcodeSvg)}`;
  const compact = settings.heightMm < 30 ? ' material-label--compact' : '';
  const details = [content.presentationName, content.quantityText].filter(Boolean).join(' · ');
  return `<article class="material-label${compact}" style="--label-width:${settings.widthMm}mm;--label-height:${settings.heightMm}mm" aria-label="${escapeHtml(content.productName)}">
  <div class="material-label__header"><div class="material-label__name">${escapeHtml(content.productName)}</div>${content.productCode ? `<div class="material-label__sku">${escapeHtml(content.productCode)}</div>` : ''}</div>
  <div class="material-label__details">${escapeHtml(details)}</div>
  <div class="material-label__barcode"><img src="${escapeHtml(barcodeSource)}" alt="Barcode ${escapeHtml(content.barcode)}" /></div>
  <div class="material-label__value">${escapeHtml(content.barcode)}</div>
</article>`;
}

export function buildLabelPrintHtml(content: LabelPrintContent, settings: LabelPrintSettings): string {
  const layout = getLabelLayout(settings);
  if (layout.error) throw new Error(layout.error);
  const label = buildMaterialLabelMarkup(content, settings);
  const pages = Array.from({ length: layout.pageCount }, (_, index) => {
    const count = Math.min(layout.labelsPerPage, settings.copies - index * layout.labelsPerPage);
    return `<section class="material-label-page" aria-label="Page ${index + 1}">${label.repeat(count)}</section>`;
  }).join('\n');
  const format = settings.mode === 'thermal' ? 'Label printer' : settings.paper === 'a4' ? 'A4 sheet' : 'Letter sheet';
  const summary = `${settings.copies} ${settings.copies === 1 ? 'label' : 'labels'} · ${settings.widthMm} × ${settings.heightMm} mm · ${format}`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Material labels — ${escapeHtml(content.productName)}</title>
<style>
${MATERIAL_LABEL_CSS}
* { box-sizing:border-box; }
body { margin:0; background:#edf1f5; color:#152033; font-family:Arial,Helvetica,sans-serif; }
.material-print-toolbar { position:sticky; top:0; z-index:1; display:flex; justify-content:space-between; align-items:center; gap:24px; padding:18px 28px; background:#fff; border-bottom:1px solid #dbe2ea; }
.material-print-toolbar h1 { margin:0 0 5px; font-size:18px; }
.material-print-toolbar p { margin:0; font-size:13px; color:#526177; line-height:1.5; }
.material-print-toolbar button { border:0; border-radius:8px; padding:12px 20px; background:#14223b; color:white; font-size:14px; font-weight:600; cursor:pointer; white-space:nowrap; }
.material-print-toolbar button:focus-visible { outline:3px solid #7cacf7; outline-offset:3px; }
.material-label-page { width:${layout.pageWidthMm}mm; height:${layout.pageHeightMm}mm; margin:24px auto; padding:${settings.mode === 'thermal' ? 0 : settings.marginMm}mm; display:grid; grid-template-columns:repeat(${layout.columns}, ${settings.widthMm}mm); grid-template-rows:repeat(${layout.rows}, ${settings.heightMm}mm); gap:${settings.mode === 'thermal' ? 0 : settings.gapMm}mm; align-content:start; justify-content:start; background:#fff; box-shadow:0 3px 16px #1520331a; }
.material-label-page .material-label { ${settings.mode === 'sheet' ? 'outline:.15mm solid #e5e7eb; outline-offset:-.15mm;' : ''} }
@page { size:${layout.pageWidthMm}mm ${layout.pageHeightMm}mm; margin:0; }
@media print {
  html,body { margin:0!important; padding:0!important; background:#fff; }
  .material-print-toolbar { display:none!important; }
  .material-label-page { margin:0; box-shadow:none; break-inside:avoid; page-break-inside:avoid; break-after:page; page-break-after:always; }
  .material-label-page:last-child { break-after:auto; page-break-after:auto; }
}
</style></head><body>
<header class="material-print-toolbar"><div><h1>Ready to print</h1><p>${escapeHtml(summary)}</p><p>Use 100% scale and turn off headers and footers.${settings.mode === 'thermal' ? ' Match the printer paper size to your label dimensions.' : ''}</p></div><button type="button" data-print-action>Print labels</button></header>
<main class="material-print-pages">${pages}</main>
</body></html>`;
}
