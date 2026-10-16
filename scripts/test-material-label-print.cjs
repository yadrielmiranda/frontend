// Run: node --test scripts/test-material-label-print.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/lib/material-label-print.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const exported = {};
new Function('exports', compiled)(exported);
const { DEFAULT_LABEL_PRINT_SETTINGS, normalizeStoredLabelSettings, getLabelLayout,
  buildMaterialLabelMarkup, buildLabelPrintHtml } = exported;
const settings = overrides => ({ ...DEFAULT_LABEL_PRINT_SETTINGS, ...overrides });
const content = {
  productName: 'Stainless steel screws', presentationName: 'Box', quantityText: '50 units',
  productCode: 'SC-50', barcode: '1234567890128',
  barcodeSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 60"><rect x="10" width="2" height="60"/></svg>',
};
const pageLabels = html => [...html.matchAll(/<section class="material-label-page"[^>]*>([\s\S]*?)<\/section>/g)]
  .map(match => (match[1].match(/<article class="material-label/g) || []).length);

test('Letter sheets paginate all copies into physical 70 × 40 mm cells', () => {
  const layout = getLabelLayout(settings({ copies: 25 }));
  assert.deepEqual(layout, { pageWidthMm: 215.9, pageHeightMm: 279.4, columns: 2, rows: 6,
    labelsPerPage: 12, pageCount: 3, error: null });
  assert.deepEqual(pageLabels(buildLabelPrintHtml(content, settings({ copies: 25 }))), [12, 12, 1]);
});

test('A4 honors its larger height and has no extra page on an exact full sheet', () => {
  const value = settings({ paper: 'a4', widthMm: 60, copies: 18 });
  assert.deepEqual(getLabelLayout(value), { pageWidthMm: 210, pageHeightMm: 297, columns: 3, rows: 6,
    labelsPerPage: 18, pageCount: 1, error: null });
  assert.deepEqual(pageLabels(buildLabelPrintHtml(content, value)), [18]);
});

test('Label printer emits one physical page per label and ignores sheet spacing', () => {
  const value = settings({ mode: 'thermal', widthMm: 70, heightMm: 30, copies: 3, marginMm: 25, gapMm: 10 });
  assert.deepEqual(getLabelLayout(value), { pageWidthMm: 70, pageHeightMm: 30, columns: 1, rows: 1,
    labelsPerPage: 1, pageCount: 3, error: null });
  const html = buildLabelPrintHtml(content, value);
  assert.deepEqual(pageLabels(html), [1, 1, 1]);
  assert.match(html, /@page \{ size:70mm 30mm; margin:0; \}/);
  assert.match(html, /padding:0mm; display:grid/);
  assert.match(html, /gap:0mm; align-content:start/);
});

test('Full sheet limit supports 200 labels without losing final partial page', () => {
  const html = buildLabelPrintHtml(content, settings({ copies: 200 }));
  const counts = pageLabels(html);
  assert.equal(counts.length, 17);
  assert.equal(counts.at(-1), 8);
  assert.equal(counts.reduce((sum, count) => sum + count, 0), 200);
});

test('Switching to label printer does not retain validation errors from hidden sheet spacing', () => {
  const value = settings({ mode: 'thermal', marginMm: NaN, gapMm: NaN });
  assert.equal(getLabelLayout(value).error, null);
  const html = buildLabelPrintHtml(content, value);
  assert.doesNotMatch(html, /NaN/);
  assert.deepEqual(pageLabels(html), [1]);
});

test('Exact physical fit does not lose a row or column to floating point rounding', () => {
  const value = settings({ widthMm: 65.3, heightMm: 84.46666666666667, gapMm: 0, copies: 9 });
  assert.equal(getLabelLayout(value).columns, 3);
  assert.equal(getLabelLayout(value).rows, 3);
  const a4 = getLabelLayout(settings({ paper: 'a4', widthMm: 190, heightMm: 200 }));
  assert.equal(a4.columns, 1);
  assert.equal(a4.error, null);
});

test('Oversized sheet labels are rejected instead of being shrunk silently', () => {
  const value = settings({ paper: 'a4', widthMm: 200 });
  assert.match(getLabelLayout(value).error, /does not fit/);
  assert.throws(() => buildLabelPrintHtml(content, value), /does not fit/);
});

test('Invalid dimensions, copy counts, gaps, and margins cannot reach the print document', () => {
  for (const override of [
    { widthMm: NaN }, { widthMm: Infinity }, { widthMm: 29 }, { widthMm: 201 },
    { heightMm: 19 }, { heightMm: 201 }, { copies: 0 }, { copies: 201 }, { copies: 1.5 },
    { copies: NaN }, { marginMm: -1 }, { marginMm: 26 }, { gapMm: -1 }, { gapMm: 11 },
    { mode: 'pdf' }, { paper: 'a3' }, { widthMm: '70' },
  ]) {
    const value = settings(override);
    assert.ok(getLabelLayout(value).error, JSON.stringify(override));
    assert.throws(() => buildLabelPrintHtml(content, value));
  }
});

test('Stored preferences retain valid dimensions, but always reset print quantity', () => {
  assert.deepEqual(normalizeStoredLabelSettings({ mode: 'thermal', paper: 'a4', widthMm: 50,
    heightMm: 25, marginMm: 4, gapMm: 1, copies: 199, untrusted: '<script>' }), {
    mode: 'thermal', paper: 'a4', widthMm: 50, heightMm: 25, marginMm: 4, gapMm: 1, copies: 1,
  });
});

test('Corrupt preferences recover safely, including dimensions that no longer fit', () => {
  for (const raw of [null, undefined, [], 'bad json', 4]) {
    assert.deepEqual(normalizeStoredLabelSettings(raw), DEFAULT_LABEL_PRINT_SETTINGS);
  }
  const recovered = normalizeStoredLabelSettings({ mode: 'sheet', paper: 'a4', widthMm: 200,
    heightMm: 200, marginMm: 25, gapMm: NaN, copies: Infinity });
  assert.equal(recovered.widthMm, 70);
  assert.equal(recovered.heightMm, 40);
  assert.equal(recovered.copies, 1);
  assert.equal(getLabelLayout(recovered).error, null);
});

test('Customer-provided label text is escaped in the title, body, and attributes', () => {
  const unsafe = '\"><img src=x onerror="alert(1)"><script>oops</script>&';
  const html = buildLabelPrintHtml({ ...content, productName: unsafe, presentationName: unsafe,
    quantityText: unsafe, productCode: unsafe, barcode: unsafe }, settings({}));
  assert.doesNotMatch(html, /<script>|<img src=x|aria-label=""><img/);
  assert.match(html, /&quot;&gt;&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
});

test('Barcode SVG is kept in an encoded image context and never inserted as raw markup', () => {
  const svg = '<svg onload="alert(1)"><foreignObject><div>Unsafe</div></foreignObject></svg>';
  const html = buildMaterialLabelMarkup({ ...content, barcodeSvg: svg }, settings({}));
  assert.doesNotMatch(html, /<svg|<foreignObject|<div>Unsafe/);
  assert.match(html, /data:image\/svg\+xml;charset=utf-8,%3Csvg/);
  assert.equal((html.match(/<img /g) || []).length, 1);
});

test('Print preview and paper use the same label markup and preserve barcode characters', () => {
  const value = settings({ mode: 'thermal', widthMm: 50.5, heightMm: 25.4 });
  const markup = buildMaterialLabelMarkup(content, value);
  const html = buildLabelPrintHtml(content, value);
  assert.match(markup, /material-label--compact/);
  assert.match(markup, /--label-width:50.5mm;--label-height:25.4mm/);
  assert.match(markup, /1234567890128<\/div>/);
  assert.ok(html.includes(markup));
  assert.match(html, /data-print-action/);
  assert.doesNotMatch(html, /<script|onclick=/);
  assert.match(html, /\.material-label-page:last-child \{ break-after:auto; page-break-after:auto;/);
});
