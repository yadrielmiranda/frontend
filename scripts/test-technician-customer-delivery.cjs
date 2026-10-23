/* Offline technician delivery regressions: no network, servers or stock mutations. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '../src');
const directory = 'app/technician/customer-deliveries/';
const tests = [], test = (name, run) => tests.push({ name, run });
const storage = new Map();
global.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } }
let nextKey = 0;
const identity = { id: 3, role: { name: 'technician' } };
function loader(hooks = {}, api = {}, navigation = {}, auth = { user: identity, isLoading: false, revalidate: async () => identity }, extra = {}) {
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename);
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const module = { exports: {} };
    function resolve(id) {
      if (id in extra) return extra[id];
      if (id === 'react') return { ...React, ...hooks };
      if (id === 'react/jsx-runtime') return require(id);
      if (id === 'next/link') return { default: 'a', __esModule: true };
      if (id === 'next/navigation') return { useRouter: () => ({ replace: navigation.replace ?? (() => {}) }), ...navigation };
      if (id === '@/contexts/AuthContext') return { useAuth: () => auth };
      if (id === 'lucide-react' || id.startsWith('@/components/ui/')) return new Proxy({}, { get: (_, name) => name });
      if (id === '@/app/api/warehouse.api') return { warehouseRequestKey: () => `request-${++nextKey}` };
      if (id === '@/app/api/technician.api') return api;
      if (id === '@/app/api/_base') return { ApiError, isApiError: error => error instanceof ApiError };
      if (id === '@/components/estimates/agreements/signature-pad') return { SignaturePad: 'SignaturePad' };
      if (id === '@/app/warehouse/customer-deliveries/customer-delivery-receipt') return { CustomerDeliveryReceipt: 'CustomerDeliveryReceipt' };
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
function line(number, overrides = {}) {
  return { lineNumber: String(number), barcode: `I${number}`, source: 'EXTERNAL', externalPoId: 1, description: `Piece ${number}`, product: 'French Door', system: '600', configuration: 'X', mark: '', orderNumber: '', poNumber: '292427', expectedParts: 3, inTransit: 2, onHand: 0, pending: 1, version: 5, installation: null, ...overrides };
}
const pos = [
  { key: 'external:1', source: 'EXTERNAL', orderId: null, externalPoId: 1, orderNumber: '', poNumber: '292427', expectedParts: 4, availableParts: 3, pieces: 2, lines: [line(1126830), line(1126831, { inTransit: 1, expectedParts: 1 })] },
  { key: 'order:2', source: 'ORDER', orderId: 2, externalPoId: null, orderNumber: 'SO-2', poNumber: '292759', expectedParts: 2, availableParts: 2, pieces: 1, lines: [line(1126835, { source: 'ORDER', externalPoId: null, poNumber: '292759', orderNumber: 'SO-2' })] },
];
const signature = [[{ x: .1, y: .2 }, { x: .2, y: .3 }, { x: .3, y: .1 }, { x: .4, y: .3 }, { x: .5, y: .2 }]];
const props = (extra = {}) => ({ actorId: 3, initial: { items: structuredClone(pos), total: 2, page: 1, pageSize: 20, countOpen: false }, ...extra });
const helpers = loader()(directory + 'customer-delivery-selection.ts');
function harness(initial = props(), api = {}, navigation = {}, auth) {
  const states = [], refs = []; let si = 0, ri = 0, ei = 0, mounted = false, initialEffect;
  const hooks = {
    useState(value) { const i = si++; if (!(i in states)) states[i] = typeof value === 'function' ? value() : value; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useRef(value) { const i = ri++; if (!(i in refs)) refs[i] = { current: value }; return refs[i]; },
    useCallback(value) { return value; },
    useEffect(callback) { if (ei++ === 0 && !mounted) initialEffect = callback; },
  };
  const Component = loader(hooks, api, navigation, auth)(directory + 'customer-delivery-client.tsx').TechnicianCustomerDeliveryClient;
  return { render() { si = 0; ri = 0; ei = 0; const tree = Component(initial); if (!mounted) { mounted = true; initialEffect(); return this.render(); } return tree; } };
}
function nodes(element, predicate, result = []) {
  if (Array.isArray(element)) { element.forEach(child => nodes(child, predicate, result)); return result; }
  if (!element || typeof element !== 'object') return result;
  if (predicate(element)) result.push(element);
  nodes(element.props?.children, predicate, result); return result;
}
const text = element => typeof element === 'string' || typeof element === 'number' ? String(element) : Array.isArray(element) ? element.map(text).join('') : element?.props ? text(element.props.children) : '';
const byType = (h, type) => nodes(h.render(), node => node.type === type)[0];
const label = (h, value) => nodes(h.render(), node => node.props?.['aria-label'] === value)[0];
const button = (h, value) => nodes(h.render(), node => node.type === 'Button' && text(node) === value)[0];
function click(h, value) { const result = button(h, value); assert.ok(result, `Missing button ${value}`); assert.ok(!result.props.disabled, `Disabled button ${value}`); return result.props.onClick(); }
function select(h, poNumber) { label(h, `Select PO ${poNumber}`).props.onChange({ target: { checked: true } }); }
function enter(h, id, value) { nodes(h.render(), node => node.props?.id === id)[0].props.onChange({ target: { value } }); }
function sign(h) {
  enter(h, 'delivery-first-name', ' Ana '); enter(h, 'delivery-last-name', ' Perez ');
  byType(h, 'SignaturePad').props.onChange(structuredClone(signature));
  nodes(h.render(), node => node.type === 'input' && node.props.type === 'checkbox')[0].props.onChange({ target: { checked: true } });
}
function reviewed(h) { select(h, '292427'); click(h, 'Deliver to customer'); sign(h); }

test('whole PO includes every collected available part and carries stock versions', () => {
  const request = helpers.technicianCustomerDeliveryRequest({ [pos[0].key]: pos[0] }, ' Ana ', 'Perez  Diaz', signature, 'fixed-key');
  assert.deepEqual(request.items, [{ barcode: 'I1126830', quantity: 2, version: 5 }, { barcode: 'I1126831', quantity: 1, version: 5 }]);
  assert.equal(request.source, 'TRANSIT'); assert.equal('storeId' in request, false); assert.equal(request.lastName, 'Perez Diaz');
});
test('zero, fractional, oversized and duplicated parts cannot create a signed request', () => {
  for (const qty of [0, -1, .5, 201, NaN]) assert.throws(() => helpers.selectedCustomerDeliveryLines({ key: { ...pos[0], lines: [line(123, { inTransit: qty })] } }));
  assert.throws(() => helpers.selectedCustomerDeliveryLines({ a: pos[0], b: pos[0] }), /more than once/);
  assert.throws(() => helpers.selectedCustomerDeliveryLines({}));
  assert.throws(() => helpers.selectedCustomerDeliveryLines({ a: { ...pos[0], lines: Array.from({ length: 501 }, (_, i) => line(2000 + i)) } }));
});
test('a real signature and recipient first and last names are required', () => {
  for (const [first, last, drawing] of [['', 'Perez', signature], ['Ana', '', signature], ['Ana', 'Perez', []], ['Ana', 'Perez', [[{ x: 0, y: 0 }]]]])
    assert.throws(() => helpers.technicianCustomerDeliveryRequest({ a: pos[0] }, first, last, drawing, 'key'));
});
test('PO list appears immediately without typing or scanning and supports full PO selection', () => {
  const h = harness(); assert.ok(label(h, 'Select PO 292427')); assert.ok(label(h, 'Select PO 292759'));
  assert.match(text(h.render()), /Partial PO: 3 of 4/); assert.equal(byType(h, 'ScanPad'), undefined);
  select(h, '292427'); select(h, '292759'); click(h, 'Deliver to customer');
  const receipt = byType(h, 'CustomerDeliveryReceipt').props.delivery;
  assert.equal(receipt.totalPieces, 3); assert.equal(receipt.totalParts, 5);
  assert.deepEqual(receipt.items.map(row => [row.poNumber, row.quantity]), [['292427', 2], ['292427', 1], ['292759', 2]]);
});
test('pickup shortcut opens review for the entire identified PO without another selection step', () => {
  const h = harness(props({ initialPoKey: 'external:1' }));
  assert.equal(byType(h, 'CustomerDeliveryReceipt').props.delivery.totalParts, 3);
  click(h, 'Back to PO list'); assert.equal(label(h, 'Select PO 292427').props.checked, true);
});

test('embedded pickup delivery keeps the exact PO selected and can return without navigation', () => {
  let closed = 0;
  const h = harness(props({ initialPoKey: 'external:1', embedded: { pickupRunId: 71, onClose: () => { closed++; }, onComplete() {} } }));
  assert.equal(byType(h, 'CustomerDeliveryReceipt').props.delivery.totalParts, 3);
  click(h, 'Review PO selection');
  assert.equal(label(h, 'Find a PO'), undefined);
  assert.equal(button(h, 'Show all available POs'), undefined);
  assert.equal(label(h, 'Select PO 292759'), undefined);
  assert.ok(label(h, 'Select PO 292427').props.checked);
  assert.ok(label(h, 'Select PO 292427').props.disabled);
  assert.equal(nodes(h.render(), node => node.type === 'a').length, 0);
  click(h, 'Back to pickup'); assert.equal(closed, 1);
});

test('embedded delivery refreshes only the current pickup and PO after a stock conflict', async () => {
  let query;
  const h = harness(props({ initialPoKey: 'external:1', embedded: { pickupRunId: 71, onClose() {}, onComplete() {} } }), {
    technicianDeliverToCustomer: async () => { throw new ApiError('Stock changed', 409); },
    technicianCustomerDeliveryOptions: async value => { query = value; return { ...props().initial, items: [{ ...pos[0], availableParts: 1, pieces: 1, lines: [line(1126830, { inTransit: 1, version: 6 })] }, pos[1]] }; },
  });
  sign(h); await click(h, 'Confirm signed delivery');
  click(h, 'Review PO selection'); click(h, 'Refresh PO');
  await new Promise(done => setImmediate(done));
  assert.equal(query.pickupRunId, 71); assert.equal(query.poKey, 'external:1');
  assert.equal(label(h, 'Select PO 292759'), undefined);
  click(h, 'Deliver to customer');
  const receipt = byType(h, 'CustomerDeliveryReceipt').props.delivery;
  assert.equal(receipt.totalParts, 1); assert.equal(receipt.totalPieces, 1);
  assert.deepEqual(byType(h, 'SignaturePad').props.value, []);
});

test('embedded success shows the signed receipt and continues the same pickup without routing', async () => {
  let request, destination, completed;
  const saved = { ...helpers.technicianCustomerDeliveryPreview({ [pos[0].key]: pos[0] }, 'Ana', 'Perez', signature), id: 41, actor: 'Technician', createdAt: '2026-10-14T17:00:00Z' };
  const h = harness(props({ initialPoKey: 'external:1', embedded: { pickupRunId: 71, onClose() {}, onComplete: delivery => { completed = delivery; } } }), {
    technicianDeliverToCustomer: async body => { request = structuredClone(body); return saved; },
  }, { replace: value => { destination = value; } });
  sign(h); await click(h, 'Confirm signed delivery');
  assert.equal(request.pickupRunId, 71); assert.equal(destination, undefined);
  assert.equal(completed, undefined); assert.equal(storage.size, 1);
  assert.equal(button(h, 'Confirm signed delivery'), undefined);
  assert.equal(button(h, 'Back to pickup'), undefined);
  assert.equal(byType(h, 'CustomerDeliveryReceipt').props.delivery, saved);
  assert.notEqual(byType(h, 'CustomerDeliveryReceipt').props.showSignature, false);
  const receiptLink = nodes(h.render(), node => node.type === 'a')[0];
  assert.equal(receiptLink.props.target, '_blank');
  click(h, 'Continue pickup'); assert.equal(completed, saved); assert.equal(storage.size, 0);
});

test('reloading an embedded saved receipt recovers the same delivery until Continue pickup', async () => {
  const requests = []; let completed = 0;
  const saved = { ...helpers.technicianCustomerDeliveryPreview({ a: pos[0] }, 'Ana', 'Perez', signature), id: 41 };
  const embedded = { pickupRunId: 71, onClose() {}, onComplete() { completed++; } };
  const api = { technicianDeliverToCustomer: async body => { requests.push(structuredClone(body)); return saved; } };
  const h = harness(props({ initialPoKey: 'external:1', embedded }), api);
  sign(h); await click(h, 'Confirm signed delivery');
  assert.ok(button(h, 'Continue pickup')); assert.equal(storage.size, 1);
  const reloaded = harness(props({ initialPoKey: 'external:1', embedded, initial: { ...props().initial, items: [], total: 0 } }), api);
  assert.equal(byType(reloaded, 'CustomerDeliveryReceipt').props.delivery.totalParts, 3);
  assert.equal(button(reloaded, 'Confirm signed delivery'), undefined);
  assert.ok(button(reloaded, 'Back to pickup').props.disabled);
  await click(reloaded, 'Check delivery');
  assert.deepEqual(requests[1], requests[0]); assert.equal(storage.size, 1);
  assert.equal(byType(reloaded, 'CustomerDeliveryReceipt').props.delivery, saved);
  click(reloaded, 'Continue pickup'); assert.equal(completed, 1); assert.equal(storage.size, 0);
});

test('embedded close stays blocked during saving and an ambiguous response until safe recovery', async () => {
  let closed = 0, reject, original, retry;
  const embedded = { pickupRunId: 71, onClose: () => { closed++; }, onComplete() {} };
  const h = harness(props({ initialPoKey: 'external:1', embedded }), { technicianDeliverToCustomer: body => { original = structuredClone(body); return new Promise((_, fail) => { reject = fail; }); } });
  sign(h); const save = click(h, 'Confirm signed delivery');
  await new Promise(done => setImmediate(done));
  assert.ok(button(h, 'Back to pickup').props.disabled);
  button(h, 'Back to pickup').props.onClick(); assert.equal(closed, 0);
  reject(new Error('Response lost')); await save;
  assert.ok(button(h, 'Back to pickup').props.disabled);
  button(h, 'Back to pickup').props.onClick(); assert.equal(closed, 0);
  const recovered = harness(props({ initialPoKey: 'order:2', embedded: { ...embedded, pickupRunId: 72 } }), { technicianDeliverToCustomer: async body => { retry = structuredClone(body); return { ...helpers.technicianCustomerDeliveryPreview({ a: pos[0] }, 'Ana', 'Perez', signature), id: 42 }; } });
  assert.ok(button(recovered, 'Back to pickup').props.disabled);
  await click(recovered, 'Check delivery'); assert.deepEqual(retry, original);
  assert.equal(retry.pickupRunId, 71);
  assert.ok(button(recovered, 'Continue pickup'));
});

test('embedded live block prevents new delivery but permits checking a pending signed request', async () => {
  let writes = 0;
  const embedded = { pickupRunId: 71, blocked: true, onClose() {}, onComplete() {} };
  const h = harness(props({ initialPoKey: 'external:1', embedded }), { technicianDeliverToCustomer: async () => { writes++; throw new Error('Response lost'); } });
  sign(h); assert.ok(button(h, 'Confirm signed delivery').props.disabled);
  await button(h, 'Confirm signed delivery').props.onClick(); assert.equal(writes, 0);
  embedded.blocked = false; await click(h, 'Confirm signed delivery'); assert.equal(writes, 1);
  embedded.blocked = true; assert.equal(button(h, 'Check delivery').props.disabled, false);
  await click(h, 'Check delivery'); assert.equal(writes, 2);
});
test('physical count blocks delivery before signature', () => {
  const initial = props(); initial.initial.countOpen = true;
  const h = harness({ ...initial, initialPoKey: 'external:1' });
  assert.ok(button(h, 'Deliver to customer').props.disabled); assert.ok(label(h, 'Select PO 292427').props.disabled);
});

test('an oversized PO shortcut stays in the list and explains why it cannot be delivered', () => {
  const initial = props({ initialPoKey: 'external:1' });
  initial.initial.items = [{ ...pos[0], pieces: 501, availableParts: 501,
    lines: Array.from({ length: 501 }, (_, index) => line(2000000 + index, { inTransit: 1 })) }];
  const h = harness(initial);
  assert.equal(byType(h, 'CustomerDeliveryReceipt'), undefined);
  assert.ok(button(h, 'Deliver to customer').props.disabled);
  const alerts = nodes(h.render(), node => node.props?.role === 'alert');
  assert.ok(alerts.some(alert => /between 1 and 500 pieces/.test(text(alert))));
});
test('changing recipient or selected PO invalidates the original signature', () => {
  const h = harness(); reviewed(h); enter(h, 'delivery-last-name', 'Lopez');
  assert.deepEqual(byType(h, 'SignaturePad').props.value, []); assert.ok(button(h, 'Confirm signed delivery').props.disabled);
  sign(h); click(h, 'Back to PO list'); select(h, '292759'); click(h, 'Deliver to customer');
  assert.deepEqual(byType(h, 'SignaturePad').props.value, []); assert.equal(byType(h, 'CustomerDeliveryReceipt').props.delivery.totalParts, 5);
});
test('rapid confirmation only submits once and links to the technician receipt', async () => {
  let resolve, writes = 0, destination;
  const h = harness(props(), { technicianDeliverToCustomer: () => { writes++; return new Promise(done => { resolve = done; }); } }, { replace: value => { destination = value; } });
  reviewed(h); const confirm = button(h, 'Confirm signed delivery').props.onClick;
  const first = confirm(), second = confirm(); await new Promise(done => setImmediate(done));
  assert.equal(writes, 1); resolve({ id: 41 }); await Promise.all([first, second]);
  assert.equal(destination, '/technician/customer-deliveries/41'); assert.equal(storage.size, 0);
});
test('uncertain result locks the signature and reuses the identical request after reload', async () => {
  let original, repeated;
  const h = harness(props(), { technicianDeliverToCustomer: async body => { original = structuredClone(body); throw new Error('Response lost'); } });
  reviewed(h); await click(h, 'Confirm signed delivery');
  assert.ok(button(h, 'Back to PO list').props.disabled); assert.ok(byType(h, 'SignaturePad').props.disabled);
  const changedInitial = props(); changedInitial.initial.items = [];
  const recovered = harness(changedInitial, { technicianDeliverToCustomer: async body => { repeated = structuredClone(body); return { id: 42 }; } });
  assert.equal(byType(recovered, 'CustomerDeliveryReceipt').props.delivery.totalParts, 3);
  await click(recovered, 'Check delivery'); assert.deepEqual(repeated, original);
});
test('inventory conflict clears signature and requires a new review', async () => {
  const h = harness(props(), { technicianDeliverToCustomer: async () => { throw new ApiError('Stock changed', 409); } });
  reviewed(h); await click(h, 'Confirm signed delivery');
  assert.equal(storage.size, 0); assert.deepEqual(byType(h, 'SignaturePad').props.value, []);
  sign(h); assert.ok(button(h, 'Confirm signed delivery').props.disabled); assert.ok(!button(h, 'Back to PO list').props.disabled);
});
test('removed pickup access allows a new review after a definite forbidden response', async () => {
  const h = harness(props(), { technicianDeliverToCustomer: async () => { throw new ApiError('Pickup assignment changed', 403); } });
  reviewed(h); await click(h, 'Confirm signed delivery');
  assert.equal(storage.size, 0); assert.ok(!button(h, 'Back to PO list').props.disabled);
  assert.deepEqual(byType(h, 'SignaturePad').props.value, []); assert.equal(button(h, 'Check delivery'), undefined);
});
test('storage must save the exact retry request before submitting a delivery', async () => {
  let writes = 0;
  const h = harness(props(), { technicianDeliverToCustomer: async () => { writes++; } }); reviewed(h);
  const save = sessionStorage.setItem; sessionStorage.setItem = () => { throw new Error('Storage blocked'); };
  try { await click(h, 'Confirm signed delivery'); } finally { sessionStorage.setItem = save; }
  assert.equal(writes, 0); assert.match(text(h.render()), /Nothing was sent/);
});
test('account revalidation prevents a changed technician from recording a delivery', async () => {
  let writes = 0;
  const auth = { user: identity, isLoading: false, revalidate: async () => ({ id: 4, role: { name: 'technician' } }) };
  const h = harness(props(), { technicianDeliverToCustomer: async () => { writes++; } }, {}, auth);
  reviewed(h); await click(h, 'Confirm signed delivery'); assert.equal(writes, 0); assert.equal(storage.size, 0);
});
test('another technician or admin cannot see or retry the pending receipt in memory', async () => {
  const h = harness(props(), { technicianDeliverToCustomer: async () => { throw new Error('Response lost'); } }); reviewed(h); await click(h, 'Confirm signed delivery');
  for (const user of [{ id: 4, role: { name: 'technician' } }, { id: 3, role: { name: 'admin' } }]) {
    const other = harness(props(), {}, {}, { user, isLoading: false, revalidate: async () => user });
    assert.equal(byType(other, 'CustomerDeliveryReceipt'), undefined); assert.equal(button(other, 'Check delivery'), undefined);
  }
});
test('new technician delivery routes require authentication and the technician role', async () => {
  const navigation = { redirect: url => { throw new Error(`redirect:${url}`); }, notFound: () => { throw new Error('not-found'); } };
  for (const [user, result] of [[null, /redirect:\/technician/], [{ id: 3, role: { name: 'admin' } }, /not-found/]]) {
    const guard = loader({}, {}, navigation, undefined, { '@/lib/session': { getCurrentUser: async () => user } })(directory + 'technician-delivery-access.ts');
    await assert.rejects(() => guard.requireTechnicianDeliveryUser(), result);
  }
  const guard = loader({}, {}, navigation, undefined, { '@/lib/session': { getCurrentUser: async () => identity } })(directory + 'technician-delivery-access.ts');
  assert.equal((await guard.requireTechnicianDeliveryUser()).id, 3);
});

function receiptHarness(api, auth = { user: identity, isLoading: false }) {
  const states = [], dependencies = [], cleanups = []; let si = 0, ei = 0, effects = [];
  const hooks = {
    useState(value) { const i = si++; if (!(i in states)) states[i] = value; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useEffect(callback, next) {
      const i = ei++;
      if (!dependencies[i] || next.some((value, index) => !Object.is(value, dependencies[i][index]))) {
        dependencies[i] = next; effects.push(() => { cleanups[i]?.(); cleanups[i] = callback(); });
      }
    },
  };
  const Component = loader(hooks, api, {}, auth)(directory + '[id]/receipt-client.tsx').TechnicianCustomerDeliveryReceiptClient;
  return { render() { si = 0; ei = 0; const tree = Component({ id: 41, actorId: 3 }); const queued = effects; effects = []; queued.forEach(run => run()); return tree; } };
}
test('own receipt loads through the technician API and contains no warehouse navigation', async () => {
  const reads = [];
  const h = receiptHarness({ technicianCustomerDelivery: async id => { reads.push(id); return { id: 41, source: 'TRANSIT' }; } });
  h.render(); await new Promise(done => setImmediate(done));
  assert.deepEqual(reads, [41]); assert.ok(byType(h, 'CustomerDeliveryReceipt'));
  for (const link of nodes(h.render(), node => node.type === 'a')) assert.match(link.props.href, /^\/technician/);
});
test('warehouse signed receipt opens and offers another warehouse delivery', async () => {
  const h = receiptHarness({ technicianCustomerDelivery: async () => ({ id: 41, source: 'WAREHOUSE' }) });
  h.render(); await new Promise(done => setImmediate(done));
  assert.ok(byType(h, 'CustomerDeliveryReceipt'));
  assert.equal(nodes(h.render(), node => node.type === 'a' && text(node) === 'Another delivery')[0].props.href, '/technician/warehouse/customer-deliveries');
});

test('unauthorized or missing receipt displays a scoped error and no signature', async () => {
  const h = receiptHarness({ technicianCustomerDelivery: async () => { throw new ApiError('Not found', 404); } });
  h.render(); await new Promise(done => setImmediate(done));
  assert.match(text(h.render()), /not available for your account/); assert.equal(byType(h, 'CustomerDeliveryReceipt'), undefined);
});
test('receipt disappears immediately when account changes and late requests cannot reveal it', async () => {
  const auth = { user: identity, isLoading: false }; let resolve;
  const h = receiptHarness({ technicianCustomerDelivery: () => new Promise(done => { resolve = done; }) }, auth);
  h.render(); auth.user = { id: 4, role: { name: 'technician' } }; h.render();
  resolve({ id: 41, source: 'TRANSIT' }); await new Promise(done => setImmediate(done));
  assert.equal(byType(h, 'CustomerDeliveryReceipt'), undefined); assert.match(text(h.render()), /account has changed/);
});

async function browserChecks() {
  const { renderToStaticMarkup } = require('react-dom/server');
  const puppeteer = require(require.resolve('puppeteer', { paths: [path.resolve(__dirname, '../../backend')] }));
  const tailwind = require('@tailwindcss/node');
  const native = {
    '@/components/ui/button': { Button: ({ asChild, children, className = '', variant, size, ...attributes }) => asChild ? children : React.createElement('button', { ...attributes, className: `inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium ${className}` }, children) },
    '@/components/ui/input': { Input: ({ className = '', ...attributes }) => React.createElement('input', { ...attributes, className: `w-full rounded-md border px-3 py-1 ${className}` }) },
    '@/components/ui/label': { Label: ({ children, ...attributes }) => React.createElement('label', attributes, children) },
    'lucide-react': new Proxy({}, { get: () => () => null }),
  };
  const actualReceipt = loader()('app/warehouse/customer-deliveries/customer-delivery-receipt.tsx');
  const actualSignature = loader({}, {}, {}, undefined, native)('components/estimates/agreements/signature-pad.tsx');
  const samples = structuredClone(pos);
  samples[0].customerName = 'Synthetic recipient with an exceptionally long customer name for mobile wrapping verification';
  samples[1].orderNumber = 'SYNTHETIC-VERY-LONG-INTERNAL-ORDER-NUMBER-123456789';
  samples[0].lines[0].description = 'French door with a long synthetic description, bronze finish, right active, and separately supplied physical parts.';
  function clientMarkup(review = false) {
    let i = 0;
    const hooks = { useState(initial) { const index = i++; const value = index === 10 ? true : index === 5 ? review : index === 4 ? { [samples[0].key]: samples[0] } : typeof initial === 'function' ? initial() : initial; return [value, () => {}]; } };
    const Component = loader(hooks, {}, {}, undefined, { ...native, '@/app/warehouse/customer-deliveries/customer-delivery-receipt': actualReceipt, '@/components/estimates/agreements/signature-pad': actualSignature })(directory + 'customer-delivery-client.tsx').TechnicianCustomerDeliveryClient;
    return renderToStaticMarkup(React.createElement(Component, props({ initial: { items: samples, total: 2, page: 1, pageSize: 20, countOpen: false } })));
  }
  const delivery = { ...helpers.technicianCustomerDeliveryPreview({ a: samples[0], b: samples[1] }, 'Synthetic', 'Recipient', signature), id: 41, actor: 'Synthetic Technician', createdAt: '2026-10-14T17:00:00Z' };
  let state = 0; const receiptStates = [delivery, '', false, 0];
  const Saved = loader({ useState: () => [receiptStates[state++], () => {}], useEffect() {} }, {}, {}, undefined, { ...native, '@/app/warehouse/customer-deliveries/customer-delivery-receipt': actualReceipt })(directory + '[id]/receipt-client.tsx').TechnicianCustomerDeliveryReceiptClient;
  const markups = { list: clientMarkup(), review: clientMarkup(true), receipt: renderToStaticMarkup(React.createElement(Saved, { id: 41, actorId: 3 })) };
  const compiler = await tailwind.compile(fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8'), { base: path.join(root, 'app'), onDependency() {} });
  const classes = [...new Set([...Object.values(markups).join('').matchAll(/class="([^"]*)"/g)].flatMap(match => match[1].split(/\s+/)))];
  const css = compiler.build(classes);
  const artifacts = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'technician-customer-delivery-'));
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true); page.on('request', request => request.abort());
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    for (const [name, markup] of Object.entries(markups)) {
      await page.setContent(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><main class="mx-auto max-w-3xl px-4 py-6">${markup}</main></body></html>`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${name} should fit a 390px screen`);
      await page.screenshot({ path: path.join(artifacts, `${name}-mobile.png`), fullPage: true });
    }
    await page.emulateMediaType('print');
    const print = await page.evaluate(() => ({ buttons: [...document.querySelectorAll('button')].filter(button => button.getBoundingClientRect().height > 0).length, signature: document.querySelector('.delivery-signature svg').getBoundingClientRect().height, text: document.querySelector('[data-customer-delivery-print]').innerText }));
    assert.equal(print.buttons, 0); assert.ok(print.signature > 0); assert.match(print.text, /Synthetic[\s\S]*Recipient/); assert.match(print.text, /292759/);
    await page.pdf({ path: path.join(artifacts, 'receipt.pdf'), format: 'Letter', printBackground: true });
    process.stdout.write(`PASS mobile PO list/review/receipt and print isolation; artifacts: ${artifacts}\n`);
  } finally { await browser.close(); }
}

(async () => {
  for (const { name, run } of tests) { storage.clear(); await run(); process.stdout.write(`PASS ${name}\n`); }
  if (process.argv.includes('--browser')) await browserChecks();
  process.stdout.write(`${tests.length} technician customer delivery checks passed.\n`);
})().catch(error => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
