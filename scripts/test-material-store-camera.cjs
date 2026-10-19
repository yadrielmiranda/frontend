/* Offline component behavior: scanning finds a presentation; it never changes stock or counts. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '../src');
const source = fs.readFileSync(path.join(root, 'app/warehouse/stores/material-store-inventory-client.tsx'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
const staff = { id: 10, role: { name: 'admin' } };
const tick = () => new Promise(resolve => setImmediate(resolve));
const tests = [], test = (name, run) => tests.push({ name, run });
const text = el => typeof el === 'string' || typeof el === 'number' ? String(el) : Array.isArray(el) ? el.map(text).join('') : el?.props ? text(el.props.children) : '';
function nodes(el, pred, found = []) { if (Array.isArray(el)) el.forEach(child => nodes(child, pred, found)); else if (el && typeof el === 'object') { if (pred(el)) found.push(el); nodes(el.props?.children, pred, found); } return found; }
const byLabel = (tree, label) => nodes(tree, n => n.props?.['aria-label'] === label)[0];
const button = (tree, label) => nodes(tree, n => n.props?.onClick && text(n) === label)[0];
const scan = tree => nodes(tree, n => n.type === 'MaterialScan')[0];
const products = Array.from({ length: 25 }, (_, index) => ({ id: index + 1, code: `MAT-${String(index + 1).padStart(6, '0')}`, name: `Material ${index + 1}`, isActive: true, version: 3, imageUrl: null, baseUnit: { id: 1, name: 'Tube' }, totalBaseQuantity: index === 24 ? 0 : 12, reservedBaseQuantity: 0, availableBaseQuantity: index === 24 ? 0 : 12, presentations: [
  { id: index * 2 + 1, name: 'Tube', multiplier: 1, isBase: true, isActive: true, barcode: index === 0 ? '035777434642' : `UNIT-${index + 1}`, quantity: 0, reservedQuantity: 0 },
  { id: index * 2 + 2, name: 'Box of 12', multiplier: 12, isBase: false, isActive: true, barcode: `BOX-${index + 1}`, quantity: index === 24 ? 0 : 1, reservedQuantity: 0 },
] }));
const inventory = { store: { id: 1, name: 'Test store', isActive: true }, products };
function harness(options = {}) {
  const states = [], refs = []; let si = 0, ri = 0;
  const calls = [], auth = { user: options.user || staff, revalidate: async () => auth.user };
  const api = { countMaterialStore: async (...args) => { calls.push(args); throw { status: 503, message: 'Uncertain' }; }, materialStoreCountInventory: async () => inventory, ...options.api };
  const hooks = { useState(initial) { const i = si++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], v => { states[i] = typeof v === 'function' ? v(states[i]) : v; }]; }, useRef(initial) { const i = ri++; if (!(i in refs)) refs[i] = { current: initial }; return refs[i]; } };
  const module = { exports: {} };
  function resolve(id) {
    if (id === 'react') return { ...React, ...hooks };
    if (id === 'react/jsx-runtime') return require(id);
    if (id === 'next/link') return { default: 'a', __esModule: true };
    if (id === 'lucide-react' || id.startsWith('@/components/ui/')) return new Proxy({}, { get: (_, name) => name });
    if (id === '@/components/material-product-image') return { MaterialProductImage: 'image' };
    if (id === '@/contexts/AuthContext') return { useAuth: () => auth };
    if (id === '@/app/api/materials.api') return api;
    if (id === '@/app/api/_base') return { isApiError: e => Number.isInteger(e?.status) };
    if (id === '@/app/api/warehouse.api') return { warehouseRequestKey: () => 'test-key' };
    if (id === '../materials/materials-shared') return { MaterialScan: 'MaterialScan', MaterialField: 'MaterialField', MaterialNotice: 'MaterialNotice', errorText: e => e?.message || 'Error', quantity: String };
    throw Error(`Unexpected import: ${id}`);
  }
  new Function('require', 'module', 'exports', compiled)(resolve, module, module.exports);
  const Component = module.exports.MaterialStoreInventoryClient;
  const props = { initial: structuredClone(options.inventory || inventory), initialIdentity: { id: auth.user.id, role: auth.user.role.name } };
  return { calls, auth, render() { si = 0; ri = 0; return Component(props); } };
}
function countOne(h) { byLabel(h.render(), 'Counted Material 1 · Tube').props.onChange({ target: { value: '3' } }); nodes(h.render(), n => n.props?.label === 'Reason for inventory count')[0].props.children.props.onChange({ target: { value: 'Monthly count' } }); }

test('scanning preserves previously entered counts and reason, and writes nothing', async () => {
  const h = harness(); countOne(h);
  await scan(h.render()).props.onScan('BOX-2');
  assert.equal(byLabel(h.render(), 'Search store materials').props.value, 'MAT-000002');
  assert.match(text(h.render()), /Found: Material 2 · Box of 12/);
  assert.equal(h.calls.length, 0);
  byLabel(h.render(), 'Search store materials').props.onChange({ target: { value: '' } });
  assert.equal(byLabel(h.render(), 'Counted Material 1 · Tube').props.value, '3');
  assert.equal(nodes(h.render(), n => n.props?.label === 'Reason for inventory count')[0].props.children.props.value, 'Monthly count');
  assert.doesNotMatch(text(h.render()), /Found:/);
});
test('scan reveals a zero-stock material on another page without filling any counts', async () => {
  const h = harness(); button(h.render(), 'Next').props.onClick();
  const toggle = nodes(h.render(), n => n.type === 'input' && n.props.type === 'checkbox')[0];
  toggle.props.onChange({ target: { checked: false } });
  await scan(h.render()).props.onScan('BOX-25');
  assert.equal(nodes(h.render(), n => n.type === 'input' && n.props.type === 'checkbox')[0].props.checked, true);
  assert.ok(byLabel(h.render(), 'Counted Material 25 · Box of 12'));
  assert.equal(byLabel(h.render(), 'Counted Material 25 · Box of 12').props.value, '');
  assert.equal(h.calls.length, 0);
});
test('unknown or partial codes keep the current filter and counts', async () => {
  const h = harness(); countOne(h);
  byLabel(h.render(), 'Search store materials').props.onChange({ target: { value: 'Material 1' } });
  for (const value of ['BOX', 'missing', '35777434642']) await assert.rejects(scan(h.render()).props.onScan(value), /No material in this store/);
  assert.equal(byLabel(h.render(), 'Search store materials').props.value, 'Material 1');
  assert.equal(byLabel(h.render(), 'Counted Material 1 · Tube').props.value, '3');
});
test('UPC leading zeroes are retained for exact lookup', async () => {
  const h = harness(); await scan(h.render()).props.onScan('035777434642');
  assert.match(text(h.render()), /Found: Material 1 · Tube/); assert.equal(h.calls.length, 0);
});
test('operator can find materials but remains unable to change physical counts', async () => {
  const h = harness({ user: { id: 20, role: { name: 'operator' } } });
  assert.equal(scan(h.render()).props.disabled, false);
  await scan(h.render()).props.onScan('BOX-3');
  assert.equal(byLabel(h.render(), 'Counted Material 3 · Box of 12').props.disabled, true);
  assert.equal(button(h.render(), 'Review count'), undefined); assert.equal(h.calls.length, 0);
});
test('review and pending count retry block scanning', async () => {
  const h = harness(); countOne(h); button(h.render(), 'Review count').props.onClick();
  assert.equal(scan(h.render()).props.disabled, true);
  await assert.rejects(scan(h.render()).props.onScan('BOX-2'), /Finish the current action/);
  button(h.render(), 'Confirm inventory count').props.onClick(); await tick();
  assert.equal(h.calls.length, 1); assert.equal(scan(h.render()).props.disabled, true);
  await assert.rejects(scan(h.render()).props.onScan('BOX-2'), /Finish the current action/);
  assert.equal(h.calls.length, 1);
});
test('discard confirmation and account changes cannot receive scanner results', async () => {
  const h = harness(); countOne(h); button(h.render(), 'Refresh stock').props.onClick();
  assert.equal(scan(h.render()).props.disabled, true);
  await assert.rejects(scan(h.render()).props.onScan('BOX-2'), /Finish the current action/);
  h.auth.user = { id: 99, role: { name: 'admin' } };
  assert.equal(scan(h.render()), undefined);
});
test('finding an inactive item never enables its count fields', async () => {
  const copy = structuredClone(inventory); copy.products[0].isActive = false;
  const h = harness({ inventory: copy }); await scan(h.render()).props.onScan('035777434642');
  assert.equal(byLabel(h.render(), 'Counted Material 1 · Tube').props.disabled, true);
  assert.equal(h.calls.length, 0);
});
(async () => { for (const { name, run } of tests) { await run(); console.log(`PASS ${name}`); } console.log(`${tests.length} material store camera checks passed.`); })().catch(error => { console.error(error); process.exitCode = 1; });
