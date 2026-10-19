// Read-only physical stock summaries: node --test scripts/test-material-stock-summary.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/app/warehouse/materials/material-stock-summary.tsx');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename,
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const component = {};
new Function('require', 'exports', compiled)(name => {
  if (name === './materials-shared') return { quantity: value => Number(value).toLocaleString('en-US') };
  if (name === 'react' || name === 'react/jsx-runtime' || name === 'lucide-react') return require(name);
  throw new Error(`Unexpected summary dependency: ${name}`);
}, component);
const { summarizeMaterialStock, MaterialStockSummary } = component;

const piece = { id: 1, name: 'Piece', isActive: true };
const boxUnit = { id: 2, name: 'Box', isActive: true };
const bagUnit = { id: 3, name: 'Bag', isActive: true };
const presentation = (id, name, unit, multiplier, isBase = false) => ({
  id, productId: 1, name, unitId: unit.id, unit, multiplier, isBase,
  isPurchase: !isBase, isActive: true, isSaleEnabled: false, barcode: null,
  salePrice: null, version: 0,
});
const base = presentation(1, 'Piece', piece, 1, true);
const box = presentation(2, 'Box of 1,000', boxUnit, 1000);
const bag = presentation(3, 'Bag of 100', bagUnit, 100);
const row = (id, quantity, availableQuantity = quantity, reservedQuantity = 0) => ({ id, quantity, availableQuantity, reservedQuantity });
const store = (id, totalBaseQuantity, presentations, reservedBaseQuantity = 0) => ({
  store: { id, name: `Store ${id}`, isActive: true }, totalBaseQuantity,
  reservedBaseQuantity, availableBaseQuantity: totalBaseQuantity - reservedBaseQuantity, presentations,
});
function product(overrides = {}) {
  return {
    id: 1, code: 'MAT-000001', name: 'Concrete screws', description: null,
    imageUrl: null, brand: null, categoryId: null, category: null,
    baseUnitId: piece.id, baseUnit: piece, isActive: true, isSaleEnabled: false,
    version: 0, presentations: [base, box, bag],
    inventoryByStore: [store(1, 2100, [row(1, 0, 2100), row(2, 2), row(3, 1)]),
      store(2, 1100, [row(1, 0, 1100), row(2, 1), row(3, 1)])],
    ...overrides,
  };
}
const counts = summary => summary.presentations.map(({ id, quantity }) => [id, quantity]);
const render = item => renderToStaticMarkup(React.createElement(MaterialStockSummary, { product: item }));

test('Aggregates actual boxes and bags across stores without counting closed contents as loose stock', () => {
  const summary = summarizeMaterialStock(product());
  assert.deepEqual(counts(summary), [[2, 3], [3, 2]]);
  assert.equal(summary.totalBaseQuantity, 3200);
  assert.equal(summary.reservedBaseQuantity, 0);
  assert.equal(summary.availableBaseQuantity, 3200);
});

test('Keeps physical loose pieces separate and after package presentations', () => {
  const item = product({ inventoryByStore: [store(1, 3225, [row(1, 25, 3225), row(2, 3), row(3, 2)])] });
  const summary = summarizeMaterialStock(item);
  assert.deepEqual(counts(summary), [[2, 3], [3, 2], [1, 25]]);
  assert.equal(summary.totalBaseQuantity, 3225);
  assert.equal(summary.presentations.at(-1).isBase, true);
});

test('Reservations affect secondary availability, never the physically present package count', () => {
  const item = product({ inventoryByStore: [store(1, 3200, [row(1, 0, 2000, 200), row(2, 3, 2, 1), row(3, 2)], 1200)] });
  const summary = summarizeMaterialStock(item);
  assert.deepEqual(counts(summary), [[2, 3], [3, 2]]);
  assert.equal(summary.presentations.find(p => p.id === 2).reservedQuantity, 1);
  assert.equal(summary.totalBaseQuantity, 3200);
  assert.equal(summary.reservedBaseQuantity, 1200);
  assert.equal(summary.availableBaseQuantity, 2000);
});

test('Different box sizes and even identical custom names remain separate by presentation ID', () => {
  const smallBox = presentation(4, 'Box of 100', boxUnit, 100);
  const duplicateName = presentation(5, 'Box of 100', boxUnit, 100);
  const item = product({ presentations: [base, box, smallBox, duplicateName],
    inventoryByStore: [store(1, 1500, [row(1, 0, 1500), row(2, 1), row(4, 2), row(5, 3)])] });
  const summary = summarizeMaterialStock(item);
  assert.deepEqual(counts(summary), [[2, 1], [4, 2], [5, 3]]);
  assert.deepEqual(summary.presentations.map(p => p.name), ['Box of 1,000', 'Box of 100', 'Box of 100']);
  assert.equal(summary.totalBaseQuantity, 1500);
});

test('Existing stock remains visible even when its store or presentation is inactive', () => {
  const inactiveStore = store(1, 2000, [row(1, 0, 2000), row(2, 2)]);
  inactiveStore.store.isActive = false;
  const summary = summarizeMaterialStock(product({ presentations: [base, { ...box, isActive: false }], inventoryByStore: [inactiveStore] }));
  assert.deepEqual(counts(summary), [[2, 2]]);
  assert.equal(summary.presentations[0].isActive, false);
  assert.equal(summary.totalBaseQuantity, 2000);
});

test('Zero-stock presentations are omitted and a material with no stores has zero totals', () => {
  for (const item of [product({ inventoryByStore: [] }), product({ inventoryByStore: [store(1, 0, [row(1, 0), row(2, 0), row(3, 0)])] })]) {
    const summary = summarizeMaterialStock(item);
    assert.deepEqual(summary.presentations, []);
    assert.equal(summary.totalBaseQuantity, 0);
    assert.equal(summary.reservedBaseQuantity, 0);
    assert.equal(summary.availableBaseQuantity, 0);
  }
});

test('Summarizing frozen input leaves the inventory and presentation order unchanged', () => {
  const item = product();
  const before = JSON.stringify(item);
  const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
  assert.doesNotThrow(() => summarizeMaterialStock(freeze(item)));
  assert.equal(JSON.stringify(item), before);
});

test('Cards show physical presentation names before secondary base totals', () => {
  const html = render(product());
  assert.match(html, /On hand by presentation/);
  assert.match(html, /Box of 1,000/);
  assert.match(html, /Bag of 100/);
  assert.match(html, /3,200/);
  assert.ok(html.indexOf('Box of 1,000') < html.indexOf('3,200'));
  assert.match(html, /Reserved/);
  assert.match(html, /Available/);
});

test('Base Box and Pack materials are shown as their actual units, never as loose pieces', () => {
  for (const unit of [boxUnit, { id: 4, name: 'Pack', isActive: true }]) {
    const p = presentation(1, unit.name, unit, 1, true);
    const item = product({ baseUnitId: unit.id, baseUnit: unit, presentations: [p], inventoryByStore: [store(1, 6, [row(1, 6)])] });
    assert.deepEqual(counts(summarizeMaterialStock(item)), [[1, 6]]);
    const html = render(item);
    assert.match(html, new RegExp(unit.name));
    assert.doesNotMatch(html, /\bloose\b|\bpieces\b/i);
  }
});

test('Presentation labels render as escaped text rather than markup', () => {
  const name = 'Box <script>alert("stock")</script> & 100 pieces';
  const item = product({ presentations: [base, { ...box, name }], inventoryByStore: [store(1, 1000, [row(1, 0, 1000), row(2, 1)])] });
  const html = render(item);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&amp;/);
});
