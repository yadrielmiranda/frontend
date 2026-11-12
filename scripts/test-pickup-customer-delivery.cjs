/* Offline factory pickup progress and delivery integration: synthetic stock, no servers or database writes. */
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
test('pickup type availability comes from its own lots, not another crews global stock', async () => {
  const scoped = structuredClone(options), global = structuredClone(inventory);
  scoped.items[0].lines[0].partTracking = { types: ['DOOR', 'FRAME'], expected: { DOOR: 2, FRAME: 1 }, inTransit: { DOOR: 2 }, onHand: {}, unassigned: {}, released: {}, stores: [] };
  global.items[0].units[0].partTracking = { ...scoped.items[0].lines[0].partTracking, inTransit: { DOOR: 2, FRAME: 1, UNKNOWN: 4 } };
  const { loadPickupCustomerDelivery } = dataLoader({}, {
    warehousePickupCustomerDeliveryOptions: async () => scoped,
    warehouseInventoryByPo: async () => global,
  });
  const data = await loadPickupCustomerDelivery('warehouse', 12, 'external:1', '292427');
  assert.deepEqual(data.inventory.items[0].units[0].partTracking.inTransit, { DOOR: 2 });
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
  orders: [{ key: 'external:1', poNumber: '292427', pieces: 1, collectedParts: 2, expectedParts: 3, remainingParts: 1 },
    { key: 'order:2', poNumber: '292428', pieces: 1, collectedParts: 0, expectedParts: 2, remainingParts: 2 }],
  lines: [{ key: 'external:1', source: 'EXTERNAL', poNumber: '292427', lineNumber: '1126830', mark: 'A', product: 'French door',
    targetParts: 3, expectedParts: 3, collectionState: 'PARTIAL', collected: 2, inTransit: 2, remaining: 1 },
    { key: 'order:2', source: 'ORDER', poNumber: '292428', lineNumber: '1126831', mark: 'B', product: 'Sliding door',
      targetParts: 2, expectedParts: 2, collectionState: 'PENDING', collected: 0, inTransit: 0, remaining: 2 }],
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
  const calls = { reads: [], scans: [], undos: [], finishes: 0 }, run = runFixture();
  const pickup = async id => { calls.reads.push(id); return structuredClone(run); };
  const scan = async (...args) => { calls.scans.push(args); return { kind: 'COLLECTED', pickup: structuredClone(run) }; };
  const finish = async () => { calls.finishes++; throw new Error('Delivery must not finish the pickup'); };
  const Component = load('factory-pickup.tsx', {
    react: { ...React, ...hooks },
    '@/app/api/technician.api': { technicianPickup: pickup, technicianPickupScan: scan, technicianFinishPickup: finish },
    '@/app/api/warehouse.api': { warehousePickup: pickup, warehousePickupScan: scan, warehouseFinishPickup: finish, warehousePickupTechnicians: async () => [],
      warehouseRequestKey: () => 'undo-key', warehouseUndo: async (...args) => { calls.undos.push(args); } },
    '@/app/warehouse/warehouse-shared': { errorMessage: error => error.message },
    '@/app/warehouse/factory-part-quantity': { FactoryPartProgress: 'FactoryPartProgress' },
    '@/app/warehouse/scan-pad': { ScanPad: 'ScanPad' },
    '@/app/warehouse/unit-origin': { UnitOrigin: 'UnitOrigin', ExternalDescription: 'ExternalDescription' },
    '@/app/warehouse/internal-unit-dimensions': load('../warehouse/internal-unit-dimensions.tsx', {}),
    './pickup-customer-delivery': { PickupCustomerDelivery: 'PickupCustomerDelivery' },
    './pickup-management': { PickupManagement: 'PickupManagement' },
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
const text = tree => typeof tree === 'string' || typeof tree === 'number' ? String(tree) : Array.isArray(tree) ? tree.map(text).join('') : tree?.props ? text(tree.props.children) : '';
const button = (h, caption) => nodes(h.render(), value => value.type === 'Button' && text(value) === caption)[0];
const panel = h => nodes(h.render(), value => value.type === 'PickupCustomerDelivery')[0];
const scanner = h => nodes(h.render(), value => value.type === 'ScanPad')[0];
const localComponent = (tree, name) => nodes(tree, value => typeof value.type === 'function' && value.type.name === name)[0];
const renderLocal = element => { assert.ok(element, 'Expected local component'); return element.type(element.props); };
const pieceLists = h => nodes(h.render(), value => typeof value.type === 'function' && value.type.name === 'PickupPieceList').map(renderLocal);
const pieceSummaries = h => nodes(h.render(), value => value.type === 'summary')
  .map(summary => localComponent(summary, 'PickupPieceSummary')).filter(Boolean).map(renderLocal);

test('internal pickup dimensions are visible for admin and technician, including saved door and sidelite widths', async () => {
  for (const surface of ['warehouse', 'technician']) {
    const h = harness(surface);
    h.run.lines[1].dimensions = { width: '120.125', height: '80.000', doorWidth: '72', leftSideliteWidth: '24.125', rightSideliteWidth: '24' };
    await h.settle();
    const dimensions = renderLocal(localComponent(pieceLists(h)[1], 'InternalUnitDimensions'));
    assert.match(text(dimensions), /Size: 120.125″ W × 80″ H/);
    assert.match(text(dimensions), /Door width: 72″/);
    assert.match(text(dimensions), /Left sidelite width: 24.125″/);
    assert.match(text(dimensions), /Right sidelite width: 24″/);
    assert.doesNotMatch(text(dimensions), /Door height/);
    button(h, 'View remaining (3)').props.onClick();
    const remaining = renderLocal(localComponent(h.render(), 'RemainingList'));
    const internal = nodes(remaining, value => value.type.name === 'InternalUnitDimensions' && value.props.unit.source === 'ORDER')[0];
    assert.equal(text(renderLocal(internal)), text(dimensions));

    scanner(h).props.onSaved({ kind: 'COLLECTED', pickup: structuredClone(h.run), stock: structuredClone(h.run.lines[1]) });
    await h.settle();
    assert.equal(text(renderLocal(localComponent(h.render(), 'InternalUnitDimensions'))), text(dimensions));
  }
});

test('dimensions also identify an internal PO before it is added to the pickup', async () => {
  const h = harness(); await h.settle();
  scanner(h).props.onSaved({ kind: 'PO_NOT_INCLUDED', barcode: 'I1126831', requestKey: 'candidate-key',
    candidate: { ...h.run.lines[1], pieces: 1, parts: 2, dimensions: { width: '90', height: '80' } } });
  await h.settle();
  assert.match(text(renderLocal(localComponent(h.render(), 'InternalUnitDimensions'))), /Size: 90″ W × 80″ H/);
});

test('missing measurements stay hidden and external PO descriptions remain the source for their sizes', () => {
  const { InternalUnitDimensions } = load('../warehouse/internal-unit-dimensions.tsx', {});
  assert.equal(InternalUnitDimensions({ unit: { source: 'EXTERNAL', dimensions: { width: '39', height: '82' } } }), null);
  for (const dimensions of [undefined, null, {}, { width: '0', height: '-1', doorWidth: 'invalid' }]) {
    assert.equal(InternalUnitDimensions({ unit: { source: 'ORDER', dimensions } }), null);
  }
  const oneDimension = InternalUnitDimensions({ unit: { source: 'ORDER', dimensions: { width: '36.375' } } });
  assert.equal(text(oneDimension), 'Size: 36.375″ W');
});

test('PO expanders keep pieces separated by source key even when printed PO numbers match', async () => {
  const h = harness('technician');
  h.run.orders[1].poNumber = h.run.orders[0].poNumber;
  h.run.lines[1].poNumber = h.run.lines[0].poNumber;
  await h.settle();
  const expanders = nodes(h.render(), value => value.type === 'details' && localComponent(value, 'PickupPieceList'));
  assert.equal(expanders.length, 2);
  for (const [index, expander] of expanders.entries()) {
    assert.equal(expander.props.open, undefined);
    assert.match(text(nodes(expander, value => value.type === 'summary')[0]), /PO 292427/);
    const pieces = renderLocal(localComponent(expander, 'PickupPieceList'));
    assert.equal(pieces.props['aria-label'], 'Pieces in this pickup');
    assert.equal(nodes(pieces, value => value.type === 'li').length, 1);
    assert.ok(text(pieces).includes(h.run.lines[index].lineNumber));
    assert.ok(!text(pieces).includes(h.run.lines[1 - index].lineNumber));
  }
  assert.deepEqual(pieceSummaries(h).map(text), ['0Complete1Partial0Not collected', '0Complete0Partial1Not collected']);
  assert.equal(nodes(h.render(), value => value.props['aria-label'] === 'Piece status legend').length, 1);
  assert.equal(h.calls.scans.length, 0); assert.equal(h.calls.finishes, 0);
});

test('piece status and part summaries use this pickup target rather than global stock totals', async () => {
  const h = harness('technician');
  const globalTracking = { types: ['DOOR', 'FRAME'], expected: { DOOR: 2, FRAME: 1 },
    inTransit: {}, onHand: { DOOR: 2, FRAME: 1 }, released: {}, unassigned: {}, stores: [] };
  h.run.lines[0].expectedParts = 9;
  h.run.lines[1].expectedParts = 7;
  h.run.lines.forEach(line => { line.partTracking = globalTracking; });
  h.run.lines.push({ ...h.run.lines[0], lineNumber: '1126832', mark: 'C', product: 'Completed piece',
    targetParts: 1, expectedParts: 3, collected: 1, remaining: 0, collectionState: 'COMPLETE' });
  h.run.orders[0].pieces = 2;
  await h.settle();
  const lists = pieceLists(h), cards = lists.flatMap(list => nodes(list, value => value.type === 'li'));
  assert.equal(cards.length, 3);
  const byLine = line => cards.find(card => text(card).includes(`Line ${line}`));
  assert.match(text(byLine('1126830')), /Partially collected.*2 \/ 3 parts collected.*1 remaining/);
  assert.match(text(byLine('1126831')), /Not collected.*0 \/ 2 parts collected.*2 remaining/);
  assert.match(text(byLine('1126832')), /Collected.*1 \/ 1 parts collected/);
  assert.doesNotMatch(text(byLine('1126832')), /remaining/);
  assert.equal(lists.flatMap(list => nodes(list, value => value.type === 'FactoryPartProgress')).length, 0);
  assert.doesNotMatch(lists.map(text).join(''), /2 \/ 9|0 \/ 7|1 \/ 3/);
  assert.deepEqual(pieceSummaries(h).map(text), ['1Complete1Partial0Not collected', '0Complete0Partial1Not collected']);
});

test('a scan response updates the existing PO piece from pending to partial to collected', async () => {
  const h = harness('technician'); await h.settle();
  const initialReads = h.calls.reads.length;
  const piece = () => text(pieceLists(h)[1]);
  assert.match(piece(), /Not collected.*0 \/ 2 parts collected/);
  assert.equal(text(pieceSummaries(h)[1]), '0Complete0Partial1Not collected');
  for (const collected of [1, 2]) {
    const state = collected === 2 ? 'COMPLETE' : 'PARTIAL';
    Object.assign(h.run.lines[1], { collected, inTransit: collected, remaining: 2 - collected, collectionState: state });
    Object.assign(h.run.orders[1], { collectedParts: collected, remainingParts: 2 - collected });
    h.run.collectedParts = 2 + collected; h.run.remainingParts = 3 - collected;
    const currentScanner = scanner(h), before = piece();
    const result = await currentScanner.props.onRead('I1126831', `progress-${collected}`);
    assert.equal(piece(), before, 'Unapplied server result must not alter displayed progress');
    currentScanner.props.onSaved({ ...result, stock: structuredClone(h.run.lines[1]) });
    await h.settle();
    assert.ok(piece().includes(`${collected} / 2 parts collected`));
    assert.ok(piece().includes(collected === 2 ? 'Collected' : 'Partially collected'));
    assert.equal(text(pieceSummaries(h)[1]), collected === 2 ? '1Complete0Partial0Not collected' : '0Complete1Partial0Not collected');
    if (collected === 2) assert.doesNotMatch(piece(), /Not collected|Partially collected|remaining/);
  }
  assert.deepEqual(h.calls.scans, [[12, 'I1126831', 'progress-1'], [12, 'I1126831', 'progress-2']]);
  assert.equal(h.calls.reads.length, initialReads); assert.equal(h.calls.finishes, 0);
});

test('undoing a collected part refreshes the collapsed piece counts from complete to partial', async () => {
  const h = harness('warehouse'); await h.settle();
  Object.assign(h.run.lines[0], { collected: 3, inTransit: 3, remaining: 0, collectionState: 'COMPLETE' });
  Object.assign(h.run.orders[0], { collectedParts: 3, remainingParts: 0 });
  scanner(h).props.onSaved({ kind: 'COLLECTED', pickup: structuredClone(h.run), stock: structuredClone(h.run.lines[0]), movement: { id: 77 } });
  await h.settle();
  assert.equal(text(pieceSummaries(h)[0]), '1Complete0Partial0Not collected');
  Object.assign(h.run.lines[0], { collected: 2, inTransit: 2, remaining: 1, collectionState: 'PARTIAL' });
  Object.assign(h.run.orders[0], { collectedParts: 2, remainingParts: 1 });
  button(h, 'Undo last reading').props.onClick(); await h.settle();
  assert.deepEqual(h.calls.undos, [[77, 'undo-key']]);
  assert.equal(text(pieceSummaries(h)[0]), '0Complete1Partial0Not collected');
  assert.equal(text(pieceSummaries(h)[1]), '0Complete0Partial1Not collected');
});

test('remaining parts keeps its separate partial and untouched groups and excludes completed pieces', async () => {
  const h = harness('technician');
  h.run.lines.push({ ...h.run.lines[0], lineNumber: '1126832', product: 'Completed piece',
    targetParts: 1, collected: 1, remaining: 0, collectionState: 'COMPLETE' });
  await h.settle();
  button(h, 'View remaining (3)').props.onClick();
  const remaining = localComponent(h.render(), 'RemainingList');
  assert.deepEqual(remaining.props.lines.map(line => line.lineNumber), ['1126830', '1126831']);
  const rendered = renderLocal(remaining);
  const groups = nodes(rendered, value => value.type === 'section');
  assert.equal(groups.length, 2);
  assert.match(text(groups[0]), /Partially collected.*Line 1126830.*1 missing/);
  assert.match(text(groups[1]), /Not collected.*Line 1126831.*2 missing/);
  assert.doesNotMatch(text(rendered), /1126832|Completed piece/);
  assert.equal(nodes(rendered, value => value.type === 'FactoryPartProgress').length, 2);
  assert.equal(pieceLists(h).flatMap(list => nodes(list, value => value.type === 'li')).length, 3);
});

for (const surface of ['warehouse', 'technician']) test(`${surface}: PO delivery stays inside pickup, then refreshes and resumes scanning same active run`, async () => {
  const h = harness(surface); await h.settle();
  const countsBeforeDelivery = pieceSummaries(h).map(text);
  assert.equal(nodes(h.render(), value => value.type === 'Button' && text(value) === 'Deliver to customer').length, 1);
  button(h, 'Deliver to customer').props.onClick(); await h.settle();
  assert.equal(panel(h).props.poKey, 'external:1'); assert.equal(panel(h).props.runId, 12); assert.equal(scanner(h), undefined);
  h.run.lines[0].inTransit = 0;
  panel(h).props.onComplete({ id: 41 }); await h.settle();
  assert.equal(panel(h), undefined); assert.ok(scanner(h)); assert.equal(h.calls.finishes, 0);
  assert.equal(h.run.status, 'ACTIVE'); assert.equal(storage.size, 0);
  assert.deepEqual(pieceSummaries(h).map(text), countsBeforeDelivery, 'Delivery must not change how many pieces were collected');
  await scanner(h).props.onRead('I1126831', 'scan-key');
  assert.deepEqual(h.calls.scans[0], [12, 'I1126831', 'scan-key']);
  assert.match(text(h.render()), /Delivery #41 recorded/);
});
for (const surface of ['warehouse', 'technician']) test(`${surface}: returning from delivery refreshes the same pickup without releasing or finishing`, async () => {
  const h = harness(surface); await h.settle(); button(h, 'Deliver to customer').props.onClick(); await h.settle();
  const readsBeforeReturn = h.calls.reads.length;
  panel(h).props.onClose(); await h.settle();
  assert.ok(scanner(h)); assert.equal(panel(h), undefined); assert.equal(h.calls.finishes, 0); assert.equal(storage.size, 0);
  const refreshed = h.calls.reads.slice(readsBeforeReturn);
  assert.ok(refreshed.length > 0); assert.ok(refreshed.every(id => id === 12));
  assert.equal(h.run.status, 'ACTIVE');
});
test('reload preserves delivery context even when its released parts no longer appear as available', async () => {
  storage.set(contextKey('warehouse', 3, 12), 'external:1');
  const h = harness(); h.run.lines[0].inTransit = 0; await h.settle();
  assert.equal(panel(h).props.poKey, 'external:1'); assert.equal(scanner(h), undefined);
});
test('admin pickup management pauses scanning and navigation, applies saved POs and returns after deletion', async () => {
  let busy = false, returned = 0;
  const h = harness('warehouse', { onBusy(value) { busy = value; }, onFinished() { returned++; } });
  Object.assign(h.run, { canEditOrders: true, canDelete: true });
  await h.settle();
  const management = () => nodes(h.render(), value => value.type === 'PickupManagement')[0];
  assert.ok(management());
  management().props.onOpenChange(true); await h.settle();
  assert.equal(busy, true); assert.equal(scanner(h).props.disabled, true);
  assert.equal(button(h, 'Deliver to customer').props.disabled, true);
  assert.equal(management().props.disabled, false, 'Management must remain usable while its own modal is open');
  const next = structuredClone(h.run);
  next.orders = [next.orders[0]]; next.lines = [next.lines[0]]; next.poCount = 1;
  management().props.onChanged(next); await h.settle();
  assert.deepEqual(management().props.run.orders.map(order => order.key), ['external:1']);
  assert.equal(pieceLists(h).length, 1);
  management().props.onOpenChange(false); await h.settle();
  assert.equal(busy, false); assert.equal(scanner(h).props.disabled, false);
  management().props.onDeleted(); await h.settle();
  assert.equal(returned, 1);
});

test('technicians have no pickup management controls and unresolved scans block admin editing', async () => {
  const technician = harness('technician');
  Object.assign(technician.run, { canEditOrders: true, canDelete: true });
  await technician.settle();
  assert.equal(nodes(technician.render(), value => value.type === 'PickupManagement').length, 0);
  const admin = harness('warehouse'); await admin.settle();
  scanner(admin).props.onPendingChange(true); await admin.settle();
  assert.equal(nodes(admin.render(), value => value.type === 'PickupManagement')[0].props.disabled, true);
});

test('pending scan, offline and physical count cannot open a delivery', async () => {
  for (const overrides of [{ offline: true }, { blocked: true }, {}]) {
    const h = harness('warehouse', overrides); await h.settle();
    if (!overrides.offline && !overrides.blocked) scanner(h).props.onPendingChange(true);
    assert.equal(button(h, 'Deliver to customer').props.disabled, true);
    button(h, 'Deliver to customer').props.onClick(); assert.equal(panel(h), undefined);
  }
});

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function deliveryFixture(surface, items = [{ ...option, availableParts: 2 }]) {
  const scoped = { ...options, items: structuredClone(items), total: items.length };
  return surface === 'technician' ? { surface, options: scoped }
    : { surface, options: scoped, inventory: { ...structuredClone(inventory), items: items.length ? structuredClone(inventory.items) : [] } };
}
function deliveryHarness(surface, read = async () => deliveryFixture(surface)) {
  let stateIndex = 0, refIndex = 0, effectIndex = 0, mounted = true;
  const states = [], refs = [], effects = [], queue = [];
  const calls = { loads: [], closes: 0, completed: [], lateUpdates: 0, forms: [] };
  const hooks = {
    useState(initial) { const i = stateIndex++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial;
      return [states[i], value => { if (!mounted) calls.lateUpdates++; states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef(initial) { const i = refIndex++; return refs[i] ??= { current: initial }; },
    useEffect(callback, deps) {
      const i = effectIndex++, old = effects[i];
      if (!old || !deps || !old.deps || !deps.every((value, index) => Object.is(value, old.deps[index]))) {
        const effect = effects[i] = { deps };
        queue.push(() => { old?.cleanup?.(); effect.cleanup = callback(); });
      }
    },
  };
  const { emptyPickupCustomerDelivery } = dataLoader({}, {});
  const Component = load('pickup-customer-delivery.tsx', {
    react: { ...React, ...hooks },
    '@/app/warehouse/unit-origin': { PoName: 'PoName' },
    '@/app/warehouse/customer-deliveries/customer-delivery-client': { CustomerDeliveryClient: 'CustomerDeliveryClient' },
    './customer-deliveries/customer-delivery-client': { TechnicianCustomerDeliveryClient: 'TechnicianCustomerDeliveryClient' },
    './pickup-customer-delivery-data': { emptyPickupCustomerDelivery,
      loadPickupCustomerDelivery: (...args) => { calls.loads.push(args); return read(...args); } },
  }).PickupCustomerDelivery;
  const props = { actorId: 3, surface, runId: 12, poKey: 'external:1', poNumber: '292427', blocked: false,
    onClose() { calls.closes++; }, onComplete(delivery) { calls.completed.push(delivery); } };
  return { calls, props,
    render() {
      assert.ok(mounted, 'Cannot render after unmount');
      stateIndex = refIndex = effectIndex = 0;
      const tree = Component(props);
      calls.forms.push(...nodes(tree, value => value.type === 'CustomerDeliveryClient' || value.type === 'TechnicianCustomerDeliveryClient'));
      while (queue.length) queue.shift()();
      return tree;
    },
    async settle() { for (let i = 0; i < 3; i++) { this.render(); await new Promise(resolve => setImmediate(resolve)); } return this.render(); },
    unmount() { mounted = false; effects.forEach(effect => effect?.cleanup?.()); },
  };
}
const deliveryForm = h => nodes(h.render(), value => value.type === 'CustomerDeliveryClient' || value.type === 'TechnicianCustomerDeliveryClient')[0];

for (const surface of ['warehouse', 'technician']) {
  test(`${surface}: fresh empty or unavailable PO returns once without opening an empty delivery form`, async () => {
    const unavailable = [[], [{ ...option, key: 'order:1', availableParts: 2 }],
      [{ ...option, availableParts: 0 }], [{ ...option, availableParts: 2, lines: [] }],
      [{ ...option, availableParts: 2, lines: [{ ...option.lines[0], inTransit: 0 }] }]];
    for (const items of unavailable) {
      const h = deliveryHarness(surface, async () => deliveryFixture(surface, items));
      await h.settle(); await h.settle();
      assert.equal(h.calls.closes, 1); assert.equal(h.calls.loads.length, 1);
      assert.equal(h.calls.forms.length, 0); assert.deepEqual(h.calls.completed, []);
      h.unmount();
    }
  });

  test(`${surface}: available collected parts open the selected PO normally`, async () => {
    const h = deliveryHarness(surface); await h.settle();
    const form = deliveryForm(h);
    assert.equal(form.type, surface === 'warehouse' ? 'CustomerDeliveryClient' : 'TechnicianCustomerDeliveryClient');
    assert.equal(form.props.initialPoKey, 'external:1'); assert.equal(form.props.embedded.pickupRunId, 12);
    assert.equal(h.calls.closes, 0); assert.deepEqual(h.calls.loads, [[surface, 12, 'external:1', '292427']]);
    h.unmount();
  });

  test(`${surface}: saved signed requests, including invalid records, keep delivery recovery open`, async () => {
    for (const saved of [JSON.stringify({ requestKey: 'signed-request', pickupRunId: 12 }), '{invalid-json']) {
      const key = `${surface}-customer-delivery:3`;
      storage.set(key, saved);
      const h = deliveryHarness(surface, async () => { throw new Error('Recovery must not depend on fresh inventory'); });
      await h.settle();
      assert.ok(deliveryForm(h)); assert.equal(h.calls.closes, 0); assert.equal(h.calls.loads.length, 0);
      assert.equal(storage.get(key), saved);
      h.unmount(); storage.delete(key);
    }
  });

  test(`${surface}: unavailable storage leaves recovery to the delivery form`, async () => {
    const getItem = sessionStorage.getItem;
    sessionStorage.getItem = () => { throw new Error('Storage unavailable'); };
    try {
      const h = deliveryHarness(surface); await h.settle();
      assert.ok(deliveryForm(h)); assert.equal(h.calls.closes, 0); assert.equal(h.calls.loads.length, 0);
      h.unmount();
    } finally { sessionStorage.getItem = getItem; }
  });

  test(`${surface}: a signed request saved during loading is not discarded by an empty response`, async () => {
    const waiting = deferred(), h = deliveryHarness(surface, () => waiting.promise);
    h.render();
    const key = `${surface}-customer-delivery:3`, signed = JSON.stringify({ requestKey: 'saved-during-load' });
    storage.set(key, signed);
    waiting.resolve(deliveryFixture(surface, [])); await h.settle();
    assert.equal(h.calls.closes, 0); assert.ok(deliveryForm(h)); assert.equal(storage.get(key), signed);
    h.unmount();
  });

  test(`${surface}: failed or offline reads keep retry controls and never return automatically`, async () => {
    let attempt = 0;
    const h = deliveryHarness(surface, async () => { if (attempt++ === 0) throw new Error('Network unavailable'); return deliveryFixture(surface); });
    await h.settle();
    assert.equal(h.calls.closes, 0); assert.equal(deliveryForm(h), undefined);
    assert.match(text(h.render()), /Network unavailable/); assert.ok(button(h, 'Back to pickup'));
    button(h, 'Try again').props.onClick(); await h.settle();
    assert.ok(deliveryForm(h)); assert.equal(h.calls.closes, 0); assert.equal(h.calls.loads.length, 2);
    h.unmount();
  });

  test(`${surface}: an empty response arriving after unmount cannot navigate or update state`, async () => {
    const waiting = deferred(), h = deliveryHarness(surface, () => waiting.promise);
    h.render(); h.unmount(); waiting.resolve(deliveryFixture(surface, []));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.calls.closes, 0); assert.equal(h.calls.lateUpdates, 0);
  });

  test(`${surface}: changing actor, pickup, PO or surface ignores the previous response`, async () => {
    for (const changed of [{ actorId: 4 }, { runId: 13 }, { poKey: 'order:2' }, { poNumber: '292428' },
      { surface: surface === 'warehouse' ? 'technician' : 'warehouse' }]) {
      const first = deferred(), second = deferred(); let attempt = 0;
      const h = deliveryHarness(surface, () => attempt++ === 0 ? first.promise : second.promise);
      h.render(); Object.assign(h.props, changed); h.render();
      first.resolve(deliveryFixture(surface, [])); await h.settle();
      assert.equal(h.calls.closes, 0); assert.equal(deliveryForm(h), undefined); assert.equal(h.calls.loads.length, 2);
      second.resolve(deliveryFixture(h.props.surface, [{ ...option, key: h.props.poKey, availableParts: 2 }])); await h.settle();
      assert.ok(deliveryForm(h)); assert.equal(h.calls.closes, 0);
      h.unmount();
    }
  });

  test(`${surface}: rerendered callbacks do not reload or repeat automatic return and the latest callback is used`, async () => {
    const waiting = deferred(), h = deliveryHarness(surface, () => waiting.promise); let latestCloses = 0;
    h.render(); h.props.onClose = () => { latestCloses++; }; await h.settle();
    assert.equal(h.calls.loads.length, 1);
    waiting.resolve(deliveryFixture(surface, [])); await h.settle();
    assert.equal(h.calls.closes, 0); assert.equal(latestCloses, 1);
    h.props.onClose = () => { latestCloses++; }; await h.settle();
    assert.equal(h.calls.loads.length, 1); assert.equal(latestCloses, 1); assert.equal(h.calls.forms.length, 0);
    h.unmount();
  });
}

(async () => { let failures = 0; for (const { name, run } of tests) { storage.clear(); try { await run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack}`); } } console.log(`${tests.length - failures}/${tests.length} checks passed`); process.exitCode = failures ? 1 : 0; })();
