/* Synthetic warehouse navigation checks. No network, camera, database or inventory writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '../src');
const tests = [], test = (name, run) => tests.push({ name, run });
const primitive = new Proxy({}, { get: (_, name) => name });
const storage = new Map();
global.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
global.window = { dispatchEvent() {}, addEventListener() {}, removeEventListener() {}, scrollTo() {}, matchMedia: () => ({ matches: false }) };
global.setInterval = () => 1;
global.clearInterval = () => {};
global.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options?.detail; } };
Object.defineProperty(global, 'navigator', { configurable: true, value: { onLine: true } });
const account = { id: 10, role: { name: 'admin' } };
const store = { id: 1, name: 'Main', isActive: true, onHand: 8, units: 4, version: 0 };
const page = items => ({ items, total: items.length, page: 1, pageSize: 20 });
const receipt = { source: 'WAREHOUSE', storeId: 1, storeName: 'Main', firstName: 'Synthetic', lastName: 'Recipient', signatureStrokes: [],
  items: [{ lineNumber: '1133926', barcode: 'I1133926', poNumber: '293232', source: 'EXTERNAL', orderNumber: '', mark: '1', description: 'French door', product: '', system: '', configuration: '', quantity: 1, parts: { DOOR: 1 } }], totalPieces: 1, totalParts: 1, pendingItems: [] };
const run = (changes = {}) => ({ id: 7, status: 'ACTIVE', storeId: 1, storeName: 'Main', createdById: 10, createdBy: 'Test Admin',
  availableStorages: [{ storeId: 1, storeName: 'Main' }],
  createdAt: '2026-11-04T18:00:00Z', updatedAt: '2026-11-04T18:00:00Z', closedAt: null, revision: 'revision-7',
  orders: [{ key: 'external:1', poNumber: '293232', source: 'EXTERNAL', orderNumber: '', totalPieces: 1, totalParts: 1, pendingPieces: 0, pendingParts: 0, unknownPending: false }],
  items: receipt.items, pendingItems: [], totalPieces: 1, totalParts: 1, pendingPieces: 0, pendingParts: 0, hasPending: false, deliveryId: null, delivery: null, ...changes });
const canonical = '/warehouse/scan?action=RELEASE&destination=customer';
class ApiError extends Error { constructor(message, status, data) { super(message); this.status = status; this.data = data; } }
class Redirect extends Error { constructor(url) { super(url); this.url = url; } }

function load(relative, overrides = {}, cache = new Map()) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(id => {
    if (Object.hasOwn(overrides, id)) return overrides[id];
    if (id.startsWith('@/components/ui/') || id === 'lucide-react') return primitive;
    if (id === 'next/link') return { __esModule: true, default: 'a' };
    const base = id.startsWith('@/') ? path.resolve(root, id.slice(2)) : id.startsWith('.') ? path.resolve(path.dirname(file), id) : null;
    if (!base) return require(id);
    const found = ['.ts', '.tsx'].map(ext => base + ext).find(file => fs.existsSync(file));
    if (!found) throw new Error(`Unresolved ${id}`);
    return load(path.relative(root, found), overrides, cache);
  }, module, module.exports);
  cache.set(file, module.exports); return module.exports;
}
const nodes = (element, predicate, result = []) => { if (Array.isArray(element)) { element.forEach(child => nodes(child, predicate, result)); return result; } if (!element || typeof element !== 'object') return result; if (predicate(element)) result.push(element); nodes(element.props?.children, predicate, result); return result; };
const text = element => typeof element === 'string' || typeof element === 'number' ? String(element) : Array.isArray(element) ? element.map(text).join('') : element?.props ? text(element.props.children) : '';
const ofType = (h, name) => nodes(h.render(), node => node.type === name)[0];
const button = (h, name) => nodes(h.render(), node => ['Button', 'button'].includes(node.type) && text(node) === name)[0];
const click = (h, name) => { const target = button(h, name); assert(target, `Missing ${name}`); assert(!target.props.disabled, `Disabled ${name}`); return target.props.onClick(); };
const dialogFor = (h, label) => nodes(h.render(), node => node.type === 'Dialog' && nodes(node, child => child.type === 'Button' && text(child) === label).length)[0];
const openPoPicker = h => { const trigger = button(h, 'Add POs'); assert(trigger && !trigger.props.disabled); dialogFor(h, 'Add POs').props.onOpenChange(true); };
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
const equalDeps = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
function harness(relative, exportName, props, overrides = {}) {
  const states = [], refs = [], effects = [], memos = [], queue = [];
  let si = 0, ri = 0, ei = 0, mi = 0;
  const hooks = { ...React,
    useState(initial) { const i = si++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef(initial) { const i = ri++; return refs[i] ??= { current: initial }; },
    useCallback(callback, deps) { const i = mi++; if (!equalDeps(memos[i]?.deps, deps)) memos[i] = { deps, callback }; return memos[i].callback; },
    useEffect(callback, deps) { const i = ei++; if (!equalDeps(effects[i]?.deps, deps)) { const previous = effects[i]; effects[i] = { deps }; queue.push(() => { previous?.cleanup?.(); effects[i].cleanup = callback(); }); } },
  };
  const Component = load(relative, { ...overrides, react: hooks })[exportName];
  const h = { props,
    render() { si = ri = ei = mi = 0; const tree = Component(props); while (queue.length) queue.shift()(); return tree; },
    async settle() { for (let i = 0; i < 4; i++) { h.render(); await flush(); } return h.render(); },
    dispose() { effects.forEach(effect => effect.cleanup?.()); },
  };
  h.render(); return h;
}
function scanHarness(props = {}) {
  const urls = [];
  const h = harness('app/warehouse/scan/scan-client.tsx', 'ScanClient', { actorId: 10, isAdmin: true, activeCountId: null, initialStores: [store], ...props }, {
    'next/navigation': { useRouter: () => ({ replace: url => urls.push(url) }) },
    '@/app/api/warehouse.api': { warehouseInventory: async () => ({ activeCountId: null }), warehouseStores: async () => [store] },
    '../store-select': { StoreSelect: 'StoreSelect' }, '../scan-pad': { ScanPad: 'ScanPad' },
    '@/app/technician/factory-pickups': { FactoryPickups: 'FactoryPickups' },
    '../customer-deliveries/customer-delivery-runs-client': { CustomerDeliveryRunsClient: 'CustomerDeliveryRunsClient' },
    '../warehouse-shared': { CountNotice: 'CountNotice', UnitSummary: 'UnitSummary', errorMessage: e => e.message, MovementLocation: 'MovementLocation', movementLabels: {} },
  });
  return Object.assign(h, { urls });
}
let keyId = 0;
function deliveryHarness({ props = {}, api = {} } = {}) {
  const urls = [], busy = [], scanModes = [];
  const h = harness('app/warehouse/customer-deliveries/customer-delivery-runs-client.tsx', 'CustomerDeliveryRunsClient', {
    actorId: 10, actorRole: 'admin', initialList: page([run()]), initialRun: run(), initialStores: [store], initialStoreId: '1',
    embedded: true, basePath: `${canonical}&storeId=1`, onBusy: value => busy.push(value), onScanModeChange: value => scanModes.push(value), ...props,
  }, {
    'next/navigation': { useRouter: () => ({ replace: url => urls.push(url), refresh() {} }) },
    '@/components/estimates/agreements/signature-pad': { SignaturePad: 'SignaturePad' },
    '@/contexts/AuthContext': { useAuth: () => ({ user: account, revalidate: async () => account }) },
    '@/app/api/_base': { ApiError, isApiError: e => e instanceof ApiError },
    '@/app/api/warehouse.api': { warehouseRequestKey: () => `synthetic-${++keyId}` },
    '@/app/api/customer-delivery-runs.api': { customerDeliveryRun: async id => run({ id }), customerDeliveryRuns: async () => page([run()]), ...api },
    '../scan-pad': { ScanPad: 'ScanPad' }, '../store-select': { StoreSelect: 'StoreSelect' },
    '../warehouse-shared': { errorMessage: error => error.message, Pagination: 'Pagination' },
    './customer-delivery-receipt': { CustomerDeliveryReceipt: 'CustomerDeliveryReceipt' },
    './customer-delivery-po-picker': { CustomerDeliveryPoPicker: 'CustomerDeliveryPoPicker' },
  });
  return Object.assign(h, { urls, busy, scanModes });
}
function serverPage(relative, role = 'admin', runError = null) {
  const calls = [];
  const auth = { requireWarehouseUser: async () => ({ id: 10, role: { name: role } }) };
  const Component = load(relative, {
    '../warehouse-access': auth, '../../warehouse-access': auth,
    'next/navigation': { redirect: url => { throw new Redirect(url); } },
    '@/app/api/_base': { isApiError: error => error instanceof ApiError },
    '@/app/api/warehouse.api': { warehouseInventory: async () => ({ activeCountId: null }), warehouseStores: async () => [store], warehouseInventoryByPo: async query => { calls.push(['inventory', query]); return page([]); } },
    '@/app/api/customer-delivery-runs.api': { customerDeliveryRuns: async query => { calls.push(['list', query]); return page([run()]); }, customerDeliveryRun: async id => { calls.push(['run', id]); if (runError) throw runError; return run({ id }); } },
    './scan-client': { ScanClient: 'ScanClient' }, './customer-delivery-runs-client': { CustomerDeliveryRunsClient: 'CustomerDeliveryRunsClient' }, '../customer-delivery-client': { CustomerDeliveryClient: 'CustomerDeliveryClient' },
  }).default;
  return { calls, render: query => Component({ searchParams: Promise.resolve(query) }) };
}
const isCustomerUrl = (url, expected = {}) => {
  const parsed = new URL(url, 'https://example.test');
  assert.equal(parsed.pathname, '/warehouse/scan'); assert.equal(parsed.searchParams.get('action'), 'RELEASE'); assert.equal(parsed.searchParams.get('destination'), 'customer');
  for (const [key, value] of Object.entries(expected)) assert.equal(parsed.searchParams.get(key), value);
};

test('warehouse navigation retains Scan and has no separate customer-delivery tab', () => {
  const h = harness('app/warehouse/warehouse-navigation.tsx', 'WarehouseNavigation', {}, { 'next/navigation': { usePathname: () => '/warehouse/scan' } });
  const links = nodes(h.render(), node => node.type === 'a');
  assert(links.some(node => node.props.href === '/warehouse/scan' && text(node).includes('Scan')));
  assert(!links.some(node => node.props.href.startsWith('/warehouse/customer-deliveries'))); h.dispose();
});
test('Scan release choice opens customer deliveries in place like factory pickups', () => {
  const h = scanHarness(); click(h, 'Release from warehouse'); click(h, 'Deliver to customer');
  assert(ofType(h, 'CustomerDeliveryRunsClient')); assert.equal(ofType(h, 'ScanPad'), undefined);
  assert.equal(nodes(h.render(), node => node.type === 'a' && text(node) === 'Deliver to customer').length, 0);
  click(h, 'Collect from factory'); assert(ofType(h, 'FactoryPickups')); assert.equal(ofType(h, 'CustomerDeliveryRunsClient'), undefined); h.dispose();
});
test('Scan customer deep link restores the delivery and store into the embedded view', () => {
  const h = scanHarness({ initialAction: 'RELEASE', initialCustomerDelivery: true, initialDeliveries: page([run()]), initialDelivery: run(), initialStoreId: '1' });
  const child = ofType(h, 'CustomerDeliveryRunsClient'); assert(child);
  assert.equal(child.props.embedded, true); assert.equal(child.props.initialRun.id, 7); assert.equal(child.props.initialStoreId, '1');
  isCustomerUrl(child.props.basePath, { storeId: '1' }); assert.equal(ofType(h, 'ScanPad'), undefined); h.dispose();
});

test('manual PO deep link opens the recorded-parts view without scan operation choices', async () => {
  const { warehouseCustomerDeliveryPath } = load('app/warehouse/customer-deliveries/customer-delivery-navigation.ts');
  const url = warehouseCustomerDeliveryPath({ runId: 7, manual: true });
  isCustomerUrl(url, { runId: '7', manual: '1' });
  assert.equal(new URL(warehouseCustomerDeliveryPath({ manual: true }), 'https://example.test').searchParams.has('manual'), false);
  const p = serverPage('app/warehouse/scan/page.tsx');
  const page = await p.render({ action: 'RELEASE', destination: 'customer', runId: '7', manual: '1' });
  assert.equal(page.props.initialManualDelivery, true);
  const h = scanHarness(page.props);
  assert.equal(ofType(h, 'CustomerDeliveryRunsClient').props.manual, true);
  assert.equal(button(h, 'Collect from factory'), undefined); assert.equal(button(h, 'Release to installation'), undefined);
  assert.doesNotMatch(text(h.render()), /Scan parts|scan each part/); h.dispose();
});
test('switching from installation keeps the currently selected warehouse for customer creation', () => {
  const h = scanHarness({ initialAction: 'RELEASE', initialRelease: true });
  ofType(h, 'StoreSelect').props.onChange('1'); click(h, 'Deliver to customer');
  const child = ofType(h, 'CustomerDeliveryRunsClient'); assert.equal(child.props.initialStoreId, '1');
  isCustomerUrl(child.props.basePath, { storeId: '1' }); isCustomerUrl(h.urls.at(-1), { storeId: '1' }); h.dispose();
});
test('same-page Scan navigation changes operation without retaining the prior customer panel', () => {
  const h = scanHarness({ initialAction: 'RELEASE', initialCustomerDelivery: true, initialDeliveries: page([run()]), initialDelivery: run() });
  assert(ofType(h, 'CustomerDeliveryRunsClient'));
  Object.assign(h.props, { initialAction: 'RECEIVE', initialCustomerDelivery: false, initialDelivery: null }); h.render();
  assert.equal(ofType(h, 'CustomerDeliveryRunsClient'), undefined); assert.equal(button(h, 'Receive at warehouse').props['aria-pressed'], true); h.dispose();
});
test('parent operation switching stays locked while a delivery scan or signed close is pending', () => {
  const h = scanHarness({ initialAction: 'RELEASE', initialCustomerDelivery: true, initialDeliveries: page([run()]), initialDelivery: run() });
  const child = ofType(h, 'CustomerDeliveryRunsClient'); child.props.onBusy(true);
  for (const label of ['Collect from factory', 'Receive at warehouse', 'Release from warehouse', 'Release to installation'])
    assert.equal(button(h, label).props.disabled, true, `${label} must stay locked`);
  child.props.onBusy(false); assert.equal(button(h, 'Receive at warehouse').props.disabled, false);
  click(h, 'Receive at warehouse'); assert.equal(ofType(h, 'CustomerDeliveryRunsClient'), undefined); h.dispose();
});
test('operators cannot open customer creation even with an explicit customer deep link', () => {
  const h = scanHarness({ isAdmin: false, initialAction: 'RELEASE', initialCustomerDelivery: true, initialDeliveries: page([run()]), initialDelivery: run() });
  assert.equal(ofType(h, 'CustomerDeliveryRunsClient'), undefined);
  assert.match(text(h.render()), /Administrators and technicians/);
  h.dispose();
});
test('Scan page restores admin customer runs and never reads customer deliveries for operators', async () => {
  const adminPage = serverPage('app/warehouse/scan/page.tsx');
  const tree = await adminPage.render({ action: 'RELEASE', destination: 'customer', runId: '7', storeId: '1' });
  assert.equal(tree.type, 'ScanClient'); assert.equal(tree.props.initialCustomerDelivery, true); assert.equal(tree.props.initialDelivery.id, 7);
  assert.equal(tree.props.initialStoreId, '1'); assert(adminPage.calls.some(([type, value]) => type === 'run' && value === 7));
  const operatorPage = serverPage('app/warehouse/scan/page.tsx', 'operator');
  await operatorPage.render({ action: 'RELEASE', destination: 'customer', runId: '7' }); assert.equal(operatorPage.calls.length, 0);
  const installationPage = serverPage('app/warehouse/scan/page.tsx');
  const installation = await installationPage.render({ action: 'RELEASE', destination: 'installation', storeId: 'unassigned' });
  assert.equal(installation.props.initialRelease, true); assert.equal(installation.props.initialStoreId, 'unassigned'); assert(!installationPage.calls.some(([type]) => type === 'run'));
});
test('deleted delivery deep links recover the list for admin and technician without hiding other API errors', async () => {
  const query = { action: 'RELEASE', destination: 'customer', runId: '7' };
  const admin = serverPage('app/warehouse/scan/page.tsx', 'admin', new ApiError('Not found', 404));
  assert.equal((await admin.render(query)).props.initialDelivery, null);
  await assert.rejects(() => serverPage('app/warehouse/scan/page.tsx', 'admin', new ApiError('Forbidden', 403)).render(query), /Forbidden/);
  const technicianPage = error => load('app/technician/warehouse/customer-deliveries/page.tsx', {
    '@/app/api/_base': { isApiError: value => value instanceof ApiError },
    '@/app/api/technician.api': { technicianState: async () => ({ stores: [store] }) },
    '@/app/api/customer-delivery-runs.api': { customerDeliveryRuns: async () => page([]), customerDeliveryRun: async () => { throw error; } },
    '@/app/warehouse/customer-deliveries/customer-delivery-runs-client': { CustomerDeliveryRunsClient: 'CustomerDeliveryRunsClient' },
    '../../customer-deliveries/technician-delivery-access': { requireTechnicianDeliveryUser: async () => ({ id: 10 }) },
    '../warehouse-data': { technicianStoreSelection: () => '' },
  }).default;
  const tree = await technicianPage(new ApiError('Not found', 404))({ searchParams: Promise.resolve(query) });
  assert.equal(nodes(tree, node => node.type === 'CustomerDeliveryRunsClient')[0].props.initialRun, null);
  await assert.rejects(() => technicianPage(new ApiError('Backend unavailable', 500))({ searchParams: Promise.resolve(query) }), /Backend unavailable/);
});

test('embedded delivery list opens and returns through the canonical Scan URL', async () => {
  const h = deliveryHarness({ props: { initialRun: null } });
  await click(h, 'Open delivery'); isCustomerUrl(h.urls.at(-1), { runId: '7', storeId: '1' });
  await click(h, 'Back to deliveries'); isCustomerUrl(h.urls.at(-1), { runId: null, storeId: '1' }); h.dispose();
});
test('available POs appear only after opening Add POs while included POs remain on the main delivery', () => {
  const h = deliveryHarness();
  assert.equal(ofType(h, 'CustomerDeliveryPoPicker'), undefined); assert.match(text(h.render()), /PO 293232/);
  openPoPicker(h); assert.equal(ofType(h, 'Dialog').props.open, true);
  assert.equal(ofType(h, 'CustomerDeliveryPoPicker').props.run.id, 7); h.dispose();
});
test('saving selected POs closes the picker and updates the included list before it is reopened', async () => {
  const added = { ...run().orders[0], key: 'external:2', poNumber: '293233', totalPieces: 0, totalParts: 0 };
  const calls = []; const updated = run({ orders: [...run().orders, added] });
  const h = deliveryHarness({ api: { addCustomerDeliveryPos: async (...args) => { calls.push(args); return updated; } } });
  openPoPicker(h); assert.equal(await ofType(h, 'CustomerDeliveryPoPicker').props.onAdd(['external:2']), true);
  assert.deepEqual(calls, [[7, ['external:2']]]); assert.equal(ofType(h, 'CustomerDeliveryPoPicker'), undefined);
  assert.match(text(h.render()), /PO 293233/); openPoPicker(h);
  assert(ofType(h, 'CustomerDeliveryPoPicker').props.run.orders.some(order => order.key === 'external:2')); h.dispose();
});
test('pending PO save blocks dismissal and failed save leaves picker open with the error', async () => {
  let rejectSave;
  const h = deliveryHarness({ api: { addCustomerDeliveryPos: async () => new Promise((_resolve, reject) => { rejectSave = reject; }) } });
  openPoPicker(h); const saving = ofType(h, 'CustomerDeliveryPoPicker').props.onAdd(['external:2']); await flush(); h.render();
  ofType(h, 'Dialog').props.onOpenChange(false); assert.equal(ofType(h, 'Dialog').props.open, true);
  rejectSave(new Error('PO could not be added')); assert.equal(await saving, false);
  assert.equal(ofType(h, 'Dialog').props.open, true); assert(ofType(h, 'CustomerDeliveryPoPicker'));
  assert.match(text(h.render()), /PO could not be added/); h.dispose();
});
test('embedded scanner propagates pending and camera focus to Scan navigation', () => {
  const h = deliveryHarness(); const scanner = ofType(h, 'ScanPad');
  scanner.props.onPendingChange(true); h.render(); assert.equal(h.busy.at(-1), true);
  scanner.props.onPendingChange(false); h.render(); assert.equal(h.busy.at(-1), false);
  scanner.props.onScanModeChange(true); h.render(); assert.equal(h.scanModes.at(-1), true);
  h.dispose(); assert.equal(h.busy.at(-1), false); assert.equal(h.scanModes.at(-1), false);
});

test('storage is selected before scanning, stays locked during a reading and can change for the same delivery', async () => {
  const empty = run({ multiStore: true, storeId: null, storeName: 'Multiple storages', items: [], allocations: [], totalParts: 0, totalPieces: 0 });
  const mainPart = { ...receipt.items[0], storeId: 1, storeName: 'Main' };
  const first = run({ multiStore: true, allocations: [mainPart] });
  const combined = run({ multiStore: true, totalParts: 2, totalPieces: 1, items: [{ ...receipt.items[0], quantity: 2, parts: { DOOR: 2 } }], allocations: [mainPart, { ...mainPart, storeId: 2, storeName: 'Overflow' }] });
  const calls = []; let finish;
  const api = {
    customerDeliveryRun: async () => ({ ...(calls.length ? first : empty), availableStorages: [{ storeId: 1, storeName: 'Main' }, { storeId: 2, storeName: 'Overflow' }] }),
    scanCustomerDeliveryPart: async (_id, body) => { calls.push(body); return calls.length === 1 ? new Promise(resolve => { finish = resolve; }) : combined; },
  };
  const props = { initialRun: empty, initialStores: [store, { ...store, id: 2, name: 'Overflow' }] };
  const h = deliveryHarness({ props, api });
  assert.equal(ofType(h, 'ScanPad').props.disabled, true); dialogFor(h, 'Choose storage').props.onOpenChange(true); await flush(); click(h, 'Main');
  assert.equal(ofType(h, 'ScanPad').props.disabled, false); assert.match(text(h.render()), /Scanning from: Main/);
  assert.equal(ofType(h, 'ScanPad').props.retryOnly, false);
  assert.equal(JSON.parse(storage.get('customer-delivery-run:10:source:7')).sourceConfirmed, true);
  const reading = ofType(h, 'ScanPad').props.onRead('1133926-DOOR', 'a0000000-0000-4000-8000-000000000010'); await flush();
  assert.equal(button(h, 'Change storage').props.disabled, true); assert.equal(h.busy.at(-1), true);
  dialogFor(h, 'Change storage').props.onOpenChange(true); assert.equal(dialogFor(h, 'Change storage').props.open, false);
  finish(first); ofType(h, 'ScanPad').props.onSaved(await reading);
  dialogFor(h, 'Change storage').props.onOpenChange(true); await flush(); click(h, 'Overflow');
  assert.match(text(h.render()), /Scanning from: Overflow/); h.dispose();
  const restored = deliveryHarness({ props: { ...props, initialRun: first }, api });
  assert.match(text(restored.render()), /Scanning from: Overflow/);
  ofType(restored, 'ScanPad').props.onSaved(await ofType(restored, 'ScanPad').props.onRead('1133926-DOOR', 'a0000000-0000-4000-8000-000000000011'));
  assert.deepEqual(calls.map(call => call.storeId), [1, 2]); assert.match(text(restored.render()), /1 pieces · 2 physical parts/);
  assert.match(text(restored.render()), /From Main/); assert.match(text(restored.render()), /From Overflow/); restored.dispose();
});
test('changing embedded callback identities never briefly unlocks a pending scan', () => {
  const h = deliveryHarness(); ofType(h, 'ScanPad').props.onPendingChange(true); h.render();
  assert.equal(h.busy.at(-1), true); const oldEvents = h.busy.length, nextBusy = [], nextModes = [];
  h.props.onBusy = value => nextBusy.push(value); h.props.onScanModeChange = value => nextModes.push(value); h.render();
  assert.equal(h.busy.length, oldEvents); assert.deepEqual(nextBusy, [true]); assert.deepEqual(nextModes, []);
  h.dispose(); assert.equal(nextBusy.at(-1), false); assert.equal(nextModes.at(-1), false);
});
test('mobile Change operation restarts only the embedded scanner and preserves the current delivery', async () => {
  const parent = scanHarness({ initialAction: 'RELEASE', initialCustomerDelivery: true, initialDeliveries: page([run()]), initialDelivery: run(), initialStoreId: '1' });
  const before = ofType(parent, 'CustomerDeliveryRunsClient');
  before.props.onScanModeChange(true);
  assert(button(parent, 'Change operation')); click(parent, 'Change operation');
  const after = ofType(parent, 'CustomerDeliveryRunsClient');
  assert.equal(after.key, before.key); assert.equal(after.props.scannerRevision, (before.props.scannerRevision ?? 0) + 1);
  assert.deepEqual(after.props.initialRun, before.props.initialRun); assert.deepEqual(after.props.initialList, before.props.initialList);
  assert.equal(after.props.initialStoreId, '1'); assert.equal(button(parent, 'Release from warehouse').props['aria-pressed'], true);
  assert.equal(parent.urls.length, 0); parent.dispose();

  const saved = run({ totalParts: 2, items: [{ ...receipt.items[0], quantity: 2, parts: { DOOR: 2 } }] });
  const child = deliveryHarness({ props: { scannerRevision: 0 }, api: { scanCustomerDeliveryPart: async () => saved } });
  dialogFor(child, 'Choose storage').props.onOpenChange(true); await flush(); click(child, 'Main');
  const scanner = ofType(child, 'ScanPad');
  scanner.props.onSaved(await scanner.props.onRead('1133926-DOOR', 'synthetic-reading'));
  const previousKey = ofType(child, 'ScanPad').key; assert.match(text(child.render()), /2 physical parts/);
  child.props.scannerRevision = 1;
  assert.notEqual(ofType(child, 'ScanPad').key, previousKey); assert.match(text(child.render()), /2 physical parts/);
  assert.match(text(child.render()), /Delivery #7/); assert.equal(child.urls.length, 0); child.dispose();
});
test('uncertain signed close keeps embedded parent locked after remount', async () => {
  const api = { closeCustomerDeliveryRun: async () => { throw new Error('Lost response'); } };
  const h = deliveryHarness({ api }); await click(h, 'Review and close delivery');
  for (const [id, value] of [['delivery-first-name', 'Synthetic'], ['delivery-last-name', 'Recipient']])
    nodes(h.render(), node => node.props?.id === id)[0].props.onChange({ target: { value } });
  ofType(h, 'SignaturePad').props.onChange([[{ x: .1, y: .1 }, { x: .2, y: .4 }, { x: .3, y: .2 }, { x: .4, y: .5 }, { x: .6, y: .2 }]]);
  nodes(h.render(), node => node.type === 'input' && node.props.type === 'checkbox').forEach(node => node.props.onChange({ target: { checked: true } }));
  await click(h, 'Sign and close delivery'); h.render(); assert.equal(h.busy.at(-1), true); h.dispose();
  const restored = deliveryHarness({ api }); restored.render(); assert.equal(restored.busy.at(-1), true);
  assert(button(restored, 'Check delivery close')); assert.equal(button(restored, 'Back to deliveries').props.disabled, true); restored.dispose();
});
test('embedded list creates without a storage choice and holds navigation during uncertain creation', async () => {
  const writes = [];
  const h = deliveryHarness({ props: { initialRun: null }, api: { createCustomerDeliveryRun: async body => { writes.push(body); throw new Error('Lost create response'); } } });
  assert.equal(ofType(h, 'StoreSelect'), undefined); assert(button(h, 'Active')); assert(button(h, 'Closed')); assert(button(h, 'Refresh'));
  await click(h, 'Create delivery'); h.render(); assert.equal(writes.length, 1); assert.equal(Object.hasOwn(writes[0], 'storeId'), false);
  assert.equal(ofType(h, 'StoreSelect'), undefined); assert.equal(h.busy.at(-1), true); assert(button(h, 'Check created delivery')); h.dispose();
});
test('old warehouse delivery links redirect preserving delivery and store selection', async () => {
  const p = serverPage('app/warehouse/customer-deliveries/page.tsx');
  await assert.rejects(() => p.render({ runId: '7', storeId: 'unassigned' }), error => { assert(error instanceof Redirect); isCustomerUrl(error.url, { runId: '7', storeId: 'unassigned' }); return true; });
  assert.equal(p.calls.length, 0);
});
test('old delivery links keep warehouse in Scan and direct factory deliveries in Pending receipt', async () => {
  const p = serverPage('app/warehouse/customer-deliveries/new/page.tsx');
  await assert.rejects(() => p.render({ source: 'WAREHOUSE', storeId: '1', runId: '7' }), error => { assert(error instanceof Redirect); isCustomerUrl(error.url, { storeId: '1', runId: '7' }); return true; });
  await assert.rejects(() => p.render({ source: 'TRANSIT', search: '293232', poKey: 'external:1' }), error => {
    assert(error instanceof Redirect); const url = new URL(error.url, 'https://example.test');
    assert.equal(url.pathname, '/warehouse/receipts'); assert.equal(url.searchParams.get('destination'), 'customer');
    assert.equal(url.searchParams.get('search'), '293232'); assert.equal(url.searchParams.get('poKey'), 'external:1');
    assert.equal(url.searchParams.has('source'), false); return true;
  });
  assert.deepEqual(p.calls, []);
});
test('inventory PO action keeps its exact source in the modal while generic and transit actions retain their paths', () => {
  const { WarehouseReleaseActions } = load('app/warehouse/release-actions.tsx', {
    './customer-deliveries/po-customer-delivery-action': { PoWarehouseReleaseActions: 'PoWarehouseReleaseActions' },
  });
  const onInstallationRelease = () => {};
  const tree = WarehouseReleaseActions({ source: 'WAREHOUSE', storeId: '1', poKey: 'external:1', poLabel: '293232', onInstallationRelease });
  assert.equal(tree.type, 'PoWarehouseReleaseActions');
  assert.equal(tree.props.onInstallationRelease, onInstallationRelease);
  assert.equal(tree.props.poKey, 'external:1'); assert.equal(tree.props.poLabel, '293232'); assert.equal(tree.props.storeId, '1');
  const internal = WarehouseReleaseActions({ source: 'WAREHOUSE', poKey: 'order:1', poLabel: '293232' });
  assert.equal(internal.props.poKey, 'order:1');
  const generic = WarehouseReleaseActions({ source: 'WAREHOUSE', storeId: '1' });
  const customer = nodes(generic, node => node.type === 'a' && text(node).startsWith('Deliver to customer'))[0];
  assert(customer); isCustomerUrl(customer.props.href, { storeId: '1' });
  const transit = WarehouseReleaseActions({ source: 'TRANSIT', poKey: 'external:1', poLabel: '293232' });
  const link = nodes(transit, node => node.type === 'a')[0]; const url = new URL(link.props.href, 'https://example.test');
  assert.equal(url.pathname, '/warehouse/receipts'); assert.equal(url.searchParams.get('destination'), 'customer'); assert.equal(url.searchParams.get('poKey'), 'external:1');
});

async function main() {
  let failures = 0;
  for (const { name, run } of tests) {
    storage.clear();
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack}`); }
  }
  if (failures) throw new Error(`${failures} customer delivery navigation checks failed.`);
  console.log(`${tests.length} customer delivery navigation checks passed.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
