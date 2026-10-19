/* Focused report regressions. Uses the real description/card with a diagram stub.
 * Run from frontend: node scripts/test-energy-ratings.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '../src');
const cache = new Map();
global.fetch = () => { throw new Error('Network forbidden in energy report tests'); };
function load(relative) {
  const file = path.resolve(root, relative);
  assert.ok(file.startsWith(root + path.sep));
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', source)((id) => {
    if (id === 'react' || id === 'react/jsx-runtime') return require(id);
    if (id === '@/components/piece-diagram') return { PieceDiagram: () => null };
    if (id === 'lucide-react') return new Proxy({}, { get: () => () => null });
    if (id === '@/components/ui/button') return { Button: ({ children }) => React.createElement('button', null, children) };
    if (id === '@/components/ui/input') return { Input: props => React.createElement('input', props) };
    if (id === 'sonner') return { toast: { success() {}, error() {} } };
    if (id === '@/app/api/energy-ratings.api') return { updateEnergyRating() { throw new Error('Unexpected save while rendering'); } };
    if (id === './energy-rating-form') return { EnergyRatingForm: () => null };
    if (id === './inline-piece-mark-input') return { InlinePieceMarkInput: ({ value }) => React.createElement('span', null, value) };
    const target = id.startsWith('@/') ? path.resolve(root, id.slice(2))
      : id.startsWith('.') ? path.resolve(path.dirname(file), id) : null;
    assert.ok(target, `Unexpected dependency ${id}`);
    const resolved = ['.ts', '.tsx'].map(ext => target + ext).find(candidate => fs.existsSync(candidate));
    assert.ok(resolved, `Cannot resolve ${id}`);
    return load(resolved);
  }, module, module.exports);
  return module.exports;
}
const { buildEnergyDescription, mergePieceEnergySnapshots } = load('lib/energy-ratings.ts');
const { PieceReportCard } = load('components/estimates/estimate-details/parts/piece-report-card.tsx');
const snapshot = { schemaVersion: 1, status: 'AVAILABLE', uFactor: '1.062314', shgc: '0.278', vlt: '0.501',
  ratingId: 7 };
const piece = { id: 1, mark: 'W1', width: 35, height: 62, qty: 2, screen: false, prod: { name: 'Single Hung', kind: 'GLAZED_UNIT' },
  syst: { name: '100' }, bran: { name: 'Eco' }, conf: { conf: 'Equal Lites' }, fColor: { color: 'White' },
  cryst: { glass: '7/16 Laminated' }, tin: { color: 'Clear' }, coat: { name: 'LowE SB70' },
  privacyOption: { name: 'Clear' }, energySnapshot: snapshot };
const render = (overrides = {}) => renderToStaticMarkup(React.createElement(PieceReportCard, {
  piece: { ...piece, ...overrides }, displayMark: 'W1', unitPrice: 200, subtotal: 400,
}));
const before = JSON.stringify(piece);
const html = render();
for (const token of ['NFRC: U-factor: 1.062 | SHGC: 0.278 | VLT: 0.501', '$200.00', '$400.00', '7/16 Laminated', 'LowE SB70']) assert.ok(html.includes(token), token);
assert.equal(JSON.stringify(piece), before, 'Rendering must preserve the original snapshot and prices');
assert.ok(!html.includes('Data unavailable'));
assert.equal(render({ energySnapshot: { ...snapshot, units: 'Btu/(h·ft²·°F)' } }), html, 'Legacy units do not alter the visible energy values');
for (const status of ['UNAVAILABLE', 'AMBIGUOUS']) {
  const missing = render({ energySnapshot: { ...snapshot, status } });
  assert.ok(missing.includes('Energy performance: Data unavailable'));
  assert.ok(!missing.includes('U-factor: 1.062'));
}
assert.ok(render({ energySnapshot: null }).includes('Data unavailable'));
assert.ok(render({ energySnapshot: { ...snapshot, vlt: null } }).includes('Data unavailable'));
assert.ok(render({ energySnapshot: { ...snapshot, uFactor: 'NaN' } }).includes('Data unavailable'));
assert.ok(!render({ energySnapshot: { ...snapshot, status: 'NOT_APPLICABLE' } }).includes('Energy performance:'));
assert.ok(!render({ prod: { name: 'Mullion', kind: 'LINEAR_MATERIAL' }, energySnapshot: null }).includes('Data unavailable'));
assert.ok(buildEnergyDescription({ ...snapshot, shgc: '0', vlt: '0' }).includes('SHGC: 0.000 | VLT: 0.000'));
console.log('PASS energy report: compact values, missing and ambiguous matches, linear products and unchanged prices');

const selection = { idBrand: 1, idProd: 2, idSyst: 3, idConf: 4, idCryst: 5, idTint: 6, idCoat: 7, idPrivacy: 8 };
const editPiece = { ...piece, ...selection, price: 123, dealerMarkup: 20, total: 246, subtotal: 246, customerPrice: 123, customerSubtotal: 246, dpPosPsf: 65, dpNegPsf: -75 };
const detailOptions = {
  productsWithBrands: [{ id: 2, name: 'Single Hung', kind: 'GLAZED_UNIT' }], systemsWithConfigs: [], frameColors: [],
  crystals: [], tints: [], coatings: [], privacies: [], muntinPatterns: [], muntinTypes: [],
};
for (const [file, name] of [['pieces-dealer-table.tsx', 'PiecesDealerTable'], ['pieces-client-list.tsx', 'PiecesClientList']]) {
  const Component = load(`components/estimates/${file}`)[name];
  const renderList = overrides => renderToStaticMarkup(React.createElement(Component, {
    fields: [{ id: 'field-1' }], watchedPieces: [{ ...editPiece, ...overrides }],
    ...detailOptions,
    formatCurrency: value => `$${value.toFixed(2)}`, onDuplicate() {}, onEdit() {}, onRemove() {}, onMarkSave: async () => true,
  }));
  const table = renderList({});
  assert.ok(!table.includes('U-factor:'), `${name}: no energy below the piece name in collapsed mobile or desktop rows`);
  assert.ok(table.includes('$123.00'));
  assert.ok(!renderList({ energySnapshot: null }).includes('Data unavailable'), `${name}: no missing-data line below the name`);
}
const { PieceFormDetailsPanel } = load('components/estimates/piece-form-details-panel.tsx');
const renderDetails = (overrides = {}) => renderToStaticMarkup(React.createElement(PieceFormDetailsPanel, {
  ...detailOptions, piece: { ...editPiece, ...overrides },
}));
const details = renderDetails();
assert.equal((details.match(/<strong>NFRC:<\/strong> U-factor: 1\.062 \| SHGC: 0\.278 \| VLT: 0\.501/g) ?? []).length, 1, 'One compact energy line in Product Details');
assert.match(details, /<strong>DP:<\/strong>[\s\S]*?\+65\.0[\s\S]*?75\.0<\/p><p><strong>NFRC:<\/strong> U-factor: 1\.062 \| SHGC: 0\.278 \| VLT: 0\.501<\/p>/, 'Energy appears immediately below DP');
assert.ok(!details.includes('Btu'), 'No unit metadata in Product Details');
assert.ok(renderDetails({ energySnapshot: null }).includes('Data unavailable'));
assert.ok(!renderDetails({ energySnapshot: { ...snapshot, status: 'NOT_APPLICABLE' } }).includes('U-factor:'));
const refreshedSnapshot = { ...snapshot, selection };
const currentPieces = [{ ...editPiece, energySnapshot: null }, { ...editPiece, id: 2 }];
const originalPieces = JSON.stringify(currentPieces);
const merged = mergePieceEnergySnapshots(currentPieces, [{ id: 1, energyRatingId: 7, energySnapshot: refreshedSnapshot }]);
assert.equal(merged[0].energySnapshot, refreshedSnapshot);
assert.equal(merged[0].price, currentPieces[0].price);
assert.equal(merged[0].dealerMarkup, currentPieces[0].dealerMarkup);
assert.equal(merged[0].mark, currentPieces[0].mark);
assert.equal(merged[1], currentPieces[1]);
assert.equal(JSON.stringify(currentPieces), originalPieces);
const editedSelection = [{ ...currentPieces[0], idTint: 99 }];
assert.equal(mergePieceEnergySnapshots(editedSelection, [{ id: 1, energySnapshot: refreshedSnapshot }])[0], editedSelection[0], 'Do not apply a stale response to changed glass selections');
console.log('PASS editor energy values: absent under names, once below DP in Product Details, saved IDs, unchanged selections and prices');

const { EnergyRatingsClient } = load('app/settings/energy-ratings/energy-ratings-client.tsx');
const catalogRow = { id: 7, isActive: true, ...snapshot,
  system: { name: 'Series 1', brand: { name: 'Eco' }, product: { name: 'Single Hung' } },
  crystal: { name: '7/16 Laminated' }, tint: { name: 'Clear' }, coating: { name: 'LowE SB70' }, privacy: { name: 'White' },
  config: { name: 'Equal Lites' }, sourceFile: 'old-source.xlsx', composition: 'Old duplicate composition', notes: 'Old notes' };
for (const canEdit of [true, false]) {
  const renderCatalog = rows => renderToStaticMarkup(React.createElement(EnergyRatingsClient, { initialRatings: rows, options: { systems: [] }, canEdit }));
  const catalog = renderCatalog([catalogRow]);
  const headings = [...catalog.matchAll(/<th\b[^>]*>([^<]+)<\/th>/g)].map(match => match[1]);
  assert.deepEqual(headings, ['System', 'Glass', 'Tint', 'Coating', 'Privacy', 'Configuration', 'U-factor', 'SHGC', 'VLT', 'Status', ...(canEdit ? ['Actions'] : [])]);
  assert.equal((catalog.match(/7\/16 Laminated/g) ?? []).length, 1, 'Glass name appears once');
  for (const hidden of ['old-source.xlsx', 'Old duplicate composition', 'Old notes']) assert.ok(!catalog.includes(hidden));
  assert.ok(renderCatalog([]).includes(`colSpan="${headings.length}"`), 'Empty table spans its visible columns');
}
console.log('PASS energy catalog table: separate options, one glass description and no source metadata');

async function testCatalogForm() {
  let state = [], cursor = 0, calls = [], saved = [];
  const jsx = (type, props) => ({ type, props });
  const component = () => null;
  const formFile = path.join(root, 'app/settings/energy-ratings/energy-rating-form.tsx');
  const formCode = ts.transpileModule(fs.readFileSync(formFile, 'utf8'), {
    fileName: formFile, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const formModule = { exports: {} };
  new Function('require', 'module', 'exports', formCode)((id) => {
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id === 'react') return { useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], update => { state[index] = typeof update === 'function' ? update(state[index]) : update; }];
    } };
    if (id === 'sonner') return { toast: { success() {} } };
    if (id === '@/lib/energy-ratings') return load('lib/energy-ratings.ts');
    if (id === '@/app/api/energy-ratings.api') return {
      createEnergyRating: async data => { calls.push({ method: 'POST', data }); return { ...data, id: 99 }; },
      updateEnergyRating: async (id, data) => { calls.push({ method: 'PATCH', id, data }); return { ...data, id }; },
    };
    if (id === '@/components/ui/button') return { Button: component };
    if (id === '@/components/ui/input') return { Input: component };
    if (id === '@/components/ui/dialog') return new Proxy({}, { get: () => component });
    throw new Error(`Unexpected form import ${id}`);
  }, formModule, formModule.exports);
  const opts = { systems: [1, 2].map(id => ({ id, name: `Series ${id}`, idBrand: id, idProduct: 10,
    brand: { id, name: `Brand ${id}` }, product: { id: 10, name: 'Single Hung' },
    crystals: [{ id: id * 10, name: `Glass ${id}` }], configs: [{ id: id * 20, name: `Config ${id}` }],
    tints: [{ id: 3, name: 'Clear' }], coatings: [{ id: 4, name: 'LowE SB70' }], privacies: [{ id: 5, name: 'White' }],
  })) };
  const renderForm = () => { cursor = 0; return formModule.exports.EnergyRatingForm({ options: opts, onClose() {}, onSaved(row) { saved.push(row); } }); };
  const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : value && typeof value === 'object' ? [value, ...nodes(value.props?.children)] : [];
  const choice = name => nodes(renderForm()).find(node => node.type?.name === 'Choice' && node.props.name === name);
  const metadataFields = ['sourceFile', 'sourceSheet', 'sourceRow', 'sourceVersion', 'sourceGlassId', 'composition', 'notes'];
  assert.ok(!nodes(renderForm()).some(node => metadataFields.includes(node.props?.name)), 'No source metadata fields in the editor');
  choice('idSystem').props.onChange('1');
  assert.deepEqual(choice('idCrystal').props.options, [{ id: 10, name: 'Glass 1' }]);
  for (const [name, value] of Object.entries({ idCrystal: '10', idTint: '3', idCoating: '4', idPrivacy: '5' })) choice(name).props.onChange(value);
  const originalFormData = global.FormData;
  global.FormData = class { constructor(target) { this.values = target.values; } get(name) { return this.values[name] ?? null; } };
  const submit = () => nodes(renderForm()).find(node => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: { values: {
    uFactor: '1.062314', shgc: '0.278', vlt: '0.501', sourceFile: 'ratings.xlsx', sourceRow: '93', composition: '3/16 + PVB + 3/16',
  } } });
  try {
    await submit();
    assert.equal(calls.length, 0, 'All-configurations scope requires explicit confirmation');
    choice('idConfig').props.onChange('20');
    await submit();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'POST');
    assert.deepEqual([calls[0].data.idSystem, calls[0].data.idCrystal, calls[0].data.idTint, calls[0].data.idCoating, calls[0].data.idPrivacy, calls[0].data.idConfig], [1, 10, 3, 4, 5, 20]);
    assert.equal(calls[0].data.appliesToAllConfigs, false);
    assert.equal(calls[0].data.uFactor, '1.062314', 'Keep numeric precision on submission');
    assert.deepEqual(Object.keys(calls[0].data).sort(), ['idSystem', 'idCrystal', 'idTint', 'idCoating', 'idPrivacy', 'idConfig', 'appliesToAllConfigs', 'uFactor', 'shgc', 'vlt', 'isActive'].sort(), 'Save only the combination, values and active status');
    assert.equal(saved[0].id, 99);
    choice('idSystem').props.onChange('2');
    assert.equal(choice('idCrystal').props.value, '', 'Changing series clears its glass choice');
    assert.equal(choice('idConfig').props.value, '', 'Changing series clears its configuration');
    assert.deepEqual(choice('idCrystal').props.options, [{ id: 20, name: 'Glass 2' }]);
  } finally { global.FormData = originalFormData; }
  console.log('PASS energy catalog form: linked option IDs, series filtering, explicit configuration scope, numeric precision and no source metadata');
}
testCatalogForm().catch(error => { console.error(error); process.exitCode = 1; });
