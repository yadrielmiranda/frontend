/* Offline customer order-history checks. No server, account, order or payment writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '../src');
const tests = [];
const test = (name, run) => tests.push({ name, run });
const tick = () => new Promise(resolve => setImmediate(resolve));
const account = { id: 8, role: { name: 'client' } };
const authenticated = () => ({ user: account, isAuthenticated: true, isLoading: false, error: null, revalidate: async () => account });
const Button = ({ children, asChild, ...props }) => asChild ? children : React.createElement('button', props, children);
const Link = ({ children, href }) => React.createElement('a', { href }, children);
const order = {
  id: 12, code: 'MS-HISTORY', status: 'CONFIRMED', paymentStatus: 'UNPAID',
  balance: '48.15', total: '48.15', publicUrl: 'https://portal.example.test/public/material-sales/order-token',
  createdAt: '2026-10-12T12:00:00Z', lines: [{ quantity: 3, productName: 'White caulking', presentationName: 'Tube' }],
};
const initial = { items: [order], total: 21, page: 1, pageSize: 20 };

function loader({ hooks, api = {}, auth = authenticated(), session = async () => account } = {}) {
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', code)(id => {
      if (id === 'react') return hooks ? { ...React, ...hooks } : React;
      if (id === 'react/jsx-runtime') return require(id);
      if (id === 'next/link') return { __esModule: true, default: Link };
      if (id === 'next/navigation') return { redirect: url => { throw new Error(`Redirect ${url}`); }, notFound: () => { throw new Error('Not found'); } };
      if (id === '@/lib/session') return { getCurrentUser: session };
      if (id === '@/contexts/AuthContext') return { useAuth: () => auth };
      if (id === '@/app/api/materials.api') return api;
      if (id === '@/app/api/_base') return { isApiError: error => Number.isInteger(error?.status) };
      if (id === '@/app/api/warehouse.api') return { warehouseRequestKey: () => 'unused' };
      if (id.startsWith('@/components/ui/')) return new Proxy({}, { get: (_, name) => name === 'Button' ? Button : ({ children }) => React.createElement('div', null, children) });
      if (id === '@/components/material-product-image') return { MaterialProductImage: () => null };
      if (id === 'lucide-react') return new Proxy({}, { get: () => () => null });
      const target = id.startsWith('@/') ? path.resolve(root, id.slice(2)) : path.resolve(path.dirname(filename), id);
      const resolved = ['.ts', '.tsx'].map(extension => target + extension).find(file => fs.existsSync(file));
      if (!resolved) throw new Error(`Unexpected dependency: ${id}`);
      return load(path.relative(root, resolved));
    }, module, module.exports);
    cache.set(filename, module.exports);
    return module.exports;
  }
  return load;
}

function harness({ data = initial, api = {}, auth = authenticated(), file = 'app/materials/orders/material-orders-client.tsx', name = 'MaterialOrdersClient', props } = {}) {
  const states = [], refs = [], effects = [], queued = [];
  let stateIndex = 0, refIndex = 0, effectIndex = 0, dirty = true;
  const hooks = {
    useState(initialValue) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = typeof initialValue === 'function' ? initialValue() : initialValue;
      return [states[index], value => {
        const next = typeof value === 'function' ? value(states[index]) : value;
        if (!Object.is(next, states[index])) { states[index] = next; dirty = true; }
      }];
    },
    useRef(value) { const index = refIndex++; return refs[index] ||= { current: value }; },
    useEffect(callback, deps) {
      const index = effectIndex++, previous = effects[index];
      if (previous && deps.every((value, i) => Object.is(value, previous.deps[i]))) return;
      effects[index] = { deps, cleanup: previous?.cleanup };
      queued.push(() => { effects[index].cleanup?.(); effects[index].cleanup = callback(); });
    },
  };
  const component = loader({ hooks, api, auth })(file)[name];
  let tree;
  const render = () => { stateIndex = refIndex = effectIndex = 0; dirty = false; return tree = component(props ?? { initial: data, accountId: account.id, accountRole: account.role.name }); };
  const settle = async () => {
    for (let attempt = 0; attempt < 12; attempt++) {
      if (dirty || !tree) render();
      while (queued.length) queued.shift()();
      await tick();
      if (!dirty && !queued.length) return tree;
    }
    throw new Error('Effects did not settle');
  };
  return { render, settle, auth, dispose: () => effects.forEach(effect => effect.cleanup?.()) };
}
const text = element => typeof element === 'string' || typeof element === 'number' ? String(element)
  : Array.isArray(element) ? element.map(text).join('') : element?.props ? text(element.props.children) : '';
function nodes(element, predicate, matches = []) {
  if (!element || typeof element !== 'object') return matches;
  if (Array.isArray(element)) { element.forEach(child => nodes(child, predicate, matches)); return matches; }
  if (predicate(element)) matches.push(element);
  nodes(element.props?.children, predicate, matches);
  return matches;
}
const button = (tree, label) => nodes(tree, element => element.type === Button && text(element) === label)[0];
const links = tree => nodes(tree, element => element.type === Link);
const error = tree => nodes(tree, element => element.props && 'error' in element.props)[0]?.props.error;

test('server route rejects guests and unsupported roles before fetching history', async () => {
  let reads = 0;
  for (const [user, expected] of [[null, /Redirect \/login/], [{ ...account, role: { name: 'technician' } }, /Not found/]]) {
    const Page = loader({ session: async () => user, api: { customerMaterialOrders: async () => { reads++; } } })('app/materials/orders/page.tsx').default;
    await assert.rejects(Page({}), expected);
  }
  assert.equal(reads, 0);
});

test('server route binds initial history to authenticated identity and validates page input', async () => {
  for (const [page, expected] of [['3', 3], ['-1', 1], ['nope', 1], ['9007199254740992', 1], [['2'], 1]]) {
    const queries = [];
    const Page = loader({ api: { customerMaterialOrders: async query => { queries.push(query); return initial; } } })('app/materials/orders/page.tsx').default;
    const result = await Page({ searchParams: Promise.resolve({ page }) });
    assert.deepEqual(queries, [{ page: expected, pageSize: 20 }]);
    assert.equal(result.props.accountId, account.id);
    assert.equal(result.props.accountRole, account.role.name);
    assert.equal(result.key, String(account.id));
  }
});

test('history separates unpaid, paid, delivered and canceled orders and links to invoices', async () => {
  const data = { ...initial, total: 4, items: [order, { ...order, id: 13, code: 'MS-PAID', paymentStatus: 'PAID', balance: '0' }, { ...order, id: 14, status: 'DELIVERED' }, { ...order, id: 15, status: 'CANCELED' }] };
  const h = harness({ data }); const tree = await h.settle();
  for (const expected of ['Pending payment', 'Ready for pickup', 'Delivered', 'Canceled', 'Paid in full', 'Balance: $48.15', '3 × White caulking (Tube)']) assert.ok(text(tree).includes(expected), expected);
  assert.equal(links(tree).filter(link => link.props.href === '/public/material-sales/order-token').length, 4);
  assert.equal(links(tree).filter(link => text(link).includes('View order / invoice')).length, 4);
  assert.equal(button(tree, 'Previous').props.disabled, true);
  assert.equal(button(tree, 'Next').props.disabled, true);
  h.dispose();
});

test('history renders no private rows while loading, expired, unverified, or signed into another identity', async () => {
  for (const changed of [{ isLoading: true }, { isAuthenticated: false }, { error: 'Offline' }, { user: { id: 9, role: { name: 'client' } } }, { user: { ...account, role: { name: 'dealer' } } }]) {
    const h = harness({ auth: { ...authenticated(), ...changed } }); const tree = await h.settle();
    assert.ok(!text(tree).includes(order.code));
    assert.equal(links(tree).filter(link => link.props.href.includes('/public/')).length, 0);
    h.dispose();
  }
});

test('pagination verifies account before and after the read and navigates the returned page', async () => {
  const queries = []; let verifies = 0;
  const h = harness({ auth: { ...authenticated(), revalidate: async () => { verifies++; return account; } }, api: { customerMaterialOrders: async query => { queries.push(query); return { ...initial, items: [{ ...order, code: 'MS-PAGE-TWO' }], page: 2 }; } } });
  let tree = await h.settle(); button(tree, 'Next').props.onClick(); tree = await h.settle();
  assert.deepEqual(queries, [{ page: 2, pageSize: 20 }]); assert.equal(verifies, 2);
  assert.match(text(tree), /MS-PAGE-TWO/); assert.match(text(tree), /Page 2 of 2/);
  assert.equal(button(tree, 'Next').props.disabled, true); assert.equal(button(tree, 'Previous').props.disabled, false);
  h.dispose();
});

test('duplicate page clicks issue one request and errors keep the current page recoverable', async () => {
  let reads = 0, release;
  const h = harness({ api: { customerMaterialOrders: async () => { reads++; await new Promise(resolve => release = resolve); throw new Error('Connection lost'); } } });
  let tree = await h.settle(); const next = button(tree, 'Next'); next.props.onClick(); next.props.onClick(); await tick();
  assert.equal(reads, 1); release(); tree = await h.settle();
  assert.match(error(tree), /Connection lost/); assert.match(text(tree), /MS-HISTORY/); assert.match(text(tree), /Page 1 of 2/);
  assert.equal(button(tree, 'Refresh').props.disabled, false);
  h.dispose();
});

test('account mismatch before a read prevents fetching and after a read prevents display', async () => {
  for (const changeOn of [1, 2]) {
    let reads = 0, verifies = 0;
    const h = harness({ auth: { ...authenticated(), revalidate: async () => ++verifies === changeOn ? { ...account, id: 99 } : account }, api: { customerMaterialOrders: async () => { reads++; return { ...initial, items: [{ ...order, code: 'OTHER-ACCOUNT-ORDER' }] }; } } });
    let tree = await h.settle(); button(tree, 'Refresh').props.onClick(); tree = await h.settle();
    assert.equal(reads, changeOn === 1 ? 0 : 1); assert.ok(!text(tree).includes('OTHER-ACCOUNT-ORDER'));
    assert.match(error(tree), /verify your account/);
    h.dispose();
  }
});

test('an in-flight history response is discarded after the account changes', async () => {
  let release;
  const h = harness({ api: { customerMaterialOrders: async () => new Promise(resolve => release = resolve) } });
  let tree = await h.settle(); button(tree, 'Next').props.onClick(); await tick();
  h.auth.user = { ...account, id: 99 }; h.render(); await h.settle();
  release({ ...initial, items: [{ ...order, code: 'STALE-RESULT' }], page: 2 }); tree = await h.settle();
  assert.ok(!text(tree).includes('STALE-RESULT')); assert.ok(!text(tree).includes(order.code));
  h.auth.user = account; h.render(); tree = await h.settle();
  assert.match(text(tree), /MS-HISTORY/); assert.ok(!text(tree).includes('STALE-RESULT'));
  h.dispose();
});

test('missing or unsafe order paths are not exposed as invoice navigation', async () => {
  for (const publicUrl of [null, '', 'javascript:alert(1)', '/warehouse/materials/sales/9']) {
    const h = harness({ data: { ...initial, items: [{ ...order, publicUrl }] } }); const tree = await h.settle();
    assert.equal(links(tree).filter(link => text(link).includes('View order / invoice')).length, 0);
    assert.match(text(tree), /Contact us for order details/); h.dispose();
  }
});

test('empty history offers catalog navigation; an empty out-of-range page can return to page one', async () => {
  const h = harness({ data: { items: [], total: 0, page: 1, pageSize: 20 } }); let tree = await h.settle();
  assert.match(text(tree), /No material orders yet/); assert.ok(links(tree).some(link => text(link) === 'Browse materials' && link.props.href === '/materials'));
  h.dispose();
  let query;
  const out = harness({ data: { ...initial, items: [], page: 9 }, api: { customerMaterialOrders: async value => { query = value; return initial; } } });
  tree = await out.settle(); button(tree, 'Back to first page').props.onClick(); await out.settle();
  assert.deepEqual(query, { page: 1, pageSize: 20 }); out.dispose();
});

test('catalog header exposes My material orders beside the cart without a mobile-only hiding rule', async () => {
  const h = harness({ file: 'app/materials/materials-catalog-client.tsx', name: 'MaterialsCatalogClient', props: { initial: { products: [], categories: [], brands: [], page: 1, pageSize: 24, total: 0, taxRate: '7' } } });
  const tree = await h.settle();
  const header = nodes(tree, element => element.type === 'header')[0];
  assert.ok(links(header).some(link => text(link) === 'My material orders' && link.props.href === '/materials/orders'));
  const action = button(header, 'My material orders'); assert.ok(action); assert.ok(!action.props.className.includes('hidden'));
  h.dispose();
});

(async () => {
  for (const { name, run } of tests) { await run(); console.log(`PASS ${name}`); }
  console.log(`${tests.length} material order-history checks passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
