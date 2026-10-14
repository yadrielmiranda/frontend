/* Offline PO receipt checks. No server, network, database or real inventory changes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '../src');
const tests = [], test = (name, run) => tests.push({ name, run });
let nextKey = 0;
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
function harness(initial = inventory(), api = {}) {
  const states = [], refs = [], cache = new Map(); let si = 0, ri = 0;
  const hooks = {
    useState(value) { const index = si++; if (!(index in states)) states[index] = typeof value === 'function' ? value() : value; return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; },
    useRef(value) { const index = ri++; if (!(index in refs)) refs[index] = { current: value }; return refs[index]; },
    useCallback(value) { return value; }, useEffect() {},
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
  return { render() { si = 0; ri = 0; return Component({ initial, initialStores: stores }); } };
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
test('installation delivery still excludes external POs and multiple destinations', () => {
  const order = id => group([unit(String(4000000 + id), { source: 'ORDER', externalPoId: null, orderId: id, orderNumber: `SO-${id}`, poNumber: String(290000 + id), installation: { id, address: `Address ${id}` } })]);
  const h = harness(inventory([group(pieces), order(1), order(2)]));
  click(h, 'Deliver to installation');
  assert.equal(label(h, 'Select PO 292427').props.disabled, true);
  selectPo(h, '290001'); assert.equal(button(h, 'Deliver selected').props.disabled, false);
  selectPo(h, '290002'); assert.equal(button(h, 'Deliver selected').props.disabled, true);
  assert.match(text(h.render()), /Select parts for one installation/);
});
test('invalid partial quantities cannot be confirmed', () => {
  const h = harness(); store(h, 1); selectPo(h); expand(h);
  for (const value of ['0', '1.5', '5', '']) {
    label(h, 'Quantity to receive for I1126830').props.onChange({ target: { value } });
    assert.equal(button(h, 'Receive selected').props.disabled, true);
  }
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
