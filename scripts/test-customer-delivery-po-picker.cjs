/* Focused offline PO-picker checks. No network, database, scans or stock writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
// Reuse the navigation suite's synthetic React harness without running its tests.
const navigation = fs.readFileSync(path.join(__dirname, 'test-customer-delivery-navigation.cjs'), 'utf8');
const helpers = { exports: {} };
new Function('require', 'module', '__dirname', `${navigation.slice(0, navigation.indexOf("test('warehouse navigation"))}\nmodule.exports={harness,load,nodes,text,ofType,button,click};`)(require, helpers, __dirname);
const { harness, load, nodes, text, ofType, button, click } = helpers.exports;
const tests = [], test = (name, run) => tests.push({ name, run });
const unit = (lineNumber, available = 2, extra = {}) => ({ lineNumber, onHand: available + 8, unassigned: 0, inTransit: 7, stores: [{ id: 1, name: 'Main', onHand: available }, { id: 2, name: 'Other', onHand: 8 }], ...extra });
const group = (key, poNumber, units = [unit('1001')], extra = {}) => ({ key, poNumber, source: key.startsWith('order:') ? 'ORDER' : 'EXTERNAL', orderNumber: key.startsWith('order:') ? 'SO1' : '', customer: 'Synthetic Customer', project: '', units, ...extra });
const page = (items, current = 1, total = items.length) => ({ items, page: current, pageSize: 10, total, activeCountId: null, summary: {} });
const run = (extra = {}) => ({ id: 7, multiStore: true, storeId: null, storeName: 'Multiple storages', status: 'ACTIVE', orders: [], ...extra });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
function picker({ props = {}, lookup = async () => page([group('external:1', '293232')]), onAdd = async () => true } = {}) {
  const calls = [], additions = [];
  const h = harness('app/warehouse/customer-deliveries/customer-delivery-po-picker.tsx', 'CustomerDeliveryPoPicker', {
    run: run(), technician: false, disabled: false, onAdd: async keys => { additions.push([...keys]); return onAdd(keys); }, ...props,
  }, {
    '@/app/api/customer-delivery-runs.api': { customerDeliveryPoOptions: async (runId, query) => { calls.push({ runId, ...query }); return lookup(query, runId); } },
    '@/app/api/warehouse.api': { warehouseInventoryByPo: async () => { throw new Error('Use the run-scoped PO options'); } },
    '@/app/api/technician-warehouse.api': { technicianWarehouseInventoryByPo: async () => { throw new Error('Use the role-safe run-scoped PO options'); } },
    '../warehouse-shared': { errorMessage: e => e.message, Pagination: 'Pagination' }, '../unit-origin': { UnitOrigin: 'UnitOrigin' },
  });
  return Object.assign(h, { calls, additions });
}
const checkboxes = h => nodes(h.render(), node => node.type === 'input' && node.props.type === 'checkbox');
const select = (h, index, checked = true) => { const box = checkboxes(h)[index]; assert(box && !box.props.disabled); box.props.onChange({ target: { checked } }); };
const search = (h, value) => { ofType(h, 'Input').props.onChange({ target: { value } }); ofType(h, 'form').props.onSubmit({ preventDefault() {} }); };

test('PO options include all warehouse storages while excluding transit-only stock', async () => {
  const h = picker({ lookup: async () => page([
    group('external:1', '293232', [unit('1001', 2, { onHand: 3, stores: [{ id: 1, name: 'Main', onHand: 2 }, { id: 2, name: 'Other', onHand: 1 }] }), unit('1002', 0, { onHand: 4, stores: [{ id: 2, name: 'Other', onHand: 4 }] })]),
    group('external:2', '293233', [unit('1003', 0, { onHand: 5, stores: [{ id: 2, name: 'Other', onHand: 5 }] })]),
    group('external:3', '293234', [unit('1004', 0, { onHand: 0, stores: [], inTransit: 20 })]),
  ]) }); await h.settle();
  assert.deepEqual(h.calls, [{ runId: 7, page: 1, pageSize: 10, search: '' }]);
  assert.equal(checkboxes(h).length, 2); assert.match(text(h.render()), /2 pieces · 7 physical parts available/);
  assert.match(text(h.render()), /PO 293233/); assert.match(text(h.render()), /Main/); assert.match(text(h.render()), /Other/);
  assert.doesNotMatch(text(h.render()), /PO 293234/); assert.equal(h.additions.length, 0); h.dispose();
});
test('technicians use the same role-safe run options and see unassigned stock', async () => {
  const h = picker({ props: { technician: true }, lookup: async () => page([group('external:1', '293232', [unit('1001', 0, { onHand: 1, stores: [], unassigned: 1 })])]) });
  await h.settle(); assert.deepEqual(h.calls[0], { runId: 7, page: 1, pageSize: 10, search: '' });
  assert.match(text(h.render()), /1 piece · 1 physical part available/); assert.match(text(h.render()), /Unassigned/); h.dispose();
});
test('search and pagination preserve exact source keys; failed add retains selections for retry', async () => {
  let succeed = false;
  const h = picker({ onAdd: async () => succeed, lookup: async query => query.search
    ? page([group('order:1', 'SAME')], 1, 1)
    : query.page === 2 ? page([group('external:2', '293233')], 2, 20) : page([group('external:1', 'SAME')], 1, 20) });
  await h.settle(); select(h, 0); ofType(h, 'Pagination').props.onPage(2); await h.settle(); select(h, 0);
  search(h, 'SAME'); await h.settle(); select(h, 0); assert.match(text(h.render()), /3 POs selected across pages/);
  await click(h, 'Add selected POs'); assert.deepEqual(h.additions[0], ['external:1', 'external:2', 'order:1']);
  assert.match(text(h.render()), /3 POs selected across pages/); succeed = true; await click(h, 'Add selected POs');
  assert.deepEqual(h.additions[1], h.additions[0]); assert.match(text(h.render()), /0 POs selected/); h.dispose();
});
test('already included POs are checked and disabled and remaining capacity enforces 50 total POs', async () => {
  const included = Array.from({ length: 49 }, (_, i) => ({ key: `external:${100 + i}` }));
  const h = picker({ props: { run: run({ orders: included }) }, lookup: async () => page([group('external:100', 'ADDED'), group('external:1', 'NEW1'), group('external:2', 'NEW2')]) });
  await h.settle(); assert.equal(checkboxes(h)[0].props.checked, true); assert.equal(checkboxes(h)[0].props.disabled, true);
  select(h, 1); assert.equal(checkboxes(h)[2].props.disabled, true); await click(h, 'Add selected POs'); assert.deepEqual(h.additions, [['external:1']]); h.dispose();
});
test('a late old search cannot replace the latest available PO results', async () => {
  const old = deferred(), fresh = deferred();
  const h = picker({ lookup: query => query.search === 'fresh' ? fresh.promise : old.promise });
  search(h, 'fresh'); h.render(); fresh.resolve(page([group('external:2', 'FRESH')])); await h.settle();
  old.resolve(page([group('external:1', 'OLD')])); await h.settle(); assert.match(text(h.render()), /PO FRESH/); assert.doesNotMatch(text(h.render()), /PO OLD/); h.dispose();
});
test('changing delivery or role discards prior selection and ignores the old context response', async () => {
  const stale = deferred(); let first = true;
  const h = picker({ lookup: (_query, runId) => runId === 7 && !first ? stale.promise : (first = false, Promise.resolve(page([group('external:1', runId === 7 ? 'FIRST' : 'SECOND', [unit('1001', 2)])]))) });
  await h.settle(); select(h, 0); click(h, 'Refresh'); h.render();
  h.props.run = run({ id: 8, storeId: 2, storeName: 'Other' }); h.props.technician = true; await h.settle();
  stale.resolve(page([group('external:9', 'STALE')])); await h.settle(); assert.match(text(h.render()), /0 POs selected/);
  assert.doesNotMatch(text(h.render()), /PO STALE|PO FIRST/); assert.equal(h.calls.at(-1).runId, 8); h.dispose();
});
test('add API sends only source keys to PO planning without scanning or releasing parts', async () => {
  const calls = [];
  const api = load('app/api/customer-delivery-runs.api.ts', { './_base': { apiFetch: async (...args) => { calls.push(args); return run(); } } });
  await api.customerDeliveryPoOptions(7, { page: 2, pageSize: 10, search: '293232' });
  assert.deepEqual(calls.shift(), ['/api/warehouse/customer-delivery-runs/7/po-options', { query: { page: 2, pageSize: 10, search: '293232' }, cache: 'no-store' }]);
  await api.addCustomerDeliveryPos(7, ['external:1', 'order:1']);
  assert.deepEqual(calls, [['/api/warehouse/customer-delivery-runs/7/pos', { method: 'POST', body: { poKeys: ['external:1', 'order:1'] } }]]);
});

(async () => { for (const { name, run } of tests) { await run(); console.log(`PASS ${name}`); } console.log(`${tests.length} customer delivery PO-picker checks passed.`); })()
  .catch(error => { console.error(error); process.exitCode = 1; });
