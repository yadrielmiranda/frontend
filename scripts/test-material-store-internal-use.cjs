/* Offline regressions: no API, database, server or stock writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '../src');
const file = 'app/warehouse/stores/store-material-internal-use-client.tsx';
const tests = [], test = (name, run) => tests.push({ name, run });
let key = 0;
const storage = new Map();
global.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
global.window = { addEventListener() {}, removeEventListener() {} };
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
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
      if (id === '@/app/api/technician-warehouse.api' || id === '@/app/api/technician.api') return api;
      if (id === '@/contexts/AuthContext') return { useAuth: () => auth };
      if (id === '@/app/api/materials.api') return api;
      if (id === '@/app/api/warehouse.api') return { warehouseRequestKey: () => `issue-${++key}` };
      if (id === '@/app/api/_base' || id === './_base') return { isApiError: error => Number.isInteger(error?.status), apiFetch: api.apiFetch };
      if (id === '@/lib/material-image-upload') return { prepareMaterialImage: async value => value };
      if (id === '@/components/material-product-image') return { MaterialProductImage: 'image' };
      if (id === './material-barcode-camera') return { MaterialBarcodeCamera: 'MaterialBarcodeCamera' };
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
  const states = [], refs = []; let si = 0, ri = 0, ei = 0, mounted = false, initialEffect;
  const hooks = {
    useEffect(callback) { if (ei++ === 0 && !mounted) initialEffect = callback; },
    useState(initial) { const i = si++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef(initial) { const i = ri++; if (!(i in refs)) refs[i] = { current: initial }; return refs[i]; },
  };
  const component = loader(hooks, api, auth)(file).StoreMaterialInternalUseClient;
  return { auth, render() { si = 0; ri = 0; ei = 0; const tree = component(props); if (!mounted) { mounted = true; initialEffect(); return this.render(); } return tree; } };
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
  { id: index * 2 + 1, name: 'Tube', multiplier: 1, isBase: true, isActive: true, barcode: null, quantity: 0, reservedQuantity: 0, availableQuantity: 108 },
  { id: index * 2 + 2, name: 'Box (12 Tube)', multiplier: 12, isBase: false, isActive: true, barcode: `BOX-${index}`, quantity: 10, reservedQuantity: 1, availableQuantity: 9 },
] }));
const inventory = { store: { id: 1, name: 'Main store', isActive: true }, products };
const result = { storeId: 1, storeName: 'Main store', recipient: 'Alex', note: 'Smith installation', productCount: 1, lineCount: 1, movementIds: [7], issuedAt: '2026-10-12T12:00:00Z', replayed: false };
const defaults = () => ({ initial: structuredClone(inventory), initialIdentity: identity });
function enter(h, productId, presentation, value) { const field = byLabel(h.render(), `Withdraw Caulking ${productId} · ${presentation}`); assert.ok(field); field.props.onChange({ target: { value } }); }
function details(h) { for (const [label, value] of [['Received by', 'Alex'], ['Reason / job', 'Smith installation']]) nodes(h.render(), n => n.props?.label === label)[0].props.children.props.onChange({ target: { value } }); }
const build = loader()(file).buildMaterialStoreWithdrawal;

test('units can be withdrawn from unopened boxes; quantities are deductions, not remaining counts', () => {
  const selection = build(inventory, { '1:1': '4', '1:2': '2', '2:3': '' });
  assert.deepEqual(selection.lines, [{ productId: 1, presentationId: 1, quantity: 4 }, { productId: 1, presentationId: 2, quantity: 2 }]);
  assert.equal(selection.productCount, 1); assert.equal(selection.selected[0].baseUnits, 4);
  assert.equal(products[0].presentations[0].quantity, 0);
});

test('reservations and shared stock prevent jointly over-withdrawing boxes and tubes', () => {
  assert.throws(() => build(inventory, { '1:2': '10' }), /Only 9/);
  assert.throws(() => build(inventory, { '1:1': '109' }), /Only 108/);
  assert.throws(() => build(inventory, { '1:1': '1', '1:2': '9' }), /exceed its 108/);
  assert.equal(build(inventory, { '1:1': '12', '1:2': '8' }).lines.length, 2);
});

test('zero, negative, fractional, exponential and oversized withdrawals are rejected', () => {
  for (const value of ['0', '-1', '1.5', '1e2', '1000001']) assert.throws(() => build(inventory, { '1:1': value }), /whole number/);
});

test('all selected products survive pagination and barcode search in one atomic submission', async () => {
  const calls = []; const h = controlled(defaults(), { useMaterialStoreInternally: async (...args) => { calls.push(args); return { ...result, productCount: 2, lineCount: 3 }; }, materialStoreCountInventory: async () => inventory });
  enter(h, 1, 'Tube', '4'); enter(h, 1, 'Box (12 Tube)', '2'); details(h);
  click(h, 'Next'); enter(h, 25, 'Tube', '3');
  byLabel(h.render(), 'Search store materials').props.onChange({ target: { value: 'BOX-3' } });
  assert.match(text(h.render()), /Caulking 4/);
  click(h, 'Review withdrawal'); assert.match(text(h.render()), /Caulking 25/); assert.match(text(h.render()), /Received by: Alex/);
  click(h, 'Confirm withdrawal'); await tick();
  assert.equal(calls.length, 1); assert.equal(calls[0][0], 1);
  assert.deepEqual(calls[0][1].lines, [{ productId: 1, presentationId: 1, quantity: 4 }, { productId: 1, presentationId: 2, quantity: 2 }, { productId: 25, presentationId: 49, quantity: 3 }]);
  assert.equal(calls[0][1].recipient, 'Alex'); assert.equal(calls[0][1].note, 'Smith installation');
});

test('recipient, reason and explicit review are required', async () => {
  let writes = 0; const h = controlled(defaults(), { useMaterialStoreInternally: async () => { writes++; return result; } });
  enter(h, 1, 'Tube', '3'); assert.equal(button(h.render(), 'Review withdrawal').props.disabled, true);
  details(h); button(h.render(), 'Confirm withdrawal').props.onClick(); await tick(); assert.equal(writes, 0);
});

test('review removes a hidden selected line and allows editing before any stock mutation', async () => {
  let writes = 0; const h = controlled(defaults(), { useMaterialStoreInternally: async () => { writes++; return result; } });
  enter(h, 1, 'Tube', '3'); enter(h, 2, 'Tube', '5'); details(h);
  click(h, 'Next'); click(h, 'Review withdrawal');
  byLabel(h.render(), 'Remove Caulking 1 · Tube').props.onClick();
  assert.equal(byLabel(h.render(), 'Remove Caulking 1 · Tube'), undefined);
  click(h, 'Back to materials'); click(h, 'Previous'); assert.equal(byLabel(h.render(), 'Withdraw Caulking 1 · Tube').props.value, '');
  enter(h, 2, 'Tube', '6'); assert.equal(writes, 0);
});

test('admin and operator can withdraw; inactive stores and products cannot', () => {
  const account = { ...staff, role: { name: 'operator' } };
  const h = controlled({ ...defaults(), initialIdentity: { id: account.id, role: 'operator' } }, {}, { user: account, revalidate: async () => account });
  enter(h, 1, 'Tube', '3'); details(h); assert.equal(button(h.render(), 'Review withdrawal').props.disabled, false);
  const copy = structuredClone(inventory); copy.store.isActive = false;
  const inactive = controlled({ ...defaults(), initial: copy }); assert.equal(button(inactive.render(), 'Review withdrawal'), undefined);
  assert.equal(byLabel(inactive.render(), 'Withdraw Caulking 1 · Tube').props.disabled, true);
  copy.store.isActive = true; copy.products[0].isActive = false; assert.throws(() => build(copy, { '1:1': '3' }), /inactive/);
});

test('unknown POST freezes exact quantities, recipient, reason and request key for same retry', async () => {
  const calls = []; const h = controlled(defaults(), { useMaterialStoreInternally: async (...args) => { calls.push(structuredClone(args)); if (calls.length === 1) throw Error('Network unavailable'); return { ...result, replayed: true }; }, materialStoreCountInventory: async () => inventory });
  enter(h, 1, 'Tube', '4'); details(h); click(h, 'Review withdrawal'); click(h, 'Confirm withdrawal'); await tick();
  assert.equal(byLabel(h.render(), 'Withdraw Caulking 1 · Tube').props.disabled, true); assert.equal(button(h.render(), 'Refresh stock').props.disabled, true);
  enter(h, 1, 'Tube', '100'); nodes(h.render(), n => n.props?.label === 'Received by')[0].props.children.props.onChange({ target: { value: 'Someone else' } });
  click(h, 'Retry same withdrawal'); await tick(); assert.equal(calls.length, 2); assert.deepEqual(calls[0], calls[1]);
});

test('double confirmation does not duplicate stock deductions', async () => {
  let writes = 0, finish; const h = controlled(defaults(), { useMaterialStoreInternally: async () => { writes++; return new Promise(resolve => { finish = resolve; }); }, materialStoreCountInventory: async () => inventory });
  enter(h, 1, 'Tube', '4'); details(h); click(h, 'Review withdrawal');
  const confirm = button(h.render(), 'Confirm withdrawal').props.onClick; confirm(); confirm(); await tick(); assert.equal(writes, 1);
  finish(result); await tick(); assert.equal(writes, 1);
});

test('saved withdrawal followed by failed refresh is never posted again', async () => {
  let writes = 0, reads = 0;
  const h = controlled(defaults(), { useMaterialStoreInternally: async () => { writes++; return result; }, materialStoreCountInventory: async () => { reads++; if (reads === 1) throw Error('Read unavailable'); return inventory; } });
  enter(h, 1, 'Tube', '4'); details(h); click(h, 'Review withdrawal'); click(h, 'Confirm withdrawal'); await tick();
  assert.equal(writes, 1); assert.equal(button(h.render(), 'Retry same withdrawal'), undefined);
  assert.ok(nodes(h.render(), n => n.props?.error === 'Your withdrawal was saved. Refresh stock before starting another withdrawal.').length);
  assert.ok(nodes(h.render(), n => n.props?.success?.includes('given to Alex from Main store')).length);
  assert.equal(byLabel(h.render(), 'Withdraw Caulking 1 · Tube').props.disabled, true);
  click(h, 'Refresh stock'); await tick(); assert.equal(writes, 1); assert.equal(byLabel(h.render(), 'Withdraw Caulking 1 · Tube').props.disabled, false);
});

test('account or role changes block confirmation and uncertain retries', async () => {
  for (const roleChange of [false, true]) {
    let writes = 0, account = staff; const auth = { user: staff, revalidate: async () => account };
    const h = controlled(defaults(), { useMaterialStoreInternally: async () => { writes++; throw Error('Network unavailable'); } }, auth);
    enter(h, 1, 'Tube', '4'); details(h); click(h, 'Review withdrawal'); click(h, 'Confirm withdrawal'); await tick();
    account = roleChange ? { ...staff, role: { name: 'operator' } } : { ...staff, id: 11 };
    click(h, 'Retry same withdrawal'); await tick(); assert.equal(writes, 1);
    auth.user = account; assert.match(text(h.render()), /Verify your account/); assert.doesNotMatch(text(h.render()), /Caulking/);
  }
});

test('account change during stock read hides stale account data and prevents reuse', async () => {
  const auth = { user: staff, revalidate: async () => auth.user }; let writes = 0;
  const h = controlled(defaults(), { useMaterialStoreInternally: async () => { writes++; return result; }, materialStoreCountInventory: async () => { auth.user = { ...staff, id: 11 }; return inventory; } }, auth);
  enter(h, 1, 'Tube', '4'); details(h); click(h, 'Review withdrawal'); click(h, 'Confirm withdrawal'); await tick();
  assert.equal(writes, 1); assert.match(text(h.render()), /Verify your account/); assert.doesNotMatch(text(h.render()), /Caulking/);
});

test('known reservation conflict keeps selection editable and permits a fresh stock read', async () => {
  let writes = 0; const h = controlled(defaults(), { useMaterialStoreInternally: async () => { writes++; if (writes === 1) throw Error('Network unavailable'); throw Object.assign(Error('Not enough available stock'), { status: 409 }); }, materialStoreCountInventory: async () => inventory });
  enter(h, 1, 'Tube', '4'); details(h); click(h, 'Review withdrawal'); click(h, 'Confirm withdrawal'); await tick();
  click(h, 'Retry same withdrawal'); await tick(); assert.equal(button(h.render(), 'Retry same withdrawal'), undefined);
  assert.equal(byLabel(h.render(), 'Withdraw Caulking 1 · Tube').props.value, '4'); assert.equal(byLabel(h.render(), 'Withdraw Caulking 1 · Tube').props.disabled, false);
  click(h, 'Refresh stock'); click(h, 'Discard selection and refresh'); await tick(); assert.equal(writes, 2);
  assert.equal(byLabel(h.render(), 'Withdraw Caulking 1 · Tube').props.value, '');
});

test('failed refresh preserves quantities and technician details', async () => {
  const h = controlled(defaults(), { materialStoreCountInventory: async () => { throw Error('Read unavailable'); } });
  enter(h, 1, 'Tube', '4'); details(h); click(h, 'Refresh stock'); click(h, 'Discard selection and refresh'); await tick();
  assert.equal(byLabel(h.render(), 'Withdraw Caulking 1 · Tube').props.value, '4');
  assert.equal(nodes(h.render(), n => n.props?.label === 'Received by')[0].props.children.props.value, 'Alex');
});

test('store issue API sends one store-scoped POST', async () => {
  const calls = [], api = loader(undefined, { apiFetch: async (...args) => { calls.push(args); return {}; } })('app/api/materials.api.ts');
  const body = { requestKey: 'issue', recipient: 'Alex', note: 'Installation', lines: [{ productId: 1, presentationId: 2, quantity: 4 }] };
  await api.useMaterialStoreInternally(7, body);
  assert.equal(calls[0][0], '/api/materials/stores/7/internal-use'); assert.equal(calls[0][1].method, 'POST'); assert.deepEqual(calls[0][1].body, body);
});

test('technician withdrawal requires quantities only and automatically shows installation', async () => {
  const user = { id: 20, firstName: 'Alex', lastName: 'Tech', username: 'alex', role: { name: 'technician' } }, writes = [];
  const h = controlled({ initial: inventory, initialIdentity: { id: 20, role: 'technician' }, technician: true }, {
    technicianWithdrawMaterials: async (...args) => { writes.push(args); return { ...result, recipient: 'Alex Tech', note: 'Installation' }; },
    technicianMaterialInventory: async () => inventory,
    useMaterialStoreInternally: async () => { throw Error('Admin endpoint used'); },
  }, { user, revalidate: async () => user });
  assert.equal(nodes(h.render(), n => n.props?.label === 'Received by' || n.props?.label === 'Reason / job').length, 0);
  enter(h, 1, 'Tube', '4'); click(h, 'Review withdrawal'); assert.match(text(h.render()), /Alex Tech/); assert.match(text(h.render()), /Installation/);
  click(h, 'Confirm withdrawal'); await tick();
  assert.equal(writes.length, 1); assert.equal(writes[0][0], 1); assert.equal(writes[0][1].lines[0].quantity, 4); assert.equal(storage.size, 0);
  for (const link of nodes(h.render(), n => n.type === 'a')) assert.match(link.props.href, /^\/technician/);
});

test('technician pending material withdrawal survives reload and can recover from a now-inactive store', async () => {
  const user = { id: 20, role: { name: 'technician' } }, auth = { user, revalidate: async () => user }, writes = [];
  const input = { initial: inventory, initialIdentity: { id: 20, role: 'technician' }, technician: true };
  const api = { technicianWithdrawMaterials: async (_, body) => { writes.push(structuredClone(body)); if (writes.length === 1) throw Error('Lost response'); return result; }, technicianMaterialInventory: async () => inventory };
  const h = controlled(input, api, auth); enter(h, 1, 'Tube', '4'); click(h, 'Review withdrawal'); click(h, 'Confirm withdrawal'); await tick();
  assert.ok(storage.has('technician-material-withdrawal:20:1'));
  const restored = controlled({ ...input, initial: { ...inventory, store: { ...inventory.store, isActive: false } } }, api, auth);
  click(restored, 'Retry same withdrawal'); await tick(); assert.equal(writes.length, 2); assert.deepEqual(writes[0], writes[1]); assert.equal(storage.size, 0);
});

test('technician material API sends only request key and quantities, and inventory retains PO identification', async () => {
  const calls = [], api = loader(undefined, { apiFetch: async (...args) => { calls.push(args); return args[0].includes('/units/') ? { lineNumber: '123', orderId: 8, customer: 'Test customer', project: 'Test job' } : { items: [{ orderId: 8, customer: 'Test customer', project: 'Test job', units: [{ lineNumber: '123' }] }] }; } })('app/api/technician-warehouse.api.ts');
  const body = { requestKey: 'test', lines: [{ productId: 1, presentationId: 2, quantity: 3 }], recipient: 'Spoofed', note: 'Spoofed' };
  await api.technicianWithdrawMaterials(7, body);
  assert.equal(calls[0][0], '/api/technician/materials/stores/7/internal-use'); assert.deepEqual(calls[0][1].body, { requestKey: body.requestKey, lines: body.lines });
  const data = await api.technicianWarehouseInventoryByPo({ storeId: 7 });
  assert.equal(data.items[0].units[0].orderId, 8); assert.equal(data.items[0].units[0].customer, 'Test customer');
  const scanned = await api.technicianWarehouseUnit('123-DOOR'); assert.equal(scanned.orderId, 8); assert.equal(scanned.customer, 'Test customer'); assert.equal(scanned.project, 'Test job');
});

(async () => { for (const { name, run } of tests) { storage.clear(); await run(); console.log(`PASS ${name}`); } console.log(`${tests.length} material store internal use checks passed.`); })().catch(error => { console.error(error); process.exitCode = 1; });

