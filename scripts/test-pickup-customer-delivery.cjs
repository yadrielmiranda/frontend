/* Offline factory pickup delivery integration: synthetic stock, no servers or database writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '../src/app/technician');
const tests = [], test = (name, run) => tests.push({ name, run });
const storage = new Map();
global.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
global.localStorage = { getItem: () => null };
global.window = { setInterval: () => 1, clearInterval() {} };

function load(file, mocks) {
  const filename = path.join(root, file), module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  new Function('require', 'module', 'exports', code)(id => {
    if (id in mocks) return mocks[id];
    if (id === 'react/jsx-runtime') return require(id);
    if (id === 'lucide-react' || id.startsWith('@/components/ui/')) return new Proxy({}, { get: (_, name) => name });
    throw new Error(`Unexpected dependency ${id}`);
  }, module, module.exports);
  return module.exports;
}
function dataLoader(technician, warehouse) {
  return load('pickup-customer-delivery-data.ts', {
    '@/app/api/technician.api': technician, '@/app/api/warehouse.api': warehouse,
  });
}
const option = { key: 'external:1', poNumber: '292427', lines: [{ lineNumber: '1126830', version: 5, inTransit: 2 }] };
const options = { items: [option], total: 1, page: 1, pageSize: 20, countOpen: false };
const inventory = { items: [{ key: 'external:1', units: [
  { lineNumber: '1126830', version: 5, inTransit: 7 }, { lineNumber: '1126831', version: 1, inTransit: 4 },
] }], total: 1, page: 1, pageSize: 20, activeCountId: null, summary: {} };

test('admin PO uses only this pickup quantities and never includes other collected lines', async () => {
  let queried;
  const { loadPickupCustomerDelivery } = dataLoader({}, {
    warehousePickupCustomerDeliveryOptions: async (id, poKey) => { queried = [id, poKey]; return options; },
    warehouseInventoryByPo: async () => inventory,
  });
  const data = await loadPickupCustomerDelivery('warehouse', 12, 'external:1', '292427');
  assert.deepEqual(queried, [12, 'external:1']);
  assert.deepEqual(data.inventory.items[0].units.map(unit => [unit.lineNumber, unit.inTransit]), [['1126830', 2]]);
});
test('same printed PO number never selects another internal source and searches later pages', async () => {
  const pages = [];
  const { loadPickupCustomerDelivery } = dataLoader({}, {
    warehousePickupCustomerDeliveryOptions: async () => options,
    warehouseInventoryByPo: async query => { pages.push(query.page); return query.page === 1
      ? { ...inventory, items: [{ key: 'order:1', units: inventory.items[0].units }], total: 21 }
      : { ...inventory, total: 21, page: 2 }; },
  });
  const data = await loadPickupCustomerDelivery('warehouse', 12, 'external:1', '292427');
  assert.deepEqual(pages, [1, 2]); assert.equal(data.inventory.items[0].key, 'external:1');
});
test('concurrent inventory changes require fresh review instead of combining mismatched versions', async () => {
  const { loadPickupCustomerDelivery } = dataLoader({}, {
    warehousePickupCustomerDeliveryOptions: async () => options,
    warehouseInventoryByPo: async () => ({ ...inventory, items: [{ key: 'external:1', units: [{ lineNumber: '1126830', version: 6, inTransit: 7 }] }] }),
  });
  await assert.rejects(loadPickupCustomerDelivery('warehouse', 12, 'external:1', '292427'), /available parts changed/);
});
test('technician loader scopes by pickup and exact PO', async () => {
  let query;
  const { loadPickupCustomerDelivery } = dataLoader({ technicianCustomerDeliveryOptions: async value => { query = value; return options; } }, {});
  const data = await loadPickupCustomerDelivery('technician', 12, 'external:1', '292427');
  assert.equal(query.pickupRunId, 12); assert.equal(query.poKey, 'external:1'); assert.equal(data.options.items.length, 1);
});
test('already released parts still allow pending signed-request recovery through an empty form', async () => {
  const { loadPickupCustomerDelivery } = dataLoader({}, {
    warehousePickupCustomerDeliveryOptions: async () => ({ ...options, items: [], total: 0 }),
    warehouseInventoryByPo: async () => { throw new Error('Must not fetch unrelated stock'); },
  });
  const data = await loadPickupCustomerDelivery('warehouse', 12, 'external:1', '292427');
  assert.equal(data.inventory.items.length, 0);
});

const runFixture = () => ({ id: 12, cycle: 1, status: 'ACTIVE', expectedParts: 5, collectedParts: 2, remainingParts: 3,
  poCount: 2, createdBy: { name: 'Admin' }, technicians: [], collectors: [], events: [], startedAt: '2026-10-14T10:00:00Z',
  orders: [{ key: 'external:1', poNumber: '292427', collectedParts: 2, expectedParts: 3, remainingParts: 1 },
    { key: 'order:2', poNumber: '292428', collectedParts: 0, expectedParts: 2, remainingParts: 2 }],
  lines: [{ key: 'external:1', lineNumber: '1126830', collected: 2, inTransit: 2, remaining: 1 },
    { key: 'order:2', lineNumber: '1126831', collected: 0, inTransit: 0, remaining: 2 }],
});
const contextKey = (surface, actorId, runId) => `${surface}-pickup-customer-delivery:${actorId}:${runId}`;
function harness(surface = 'warehouse', overrides = {}) {
  let stateIndex = 0, refIndex = 0, memoIndex = 0, effectIndex = 0;
  const states = [], refs = [], memos = [], effects = [], queue = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const hooks = {
    useState(initial) { const i = stateIndex++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial;
      return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef(initial) { const i = refIndex++; return refs[i] ??= { current: initial }; },
    useCallback(callback, deps) { const i = memoIndex++; if (!same(memos[i]?.deps, deps)) memos[i] = { value: callback, deps }; return memos[i].value; },
    useMemo(callback, deps) { const i = memoIndex++; if (!same(memos[i]?.deps, deps)) memos[i] = { value: callback(), deps }; return memos[i].value; },
    useEffect(callback, deps) { const i = effectIndex++; if (!same(effects[i]?.deps, deps)) { const old = effects[i]; effects[i] = { deps }; queue.push(() => { old?.cleanup?.(); effects[i].cleanup = callback(); }); } },
  };
  const calls = { reads: [], scans: [], finishes: 0 }, run = runFixture();
  const pickup = async id => { calls.reads.push(id); return structuredClone(run); };
  const scan = async (...args) => { calls.scans.push(args); return { kind: 'COLLECTED', pickup: structuredClone(run) }; };
  const finish = async () => { calls.finishes++; throw new Error('Delivery must not finish the pickup'); };
  const Component = load('factory-pickup.tsx', {
    react: { ...React, ...hooks },
    '@/app/api/technician.api': { technicianPickup: pickup, technicianPickupScan: scan, technicianFinishPickup: finish },
    '@/app/api/warehouse.api': { warehousePickup: pickup, warehousePickupScan: scan, warehouseFinishPickup: finish, warehousePickupTechnicians: async () => [] },
    '@/app/warehouse/warehouse-shared': { errorMessage: error => error.message },
    '@/app/warehouse/scan-pad': { ScanPad: 'ScanPad' },
    '@/app/warehouse/unit-origin': { UnitOrigin: 'UnitOrigin', ExternalDescription: 'ExternalDescription' },
    './pickup-customer-delivery': { PickupCustomerDelivery: 'PickupCustomerDelivery' },
    './pickup-customer-delivery-data': { pickupDeliveryContextKey: contextKey },
  }).FactoryPickup;
  const props = { actorId: 3, surface, pickupId: 12, offline: false, blocked: false, onBusy() {}, onFinished() {}, onCreated() {}, ...overrides };
  const h = { calls, run, props, render() { stateIndex = refIndex = memoIndex = effectIndex = 0; const tree = Component(props); while (queue.length) queue.shift()(); return tree; },
    async settle() { for (let i = 0; i < 4; i++) { this.render(); await new Promise(resolve => setImmediate(resolve)); } return this.render(); } };
  return h;
}
function nodes(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap(value => nodes(value, predicate));
  if (!React.isValidElement(tree)) return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props.children, predicate)];
}
const text = tree => typeof tree === 'string' ? tree : Array.isArray(tree) ? tree.map(text).join('') : tree?.props ? text(tree.props.children) : '';
const button = (h, caption) => nodes(h.render(), value => value.type === 'Button' && text(value) === caption)[0];
const panel = h => nodes(h.render(), value => value.type === 'PickupCustomerDelivery')[0];
const scanner = h => nodes(h.render(), value => value.type === 'ScanPad')[0];

for (const surface of ['warehouse', 'technician']) test(`${surface}: PO delivery stays inside pickup, then refreshes and resumes scanning same active run`, async () => {
  const h = harness(surface); await h.settle();
  assert.equal(nodes(h.render(), value => value.type === 'Button' && text(value) === 'Deliver to customer').length, 1);
  button(h, 'Deliver to customer').props.onClick(); await h.settle();
  assert.equal(panel(h).props.poKey, 'external:1'); assert.equal(panel(h).props.runId, 12); assert.equal(scanner(h), undefined);
  h.run.lines[0].inTransit = 0;
  panel(h).props.onComplete({ id: 41 }); await h.settle();
  assert.equal(panel(h), undefined); assert.ok(scanner(h)); assert.equal(h.calls.finishes, 0);
  assert.equal(h.run.status, 'ACTIVE'); assert.equal(storage.size, 0);
  await scanner(h).props.onRead('I1126831', 'scan-key');
  assert.deepEqual(h.calls.scans[0], [12, 'I1126831', 'scan-key']);
  assert.match(text(h.render()), /Delivery #41 recorded/);
});
test('canceling before signature returns to the same scanner without releasing or finishing', async () => {
  const h = harness(); await h.settle(); button(h, 'Deliver to customer').props.onClick(); await h.settle();
  panel(h).props.onClose(); await h.settle(); assert.ok(scanner(h)); assert.equal(h.calls.finishes, 0); assert.equal(storage.size, 0);
});
test('reload preserves delivery context even when its released parts no longer appear as available', async () => {
  storage.set(contextKey('warehouse', 3, 12), 'external:1');
  const h = harness(); h.run.lines[0].inTransit = 0; await h.settle();
  assert.equal(panel(h).props.poKey, 'external:1'); assert.equal(scanner(h), undefined);
});
test('pending scan, offline and physical count cannot open a delivery', async () => {
  for (const overrides of [{ offline: true }, { blocked: true }, {}]) {
    const h = harness('warehouse', overrides); await h.settle();
    if (!overrides.offline && !overrides.blocked) scanner(h).props.onPendingChange(true);
    assert.equal(button(h, 'Deliver to customer').props.disabled, true);
    button(h, 'Deliver to customer').props.onClick(); assert.equal(panel(h), undefined);
  }
});

(async () => { let failures = 0; for (const { name, run } of tests) { storage.clear(); try { await run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack}`); } } console.log(`${tests.length - failures}/${tests.length} checks passed`); process.exitCode = failures ? 1 : 0; })();
