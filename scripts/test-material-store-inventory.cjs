/* Offline regressions: no API, database, server or stock writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '../src');
const file = 'app/warehouse/stores/material-store-inventory-client.tsx';
const tests = [], test = (name, run) => tests.push({ name, run });
let key = 0;
const staff = { id: 10, role: { name: 'admin' } };
const identity = { id: 10, role: 'admin' };
function loader(hooks, api = {}, auth = { user: staff, revalidate: async () => staff }) {
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const module = { exports: {} };
    function resolve(id) {
      if (id === 'react') return { ...React, ...hooks };
      if (id === 'react/jsx-runtime') return require(id);
      if (id === 'next/link') return { default: 'a', __esModule: true };
      if (id === 'lucide-react') return new Proxy({}, { get: (_, name) => name });
      if (id === '@/contexts/AuthContext') return { useAuth: () => auth };
      if (id === '@/app/api/materials.api') return api;
      if (id === '@/app/api/warehouse.api') return { warehouseRequestKey: () => `count-${++key}` };
      if (id === '@/app/api/_base' || id === './_base') return { isApiError: error => Number.isInteger(error?.status), apiFetch: api.apiFetch };
      if (id === '@/lib/material-image-upload') return { prepareMaterialImage: async value => value };
      if (id === '@/components/material-product-image') return { MaterialProductImage: 'image' };
      if (id.startsWith('@/components/ui/')) return new Proxy({}, { get: (_, name) => name });
      const base = id.startsWith('@/') ? path.resolve(root, id.slice(2)) : id.startsWith('.') ? path.resolve(path.dirname(filename), id) : null;
      if (!base) return require(id);
      const found = ['.ts', '.tsx'].map(ext => base + ext).find(p => fs.existsSync(p));
      if (!found) throw Error(`Unresolved ${id}`);
      return load(path.relative(root, found));
    }
    new Function('require', 'module', 'exports', compiled)(resolve, module, module.exports);
    cache.set(filename, module.exports); return module.exports;
  }
  return load;
}
function controlled(props, api = {}, auth = { user: staff, revalidate: async () => staff }) {
  const states = [], refs = []; let si = 0, ri = 0;
  const hooks = {
    useState(initial) { const i = si++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef(initial) { const i = ri++; if (!(i in refs)) refs[i] = { current: initial }; return refs[i]; },
  };
  const component = loader(hooks, api, auth)(file).MaterialStoreInventoryClient;
  return { auth, render() { si = 0; ri = 0; return component(props); } };
}
function nodes(element, predicate, results = []) {
  if (Array.isArray(element)) { element.forEach(child => nodes(child, predicate, results)); return results; }
  if (!element || typeof element !== 'object') return results;
  if (predicate(element)) results.push(element);
  nodes(element.props?.children, predicate, results); return results;
}
const text = element => typeof element === 'string' || typeof element === 'number' ? String(element) : Array.isArray(element) ? element.map(text).join('') : element?.props ? text(element.props.children) : '';
const byLabel = (tree, label) => nodes(tree, n => n.props?.['aria-label'] === label)[0];
const button = (tree, label) => nodes(tree, n => n.props?.onClick && text(n) === label)[0];
const click = (h, label) => { const b = button(h.render(), label); assert.ok(b, `Missing button: ${label}`); assert.ok(!b.props.disabled, `Disabled button: ${label}`); return b.props.onClick(); };
const tick = () => new Promise(resolve => setImmediate(resolve));
const products = Array.from({ length: 25 }, (_, index) => ({ id: index + 1, code: `MAT-${index + 1}`, name: `Caulking ${index + 1}`, isActive: true, version: 3, imageUrl: null, baseUnit: { id: 1, name: 'Tube' }, totalBaseQuantity: 120, reservedBaseQuantity: 12, availableBaseQuantity: 108, presentations: [
  { id: index * 2 + 1, name: 'Tube', multiplier: 1, isBase: true, isActive: true, barcode: null, quantity: 0, reservedQuantity: 0 },
  { id: index * 2 + 2, name: 'Box (12 Tube)', multiplier: 12, isBase: false, isActive: true, barcode: `BOX-${index}`, quantity: 10, reservedQuantity: 1 },
] }));
const inventory = { store: { id: 1, name: 'Main store', isActive: true }, products };
const result = { storeId: 1, storeName: 'Main store', countedProducts: 1, countedPresentations: 2, adjustedProducts: 1, movementIds: [7], countedAt: '2026-10-12T12:00:00Z', replayed: false };
const defaults = () => ({ initial: structuredClone(inventory), initialIdentity: identity });
function enter(h, productId, presentation, value) { const field = byLabel(h.render(), `Counted Caulking ${productId} · ${presentation}`); assert.ok(field); field.props.onChange({ target: { value } }); }
function reason(h) { nodes(h.render(), n => n.props?.label === 'Reason for inventory count')[0].props.children.props.onChange({ target: { value: 'Monthly count' } }); }
const build = loader()(file).buildMaterialStoreCount;

test('blank fields are never submitted, but explicit zero is a physical count', () => {
  const count = build(inventory, { '1:1': '', '1:2': '0', '2:3': '  ' });
  assert.equal(count.countedPresentations, 1);
  assert.deepEqual(count.products, [{ productId: 1, version: 3, counts: [{ presentationId: 2, quantity: 0 }] }]);
  assert.equal(count.changes[0].deltaBaseUnits, -120);
});
test('closed boxes and loose units keep physical quantities separate, even without total difference', () => {
  const count = build(inventory, { '1:1': '12', '1:2': '9' });
  assert.equal(count.changes.length, 2);
  assert.equal(count.changes[0].before, 0); // Never use 108 available units as loose stock.
  assert.equal(count.changes[1].before, 10);
  assert.equal(count.changes.reduce((sum, change) => sum + change.deltaBaseUnits, 0), 0);
});
test('negative, fractional, exponential and over-limit quantities are rejected', () => {
  for (const value of ['-1', '2.5', '1e2', '1000001', 'NaN']) assert.throws(() => build(inventory, { '1:1': value }), /whole number/);
});
test('inactive products and presentations remain read-only and cannot enter payload', () => {
  const copy = structuredClone(inventory); copy.products[0].isActive = false; copy.products[1].presentations[1].isActive = false;
  assert.equal(build(copy, { '1:1': '10', '2:4': '10' }).countedPresentations, 0);
  const h = controlled({ ...defaults(), initial: copy });
  assert.equal(byLabel(h.render(), 'Counted Caulking 1 · Tube').props.disabled, true);
  assert.equal(byLabel(h.render(), 'Counted Caulking 2 · Box (12 Tube)').props.disabled, true);
});
test('one atomic request contains entries from hidden pages and filters with product versions', async () => {
  const calls = []; const h = controlled(defaults(), { countMaterialStore: async (...args) => { calls.push(args); return result; }, materialStoreCountInventory: async () => inventory });
  enter(h, 1, 'Tube', '8'); enter(h, 1, 'Box (12 Tube)', '9'); click(h, 'Next'); enter(h, 25, 'Tube', '4');
  byLabel(h.render(), 'Search store materials').props.onChange({ target: { value: 'Caulking 3' } });
  reason(h); click(h, 'Review count');
  assert.match(text(h.render()), /3 counted presentations/);
  click(h, 'Confirm inventory count'); await tick();
  assert.equal(calls.length, 1); assert.equal(calls[0][0], 1);
  assert.deepEqual(calls[0][1].products, [{ productId: 1, version: 3, counts: [{ presentationId: 1, quantity: 8 }, { presentationId: 2, quantity: 9 }] }, { productId: 25, version: 3, counts: [{ presentationId: 49, quantity: 4 }] }]);
  assert.equal(calls[0][1].note, 'Monthly count');
});
test('inventory opens blank, includes zero-stock products and explains reserved physical materials', () => {
  const copy = structuredClone(inventory); copy.products[0].totalBaseQuantity = 0;
  const h = controlled({ ...defaults(), initial: copy }); const tree = h.render();
  assert.equal(byLabel(tree, 'Counted Caulking 1 · Tube').props.value, '');
  assert.match(text(tree), /Include reserved materials that are still physically in the store/);
  assert.match(text(tree), /Loose units only/); assert.match(text(tree), /Closed packages · 12 Tube each/);
  assert.equal(button(tree, 'Review count').props.disabled, true);
});
test('reason and review are required before confirmation', async () => {
  let calls = 0; const h = controlled(defaults(), { countMaterialStore: async () => { calls++; return result; } });
  enter(h, 1, 'Tube', '4'); assert.equal(button(h.render(), 'Review count').props.disabled, true);
  reason(h); button(h.render(), 'Confirm inventory count').props.onClick(); await tick(); assert.equal(calls, 0);
});
test('unknown save freezes exact count and request key for retry', async () => {
  const calls = []; const h = controlled(defaults(), { countMaterialStore: async (...args) => { calls.push(structuredClone(args)); if (calls.length === 1) throw Error('Network unavailable'); return { ...result, replayed: true }; }, materialStoreCountInventory: async () => inventory });
  enter(h, 1, 'Tube', '4'); reason(h); click(h, 'Review count'); click(h, 'Confirm inventory count'); await tick();
  assert.equal(byLabel(h.render(), 'Counted Caulking 1 · Tube').props.disabled, true);
  assert.equal(button(h.render(), 'Refresh stock').props.disabled, true);
  enter(h, 1, 'Tube', '100'); // Guard even if stale DOM dispatches a disabled input handler.
  click(h, 'Retry same count'); await tick(); assert.equal(calls.length, 2); assert.deepEqual(calls[0], calls[1]);
  assert.equal(byLabel(h.render(), 'Counted Caulking 1 · Tube').props.value, '');
});
test('known save followed by refresh failure cannot resend the count', async () => {
  let writes = 0, reads = 0;
  const h = controlled(defaults(), { countMaterialStore: async () => { writes++; return result; }, materialStoreCountInventory: async () => { reads++; if (reads === 1) throw Error('Read unavailable'); return inventory; } });
  enter(h, 1, 'Tube', '4'); reason(h); click(h, 'Review count'); click(h, 'Confirm inventory count'); await tick();
  assert.equal(writes, 1); assert.ok(nodes(h.render(), n => n.props?.error === 'Your inventory count was saved. Refresh stock before starting another count.').length);
  assert.equal(byLabel(h.render(), 'Counted Caulking 1 · Tube').props.disabled, true);
  assert.equal(button(h.render(), 'Retry same count'), undefined);
  click(h, 'Refresh stock'); await tick(); assert.equal(writes, 1); assert.equal(reads, 2);
  assert.equal(byLabel(h.render(), 'Counted Caulking 1 · Tube').props.disabled, false);
});
test('a changed account blocks writes and hides the prior inventory', async () => {
  let writes = 0; const auth = { user: staff, revalidate: async () => ({ ...staff, id: 11 }) };
  const h = controlled(defaults(), { countMaterialStore: async () => { writes++; return result; } }, auth);
  enter(h, 1, 'Tube', '4'); reason(h); click(h, 'Review count'); click(h, 'Confirm inventory count'); await tick(); assert.equal(writes, 0);
  auth.user = { ...staff, id: 11 }; assert.doesNotMatch(text(h.render()), /Caulking/); assert.match(text(h.render()), /Verify your account/);
});
test('role changes block writes, including during an uncertain retry', async () => {
  let writes = 0, account = staff; const auth = { user: staff, revalidate: async () => account };
  const h = controlled(defaults(), { countMaterialStore: async () => { writes++; throw Error('Network unavailable'); } }, auth);
  enter(h, 1, 'Tube', '4'); reason(h); click(h, 'Review count'); click(h, 'Confirm inventory count'); await tick();
  account = { ...staff, role: { name: 'operator' } }; click(h, 'Retry same count'); await tick(); assert.equal(writes, 1);
});
test('operators and inactive stores have read-only inventory', () => {
  for (const inactive of [false, true]) {
    const copy = structuredClone(inventory); const account = { id: 10, role: { name: inactive ? 'admin' : 'operator' } }; copy.store.isActive = !inactive;
    const h = controlled({ initial: copy, initialIdentity: { id: 10, role: account.role.name } }, {}, { user: account, revalidate: async () => account });
    assert.equal(byLabel(h.render(), 'Counted Caulking 1 · Tube').props.disabled, true);
    assert.equal(button(h.render(), 'Review count'), undefined);
    assert.match(text(h.render()), /read-only/);
  }
});
test('refresh requires explicit discard and does not erase entries if the read fails', async () => {
  let reads = 0; const h = controlled(defaults(), { materialStoreCountInventory: async () => { reads++; if (reads === 1) throw Error('Read unavailable'); return inventory; } });
  enter(h, 1, 'Tube', '4'); reason(h); click(h, 'Refresh stock'); assert.equal(reads, 0);
  click(h, 'Keep counting'); assert.equal(byLabel(h.render(), 'Counted Caulking 1 · Tube').props.value, '4');
  click(h, 'Refresh stock'); click(h, 'Discard counts and refresh'); await tick(); assert.equal(byLabel(h.render(), 'Counted Caulking 1 · Tube').props.value, '4');
  click(h, 'Refresh stock'); click(h, 'Discard counts and refresh'); await tick(); assert.equal(byLabel(h.render(), 'Counted Caulking 1 · Tube').props.value, '');
});
test('version conflict keeps the count available for review without uncertain retries', async () => {
  const h = controlled(defaults(), { countMaterialStore: async () => { throw Object.assign(Error('Stock changed. Refresh inventory.'), { status: 409 }); } });
  enter(h, 1, 'Tube', '4'); reason(h); click(h, 'Review count'); click(h, 'Confirm inventory count'); await tick();
  assert.equal(byLabel(h.render(), 'Counted Caulking 1 · Tube').props.value, '4'); assert.equal(button(h.render(), 'Retry same count'), undefined);
});
test('definitive conflict on an uncertain retry unlocks refresh instead of trapping the count', async () => {
  let writes = 0; const h = controlled(defaults(), { countMaterialStore: async () => { writes++; if (writes === 1) throw Error('Network unavailable'); throw Object.assign(Error('Stock changed. Refresh inventory.'), { status: 409 }); } });
  enter(h, 1, 'Tube', '4'); reason(h); click(h, 'Review count'); click(h, 'Confirm inventory count'); await tick();
  click(h, 'Retry same count'); await tick(); assert.equal(button(h.render(), 'Retry same count'), undefined);
  assert.equal(button(h.render(), 'Refresh stock').props.disabled, false); assert.equal(byLabel(h.render(), 'Counted Caulking 1 · Tube').props.value, '4');
});
test('a matching count is still submitted and recorded', async () => {
  let writes = 0; const h = controlled(defaults(), { countMaterialStore: async () => { writes++; return { ...result, adjustedProducts: 0 }; }, materialStoreCountInventory: async () => inventory });
  enter(h, 1, 'Tube', '0'); enter(h, 1, 'Box (12 Tube)', '10'); reason(h); click(h, 'Review count');
  assert.match(text(h.render()), /completed count will still be recorded/); click(h, 'Confirm inventory count'); await tick(); assert.equal(writes, 1);
});
test('typed client APIs use store-scoped endpoints and one count payload', async () => {
  const calls = [], api = loader(undefined, { apiFetch: async (...args) => { calls.push(args); return {}; } })('app/api/materials.api.ts');
  await api.materialStoreCountInventory(3); await api.countMaterialStore(3, { requestKey: 'abc', note: 'Count', products: [] });
  assert.equal(calls[0][0], '/api/materials/stores/3/inventory'); assert.equal(calls[0][1].cache, 'no-store');
  assert.equal(calls[1][0], '/api/materials/stores/3/count'); assert.equal(calls[1][1].method, 'POST');
});
test('inventory history shows box and loose before/after values even when total quantity is unchanged', () => {
  const { MaterialCountChanges } = loader()('app/warehouse/materials/material-count-changes.tsx');
  const tree = MaterialCountChanges({ movement: { kind: 'COUNT_ADJUSTMENT', deltaBaseUnits: 0, details: { changes: [
    { presentationId: 2, before: 10, after: 9 },
    { presentationId: 1, before: 0, after: 12 },
  ] } }, presentations: products[0].presentations });
  assert.equal(tree.props['aria-label'], 'Inventory count changes');
  assert.match(text(tree), /Box \(12 Tube\) \(closed\): 10 → 9/);
  assert.match(text(tree), /Tube \(loose\): 0 → 12/);
});
test('inventory history tolerates historical movements without count details and unknown presentations', () => {
  const { MaterialCountChanges } = loader()('app/warehouse/materials/material-count-changes.tsx');
  assert.equal(MaterialCountChanges({ movement: { kind: 'COUNT_ADJUSTMENT', details: null }, presentations: [] }), null);
  const tree = MaterialCountChanges({ movement: { kind: 'COUNT_ADJUSTMENT', details: { changes: [{ presentationId: 99, before: 4, after: 2 }, { presentationId: 1, before: 'bad', after: 3 }] } }, presentations: [] });
  assert.equal(text(tree), 'Presentation #99: 4 → 2');
});

(async () => { for (const { name, run } of tests) { await run(); console.log(`PASS ${name}`); } console.log(`${tests.length} material store inventory checks passed.`); })().catch(error => { console.error(error); process.exitCode = 1; });
