// Offline checks of the real presentation component, action hook and API wrapper.
// Run: node --test scripts/test-material-presentation-delete.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const test = require('node:test');
const ts = require('typescript');

const root = path.resolve(__dirname, '../src');
const jsx = (type, props) => ({ type, props });
const ui = new Proxy({}, { get: (_, key) => key });
const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object'
  ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
const all = (node, match) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(child => all(child, match)) : node.type === 'AlertDialog' && !node.props.open
    ? [] : [...(match(node) ? [node] : []), ...all(node.props?.children, match)];
const button = (tree, label) => all(tree, node => ['Button', 'AlertDialogCancel'].includes(node.type) && text(node) === label)[0];
const deleteButton = (tree, name = 'Prueba') => all(tree, node => node.type === 'Button' && node.props['aria-label'] === `Delete ${name}`)[0];
const dialog = tree => all(tree, node => node.type === 'AlertDialog')[0];
const errors = tree => all(tree, node => node.type === 'MaterialNotice').map(node => node.props.error).filter(Boolean).join(' ');
const unit = { id: 1, name: 'Box', isActive: true };
const base = { id: 1, productId: 3, unitId: 1, unit, name: 'Box', multiplier: 1, barcode: null, isBase: true, isPurchase: true, isSaleEnabled: false, isActive: true, salePrice: null, version: 0 };
const extra = { ...base, id: 2, name: 'Prueba', multiplier: 22, isBase: false, isPurchase: false, version: 4 };
const makeProduct = () => ({ id: 3, code: 'MAT-000003', name: 'Contractor Clean-Up Bags — 42 Gallon, 3 Mil, 50 Count', baseUnit: unit, presentations: [base, extra], inventoryByStore: [] });

function fixture({ admin = true, product = makeProduct(), api, refresh } = {}) {
  const states = [], refs = [], modules = new Map(), calls = [];
  let stateIndex = 0, refIndex = 0, refreshed = 0;
  const hooks = {
    useState(initial) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useRef(initial) { const index = refIndex++; return refs[index] ??= { current: initial }; },
  };
  function load(relative) {
    if (modules.has(relative)) return modules.get(relative);
    const filename = path.resolve(root, relative);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const exports = {};
    new Function('require', 'exports', compiled)(name => {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'lucide-react' || name.startsWith('@/components/ui/')) return ui;
      if (name === '@/app/api/warehouse.api') return { warehouseRequestKey: randomUUID };
      if (name === './material-labels') return { MaterialLabels: 'MaterialLabels' };
      if (name === '@/lib/material-image-upload') return {};
      if (name === './_base') return { apiFetch: async (url, options) => {
        calls.push({ url, ...options });
        return api ? api(url, options) : { id: 2, productId: 3, replayed: false };
      } };
      if (name === '@/app/api/materials.api') return load('app/api/materials.api.ts');
      if (name === './materials-shared') return { ...load('app/warehouse/materials/materials-shared.tsx'), MaterialField: 'MaterialField', MaterialNotice: 'MaterialNotice', MaterialSubmit: 'MaterialSubmit' };
      throw new Error(`Unexpected dependency: ${name}`);
    }, exports);
    modules.set(relative, exports);
    return exports;
  }
  const component = load('app/warehouse/materials/material-presentations.tsx').MaterialPresentations;
  const props = { product, units: [unit], admin, onSaved: async () => { refreshed++; await refresh?.(); } };
  const render = () => { stateIndex = 0; refIndex = 0; return component(props); };
  return {
    calls, props, render, get refreshed() { return refreshed; },
    open() { deleteButton(render()).props.onClick(); return render(); },
    confirm() { return button(render(), 'Delete presentation').props.onClick(); },
  };
}

test('Only administrators see deletion, and the base presentation is protected', () => {
  const staff = fixture({ admin: false });
  assert.equal(deleteButton(staff.render()), undefined);
  assert.equal(button(staff.render(), 'Edit'), undefined);
  const admin = fixture();
  assert.equal(deleteButton(admin.render(), 'Box'), undefined);
  assert.ok(deleteButton(admin.render()));
});

test('Opening confirmation shows the presentation, product and actual contents without sending a request', () => {
  const h = fixture(), tree = h.open();
  assert.match(text(dialog(tree)), /Prueba/);
  assert.match(text(dialog(tree)), /Contractor Clean-Up Bags/);
  assert.match(text(dialog(tree)), /Contents: 22 box/);
  assert.match(text(dialog(tree)), /no inventory, movements or sales/);
  assert.match(text(dialog(tree)), /cannot be undone/);
  assert.equal(h.calls.length, 0);
});

test('Cancellation closes the confirmation without modifying the presentation', () => {
  const h = fixture(), tree = h.open();
  assert.equal(button(tree, 'Cancel').type, 'AlertDialogCancel');
  dialog(tree).props.onOpenChange(false);
  assert.equal(dialog(h.render()), undefined);
  assert.ok(deleteButton(h.render()));
  assert.equal(h.calls.length, 0);
});

test('Successful confirmation sends the DELETE key and version, refreshes and removes only that row', async () => {
  const h = fixture(); h.open(); await h.confirm();
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].url, '/api/materials/presentations/2');
  assert.equal(h.calls[0].method, 'DELETE');
  assert.deepEqual(Object.keys(h.calls[0].body).sort(), ['requestKey', 'version']);
  assert.equal(h.calls[0].body.version, 4);
  assert.match(h.calls[0].body.requestKey, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(h.refreshed, 1);
  assert.equal(dialog(h.render()), undefined);
  assert.equal(deleteButton(h.render()), undefined);
  assert.match(text(h.render()), /Base unit/);
  assert.ok(all(h.render(), node => node.type === 'MaterialNotice' && node.props.success === 'Presentation deleted.').length);
});

test('Repeated clicks and closing the dialog while deletion is pending cannot send another mutation', async () => {
  let finish;
  const h = fixture({ api: () => new Promise(resolve => { finish = resolve; }) });
  const tree = h.open(), confirm = button(tree, 'Delete presentation').props.onClick;
  const pending = confirm(); await confirm();
  assert.equal(h.calls.length, 1);
  dialog(tree).props.onOpenChange(false);
  const busy = h.render();
  assert.ok(dialog(busy));
  assert.equal(button(busy, 'Deleting…').props.disabled, true);
  assert.equal(button(busy, 'Cancel').props.disabled, true);
  finish({ id: 2, productId: 3, replayed: false }); await pending;
  await confirm();
  assert.equal(h.calls.length, 1);
});

test('A server conflict keeps the modal and presentation visible, with the reason', async () => {
  const h = fixture({ api: async () => { throw new Error('This presentation has movements and cannot be deleted.'); } });
  h.open(); await h.confirm();
  assert.ok(dialog(h.render()));
  assert.ok(deleteButton(h.render()));
  assert.match(errors(h.render()), /has movements/);
  assert.equal(h.refreshed, 0);
  assert.equal(button(h.render(), 'Cancel').props.disabled, false);
});

test('An unknown outcome retries the identical request key and accepts an idempotent replay', async () => {
  let attempts = 0;
  const h = fixture({ api: async () => { if (++attempts === 1) throw new Error('Connection lost'); return { id: 2, productId: 3, replayed: true }; } });
  h.open(); await h.confirm(); await h.confirm();
  assert.deepEqual(h.calls[0], h.calls[1]);
  assert.equal(h.refreshed, 1);
  assert.equal(dialog(h.render()), undefined);
});

test('A refresh failure after deletion reports success and retries only the read', async () => {
  let failRefresh = true;
  const h = fixture({ refresh: async () => { if (failRefresh) throw new Error('Refresh connection failed'); } });
  const first = h.open(); await h.confirm();
  const tree = h.render();
  assert.equal(dialog(tree), undefined);
  assert.equal(deleteButton(tree), undefined);
  assert.equal(errors(tree), '');
  assert.match(text(tree), /presentation was deleted/);
  await button(first, 'Delete presentation').props.onClick();
  assert.equal(h.calls.length, 1);
  failRefresh = false;
  await button(tree, 'Refresh presentations').props.onClick();
  assert.equal(h.refreshed, 2);
  assert.equal(h.calls.length, 1);
  assert.equal(button(h.render(), 'Refresh presentations'), undefined);
});

for (const quantities of [{ quantity: 3, reservedQuantity: 0 }, { quantity: 0, reservedQuantity: 1 }]) {
  test(`Stock protection checks every store: ${JSON.stringify(quantities)}`, () => {
    const product = makeProduct();
    product.inventoryByStore = [{ presentations: [] }, { presentations: [{ id: 2, ...quantities }] }];
    const h = fixture({ product }), tree = h.render(), remove = deleteButton(tree);
    assert.equal(remove.props.disabled, true);
    const reason = all(tree, node => node.props?.id === remove.props['aria-describedby'])[0];
    assert.match(text(reason), /stock or reservations/);
    remove.props.onClick();
    assert.equal(dialog(h.render()), undefined);
    assert.equal(h.calls.length, 0);
  });
}

test('Stock that appears after opening confirmation blocks deletion', async () => {
  const h = fixture(); h.open();
  h.props.product = { ...h.props.product, inventoryByStore: [{ presentations: [{ id: 2, quantity: 1, reservedQuantity: 0 }] }] };
  assert.equal(button(h.render(), 'Delete presentation').props.disabled, true);
  await h.confirm();
  assert.equal(h.calls.length, 0);
  assert.match(errors(h.render()), /now has stock/);
});

test('An inactive unused presentation with zero inventory rows can still be removed', async () => {
  const product = makeProduct();
  product.presentations = [base, { ...extra, isActive: false }];
  product.inventoryByStore = [{ presentations: [{ id: 2, quantity: 0, reservedQuantity: 0 }] }];
  const h = fixture({ product }); h.open(); await h.confirm();
  assert.equal(h.calls.length, 1);
});

test('Losing the administrator role hides an open confirmation', () => {
  const h = fixture(); h.open(); h.props.admin = false;
  assert.equal(dialog(h.render()), undefined);
  assert.equal(deleteButton(h.render()), undefined);
});

test('Existing editing, generated barcode and print-label actions remain available', () => {
  const product = makeProduct();
  product.presentations.push({ ...extra, id: 3, name: 'Case', barcode: 'MAT-CASE' });
  const h = fixture({ product });
  assert.equal(all(h.render(), node => node.type === 'Button' && text(node) === 'Edit').length, 3);
  assert.equal(all(h.render(), node => node.type === 'Button' && text(node) === 'Generate barcode').length, 2);
  button(h.render(), 'Print labels').props.onClick();
  assert.equal(all(h.render(), node => node.type === 'MaterialLabels')[0].props.presentation.id, 3);
  button(h.render(), 'Edit').props.onClick();
  assert.match(text(h.render()), /Edit presentation/);
});
