/* Frontend regression checks using synthetic units only. No API or database writes.
 * Run from frontend: node scripts/test-external-po.cjs */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '../src');
const cache = new Map();
const calls = [];
const passthrough = ({ children }) => React.createElement('div', null, children);
const button = ({ children, disabled, asChild }) => asChild ? children : React.createElement('button', { disabled }, children);
const input = ({ value, defaultValue, disabled, type, id }) => React.createElement('input', { value, defaultValue, disabled, type, id, readOnly: true });
const stubs = {
  'next/link': { __esModule: true, default: ({ children, href }) => React.createElement('a', { href }, children) },
  'next/navigation': { useRouter: () => ({ refresh() {} }) },
  '@/app/api/_base': { apiFetch: async (...args) => { calls.push(args); return {}; }, isApiError: () => false },
  './_base': { apiFetch: async (...args) => { calls.push(args); return {}; }, isApiError: () => false },
  '@/app/api/warehouse.api': {},
  '@/app/api/warehouse-delivery.api': {},
  './store-select': { StoreSelect: () => null },
  '../store-select': { StoreSelect: () => null },
  './pickup-customer-delivery': { PickupCustomerDelivery: () => null },
  './pickup-customer-delivery-data': { pickupDeliveryContextKey: (surface, actorId, runId) => `${surface}:${actorId}:${runId}` },
  './transfer-form': { TransferForm: () => null },
};
function load(relativeFile) {
  const filename = path.resolve(root, relativeFile);
  if (cache.has(filename)) return cache.get(filename);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => {
    if (id === 'react' || id === 'react/jsx-runtime') return require(id);
    if (Object.hasOwn(stubs, id)) return stubs[id];
    if (id === 'lucide-react') return new Proxy({}, { get: () => () => null });
    if (id.startsWith('@/components/ui/')) return new Proxy({}, { get: (_, name) => name === 'Button' ? button : name === 'Input' ? input : passthrough });
    const target = id.startsWith('@/') ? path.resolve(root, id.slice(2))
      : id.startsWith('.') ? path.resolve(path.dirname(filename), id) : null;
    if (!target) throw new Error(`Unexpected dependency: ${id}`);
    const resolved = ['.ts', '.tsx'].map(extension => target + extension).find(file => fs.existsSync(file));
    if (!resolved) throw new Error(`Unresolved dependency: ${id}`);
    return load(path.relative(root, resolved));
  }, module, module.exports);
  cache.set(filename, module.exports);
  return module.exports;
}
const { externalPoReviewState } = load('app/warehouse/external-po/preview-state.ts');
const { UnitOrigin, ExternalDescription } = load('app/warehouse/unit-origin.tsx');
const { InventoryClient } = load('app/warehouse/inventory-client.tsx');
const { ReceiptsClient } = load('app/warehouse/receipts/receipts-client.tsx');
const { previewExternalPo, confirmExternalPo } = load('app/api/external-po.api.ts');
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
const line = (lineNumber, overrides = {}) => ({ lineNumber, mark: '', description: 'Synthetic door', panels: 2,
  expectedParts: 3, family: 'FRENCH_DOOR', needsReview: false, issues: [], existing: false, locked: false, ...overrides });
const stock = (source, id) => ({ source, lineNumber: String(id), barcode: `I${id}`, pieceId: source === 'ORDER' ? id : null,
  externalPoId: source === 'EXTERNAL' ? id : null, mark: '', product: 'Synthetic unit', system: '', configuration: '',
  orderId: source === 'ORDER' ? id : null, orderNumber: source === 'ORDER' ? `ORD-${id}` : '', poNumber: `PO-${id}`,
  customer: '', project: `Project ${id}`, description: source === 'EXTERNAL' ? 'Original description\nSize: 23 1/2 x 95' : '',
  supplierName: 'ECO', installation: null, expectedParts: 3, inTransit: 1, onHand: 1, unassigned: 0,
  stores: [{ id: 1, name: 'Main', isActive: true, onHand: 1 }], released: 0, pending: 1, version: 1,
  updatedAt: '2026-10-12T00:00:00Z', state: 'PARTIAL' });
const external = stock('EXTERNAL', 2), internal = stock('ORDER', 1);
const summary = { onHand: 2, inTransit: 2, released: 0, unassigned: 0 };
const tests = [];
const test = (name, run) => tests.push({ name, run });

// Exercise the real event handlers with controlled hook state, without a browser.
function controlled(relativeFile, exportName, initialStates, overrides = {}) {
  const filename = path.resolve(root, relativeFile), states = [...initialStates], refs = [];
  let stateIndex = 0, refIndex = 0;
  const hooks = { ...React,
    useState(initial) { const index = stateIndex++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; },
    useRef(initial) { const index = refIndex++; return refs[index] ??= { current: initial }; },
    useEffect() {}, useCallback: fn => fn, useMemo: fn => fn(),
  };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => {
    if (id === 'react') return hooks;
    if (id === 'react/jsx-runtime') return require(id);
    if (Object.hasOwn(overrides, id)) return overrides[id];
    if (Object.hasOwn(stubs, id)) return stubs[id];
    if (id === '@/app/api/technician.api' || id === '@/app/warehouse/scan-pad') return {};
    if (id === 'lucide-react') return new Proxy({}, { get: () => () => null });
    if (id.startsWith('@/components/ui/')) return new Proxy({}, { get: (_, name) => name === 'Button' ? button : name === 'Input' ? input : passthrough });
    const target = id.startsWith('@/') ? path.resolve(root, id.slice(2)) : path.resolve(path.dirname(filename), id);
    const resolved = ['.ts', '.tsx'].map(extension => target + extension).find(file => fs.existsSync(file));
    if (!resolved) throw new Error(`Unresolved controlled dependency: ${id}`);
    return load(path.relative(root, resolved));
  }, module, module.exports);
  return { states, render(props) { stateIndex = 0; refIndex = 0; return module.exports[exportName](props); } };
}
function nodes(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, predicate));
  if (!React.isValidElement(tree)) return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props.children, predicate)];
}
const previewFixture = { revision: 'revision-1', document: { poNumber: 'SYNTHETIC-1', orderName: 'Test', supplierName: 'ECO' },
  lines: [line('a')], expectedUnits: 1, linkedUnits: 0 };

test('removing one external PO keeps the other external PO and system order in a mixed pickup', () => {
  const planned = [{ key: 'order:1', source: 'ORDER', orderId: 1, orderNumber: 'ORD-1', poNumber: 'ONE', parts: 1, pieces: 1 },
    { key: 'external:1', source: 'EXTERNAL', orderId: null, orderNumber: '', poNumber: 'TWO', parts: 2, pieces: 1 },
    { key: 'external:2', source: 'EXTERNAL', orderId: null, orderNumber: '', poNumber: 'THREE', parts: 3, pieces: 1 }];
  const view = controlled('app/technician/factory-pickup.tsx', 'FactoryPickup', [null, null, planned, '', false]);
  const tree = view.render({ actorId: 1, surface: 'warehouse', pickupId: null, onBusy() {}, onFinished() {}, onCreated() {}, offline: false, blocked: false });
  const remove = nodes(tree, node => node.props['aria-label'] === 'Remove PO TWO');
  assert.equal(remove.length, 1); remove[0].props.onClick();
  assert.deepEqual(view.states[2].map(po => po.key), ['order:1', 'external:2']);
});
test('editing a reviewed import resets acknowledgement; changing the file clears its preview', () => {
  const file = new File(['{}'], 'first.json');
  const view = controlled('app/warehouse/external-po/external-po-client.tsx', 'ExternalPoClient', [file, previewFixture, { a: '3' }, true]);
  let tree = view.render({});
  nodes(tree, node => node.props.id === 'parts-a')[0].props.onChange({ target: { value: '4' } });
  assert.equal(view.states[3], false); assert.deepEqual(view.states[2], { a: '4' });
  tree = view.render({});
  const confirm = nodes(tree, node => node.props.onClick?.name === 'confirm')[0];
  assert.equal(confirm.props.disabled, true);
  nodes(tree, node => node.props.id === 'external-po-json')[0].props.onChange({ target: { files: [new File(['{}'], 'second.json')] } });
  assert.equal(view.states[1], null); assert.deepEqual(view.states[2], {}); assert.equal(view.states[3], false);
});
test('double confirmation sends once and a stale preview response requires a fresh preview', async () => {
  const file = new File(['{}'], 'first.json');
  let sent = 0, rejectRequest;
  const request = new Promise((resolve, reject) => { rejectRequest = reject; });
  const view = controlled('app/warehouse/external-po/external-po-client.tsx', 'ExternalPoClient', [file, previewFixture, { a: '3' }, false], {
    '@/app/api/external-po.api': { confirmExternalPo: () => { sent++; return request; } },
    '@/app/api/_base': { isApiError: error => error.status === 409 },
  });
  const confirm = nodes(view.render({}), node => node.props.onClick?.name === 'confirm')[0];
  const pending = confirm.props.onClick();
  await confirm.props.onClick(); assert.equal(sent, 1);
  rejectRequest(Object.assign(new Error('Preview changed'), { status: 409 }));
  await pending;
  assert.equal(view.states[1], null); assert.equal(view.states[4], false); assert.equal(view.states[5], 'Preview changed');
});

test('ambiguous counts remain blocked until entered, and always require review', () => {
  const lines = [line('a', { expectedParts: null, needsReview: true })];
  assert.equal(externalPoReviewState(lines, { a: '' }).invalid, 1);
  assert.equal(externalPoReviewState(lines, { a: '4' }).invalid, 0);
  assert.equal(externalPoReviewState(lines, { a: '4' }).needsReview, true);
});
test('counts use per-line identities even with missing or repeated marks', () => {
  const state = externalPoReviewState([line('a'), line('b'), line('c', { mark: 'A' }), line('d', { mark: 'A' })],
    { a: '3', b: '3', c: '3', d: '3' });
  assert.deepEqual(state, { invalid: 0, needsReview: false, totalParts: 12 });
});
test('changed suggestions require review and locked counts cannot change', () => {
  assert.equal(externalPoReviewState([line('a')], { a: '4' }).needsReview, true);
  assert.equal(externalPoReviewState([line('a', { locked: true })], { a: '4' }).invalid, 1);
  assert.equal(externalPoReviewState([line('a', { locked: true })], { a: '3' }).invalid, 0);
});
test('blank, missing, fractional, negative, and oversized counts cannot confirm', () => {
  for (const value of ['', undefined, '0', '-1', '1.5', '201', 'Infinity', 'abc']) {
    assert.equal(externalPoReviewState([line('a')], { a: value }).invalid, 1, String(value));
  }
  for (const value of ['1', '200']) assert.equal(externalPoReviewState([line('a')], { a: value }).invalid, 0);
});
test('external units never produce order links while system units keep their links', () => {
  const outside = render(UnitOrigin, { unit: external, link: true });
  assert.match(outside, /External PO/); assert.doesNotMatch(outside, /href=|Order #/);
  assert.match(render(UnitOrigin, { unit: internal, link: true }), /href="\/orders\/1"/);
});
test('full factory description preserves fractional sizes and escapes imported markup', () => {
  const html = render(ExternalDescription, { unit: { ...external, description: 'Size: 23 1/2 x 95\n<script>bad</script>' } });
  assert.match(html, /23 1\/2 x 95/); assert.match(html, /&lt;script&gt;bad&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});
test('mixed inventory exposes admin import and names external POs without fake orders', () => {
  const initial = { items: [internal, external].map(unit => ({ ...unit, key: `${unit.source}:${unit.lineNumber}`, units: [unit] })),
    total: 2, page: 1, pageSize: 20, summary, activeCountId: null };
  const props = { initial, initialSearch: '', initialView: 'all', initialSource: 'all', initialStores: [], initialStoreId: 'all', admin: true };
  const html = render(InventoryClient, props);
  assert.match(html, /Import External PO/); assert.match(html, /href="\/warehouse\/external-po"/);
  assert.match(html, /External PO/); assert.match(html, /Project 2/);
  assert.match(html, /href="\/orders\/1"/); assert.doesNotMatch(html, /\/orders\/null|\/orders\/undefined/);
  assert.doesNotMatch(render(InventoryClient, { ...props, admin: false }), /href="\/warehouse\/external-po"/);
});
test('pending receipt preserves external descriptions when expanded and labels real order origins', () => {
  const items = [internal, external].map(unit => ({ ...unit,
    key: unit.source === 'EXTERNAL' ? `external:${unit.externalPoId}` : `order:${unit.orderId}`, units: [unit] }));
  const props = { initial: { items, total: 2, page: 1, pageSize: 20, summary, activeCountId: null }, initialStores: [] };
  const view = controlled('app/warehouse/receipts/receipts-client.tsx', 'ReceiptsClient', []);
  const collapsed = view.render(props);
  const expand = nodes(collapsed, node => node.props['aria-label'] === 'Show pieces for PO PO-2');
  assert.equal(expand.length, 1);
  expand[0].props.onClick();
  const html = renderToStaticMarkup(view.render(props));
  assert.match(html, /Original description/); assert.match(html, /23 1\/2 x 95/);
  assert.match(html, /External PO/); assert.match(html, /Order #ORD-1/);
  assert.doesNotMatch(html, /\/orders\/null|\/orders\/undefined|Order #null|Order #undefined/);
});
test('import requests use multipart preview and a count-only confirmation', async () => {
  const file = new File(['{"schema":"synthetic"}'], 'fixture.json', { type: 'application/json' });
  await previewExternalPo(file);
  await confirmExternalPo(file, 'revision-1', [{ lineNumber: 'a', expectedParts: 3 }], true);
  const [previewCall, confirmCall] = calls.slice(-2);
  assert.equal(previewCall[0], '/api/warehouse/external-po/preview');
  assert.deepEqual([...previewCall[1].body.keys()], ['file']);
  assert.equal(confirmCall[0], '/api/warehouse/external-po/confirm');
  assert.deepEqual([...confirmCall[1].body.keys()], ['file', 'revision', 'parts', 'reviewed']);
  assert.equal(confirmCall[1].body.get('reviewed'), 'true');
  assert.deepEqual(JSON.parse(confirmCall[1].body.get('parts')), [{ lineNumber: 'a', expectedParts: 3 }]);
});
(async () => {
  for (const { name, run } of tests) { await run(); process.stdout.write(`PASS ${name}\n`); }
  process.stdout.write(`${tests.length} external PO frontend checks passed.\n`);
})().catch(error => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
