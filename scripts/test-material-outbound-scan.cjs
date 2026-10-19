/* Offline behavior checks; no server, camera, database or real stock writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '../src');
const jsx = (type, props) => ({ type, props });
const ui = new Proxy({}, { get: (_, key) => key });
const all = (node, match) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(child => all(child, match)) : [...(match(node) ? [node] : []), ...all(node.props?.children, match)];
const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node)
  : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
const named = (node, name) => node.type === name || node.type?.name === name;
const scanner = h => all(h.render(), node => named(node, 'MaterialScan'))[0];
const field = (h, label) => all(h.render(), node => named(node, 'MaterialField') && node.props.label === label)[0].props.children;
const aria = (h, label) => all(h.render(), node => node.props?.['aria-label'] === label)[0];
const button = (h, label) => all(h.render(), node => node.props?.onClick && text(node) === label)[0];
const change = (node, value) => node.props.onChange({ target: { value } });
const tick = () => new Promise(resolve => setImmediate(resolve));
const account = { id: 9, role: { name: 'admin' } };
const base = { id: 10, productId: 1, name: 'Tube', unit: { id: 1, name: 'Tube', isActive: true }, unitId: 1, multiplier: 1, barcode: '001234567890', isBase: true, isPurchase: false, isActive: true, isSaleEnabled: false, salePrice: null, version: 0 };
const box = { ...base, id: 11, name: 'Box of 12', unit: { id: 2, name: 'Box', isActive: true }, unitId: 2, multiplier: 12, barcode: 'BOX12', isBase: false, isPurchase: true };
const makeProduct = () => ({ id: 1, code: 'MAT-000001', name: 'White caulking', isActive: true, version: 3, baseUnit: base.unit, presentations: [structuredClone(base), structuredClone(box)], inventoryByStore: [{ store: { id: 7, name: 'Main store', isActive: true }, totalBaseQuantity: 60, availableBaseQuantity: 60, reservedBaseQuantity: 0, presentations: [{ id: 10, quantity: 0, availableQuantity: 60, reservedQuantity: 0 }, { id: 11, quantity: 5, availableQuantity: 5, reservedQuantity: 0 }] }] });
const makeInventory = () => ({ store: { id: 7, name: 'Main store', isActive: true }, products: Array.from({ length: 25 }, (_, index) => ({ id: index + 1, code: `MAT-${String(index + 1).padStart(6, '0')}`, name: `Material ${index + 1}`, imageUrl: null, isActive: true, version: 1, baseUnit: base.unit, totalBaseQuantity: 60, availableBaseQuantity: 60, reservedBaseQuantity: 0, presentations: [
  { id: index * 2 + 1, name: 'Tube', multiplier: 1, isBase: true, isActive: true, barcode: `UNIT${index + 1}`, quantity: 0, reservedQuantity: 0, availableQuantity: 60 },
  { id: index * 2 + 2, name: 'Box of 12', multiplier: 12, isBase: false, isActive: true, barcode: `BOX${index + 1}`, quantity: 5, reservedQuantity: 0, availableQuantity: 5 },
] })) });
function harness(kind, options = {}) {
  const states = [], refs = [], modules = new Map(), calls = [];
  let si = 0, ri = 0;
  const hooks = {
    useState(initial) { const i = si++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef(initial) { const i = ri++; return refs[i] ??= { current: initial }; },
  };
  const auth = options.auth ?? { user: account, revalidate: async () => account };
  const api = new Proxy({}, { get: (_, name) => async (...args) => { calls.push({ name, args }); return options.api?.(name, ...args); } });
  function load(relative) {
    if (modules.has(relative)) return modules.get(relative);
    const filename = path.resolve(root, relative);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const exports = {};
    new Function('require', 'exports', compiled)(id => {
      if (id === 'react') return hooks;
      if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (id === 'next/link') return { default: 'a' };
      if (id === 'lucide-react' || id.startsWith('@/components/ui/')) return ui;
      if (id === '@/contexts/AuthContext') return { useAuth: () => auth };
      if (id === '@/app/api/materials.api') return api;
      if (id === '@/app/api/warehouse.api') return { warehouseRequestKey: () => 'withdrawal-key' };
      if (id === '@/app/api/_base') return { isApiError: error => Number.isInteger(error?.status) };
      if (id === '@/components/material-product-image') return { MaterialProductImage: 'MaterialProductImage' };
      if (id === './material-barcode-camera') return { MaterialBarcodeCamera: 'MaterialBarcodeCamera' };
      const target = path.resolve(path.dirname(filename), id);
      const found = ['.ts', '.tsx'].map(ext => target + ext).find(file => fs.existsSync(file));
      if (found) return load(path.relative(root, found));
      throw new Error(`Unexpected dependency ${id}`);
    }, exports);
    modules.set(relative, exports); return exports;
  }
  const productMode = kind !== 'store';
  const props = productMode
    ? { product: options.product ?? makeProduct(), stores: [{ id: 7, name: 'Main store', isActive: true }], action: kind, onSaved: async () => {}, ...options.props }
    : { initial: options.inventory ?? makeInventory(), initialIdentity: { id: 9, role: 'admin' } };
  const component = productMode ? load('app/warehouse/materials/material-stock-actions.tsx').MaterialStockActions : load('app/warehouse/stores/store-material-internal-use-client.tsx').StoreMaterialInternalUseClient;
  return { props, calls, auth, render() { si = ri = 0; return component(props); } };
}

test('product withdrawal scans select the exact package and preserve manually entered quantity', async () => {
  const h = harness('internal');
  change(field(h, 'Store'), '7'); change(field(h, 'Presentation'), '10'); change(field(h, 'Quantity in this presentation'), '3');
  assert.equal(scanner(h).props.embedded, true);
  await scanner(h).props.onScan('  BOX12  ');
  assert.equal(field(h, 'Presentation').props.value, '11');
  assert.equal(field(h, 'Quantity in this presentation').props.value, '3');
  assert.match(text(h.render()), /Selected Box of 12 · 12 Tube each/);
  assert.equal(h.calls.length, 0);
});

test('scanning a loose-unit code preserves leading zeros and does not auto-open a package', async () => {
  const h = harness('internal'); change(field(h, 'Store'), '7');
  await scanner(h).props.onScan('001234567890');
  assert.equal(field(h, 'Presentation').props.value, '10');
  assert.equal(field(h, 'Quantity in this presentation').props.value, '');
  assert.equal(h.calls.length, 0);
});

test('wrong-product, partial and unknown codes cannot replace a product presentation', async () => {
  const h = harness('internal'); change(field(h, 'Presentation'), '10');
  for (const code of ['BOX1', 'OTHER-PRODUCT', '1234567890']) await assert.rejects(scanner(h).props.onScan(code), /does not belong/);
  assert.equal(field(h, 'Presentation').props.value, '10'); assert.equal(h.calls.length, 0);
});

test('inactive and unavailable product presentations cannot be selected by scan', async () => {
  for (const mode of ['inactive', 'unavailable']) {
    const product = makeProduct();
    if (mode === 'inactive') product.presentations[1].isActive = false;
    else product.inventoryByStore[0].presentations[1].availableQuantity = 0;
    const h = harness('internal', { product }); change(field(h, 'Store'), '7'); change(field(h, 'Presentation'), '10');
    await assert.rejects(scanner(h).props.onScan('BOX12'), mode === 'inactive' ? /inactive/ : /No Box of 12/);
    assert.equal(field(h, 'Presentation').props.value, '10'); assert.equal(h.calls.length, 0);
  }
});

test('transfer scanning selects a presentation without moving material', async () => {
  const h = harness('transfer'); await scanner(h).props.onScan('BOX12');
  assert.equal(field(h, 'Presentation').props.value, '11');
  assert.equal(field(h, 'From store').props.value, '');
  assert.equal(h.calls.length, 0);
});

test('in-flight product submission blocks stale camera callbacks immediately', async () => {
  let finish;
  const h = harness('internal', { api: () => new Promise(resolve => { finish = resolve; }) });
  change(field(h, 'Store'), '7'); change(field(h, 'Presentation'), '10'); change(field(h, 'Quantity in this presentation'), '2');
  const scan = scanner(h).props.onScan;
  h.render().props.onSubmit({ preventDefault() {} });
  await assert.rejects(scan('BOX12'), /current action finishes/);
  assert.equal(scanner(h).props.disabled, true); assert.equal(field(h, 'Presentation').props.value, '10');
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].name, 'useMaterialInternally');
  finish(); await tick(); assert.equal(scanner(h).props.disabled, false);
});

test('inactive products disable scanning without broadening action visibility', async () => {
  const product = makeProduct(); product.isActive = false;
  const h = harness('internal', { product }); assert.equal(scanner(h).props.disabled, true);
  await assert.rejects(scanner(h).props.onScan('BOX12'), /current action finishes/);
  assert.equal(h.calls.length, 0);
  for (const action of ['receive', 'adjust', 'repack']) assert.equal(scanner(harness(action)), undefined);
});

test('store scan reveals an exact off-page presentation and keeps every previous quantity', async () => {
  const h = harness('store'); change(aria(h, 'Withdraw Material 1 · Tube'), '4');
  await scanner(h).props.onScan('BOX25');
  assert.equal(aria(h, 'Search store materials').props.value, 'MAT-000025');
  assert.equal(aria(h, 'Withdraw Material 25 · Box of 12').props.value, '');
  assert.match(text(h.render()), /Material 25 · Box of 12/);
  const highlighted = all(h.render(), node => node.type === 'tr' && node.props.className?.includes('ring-emerald-300'));
  assert.equal(highlighted.length, 1); assert.match(text(highlighted[0]), /Box of 12Barcode match/);
  assert.doesNotMatch(text(highlighted[0]), /TubeBarcode match/);
  change(aria(h, 'Withdraw Material 25 · Box of 12'), '2');
  await scanner(h).props.onScan('BOX25');
  assert.equal(aria(h, 'Withdraw Material 25 · Box of 12').props.value, '2');
  change(aria(h, 'Search store materials'), '');
  assert.equal(aria(h, 'Withdraw Material 1 · Tube').props.value, '4');
  assert.equal(h.calls.length, 0);
});

test('store scan errors preserve current filter, highlight and selected quantities', async () => {
  const inventory = makeInventory(); inventory.products[1].presentations[1].isActive = false; inventory.products[2].presentations[1].availableQuantity = 0;
  const h = harness('store', { inventory });
  await scanner(h).props.onScan('BOX1'); change(aria(h, 'Withdraw Material 1 · Box of 12'), '2');
  for (const [barcode, error] of [['BOX2', /inactive/], ['BOX3', /No Box of 12/], ['BOX', /not found/], ['OTHER', /not found/]]) await assert.rejects(scanner(h).props.onScan(barcode), error);
  assert.equal(aria(h, 'Search store materials').props.value, 'MAT-000001');
  assert.equal(aria(h, 'Withdraw Material 1 · Box of 12').props.value, '2');
  assert.match(text(h.render()), /Found Material 1 · Box of 12/); assert.equal(h.calls.length, 0);
});

test('store review and discard dialogs disable scans without mutating the withdrawal', async () => {
  const h = harness('store'); change(aria(h, 'Withdraw Material 1 · Tube'), '4');
  change(field(h, 'Received by'), 'Alex'); change(field(h, 'Reason / job'), 'Installation');
  const beforeReview = scanner(h).props.onScan;
  button(h, 'Review withdrawal').props.onClick();
  await assert.rejects(beforeReview('BOX25'), /Finish or close/);
  assert.equal(scanner(h).props.disabled, true); await assert.rejects(scanner(h).props.onScan('BOX25'), /Finish or close/);
  button(h, 'Back to materials').props.onClick(); assert.equal(scanner(h).props.disabled, false);
  const beforeDiscard = scanner(h).props.onScan;
  button(h, 'Refresh stock').props.onClick();
  await assert.rejects(beforeDiscard('BOX25'), /Finish or close/);
  assert.equal(scanner(h).props.disabled, true); await assert.rejects(scanner(h).props.onScan('BOX25'), /Finish or close/);
  assert.equal(aria(h, 'Withdraw Material 1 · Tube').props.value, '4'); assert.equal(h.calls.length, 0);
});

test('pending store submission and unknown outcome block callbacks and keep retry unchanged', async () => {
  let reject;
  const h = harness('store', { api: () => new Promise((_, fail) => { reject = fail; }) });
  change(aria(h, 'Withdraw Material 1 · Tube'), '4'); change(field(h, 'Received by'), 'Alex'); change(field(h, 'Reason / job'), 'Installation');
  const staleScan = scanner(h).props.onScan;
  button(h, 'Review withdrawal').props.onClick(); button(h, 'Confirm withdrawal').props.onClick();
  await assert.rejects(staleScan('BOX25'), /Finish or close/); await tick();
  assert.equal(h.calls.length, 1); const original = structuredClone(h.calls[0]);
  reject(Error('Connection lost')); await tick();
  assert.equal(scanner(h).props.disabled, true); await assert.rejects(scanner(h).props.onScan('BOX25'), /Finish or close/);
  assert.equal(aria(h, 'Withdraw Material 1 · Tube').props.value, '4');
  button(h, 'Retry same withdrawal').props.onClick(); await tick();
  assert.deepEqual(h.calls[1], original);
  reject(Object.assign(Error('Conflict'), { status: 409 })); await tick();
});

test('inactive stores and changed accounts cannot scan store inventory', async () => {
  const inventory = makeInventory(); inventory.store.isActive = false;
  const h = harness('store', { inventory }); assert.equal(scanner(h).props.disabled, true);
  await assert.rejects(scanner(h).props.onScan('BOX1'), /Finish or close/);
  const auth = { user: account, revalidate: async () => account }, active = harness('store', { auth });
  const stale = scanner(active).props.onScan; auth.user = { ...account, id: 123 }; active.render();
  assert.equal(scanner(active), undefined); await assert.rejects(stale('BOX1'), /Finish or close/);
  assert.equal(h.calls.length + active.calls.length, 0);
});

test('scanned store selection still requires quantities, recipient, reason and explicit confirmation', async () => {
  const h = harness('store'); await scanner(h).props.onScan('BOX25');
  assert.equal(button(h, 'Review withdrawal').props.disabled, true);
  change(aria(h, 'Withdraw Material 25 · Box of 12'), '2');
  assert.equal(button(h, 'Review withdrawal').props.disabled, true);
  change(field(h, 'Received by'), 'Alex'); change(field(h, 'Reason / job'), 'Installation');
  assert.equal(button(h, 'Review withdrawal').props.disabled, false);
  button(h, 'Review withdrawal').props.onClick();
  assert.match(text(h.render()), /2 × Box of 12/); assert.match(text(h.render()), /24 Tube to withdraw/);
  assert.equal(h.calls.length, 0);
});
