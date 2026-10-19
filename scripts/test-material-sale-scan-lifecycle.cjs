/* Offline tests of the real sale draft and asynchronous barcode lookup lifecycle. */
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
const button = (h, label) => all(h.render(), node => node.props?.onClick && text(node) === label)[0];
const field = (h, label) => all(h.render(), node => named(node, 'MaterialField') && node.props.label === label)[0].props.children;
const line = (h, name) => all(h.render(), node => node.props?.['aria-label'] === `Quantity of White caulking ${name}`)[0];
const tick = () => new Promise(resolve => setImmediate(resolve));
const base = { id: 10, productId: 1, name: 'Tube', multiplier: 1, isActive: true, isSaleEnabled: true, salePrice: 6 };
const box = { ...base, id: 11, name: 'Box of 12', multiplier: 12, salePrice: 60 };
const product = { id: 1, name: 'White caulking', code: 'MAT-000001', isActive: true, isSaleEnabled: true, presentations: [base, box] };
const staff = { id: 9, role: { name: 'admin' } };
const match = presentation => ({ product, presentation });
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

function fixture(options = {}) {
  const states = [], refs = [], modules = new Map(), calls = [];
  let si = 0, ri = 0;
  const hooks = {
    useState(initial) { const i = si++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef(initial) { const i = ri++; return refs[i] ??= { current: initial }; },
  };
  const auth = options.auth ?? { user: staff, revalidate: async () => staff };
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
      if (id === 'next/navigation') return { useRouter: () => ({ push: url => { calls.push({ name: 'navigate', args: [url] }); } }) };
      if (id === 'lucide-react' || id.startsWith('@/components/ui/')) return ui;
      if (id === '@/contexts/AuthContext') return { useAuth: () => auth };
      if (id === '@/app/api/materials.api') return api;
      if (id === '@/app/api/warehouse.api') return { warehouseRequestKey: () => 'sale-request-key' };
      if (id === '@/app/api/_base') return { isApiError: error => Number.isInteger(error?.status) };
      if (id === './material-barcode-camera') return { MaterialBarcodeCamera: 'MaterialBarcodeCamera' };
      const target = path.resolve(path.dirname(filename), id);
      const found = ['.ts', '.tsx'].map(ext => target + ext).find(file => fs.existsSync(file));
      if (found) return load(path.relative(root, found));
      throw new Error(`Unexpected dependency ${id}`);
    }, exports);
    modules.set(relative, exports); return exports;
  }
  const component = load('app/warehouse/materials/material-sales-client.tsx').MaterialSalesClient;
  const props = { initial: [], catalog: { products: [product], taxRate: '7' }, stores: [{ id: 7, name: 'Main store', isActive: true }] };
  const h = { calls, auth, render() { si = ri = 0; return component(props); } };
  button(h, 'New sale').props.onClick();
  return h;
}
function validDraft(h) {
  field(h, 'Store for fulfillment').props.onChange({ target: { value: '7' } });
  button(h, 'Tube · $6.00').props.onClick();
  const customer = all(h.render(), node => named(node, 'MaterialSaleCustomerFields'))[0];
  customer.props.onChange({ ...customer.props.value, customerName: 'Buyer' });
}
function submit(h) {
  all(h.render(), node => node.type === 'form' && text(node).includes('Create sale for review'))[0].props.onSubmit({ preventDefault() {} });
}

test('sale scanner adds the exact presentation to the draft only and preserves manual selection', async () => {
  const h = fixture({ api: async () => match(box) });
  button(h, 'Tube · $6.00').props.onClick();
  await scanner(h).props.onScan('BOX12');
  assert.equal(line(h, 'Tube').props.value, 1); assert.equal(line(h, 'Box of 12').props.value, 1);
  assert.deepEqual(h.calls, [{ name: 'materialBarcode', args: ['BOX12'] }]);
  await scanner(h).props.onScan('BOX12'); assert.equal(line(h, 'Box of 12').props.value, 2);
  assert.equal(h.calls.filter(call => call.name !== 'materialBarcode').length, 0);
});

test('closing a sale invalidates a pending lookup even before React rerenders', async () => {
  const lookup = deferred(), h = fixture({ api: () => lookup.promise });
  button(h, 'Tube · $6.00').props.onClick();
  const pending = scanner(h).props.onScan('BOX12');
  button(h, 'Close new sale').props.onClick();
  lookup.resolve(match(box)); await pending;
  assert.equal(scanner(h), undefined);
  button(h, 'New sale').props.onClick();
  assert.equal(line(h, 'Tube').props.value, 1); assert.equal(line(h, 'Box of 12'), undefined);
});

test('reopening preserves the manual draft but rejects a result from its previous opening', async () => {
  const old = deferred(), fresh = deferred(); let searches = 0;
  const h = fixture({ api: () => (++searches === 1 ? old.promise : fresh.promise) });
  const first = scanner(h).props.onScan('OLD-BOX');
  button(h, 'Close new sale').props.onClick(); button(h, 'New sale').props.onClick();
  const second = scanner(h).props.onScan('NEW-UNIT');
  fresh.resolve(match(base)); await second;
  old.resolve(match(box)); await first;
  assert.equal(line(h, 'Tube').props.value, 1); assert.equal(line(h, 'Box of 12'), undefined);
});

test('abandoned lookup failures are ignored while current lookup failures are surfaced', async () => {
  const old = deferred(), h = fixture({ api: () => old.promise });
  const pending = scanner(h).props.onScan('BOX12');
  button(h, 'Close new sale').props.onClick(); button(h, 'New sale').props.onClick();
  old.reject(Error('Late not found')); await pending;
  const current = fixture({ api: async () => { throw Error('Current not found'); } });
  await assert.rejects(scanner(current).props.onScan('UNKNOWN'), /Current not found/);
  assert.equal(line(current, 'Box of 12'), undefined);
});

test('a save attempt invalidates old lookups even when the save later fails and unlocks editing', async () => {
  const lookup = deferred();
  const h = fixture({ api: async name => { if (name === 'materialBarcode') return lookup.promise; throw Object.assign(Error('Stock changed'), { status: 409 }); } });
  validDraft(h); const pending = scanner(h).props.onScan('BOX12');
  submit(h); await tick();
  assert.equal(scanner(h).props.disabled, false);
  lookup.resolve(match(box)); await pending;
  assert.equal(line(h, 'Tube').props.value, 1); assert.equal(line(h, 'Box of 12'), undefined);
  assert.deepEqual(h.calls.find(call => call.name === 'createMaterialSale').args[0].lines, [{ presentationId: 10, quantity: 1 }]);
});

test('unknown save outcome freezes scanning and preserves the exact same sale retry', async () => {
  let saves = 0;
  const h = fixture({ api: async name => {
    if (name === 'createMaterialSale' && ++saves === 1) throw Error('Connection lost');
    if (name === 'createMaterialSale') return { id: 30, code: 'SALE30' };
    return match(box);
  } });
  validDraft(h); const staleScan = scanner(h).props.onScan;
  submit(h); await tick();
  assert.equal(scanner(h).props.disabled, true); await staleScan('BOX12');
  assert.equal(h.calls.filter(call => call.name === 'materialBarcode').length, 0);
  assert.equal(line(h, 'Box of 12'), undefined);
  button(h, 'Retry same sale').props.onClick(); await tick();
  const saved = h.calls.filter(call => call.name === 'createMaterialSale'); assert.deepEqual(saved[0], saved[1]);
  await scanner(h).props.onScan('BOX12');
  assert.equal(h.calls.filter(call => call.name === 'materialBarcode').length, 0);
});

test('account and role changes discard a lookup result', async () => {
  for (const next of [{ ...staff, id: 20 }, { ...staff, role: { name: 'operator' } }]) {
    const lookup = deferred(), auth = { user: staff, revalidate: async () => staff };
    const h = fixture({ auth, api: () => lookup.promise });
    const pending = scanner(h).props.onScan('BOX12');
    auth.user = next; h.render(); lookup.resolve(match(box)); await pending;
    assert.equal(line(h, 'Box of 12'), undefined);
  }
});

test('inactive product or non-sale presentation is rejected without changing existing lines', async () => {
  for (const value of [{ product: { ...product, isActive: false }, presentation: box }, { product, presentation: { ...box, isActive: false } }, { product, presentation: { ...box, isSaleEnabled: false } }]) {
    const h = fixture({ api: async () => value }); button(h, 'Tube · $6.00').props.onClick();
    await assert.rejects(scanner(h).props.onScan('BOX12'), /not enabled for sale/);
    assert.equal(line(h, 'Tube').props.value, 1); assert.equal(line(h, 'Box of 12'), undefined);
  }
});
