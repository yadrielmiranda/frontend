/* Offline delivery regressions. No network, database, server, signatures or inventory writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '../src');
const clientPath = 'app/warehouse/customer-deliveries/customer-delivery-client.tsx';
const tests = [], test = (name, run) => tests.push({ name, run });
let nextKey = 0;
class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } }
const storage = new Map();
global.sessionStorage = {
  getItem(key) { return storage.get(key) ?? null; },
  setItem(key, value) { storage.set(key, value); },
  removeItem(key) { storage.delete(key); },
};
function loader(hooks = {}, api = {}, navigation = {}, auth = { user: { id: 10, role: { name: 'admin' } }, revalidate: async () => ({ id: 10, role: { name: 'admin' } }) }) {
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename);
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const module = { exports: {} };
    function resolve(id) {
      if (id === 'react') return { ...React, ...hooks };
      if (id === 'react/jsx-runtime') return require(id);
      if (id === 'next/link') return { default: 'a', __esModule: true };
      if (id === 'next/navigation') return { useRouter: () => ({ replace: navigation.replace ?? (() => {}) }) };
      if (id === '@/contexts/AuthContext') return { useAuth: () => auth };
      if (id === 'lucide-react' || id.startsWith('@/components/ui/')) return new Proxy({}, { get: (_, name) => name });
      if (id === '@/app/api/warehouse.api') return { warehouseRequestKey: () => `request-${++nextKey}`, ...api };
      if (id === '@/app/api/_base') return { ApiError, isApiError: error => error instanceof ApiError };
      if (id === '@/components/estimates/agreements/signature-pad') return { SignaturePad: 'SignaturePad' };
      if (id === '../warehouse-shared') return { CountNotice: 'CountNotice', Pagination: 'Pagination', errorMessage: error => error.message };
      if (id === '../store-select') return { StoreSelect: 'StoreSelect' };
      if (id === '../scan-pad') return { ScanPad: 'ScanPad' };
      if (id === '../unit-origin') return { UnitOrigin: 'UnitOrigin' };
      if (id === './customer-delivery-receipt') return { CustomerDeliveryReceipt: 'CustomerDeliveryReceipt' };
      const base = id.startsWith('@/') ? path.resolve(root, id.slice(2)) : id.startsWith('.') ? path.resolve(path.dirname(filename), id) : null;
      if (!base) return require(id);
      const found = ['.ts', '.tsx'].map(ext => base + ext).find(file => fs.existsSync(file));
      if (!found) throw new Error(`Unresolved ${id}`);
      return load(path.relative(root, found));
    }
    new Function('require', 'module', 'exports', output)(resolve, module, module.exports);
    cache.set(filename, module.exports); return module.exports;
  }
  return load;
}
const helpers = loader()('app/warehouse/customer-deliveries/customer-delivery-selection.ts');
function unit(lineNumber, overrides = {}) {
  return { lineNumber, barcode: `I${lineNumber}`, source: 'EXTERNAL', externalPoId: 1, pieceId: null, description: `Description ${lineNumber}`, product: 'French Door', system: '600', configuration: 'X', mark: '', orderNumber: '', poNumber: '292427', customer: 'Santos', project: '', installation: null, inTransit: 2, onHand: 7, unassigned: 1, stores: [{ id: 1, name: 'Store 1', isActive: true, onHand: 2 }, { id: 2, name: 'Store 2', isActive: true, onHand: 4 }], expectedParts: 10, released: 0, version: 3, ...overrides };
}
const parts = [unit('1126830'), unit('1126835', { poNumber: '292759', source: 'ORDER', orderNumber: 'SO-2' })];
const signature = [[{ x: 0.1, y: 0.5 }, { x: 0.2, y: 0.3 }, { x: 0.3, y: 0.5 }, { x: 0.4, y: 0.3 }, { x: 0.5, y: 0.5 }]];
const props = (extra = {}) => ({ actorId: 10, actorRole: 'admin', initial: { items: structuredClone(parts), total: 2, page: 1, pageSize: 50, activeCountId: null, summary: {} }, initialStores: [{ id: 1, name: 'Store 1', isActive: true }], initialSource: 'TRANSIT', initialStoreId: '', ...extra });
function harness(initial = props(), api = {}, navigation = {}, auth) {
  const states = [], refs = []; let si = 0, ri = 0, ei = 0, mounted = false;
  let initialEffect;
  const hooks = {
    useState(value) { const i = si++; if (!(i in states)) states[i] = typeof value === 'function' ? value() : value; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useRef(value) { const i = ri++; if (!(i in refs)) refs[i] = { current: value }; return refs[i]; },
    useCallback(value) { return value; },
    useEffect(callback) { if (ei++ === 0 && !mounted) initialEffect = callback; },
  };
  const Component = loader(hooks, api, navigation, auth)(clientPath).CustomerDeliveryClient;
  return { render() { si = 0; ri = 0; ei = 0; const tree = Component(initial); if (!mounted) { mounted = true; initialEffect(); return this.render(); } return tree; } };
}
function nodes(element, predicate, result = []) {
  if (Array.isArray(element)) { element.forEach(child => nodes(child, predicate, result)); return result; }
  if (!element || typeof element !== 'object') return result;
  if (predicate(element)) result.push(element);
  nodes(element.props?.children, predicate, result); return result;
}
const text = element => typeof element === 'string' || typeof element === 'number' ? String(element) : Array.isArray(element) ? element.map(text).join('') : element?.props ? text(element.props.children) : '';
const label = (h, value) => nodes(h.render(), node => node.props?.['aria-label'] === value)[0];
const byType = (h, type) => nodes(h.render(), node => node.type === type)[0];
const button = (h, value) => nodes(h.render(), node => node.type === 'Button' && text(node) === value)[0];
function click(h, value) { const item = button(h, value); assert.ok(item, `Missing button: ${value}`); assert.ok(!item.props.disabled, `Disabled button: ${value}`); return item.props.onClick(); }
function select(h, barcode) { label(h, `Select ${barcode}`).props.onChange({ target: { checked: true } }); }
function enter(h, id, value) { nodes(h.render(), node => node.props?.id === id)[0].props.onChange({ target: { value } }); }
function sign(h) {
  enter(h, 'delivery-first-name', ' Ana '); enter(h, 'delivery-last-name', ' Perez ');
  byType(h, 'SignaturePad').props.onChange(structuredClone(signature));
  const acceptance = nodes(h.render(), node => node.type === 'input' && node.props.type === 'checkbox')[0];
  acceptance.props.onChange({ target: { checked: true } });
}
function reviewed(h) { select(h, 'I1126830'); click(h, 'Review delivery'); sign(h); }
const selection = () => ({ '1126830': { unit: parts[0], quantity: '1' } });

test('available quantity uses transit, one store or unassigned instead of all warehouse stock', () => {
  assert.equal(helpers.deliveryAvailable(parts[0], 'TRANSIT', '2'), 2);
  assert.equal(helpers.deliveryAvailable(parts[0], 'WAREHOUSE', '1'), 2);
  assert.equal(helpers.deliveryAvailable(parts[0], 'WAREHOUSE', '2'), 4);
  assert.equal(helpers.deliveryAvailable(parts[0], 'WAREHOUSE', 'unassigned'), 1);
  assert.equal(helpers.deliveryAvailable(parts[0], 'WAREHOUSE', ''), 0);
});
test('requests refuse missing locations, zero, fractional and over-available parts', () => {
  assert.throws(() => helpers.deliveryItems(selection(), 'WAREHOUSE', ''), /source store/);
  for (const quantity of ['0', '1.5', '3', 'NaN', '']) assert.throws(() => helpers.deliveryItems({ '1126830': { unit: parts[0], quantity } }, 'TRANSIT', ''), /whole number/);
  assert.throws(() => helpers.deliveryItems({ '1126830': { unit: parts[0], quantity: '2' } }, 'WAREHOUSE', 'unassigned'), /whole number/);
});
test('request requires first and last names and an actual drawn signature', () => {
  const base = { selection: selection(), source: 'TRANSIT', storeId: '', firstName: ' Ana ', lastName: ' Perez  Diaz ', signatureStrokes: signature, requestKey: 'same-key' };
  for (const extra of [{ firstName: ' ' }, { lastName: ' ' }, { signatureStrokes: [] }, { signatureStrokes: [[{ x: 0.1, y: 0.1 }]] }]) assert.throws(() => helpers.customerDeliveryRequest({ ...base, ...extra }));
  assert.equal(helpers.hasDeliverySignature([Array(5).fill({ x: 0.1, y: 0.1 })]), false);
  assert.equal(helpers.hasDeliverySignature([[{ x: -1, y: 0 }, ...signature[0]]]), false);
  const request = helpers.customerDeliveryRequest(base);
  assert.equal(request.firstName, 'Ana'); assert.equal(request.lastName, 'Perez Diaz');
  assert.equal('storeId' in request, false);
  assert.deepEqual(request.items, [{ barcode: 'I1126830', quantity: 1, version: 3 }]);
});
test('unassigned warehouse release sends explicit null location', () => {
  const request = helpers.customerDeliveryRequest({ selection: selection(), source: 'WAREHOUSE', storeId: 'unassigned', firstName: 'Ana', lastName: 'Perez', signatureStrokes: signature, requestKey: 'key' });
  assert.equal(request.storeId, null);
});
test('partial multi-PO preview contains only delivered pieces and their physical quantities', () => {
  const h = harness(); select(h, 'I1126830'); select(h, 'I1126835');
  label(h, 'Deliver parts for I1126830').props.onChange({ target: { value: '1' } });
  click(h, 'Review delivery');
  const receipt = byType(h, 'CustomerDeliveryReceipt').props;
  assert.equal(receipt.showSignature, false);
  assert.equal(receipt.delivery.totalPieces, 2); assert.equal(receipt.delivery.totalParts, 3);
  assert.deepEqual(receipt.delivery.items.map(item => [item.poNumber, item.lineNumber, item.quantity]), [['292427', '1126830', 1], ['292759', '1126835', 2]]);
  assert.equal(receipt.delivery.items[0].description, 'Description 1126830');
});
test('factory delivery uses selection and does not require another scan', () => {
  const h = harness(); assert.equal(byType(h, 'ScanPad'), undefined);
  select(h, 'I1126830'); click(h, 'Review delivery');
  assert.equal(byType(h, 'CustomerDeliveryReceipt').props.delivery.source, 'TRANSIT');
});
test('warehouse scan only stages a part and never records a release before signing', async () => {
  let reads = 0, writes = 0;
  const h = harness(props({ initialSource: 'WAREHOUSE', initialStoreId: '1' }), { warehouseUnit: async () => { reads++; return parts[0]; }, warehouseDeliverToCustomer: async () => { writes++; }, warehouseScan: async () => { throw new Error('Must not mutate while scanning'); } });
  click(h, 'Select parts by scanning');
  let scanner = byType(h, 'ScanPad'); scanner.props.onSaved(await scanner.props.onRead('I1126830'));
  scanner = byType(h, 'ScanPad'); scanner.props.onSaved(await scanner.props.onRead('I1126830'));
  assert.equal(reads, 2); assert.equal(writes, 0);
  assert.equal(label(h, 'Deliver parts for I1126830').props.value, '2');
  await assert.rejects(() => byType(h, 'ScanPad').props.onRead('I1126830'), /No more parts/);
});
test('editing recipient identity clears their signature and receipt acceptance', () => {
  const h = harness(); reviewed(h);
  assert.ok(!button(h, 'Confirm signed delivery').props.disabled);
  enter(h, 'delivery-last-name', 'Lopez');
  assert.deepEqual(byType(h, 'SignaturePad').props.value, []);
  assert.ok(button(h, 'Confirm signed delivery').props.disabled);
});
test('returning to selection discards the earlier signature before quantities can change', () => {
  const h = harness(); reviewed(h); click(h, 'Back to selection');
  label(h, 'Deliver parts for I1126830').props.onChange({ target: { value: '1' } });
  click(h, 'Review delivery');
  assert.deepEqual(byType(h, 'SignaturePad').props.value, []);
  assert.equal(byType(h, 'CustomerDeliveryReceipt').props.delivery.totalParts, 1);
});
test('rapid duplicate confirmation sends only once and opens the saved receipt', async () => {
  let resolve, writes = 0, destination;
  const h = harness(props(), { warehouseDeliverToCustomer: () => { writes++; return new Promise(done => { resolve = done; }); } }, { replace: value => { destination = value; } });
  reviewed(h); const confirm = button(h, 'Confirm signed delivery').props.onClick;
  const first = confirm(), second = confirm();
  await new Promise(done => setImmediate(done));
  assert.equal(writes, 1); resolve({ id: 71 }); await Promise.all([first, second]);
  assert.equal(destination, '/warehouse/customer-deliveries/71');
  assert.equal(button(h, 'Confirm signed delivery'), undefined); assert.equal(storage.size, 0);
});
test('uncertain response freezes signed data and retries the identical request', async () => {
  const bodies = [];
  const h = harness(props(), { warehouseDeliverToCustomer: async body => { bodies.push(structuredClone(body)); if (bodies.length === 1) throw new Error('Connection lost'); return { id: 72 }; } });
  reviewed(h); await click(h, 'Confirm signed delivery');
  assert.ok(button(h, 'Back to selection').props.disabled);
  assert.ok(nodes(h.render(), node => node.props?.id === 'delivery-first-name')[0].props.disabled);
  assert.ok(byType(h, 'SignaturePad').props.disabled);
  await click(h, 'Check delivery'); assert.equal(bodies.length, 2); assert.deepEqual(bodies[0], bodies[1]);
});
test('uncertain delivery survives reload with original receipt and request key', async () => {
  let original, retried;
  const h = harness(props(), { warehouseDeliverToCustomer: async body => { original = structuredClone(body); throw new Error('Response lost'); } });
  reviewed(h); await click(h, 'Confirm signed delivery');
  const recovered = harness(props({ initialSource: 'WAREHOUSE', initialStoreId: '1' }), { warehouseDeliverToCustomer: async body => { retried = structuredClone(body); return { id: 73 }; } });
  assert.equal(byType(recovered, 'CustomerDeliveryReceipt').props.delivery.source, 'TRANSIT');
  await click(recovered, 'Check delivery'); assert.deepEqual(retried, original);
});
test('definitive inventory conflict allows reviewing a new selection', async () => {
  const h = harness(props(), { warehouseDeliverToCustomer: async () => { throw new ApiError('Stock changed', 409); } });
  reviewed(h); await click(h, 'Confirm signed delivery');
  assert.ok(!button(h, 'Back to selection').props.disabled); assert.equal(storage.size, 0);
  assert.deepEqual(byType(h, 'SignaturePad').props.value, []);
  sign(h); assert.ok(button(h, 'Confirm signed delivery').props.disabled);
});
test('no delivery is sent if the signed request cannot be saved for a retry', async () => {
  let writes = 0;
  const h = harness(props(), { warehouseDeliverToCustomer: async () => { writes++; return { id: 74 }; } });
  reviewed(h); const save = sessionStorage.setItem;
  sessionStorage.setItem = () => { throw new Error('Storage disabled'); };
  try { await click(h, 'Confirm signed delivery'); } finally { sessionStorage.setItem = save; }
  assert.equal(writes, 0); assert.match(text(h.render()), /Nothing was sent/);
});
test('account is revalidated before submission and a changed staff identity cannot record it', async () => {
  let writes = 0;
  const auth = { user: { id: 10, role: { name: 'admin' } }, revalidate: async () => ({ id: 11, role: { name: 'admin' } }) };
  const h = harness(props(), { warehouseDeliverToCustomer: async () => { writes++; } }, {}, auth);
  reviewed(h); await click(h, 'Confirm signed delivery');
  assert.equal(writes, 0); assert.equal(storage.size, 0); assert.match(text(h.render()), /account has changed/);
});
test('different logged-in staff cannot see or replay another persons pending signed receipt', async () => {
  const h = harness(props(), { warehouseDeliverToCustomer: async () => { throw new Error('Response lost'); } });
  reviewed(h); await click(h, 'Confirm signed delivery');
  let writes = 0;
  const auth = { user: { id: 11, role: { name: 'admin' } }, revalidate: async () => ({ id: 11, role: { name: 'admin' } }) };
  const wrongAccount = harness(props(), { warehouseDeliverToCustomer: async () => { writes++; } }, {}, auth);
  assert.equal(byType(wrongAccount, 'CustomerDeliveryReceipt'), undefined);
  assert.equal(button(wrongAccount, 'Check delivery'), undefined); assert.equal(writes, 0);
});

(async () => {
  for (const { name, run } of tests) { storage.clear(); await run(); process.stdout.write(`PASS ${name}\n`); }
  process.stdout.write(`${tests.length} customer delivery checks passed.\n`);
})().catch(error => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
