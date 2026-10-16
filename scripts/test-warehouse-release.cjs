/* Offline behavior checks: synthetic inventory and in-memory APIs only. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '../src');
const tests = [], test = (name, run) => tests.push({ name, run });
const storage = new Map();
let nextKey = 0;
class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } }
global.sessionStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
const standardAuth = () => ({ user: { id: 10, role: { name: 'admin' } }, revalidate: async () => ({ id: 10, role: { name: 'admin' } }) });
function loader(hooks = {}, api = {}, auth = standardAuth()) {
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename);
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const module = { exports: {} };
    function resolve(id) {
      if (id === 'react') return { ...React, ...hooks };
      if (id === 'react/jsx-runtime') return require(id);
      if (id === 'next/link') return { default: 'a', __esModule: true };
      if (id === '@/contexts/AuthContext') return { useAuth: () => auth };
      if (id === 'lucide-react' || id.startsWith('@/components/ui/')) return new Proxy({}, { get: (_, name) => name });
      if (id === '@/app/api/warehouse.api') return { warehouseRequestKey: () => `request-${++nextKey}`, ...api };
      if (id === '@/app/api/_base') return { isApiError: error => error instanceof ApiError };
      if (id === '../warehouse-shared') return { CountNotice: 'CountNotice', Pagination: 'Pagination', errorMessage: error => error.message };
      if (id === '../store-select') return { StoreSelect: 'StoreSelect' };
      if (id === '../unit-origin') return { UnitOrigin: 'UnitOrigin' };
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
function unit(lineNumber, extra = {}) {
  return { lineNumber, barcode: `I${lineNumber}`, source: 'EXTERNAL', externalPoId: 1, pieceId: null, description: `Description ${lineNumber}`, product: 'French Door', system: '600', configuration: 'X', mark: '', orderNumber: '', poNumber: '292427', customer: 'Santos', project: '', installation: null, inTransit: 8, onHand: 7, unassigned: 1, stores: [{ id: 1, name: 'Store 1', isActive: true, onHand: 2 }, { id: 2, name: 'Store 2', isActive: false, onHand: 4 }], expectedParts: 20, released: 0, version: 3, ...extra };
}
function group(units) {
  const first = units[0];
  return { key: first.source === 'EXTERNAL' ? `external:${first.externalPoId}` : `order:${first.orderId}`, source: first.source, externalPoId: first.externalPoId, orderId: first.orderId ?? null, orderNumber: first.orderNumber, poNumber: first.poNumber, customer: first.customer, project: first.project, units };
}
const parts = [unit('1126830'), unit('1126835', { source: 'ORDER', orderId: 2, poNumber: '292759', orderNumber: 'SO-2' })];
const props = (extra = {}) => ({ actorId: 10, actorRole: 'admin', initial: { items: structuredClone(parts.map(item => group([item]))), total: 2, page: 1, pageSize: 20, activeCountId: null, summary: {} }, initialStores: [{ id: 1, name: 'Store 1', isActive: true }, { id: 2, name: 'Store 2', isActive: false }], initialStoreId: '1', ...extra });
function harness(initial = props(), api = {}, auth = standardAuth()) {
  const states = [], refs = [], effects = []; let si = 0, ri = 0, ei = 0, mounted = false;
  let initialEffect;
  const hooks = {
    useState(value) { const i = si++; if (!(i in states)) states[i] = typeof value === 'function' ? value() : value; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useRef(value) { const i = ri++; if (!(i in refs)) refs[i] = { current: value }; return refs[i]; },
    useCallback(value) { return value; },
    useEffect(callback) { const index = ei++; effects[index] = callback; if (index === 0 && !mounted) initialEffect = callback; },
  };
  const defaults = { warehouseInventoryByPo: async () => initial.initial, warehouseStores: async () => initial.initialStores };
  const Component = loader(hooks, { ...defaults, ...api }, auth)('app/warehouse/releases/release-client.tsx').ReleaseClient;
  return { auth, effects, render() { si = 0; ri = 0; ei = 0; const tree = Component(initial); if (!mounted) { mounted = true; initialEffect(); return this.render(); } return tree; } };
}
function nodes(element, predicate, result = []) {
  if (Array.isArray(element)) { element.forEach(child => nodes(child, predicate, result)); return result; }
  if (!element || typeof element !== 'object') return result;
  if (predicate(element)) result.push(element);
  if (element.type !== 'Dialog' || element.props.open) nodes(element.props?.children, predicate, result);
  return result;
}
const text = element => typeof element === 'string' || typeof element === 'number' ? String(element) : Array.isArray(element) ? element.map(text).join('') : element?.props ? text(element.props.children) : '';
const label = (h, value) => nodes(h.render(), node => node.props?.['aria-label'] === value)[0];
const byType = (h, type) => nodes(h.render(), node => node.type === type)[0];
const button = (h, value) => nodes(h.render(), node => node.type === 'Button' && text(node) === value)[0];
function click(h, value) { const item = button(h, value); assert.ok(item, `Missing button: ${value}`); assert.ok(!item.props.disabled, `Disabled button: ${value}`); return item.props.onClick(); }
function select(h, barcode) {
  if (!label(h, `Select ${barcode}`)) for (const toggle of nodes(h.render(), node => node.type === 'Button' && node.props?.['aria-expanded'] === false)) toggle.props.onClick();
  label(h, `Select ${barcode}`).props.onChange({ target: { checked: true } });
}
function reviewed(h) { select(h, 'I1126830'); click(h, 'Review release'); }
const flush = () => new Promise(resolve => setImmediate(resolve));
async function loadCurrentPage(h) {
  h.render();
  let scheduled;
  const original = global.setTimeout;
  global.setTimeout = callback => { scheduled = callback; return 0; };
  try { h.effects[2](); } finally { global.setTimeout = original; }
  assert.ok(scheduled); scheduled(); await flush();
}

test('PO prefill selects exactly the requested PO and never releases on navigation', () => {
  let writes = 0;
  const h = harness(props({ initialPoKey: 'order:2', initialSearch: '292759' }), { warehouseRelease: async () => { writes++; } });
  assert.equal(label(h, 'Select PO 292759').props.checked, true);
  assert.equal(label(h, 'Select PO 292427').props.checked, false);
  assert.equal(label(h, 'Search release POs').props.value, '292759');
  assert.equal(byType(h, 'Dialog').props.open, false);
  assert.equal(writes, 0);
  const missing = harness(props({ initialPoKey: 'external:999' }));
  assert.equal(button(missing, 'Review release'), undefined);
  assert.match(text(missing.render()), /requested PO has no available parts/);
});
test('no PO selection is possible without a source and inactive stores remain available', () => {
  const h = harness(props({ initialStoreId: '', initialPoKey: 'external:1' }));
  assert.equal(button(h, 'Review release'), undefined);
  assert.equal(label(h, 'Select PO 292427'), undefined);
  assert.equal(byType(h, 'StoreSelect').props.includeInactive, true);
  assert.equal(byType(h, 'StoreSelect').props.allowUnassigned, true);
});
test('selected store quantities exclude stock elsewhere and transit; external POs remain eligible', async () => {
  let request;
  const h = harness(props({ initialStoreId: '2' }), { warehouseRelease: async body => { request = body; return { units: 1, parts: 4, storeName: 'Store 2', storeId: 2, replayed: false }; } });
  label(h, 'Select PO 292427').props.onChange({ target: { checked: true } });
  click(h, 'Review release'); await click(h, 'Confirm release');
  assert.equal(request.storeId, 2);
  assert.deepEqual(request.items, [{ barcode: 'I1126830', quantity: 4, version: 3 }]);
  assert.equal('installationJobId' in request, false);
  assert.equal('signatureStrokes' in request, false);
});
test('partial quantities and PO totals appear in confirmation before any write', async () => {
  let writes = 0;
  const h = harness(props(), { warehouseRelease: async () => { writes++; return { units: 2, parts: 3, storeId: 1, storeName: 'Store 1', replayed: false }; } });
  select(h, 'I1126830'); select(h, 'I1126835');
  label(h, 'Release parts for I1126830').props.onChange({ target: { value: '1' } });
  click(h, 'Review release');
  const dialogText = text(byType(h, 'Dialog'));
  assert.match(dialogText, /Store 1/); assert.match(dialogText, /2 pieces · 3 physical parts/);
  assert.match(dialogText, /PO 292427/); assert.match(dialogText, /1 pieces · 1 parts/);
  assert.match(dialogText, /PO 292759/); assert.equal(writes, 0);
  click(h, 'Back to selection'); assert.equal(writes, 0);
});
test('zero fractional and excess quantities cannot be confirmed', () => {
  for (const quantity of ['0', '', '1.5', '3']) {
    const h = harness(); select(h, 'I1126830');
    label(h, 'Release parts for I1126830').props.onChange({ target: { value: quantity } });
    assert.equal(button(h, 'Review release').props.disabled, true);
    button(h, 'Review release').props.onClick(); assert.equal(byType(h, 'Dialog').props.open, false);
  }
});
test('select visible POs includes whole POs but stops safely at the 500-piece limit', () => {
  const h = harness(); label(h, 'Select all visible POs').props.onChange({ target: { checked: true } });
  assert.match(text(h.render()), /2 pieces · 4 physical parts/);
  const many = group(Array.from({ length: 501 }, (_, index) => unit(String(3000000 + index))));
  const excessive = harness(props({ initial: { ...props().initial, items: [many], total: 1 } }));
  label(excessive, 'Select all visible POs').props.onChange({ target: { checked: true } });
  assert.match(text(excessive.render()), /at most 500 pieces/); assert.equal(button(excessive, 'Review release'), undefined);
});
test('unassigned stock uses explicit null store and only its available quantity', async () => {
  let request;
  const h = harness(props({ initialStoreId: 'unassigned' }), { warehouseRelease: async body => { request = body; return { units: 1, parts: 1, storeId: null, storeName: 'Unassigned', replayed: false }; } });
  reviewed(h); assert.match(text(byType(h, 'Dialog')), /Unassigned/); await click(h, 'Confirm release');
  assert.equal(request.storeId, null); assert.equal(request.items[0].quantity, 1);
});
test('changing source or search clears previous quantities and never mutates stock', () => {
  for (const change of [h => byType(h, 'StoreSelect').props.onChange('2'), h => label(h, 'Search release POs').props.onChange({ target: { value: 'Other PO' } })]) {
    let writes = 0; const h = harness(props(), { warehouseRelease: async () => { writes++; } });
    select(h, 'I1126830'); change(h);
    assert.equal(button(h, 'Review release'), undefined); assert.equal(writes, 0);
  }
});
test('refresh clears stale selection and loads complete on-hand POs at the selected store', async () => {
  let query;
  const h = harness(props(), { warehouseInventoryByPo: async value => { query = value; return { ...props().initial, items: [group([unit('1126830', { version: 4 })])], total: 1 }; } });
  select(h, 'I1126830'); click(h, 'Refresh'); await flush();
  assert.equal(button(h, 'Review release'), undefined);
  assert.deepEqual(query, { view: 'on_hand', storeId: '1', search: '', page: 1, completePo: true, pageSize: 20 });
});
test('selecting POs on multiple pages preserves all quantities in one release', async () => {
  const initial = { ...props().initial, items: [group([parts[0]])], total: 21 };
  let request;
  const h = harness(props({ initial }), {
    warehouseInventoryByPo: async query => ({ ...initial, page: query.page, items: query.page === 2 ? [group([parts[1]])] : initial.items }),
    warehouseRelease: async body => { request = body; return { units: 2, parts: 4, storeId: 1, storeName: 'Store 1', replayed: false }; },
  });
  label(h, 'Select PO 292427').props.onChange({ target: { checked: true } });
  byType(h, 'Pagination').props.onPage(2); await loadCurrentPage(h);
  label(h, 'Select PO 292759').props.onChange({ target: { checked: true } });
  click(h, 'Review release'); assert.match(text(byType(h, 'Dialog')), /2 pieces · 4 physical parts/);
  await click(h, 'Confirm release');
  assert.deepEqual(request.items.map(item => item.barcode), ['I1126830', 'I1126835']);
});
test('page refresh removes changed visible selections while retaining other pages', async () => {
  const initial = { ...props().initial, items: [group([parts[0]])], total: 21 };
  let changed = false;
  const h = harness(props({ initial }), {
    warehouseInventoryByPo: async query => ({ ...initial, page: query.page, items: [group([{ ...parts[1], version: changed ? 4 : 3 }])] }),
  });
  label(h, 'Select PO 292427').props.onChange({ target: { checked: true } });
  byType(h, 'Pagination').props.onPage(2); await loadCurrentPage(h);
  label(h, 'Select PO 292759').props.onChange({ target: { checked: true } });
  changed = true; await loadCurrentPage(h);
  assert.equal(label(h, 'Select PO 292759').props.checked, false);
  click(h, 'Review release'); assert.match(text(byType(h, 'Dialog')), /PO 292427/);
  assert.doesNotMatch(text(byType(h, 'Dialog')), /PO 292759/);
});
test('choosing a source after PO navigation selects only that exact PO', async () => {
  const h = harness(props({ initialStoreId: '', initialPoKey: 'order:2' }));
  byType(h, 'StoreSelect').props.onChange('2'); await loadCurrentPage(h);
  assert.equal(label(h, 'Select PO 292759').props.checked, true);
  assert.equal(label(h, 'Select PO 292427').props.checked, false);
  assert.match(text(h.render()), /1 pieces · 4 physical parts/);
});
test('rapid duplicate confirmation sends one request and disables another release after success', async () => {
  let finish, writes = 0;
  const h = harness(props(), { warehouseRelease: () => { writes++; return new Promise(resolve => { finish = resolve; }); } });
  reviewed(h); const submit = button(h, 'Confirm release').props.onClick;
  const first = submit(), second = submit(); await flush(); assert.equal(writes, 1);
  finish({ units: 1, parts: 2, storeId: 1, storeName: 'Store 1', replayed: false }); await Promise.all([first, second]);
  assert.match(text(h.render()), /Release recorded/); assert.equal(button(h, 'Confirm release'), undefined); assert.equal(storage.size, 0);
});
test('lost response freezes quantities and retries exactly the original request', async () => {
  const requests = [];
  const h = harness(props(), { warehouseRelease: async body => { requests.push(structuredClone(body)); if (requests.length === 1) throw new Error('Connection lost'); return { units: 1, parts: 2, storeId: 1, storeName: 'Store 1', replayed: true }; } });
  reviewed(h); await click(h, 'Confirm release');
  assert.equal(button(h, 'Back to selection').props.disabled, true);
  assert.equal(byType(h, 'StoreSelect').props.disabled, true);
  assert.equal(label(h, 'Release parts for I1126830').props.disabled, true);
  byType(h, 'Dialog').props.onOpenChange(false); assert.equal(byType(h, 'Dialog').props.open, true);
  await click(h, 'Check release'); assert.deepEqual(requests[1], requests[0]);
});
test('pending release survives reload and keeps its original store and PO quantities', async () => {
  let original, recovered;
  const first = harness(props(), { warehouseRelease: async body => { original = structuredClone(body); throw new Error('Response lost'); } });
  reviewed(first); await click(first, 'Confirm release');
  const reload = harness(props({ initialStoreId: '2', initial: { ...props().initial, items: [] } }), { warehouseRelease: async body => { recovered = structuredClone(body); return { units: 1, parts: 2, storeId: 1, storeName: 'Store 1', replayed: true }; } });
  assert.match(text(byType(reload, 'Dialog')), /Store 1/); await click(reload, 'Check release'); assert.deepEqual(recovered, original);
});
for (const status of [400, 409]) test(`definite ${status} rejection discards stale selections and requires fresh review`, async () => {
  let writes = 0;
  const h = harness(props(), { warehouseRelease: async () => { writes++; throw new ApiError('Stock changed', status); } });
  reviewed(h); await click(h, 'Confirm release');
  assert.equal(storage.size, 0); assert.equal(byType(h, 'Dialog').props.open, false);
  assert.equal(button(h, 'Review release'), undefined); assert.equal(label(h, 'Select PO 292427'), undefined);
  assert.match(text(h.render()), /selection was cleared/); assert.equal(writes, 1);
});
test('physical counts and changed identities prevent new releases', async () => {
  let writes = 0;
  const counted = harness(props({ initial: { ...props().initial, activeCountId: 9 } }), { warehouseRelease: async () => { writes++; } });
  select(counted, 'I1126830'); assert.equal(button(counted, 'Review release').props.disabled, true);
  button(counted, 'Review release').props.onClick(); assert.equal(byType(counted, 'Dialog').props.open, false);
  const auth = standardAuth(); auth.revalidate = async () => ({ id: 11, role: { name: 'admin' } });
  const changed = harness(props(), { warehouseRelease: async () => { writes++; } }, auth);
  reviewed(changed); await click(changed, 'Confirm release'); assert.equal(writes, 0); assert.equal(storage.size, 0);
  assert.match(text(changed.render()), /account has changed/);
});
test('different staff cannot view or retry another actors pending release', async () => {
  const first = harness(props(), { warehouseRelease: async () => { throw new Error('Response lost'); } });
  reviewed(first); await click(first, 'Confirm release');
  const auth = standardAuth(); auth.user.id = 11;
  const other = harness(props(), {}, auth);
  assert.equal(byType(other, 'Dialog'), undefined); assert.equal(button(other, 'Check release'), undefined);
});
test('disabled browser storage prevents sending and malformed recovery data is never replayed', async () => {
  let writes = 0;
  const h = harness(props(), { warehouseRelease: async () => { writes++; } });
  reviewed(h); const save = sessionStorage.setItem; sessionStorage.setItem = () => { throw new Error('Unavailable'); };
  try { await click(h, 'Confirm release'); } finally { sessionStorage.setItem = save; }
  assert.equal(writes, 0); assert.match(text(h.render()), /Nothing was sent/);
  storage.set('warehouse-installation-release:10', JSON.stringify({ body: { requestKey: 'x', storeId: -1, items: [] }, lines: [] }));
  const corrupt = harness(); assert.match(text(corrupt.render()), /pending release could not be loaded/);
  assert.equal(button(corrupt, 'Check release'), undefined); assert.equal(byType(corrupt, 'StoreSelect').props.disabled, true);
});
test('scanner navigation keeps installation destination and source without recording a release', () => {
  const h = harness(props({ initialStoreId: 'unassigned' }));
  const link = nodes(h.render(), node => node.type === 'a' && text(node) === 'Release by scanning')[0];
  const url = new URL(link.props.href, 'https://local.invalid');
  assert.equal(url.searchParams.get('action'), 'RELEASE'); assert.equal(url.searchParams.get('destination'), 'installation');
  assert.equal(url.searchParams.get('storeId'), 'unassigned');
});
test('inventory release choices preserve PO store and search for both destinations', () => {
  const Component = loader()('app/warehouse/release-actions.tsx').WarehouseReleaseActions;
  for (const storeId of ['2', 'unassigned']) {
    const tree = Component({ storeId, search: 'Santos 292427', poKey: 'external:1', poLabel: '292427', compact: true });
    const links = nodes(tree, node => node.type === 'a'); assert.equal(links.length, 2);
    for (const link of links) {
      const url = new URL(link.props.href, 'https://local.invalid');
      assert.equal(url.searchParams.get('storeId'), storeId); assert.equal(url.searchParams.get('search'), 'Santos 292427');
      assert.equal(url.searchParams.get('poKey'), 'external:1');
      assert.ok(['/warehouse/customer-deliveries/new', '/warehouse/releases/new'].includes(url.pathname));
    }
  }
});
test('transit navigation offers only signed customer delivery and no warehouse release', () => {
  const Component = loader()('app/warehouse/release-actions.tsx').WarehouseReleaseActions;
  const tree = Component({ source: 'TRANSIT', poKey: 'order:2', storeId: '1' });
  const links = nodes(tree, node => node.type === 'a'); assert.equal(links.length, 1);
  const url = new URL(links[0].props.href, 'https://local.invalid');
  assert.equal(url.pathname, '/warehouse/customer-deliveries/new'); assert.equal(url.searchParams.get('source'), 'TRANSIT');
  assert.equal(url.searchParams.has('storeId'), false); assert.equal(url.searchParams.get('poKey'), 'order:2');
});

(async () => {
  for (const { name, run } of tests) { storage.clear(); await run(); process.stdout.write(`PASS ${name}\n`); }
  process.stdout.write(`${tests.length} warehouse release checks passed.\n`);
})().catch(error => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
