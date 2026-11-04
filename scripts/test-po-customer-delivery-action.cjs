/* Contextual manual PO delivery checks. Synthetic responses only; no stock or database writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const navigation = fs.readFileSync(path.join(__dirname, 'test-customer-delivery-navigation.cjs'), 'utf8');
const helpers = { exports: {} };
new Function('require', 'module', '__dirname', `${navigation.slice(0, navigation.indexOf("test('warehouse navigation"))}\nmodule.exports={harness,load,nodes,text,ofType,button,click,storage,ApiError};`)(require, helpers, __dirname);
const { harness, load, nodes, text, ofType, button, click, storage, ApiError } = helpers.exports;
const tests = [], test = (name, run) => tests.push({ name, run });
const poKey = 'external:1';
const account = { id: 10, role: { name: 'admin' } };
const run = (id = 7, orders = [{ key: poKey, poNumber: '293232' }]) => ({ id, orders, status: 'ACTIVE', totalParts: 2 });
const page = (items = [run()], current = 1, total = items.length) => ({ items, page: current, pageSize: 10, total });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
let nextKey = 0;
function action({ props = {}, api = {}, auth = {} } = {}) {
  const calls = [], urls = [];
  const session = { user: account, revalidate: async () => account, ...auth };
  const wrapped = name => async (...args) => { calls.push([name, ...args]); return api[name](...args); };
  api = { customerDeliveryRuns: async () => page(), recordManualCustomerDelivery: async body => run(body.runId ?? 7), createCustomerDeliveryRun: async () => run(), addCustomerDeliveryPos: async id => run(id), ...api };
  const h = harness('app/warehouse/customer-deliveries/po-customer-delivery-action.tsx', 'PoWarehouseReleaseActions', {
    poKey, poLabel: '293232', storeId: 'all', search: 'same PO', compact: true, ...props,
  }, {
    'next/navigation': { useRouter: () => ({ push: url => urls.push(url) }) },
    '@/contexts/AuthContext': { useAuth: () => session },
    '@/app/api/_base': { ApiError, isApiError: e => e instanceof ApiError },
    '@/app/api/warehouse.api': { warehouseRequestKey: () => `00000000-0000-4000-8000-${String(++nextKey).padStart(12, '0')}` },
    '@/app/api/customer-delivery-runs.api': Object.fromEntries(Object.keys(api).map(name => [name, wrapped(name)])),
    '../warehouse-shared': { errorMessage: e => e.message, Pagination: 'Pagination' },
  });
  return Object.assign(h, { calls, urls, session });
}
const open = h => nodes(h.render(), node => node.type === 'DropdownMenuItem' && text(node).startsWith('Deliver to customer'))[0].props.onSelect();
const select = (h, id) => ofType(h, 'select').props.onChange({ target: { value: String(id) } });
const writes = h => h.calls.filter(([name]) => name !== 'customerDeliveryRuns');
const url = id => `/warehouse/scan?action=RELEASE&destination=customer&runId=${id}&manual=1`;
const storageKey = `customer-delivery-po:10:${poKey}`;

test('PO action opens a sibling modal without mutations; installation preserves PO and storage', async () => {
  const h = action({ props: { storeId: '2' } }); await h.settle(); assert.equal(ofType(h, 'Dialog').props.open, false);
  open(h); await h.settle(); assert.equal(ofType(h, 'Dialog').props.open, true);
  assert.match(text(h.render()), /Deliver PO 293232/); assert.doesNotMatch(text(h.render()), /then scan|scan its parts/i); assert.deepEqual(writes(h), []); assert.deepEqual(h.urls, []);
  const link = nodes(h.render(), node => node.type === 'a')[0], parsed = new URL(link.props.href, 'https://example.test');
  assert.equal(parsed.pathname, '/warehouse/releases/new'); assert.equal(parsed.searchParams.get('poKey'), poKey); assert.equal(parsed.searchParams.get('storeId'), '2'); assert.equal(parsed.searchParams.get('search'), 'same PO');
  assert.equal(nodes(ofType(h, 'DropdownMenu'), node => node.type === 'Dialog').length, 0); h.dispose();
});

test('inventory installation action opens its contextual modal without navigation or customer mutation', async () => {
  let opened = 0; const h = action({ props: { onInstallationRelease: () => { opened++; } } });
  await h.settle();
  const option = nodes(h.render(), node => node.type === 'DropdownMenuItem' && text(node).startsWith('Release to installation'))[0];
  assert(option); option.props.onSelect(); await h.settle();
  assert.equal(opened, 1); assert.deepEqual(writes(h), []); assert.deepEqual(h.urls, []);
  assert.equal(ofType(h, 'Dialog').props.open, false); h.dispose();
});

test('create records all available PO parts atomically once and opens manual mode', async () => {
  const response = deferred(); const h = action({ api: { recordManualCustomerDelivery: async () => response.promise } });
  await h.settle(); open(h); await h.settle(); const first = click(h, 'Create delivery with this PO');
  button(h, 'Create delivery with this PO').props.onClick(); await h.settle(); assert.equal(writes(h).length, 1);
  const [name, body] = writes(h)[0]; assert.equal(name, 'recordManualCustomerDelivery'); assert.equal(body.poKey, poKey); assert(!Object.hasOwn(body, 'storeId')); assert(!Object.hasOwn(body, 'runId')); assert(!Object.hasOwn(body, 'items'));
  assert.equal(storage.size, 1); response.resolve(run(15)); await first; await h.settle(); assert.deepEqual(h.urls, [url(15)]); assert.equal(storage.size, 0); h.dispose();
});

test('existing delivery always records available parts even when PO is already planned or partly scanned', async () => {
  const h = action({ api: { customerDeliveryRuns: async () => page([run(7), run(8, [{ key: 'order:1', poNumber: '293232' }])]) } });
  await h.settle(); open(h); await h.settle(); select(h, 7); assert.equal(button(h, 'Open delivery'), undefined); await click(h, 'Add parts and open');
  assert.equal(writes(h)[0][0], 'recordManualCustomerDelivery'); assert.equal(writes(h)[0][1].runId, 7); assert.equal(writes(h)[0][1].poKey, poKey);
  open(h); await h.settle(); select(h, 8); await click(h, 'Add parts and open');
  assert.equal(writes(h)[1][1].runId, 8); assert.equal(writes(h)[1][1].poKey, 'external:1'); assert.deepEqual(h.urls, [url(7), url(8)]); h.dispose();
});

test('inventory storage filters scope the manual operation including unassigned stock', async () => {
  for (const [filter, expected] of [['2', 2], ['unassigned', null]]) {
    const h = action({ props: { storeId: filter } }); await h.settle(); open(h); await h.settle(); await click(h, 'Create delivery with this PO');
    assert.equal(writes(h)[0][1].storeId, expected); assert.deepEqual(h.urls, [url(7)]); h.dispose();
  }
  const invalid = action({ props: { storeId: 'bad-filter' } }); await invalid.settle(); open(invalid); await invalid.settle(); await click(invalid, 'Create delivery with this PO');
  assert.deepEqual(writes(invalid), []); assert.match(text(invalid.render()), /Choose a valid storage filter/); invalid.dispose();
});

test('lost manual response survives reload and retries original key, PO, run and storage despite changed filter', async () => {
  const h = action({ props: { storeId: '2' }, api: { recordManualCustomerDelivery: async () => { throw new Error('Connection lost'); } } });
  await h.settle(); open(h); await h.settle(); select(h, 7); await click(h, 'Add parts and open'); await h.settle();
  const first = writes(h)[0][1]; assert.equal(storage.size, 1); h.dispose();
  const restored = action({ props: { storeId: 'all' } }); await restored.settle(); assert.equal(ofType(restored, 'Dialog').props.open, false); open(restored); await restored.settle();
  assert.equal(button(restored, 'Create delivery with this PO'), undefined); await click(restored, 'Retry request');
  assert.deepEqual(writes(restored)[0][1], first); assert.deepEqual(restored.urls, [url(7)]); assert.equal(storage.size, 0); restored.dispose();
});

test('401 preserves manual intent while definitive errors clear it and refresh options', async () => {
  let error = new ApiError('Sign in again', 401);
  const h = action({ api: { recordManualCustomerDelivery: async () => { throw error; } } });
  await h.settle(); open(h); await h.settle(); await click(h, 'Create delivery with this PO'); await h.settle(); assert.equal(storage.size, 1);
  error = new ApiError('PO is unavailable', 400); await click(h, 'Retry request'); await h.settle();
  assert.equal(storage.size, 0); assert(button(h, 'Create delivery with this PO')); assert.match(text(h.render()), /PO is unavailable/);
  assert(h.calls.filter(([name]) => name === 'customerDeliveryRuns').length >= 2); h.dispose();
});

test('legacy create and add intents recover only their original APIs until a new explicit manual action', async () => {
  for (const actionName of ['create', 'add']) {
    const saved = { action: actionName, poKey, requestKey: '00000000-0000-4000-8000-000000000999', ...(actionName === 'add' ? { runId: 7 } : {}) };
    storage.set(storageKey, JSON.stringify(saved));
    const h = action(); await h.settle(); open(h); await h.settle(); await click(h, 'Retry request'); await h.settle();
    const expected = actionName === 'create' ? ['createCustomerDeliveryRun', { requestKey: saved.requestKey, poKeys: [poKey] }] : ['addCustomerDeliveryPos', 7, [poKey], saved.requestKey];
    assert.deepEqual(writes(h), [expected]); assert.deepEqual(h.urls, []); assert.equal(storage.size, 0); assert.match(text(h.render()), /earlier request only added the PO/);
    select(h, 7); await click(h, 'Add parts and open'); assert.equal(writes(h).at(-1)[0], 'recordManualCustomerDelivery'); assert.notEqual(writes(h).at(-1)[1].requestKey, saved.requestKey); assert.deepEqual(h.urls, [url(7)]); h.dispose();
  }
});

test('closed or removed-PO replay does not silently reopen or re-add parts', async () => {
  for (const result of [{ ...run(), status: 'CLOSED' }, run(7, [])]) {
    storage.set(storageKey, JSON.stringify({ action: 'manual', poKey, requestKey: '00000000-0000-4000-8000-000000000999', runId: 7 }));
    const h = action({ api: { recordManualCustomerDelivery: async () => result } }); await h.settle(); open(h); await h.settle(); await click(h, 'Retry request'); await h.settle();
    assert.equal(writes(h).length, 1); assert.deepEqual(h.urls, []); assert.equal(storage.size, 0); assert.match(text(h.render()), /already been closed|no longer in that delivery/); h.dispose();
  }
});

test('desktop and mobile copies never auto-open recovery and explicit opening rechecks storage', async () => {
  const desktop = action(), mobile = action(); await desktop.settle(); await mobile.settle();
  storage.set(storageKey, JSON.stringify({ action: 'manual', poKey, requestKey: '00000000-0000-4000-8000-000000000999' }));
  assert.equal(ofType(desktop, 'Dialog').props.open, false); assert.equal(ofType(mobile, 'Dialog').props.open, false);
  open(mobile); await mobile.settle(); assert.equal(ofType(desktop, 'Dialog').props.open, false); await click(mobile, 'Retry request'); await mobile.settle();
  open(desktop); await desktop.settle(); assert(button(desktop, 'Create delivery with this PO')); assert.equal(button(desktop, 'Retry request'), undefined); desktop.dispose(); mobile.dispose();
});

test('pagination can record parts into a delivery beyond the first page', async () => {
  const h = action({ api: { customerDeliveryRuns: async query => page([run(query.page === 2 ? 18 : 7, [])], query.page, 15) } });
  await h.settle(); open(h); await h.settle(); ofType(h, 'Pagination').props.onPage(2); await h.settle(); select(h, 18); await click(h, 'Add parts and open');
  assert(h.calls.some(([name, query]) => name === 'customerDeliveryRuns' && query.page === 2)); assert.equal(writes(h)[0][1].runId, 18); assert.equal(writes(h)[0][1].poKey, poKey); h.dispose();
});

test('operator, offline, changed identity and unavailable persistence cannot mutate', async () => {
  const operator = action({ auth: { user: { id: 10, role: { name: 'operator' } } } }); await operator.settle();
  assert(!nodes(operator.render(), node => node.type === 'DropdownMenuItem' && text(node).startsWith('Deliver to customer')).length); assert(nodes(operator.render(), node => node.type === 'a').length); operator.dispose();
  const offline = action(); await offline.settle(); open(offline); await offline.settle(); navigator.onLine = false; await button(offline, 'Create delivery with this PO').props.onClick(); assert.deepEqual(writes(offline), []); navigator.onLine = true; offline.dispose();
  const changed = action({ auth: { revalidate: async () => ({ id: 11, role: { name: 'admin' } }) } }); await changed.settle(); open(changed); await changed.settle(); await click(changed, 'Create delivery with this PO'); assert.deepEqual(writes(changed), []); assert.match(text(changed.render()), /Your session changed/); changed.dispose();
  const original = localStorage.getItem; localStorage.getItem = () => { throw new Error('Storage unavailable'); };
  const unavailable = action(); await unavailable.settle(); open(unavailable); await unavailable.settle(); assert.equal(button(unavailable, 'Create delivery with this PO').props.disabled, true); assert.deepEqual(writes(unavailable), []); unavailable.dispose(); localStorage.getItem = original;
});

test('late manual mutation from another PO context cannot navigate the current PO', async () => {
  const response = deferred(); const h = action({ api: { recordManualCustomerDelivery: async () => response.promise } });
  await h.settle(); open(h); await h.settle(); const pending = click(h, 'Create delivery with this PO'); await h.settle();
  h.props.poKey = 'order:2'; h.props.poLabel = 'OTHER'; await h.settle(); response.resolve(run()); await pending; await h.settle();
  assert.deepEqual(h.urls, []); assert.equal(ofType(h, 'Dialog').props.open, false); assert.equal(storage.size, 1); h.dispose();
});

test('API manual wrapper sends exact scope while preserving legacy create/add bodies', async () => {
  const calls = []; const api = load('app/api/customer-delivery-runs.api.ts', { './_base': { apiFetch: async (...args) => { calls.push(args); return run(); } } });
  const manual = { requestKey: 'manual-key', poKey, runId: 7, storeId: null }; await api.recordManualCustomerDelivery(manual);
  assert.deepEqual(calls.shift(), ['/api/warehouse/customer-delivery-runs/manual', { method: 'POST', body: manual }]);
  await api.createCustomerDeliveryRun({ requestKey: 'create-key', poKeys: [poKey] }); await api.addCustomerDeliveryPos(7, [poKey], 'add-key'); await api.addCustomerDeliveryPos(7, ['order:1']);
  assert.deepEqual(calls.map(([, options]) => options.body), [{ requestKey: 'create-key', poKeys: [poKey] }, { poKeys: [poKey], requestKey: 'add-key' }, { poKeys: ['order:1'] }]);
});

(async () => { for (const { name, run } of tests) { storage.clear(); await run(); console.log(`PASS ${name}`); } console.log(`${tests.length} contextual manual PO delivery checks passed.`); })().catch(error => { console.error(error); process.exitCode = 1; });
