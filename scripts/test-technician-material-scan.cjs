/* Technician scan-to-withdraw interactions. All API calls are mocked; no stock is changed. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '../src');
const file = 'app/warehouse/stores/store-material-internal-use-client.tsx';
const tests = [], test = (name, run) => tests.push({ name, run });
const storage = new Map(), listeners = new Map();
let requestNumber = 0;
global.sessionStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key),
};
global.window = {
  addEventListener(name, fn) { const group = listeners.get(name) ?? new Set(); group.add(fn); listeners.set(name, group); },
  removeEventListener(name, fn) { listeners.get(name)?.delete(fn); },
};
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });

const technician = { id: 20, firstName: 'Alex', lastName: 'Tech', username: 'alex', role: { name: 'technician' } };
const presentation = (id, name, barcode, availableQuantity, multiplier = 1) => ({
  id, name, barcode, multiplier, isBase: multiplier === 1, isActive: true,
  quantity: availableQuantity, reservedQuantity: 0, availableQuantity,
});
const product = (id, name, availableBaseQuantity, presentations, overrides = {}) => ({
  id, code: `MAT-${id}`, name, imageUrl: null, isActive: true, version: 1,
  baseUnit: { id: 1, name: 'Tube' }, totalBaseQuantity: availableBaseQuantity,
  reservedBaseQuantity: 0, availableBaseQuantity, presentations, ...overrides,
});
const inventory = {
  store: { id: 1, name: 'Main store', isActive: true },
  products: [
    product(1, 'White caulking', 24, [
      { ...presentation(1, 'Tube', '001234567890', 24), quantity: 0 },
      { ...presentation(2, 'Box of 12', 'BOX-12', 2, 12), quantity: 3, reservedQuantity: 1 },
    ], { totalBaseQuantity: 36, reservedBaseQuantity: 12 }),
    product(2, 'Builder paper', 5, [presentation(3, 'Roll', 'PAPER', 5)], { baseUnit: { id: 2, name: 'Roll' } }),
    product(3, 'Unavailable sealant', 0, [presentation(4, 'Tube', 'OUT', 0)]),
    product(4, 'Inactive sealant', 5, [presentation(5, 'Tube', 'INACTIVE', 5)], { isActive: false }),
    product(5, 'Package-only sealant', 12, [presentation(6, 'Tube', 'RESTRICTED-TUBE', 12), presentation(7, 'Box of 12', 'RESTRICTED-BOX', 1, 12)], { allowBaseUnitOperations: false }),
    product(6, 'Old package', 5, [{ ...presentation(8, 'Tube', 'INACTIVE-PACKAGE', 5), isActive: false }]),
  ],
};
const result = { storeId: 1, storeName: 'Main store', recipient: 'Alex Tech', note: 'Installation', productCount: 1, lineCount: 1, movementIds: [1], issuedAt: '2026-10-28T12:00:00Z', replayed: false };

function loader(hooks, api, auth) {
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const module = { exports: {} };
    function resolve(id) {
      if (id === 'react') return { ...React, ...hooks };
      if (id === 'react/jsx-runtime') return require(id);
      if (id === 'next/link') return { __esModule: true, default: 'a' };
      if (id === 'lucide-react' || id.startsWith('@/components/ui/')) return new Proxy({}, { get: (_, name) => name });
      if (id === '@/contexts/AuthContext') return { useAuth: () => auth };
      if (id === '@/components/material-product-image') return { MaterialProductImage: 'MaterialProductImage' };
      if (id === '@/app/api/materials.api' || id === '@/app/api/technician-warehouse.api') return api;
      if (id === '@/app/api/warehouse.api') return { warehouseRequestKey: () => `scan-withdrawal-${++requestNumber}` };
      if (id === '@/app/api/_base') return { isApiError: error => Number.isInteger(error?.status) };
      if (id === '../materials/materials-shared') return {
        MaterialScan: 'MaterialScan', MaterialField: 'MaterialField', MaterialNotice: 'MaterialNotice',
        errorText: error => error instanceof Error ? error.message : 'Unable to complete action', quantity: String,
      };
      const base = id.startsWith('@/') ? path.resolve(root, id.slice(2)) : id.startsWith('.') ? path.resolve(path.dirname(filename), id) : null;
      if (!base) return require(id);
      const found = ['.ts', '.tsx'].map(ext => base + ext).find(candidate => fs.existsSync(candidate));
      if (!found) throw new Error(`Unresolved ${id}`);
      return load(path.relative(root, found));
    }
    new Function('require', 'module', 'exports', compiled)(resolve, module, module.exports);
    cache.set(filename, module.exports); return module.exports;
  }
  return load;
}

function harness(options = {}) {
  const states = [], refs = [], effects = [];
  let si = 0, ri = 0, ei = 0, changed = false;
  const calls = [];
  const auth = options.auth ?? { user: technician, revalidate: async () => auth.user };
  const initial = structuredClone(options.inventory ?? inventory);
  const api = {
    technicianWithdrawMaterials: async (...args) => { calls.push(structuredClone(args)); return result; },
    technicianMaterialInventory: async () => initial,
    useMaterialStoreInternally: async () => { throw Error('Staff endpoint must not be used by technicians'); },
    ...options.api,
  };
  const hooks = {
    useState(initialValue) {
      const i = si++; if (!(i in states)) states[i] = typeof initialValue === 'function' ? initialValue() : initialValue;
      return [states[i], value => { const next = typeof value === 'function' ? value(states[i]) : value; changed ||= !Object.is(next, states[i]); states[i] = next; }];
    },
    useRef(initialValue) { const i = ri++; return refs[i] ??= { current: initialValue }; },
    useEffect(callback, dependencies) {
      const i = ei++, previous = effects[i];
      if (!previous || !dependencies || dependencies.some((value, index) => !Object.is(value, previous.dependencies?.[index])))
        effects[i] = { dependencies, callback, cleanup: previous?.cleanup, pending: true };
    },
  };
  const component = loader(hooks, api, auth)(file).StoreMaterialInternalUseClient;
  const props = { initial, initialIdentity: { id: technician.id, role: 'technician' }, technician: true };
  return {
    auth, calls,
    render() {
      let tree;
      for (let pass = 0; pass < 10; pass++) {
        changed = false; si = 0; ri = 0; ei = 0; tree = component(props);
        for (const effect of effects) if (effect.pending) { effect.pending = false; effect.cleanup?.(); effect.cleanup = effect.callback(); }
        if (!changed) return tree;
      }
      throw Error('Rendering did not settle');
    },
    dispose() { for (const effect of effects) effect.cleanup?.(); },
  };
}

function nodes(element, predicate, found = []) {
  if (Array.isArray(element)) { element.forEach(child => nodes(child, predicate, found)); return found; }
  if (!element || typeof element !== 'object') return found;
  if (element.type === 'Dialog' && !element.props.open) return found;
  if (predicate(element)) found.push(element);
  nodes(element.props?.children, predicate, found); return found;
}
const text = element => typeof element === 'string' || typeof element === 'number' ? String(element) : Array.isArray(element) ? element.map(text).join('') : element?.type === 'Dialog' && !element.props.open ? '' : element?.props ? text(element.props.children) : '';
const byLabel = (tree, label) => nodes(tree, node => node.props?.['aria-label'] === label)[0];
const namedButton = (tree, label) => nodes(tree, node => node.props?.onClick && (node.props['aria-label'] === label || text(node) === label))[0];
const scanNode = tree => nodes(tree, node => node.type === 'MaterialScan')[0];
const field = (h, productName, presentationName) => byLabel(h.render(), `Withdraw ${productName} · ${presentationName}`);
function click(h, label) { const element = namedButton(h.render(), label); assert.ok(element, `Missing button ${label}`); assert.ok(!element.props.disabled, `Button disabled ${label}`); return element.props.onClick(); }
function clickLabel(h, label) { const element = byLabel(h.render(), label); assert.ok(element, `Missing control ${label}`); assert.ok(!element.props.disabled, `Control disabled ${label}`); return element.props.onClick(); }
function edit(h, productName, presentationName) {
  const row = byLabel(h.render(), `Edit ${productName} · ${presentationName}`);
  assert.ok(row, 'Missing selected material row');
  if (!row.props['aria-expanded']) clickLabel(h, `Edit ${productName} · ${presentationName}`);
  return field(h, productName, presentationName);
}
const editors = h => nodes(h.render(), node => String(node.props?.['aria-label']).startsWith('Withdraw '));
const selectedRows = h => nodes(h.render(), node => String(node.props?.['aria-label']).startsWith('Edit '));
async function scan(h, code) { const node = scanNode(h.render()); assert.ok(node, 'Missing scanner'); assert.ok(!node.props.disabled, 'Scanner is disabled'); await node.props.onScan(code); h.render(); }
function setQuantity(h, productName, presentationName, value) { const input = field(h, productName, presentationName); assert.ok(input, 'Missing selected quantity input'); assert.ok(!input.props.disabled, 'Quantity is disabled'); input.props.onChange({ target: { value } }); h.render(); }
const tick = () => new Promise(resolve => setImmediate(resolve));

test('a box scan selects one exact box presentation without showing or selecting loose tubes', async () => {
  const h = harness(); assert.equal(field(h, 'White caulking', 'Tube'), undefined);
  await scan(h, 'BOX-12');
  assert.equal(field(h, 'White caulking', 'Box of 12').props.value, '1');
  assert.equal(field(h, 'White caulking', 'Tube'), undefined);
  assert.equal(field(h, 'Builder paper', 'Roll'), undefined);
  assert.equal(h.calls.length, 0); assert.equal(storage.size, 0);
  h.dispose();
});

test('a tube scan preserves leading zeroes and selects only that tube', async () => {
  const h = harness(); await scan(h, '001234567890');
  assert.equal(field(h, 'White caulking', 'Tube').props.value, '1');
  assert.equal(field(h, 'White caulking', 'Box of 12'), undefined);
  await assert.rejects(scan(h, '1234567890'), /not found/);
  assert.equal(field(h, 'White caulking', 'Tube').props.value, '1'); assert.equal(h.calls.length, 0);
  h.dispose();
});

test('scanning another material keeps prior quantities and re-scanning preserves quantity', async () => {
  const h = harness(); await scan(h, 'BOX-12');
  clickLabel(h, 'Increase White caulking · Box of 12');
  assert.equal(field(h, 'White caulking', 'Box of 12').props.value, '2');
  await scan(h, 'PAPER'); await scan(h, 'BOX-12');
  assert.equal(field(h, 'White caulking', 'Box of 12').props.value, '2');
  assert.equal(field(h, 'Builder paper', 'Roll'), undefined);
  assert.equal(nodes(h.render(), node => node.props?.['aria-label'] === 'Withdraw White caulking · Box of 12').length, 1);
  assert.equal(edit(h, 'Builder paper', 'Roll').props.value, '1');
  assert.equal(editors(h).length, 1);
  assert.equal(h.calls.length, 0); h.dispose();
});

test('back-to-back scanner events keep both materials without doubling the same barcode', async () => {
  const h = harness(), onScan = scanNode(h.render()).props.onScan;
  await Promise.all([onScan('BOX-12'), onScan('PAPER'), onScan('BOX-12')]);
  assert.equal(field(h, 'White caulking', 'Box of 12').props.value, '1');
  assert.equal(field(h, 'Builder paper', 'Roll'), undefined);
  assert.equal(edit(h, 'Builder paper', 'Roll').props.value, '1');
  assert.equal(selectedRows(h).length, 2);
  assert.equal(h.calls.length, 0); h.dispose();
});

test('unknown, unavailable, inactive and restricted scans leave the selection untouched', async () => {
  const h = harness(); await scan(h, 'PAPER');
  for (const [barcode, message] of [['missing', /not found/], ['OUT', /available/], ['INACTIVE', /inactive/], ['INACTIVE-PACKAGE', /inactive/], ['RESTRICTED-TUBE', /full packages/]])
    await assert.rejects(scan(h, barcode), message);
  assert.equal(field(h, 'Builder paper', 'Roll').props.value, '1');
  assert.equal(nodes(h.render(), node => String(node.props?.['aria-label']).startsWith('Withdraw ')).length, 1);
  assert.equal(h.calls.length, 0); h.dispose();
});

test('quantity controls respect reserved stock, minimum one, and explicit removal', async () => {
  const h = harness(); await scan(h, 'BOX-12');
  assert.equal(byLabel(h.render(), 'Decrease White caulking · Box of 12').props.disabled, true);
  assert.equal(field(h, 'White caulking', 'Box of 12').props.max, 2);
  clickLabel(h, 'Increase White caulking · Box of 12');
  assert.equal(byLabel(h.render(), 'Increase White caulking · Box of 12').props.disabled, true);
  clickLabel(h, 'Decrease White caulking · Box of 12');
  assert.equal(field(h, 'White caulking', 'Box of 12').props.value, '1');
  clickLabel(h, 'Remove White caulking · Box of 12');
  assert.equal(field(h, 'White caulking', 'Box of 12'), undefined);
  assert.equal(namedButton(h.render(), 'Review withdrawal').props.disabled, true);
  assert.equal(h.calls.length, 0); h.dispose();
});

test('boxes and tubes share availability while preserving both explicit selections', async () => {
  const h = harness(); await scan(h, 'BOX-12'); await scan(h, '001234567890');
  assert.equal(field(h, 'White caulking', 'Tube').props.max, 12);
  setQuantity(h, 'White caulking', 'Tube', '12');
  assert.equal(edit(h, 'White caulking', 'Box of 12').props.max, 1);
  assert.equal(byLabel(h.render(), 'Increase White caulking · Box of 12').props.disabled, true);
  edit(h, 'White caulking', 'Tube');
  assert.equal(byLabel(h.render(), 'Increase White caulking · Tube').props.disabled, true);
  assert.equal(namedButton(h.render(), 'Review withdrawal').props.disabled, false);
  assert.equal(h.calls.length, 0); h.dispose();
});

test('a new box is rejected if selected loose tubes leave less than one complete box', async () => {
  const h = harness(); await scan(h, '001234567890'); setQuantity(h, 'White caulking', 'Tube', '13');
  await assert.rejects(scan(h, 'BOX-12'), /available|selection|selected/i);
  assert.equal(field(h, 'White caulking', 'Box of 12'), undefined);
  assert.equal(field(h, 'White caulking', 'Tube').props.value, '13');
  assert.equal(h.calls.length, 0); h.dispose();
});

test('typed quantities cannot exceed stock and a cleared quantity blocks review until corrected', async () => {
  const h = harness(); await scan(h, 'BOX-12'); await scan(h, 'PAPER');
  edit(h, 'White caulking', 'Box of 12');
  setQuantity(h, 'White caulking', 'Box of 12', '20');
  assert.equal(field(h, 'White caulking', 'Box of 12').props.value, '2');
  assert.ok(nodes(h.render(), node => node.props?.error?.includes('Only 2 Box of 12')).length);
  setQuantity(h, 'White caulking', 'Box of 12', '');
  assert.equal(field(h, 'White caulking', 'Box of 12').props.value, '');
  assert.equal(namedButton(h.render(), 'Review withdrawal').props.disabled, true);
  assert.equal(edit(h, 'Builder paper', 'Roll').props.value, '1');
  assert.match(text(byLabel(h.render(), 'Edit White caulking · Box of 12')), /Check quantity/i);
  assert.equal(namedButton(h.render(), 'Review withdrawal').props.disabled, true);
  edit(h, 'White caulking', 'Box of 12');
  setQuantity(h, 'White caulking', 'Box of 12', '1.5');
  assert.equal(namedButton(h.render(), 'Review withdrawal').props.disabled, true);
  setQuantity(h, 'White caulking', 'Box of 12', '1');
  assert.equal(namedButton(h.render(), 'Review withdrawal').props.disabled, false);
  assert.equal(h.calls.length, 0); h.dispose();
});

test('manual selection remains available without scanning and adds only the chosen presentation', () => {
  const h = harness(); click(h, 'Choose without scanning');
  clickLabel(h, 'Add White caulking · Box of 12');
  assert.equal(field(h, 'White caulking', 'Box of 12').props.value, '1');
  assert.equal(field(h, 'White caulking', 'Tube'), undefined);
  assert.equal(h.calls.length, 0); h.dispose();
});

test('review blocks new scans and confirmation submits exact selected IDs and quantities once', async () => {
  const h = harness(); await scan(h, 'BOX-12'); clickLabel(h, 'Increase White caulking · Box of 12'); await scan(h, 'PAPER');
  const scanner = scanNode(h.render()).props.onScan;
  click(h, 'Review withdrawal'); assert.equal(scanNode(h.render()).props.disabled, true);
  await assert.rejects(scanner('001234567890'), /current action|Finish|close/);
  assert.equal(h.calls.length, 0); assert.match(text(h.render()), /2 × Box of 12/);
  const confirm = namedButton(h.render(), 'Confirm withdrawal').props.onClick;
  confirm(); confirm(); await tick();
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0][0], 1);
  assert.deepEqual(h.calls[0][1].lines, [{ productId: 1, presentationId: 2, quantity: 2 }, { productId: 2, presentationId: 3, quantity: 1 }]);
  assert.equal(storage.size, 0); h.dispose();
});

test('offline and changed-account states block scanning with previously captured handlers', async () => {
  const h = harness(); const scanner = scanNode(h.render()).props.onScan;
  navigator.onLine = false; for (const listener of listeners.get('offline') ?? []) listener();
  assert.equal(scanNode(h.render()).props.disabled, true);
  await assert.rejects(scanner('BOX-12'), /current action|Finish|close/);
  navigator.onLine = true; for (const listener of listeners.get('online') ?? []) listener(); h.render();
  h.auth.user = { ...technician, id: 99 }; assert.match(text(h.render()), /Verify your account/);
  await assert.rejects(scanner('BOX-12'), /current action|Finish|close/);
  assert.equal(h.calls.length, 0); h.dispose();
});

test('unknown confirmation outcome locks scans and retries the same selection and request key', async () => {
  const writes = []; const h = harness({ api: { technicianWithdrawMaterials: async (...args) => {
    writes.push(structuredClone(args)); if (writes.length === 1) throw Error('Network unavailable'); return result;
  } } });
  await scan(h, 'BOX-12'); const scanner = scanNode(h.render()).props.onScan;
  click(h, 'Review withdrawal'); click(h, 'Confirm withdrawal'); await tick();
  assert.equal(scanNode(h.render()).props.disabled, true);
  assert.equal(field(h, 'White caulking', 'Box of 12').props.disabled, true);
  await assert.rejects(scanner('PAPER'), /current action|Finish|close/);
  click(h, 'Retry same withdrawal'); await tick();
  assert.equal(writes.length, 2); assert.deepEqual(writes[0], writes[1]); assert.equal(storage.size, 0); h.dispose();
});

test('stock conflict remains editable and does not silently change the selected presentation', async () => {
  const h = harness({ api: { technicianWithdrawMaterials: async () => { throw Object.assign(Error('Not enough available stock'), { status: 409 }); } } });
  await scan(h, 'BOX-12'); click(h, 'Review withdrawal'); click(h, 'Confirm withdrawal'); await tick();
  assert.equal(field(h, 'White caulking', 'Box of 12').props.value, '1');
  assert.equal(field(h, 'White caulking', 'Box of 12').props.disabled, false);
  assert.equal(field(h, 'White caulking', 'Tube'), undefined);
  assert.equal(namedButton(h.render(), 'Retry same withdrawal'), undefined);
  assert.equal(storage.size, 0); h.dispose();
});

const tenMaterials = {
  store: inventory.store,
  products: Array.from({ length: 10 }, (_, index) => product(index + 10, `Material ${index + 1}`, 20,
    [presentation(index + 100, 'Unit', `TEN-${index + 1}`, 20)], { baseUnit: { id: 10, name: 'Unit' } })),
};

test('ten scanned materials keep one quantity editor and nine compact rows with a counted review action', async () => {
  const h = harness({ inventory: tenMaterials });
  for (let index = 1; index <= 10; index++) {
    await scan(h, `TEN-${index}`);
    assert.equal(editors(h).length, 1);
    assert.equal(field(h, `Material ${index}`, 'Unit').props.value, '1');
  }
  assert.equal(selectedRows(h).length, 10);
  assert.equal(selectedRows(h).filter(row => row.props['aria-expanded'] === false).length, 9);
  assert.equal(selectedRows(h).filter(row => row.props['aria-expanded'] === true).length, 1);
  const review = namedButton(h.render(), 'Review withdrawal');
  assert.equal(review.props.disabled, false);
  assert.match(text(review), /10 items/);
  assert.equal(h.calls.length, 0); assert.equal(storage.size, 0);
  h.dispose();
});

test('editing an older compact row and rescanning another preserves all ten exact confirmation lines', async () => {
  const h = harness({ inventory: tenMaterials });
  for (let index = 1; index <= 10; index++) await scan(h, `TEN-${index}`);
  assert.equal(edit(h, 'Material 1', 'Unit').props.value, '1');
  assert.equal(field(h, 'Material 10', 'Unit'), undefined);
  setQuantity(h, 'Material 1', 'Unit', '3');
  await scan(h, 'TEN-10');
  assert.equal(field(h, 'Material 10', 'Unit').props.value, '1');
  assert.equal(field(h, 'Material 1', 'Unit'), undefined);
  assert.match(text(byLabel(h.render(), 'Edit Material 1 · Unit')), /3/);
  assert.equal(selectedRows(h).length, 10); assert.equal(editors(h).length, 1);
  click(h, 'Review withdrawal');
  assert.equal(namedButton(h.render(), 'Review withdrawal'), undefined);
  assert.equal(h.calls.length, 0);
  click(h, 'Confirm withdrawal'); await tick();
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.calls[0][1].lines, tenMaterials.products.map((item, index) => ({
    productId: item.id, presentationId: item.presentations[0].id, quantity: index === 0 ? 3 : 1,
  })));
  assert.equal(selectedRows(h).length, 0);
  assert.equal(namedButton(h.render(), 'Review withdrawal').props.disabled, true);
  assert.match(text(namedButton(h.render(), 'Review withdrawal')), /0 items/);
  h.dispose();
});

test('removing the expanded material opens a remaining selection and keeps quantities and count accurate', async () => {
  const h = harness({ inventory: tenMaterials });
  await scan(h, 'TEN-1'); setQuantity(h, 'Material 1', 'Unit', '3');
  await scan(h, 'TEN-2'); setQuantity(h, 'Material 2', 'Unit', '2');
  await scan(h, 'TEN-3');
  clickLabel(h, 'Remove Material 3 · Unit');
  assert.equal(selectedRows(h).length, 2); assert.equal(editors(h).length, 1);
  assert.equal(byLabel(h.render(), 'Edit Material 3 · Unit'), undefined);
  assert.match(text(namedButton(h.render(), 'Review withdrawal')), /2 items/);
  assert.equal(edit(h, 'Material 1', 'Unit').props.value, '3');
  clickLabel(h, 'Remove Material 1 · Unit');
  assert.equal(field(h, 'Material 2', 'Unit').props.value, '2');
  assert.match(text(namedButton(h.render(), 'Review withdrawal')), /1 item/);
  clickLabel(h, 'Remove Material 2 · Unit');
  assert.equal(editors(h).length, 0); assert.equal(selectedRows(h).length, 0);
  assert.equal(namedButton(h.render(), 'Review withdrawal').props.disabled, true);
  assert.equal(h.calls.length, 0); h.dispose();
});

test('collapsed invalid quantities stay visible and keep the persistent review action disabled', async () => {
  const h = harness({ inventory: tenMaterials });
  await scan(h, 'TEN-1'); setQuantity(h, 'Material 1', 'Unit', '');
  await scan(h, 'TEN-2');
  const invalidRow = byLabel(h.render(), 'Edit Material 1 · Unit');
  assert.equal(invalidRow.props['aria-expanded'], false);
  assert.match(text(invalidRow), /Check quantity/i);
  assert.equal(field(h, 'Material 1', 'Unit'), undefined);
  assert.equal(namedButton(h.render(), 'Review withdrawal').props.disabled, true);
  assert.match(text(namedButton(h.render(), 'Review withdrawal')), /2 items/);
  edit(h, 'Material 1', 'Unit'); setQuantity(h, 'Material 1', 'Unit', '2');
  assert.equal(namedButton(h.render(), 'Review withdrawal').props.disabled, false);
  assert.equal(h.calls.length, 0); h.dispose();
});

(async () => {
  let failed = 0;
  for (const { name, run } of tests) {
    storage.clear(); listeners.clear(); navigator.onLine = true;
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { failed++; console.error(`FAIL ${name}\n${error.stack}`); }
  }
  console.log(`${tests.length - failed}/${tests.length} technician material scan checks passed.`);
  if (failed) process.exitCode = 1;
})();
