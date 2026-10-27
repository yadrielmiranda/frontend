/* Database geometry, SVG assets and safe previews. No network or database writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sharp = require('sharp');
const project = path.resolve(__dirname, '..');
const sourceRoot = path.join(project, 'src');
const cache = new Map();
global.fetch = () => { throw new Error('Template previews must not fetch remote SVG'); };
function load(relative) {
  const file = path.resolve(sourceRoot, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file, compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  new Function('require', 'module', 'exports', code)((id) => {
    if (['react', 'react/jsx-runtime'].includes(id)) return require(id);
    assert.ok(id.startsWith('@/'), `Unexpected dependency ${id}`);
    const target = path.join(sourceRoot, id.slice(2));
    const resolved = ['.ts', '.tsx'].map(ext => target + ext).find(fs.existsSync);
    assert.ok(resolved, id); return load(path.relative(sourceRoot, resolved));
  }, module, module.exports);
  return module.exports;
}
const renderer = load('lib/garage-design-templates.ts');
const { validateGarageDesignTemplate: validate, buildGarageDesignSvg: build, DEFAULT_GARAGE_SLAT_COLOR } = renderer;
const { GarageDesignPreview } = load('components/estimates/garage-design-preview.tsx');
const imports = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/garage-design-templates.json'), 'utf8'));
const expected = [
  ['SRL36', [.28, .44, .28], ['slat', 'glass', 'slat']],
  ['GRL36', [.28, .44, .28], ['glass', 'slat', 'glass']],
  ['SR36', [.7, .3], ['glass', 'slat']], ['SL36', [.3, .7], ['slat', 'glass']],
  ['GR36', [.7, .3], ['slat', 'glass']], ['GL36', [.3, .7], ['glass', 'slat']],
  ['GT', [1], ['glass']], ['SF', [1], ['slat']],
  ['GS50/50', [.5, .5], ['slat', 'glass']], ['SG50/50', [.5, .5], ['glass', 'slat']],
];
assert.equal(imports.length, expected.length);
for (const [index, entry] of imports.entries()) {
  const [name, columns, firstRow] = expected[index];
  assert.equal(entry.name, name); assert.deepEqual(entry.template.columns, columns);
  assert.deepEqual(entry.template.rows, [.25, .25, .25, .25]);
  assert.deepEqual(entry.template.cells[0], firstRow);
  for (const row of entry.template.cells.slice(1)) assert.deepEqual(row, name === 'GT' ? ['slat'] : firstRow);
  assert.deepEqual(validate(entry.template), entry.template);
  const svg = build(entry.template, undefined, name);
  assert.equal(fs.readFileSync(path.join(project, entry.sourceFile), 'utf8').replace(/\r\n/g, '\n'), svg, `${name} downloadable asset matches database renderer`);
  assert.equal((svg.match(/data-row=/g) ?? []).length, 4);
  assert.equal((svg.match(/data-material=/g) ?? []).length, columns.length * 4, 'One smooth panel per cell; no invented thin slats');
  assert.match(svg, /viewBox="0 0 375 280"/);
  assert.doesNotMatch(svg, /<path|<pattern|<image|<script|foreignObject|onload=|href=/i);
}

const example = imports[0].template;
const invalid = [null, 'SRL36', [], {}, { ...example, version: 2 }, { ...example, columns: [] },
  { ...example, columns: [0, .5, .5] }, { ...example, columns: [-1, 1, 1] },
  { ...example, columns: [.3, .4, .4] }, { ...example, columns: [NaN, .5, .5] },
  { ...example, columns: [Infinity, .5, .5] }, { ...example, columns: [1, ,] },
  { ...example, rows: new Array(4) }, { ...example, cells: new Array(4) },
  { ...example, cells: [['slat', , 'slat'], ...example.cells.slice(1)] },
  { ...example, cells: [['glass'], ...example.cells.slice(1)] },
  { ...example, cells: example.cells.slice(1) }, { ...example, cells: [['<script>', 'glass', 'slat'], ...example.cells.slice(1)] },
  { ...example, markup: '<svg onload="attack()" />' }, { ...example, rows: Array(13).fill(1 / 13), cells: Array(13).fill(['slat', 'glass', 'slat']) },
];
for (const candidate of invalid) { assert.equal(validate(candidate), null); assert.equal(build(candidate), null); }
const copied = validate(example); copied.cells[0][0] = 'glass'; copied.columns[0] = .2;
assert.equal(example.cells[0][0], 'slat'); assert.equal(example.columns[0], .28, 'Validation does not expose mutable source arrays');
const custom = { version: 1, columns: [.2, .3, .5], rows: [.3, .7], cells: [['slat', 'glass', 'slat'], ['glass', 'slat', 'glass']] };
assert.ok(build(custom)); assert.equal((build(custom).match(/data-row=/g) ?? []).length, 2, 'New layouts render directly from data without named templates');
assert.equal(renderer.GARAGE_DESIGN_TEMPLATES, undefined); assert.equal(renderer.garageDesignTemplate, undefined);

const original = build(example);
const recolored = build(example, '#234567');
const glass = value => value.match(/<linearGradient id="glass"[^]*?<\/linearGradient>/)[0];
assert.equal(glass(original), glass(recolored), 'Glass gradient never follows the selected slat color');
assert.match(glass(original), /stop-color="#D4E9F0"/); assert.match(glass(original), /stop-color="#B7D6E1"/);
assert.equal((original.match(/<linearGradient id="slat"[^]*?<\/linearGradient>/)[0].match(/<stop /g) ?? []).length, 2, 'Slats use a continuous vertical gradient with no extra bands');
assert.match(original, new RegExp(`data-slat-color="${DEFAULT_GARAGE_SLAT_COLOR}"`));
assert.match(recolored, /data-slat-color="#234567"/); assert.notEqual(recolored, original);
for (const color of ['red', '#fff', '#123456;fill:url(https://x)', 'url(https://x)', '" onload="attack()', null]) {
  assert.equal(build(example, color), original, 'Invalid color safely uses the default');
}
assert.equal(build(example, '#abcdef'), build(example, '#ABCDEF'));
const escaped = build(example, '#123456', '</title><script>alert("x")</script>\u0000&');
assert.doesNotMatch(escaped, /<script|\u0000/); assert.match(escaped, /&lt;script&gt;/);

const render = props => renderToStaticMarkup(React.createElement(GarageDesignPreview, { name: 'Any catalog name', ...props }));
const dataImage = html => decodeURIComponent(html.match(/src="data:image\/svg\+xml;charset=utf-8,([^"]+)"/)[1]);
const html = render({ template: example, color: '#234567', imageUrl: 'https://example.com/unused.svg' });
assert.equal(dataImage(html), build(example, '#234567', 'Any catalog name'));
assert.doesNotMatch(html, /example.com/);
assert.match(render({ imageUrl: 'https://example.com/custom.svg' }), /src="https:\/\/example.com\/custom.svg"/);
assert.match(render({ imageUrl: '/garage-designs/templates/v1/srl36.svg', color: '#234567' }), /src="\/garage-designs\/templates\/v1\/srl36.svg"/, 'A familiar image URL is not a runtime template lookup');
assert.match(render({ template: { version: 4 }, imageUrl: '/fallback.png' }), /src="\/fallback.png"/);
for (const imageUrl of [null, 'javascript:alert(1)', 'data:image/svg+xml,<svg onload="attack()"/>', '//unknown.test/a.svg']) {
  assert.match(render({ imageUrl }), /No preview/); assert.doesNotMatch(render({ imageUrl }), /<img/);
}

(async () => {
  const before = await sharp(Buffer.from(original)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const after = await sharp(Buffer.from(recolored)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(before.info.width, 375); assert.equal(before.info.height, 280);
  const pixel = (buffer, x, y) => [...buffer.data.subarray((y * buffer.info.width + x) * 4, (y * buffer.info.width + x) * 4 + 4)];
  assert.deepEqual(pixel(before, 180, 30), pixel(after, 180, 30), 'Rendered glass pixels are unchanged');
  assert.notDeepEqual(pixel(before, 45, 30), pixel(after, 45, 30), 'Rendered slat pixels update automatically');
  assert.deepEqual(pixel(before, 1, 140), pixel(after, 1, 140), 'Frame remains neutral');
  console.log('PASS garage SVG: 10 exact layouts/assets, generic database geometry, strict validation, safe previews and verified slat-only recoloring');
})().catch(error => { console.error(error); process.exitCode = 1; });
