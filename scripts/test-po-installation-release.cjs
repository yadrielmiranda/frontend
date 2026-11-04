/* Exact-PO installation release checks: synthetic stock and APIs only. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, 'test-customer-delivery-navigation.cjs'), 'utf8');
const helpers = { exports: {} };
new Function('require', 'module', '__dirname', `${source.slice(0, source.indexOf("test('warehouse navigation"))}\nmodule.exports={harness,load,nodes,text,ofType,button,click,storage,ApiError};`)(require, helpers, __dirname);
const { harness, load, nodes, text, ofType, button, click, storage, ApiError } = helpers.exports;
const sessions = new Map(); global.sessionStorage = { getItem: key => sessions.get(key) ?? null, setItem: (key, value) => sessions.set(key, value), removeItem: key => sessions.delete(key) };
const listeners = new Map(); window.addEventListener = (name, fn) => { const set = listeners.get(name) ?? new Set(); set.add(fn); listeners.set(name, set); }; window.removeEventListener = (name, fn) => listeners.get(name)?.delete(fn);
const connection = online => { navigator.onLine = online; for (const fn of listeners.get(online ? 'online' : 'offline') ?? []) fn(); };
const tests = [], test = (name, run) => tests.push({ name, run });
const account = { id: 10, role: { name: 'admin' } }, poKey = 'external:1', storeKey = 'warehouse-po-installation-release:10';
const unit = (lineNumber, extra = {}) => ({ lineNumber, barcode: `I${lineNumber}`, description: `Piece ${lineNumber}`, mark: '1', version: 4, product: '', system: '', configuration: '', unassigned: 0, onHand: 5, stores: [{ id: 1, name: 'Storage 1', isActive: true, onHand: 3 }, { id: 2, name: 'Storage 2', isActive: true, onHand: 2 }],
  partTracking: { types: ['DOOR', 'FRAME'], expected: { DOOR: 2, FRAME: 1 }, onHand: { DOOR: 2, FRAME: 1, UNKNOWN: 2 }, inTransit: {}, released: {}, unassigned: {}, stores: [{ id: 1, parts: { DOOR: 2, FRAME: 1 } }, { id: 2, parts: { UNKNOWN: 2 } }] }, ...extra });
const group = () => ({ key: poKey, poNumber: '293232', units: [unit('101'), unit('102', { version: 2, onHand: 1, stores: [], unassigned: 1, partTracking: undefined })] });
const summary = { units: 2, parts: 6, stores: [{ storeId: 1, storeName: 'Storage 1', parts: 3 }, { storeId: 2, storeName: 'Storage 2', parts: 2 }, { storeId: null, storeName: 'Unassigned', parts: 1 }], replayed: false };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
let counter = 0;
function dialog({ props = {}, options = async () => ({ group: group(), activeCountId: null }), release = async () => summary, auth = {} } = {}) {
  const calls = [], completed = [], closes = [];
  const session = { user: account, revalidate: async () => account, ...auth };
  const h = harness('app/warehouse/releases/po-installation-release-dialog.tsx', 'PoInstallationReleaseDialog', {
    open: true, poKey, poLabel: '293232', storeId: 'all', onOpenChange: value => closes.push(value), onComplete: () => completed.push(true), ...props,
  }, {
    '@/contexts/AuthContext': { useAuth: () => session }, '@/app/api/_base': { ApiError, isApiError: e => e instanceof ApiError },
    '@/app/api/warehouse.api': { warehouseRequestKey: () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}` },
    '@/app/api/po-installation-release.api': { poInstallationReleaseOptions: async (...args) => { calls.push(['options', ...args]); return options(...args); }, releasePoToInstallation: async body => { calls.push(['release', body]); return release(body); } },
    '../factory-part-quantity': { FactoryPartQuantity: 'FactoryPartQuantity' }, '../warehouse-shared': { CountNotice: 'CountNotice', errorMessage: e => e.message },
  });
  return Object.assign(h, { calls, completed, closes, session });
}
const controls = h => nodes(h.render(), node => node.type === 'FactoryPartQuantity');
const change = (h, index, quantity, parts) => controls(h)[index].props.onChange({ quantity: String(quantity), ...(parts ? { parts } : {}) });
const writes = h => h.calls.filter(([name]) => name === 'release');
function recovery() {
  return load('app/warehouse/releases/po-installation-release-dialog.tsx', { '@/contexts/AuthContext': {}, '@/app/api/_base': { ApiError, isApiError: e => e instanceof ApiError }, '@/app/api/warehouse.api': {}, '@/app/api/po-installation-release.api': {}, '../factory-part-quantity': {}, '../warehouse-shared': {} }).pendingPoInstallationRelease;
}

test('opening shows only exact PO, all origins selected, one confirmation and no catalog or scanner', async () => {
  const h = dialog(); await h.settle(); assert.deepEqual(h.calls, [['options', poKey, 'all']]); assert.deepEqual(writes(h), []);
  assert.equal(controls(h).length, 3); assert.deepEqual(controls(h).map(node => node.props.quantity), ['3', '2', '1']); assert(controls(h).every(node => node.props.min === 0));
  assert.match(text(h.render()), /2 pieces · 6 physical parts/); assert.equal(nodes(h.render(), node => node.type === 'Dialog').length, 1);
  assert(!nodes(h.render(), node => ['ScanPad', 'SignaturePad', 'StoreSelect'].includes(node.type)).length); assert(button(h, 'Confirm release')); h.dispose();
});

test('same piece across storages keeps one version and separate source allocations; success survives parent rerenders', async () => {
  const response = deferred(), h = dialog({ release: async () => response.promise }); await h.settle();
  const handler = button(h, 'Confirm release').props.onClick; const first = handler(); handler(); await h.settle(); assert.equal(writes(h).length, 1);
  const body = writes(h)[0][1]; assert.equal(body.poKey, poKey); assert.deepEqual(body.items, [{ barcode: 'I101', storeId: 1, version: 4, quantity: 3 }, { barcode: 'I101', storeId: 2, version: 4, quantity: 2 }, { barcode: 'I102', storeId: null, version: 2, quantity: 1 }]);
  assert.equal(storage.size, 1); response.resolve(summary); await first; await h.settle(); assert.equal(h.completed.length, 1); assert.equal(storage.size, 0);
  h.props.onComplete = () => h.completed.push('new callback'); await h.settle(); assert.equal(h.completed.length, 1); assert.match(text(h.render()), /Release recorded/);
  connection(false); await h.settle(); connection(true); await h.settle(); assert.match(text(h.render()), /Release recorded/); assert.equal(button(h, 'Confirm release'), undefined); assert.equal(h.calls.filter(([name]) => name === 'options').length, 1);
  click(h, 'Done'); assert.deepEqual(h.closes, [false]); h.dispose();
});

test('partial typed quantities and zero exclusions preserve UNKNOWN without inventing classifications', async () => {
  const h = dialog(); await h.settle(); change(h, 0, 0); change(h, 1, 1, { UNKNOWN: 1 }); change(h, 2, 0);
  assert.match(text(h.render()), /1 pieces · 1 physical parts/); await click(h, 'Confirm release');
  assert.deepEqual(writes(h)[0][1].items, [{ barcode: 'I101', storeId: 2, version: 4, quantity: 1, parts: { UNKNOWN: 1 } }]); h.dispose();
  const typed = dialog(); await typed.settle(); change(typed, 0, 2, { DOOR: 1, FRAME: 1 }); change(typed, 1, 0); change(typed, 2, 0); await click(typed, 'Confirm release');
  assert.deepEqual(writes(typed)[0][1].items[0].parts, { DOOR: 1, FRAME: 1 }); typed.dispose();
});

test('storage filters are enforced and all-zero or invalid quantities cannot release', async () => {
  for (const [scope, expected] of [['1', ['1']], ['unassigned', ['unassigned']]]) {
    const h = dialog({ props: { storeId: scope } }); await h.settle(); assert.deepEqual(h.calls[0], ['options', poKey, scope]); assert.deepEqual(controls(h).map(node => node.props.storeId), expected);
    change(h, 0, 0); assert(button(h, 'Confirm release').props.disabled); assert.match(text(h.render()), /Select at least one/); change(h, 0, 999); assert(button(h, 'Confirm release').props.disabled); assert.deepEqual(writes(h), []); h.dispose();
  }
});

test('lost response persists original request and snapshot for host recovery even after filter or stock changed', async () => {
  const h = dialog({ release: async () => { throw new Error('Connection lost'); } }); await h.settle(); change(h, 0, 2, { DOOR: 1, FRAME: 1 }); await click(h, 'Confirm release'); await h.settle();
  const body = writes(h)[0][1]; assert.equal(controls(h).length, 0); assert(button(h, 'Check release')); assert.equal(storage.size, 1);
  assert.deepEqual(recovery()(10), { poKey, poLabel: '293232', storeId: 'all' }); h.dispose();
  const restored = dialog({ props: { storeId: '1' }, options: async () => { throw new Error('Must not reload quantities for pending request'); } }); await restored.settle();
  assert.equal(restored.calls.length, 0); assert.match(text(restored.render()), /Storage 2/); await click(restored, 'Check release'); assert.deepEqual(writes(restored)[0][1], body); assert.equal(restored.completed.length, 1); assert.equal(storage.size, 0); restored.dispose();
});

test('fresh physical count blocks confirm but a saved request can still recover', async () => {
  const blocked = dialog({ options: async () => ({ group: group(), activeCountId: 3 }) }); await blocked.settle(); assert(ofType(blocked, 'CountNotice')); assert(button(blocked, 'Confirm release').props.disabled); blocked.dispose();
  const lost = dialog({ release: async () => { throw new Error('Lost'); } }); await lost.settle(); await click(lost, 'Confirm release'); lost.dispose();
  const restored = dialog({ options: async () => ({ group: group(), activeCountId: 3 }) }); await restored.settle(); assert(!button(restored, 'Check release').props.disabled); await click(restored, 'Check release'); assert.equal(restored.completed.length, 1); restored.dispose();
});

test('stale stock rejection clears uncertain intent, refreshes options, retains explanation and requires new confirmation', async () => {
  let failed = false;
  const h = dialog({ options: async () => ({ group: { ...group(), units: group().units.map(unit => ({ ...unit, version: failed ? 9 : unit.version })) }, activeCountId: null }), release: async () => { failed = true; throw new ApiError('Stock changed', 409); } });
  await h.settle(); await click(h, 'Confirm release'); await h.settle(); assert.equal(storage.size, 0); assert.equal(writes(h).length, 1); assert.equal(h.calls.filter(([name]) => name === 'options').length, 2);
  assert.match(text(h.render()), /Stock changed.*Review the updated/); assert(button(h, 'Confirm release')); h.dispose();
});

test('legacy pending release and another PO pending intent block new confirmations', async () => {
  for (const prefix of ['warehouse', 'technician']) {
    sessions.set(`${prefix}-installation-release:10`, '{}'); const h = dialog(); await h.settle(); assert.equal(h.calls.length, 0); assert(button(h, 'Confirm release').props.disabled); assert.match(text(h.render()), /Recover previous release/); h.dispose(); sessions.clear();
  }
  const lost = dialog({ release: async () => { throw new Error('Lost'); } }); await lost.settle(); await click(lost, 'Confirm release'); lost.dispose();
  const other = dialog({ props: { poKey: 'order:2', poLabel: 'Other' } }); await other.settle(); assert.equal(other.calls.length, 0); assert(button(other, 'Confirm release').props.disabled); assert.match(text(other.render()), /unconfirmed release for PO 293232/); other.dispose();
});

test('401 preserves pending body; changed account, offline and unavailable storage cannot submit new requests', async () => {
  const unauthorized = dialog({ release: async () => { throw new ApiError('Sign in again', 401); } }); await unauthorized.settle(); await click(unauthorized, 'Confirm release'); await unauthorized.settle(); assert.equal(storage.size, 1); assert(button(unauthorized, 'Check release')); unauthorized.dispose(); storage.clear();
  const changed = dialog({ auth: { revalidate: async () => ({ id: 11, role: { name: 'admin' } }) } }); await changed.settle(); await click(changed, 'Confirm release'); assert.deepEqual(writes(changed), []); changed.dispose();
  const offline = dialog(); await offline.settle(); connection(false); await button(offline, 'Confirm release').props.onClick(); assert.deepEqual(writes(offline), []); offline.dispose(); connection(true);
  const original = localStorage.setItem; localStorage.setItem = () => { throw new Error('Storage unavailable'); }; const unavailable = dialog(); await unavailable.settle(); await click(unavailable, 'Confirm release'); assert.deepEqual(writes(unavailable), []); unavailable.dispose(); localStorage.setItem = original;
});

test('late old PO options cannot replace the current target; bad persisted data is surfaced to host', async () => {
  const old = deferred(); const h = dialog({ options: key => key === poKey ? old.promise : Promise.resolve({ group: { key: 'order:2', units: [unit('202')] }, activeCountId: null }) });
  h.props.poKey = 'order:2'; h.props.poLabel = 'Second'; await h.settle(); old.resolve({ group: group(), activeCountId: null }); await h.settle(); assert.match(text(h.render()), /Piece 202/); assert.doesNotMatch(text(h.render()), /Piece 101/); h.dispose();
  storage.set(storeKey, '{broken'); assert.throws(() => recovery()(10)); const malformed = dialog(); await malformed.settle(); assert(button(malformed, 'Confirm release').props.disabled); assert.deepEqual(writes(malformed), []); malformed.dispose();
});

test('changing storage scope during account verification cannot submit the previous selection', async () => {
  const verification = deferred(); const h = dialog({ auth: { revalidate: async () => verification.promise } });
  await h.settle(); const request = click(h, 'Confirm release'); h.props.storeId = '1'; await h.settle(); verification.resolve(account); await request; await h.settle();
  assert.deepEqual(writes(h), []); assert.equal(storage.size, 0); assert.deepEqual(controls(h).map(node => node.props.storeId), ['1']); h.dispose();
});

test('API wrappers use exact contextual endpoints and preserve origin quantities', async () => {
  const calls = []; const api = load('app/api/po-installation-release.api.ts', { './_base': { apiFetch: async (...args) => { calls.push(args); return {}; } } });
  await api.poInstallationReleaseOptions(poKey, 'unassigned'); const body = { requestKey: 'key', poKey, items: [{ barcode: 'I101', storeId: null, quantity: 1, parts: { UNKNOWN: 1 }, version: 4 }] }; await api.releasePoToInstallation(body);
  assert.deepEqual(calls[0], ['/api/warehouse/releases/po-options', { query: { poKey, storeId: 'unassigned' }, cache: 'no-store' }]); assert.deepEqual(calls[1], ['/api/warehouse/releases/po', { method: 'POST', body, timeoutMs: 90000 }]);
});

(async () => { for (const { name, run } of tests) { storage.clear(); sessions.clear(); connection(true); await run(); console.log(`PASS ${name}`); } console.log(`${tests.length} contextual installation release checks passed.`); })().catch(error => { console.error(error); process.exitCode = 1; });
