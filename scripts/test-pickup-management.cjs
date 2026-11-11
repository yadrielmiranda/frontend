/* Pickup administration: synthetic API responses, no database writes. */
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/app/technician/pickup-management.tsx'), 'utf8'), {
  fileName: 'pickup-management.tsx', compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const fixture = () => ({ id: 7, status: 'ACTIVE', canEditOrders: true, canDelete: true, orders: [
  { key: 'order:2', source: 'ORDER', poNumber: '293300', pieces: 2, expectedParts: 3 },
  { key: 'external:4', source: 'EXTERNAL', poNumber: '293300', pieces: 1, expectedParts: 1 },
] });
const flush = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function harness(overrides = {}) {
  let si = 0, ri = 0, ei = 0;
  const states = [], refs = [], effects = [], queue = [], calls = [], open = [], changed = [], deleted = [];
  const hooks = { ...React,
    useState(initial) { const i = si++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef(initial) { return refs[ri++] ??= { current: initial }; },
    useEffect(callback, deps) { const i = ei++, old = effects[i]; if (!old || deps.some((v, j) => !Object.is(v, old.deps[j]))) { effects[i] = { deps }; queue.push(() => { old?.cleanup?.(); effects[i].cleanup = callback(); }); } },
  };
  const props = { run: fixture(), disabled: false, onOpenChange: value => open.push(value),
    onChanged: run => { changed.push(run); props.run = run; }, onDeleted: () => deleted.push(true), ...overrides.props };
  const api = {
    warehouseAddPickupPos: async (...args) => { calls.push(['add', ...args]); return { ...props.run, orders: [...props.run.orders, { key: 'order:9', poNumber: args[1][0], pieces: 1, expectedParts: 1 }] }; },
    warehouseRemovePickupPo: async (...args) => { calls.push(['remove', ...args]); return { ...props.run, orders: props.run.orders.filter(order => order.key !== args[1]) }; },
    warehouseDeletePickup: async (...args) => { calls.push(['delete', ...args]); return { id: 7, deleted: true }; },
    warehousePickup: async (...args) => { calls.push(['read', ...args]); return props.run; }, ...overrides.api,
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(id => {
    if (id === 'react') return hooks;
    if (id === 'react/jsx-runtime') return require(id);
    if (id === 'lucide-react' || id.startsWith('@/components/ui/')) return new Proxy({}, { get: (_, key) => key });
    if (id === '@/app/api/warehouse.api') return api;
    if (id === '@/app/warehouse/unit-origin') return { UnitOrigin: 'UnitOrigin' };
    if (id === '@/app/warehouse/warehouse-shared') return { errorMessage: error => error.message };
    throw Error(`Unexpected dependency ${id}`);
  }, module, module.exports);
  return { props, calls, open, changed, deleted,
    render() { si = ri = ei = 0; const tree = module.exports.PickupManagement(props); while (queue.length) queue.shift()(); return tree; },
    async settle() { for (let i = 0; i < 4; i++) { this.render(); await flush(); } },
    dispose() { effects.forEach(effect => effect.cleanup?.()); },
  };
}
function nodes(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap(value => nodes(value, predicate));
  if (!React.isValidElement(tree)) return [];
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props.children, predicate)];
}
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value) : Array.isArray(value) ? value.map(text).join('') : value?.props ? text(value.props.children) : '';
const buttons = (h, name) => nodes(h.render(), node => node.type === 'Button' && text(node) === name);
const button = (h, name) => buttons(h, name).at(-1);
const click = (h, name) => { const b = button(h, name); assert(b && !b.props.disabled, `${name} must be available`); b.props.onClick(); };
const dialog = h => nodes(h.render(), node => node.type === 'Dialog')[0];
const enterPo = (h, value) => nodes(h.render(), node => node.type === 'Input')[0].props.onChange({ target: { value } });
const submit = h => nodes(h.render(), node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });

test('capabilities distinguish closed empty pickups and historically used pickups', () => {
  const h = harness({ props: { run: { ...fixture(), status: 'PARTIAL', canEditOrders: false } } });
  assert.equal(button(h, 'Edit POs'), undefined); assert(button(h, 'Delete pickup'));
  h.props.run.canDelete = false;
  assert.equal(button(h, 'Delete pickup'), undefined); assert.deepEqual(h.calls, []); h.dispose();
});

test('adding a PO keeps navigation locked, prevents duplicate dispatch and applies the returned summary', async () => {
  const waiting = deferred(), calls = [];
  const h = harness({ api: { warehouseAddPickupPos: (...args) => { calls.push(args); return waiting.promise; } } });
  click(h, 'Edit POs'); assert.equal(h.open.at(-1), true);
  enterPo(h, ' 294999 '); submit(h); submit(h); await flush();
  assert.deepEqual(calls, [[7, ['294999']]]);
  dialog(h).props.onOpenChange(false); assert.equal(dialog(h).props.open, true);
  assert.equal(button(h, 'Done').props.disabled, true);
  const next = { ...fixture(), orders: [...fixture().orders, { key: 'external:99', poNumber: '294999' }] };
  waiting.resolve(next); await h.settle();
  assert.equal(h.changed[0], next); assert.equal(nodes(h.render(), n => n.type === 'Input')[0].props.value, '');
  click(h, 'Done'); assert.equal(h.open.at(-1), false); h.dispose();
});

test('removal targets the exact internal/external key and keeps the final PO', async () => {
  const h = harness(); click(h, 'Edit POs');
  const removes = buttons(h, 'Remove'); assert.equal(removes.length, 2);
  removes[1].props.onClick(); await h.settle();
  assert.deepEqual(h.calls, [['remove', 7, 'external:4']]);
  assert.equal(h.props.run.orders[0].key, 'order:2'); assert.equal(button(h, 'Remove').props.disabled, true); h.dispose();
});

test('a concurrent scan rejection refreshes capabilities and disables further edits/deletion', async () => {
  const h = harness({ api: {
    warehouseAddPickupPos: async () => { throw Error('This pickup already has movements.'); },
    warehousePickup: async () => ({ ...fixture(), canEditOrders: false, canDelete: false }),
  } });
  click(h, 'Edit POs'); enterPo(h, '294999'); submit(h); await h.settle();
  assert.match(text(h.render()), /already has movements/);
  assert.equal(button(h, 'Add PO').props.disabled, true);
  assert(buttons(h, 'Remove').every(b => b.props.disabled));
  assert.equal(button(h, 'Delete pickup'), undefined); h.dispose();
});

test('delete requires explicit confirmation, cancellation is read-only and double clicks delete once', async () => {
  const waiting = deferred(), deletes = [];
  const h = harness({ api: { warehouseDeletePickup: id => { deletes.push(id); return waiting.promise; } } });
  click(h, 'Delete pickup'); assert.equal(dialog(h).props.open, true); assert.deepEqual(deletes, []);
  click(h, 'Cancel'); assert.equal(dialog(h).props.open, false); assert.deepEqual(deletes, []);
  click(h, 'Delete pickup'); const confirm = button(h, 'Delete pickup'); confirm.props.onClick(); confirm.props.onClick();
  assert.deepEqual(deletes, [7]); assert.deepEqual(h.deleted, []);
  waiting.resolve({ id: 7, deleted: true }); await h.settle();
  assert.deepEqual(h.deleted, [true]); assert.equal(h.open.at(-1), false); h.dispose();
});

test('offline or pending scans cannot dispatch management operations', async () => {
  const h = harness(); click(h, 'Edit POs'); enterPo(h, '294999');
  h.props.disabled = true; submit(h); await h.settle();
  assert.deepEqual(h.calls, []); assert.equal(button(h, 'Add PO').props.disabled, true); h.dispose();
});
