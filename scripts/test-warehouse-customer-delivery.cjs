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
class ApiError extends Error { constructor(message, status, data) { super(message); this.status = status; this.data = data; } }
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
      if (id === '@/app/api/technician-warehouse.api' || id === '@/app/api/technician.api') return api;
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
const factoryParts = loader()('app/warehouse/factory-parts.ts');
function unit(lineNumber, overrides = {}) {
  return { lineNumber, barcode: `I${lineNumber}`, source: 'EXTERNAL', externalPoId: 1, pieceId: null, description: `Description ${lineNumber}`, product: 'French Door', system: '600', configuration: 'X', mark: '', orderNumber: '', poNumber: '292427', customer: 'Santos', project: '', installation: null, inTransit: 2, onHand: 7, unassigned: 1, stores: [{ id: 1, name: 'Store 1', isActive: true, onHand: 2 }, { id: 2, name: 'Store 2', isActive: true, onHand: 4 }], expectedParts: 10, released: 0, version: 3, ...overrides };
}
function group(units, overrides = {}) {
  const first = units[0];
  return { key: first.source === 'EXTERNAL' ? `external:${first.externalPoId}` : `order:${first.orderId ?? 1}`, source: first.source, externalPoId: first.externalPoId, orderId: first.orderId ?? null, orderNumber: first.orderNumber, poNumber: first.poNumber, customer: first.customer, project: first.project, units, ...overrides };
}
const parts = [unit('1126830'), unit('1126835', { poNumber: '292759', source: 'ORDER', orderNumber: 'SO-2' })];
test('barcode parsing accepts both real formats and rejects hybrid and unknown suffixes', () => {
  for (const code of ['I00123', '123', ' 123-DOOR ', '123-SIDELITE', '123-frame', '123-WINDOW'])
    assert.equal(factoryParts.factoryBarcode(code).lineNumber, '123');
  for (const code of ['I123-DOOR', 'I123-SIDELITE', '123-PANEL', '0-FRAME', '0-SIDELITE', '123-DOOR-FRAME'])
    assert.equal(factoryParts.factoryBarcode(code), null);
});
test('sidelite labels normalize to the existing door-panel type', () => {
  for (const code of ['123-SIDELITE', ' 00123-sidelite ', '123-SideLite'])
    assert.deepEqual(factoryParts.factoryBarcode(code), { lineNumber: '123', type: 'DOOR' });
  assert.deepEqual(factoryParts.factoryBarcode('123-DOOR'), { lineNumber: '123', type: 'DOOR' });
  assert.deepEqual(factoryParts.factoryBarcode('123-FRAME'), { lineNumber: '123', type: 'FRAME' });
  assert.deepEqual(factoryParts.factoryBarcode('123-WINDOW'), { lineNumber: '123', type: 'WINDOW' });
  for (const code of ['I00123', '123'])
    assert.deepEqual(factoryParts.factoryBarcode(code), { lineNumber: '123', type: undefined });
});
const signature = [[{ x: 0.1, y: 0.5 }, { x: 0.2, y: 0.3 }, { x: 0.3, y: 0.5 }, { x: 0.4, y: 0.3 }, { x: 0.5, y: 0.5 }]];
const props = (extra = {}) => ({ actorId: 10, actorRole: 'admin', initial: { items: structuredClone(parts.map(item => group([item]))), total: 2, page: 1, pageSize: 20, activeCountId: null, summary: {} }, initialStores: [{ id: 1, name: 'Store 1', isActive: true }], initialSource: 'TRANSIT', initialStoreId: '', ...extra });
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
  if (typeof element.type === 'function' && element.type.name === 'FactoryPartQuantity')
    return nodes(element.type(element.props), predicate, result);
  if (predicate(element)) result.push(element);
  nodes(element.props?.children, predicate, result); return result;
}
const text = element => typeof element === 'string' || typeof element === 'number' ? String(element) : Array.isArray(element) ? element.map(text).join('') : element?.props ? text(element.props.children) : '';
const label = (h, value) => nodes(h.render(), node => node.props?.['aria-label'] === value)[0];
const byType = (h, type) => nodes(h.render(), node => node.type === type)[0];
const button = (h, value) => nodes(h.render(), node => node.type === 'Button' && text(node) === value)[0];
function click(h, value) { const item = button(h, value); assert.ok(item, `Missing button: ${value}`); assert.ok(!item.props.disabled, `Disabled button: ${value}`); return item.props.onClick(); }
function expand(h, barcode) {
  if (!label(h, `Select ${barcode}`)) {
    for (const toggle of nodes(h.render(), node => node.type === 'Button' && node.props?.['aria-expanded'] === false)) toggle.props.onClick();
  }
}
function select(h, barcode) { expand(h, barcode); label(h, `Select ${barcode}`).props.onChange({ target: { checked: true } }); }
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
test('POs and customer names are visible before typing or expanding pieces', () => {
  const h = harness();
  assert.ok(label(h, 'Select PO 292427'));
  assert.ok(label(h, 'Select PO 292759'));
  assert.match(text(h.render()), /Santos/);
  assert.equal(label(h, 'Search delivery POs').props.value, '');
  assert.equal(label(h, 'Select I1126830'), undefined);
  assert.equal(byType(h, 'Pagination').props.label, 'POs');
});
test('one PO selection includes all its pieces even beyond a piece-list page', () => {
  const many = Array.from({ length: 75 }, (_, index) => unit(String(2000000 + index)));
  const initial = { ...props().initial, items: [group(many)], total: 1 };
  const h = harness(props({ initial }));
  label(h, 'Select PO 292427').props.onChange({ target: { checked: true } });
  click(h, 'Deliver to customer');
  const receipt = byType(h, 'CustomerDeliveryReceipt').props.delivery;
  assert.equal(receipt.totalPieces, 75);
  assert.equal(receipt.totalParts, 150);
  assert.deepEqual(receipt.items.map(item => item.lineNumber), many.map(item => item.lineNumber));
});
test('warehouse PO selection includes only stock at the chosen store', () => {
  const units = [parts[0], unit('1126831', { stores: [{ id: 2, name: 'Store 2', isActive: true, onHand: 4 }] })];
  const h = harness(props({ initialSource: 'WAREHOUSE', initialStoreId: '1', initial: { ...props().initial, items: [group(units)], total: 1 } }));
  label(h, 'Select PO 292427').props.onChange({ target: { checked: true } });
  click(h, 'Deliver to customer');
  const receipt = byType(h, 'CustomerDeliveryReceipt').props.delivery;
  assert.equal(receipt.storeId, 1);
  assert.equal(receipt.totalPieces, 1);
  assert.equal(receipt.totalParts, 2);
});
test('selecting and clearing one PO preserves selections from another PO', () => {
  const h = harness();
  for (const po of ['292427', '292759']) label(h, `Select PO ${po}`).props.onChange({ target: { checked: true } });
  label(h, 'Select PO 292427').props.onChange({ target: { checked: false } });
  click(h, 'Deliver to customer');
  assert.deepEqual(byType(h, 'CustomerDeliveryReceipt').props.delivery.items.map(item => item.poNumber), ['292759']);
});
test('whole-PO selection cannot silently stop at the maximum piece limit', () => {
  const tooMany = group(Array.from({ length: 501 }, (_, index) => unit(String(3000000 + index))));
  const original = selection();
  assert.throws(() => helpers.selectDeliveryPos(original, [tooMany], 'TRANSIT', '', true), /at most 500 pieces/);
  assert.deepEqual(Object.keys(original), ['1126830']);
  const h = harness(props({ initial: { ...props().initial, items: [tooMany], total: 1 } }));
  label(h, 'Select PO 292427').props.onChange({ target: { checked: true } });
  assert.match(text(h.render()), /Choose fewer POs or open Pieces/);
  assert.equal(button(h, 'Deliver to customer'), undefined);
});
test('partial quantities and stale versions are not marked as a full PO selection', () => {
  const po = group([parts[0]]);
  const selected = helpers.selectDeliveryPos({}, [po], 'TRANSIT', '', true);
  assert.equal(helpers.deliveryPoSelected(po, selected, 'TRANSIT', ''), true);
  assert.equal(helpers.deliveryPoSelected(po, selection(), 'TRANSIT', ''), false);
  assert.equal(helpers.deliveryPoSelected(group([{ ...parts[0], version: 4 }]), selected, 'TRANSIT', ''), false);
});
test('select all loads every PO page and requests complete POs despite search', async () => {
  const groups = Array.from({ length: 21 }, (_, index) => group([unit(String(4000000 + index), { externalPoId: index + 1, poNumber: String(290000 + index) })]));
  const calls = [];
  const h = harness(props({ initialSearch: '1126830', initial: { ...props().initial, items: groups.slice(0, 20), total: 21 } }), {
    warehouseInventoryByPo: async query => {
      calls.push(query);
      return { ...props().initial, total: 21, page: query.page, items: groups.slice((query.page - 1) * 20, query.page * 20) };
    },
  });
  await click(h, 'Select all matching POs');
  assert.deepEqual(calls.map(query => query.page), [1, 2]);
  assert.ok(calls.every(query => query.completePo === true && query.search === '1126830' && query.view === 'in_transit'));
  click(h, 'Deliver to customer');
  assert.equal(byType(h, 'CustomerDeliveryReceipt').props.delivery.totalPieces, 21);
});
test('warehouse select-all queries remain restricted to the selected store', async () => {
  let query;
  const h = harness(props({ initialSource: 'WAREHOUSE', initialStoreId: '1' }), {
    warehouseInventoryByPo: async value => { query = value; return props().initial; },
  });
  await click(h, 'Select all matching POs');
  assert.equal(query.storeId, '1');
  assert.equal(query.view, 'on_hand');
  assert.equal(query.completePo, true);
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
  expand(h, 'I1126830');
  assert.equal(label(h, 'Deliver parts for I1126830').props.value, '2');
  await assert.rejects(() => byType(h, 'ScanPad').props.onRead('I1126830'), /No more parts/);
});

function typedDoor(overrides = {}) {
  return unit('1126830', {
    inTransit: 0, onHand: 3, unassigned: 0, expectedParts: 3,
    stores: [{ id: 1, name: 'Store 1', isActive: true, onHand: 3 }],
    partTracking: { types: ['DOOR', 'FRAME'], expected: { DOOR: 2, FRAME: 1 }, inTransit: {}, onHand: { DOOR: 2, FRAME: 1 }, unassigned: {}, released: {}, stores: [{ id: 1, parts: { DOOR: 2, FRAME: 1 } }] },
    ...overrides,
  });
}
test('door scans retain the panel/frame breakdown and a third panel cannot complete the selection', async () => {
  const door = typedDoor();
  const h = harness(props({ initialSource: 'WAREHOUSE', initialStoreId: '1', initial: { ...props().initial, items: [group([door])], total: 1 } }), { warehouseUnit: async () => door });
  click(h, 'Select parts by scanning');
  await assert.rejects(() => byType(h, 'ScanPad').props.onRead('I1126830'), error => error.data.code === 'FACTORY_PART_TYPE_REQUIRED');
  for (const code of ['1126830-DOOR', '1126830-DOOR']) {
    const scanner = byType(h, 'ScanPad'); scanner.props.onSaved(await scanner.props.onRead(code));
  }
  await assert.rejects(() => byType(h, 'ScanPad').props.onRead('1126830-DOOR'), /door panels.*already selected/);
  const scanner = byType(h, 'ScanPad'); scanner.props.onSaved(await scanner.props.onRead('1126830-FRAME'));
  click(h, 'Review delivery');
  assert.deepEqual(byType(h, 'CustomerDeliveryReceipt').props.delivery.items[0].parts, { DOOR: 2, FRAME: 1 });
  assert.equal(door.onHand, 3);
});

for (const codes of [['DOOR', 'SIDELITE'], ['SIDELITE', 'DOOR'], ['SIDELITE', 'SIDELITE']])
test(`${codes.join(' + ')} share the panel limit while FRAME remains available`, async () => {
  const door = typedDoor(), original = structuredClone(door), lookups = [];
  const h = harness(props({ initialSource: 'WAREHOUSE', initialStoreId: '1', initial: { ...props().initial, items: [group([door])], total: 1 } }), {
    warehouseUnit: async barcode => { lookups.push(barcode); return door; },
  });
  click(h, 'Select parts by scanning');
  for (const suffix of codes) {
    const scanner = byType(h, 'ScanPad'); scanner.props.onSaved(await scanner.props.onRead(`1126830-${suffix}`));
  }
  assert.deepEqual(lookups, codes.map(suffix => `1126830-${suffix}`));
  for (const suffix of ['DOOR', 'SIDELITE'])
    await assert.rejects(() => byType(h, 'ScanPad').props.onRead(`1126830-${suffix}`), /door panels.*already selected/);
  const scanner = byType(h, 'ScanPad'); scanner.props.onSaved(await scanner.props.onRead('1126830-FRAME'));
  click(h, 'Review delivery');
  const receipt = byType(h, 'CustomerDeliveryReceipt').props.delivery;
  assert.deepEqual(receipt.items[0].parts, { DOOR: 2, FRAME: 1 });
  assert.equal(receipt.totalParts, 3);
  assert.deepEqual(door, original);
});
test('partial typed deliveries require the actual components and preserve earlier untyped quantities', () => {
  const door = typedDoor();
  assert.throws(() => helpers.deliveryItems({ [door.lineNumber]: { unit: door, quantity: '1' } }, 'WAREHOUSE', '1'), /Choose how many/);
  assert.deepEqual(helpers.deliveryItems({ [door.lineNumber]: { unit: door, quantity: '1', parts: { FRAME: 1 } } }, 'WAREHOUSE', '1')[0].parts, { FRAME: 1 });
  const earlier = typedDoor({ partTracking: { ...door.partTracking, onHand: { UNKNOWN: 3 }, stores: [{ id: 1, parts: { UNKNOWN: 3 } }] } });
  assert.deepEqual(helpers.deliveryItems({ [earlier.lineNumber]: { unit: earlier, quantity: '3', parts: { DOOR: 2, FRAME: 1 } } }, 'WAREHOUSE', '1')[0].parts, { DOOR: 2, FRAME: 1 });
  assert.deepEqual(earlier.partTracking.onHand, { UNKNOWN: 3 });
  assert.throws(() => helpers.deliveryItems({ [earlier.lineNumber]: { unit: earlier, quantity: '3', parts: { DOOR: 2, FRAME: 1, UNKNOWN: 1 } } }, 'WAREHOUSE', '1'), /available quantities/);
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

const embeddedProps = (extra = {}) => props({
  initialPoKey: 'external:1', autoReviewPo: true,
  embedded: { pickupRunId: 44, onClose() {}, onComplete() {} }, ...extra,
});
function savedReceipt(body, id = 81) {
  return {
    id, source: body.source, storeId: null, storeName: null, firstName: body.firstName,
    lastName: body.lastName, signatureStrokes: body.signatureStrokes,
    items: body.items.map(item => ({ ...parts.find(part => part.barcode === item.barcode), quantity: item.quantity })),
    totalPieces: body.items.length, totalParts: body.items.reduce((sum, item) => sum + item.quantity, 0),
    actor: 'Test administrator', createdAt: '2026-10-14T12:00:00.000Z',
  };
}

test('embedded pickup opens the exact PO receipt and cannot browse unrelated POs', () => {
  const h = harness(embeddedProps());
  const receipt = byType(h, 'CustomerDeliveryReceipt').props.delivery;
  assert.deepEqual(receipt.items.map(item => item.lineNumber), ['1126830']);
  assert.equal(receipt.totalParts, 2);
  assert.equal(byType(h, 'ScanPad'), undefined);
  click(h, 'Back to selection');
  assert.ok(label(h, 'Select PO 292427'));
  assert.equal(label(h, 'Select PO 292759'), undefined);
  assert.equal(label(h, 'Search delivery POs'), undefined);
  assert.equal(button(h, 'Select all matching POs'), undefined);
  assert.equal(byType(h, 'Pagination'), undefined);
  assert.equal(button(h, 'From warehouse'), undefined);
});

test('embedded pickup never substitutes a different PO when the requested one is missing', () => {
  const h = harness(embeddedProps({ initialPoKey: 'external:999' }));
  assert.equal(byType(h, 'CustomerDeliveryReceipt'), undefined);
  assert.equal(label(h, 'Select PO 292427'), undefined);
  assert.equal(label(h, 'Select PO 292759'), undefined);
  assert.equal(button(h, 'Confirm signed delivery'), undefined);
  assert.match(text(h.render()), /no collected parts available/);
});

test('embedded pickup saves the signed receipt in place and only continues on request', async () => {
  let closed = 0, completed, destination, body;
  const h = harness(embeddedProps({ embedded: { pickupRunId: 44, onClose() { closed++; }, onComplete(value) { completed = value; } } }), {
    warehouseDeliverToCustomer: async request => { body = structuredClone(request); return savedReceipt(request); },
  }, { replace(value) { destination = value; } });
  sign(h); await click(h, 'Confirm signed delivery');
  assert.equal(body.pickupRunId, 44);
  assert.equal(body.items.length, 1);
  assert.equal(destination, undefined);
  assert.equal(completed, undefined);
  assert.equal(closed, 0);
  assert.equal(byType(h, 'CustomerDeliveryReceipt').props.delivery.id, 81);
  assert.equal(button(h, 'Back to pickup'), undefined);
  assert.equal(storage.size, 1);
  click(h, 'Continue pickup');
  assert.equal(completed.id, 81);
  assert.equal(storage.size, 0);
});

test('embedded pickup blocks exit during an ambiguous request and recovers unchanged data', async () => {
  let closed = 0; const bodies = [];
  const h = harness(embeddedProps({ embedded: { pickupRunId: 44, onClose() { closed++; }, onComplete() {} } }), {
    warehouseDeliverToCustomer: async body => { bodies.push(structuredClone(body)); throw new Error('Response lost'); },
  });
  sign(h); await click(h, 'Confirm signed delivery');
  assert.equal(button(h, 'Back to pickup').props.disabled, true);
  button(h, 'Back to pickup').props.onClick();
  assert.equal(closed, 0);
  const recovered = harness(embeddedProps({ initialPoKey: 'order:1', embedded: { pickupRunId: 99, onClose() {}, onComplete() {} } }), {
    warehouseDeliverToCustomer: async body => { bodies.push(structuredClone(body)); return savedReceipt(body); },
  });
  assert.deepEqual(byType(recovered, 'CustomerDeliveryReceipt').props.delivery.items.map(item => item.lineNumber), ['1126830']);
  await click(recovered, 'Check delivery');
  assert.deepEqual(bodies[1], bodies[0]);
  assert.equal(bodies[1].pickupRunId, 44);
});

test('embedded pickup can close before submitting without releasing any parts', () => {
  let closed = 0, writes = 0;
  const h = harness(embeddedProps({ embedded: { pickupRunId: 44, onClose() { closed++; }, onComplete() {} } }), {
    warehouseDeliverToCustomer: async () => { writes++; },
  });
  click(h, 'Back to pickup');
  assert.equal(closed, 1);
  assert.equal(writes, 0);
});

test('embedded pickup honors an active count and does not auto-open an invalid large PO', () => {
  const counted = harness(embeddedProps({ initial: { ...props().initial, activeCountId: 9 } }));
  assert.equal(byType(counted, 'CustomerDeliveryReceipt'), undefined);
  assert.equal(button(counted, 'Deliver to customer').props.disabled, true);
  const oversized = group(Array.from({ length: 501 }, (_, index) => unit(String(7000000 + index))));
  const h = harness(embeddedProps({ initial: { ...props().initial, items: [oversized], total: 1 } }));
  assert.equal(byType(h, 'CustomerDeliveryReceipt'), undefined);
  assert.equal(button(h, 'Confirm signed delivery'), undefined);
  assert.match(text(h.render()), /at most 500 pieces/);
});

test('embedded pickup refuses a new delivery while a live count blocks it', async () => {
  let writes = 0;
  const h = harness(embeddedProps({ embedded: { pickupRunId: 44, blocked: true, onClose() {}, onComplete() {} } }), {
    warehouseDeliverToCustomer: async () => { writes++; },
  });
  sign(h);
  assert.equal(button(h, 'Confirm signed delivery').props.disabled, true);
  await button(h, 'Confirm signed delivery').props.onClick();
  assert.equal(writes, 0);
});

for (const status of [403, 409]) test(`embedded inventory rejection (${status}) requires refreshing the pickup before another signature`, async () => {
  let closed = 0;
  const h = harness(embeddedProps({ embedded: { pickupRunId: 44, onClose() { closed++; }, onComplete() {} } }), {
    warehouseDeliverToCustomer: async () => { throw new ApiError('Stock changed', status); },
  });
  sign(h); await click(h, 'Confirm signed delivery');
  assert.equal(button(h, 'Back to selection'), undefined);
  sign(h); assert.equal(button(h, 'Confirm signed delivery').props.disabled, true);
  assert.match(text(h.render()), /Return to the pickup and reopen this PO/);
  click(h, 'Back to pickup');
  assert.equal(closed, 1);
});

test('reloading a saved embedded receipt recovers the same delivery before continuing pickup', async () => {
  const bodies = []; let completed;
  const options = embeddedProps({ embedded: { pickupRunId: 44, onClose() {}, onComplete(value) { completed = value; } } });
  const api = { warehouseDeliverToCustomer: async body => { bodies.push(structuredClone(body)); return savedReceipt(body); } };
  const first = harness(options, api);
  sign(first); await click(first, 'Confirm signed delivery');
  assert.equal(storage.size, 1);
  assert.equal(completed, undefined);
  const reloaded = harness({ ...options, initial: { ...props().initial, items: [], total: 0 } }, api);
  assert.equal(button(reloaded, 'Confirm signed delivery'), undefined);
  await click(reloaded, 'Check delivery');
  assert.deepEqual(bodies[1], bodies[0]);
  assert.equal(byType(reloaded, 'CustomerDeliveryReceipt').props.delivery.id, 81);
  assert.equal(storage.size, 1);
  click(reloaded, 'Continue pickup');
  assert.equal(completed.id, 81);
  assert.equal(storage.size, 0);
});

test('technician warehouse handoff keeps selection, signature and replay on technician endpoints', async () => {
  const user = { id: 10, role: { name: 'technician' } }, writes = [], redirects = [];
  const auth = { user, revalidate: async () => user };
  const api = { technicianDeliverToCustomer: async body => { writes.push(structuredClone(body)); if (writes.length === 1) throw new Error('Lost response'); return { id: 92, source: 'WAREHOUSE' }; }, warehouseDeliverToCustomer: async () => { throw new Error('Admin endpoint used'); } };
  const input = props({ technician: true, actorRole: 'technician', initialSource: 'WAREHOUSE', initialStoreId: '1' });
  const h = harness(input, api, { replace: value => redirects.push(value) }, auth);
  assert.equal(button(h, 'Directly from factory'), undefined);
  for (const link of nodes(h.render(), node => node.type === 'a')) assert.match(link.props.href, /^\/technician/);
  select(h, 'I1126830'); click(h, 'Review delivery'); sign(h);
  await click(h, 'Confirm signed delivery');
  assert.ok(storage.has('technician-store-customer-delivery:10'));
  const restored = harness(input, api, { replace: value => redirects.push(value) }, auth);
  await click(restored, 'Check delivery');
  assert.deepEqual(writes[0], writes[1]); assert.equal(writes[0].source, 'WAREHOUSE'); assert.equal(writes[0].storeId, 1); assert.deepEqual(writes[0].signatureStrokes, signature);
  assert.deepEqual(redirects, ['/technician/customer-deliveries/92']);
});

(async () => {
  for (const { name, run } of tests) { storage.clear(); await run(); process.stdout.write(`PASS ${name}\n`); }
  process.stdout.write(`${tests.length} customer delivery checks passed.\n`);
})().catch(error => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
