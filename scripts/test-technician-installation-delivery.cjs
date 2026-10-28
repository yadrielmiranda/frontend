/* Offline checks of technician delivery selection and saved confirmations. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const filename = path.resolve(__dirname, '../src/app/technician/technician-receipts.tsx');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const tests = [], test = (name, run) => tests.push({ name, run });
const storage = new Map();
global.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
let nextKey = 0;
const pendingKey = 'technician-installation-delivery:3';
const settle = () => new Promise(resolve => setImmediate(resolve));
const line = (number = '880001', extra = {}) => ({
  lineNumber: number, barcode: `I${number}`, source: 'EXTERNAL', externalPoId: 1, description: 'Test door',
  supplierName: 'Test factory', product: 'Door', system: '', configuration: '', mark: 'D1', orderNumber: '',
  poNumber: 'EX100', expectedParts: 3, inTransit: 2, onHand: 0, pending: 1, version: 4, installation: null, ...extra,
});
const result = (extra = {}) => ({ units: 1, parts: 2, installation: null, replayed: false, ...extra });
function harness(items = [line()], api = {}, extraProps = {}) {
  const states = [], refs = []; let si = 0, ri = 0, ei = 0, mounted = false, restore;
  const props = { actorId: 3, storeId: null, storeName: '', blocked: false, offline: false, onBusy() {}, onSaved() {}, delivering: true, ...extraProps };
  const hooks = {
    ...React,
    useState(value) { const index = si++; if (!(index in states)) states[index] = typeof value === 'function' ? value() : value; return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; },
    useRef(value) { const index = ri++; if (!(index in refs)) refs[index] = { current: value }; return refs[index]; },
    useCallback(value) { return value; },
    useEffect(callback) { if (ei++ === 0 && !mounted) restore = callback; },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(id => {
    if (id === 'react') return hooks;
    if (id === 'react/jsx-runtime') return require(id);
    if (id.startsWith('@/components/ui/')) return new Proxy({}, { get: (_, name) => name });
    if (id === '@/app/api/warehouse.api') return { warehouseRequestKey: () => `delivery-${++nextKey}` };
    if (id === '@/app/api/technician.api') return { technicianPending: async () => ({ items, page: 1, pageSize: 25, total: items.length }), ...api };
    if (id === '@/app/api/_base') return { isApiError: error => Number.isInteger(error?.status) };
    if (id === '@/app/warehouse/unit-origin') return { UnitOrigin: 'UnitOrigin', ExternalDescription: 'ExternalDescription' };
    throw new Error(`Unexpected import ${id}`);
  }, module, module.exports);
  return { props, exports: module.exports, render() {
    si = 0; ri = 0; ei = 0;
    const tree = module.exports.TechnicianReceipts(props);
    if (!mounted) { mounted = true; restore(); return this.render(); }
    return tree;
  } };
}
function nodes(element, predicate, result = []) {
  if (Array.isArray(element)) { element.forEach(child => nodes(child, predicate, result)); return result; }
  if (!element || typeof element !== 'object') return result;
  if (predicate(element)) result.push(element);
  nodes(element.props?.children, predicate, result); return result;
}
const text = element => typeof element === 'string' || typeof element === 'number' ? String(element) : Array.isArray(element) ? element.map(text).join('') : element?.props ? text(element.props.children) : '';
const button = (h, name) => nodes(h.render(), node => node.type === 'Button' && text(node) === name)[0];
function click(h, name) { const node = button(h, name); assert.ok(node && !node.props.disabled, `Missing or disabled ${name}`); return node.props.onClick(); }
async function load(h) { click(h, 'Refresh / clear'); await settle(); }
function select(h, barcode) {
  const node = nodes(h.render(), node => node.props?.['aria-label'] === `Select ${barcode}`)[0];
  assert.ok(node && !node.props.disabled, `Cannot select ${barcode}`);
  node.props.onChange({ target: { checked: true } });
}
async function confirm(h) { click(h, 'Deliver selected'); click(h, 'Confirm delivery'); await settle(); }

test('external PO delivery records only selected items without an installation or address', async () => {
  let sent;
  const h = harness([line()], { technicianDeliverToInstallation: async body => { sent = body; return result(); } });
  await load(h); select(h, 'I880001'); click(h, 'Deliver selected');
  assert.match(text(h.render()), /PO EX100/); assert.doesNotMatch(text(h.render()), /installation #undefined/);
  click(h, 'Confirm delivery'); await settle();
  assert.deepEqual(sent.items, [{ barcode: 'I880001', version: 4, quantity: 2 }]);
  assert.equal('installationJobId' in sent, false); assert.equal('installationAddress' in sent, false);
  assert.match(text(h.render()), /2 parts delivered to installation\./); assert.equal(storage.has(pendingKey), false);
});

test('legacy installation without an address retains its linked installation ID', async () => {
  let sent;
  const installation = { id: 9, address: '' };
  const h = harness([line('100', { source: 'ORDER', externalPoId: null, orderNumber: 'ORD-1002', poNumber: '293540', installation })], {
    technicianDeliverToInstallation: async body => { sent = body; return result({ installation }); },
  });
  await load(h); select(h, 'I100'); await confirm(h);
  assert.equal(sent.installationJobId, 9); assert.equal(sent.installationAddress, '');
  assert.match(text(h.render()), /2 parts delivered to installation #9\./);
});

test('an internal order without a linked installation is selectable', async () => {
  let sent;
  const h = harness([line('100', { source: 'ORDER', externalPoId: null, orderNumber: 'ORD-1002' })], {
    technicianDeliverToInstallation: async body => { sent = body; return result(); },
  });
  await load(h); select(h, 'I100'); await confirm(h);
  assert.equal('installationJobId' in sent, false);
});

test('saved destination metadata is sent and displayed when available', async () => {
  let sent;
  const installation = { id: 71, address: '123 Test Street, Miami, FL 33101' };
  const h = harness([line('100', { source: 'ORDER', externalPoId: null, orderNumber: 'ORD-1002', installation })], {
    technicianDeliverToInstallation: async body => { sent = body; return result({ installation }); },
  });
  await load(h); select(h, 'I100'); await confirm(h);
  assert.equal(sent.installationJobId, 71); assert.equal(sent.installationAddress, installation.address);
  assert.match(text(h.render()), /123 Test Street/);
});

test('different external POs and internal versus external sources cannot share one confirmation', async () => {
  const cases = [
    line('200', { externalPoId: 2, poNumber: 'EX100' }),
    line('200', { source: 'ORDER', externalPoId: null, orderNumber: '1', poNumber: 'EX100' }),
  ];
  for (const other of cases) {
    const h = harness([line(), other]); await load(h);
    select(h, 'I880001'); select(h, 'I200');
    assert.equal(button(h, 'Deliver selected').props.disabled, true);
    assert.match(text(h.render()), /Select parts from one order or external PO/);
  }
});

test('select all includes external and missing-address pieces of the selected source', async () => {
  let sent;
  const h = harness([line(), line('880002')], { technicianDeliverToInstallation: async body => { sent = body; return result({ units: 2, parts: 4 }); } });
  await load(h); click(h, 'Select all 2 matching units'); await settle(); await confirm(h);
  assert.equal(sent.items.length, 2);
});

test('lost responses retain the exact request for retry and prevent duplicate click writes', async () => {
  const calls = []; let fail;
  const h = harness([line()], { technicianDeliverToInstallation: async body => {
    calls.push(structuredClone(body));
    if (calls.length === 1) return new Promise((_, reject) => { fail = () => reject(new Error('Lost response')); });
    return result({ replayed: true });
  } });
  await load(h); select(h, 'I880001'); click(h, 'Deliver selected');
  const send = button(h, 'Confirm delivery').props.onClick;
  send(); send(); assert.equal(calls.length, 1);
  const saved = JSON.parse(storage.get(pendingKey)); assert.equal(saved.sourceLabel, 'PO EX100');
  assert.equal(saved.installation, undefined);
  fail(); await settle(); click(h, 'Retry same confirmation'); await settle();
  assert.deepEqual(calls[1], calls[0]); assert.match(text(h.render()), /Already recorded; no duplicate added/);
});

test('pending external and legacy confirmations restore without requiring an address', async () => {
  for (const installation of [undefined, { id: 9, address: '' }, { id: 9, address: 'Original address' }]) {
    const saved = { requestKey: 'saved-request', storeId: 0, storeName: '', sourceLabel: 'PO EX100', items: [{ barcode: 'I880001', version: 4, quantity: 2 }], ...(installation ? { installation } : {}) };
    storage.set(pendingKey, JSON.stringify(saved));
    let sent;
    const h = harness([], { technicianDeliverToInstallation: async body => { sent = body; return result({ installation: installation ?? null, replayed: true }); } }, { blocked: true });
    assert.match(text(h.render()), /Check pending confirmation/);
    click(h, 'Retry same confirmation'); await settle();
    assert.equal(sent.requestKey, saved.requestKey); assert.deepEqual(sent.items, saved.items);
    assert.equal(sent.installationJobId, installation?.id); assert.equal(storage.has(pendingKey), false);
  }
});

test('recovery recognizes valid address-free confirmations and rejects malformed saved data', () => {
  const valid = { requestKey: 'saved-request', items: [{ barcode: 'I880001', quantity: 1, version: 0 }] };
  const { isPendingInstallationDelivery } = harness().exports;
  assert.equal(isPendingInstallationDelivery(valid), true);
  assert.equal(isPendingInstallationDelivery({ ...valid, installation: { id: 9, address: '' } }), true);
  for (const bad of [null, {}, { ...valid, requestKey: '' }, { ...valid, items: [] }, { ...valid, items: [null] }, { ...valid, installation: { id: -1, address: '' } }, { ...valid, installation: { id: 9 } }, { ...valid, sourceLabel: {} }]) {
    assert.equal(isPendingInstallationDelivery(bad), false);
  }
});

test('offline and open counts still prevent a new confirmation', async () => {
  let calls = 0;
  const h = harness([line()], { technicianDeliverToInstallation: async () => { calls++; return result(); } });
  await load(h); select(h, 'I880001'); h.props.blocked = true;
  assert.equal(button(h, 'Deliver selected').props.disabled, true);
  h.props.blocked = false; click(h, 'Deliver selected'); h.props.offline = true;
  assert.equal(button(h, 'Confirm delivery').props.disabled, true);
  button(h, 'Confirm delivery').props.onClick(); await settle(); assert.equal(calls, 0);
});

test('ordinary warehouse receipts keep their source store and receipt endpoint', async () => {
  let sent;
  const h = harness([line()], { technicianReceive: async (storeId, items, requestKey) => { sent = { storeId, items, requestKey }; return { units: 1, parts: 2, storeName: 'Main warehouse', replayed: false }; } }, { delivering: false, storeId: 2, storeName: 'Main warehouse' });
  await load(h); select(h, 'I880001'); click(h, 'Receive selected into Main warehouse'); click(h, 'Confirm receipt'); await settle();
  assert.equal(sent.storeId, 2); assert.equal(sent.items.length, 1); assert.match(text(h.render()), /received into Main warehouse/);
});

(async () => {
  for (const { name, run } of tests) { storage.clear(); await run(); process.stdout.write(`PASS ${name}\n`); }
  process.stdout.write(`${tests.length} technician installation delivery checks passed.\n`);
})().catch(error => { console.error(error); process.exitCode = 1; });
