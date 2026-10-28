// Offline history tests. No API, database or inventory writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
process.env.TZ = 'America/New_York';
const root = path.resolve(__dirname, '../src');
const folder = 'app/warehouse/materials/history/';
const tests = [], test = (name, run) => tests.push({ name, run });
function loader(hooks = {}, api = {}) {
  const cache = new Map();
  function load(file) {
    const filename = path.resolve(root, file);
    if (cache.has(filename)) return cache.get(filename);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', compiled)(id => {
      if (id === 'react') return { ...React, ...hooks };
      if (id === 'react/jsx-runtime') return require(id);
      if (id === 'next/link') return { default: 'a', __esModule: true };
      if (id === 'lucide-react' || id.startsWith('@/components/ui/')) return new Proxy({}, { get: (_, name) => name });
      if (id === '@/app/api/materials.api' || id === '@/app/api/warehouse.api') return api;
      if (id === '../../warehouse-access') return { requireWarehouseUser: api.requireWarehouseUser };
      if (id === '../materials-shared') return { MaterialField: 'MaterialField', errorText: error => error.message, materialInputClass: 'input', quantity: value => Number(value).toLocaleString('en-US') };
      const base = path.resolve(path.dirname(filename), id);
      const resolved = ['.ts', '.tsx'].map(ext => base + ext).find(file => fs.existsSync(file));
      if (!resolved) throw new Error(`Unresolved ${id}`);
      return load(path.relative(root, resolved));
    }, module, module.exports);
    cache.set(filename, module.exports); return module.exports;
  }
  return load;
}
const movement = (overrides = {}) => ({
  id: 1, productId: 5, product: { id: 5, code: 'MAT-000005', name: 'White sealant', baseUnit: { id: 1, name: 'Tube' } },
  presentation: { id: 8, name: 'Box (12 tubes)' }, store: { id: 2, name: 'Main warehouse' },
  kind: 'INTERNAL_USE', quantity: 2, deltaBaseUnits: -24, baseUnitsAfter: 120,
  recipient: 'Juan Perez', actorId: 9, actor: 'Maria Warehouse', createdAt: '2026-10-28T13:00:00Z', note: 'Installation', ...overrides,
});
const page = (items = [movement()], overrides = {}) => ({ items, total: items.length, page: 1, pageSize: 25, ...overrides });
const defaults = () => ({ initial: page(), stores: [{ id: 2, name: 'Main warehouse', isActive: true }, { id: 3, name: 'Old warehouse', isActive: false }] });
function harness(api = {}, props = defaults()) {
  const states = [], refs = []; let si = 0, ri = 0, mounted = false, effect, cleanup;
  const hooks = {
    useState(initial) { const i = si++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef(initial) { const i = ri++; if (!(i in refs)) refs[i] = { current: initial }; return refs[i]; },
    useEffect(callback) { if (!mounted) effect = callback; },
  };
  const Component = loader(hooks, api)(folder + 'material-history-client.tsx').MaterialHistoryClient;
  return {
    render() { si = 0; ri = 0; const tree = Component(props); if (!mounted) { mounted = true; cleanup = effect?.(); } return tree; },
    dispose() { cleanup?.(); },
  };
}
const text = element => typeof element === 'string' || typeof element === 'number' ? String(element) : Array.isArray(element) ? element.map(text).join('') : element?.props ? text(element.props.children) : '';
function nodes(element, predicate, result = []) {
  if (Array.isArray(element)) { element.forEach(child => nodes(child, predicate, result)); return result; }
  if (!element || typeof element !== 'object') return result;
  if (predicate(element)) result.push(element);
  nodes(element.props?.children, predicate, result); return result;
}
const byLabel = (h, label) => nodes(h.render(), n => n.props?.['aria-label'] === label)[0];
const enter = (h, label, value) => byLabel(h, label).props.onChange({ target: { value } });
const apply = h => byLabel(h, 'Material history filters').props.onSubmit({ preventDefault() {} });
const click = (h, label) => { const node = nodes(h.render(), n => n.type === 'Button' && text(n) === label)[0]; assert.ok(node && !node.props.disabled, `Missing or disabled ${label}`); return node.props.onClick(); };
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const { materialHistoryQuery: query, emptyMaterialHistoryFilters: empty } = loader()(folder + 'material-history-filters.ts');

test('default query has no material, recipient or date restriction', () => assert.deepEqual(query(empty), { page: 1, pageSize: 25 }));
test('combined filters send recipient separately and include the entire local end date', () => {
  assert.deepEqual(query({ ...empty, search: ' sealant ', recipient: ' Juan ', storeId: '3', kind: 'INTERNAL_USE', from: '2026-03-08', to: '2026-03-08' }, 2), {
    page: 2, pageSize: 25, search: 'sealant', recipient: 'Juan', storeId: 3, kind: 'INTERNAL_USE', from: '2026-03-08T05:00:00.000Z', to: '2026-03-09T04:00:00.000Z',
  });
});
test('invalid dates, reversed range and invalid filters are blocked', () => {
  for (const changes of [{ from: '2026-02-30' }, { to: 'invalid' }, { from: '2026-10-29', to: '2026-10-28' }, { storeId: '1.5' }, { kind: 'DELETE' }, { recipient: 'x'.repeat(201) }]) assert.throws(() => query({ ...empty, ...changes }));
});
test('history renders all materials and distinguishes recipient from recorder and stock units', () => {
  const h = harness({}, { ...defaults(), initial: page([movement(), movement({ id: 2, productId: 6, product: { name: 'Tape', code: 'MAT-000006', baseUnit: { id: 2, name: 'Roll' } }, kind: 'RECEIVE', recipient: null, quantity: 4, deltaBaseUnits: 4, baseUnitsAfter: 6 })]) });
  const output = text(h.render());
  assert.match(output, /White sealant/); assert.match(output, /Tape/); assert.match(output, /Received by: Juan Perez/); assert.match(output, /Recorded by: Maria Warehouse/);
  assert.match(output, /-24 tube/); assert.match(output, /120 tube/); assert.match(output, /Showing all material movements/); assert.match(output, /Old warehouse \(inactive\)/);
  assert.deepEqual(nodes(h.render(), n => n.type === 'a').map(n => n.props.href), ['/warehouse/materials', '/warehouse/materials/5', '/warehouse/materials/6']);
});
test('counts and package operations have readable labels without implying withdrawals', () => {
  const h = harness({}, { ...defaults(), initial: page([movement({ kind: 'COUNT_ADJUSTMENT', quantity: 120, recipient: null }), movement({ id: 2, kind: 'ADJUST', quantity: 4, recipient: null }), movement({ id: 3, kind: 'OPEN', deltaBaseUnits: 0, recipient: null })]) });
  const output = text(h.render()); assert.match(output, /QuantityInventory count/); assert.match(output, /Counted quantity4 Box/); assert.match(output, /Packages opened/); assert.match(output, /Stock change0 tube/);
});
test('applying filters searches globally and resets to the first page', async () => {
  const calls = []; const h = harness({ materialHistory: async request => { calls.push(request); return page([movement({ id: 7 })]); } }, { ...defaults(), initial: page(undefined, { page: 3, total: 90 }) });
  enter(h, 'Technician or recipient', ' Juan '); enter(h, 'Material name or code', 'sealant'); enter(h, 'Store', '3'); enter(h, 'Movement type', 'INTERNAL_USE');
  apply(h); await tick();
  assert.deepEqual(calls, [{ page: 1, pageSize: 25, search: 'sealant', recipient: 'Juan', storeId: 3, kind: 'INTERNAL_USE' }]);
  assert.match(text(byLabel(h, 'Applied filters')), /Recipient: Juan/); assert.doesNotMatch(text(h.render()), /Select Apply filters/); assert.match(text(h.render()), /Movement #7/);
});
test('pagination and refresh keep applied filters when draft fields change', async () => {
  const calls = []; const h = harness({ materialHistory: async request => { calls.push(request); return page(undefined, { page: request.page, total: 60 }); } });
  enter(h, 'Technician or recipient', 'Juan'); apply(h); await tick();
  enter(h, 'Technician or recipient', 'Carlos'); click(h, 'Next'); await tick(); click(h, 'Refresh'); await tick();
  assert.deepEqual(calls.map(({ page, recipient }) => ({ page, recipient })), [{ page: 1, recipient: 'Juan' }, { page: 2, recipient: 'Juan' }, { page: 2, recipient: 'Juan' }]);
  assert.match(text(byLabel(h, 'Applied filters')), /Recipient: Juan/); assert.equal(byLabel(h, 'Technician or recipient').props.value, 'Carlos');
});
test('failed requests keep the previous results and applied filters with a clear error', async () => {
  let fail = false; const h = harness({ materialHistory: async () => { if (fail) throw new Error('Connection unavailable.'); return page([movement({ id: 7 })]); } });
  enter(h, 'Technician or recipient', 'Juan'); apply(h); await tick(); fail = true;
  enter(h, 'Technician or recipient', 'Carlos'); apply(h); await tick();
  assert.match(text(h.render()), /Connection unavailable. The previous results are still shown/); assert.match(text(h.render()), /Movement #7/); assert.match(text(byLabel(h, 'Applied filters')), /Recipient: Juan/);
});
test('clear filters reloads all movements and resets pagination', async () => {
  const calls = []; const h = harness({ materialHistory: async request => { calls.push(request); return page(undefined, { page: request.page, total: 60 }); } });
  enter(h, 'Material name or code', 'sealant'); apply(h); await tick(); click(h, 'Next'); await tick(); click(h, 'Clear filters'); await tick();
  assert.deepEqual(calls.at(-1), { page: 1, pageSize: 25 }); assert.equal(byLabel(h, 'Material name or code').props.value, ''); assert.match(text(byLabel(h, 'Applied filters')), /Showing all/);
});
test('invalid date ranges do not make requests or discard history', async () => {
  let calls = 0; const h = harness({ materialHistory: async () => { calls++; return page([]); } });
  enter(h, 'From date', '2026-10-29'); enter(h, 'Through date', '2026-10-28'); apply(h); await tick();
  assert.equal(calls, 0); assert.match(text(h.render()), /end date must be on or after/); assert.match(text(h.render()), /White sealant/);
});
test('newer requests win when a slow earlier response finishes last', async () => {
  const pending = []; const h = harness({ materialHistory: () => { const result = deferred(); pending.push(result); return result.promise; } });
  enter(h, 'Technician or recipient', 'Juan'); apply(h); enter(h, 'Technician or recipient', 'Carlos'); apply(h);
  pending[1].resolve(page([movement({ id: 9, recipient: 'Carlos' })])); await tick(); pending[0].resolve(page([movement({ id: 7, recipient: 'Juan' })])); await tick();
  assert.match(text(byLabel(h, 'Applied filters')), /Recipient: Carlos/); assert.match(text(h.render()), /Movement #9/); assert.doesNotMatch(text(h.render()), /Movement #7/);
});
test('loading, empty results and unmount do not expose stale response changes', async () => {
  const waiting = deferred(); const h = harness({ materialHistory: () => waiting.promise });
  enter(h, 'Technician or recipient', 'Unknown'); apply(h); assert.match(text(h.render()), /Loading material history/);
  waiting.resolve(page([])); await tick(); assert.match(text(h.render()), /No material movements match these filters/);
  const next = deferred(); const unmounted = harness({ materialHistory: () => next.promise }); apply(unmounted); unmounted.dispose(); next.resolve(page([movement({ id: 99 })])); await tick(); assert.doesNotMatch(text(unmounted.render()), /Movement #99/);
});
test('server page checks warehouse permission before loading history and stores', async () => {
  let called = false;
  const denied = loader({}, { requireWarehouseUser: async () => { throw new Error('Denied'); }, materialHistory: async () => { called = true; }, warehouseStores: async () => { called = true; } })(folder + 'page.tsx').default;
  await assert.rejects(denied(), /Denied/); assert.equal(called, false);
  const stores = defaults().stores, initial = page();
  const allowed = loader({}, { requireWarehouseUser: async () => ({}), materialHistory: async () => initial, warehouseStores: async () => stores })(folder + 'page.tsx').default;
  const result = await allowed(); assert.equal(result.props.initial, initial); assert.equal(result.props.stores, stores);
});
(async () => { for (const { name, run } of tests) { await run(); process.stdout.write(`PASS ${name}\n`); } process.stdout.write(`${tests.length} material history checks passed.\n`); })().catch(error => { console.error(error); process.exitCode = 1; });
