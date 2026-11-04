/* Offline PO receipt checks. No server, network, database or real inventory changes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '../src');
const tests = [], test = (name, run) => tests.push({ name, run });
let nextKey = 0;
const browserStorage = new Map();
global.sessionStorage = { getItem: key => browserStorage.get(key) ?? null, setItem: (key, value) => browserStorage.set(key, value), removeItem: key => browserStorage.delete(key) };
global.window = { addEventListener() {}, removeEventListener() {} };
global.document = { visibilityState: 'visible' };
const stores = [{ id: 1, name: 'Store 1', isActive: true }, { id: 2, name: 'Store 2', isActive: true }];
function unit(lineNumber, overrides = {}) {
  return { lineNumber, barcode: `I${lineNumber}`, version: 3, source: 'EXTERNAL', externalPoId: 1, orderId: null, orderNumber: '', poNumber: '292427', customer: '', project: 'Santos', product: 'French Door', description: 'French door', mark: '', system: '600', configuration: 'X', installation: null, inTransit: 4, onHand: 0, unassigned: 0, stores: [], expectedParts: 4, ...overrides };
}
function group(units) {
  const first = units[0];
  return { key: first.source === 'EXTERNAL' ? `external:${first.externalPoId}` : `order:${first.orderId}`, source: first.source, externalPoId: first.externalPoId, orderId: first.orderId, orderNumber: first.orderNumber, poNumber: first.poNumber, customer: first.customer, project: first.project, units };
}
const pieces = [unit('1126830'), unit('1126835', { inTransit: 2 })];
const inventory = (items = [group(structuredClone(pieces))], extra = {}) => ({ items, total: items.length, page: 1, pageSize: 20, activeCountId: null, summary: {}, ...extra });
function harness(initial = inventory(), api = {}, props = {}, runEffects = false) {
  const states = [], refs = [], effects = [], callbacks = [], cache = new Map(); let si = 0, ri = 0, ei = 0, ci = 0, dirty = false, queued = [];
  const changed = (left, right) => !left || !right || left.length !== right.length || left.some((value, index) => value !== right[index]);
  const hooks = {
    useState(value) { const index = si++; if (!(index in states)) states[index] = typeof value === 'function' ? value() : value; return [states[index], next => { const value = typeof next === 'function' ? next(states[index]) : next; if (states[index] !== value) dirty = true; states[index] = value; }]; },
    useRef(value) { const index = ri++; if (!(index in refs)) refs[index] = { current: value }; return refs[index]; },
    useCallback(value, deps) { const index = ci++; if (changed(callbacks[index]?.deps, deps)) callbacks[index] = { value, deps }; return callbacks[index].value; },
    useEffect(value, deps) { const index = ei++; if (runEffects && changed(effects[index]?.deps, deps)) { const previous = effects[index]; effects[index] = { deps }; queued.push(() => { previous?.cleanup?.(); effects[index].cleanup = value(); }); } },
  };
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const module = { exports: {} };
    function resolve(id) {
      if (id === 'react') return { ...React, ...hooks };
      if (id === 'react/jsx-runtime') return require(id);
      if (id === 'next/link') return { default: 'a', __esModule: true };
      if (id === 'lucide-react' || id.startsWith('@/components/ui/')) return new Proxy({}, { get: (_, name) => name });
      if (id === '@/app/api/warehouse.api') return { warehouseRequestKey: () => `receipt-${++nextKey}`, warehouseStores: async () => stores, warehouseInventoryByPo: async () => initial, ...api };
      if (id === '../warehouse-shared') return { CountNotice: 'CountNotice', Pagination: 'Pagination', errorMessage: error => error.message };
      if (id === '../store-select') return { StoreSelect: 'StoreSelect' };
      if (id === '../unit-origin') return { UnitOrigin: 'UnitOrigin', ExternalDescription: 'ExternalDescription' };
      if (id === '../customer-deliveries/customer-delivery-client') return { CustomerDeliveryClient: 'CustomerDeliveryClient' };
      const base = id.startsWith('@/') ? path.resolve(root, id.slice(2)) : id.startsWith('.') ? path.resolve(path.dirname(filename), id) : null;
      if (!base) return require(id);
      const found = ['.ts', '.tsx'].map(ext => base + ext).find(file => fs.existsSync(file));
      if (!found) throw new Error(`Cannot resolve ${id}`);
      return load(path.relative(root, found));
    }
    new Function('require', 'module', 'exports', compiled)(resolve, module, module.exports);
    cache.set(filename, module.exports); return module.exports;
  }
  const Component = load('app/warehouse/receipts/receipts-client.tsx').ReceiptsClient;
  return { render() {
    let tree;
    for (let attempt = 0; attempt < 10; attempt++) {
      si = 0; ri = 0; ei = 0; ci = 0; dirty = false; queued = [];
      tree = Component({ actorId: 10, actorRole: 'admin', initial, initialStores: stores, ...props });
      const original = { setTimeout, clearTimeout, setInterval, clearInterval };
      try {
        global.setTimeout = global.setInterval = () => 1; global.clearTimeout = global.clearInterval = () => {};
        queued.forEach(effect => effect());
      } finally { Object.assign(global, original); }
      if (!dirty) return tree;
    }
    throw new Error('Receipt test render did not settle.');
  } };
}
function nodes(element, predicate, result = []) {
  if (typeof element?.type === 'function' && element.type.name === 'FactoryPartQuantity')
    return nodes(element.type(element.props), predicate, result);
  if (Array.isArray(element)) { element.forEach(child => nodes(child, predicate, result)); return result; }
  if (!element || typeof element !== 'object') return result;
  if (predicate(element)) result.push(element);
  nodes(element.props?.children, predicate, result); return result;
}
const text = element => typeof element === 'string' || typeof element === 'number' ? String(element) : Array.isArray(element) ? element.map(text).join('') : element?.props ? text(element.props.children) : '';
const label = (h, value) => nodes(h.render(), node => node.props?.['aria-label'] === value)[0];
const byType = (h, type) => nodes(h.render(), node => node.type === type)[0];
const button = (h, value) => nodes(h.render(), node => node.type === 'Button' && text(node) === value)[0];
function click(h, value) { const item = button(h, value); assert.ok(item, `Missing ${value}`); assert.ok(!item.props.disabled, `Disabled ${value}`); return item.props.onClick(); }
function selectPo(h, po = '292427', checked = true) { const input = label(h, `Select PO ${po}`); assert.ok(!input.props.disabled); input.props.onChange({ target: { checked } }); }
function store(h, id) { byType(h, 'StoreSelect').props.onChange(String(id)); }
function expand(h, po = '292427') { label(h, `Show pieces for PO ${po}`).props.onClick(); }

test('pending POs show recognizable names without entering a PO number', () => {
  const h = harness();
  assert.ok(label(h, 'Select PO 292427'));
  assert.match(text(h.render()), /Santos/);
  assert.equal(label(h, 'Search pending receipts').props.value, '');
  assert.equal(label(h, 'Select I1126830'), undefined);
  assert.equal(byType(h, 'Pagination').props.label, 'POs');
});
test('one PO selection receives every collected line beyond the old piece page limit', async () => {
  const units = Array.from({ length: 75 }, (_, i) => unit(String(2000000 + i), { inTransit: 2 }));
  let request;
  const h = harness(inventory([group(units)]), { warehouseReceive: async (storeId, items) => { request = { storeId, items }; return { parts: 150, units: 75, storeName: 'Store 1' }; } });
  store(h, 1); selectPo(h); click(h, 'Receive selected'); await click(h, 'Confirm receipt');
  assert.equal(request.storeId, 1); assert.equal(request.items.length, 75);
  assert.ok(request.items.every(item => item.quantity === 2 && item.version === 3));
});
test('one PO can be split between stores, leaving only the unreceived remainder', async () => {
  let remaining = structuredClone(pieces);
  const requests = [];
  const h = harness(inventory(), {
    warehouseReceive: async (storeId, items, key) => {
      requests.push({ storeId, items: structuredClone(items), key });
      for (const item of items) {
        const line = remaining.find(unit => unit.barcode === item.barcode);
        assert.equal(item.version, line.version); assert.ok(item.quantity <= line.inTransit);
        line.inTransit -= item.quantity; line.version++;
      }
      const parts = items.reduce((sum, item) => sum + item.quantity, 0);
      return { parts, units: items.length, storeName: `Store ${storeId}` };
    },
    warehouseInventoryByPo: async () => {
      const units = remaining.filter(unit => unit.inTransit > 0);
      return inventory(units.length ? [group(structuredClone(units))] : []);
    },
  });
  store(h, 1); selectPo(h); expand(h);
  label(h, 'Quantity to receive for I1126830').props.onChange({ target: { value: '1' } });
  label(h, 'Select I1126835').props.onChange({ target: { checked: false } });
  assert.equal(label(h, 'Select PO 292427').props.checked, false);
  assert.equal(label(h, 'Select PO 292427').props['aria-checked'], 'mixed');
  click(h, 'Receive selected'); await click(h, 'Confirm receipt');
  assert.equal(button(h, 'Receive selected').props.disabled, true);
  assert.equal(label(h, 'Select PO 292427').props.checked, false);
  assert.deepEqual(requests[0].items, [{ barcode: 'I1126830', version: 3, quantity: 1 }]);
  store(h, 2); selectPo(h); click(h, 'Receive selected'); await click(h, 'Confirm receipt');
  assert.deepEqual(requests[1].items, [{ barcode: 'I1126830', version: 4, quantity: 3 }, { barcode: 'I1126835', version: 3, quantity: 2 }]);
  assert.notEqual(requests[0].key, requests[1].key);
  assert.equal(requests[1].storeId, 2);
  assert.equal(remaining.reduce((sum, unit) => sum + unit.inTransit, 0), 0);
  assert.equal(label(h, 'Select PO 292427'), undefined);
});
test('selecting one PO never receives parts of a different PO', async () => {
  let items;
  const second = group([unit('1126999', { externalPoId: 2, poNumber: '292759' })]);
  const h = harness(inventory([group(pieces), second]), { warehouseReceive: async (_, value) => { items = value; return { parts: 6, units: 2, storeName: 'Store 1' }; } });
  store(h, 1); selectPo(h); click(h, 'Receive selected'); await click(h, 'Confirm receipt');
  assert.deepEqual(items.map(item => item.barcode), ['I1126830', 'I1126835']);
});
test('a partial receipt carries the chosen frame instead of an interchangeable total', async () => {
  let received;
  const door = unit('1126830', {
    inTransit: 3,
    partTracking: { types: ['DOOR', 'FRAME'], expected: { DOOR: 2, FRAME: 1 }, inTransit: { DOOR: 2, FRAME: 1 }, onHand: {}, unassigned: {}, released: {}, stores: [] },
  });
  const h = harness(inventory([group([door])]), { warehouseReceive: async (_, items) => { received = items; return { parts: 1, units: 1, storeName: 'Store 1' }; } });
  store(h, 1); selectPo(h); expand(h);
  label(h, 'Door panels — Quantity to receive for I1126830').props.onChange({ target: { value: '0' } });
  click(h, 'Receive selected'); await click(h, 'Confirm receipt');
  assert.deepEqual(received, [{ barcode: 'I1126830', version: 3, quantity: 1, parts: { FRAME: 1 } }]);
  assert.equal(door.inTransit, 3);
});
test('select-all requests complete POs and visits every PO page', async () => {
  const groups = Array.from({ length: 21 }, (_, i) => group([unit(String(3000000 + i), { externalPoId: i + 1, poNumber: String(290000 + i) })]));
  const calls = []; let items;
  const h = harness(inventory(groups.slice(0, 20), { total: 21 }), {
    warehouseInventoryByPo: async query => { calls.push(query); return inventory(groups.slice((query.page - 1) * 20, query.page * 20), { total: 21 }); },
    warehouseReceive: async (_, value) => { items = value; return { parts: 84, units: 21, storeName: 'Store 1' }; },
  });
  store(h, 1); await click(h, 'Select all 21 matching POs');
  assert.deepEqual(calls.map(call => call.page), [1, 2]);
  assert.ok(calls.every(call => call.completePo === true && call.view === 'in_transit'));
  click(h, 'Receive selected'); await click(h, 'Confirm receipt');
  assert.equal(items.length, 21);
});
test('installation delivery accepts external POs but keeps confirmations within one source', () => {
  const order = id => group([unit(String(4000000 + id), { source: 'ORDER', externalPoId: null, orderId: id, orderNumber: `SO-${id}`, poNumber: String(290000 + id), installation: { id, address: `Address ${id}` } })]);
  const h = harness(inventory([group(pieces), order(1), order(2)]));
  click(h, 'Deliver to installation');
  assert.equal(label(h, 'Select PO 292427').props.disabled, false);
  selectPo(h, '290001'); assert.equal(button(h, 'Deliver selected').props.disabled, false);
  selectPo(h, '290002'); assert.equal(button(h, 'Deliver selected').props.disabled, true);
  assert.match(text(h.render()), /Select parts from one PO/);
});

test('external PO delivery records its selected parts without requiring an installation or store', async () => {
  let request;
  const h = harness(inventory(), { warehouseDeliverToInstallation: async value => {
    request = value; return { parts: 6, units: 2, installation: null, replayed: false };
  } });
  click(h, 'Deliver to installation'); selectPo(h); expand(h);
  assert.equal(label(h, 'Select I1126830').props.disabled, false);
  assert.equal(byType(h, 'StoreSelect'), undefined);
  click(h, 'Deliver selected'); await click(h, 'Confirm delivery');
  assert.equal('installationJobId' in request, false);
  assert.equal('installationAddress' in request, false);
  assert.deepEqual(request.items, [
    { barcode: 'I1126830', version: 3, quantity: 4 },
    { barcode: 'I1126835', version: 3, quantity: 2 },
  ]);
  assert.match(text(h.render()), /6 parts delivered for PO 292427/);
  assert.doesNotMatch(text(h.render()), /installation #undefined|at undefined|confirmed installation address/);
});

test('an internal installation without an address or without a job can still be delivered', async () => {
  for (const installation of [{ id: 9, address: '' }, null]) {
    let request;
    const order = group([unit('4000001', { source: 'ORDER', externalPoId: null, orderId: 2, orderNumber: 'ORD-1002', poNumber: '293540', installation })]);
    const h = harness(inventory([order]), { warehouseDeliverToInstallation: async value => {
      request = value; return { parts: 4, units: 1, installation, replayed: false };
    } });
    click(h, 'Deliver to installation'); selectPo(h, '293540');
    click(h, 'Deliver selected'); await click(h, 'Confirm delivery');
    assert.equal(request.installationJobId, installation?.id);
    assert.equal(request.installationAddress, installation?.address);
    assert.match(text(h.render()), /4 parts delivered for PO 293540/);
    if (installation) assert.match(text(h.render()), /Installation #9/);
  }
});

test('a known destination is shown and sent with the same reviewed quantities', async () => {
  let request;
  const installation = { id: 9, address: '123 Example Street, Miami, FL 33101' };
  const order = group([unit('4000001', { source: 'ORDER', externalPoId: null, orderId: 2, orderNumber: 'ORD-1002', poNumber: '293540', installation })]);
  const h = harness(inventory([order]), { warehouseDeliverToInstallation: async value => { request = value; return { parts: 4, units: 1, installation }; } });
  click(h, 'Deliver to installation'); selectPo(h, '293540'); click(h, 'Deliver selected');
  assert.match(text(h.render()), /123 Example Street/);
  await click(h, 'Confirm delivery');
  assert.equal(request.installationJobId, 9); assert.equal(request.installationAddress, installation.address);
});

test('matching numeric internal and external IDs do not combine two source POs', () => {
  const order = group([unit('4000001', { source: 'ORDER', externalPoId: null, orderId: 1, orderNumber: 'ORD-1', poNumber: '293540' })]);
  const h = harness(inventory([group(pieces), order]));
  click(h, 'Deliver to installation'); selectPo(h); selectPo(h, '293540');
  assert.equal(button(h, 'Deliver selected').props.disabled, true);
  assert.match(text(h.render()), /Select parts from one PO/);
});

test('partial external delivery preserves frame quantities and retries the same confirmation', async () => {
  const calls = [];
  const door = unit('1126830', { inTransit: 3,
    partTracking: { types: ['DOOR', 'FRAME'], expected: { DOOR: 2, FRAME: 1 }, inTransit: { DOOR: 2, FRAME: 1 }, onHand: {}, unassigned: {}, released: {}, stores: [] },
  });
  const h = harness(inventory([group([door])]), { warehouseDeliverToInstallation: async value => {
    calls.push(structuredClone(value));
    if (calls.length === 1) throw new Error('Lost response');
    return { parts: 1, units: 1, installation: null, replayed: true };
  } });
  click(h, 'Deliver to installation'); selectPo(h); expand(h);
  label(h, 'Door panels — Quantity to deliver for I1126830').props.onChange({ target: { value: '0' } });
  click(h, 'Deliver selected'); await click(h, 'Confirm delivery'); await click(h, 'Confirm delivery');
  assert.deepEqual(calls[0], calls[1]);
  assert.deepEqual(calls[0].items, [{ barcode: 'I1126830', version: 3, quantity: 1, parts: { FRAME: 1 } }]);
  assert.match(text(h.render()), /Already recorded; no duplicate was added/);
});
test('invalid partial quantities cannot be confirmed', () => {
  const h = harness(); store(h, 1); selectPo(h); expand(h);
  for (const value of ['0', '1.5', '5', '']) {
    label(h, 'Quantity to receive for I1126830').props.onChange({ target: { value } });
    assert.equal(button(h, 'Receive selected').props.disabled, true);
  }
});
test('customer destination stays in pending receipt and preserves an exact partial frame selection', () => {
  const door = unit('1126830', { inTransit: 3,
    partTracking: { types: ['DOOR', 'FRAME'], expected: { DOOR: 2, FRAME: 1 }, inTransit: { DOOR: 2, FRAME: 1 }, onHand: {}, unassigned: {}, released: {}, stores: [] },
  });
  const h = harness(inventory([group([door])]), {}, { actorRole: 'operator' });
  selectPo(h); expand(h);
  label(h, 'Door panels — Quantity to receive for I1126830').props.onChange({ target: { value: '0' } });
  const destination = button(h, 'Deliver directly to customer'); assert.equal(destination.props.asChild, undefined);
  click(h, 'Deliver directly to customer');
  assert.equal(byType(h, 'StoreSelect'), undefined); assert.equal(button(h, 'From warehouse'), undefined); assert.equal(button(h, 'Directly from factory'), undefined);
  assert.equal(label(h, 'Frames — Quantity to deliver for I1126830').props.value, 1);
  click(h, 'Review delivery'); const child = byType(h, 'CustomerDeliveryClient');
  assert.equal(child.props.initialSource, 'TRANSIT'); assert.equal(child.props.initialStoreId, ''); assert.deepEqual(child.props.initialStores, []);
  assert.equal(child.props.actorRole, 'operator');
  assert.deepEqual(child.props.pendingReceipt.selection['1126830'].parts, { DOOR: 0, FRAME: 1 });
  assert.equal(child.props.pendingReceipt.selection['1126830'].quantity, '1'); assert.equal(child.props.pendingReceipt.selection['1126830'].unit.version, 3);
  assert.equal(label(h, 'Select PO 292427').props.disabled, true);
  child.props.pendingReceipt.onClose(); assert.ok(byType(h, 'CustomerDeliveryClient'), 'initializing review cannot be dismissed');
  child.props.pendingReceipt.onBusyChange(false); child.props.pendingReceipt.onClose();
  assert.equal(byType(h, 'CustomerDeliveryClient'), undefined); assert.equal(label(h, 'Frames — Quantity to deliver for I1126830').props.value, 1);
  click(h, 'Receive at warehouse'); assert.equal(label(h, 'Frames — Quantity to receive for I1126830').props.value, 1);
});

test('customer modal cannot dismiss an uncertain confirmation and completion clears only the reviewed selection', async () => {
  const reads = []; const h = harness(inventory(), { warehouseInventoryByPo: async query => { reads.push(query); return inventory([]); } });
  click(h, 'Deliver directly to customer'); selectPo(h); click(h, 'Review delivery');
  const child = byType(h, 'CustomerDeliveryClient'); child.props.pendingReceipt.onBusyChange(true);
  const dialog = nodes(h.render(), node => node.type === 'Dialog' && nodes(node, child => child.type === 'CustomerDeliveryClient').length)[0];
  dialog.props.onOpenChange(false); assert.ok(byType(h, 'CustomerDeliveryClient'));
  let prevented = 0; const content = nodes(h.render(), node => node.type === 'DialogContent' && nodes(node, child => child.type === 'CustomerDeliveryClient').length)[0];
  content.props.onEscapeKeyDown({ preventDefault() { prevented++; } }); content.props.onInteractOutside({ preventDefault() { prevented++; } }); assert.equal(prevented, 2);
  child.props.pendingReceipt.onComplete({ id: 81, totalParts: 6 }); await Promise.resolve(); await Promise.resolve();
  assert.equal(byType(h, 'CustomerDeliveryClient'), undefined); assert.match(text(h.render()), /Receipt #81 is saved/);
  assert.equal(button(h, 'Review delivery').props.disabled, true); assert.ok(reads.every(query => query.view === 'in_transit'));
});

test('existing transit confirmation reopens inside pending receipt even with no currently available parts', () => {
  browserStorage.clear(); browserStorage.set('warehouse-customer-delivery:10', JSON.stringify({ body: { requestKey: 'same-request', source: 'TRANSIT', items: [] }, receipt: { items: [] } }));
  const h = harness(inventory([]), {}, {}, true);
  const child = byType(h, 'CustomerDeliveryClient'); assert.ok(child); assert.equal(child.props.initialSource, 'TRANSIT');
  assert.equal(button(h, 'Deliver directly to customer').props['aria-pressed'], true);
  assert.equal(child.props.pendingReceipt.selection && Object.keys(child.props.pendingReceipt.selection).length, 0);
  assert.ok(browserStorage.has('warehouse-customer-delivery:10')); browserStorage.clear();
});

test('other-source recovery is never silently opened or overwritten as a transit delivery', () => {
  const saved = JSON.stringify({ body: { requestKey: 'warehouse-request', source: 'WAREHOUSE', items: [] }, receipt: { items: [] } });
  browserStorage.set('warehouse-customer-delivery:10', saved);
  const h = harness(inventory(), {}, {}, true); assert.equal(byType(h, 'CustomerDeliveryClient'), undefined);
  assert.equal(browserStorage.get('warehouse-customer-delivery:10'), saved); browserStorage.clear();
});

test('customer deep-link selects only its exact PO source and never jumps straight to signing', () => {
  const other = group([unit('99001', { source: 'ORDER', orderId: 1, externalPoId: null, poNumber: '292427' })]);
  const h = harness(inventory([group(pieces), other]), {}, { initialDestination: 'customer', initialPoKey: 'order:1', initialSearch: '292427' });
  assert.equal(label(h, 'Search pending receipts').props.value, '292427');
  assert.equal(byType(h, 'CustomerDeliveryClient'), undefined); click(h, 'Review delivery');
  assert.deepEqual(Object.keys(byType(h, 'CustomerDeliveryClient').props.pendingReceipt.selection), ['99001']);
});

test('uncertain receipt retries the same key and quantity without duplicate click writes', async () => {
  let resolve; const calls = [];
  const h = harness(inventory(), { warehouseReceive: async (storeId, items, key) => {
    calls.push({ storeId, items: structuredClone(items), key });
    if (calls.length === 1) return new Promise((_, reject) => { resolve = () => reject(new Error('Lost response')); });
    return { parts: 6, units: 2, storeName: 'Store 1', replayed: true };
  } });
  store(h, 1); selectPo(h); click(h, 'Receive selected');
  const confirm = button(h, 'Confirm receipt').props.onClick;
  const a = confirm(), b = confirm(); assert.equal(calls.length, 1);
  resolve(); await Promise.all([a, b]); await click(h, 'Confirm receipt');
  assert.deepEqual(calls[0], calls[1]);
});

(async () => { for (const { name, run } of tests) { await run(); process.stdout.write(`PASS ${name}\n`); } process.stdout.write(`${tests.length} warehouse PO receipt checks passed.\n`); })().catch(error => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
