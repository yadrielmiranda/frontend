/* Offline catalog role and sale-creation regression checks. No servers or real requests. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '../src');
const tests = [];
const test = (name, run) => tests.push({ name, run });
const pass = ({ children }) => React.createElement('div', null, children);
const unit = { id: 1, name: 'Tube', isActive: true };
const product = { id: 1, name: 'Caulking', code: 'MAT-000001', baseUnit: unit, presentations: [{ id: 11, name: 'Tube', unit, multiplier: 1, salePrice: '5.00', availableQuantity: 40 }] };
const catalog = { products: [product], categories: [], brands: [], page: 1, pageSize: 24, total: 1, taxRate: '7' };
const stores = [{ id: 2, name: 'Main warehouse', isActive: true }, { id: 9, name: 'Closed warehouse', isActive: false }];
const actor = (role = 'admin', id = 7) => ({ id, username: 'staff', firstName: 'Staff', lastName: 'Member', email: 'staff@example.test', phone: '123', role: { name: role } });
const guest = { mode: 'unregistered', customer: null, customerName: '  Walk-in Customer  ', customerEmail: ' buyer@example.test ', customerPhone: ' 555-0100 ' };
const registered = { ...guest, mode: 'registered', customer: { id: 24, name: 'Registered Buyer', email: 'registered@example.test', phone: null } };
const sale = { id: 51, code: 'MS-51', status: 'DRAFT', publicUrl: '/public/material-sales/order-token', paymentStatus: 'UNPAID', balance: '5.35' };
const tick = () => new Promise(resolve => setImmediate(resolve));

function loader({ hooks, api = {}, auth, router, serverUser, storesApi } = {}) {
  const cache = new Map();
  function load(file) {
    const filename = path.resolve(root, file);
    if (cache.has(filename)) return cache.get(filename);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const module = { exports: {} };
    const customRequire = id => {
      if (id === 'react') return { ...React, ...hooks };
      if (id === 'react/jsx-runtime') return require(id);
      if (id === 'next/link') return { __esModule: true, default: pass };
      if (id === 'next/navigation') return { useRouter: () => router, redirect: url => { throw new Error(`redirect:${url}`); }, notFound: () => { throw new Error('notFound'); } };
      if (id === '@/contexts/AuthContext') return { useAuth: () => auth };
      if (id === '@/lib/session') return { getCurrentUser: async () => serverUser };
      if (id === '@/app/api/warehouse.api') return { warehouseRequestKey: () => require('node:crypto').randomUUID(), warehouseStores: storesApi };
      if (id === '@/components/material-product-image') return { MaterialProductImage: pass };
      if (id === 'lucide-react') return new Proxy({}, { get: () => () => null });
      if (id === '@/app/api/_base') return { isApiError: error => typeof error?.status === 'number' };
      if (id === '@/app/api/materials.api') return new Proxy(api, { get: (target, key) => target[key] || (async () => { throw new Error(`Unexpected API: ${String(key)}`); }) });
      if (id.startsWith('@/components/ui/')) return new Proxy({}, { get: () => pass });
      const base = id.startsWith('@/') ? path.resolve(root, id.slice(2)) : id.startsWith('.') ? path.resolve(path.dirname(filename), id) : null;
      if (!base) return require(id);
      const resolved = ['.ts', '.tsx'].map(ext => base + ext).find(file => fs.existsSync(file));
      if (!resolved) throw new Error(`Unresolved: ${id}`);
      return load(path.relative(root, resolved));
    };
    new Function('require', 'module', 'exports', compiled)(customRequire, module, module.exports);
    cache.set(filename, module.exports);
    return module.exports;
  }
  return load;
}

function harness({ role = 'admin', api = {}, props = {}, push, revalidate } = {}) {
  const states = [], refs = [], navigations = [];
  let stateIndex = 0, refIndex = 0;
  const auth = { user: actor(role), isAuthenticated: true, isLoading: false, error: null };
  auth.revalidate = revalidate ?? (async () => auth.user);
  const hooks = {
    useState(initial) { const index = stateIndex++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
    useRef(initial) { const index = refIndex++; if (!(index in refs)) refs[index] = { current: initial }; return refs[index]; },
    useEffect() {},
  };
  const load = loader({ hooks, api, auth, router: { push: push ?? (url => navigations.push(url)) } });
  const Component = load('app/materials/materials-catalog-client.tsx').MaterialsCatalogClient;
  const input = { initial: catalog, viewer: { id: 7, role }, stores, ...props };
  const render = () => { stateIndex = 0; refIndex = 0; return Component(input); };
  return { render, auth, load, navigations };
}
function nodes(element, predicate, result = []) {
  if (!element || typeof element !== 'object') return result;
  if (Array.isArray(element)) { element.forEach(child => nodes(child, predicate, result)); return result; }
  if (predicate(element)) result.push(element);
  nodes(element.props?.children, predicate, result);
  return result;
}
const text = element => typeof element === 'string' || typeof element === 'number' ? String(element) : Array.isArray(element) ? element.map(text).join('') : element?.props ? text(element.props.children) : '';
const click = (tree, label) => { const node = nodes(tree, e => e.props?.onClick && text(e) === label)[0]; assert.ok(node, `Missing button: ${label}`); node.props.onClick(); };
const field = (tree, label) => nodes(tree, e => e.props?.label === label)[0]?.props.children;
const buyerFields = tree => nodes(tree, e => e.type?.name === 'MaterialSaleCustomerFields')[0];
const form = tree => nodes(tree, e => e.type === 'form' && /^(Prepare materials sale|Place materials order)$/.test(e.props['aria-label']))[0];
const submit = tree => form(tree).props.onSubmit({ preventDefault() {} });
const error = tree => nodes(tree, e => e.type?.name === 'MaterialNotice').map(e => e.props.error || '').join(' ');
function prepare(h, buyer = guest) {
  click(h.render(), 'Add to sale');
  buyerFields(h.render()).props.onChange(buyer);
  return h.render();
}

for (const role of ['admin', 'operator']) test(`${role} sees a sale builder with an explicit buyer and no personal checkout`, () => {
  const h = harness({ role });
  const tree = h.render();
  assert.match(text(tree), /Customer sales/);
  assert.match(text(tree), /Add to sale/);
  assert.match(text(tree), /Create sale for review/);
  assert.match(text(tree), /saved as a draft/);
  assert.doesNotMatch(text(tree), /Ordering as|My material orders|30 minutes|Reserve and continue to payment/);
  assert.equal(nodes(tree, e => e.props?.href === '/warehouse/materials/sales').length, 1);
  assert.equal(nodes(tree, e => e.props?.href === '/materials/orders').length, 0);
  assert.equal(buyerFields(tree).props.value.customerName, '');
  assert.equal(buyerFields(tree).props.value.customer, null);
  assert.equal(field(tree, 'Store for fulfillment').props.value, '2');
  assert.doesNotMatch(text(field(tree, 'Store for fulfillment')), /Closed warehouse/);
});

test('a registered buyer is submitted by ID only and opens the saved staff draft', async () => {
  const created = [];
  const h = harness({ api: { createMaterialSale: async body => { created.push(body); return sale; } } });
  submit(prepare(h, registered)); await tick();
  assert.equal(created.length, 1);
  assert.deepEqual(Object.keys(created[0]).sort(), ['customerUserId', 'lines', 'requestKey', 'storeId']);
  assert.equal(created[0].customerUserId, 24);
  assert.equal(created[0].storeId, 2);
  assert.deepEqual(created[0].lines, [{ presentationId: 11, quantity: 1 }]);
  assert.deepEqual(h.navigations, ['/warehouse/materials/sales/51']);
});

test('manual buyer contacts are trimmed without linking the staff account', async () => {
  const created = [];
  const h = harness({ api: { createMaterialSale: async body => { created.push(body); return sale; } } });
  submit(prepare(h)); await tick();
  assert.equal(created[0].customerName, 'Walk-in Customer');
  assert.equal(created[0].customerEmail, 'buyer@example.test');
  assert.equal(created[0].customerPhone, '555-0100');
  assert.equal('customerUserId' in created[0], false);
});

test('a manual buyer can have no email or phone', async () => {
  let created;
  const h = harness({ api: { createMaterialSale: async body => { created = body; return sale; } } });
  submit(prepare(h, { ...guest, customerEmail: ' ', customerPhone: '' })); await tick();
  assert.equal(created.customerName, 'Walk-in Customer');
  assert.equal(created.customerEmail, undefined);
  assert.equal(created.customerPhone, undefined);
});

test('missing buyer or store never produces a sale even if the submit handler is invoked', async () => {
  let created = 0;
  const api = { createMaterialSale: async () => { created++; return sale; } };
  const h = harness({ api });
  click(h.render(), 'Add to sale');
  submit(h.render()); await tick();
  assert.equal(created, 0); assert.match(error(h.render()), /customer/);
  const multi = harness({ api, props: { stores: [...stores, { id: 3, name: 'Second warehouse', isActive: true }] } });
  submit(prepare(multi)); await tick();
  assert.equal(created, 0); assert.match(error(multi.render()), /active store/);
  field(multi.render(), 'Store for fulfillment').props.onChange({ target: { value: '9' } });
  submit(multi.render()); await tick();
  assert.equal(created, 0);
});

test('unknown creation response freezes buyer and lines, then retries the exact body and request key', async () => {
  const created = [];
  const h = harness({ api: { createMaterialSale: async body => { created.push(body); if (created.length === 1) throw new Error('Response lost'); return sale; } } });
  const original = prepare(h, registered);
  submit(original); await tick();
  let tree = h.render();
  assert.equal(nodes(tree, e => e.type === 'fieldset')[0].props.disabled, true);
  assert.equal(buyerFields(tree).props.disabled, true);
  assert.match(text(tree), /Retry same sale/);
  // Previously captured controls cannot change the retained operation or create a second sale.
  buyerFields(original).props.onChange(guest);
  submit(original); await tick();
  assert.equal(created.length, 1);
  click(tree, 'Retry same sale'); await tick();
  assert.equal(created.length, 2);
  assert.deepEqual(created[0], created[1]);
  assert.equal(created[1].customerUserId, 24);
  submit(original); await tick();
  assert.equal(created.length, 2);
});

test('a rejected retry does not unlock an earlier uncertain sale', async () => {
  const created = [];
  const h = harness({ api: { createMaterialSale: async body => { created.push(body); if (created.length === 1) throw new Error('Response lost'); throw Object.assign(new Error('Temporary rejection'), { status: 409 }); } } });
  submit(prepare(h)); await tick();
  click(h.render(), 'Retry same sale'); await tick();
  const tree = h.render();
  assert.equal(nodes(tree, e => e.type === 'fieldset')[0].props.disabled, true);
  assert.match(text(tree), /Retry same sale/);
  assert.equal(created[0].requestKey, created[1].requestKey);
});

test('known rejected sale can be corrected without retaining a frozen buyer', async () => {
  const created = [];
  const h = harness({ api: { createMaterialSale: async body => { created.push(body); if (created.length === 1) throw Object.assign(new Error('Customer is inactive'), { status: 400 }); return sale; } } });
  submit(prepare(h, registered)); await tick();
  assert.equal(nodes(h.render(), e => e.type === 'fieldset')[0].props.disabled, false);
  buyerFields(h.render()).props.onChange(guest);
  submit(h.render()); await tick();
  assert.equal(created.length, 2);
  assert.notEqual(created[0].requestKey, created[1].requestKey);
  assert.equal(created[1].customerName, 'Walk-in Customer');
});

test('navigation failure preserves the saved sale without creating it again', async () => {
  let creates = 0, pushes = 0;
  const h = harness({ api: { createMaterialSale: async () => { creates++; return sale; } }, push() { pushes++; throw new Error('Navigation unavailable'); } });
  const original = prepare(h);
  submit(original); await tick();
  assert.match(text(h.render()), /Sale MS-51 was saved/);
  assert.match(error(h.render()), /Navigation unavailable/);
  submit(original); await tick();
  click(h.render(), 'Open saved sale'); await tick();
  assert.equal(creates, 1); assert.equal(pushes, 2);
  assert.doesNotMatch(text(h.render()), /Retry same sale/);
});

for (const change of ['account', 'role']) test(`${change} change during session verification prevents staff sale creation`, async () => {
  let creates = 0;
  const h = harness({ api: { createMaterialSale: async () => { creates++; return sale; } }, revalidate: async () => change === 'account' ? actor('admin', 99) : actor('client') });
  submit(prepare(h)); await tick();
  assert.equal(creates, 0); assert.match(error(h.render()), /account or role changed/);
});

test('stale submit handlers fail after the visible account changes', async () => {
  let creates = 0;
  const h = harness({ api: { createMaterialSale: async () => { creates++; return sale; } } });
  const original = prepare(h);
  h.auth.user = actor('admin', 99);
  const changed = h.render();
  assert.equal(buyerFields(changed), undefined);
  assert.equal(field(changed, 'Store for fulfillment'), undefined);
  submit(original); await tick();
  assert.equal(creates, 0);
});

test('an unknown sale cannot be retried under a changed role or account', async () => {
  let creates = 0;
  const h = harness({ api: { createMaterialSale: async () => { creates++; throw new Error('Lost response'); } } });
  submit(prepare(h)); await tick();
  const prior = h.render();
  h.auth.user = actor('operator'); h.render();
  click(prior, 'Retry same sale'); await tick();
  assert.equal(creates, 1);
  h.auth.user = actor('admin', 99); h.render();
  click(prior, 'Retry same sale'); await tick();
  assert.equal(creates, 1);
  h.auth.user = actor(); h.render();
  click(prior, 'Retry same sale'); await tick();
  assert.equal(creates, 2);
});

test('account changes after successful save suppress navigation without losing the known saved result', async () => {
  let creates = 0, validations = 0;
  const h = harness({ api: { createMaterialSale: async () => { creates++; return sale; } }, revalidate: async () => ++validations === 1 ? actor() : actor('admin', 99) });
  const original = prepare(h);
  submit(original); await tick();
  assert.equal(creates, 1); assert.deepEqual(h.navigations, []);
  submit(original); await tick();
  assert.equal(creates, 1);
  h.auth.user = actor('admin', 99);
  assert.doesNotMatch(text(h.render()), /MS-51/);
});

for (const role of ['client', 'dealer']) test(`${role} retains account checkout and immediate Stripe payment`, async () => {
  const created = [], checkouts = [], redirects = [];
  const h = harness({ role, api: {
    createCustomerMaterialOrder: async body => { created.push(body); return { ...sale, status: 'CONFIRMED' }; },
    publicMaterialCheckout: async token => { checkouts.push(token); return { url: 'https://checkout.stripe.test/session' }; },
  } });
  let tree = h.render();
  assert.match(text(tree), /My material orders|Ordering as Staff Member/);
  assert.match(text(tree), /Your materials are reserved for 30 minutes while you complete payment\./);
  assert.equal(buyerFields(tree), undefined);
  assert.equal(field(tree, 'Store for fulfillment'), undefined);
  assert.doesNotMatch(text(tree), /Main warehouse|Customer sales|Create sale for review/);
  click(tree, 'Add to cart'); tree = h.render();
  const previousWindow = global.window;
  global.window = { location: { assign: url => redirects.push(url) } };
  try { submit(tree); await tick(); } finally { global.window = previousWindow; }
  assert.equal(created.length, 1);
  assert.deepEqual(Object.keys(created[0]).sort(), ['lines', 'requestKey']);
  assert.deepEqual(checkouts, ['order-token']);
  assert.deepEqual(redirects, ['https://checkout.stripe.test/session']);
});

test('a consumer promoted to staff cannot submit the stale self-checkout', async () => {
  let creates = 0;
  const h = harness({ role: 'client', api: { createCustomerMaterialOrder: async () => { creates++; return sale; } }, revalidate: async () => actor('admin') });
  click(h.render(), 'Add to cart'); submit(h.render()); await tick();
  assert.equal(creates, 0);
  assert.match(error(h.render()), /account or role changed/);
});

test('server page fetches stores only for staff and supplies exact identity and role', async () => {
  for (const role of ['admin', 'operator', 'client', 'dealer']) {
    let storeReads = 0;
    const load = loader({ serverUser: actor(role), storesApi: async () => { storeReads++; return stores; }, api: { materialCatalog: async () => catalog } });
    const page = await load('app/materials/page.tsx').default({});
    const staff = ['admin', 'operator'].includes(role);
    assert.equal(storeReads, staff ? 1 : 0);
    assert.deepEqual(page.props.viewer, { id: 7, role });
    assert.equal(page.key, `7:${role}`);
    assert.deepEqual(page.props.stores.map(store => store.id), staff ? [2] : []);
  }
});

test('server page still requires an authenticated catalog role', async () => {
  await assert.rejects(loader({ serverUser: null })('app/materials/page.tsx').default({}), /redirect:\/login/);
  await assert.rejects(loader({ serverUser: actor('technician') })('app/materials/page.tsx').default({}), /notFound/);
});

(async () => {
  for (const { name, run } of tests) { await run(); process.stdout.write(`PASS ${name}\n`); }
  process.stdout.write(`${tests.length} staff catalog checks passed.\n`);
})().catch(error => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
