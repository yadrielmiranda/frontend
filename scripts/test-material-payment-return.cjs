/* Offline customer payment-return checks; all account, payment and order APIs are stubbed. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '../src');
const tests = [];
const test = (name, run) => tests.push({ name, run });
const tick = () => new Promise(resolve => setImmediate(resolve));
const account = { id: 8, role: { name: 'client' } };
const authenticated = () => ({ user: account, isAuthenticated: true, isLoading: false, error: null, revalidate: async () => account });
const sale = {
  id: 12, code: 'MS-TEST', customerName: 'Test customer', status: 'CONFIRMED',
  subtotal: '45.00', taxRate: '7', taxAmount: '3.15', total: '48.15',
  balance: '48.15', paidAmount: '0.00', paymentStatus: 'UNPAID',
  createdAt: '2026-10-12T12:00:00Z', expiresAt: '2026-10-12T12:30:00Z',
  lines: [], payments: [], version: 1,
};
const paid = { ...sale, balance: '0.00', paidAmount: '48.15', paymentStatus: 'PAID' };
const canceled = { ...sale, status: 'CANCELED', canCancel: false };
const Button = ({ children, asChild, ...props }) => asChild ? children : React.createElement('button', props, children);

function loader({ hooks, api = {}, auth = authenticated() } = {}) {
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
      if (id === 'next/link') return { __esModule: true, default: ({ href, children }) => React.createElement('a', { href }, children) };
      if (id === 'next/navigation') return { notFound: () => { throw new Error('Not found'); } };
      if (id === '@/contexts/AuthContext') return { useAuth: () => auth };
      if (id === '@/app/api/materials.api') return api;
      if (id === '@/app/api/brandings.api') return { getPublicCompanyBranding: async () => null };
      if (id === '@/app/api/_base') return { isApiError: error => Number.isInteger(error?.status) };
      if (id === '@/app/api/warehouse.api') return { warehouseRequestKey: () => 'test-key' };
      if (id === '@/components/ui/button') return { Button };
      if (id === '@/components/ui/input') return { Input: () => null };
      if (id === 'lucide-react') return { Loader2: () => null };
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

function harness({ initial = sale, paymentReturn, api = {}, auth = authenticated() } = {}) {
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
  const operations = { customerMaterialOrder: async () => ({ ...initial, canCancel: true }), publicMaterialSale: async () => initial, ...api };
  const component = loader({ hooks, api: operations, auth })('app/public/material-sales/[token]/public-material-sale-client.tsx').PublicMaterialSaleClient;
  let tree;
  const render = () => { stateIndex = refIndex = effectIndex = 0; dirty = false; return tree = component({ initial, token: 'test-token', paymentReturn }); };
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
const notice = tree => nodes(tree, element => element.props && 'error' in element.props && 'success' in element.props)[0]?.props;

test('public statuses separate reserved, paid, delivered, canceled, draft and refunded orders', () => {
  const { MaterialSaleSummary } = loader()('app/warehouse/materials/material-sale-summary.tsx');
  for (const [value, expected] of [[sale, 'Pending payment'], [paid, 'Ready for pickup'], [{ ...paid, status: 'DELIVERED' }, 'Delivered'], [canceled, 'Canceled'], [{ ...sale, status: 'DRAFT' }, 'Draft'], [{ ...sale, paidAmount: '0.00', payments: [{ status: 'PAID', refundedAmount: '48.15' }] }, 'Pending payment']]) {
    const markup = renderToStaticMarkup(React.createElement(MaterialSaleSummary, { sale: value, publicView: true }));
    assert.ok(markup.includes(expected), expected);
    assert.ok(!markup.includes('CONFIRMED'));
  }
  assert.match(renderToStaticMarkup(React.createElement(MaterialSaleSummary, { sale })), /CONFIRMED/);
});

test('guest payment links still work and never expose order cancellation', async () => {
  let reads = 0;
  const h = harness({ auth: { ...authenticated(), user: null, isAuthenticated: false }, api: { customerMaterialOrder: async () => { reads++; } } });
  const tree = await h.settle();
  assert.match(text(tree), /Pay \$48.15 securely with Stripe/);
  assert.equal(button(tree, 'Cancel order'), undefined);
  assert.equal(reads, 0);
  h.dispose();
});

test('other accounts and failed ownership reads do not gain cancellation rights', async () => {
  for (const read of [async () => { throw Object.assign(new Error('Not found'), { status: 404 }); }, async () => { throw new Error('Offline'); }, async () => ({ ...sale, canCancel: false })]) {
    const h = harness({ api: { customerMaterialOrder: read } });
    const tree = await h.settle();
    assert.equal(button(tree, 'Cancel order'), undefined);
    assert.match(text(tree), /Pay \$48.15 securely with Stripe/);
    h.dispose();
  }
});

test('staff-created links and previously paid orders skip owner-only cancellation lookups', async () => {
  for (const initial of [{ ...sale, expiresAt: null }, { ...sale, paidAmount: '10.00' }, { ...sale, payments: [{ status: 'PAID', paidAt: '2026-10-12T12:05:00Z', refundedAmount: '48.15' }] }]) {
    let reads = 0;
    const h = harness({ initial, api: { customerMaterialOrder: async () => { reads++; return { ...initial, canCancel: true }; } } });
    const tree = await h.settle();
    assert.equal(reads, 0);
    assert.equal(button(tree, 'Cancel order'), undefined);
    h.dispose();
  }
});

test('owner must explicitly confirm before cancellation; duplicate clicks make one request', async () => {
  let cancels = 0, release;
  const h = harness({ api: { cancelCustomerMaterialOrder: async id => { assert.equal(id, sale.id); cancels++; await new Promise(resolve => release = resolve); return canceled; } } });
  let tree = await h.settle();
  button(tree, 'Cancel order').props.onClick();
  tree = await h.settle();
  assert.equal(cancels, 0);
  const confirm = button(tree, 'Yes, cancel order');
  const first = confirm.props.onClick();
  const duplicate = confirm.props.onClick();
  await tick();
  assert.equal(cancels, 1);
  assert.equal(button(h.render(), 'Canceling order…').props.disabled, true);
  release(); await Promise.all([first, duplicate]);
  tree = await h.settle();
  assert.match(text(tree), /This order has been canceled/);
  assert.equal(button(tree, 'Cancel order'), undefined);
  assert.match(notice(tree).success, /no longer reserved/);
  h.dispose();
});

test('keep-order dismisses confirmation without writing', async () => {
  let cancels = 0;
  const h = harness({ api: { cancelCustomerMaterialOrder: async () => { cancels++; return canceled; } } });
  button(await h.settle(), 'Cancel order').props.onClick();
  button(await h.settle(), 'Keep order').props.onClick();
  assert.ok(button(await h.settle(), 'Cancel order'));
  assert.equal(cancels, 0);
  h.dispose();
});

test('changed or unverifiable sessions cannot cancel', async () => {
  for (const revalidate of [async () => null, async () => ({ ...account, id: 99 }), async () => { throw new Error('Session unavailable'); }]) {
    let cancels = 0;
    const h = harness({ auth: { ...authenticated(), revalidate }, api: { cancelCustomerMaterialOrder: async () => { cancels++; return canceled; } } });
    button(await h.settle(), 'Cancel order').props.onClick();
    await button(await h.settle(), 'Yes, cancel order').props.onClick();
    const tree = await h.settle();
    assert.equal(cancels, 0);
    assert.ok(notice(tree).error);
    assert.equal(notice(tree).success, '');
    h.dispose();
  }
});

test('failed cancellation keeps the reservation state and allows an explicit retry', async () => {
  let calls = 0;
  const h = harness({ api: { cancelCustomerMaterialOrder: async () => { if (++calls === 1) throw new Error('Payment is still processing.'); return canceled; } } });
  button(await h.settle(), 'Cancel order').props.onClick();
  await button(await h.settle(), 'Yes, cancel order').props.onClick();
  let tree = await h.settle();
  assert.match(notice(tree).error, /processing/);
  assert.equal(notice(tree).success, '');
  assert.doesNotMatch(text(tree), /This order has been canceled/);
  await button(tree, 'Yes, cancel order').props.onClick();
  tree = await h.settle();
  assert.match(text(tree), /This order has been canceled/);
  h.dispose();
});

test('Stripe return queries never prove payment or cancel an order automatically', async () => {
  for (const paymentReturn of ['canceled', 'returned']) {
    let cancels = 0, checkouts = 0;
    const h = harness({ paymentReturn, api: { cancelCustomerMaterialOrder: async () => { cancels++; }, publicMaterialCheckout: async () => { checkouts++; } } });
    const tree = await h.settle();
    assert.doesNotMatch(text(tree), /Payment received|This order has been canceled/);
    assert.equal(cancels, 0); assert.equal(checkouts, 0);
    assert.match(text(tree), paymentReturn === 'canceled' ? /resume payment or cancel this order/ : /checking your payment status/);
    h.dispose();
  }
});

test('only a confirmed fully paid order shows payment received', async () => {
  const h = harness({ initial: paid, paymentReturn: 'canceled' });
  const tree = await h.settle();
  assert.match(text(tree), /Payment received/);
  assert.match(text(tree), /ready for pickup/);
  assert.doesNotMatch(text(tree), /awaiting payment/);
  assert.equal(button(tree, 'Cancel order'), undefined);
  h.dispose();
  for (const initial of [{ ...sale, status: 'DRAFT' }, { ...paid, status: 'DRAFT' }, { ...sale, payments: [{ status: 'PAID', refundedAmount: '48.15' }] }]) {
    const draft = harness({ initial });
    assert.doesNotMatch(text(await draft.settle()), /Payment received/);
    draft.dispose();
  }
});

test('paid status from refresh removes cancellation and shows the real confirmation', async () => {
  const h = harness({ api: { publicMaterialSale: async () => paid } });
  assert.ok(button(await h.settle(), 'Cancel order'));
  await button(h.render(), 'Refresh status').props.onClick();
  const tree = await h.settle();
  assert.match(text(tree), /Payment received/);
  assert.equal(button(tree, 'Cancel order'), undefined);
  h.dispose();
});

test('an old polling response cannot restore an order after successful cancellation', async () => {
  let resolvePoll;
  const h = harness({ initial: { ...sale, payments: [{ status: 'PENDING' }] }, api: {
    publicMaterialSale: () => new Promise(resolve => resolvePoll = resolve),
    cancelCustomerMaterialOrder: async () => canceled,
  } });
  let tree = await h.settle();
  const polling = [...intervals.values()].at(-1)();
  button(tree, 'Cancel order').props.onClick();
  await button(await h.settle(), 'Yes, cancel order').props.onClick();
  resolvePoll(sale); await polling;
  tree = await h.settle();
  assert.match(text(tree), /This order has been canceled/);
  h.dispose();
});

test('server page treats only exact Stripe return markers as hints and never writes', async () => {
  let reads = 0, writes = 0;
  const Page = loader({ api: { publicMaterialSale: async () => { reads++; return sale; }, cancelCustomerMaterialOrder: async () => { writes++; } } })('app/public/material-sales/[token]/page.tsx').default;
  for (const [payment, expected] of [['returned', 'returned'], ['canceled', 'canceled'], ['paid', undefined], [['canceled', 'returned'], undefined]]) {
    const element = await Page({ params: Promise.resolve({ token: 'test-token' }), searchParams: Promise.resolve({ payment }) });
    assert.equal(element.props.paymentReturn, expected);
  }
  assert.equal(reads, 4); assert.equal(writes, 0);
});

const intervals = new Map(); let timer = 0;
const oldWindow = global.window;
global.window = { setInterval(callback) { intervals.set(++timer, callback); return timer; }, clearInterval(id) { intervals.delete(id); }, location: { assign() {} } };
(async () => {
  let failures = 0;
  try {
    for (const { name, run } of tests) {
      intervals.clear();
      try { await run(); console.log(`PASS ${name}`); }
      catch (error) { failures++; console.error(`FAIL ${name}`, error); }
    }
  } finally { global.window = oldWindow; }
  console.log(`${tests.length - failures}/${tests.length} customer payment-return checks passed.`);
  if (failures) process.exitCode = 1;
})();
