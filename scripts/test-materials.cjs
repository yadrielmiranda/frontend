/* Offline material-flow regression checks. No API, database or payment writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '../src');
const calls = [];
const tests = [];
const test = (name, run) => tests.push({ name, run });
const pass = ({ children }) => React.createElement('div', null, children);
const input = props => React.createElement('input', { ...props, readOnly: true });
const button = ({ children, asChild, ...props }) => asChild ? children : React.createElement('button', props, children);
const customerAccount = { id: 8, username: 'customer', firstName: 'Test', lastName: 'Customer', email: 'customer@example.test', phone: '+13055550111', role: { id: 3, name: 'client' } };
const authenticated = () => ({ user: customerAccount, isAuthenticated: true, isLoading: false, error: null, revalidate: async () => customerAccount });

function loader({ hooks, api = {}, auth = authenticated() } = {}) {
  const cache = new Map();
  function load(file) {
    const filename = path.resolve(root, file);
    if (cache.has(filename)) return cache.get(filename);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const module = { exports: {} };
    const customRequire = id => {
      if (id === 'react') return hooks ? { ...React, ...hooks } : React;
      if (id === 'react/jsx-runtime') return require(id);
      if (id === 'next/link') return { __esModule: true, default: ({ children, href }) => React.createElement('a', { href }, children) };
      if (id === 'next/navigation') return { useRouter: () => ({ push: url => calls.push({ push: url }), refresh() {} }) };
      if (id === '@/contexts/AuthContext') return { useAuth: () => auth };
      if (id === '@/components/material-product-image') return { MaterialProductImage: ({ name, imageUrl }) => React.createElement('img', { alt: name, src: imageUrl || '/test-placeholder' }) };
      if (id === 'lucide-react') return new Proxy({}, { get: () => () => null });
      if (id === 'jsbarcode') return require(id);
      if (id === './_base' || id === '@/app/api/_base') return { apiFetch: async (...args) => { calls.push(args); return {}; }, isApiError: error => typeof error?.status === 'number' };
      if (id === '@/app/api/materials.api' && Object.keys(api).length) return new Proxy(api, { get: (target, key) => target[key] || (async body => { calls.push({ key, body }); return {}; }) });
      if (id.startsWith('@/components/ui/')) return new Proxy({}, { get: (_, name) => name === 'Button' ? button : name === 'Input' ? input : pass });
      const base = id.startsWith('@/') ? path.resolve(root, id.slice(2)) : id.startsWith('.') ? path.resolve(path.dirname(filename), id) : null;
      if (!base) return require(id);
      const resolved = ['.ts', '.tsx'].map(ext => base + ext).find(file => fs.existsSync(file));
      if (!resolved) throw new Error(`Unresolved: ${id}`);
      return load(path.relative(root, resolved));
    };
    new Function('require', 'module', 'exports', compiled)(customRequire, module, module.exports);
    cache.set(filename, module.exports); return module.exports;
  }
  return load;
}

function controlled(file, name, props, api, auth, options = {}) {
  const states = [], refs = [], effects = []; let stateIndex = 0, refIndex = 0, effectIndex = 0;
  const hooks = {
    useState(initial) { const index = stateIndex++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
    useRef(initial) { const index = refIndex++; if (!(index in refs)) refs[index] = { current: initial }; return refs[index]; },
    useEffect(callback, dependencies) {
      if (!options.effects) return;
      const index = effectIndex++, previous = effects[index];
      if (!previous || !dependencies || dependencies.some((value, i) => value !== previous.dependencies?.[i])) {
        effects[index] = { dependencies, callback, cleanup: previous?.cleanup, pending: true };
      }
    },
  };
  const load = loader({ hooks, api, auth });
  const component = load(file)[name];
  const render = () => {
    stateIndex = 0; refIndex = 0; effectIndex = 0;
    const tree = component(props);
    for (const effect of effects) if (effect.pending) { effect.cleanup?.(); effect.cleanup = effect.callback(); effect.pending = false; }
    return tree;
  };
  return { render, states, refs, load, setProps: value => { props = value; }, dispose: () => { for (const effect of effects) effect.cleanup?.(); }, replayEffects: () => { for (const effect of effects) { effect.cleanup?.(); effect.cleanup = effect.callback(); } } };
}
function nodes(element, predicate, matches = []) {
  if (!element || typeof element !== 'object') return matches;
  if (Array.isArray(element)) { element.forEach(child => nodes(child, predicate, matches)); return matches; }
  if (predicate(element)) matches.push(element);
  nodes(element.props?.children, predicate, matches); return matches;
}
const text = element => typeof element === 'string' || typeof element === 'number' ? String(element) : Array.isArray(element) ? element.map(text).join('') : element?.props ? text(element.props.children) : '';
const field = (tree, label) => nodes(tree, e => e.props?.label === label)[0]?.props.children;
const submit = tree => nodes(tree, e => e.type === 'form')[0].props.onSubmit({ preventDefault() {} });
const tick = () => new Promise(resolve => setImmediate(resolve));
const unit = { id: 1, name: 'Tube', isActive: true }, boxUnit = { id: 2, name: 'Box', isActive: true };
const base = { id: 1, productId: 1, unitId: 1, unit, name: 'Tube', multiplier: 1, barcode: null, isBase: true, isPurchase: false, isSaleEnabled: true, isActive: true, salePrice: 6, version: 0 };
const box = { ...base, id: 2, unitId: 2, unit: boxUnit, name: 'Box of 20', multiplier: 20, barcode: 'MAT-BOX20', isBase: false, isPurchase: true, salePrice: 100 };
const store = { id: 1, name: 'Main store', isActive: true, version: 0, onHand: 0, units: 0 };
const product = { id: 1, code: 'MAT-000001', name: 'White caulking', description: '10 oz', baseUnitId: 1, baseUnit: unit, isActive: true, isSaleEnabled: true, version: 2, presentations: [base, box], inventoryByStore: [{ store, totalBaseQuantity: 60, reservedBaseQuantity: 0, availableBaseQuantity: 60, presentations: [{ id: 1, quantity: 0, reservedQuantity: 0, availableQuantity: 60 }, { id: 2, quantity: 3, reservedQuantity: 0, availableQuantity: 3 }] }] };
const sale = { id: 1, code: 'MS-000001', customerName: 'Test Customer', status: 'CONFIRMED', storeId: 1, store, subtotal: '24.00', taxRate: '7', taxAmount: '1.68', discountAmount: '0.00', total: '25.68', balance: '25.68', paidAmount: '0.00', paymentStatus: 'UNPAID', createdAt: '2026-01-01T12:00:00Z', publicUrl: '/public/material-sales/test-token', lines: [{ id: 1, productId: 1, presentationId: 1, productName: 'White caulking', productCode: 'MAT-000001', presentationName: 'Tube', multiplier: 1, quantity: 4, unitPrice: '6.00', lineTotal: '24.00', storeId: 1 }], payments: [], expiresAt: null, note: 'PRIVATE STAFF NOTE' };

test('creating a Box unit works on LAN HTTP without crypto.randomUUID', async () => {
  assert.equal(typeof globalThis.crypto.randomUUID, 'undefined');
  let saved;
  const h = controlled('app/warehouse/materials/materials-client.tsx', 'MaterialsClient', { initial: { items: [], total: 0, page: 1, pageSize: 50 }, initialUnits: [], admin: true }, {
    createMaterialUnit: async body => { saved = body; return boxUnit; },
    materialUnits: async () => [boxUnit],
  });
  let tree = h.render();
  nodes(tree, e => text(e) === 'Units of measure' && e.props?.onClick)[0].props.onClick();
  tree = h.render(); field(tree, 'Unit name').props.onChange({ target: { value: 'Box' } });
  tree = h.render();
  nodes(tree, e => e.type === 'form' && field(e, 'Unit name'))[0].props.onSubmit({ preventDefault() {} });
  await tick();
  assert.equal(saved.name, 'Box');
  assert.match(saved.requestKey, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(field(h.render(), 'Unit name').props.value, '');
});

test('creating a barcode-free product preserves explicit package contents and zero-stock intent', async () => {
  let saved;
  const h = controlled('app/warehouse/materials/materials-client.tsx', 'MaterialsClient', { initial: { items: [], total: 0, page: 1, pageSize: 50 }, initialUnits: [unit, boxUnit], admin: true }, { createMaterialProduct: async body => { saved = body; return product; } });
  let tree = h.render(); nodes(tree, e => text(e) === 'New product' && e.props?.onClick)[0].props.onClick();
  tree = h.render();
  for (const [label, value] of [['Product name', 'White caulking'], ['Base unit', '1'], ['Purchase unit', '2'], ['Base units in each purchase package', '20']]) {
    // Re-render after each field: the content label reflects selected units.
    const node = field(tree, label) || nodes(tree, e => e.props?.label?.startsWith('How many'))[0]?.props.children;
    node.props.onChange({ target: { value } }); tree = h.render();
  }
  const productForm = nodes(tree, e => e.type === 'form' && text(e).includes('Create product with zero stock'))[0];
  productForm.props.onSubmit({ preventDefault() {} }); await tick();
  assert.equal(saved.purchaseMultiplier, 20); assert.equal(saved.baseBarcode, undefined); assert.equal(saved.purchaseBarcode, undefined);
  assert.equal(saved.baseUnitId, 1); assert.equal(saved.purchaseUnitId, 2); assert.equal('quantity' in saved, false); assert.equal('cost' in saved, false);
});

test('receipts send package quantity and cost, never redefine package contents', async () => {
  let saved;
  const h = controlled('app/warehouse/materials/material-stock-actions.tsx', 'MaterialStockActions', { product, stores: [store], action: 'receive', onSaved: async () => {} }, { receiveMaterial: async body => { saved = body; } });
  let tree = h.render();
  for (const [label, value] of [['Store', '1'], ['Presentation', '2'], ['Quantity in this presentation', '3'], ['Cost per received package', '80']]) { field(tree, label).props.onChange({ target: { value } }); tree = h.render(); }
  assert.match(text(tree), /Each box contains/); assert.match(text(tree), /20 tube/);
  submit(tree); await tick(); assert.equal(saved.quantity, 3); assert.equal(saved.costPerPackage, 80); assert.equal('multiplier' in saved, false); assert.equal('purchaseMultiplier' in saved, false);
});

test('internal use offers automatic opening when loose stock is zero', async () => {
  let saved;
  const h = controlled('app/warehouse/materials/material-stock-actions.tsx', 'MaterialStockActions', { product, stores: [store], action: 'internal', onSaved: async () => {} }, { useMaterialInternally: async body => { saved = body; } });
  let tree = h.render();
  for (const [label, value] of [['Store', '1'], ['Presentation', '1'], ['Quantity in this presentation', '4'], ['Received by', 'Worker'], ['Reason / job', 'Installation']]) { field(tree, label).props.onChange({ target: { value } }); tree = h.render(); }
  assert.match(text(tree), /will open unreserved packages as needed/);
  assert.match(text(tree), /Expected opening: 1 × Box of 20/);
  submit(tree); await tick(); assert.equal(saved.quantity, 4); assert.equal(saved.presentationId, 1); assert.equal(saved.note, 'Installation');
});

test('opening preview preserves packages reserved as complete boxes', () => {
  const { materialOpeningPreview } = loader()('app/warehouse/materials/material-opening-preview.ts');
  const reservedProduct = structuredClone(product);
  reservedProduct.inventoryByStore[0].availableBaseQuantity = 20;
  reservedProduct.inventoryByStore[0].presentations[1].reservedQuantity = 2;
  assert.deepEqual(materialOpeningPreview(reservedProduct, 1, 1, 4), [{ name: 'Box of 20', quantity: 1 }]);
  assert.deepEqual(materialOpeningPreview(reservedProduct, 1, 1, 21), []);
  assert.deepEqual(materialOpeningPreview(reservedProduct, 1, 2, 1), []);
});

test('request lock prevents duplicate clicks and retains idempotency key after an unknown outcome', async () => {
  const h = controlled('app/warehouse/materials/materials-shared.tsx', 'useMaterialAction', undefined, {});
  let api = h.render(), keys = [], release;
  const pending = api.run({ quantity: 3 }, async key => { keys.push(key); await new Promise(resolve => release = resolve); throw new Error('Connection lost'); });
  await api.run({ quantity: 3 }, async key => keys.push(key)); assert.equal(keys.length, 1);
  release(); await pending;
  api = h.render(); await api.read(async () => {});
  api = h.render(); await api.run({ quantity: 9 }, async () => {});
  api = h.render(); await api.run({ quantity: 3 }, async key => keys.push(key)); assert.equal(keys[0], keys[1]);
  api = h.render(); await api.run({ quantity: 4 }, async key => keys.push(key)); assert.notEqual(keys[1], keys[2]);
});

const catalogFixture = () => ({ taxRate: '7', currency: 'usd', total: 1, page: 1, pageSize: 24, categories: [{ id: 1, name: 'Caulking', isActive: true }], brands: ['Sherwin-Williams'], products: [{ id: 1, code: product.code, name: product.name, description: null, brand: 'Sherwin-Williams', imageUrl: '/test-image.webp', category: { id: 1, name: 'Caulking', isActive: true }, baseUnit: unit, presentations: [{ ...base, salePrice: '6.00', availableQuantity: 60 }] }] });
function fillCustomerOrder(h) {
  let tree = h.render(); nodes(tree, e => text(e) === 'Add to cart' && e.props?.onClick)[0].props.onClick(); tree = h.render();
  return tree;
}

test('account checkout shows existing contact details and sends only cart lines and request key', async () => {
  let saved; const checkoutTokens = [], redirects = [];
  const h = controlled('app/materials/materials-catalog-client.tsx', 'MaterialsCatalogClient', { initial: catalogFixture() }, {
    createCustomerMaterialOrder: async body => { saved = body; return { ...sale, publicUrl: '/public/material-sales/account-order' }; },
    publicMaterialCheckout: async token => { checkoutTokens.push(token); return { url: 'https://checkout.stripe.test/account-order' }; },
  });
  const tree = fillCustomerOrder(h);
  assert.match(text(tree), /Ordering as Test Customer/);
  assert.match(text(tree), /customer@example\.test/);
  assert.match(text(tree), /\+13055550111/);
  assert.equal(field(tree, 'Your name'), undefined);
  assert.equal(field(tree, 'Email'), undefined);
  assert.equal(field(tree, 'Phone (optional)'), undefined);
  const oldWindow = global.window; global.window = { location: { origin: 'http://localhost:3000', assign: url => redirects.push(url) } };
  try { submit(tree); await tick(); } finally { global.window = oldWindow; }
  assert.deepEqual(Object.keys(saved).sort(), ['lines', 'requestKey']);
  assert.deepEqual(saved.lines, [{ presentationId: 1, quantity: 1 }]);
  assert.deepEqual(checkoutTokens, ['account-order']);
  assert.deepEqual(redirects, ['https://checkout.stripe.test/account-order']);
});

test('saved order retries Stripe on the same order after a lost checkout response', async () => {
  const submitted = [], checkoutTokens = [], reads = [], redirects = [];
  const h = controlled('app/materials/materials-catalog-client.tsx', 'MaterialsCatalogClient', { initial: catalogFixture() }, {
    createCustomerMaterialOrder: async body => { submitted.push(body); return sale; },
    publicMaterialCheckout: async token => { checkoutTokens.push(token); if (checkoutTokens.length === 1) throw new Error('Checkout response lost'); return { url: 'https://checkout.stripe.test/retry' }; },
    customerMaterialOrder: async id => { reads.push(id); const { publicUrl, publicToken, ...snapshot } = sale; return { ...snapshot, canCancel: true }; },
  });
  const oldWindow = global.window; global.window = { location: { assign: url => redirects.push(url) } };
  try {
    const originalTree = fillCustomerOrder(h);
    submit(originalTree); await tick(); let tree = h.render();
    assert.equal(nodes(tree, e => e.type === 'fieldset')[0].props.disabled, true);
    assert.equal(nodes(tree, e => text(e) === 'Retry same order' && e.props?.onClick).length, 0);
    assert.equal(nodes(tree, e => e.props?.href === '/public/material-sales/test-token').length, 1);
    assert.match(nodes(tree, e => e.props?.error)[0].props.error, /Checkout response lost/);
    // Even an old event handler cannot create a second reservation after success.
    submit(originalTree); await tick();
    nodes(tree, e => text(e) === 'Retry payment' && e.props?.onClick)[0].props.onClick(); await tick();
    assert.equal(submitted.length, 1);
    assert.deepEqual(checkoutTokens, ['test-token', 'test-token']);
    assert.deepEqual(reads, [sale.id]);
    assert.deepEqual(redirects, ['https://checkout.stripe.test/retry']);
  } finally { global.window = oldWindow; }
});

test('failed browser redirect keeps the saved order recoverable without reserving again', async () => {
  let creates = 0;
  const h = controlled('app/materials/materials-catalog-client.tsx', 'MaterialsCatalogClient', { initial: catalogFixture() }, {
    createCustomerMaterialOrder: async () => { creates++; return sale; },
    publicMaterialCheckout: async () => ({ url: 'https://checkout.stripe.test/order' }),
  });
  const oldWindow = global.window; global.window = { location: { assign() { throw new Error('Navigation blocked'); } } };
  try { submit(fillCustomerOrder(h)); await tick(); } finally { global.window = oldWindow; }
  const tree = h.render();
  assert.equal(creates, 1);
  assert.match(nodes(tree, e => e.props?.error)[0].props.error, /Navigation blocked/);
  assert.equal(nodes(tree, e => text(e) === 'Retry same order' && e.props?.onClick).length, 0);
  assert.equal(nodes(tree, e => text(e) === 'Retry payment' && e.props?.onClick).length, 1);
});

test('lost cancellation response is recovered by owner status and a later new order gets a new key', async () => {
  const submitted = [], canceled = [], reads = [];
  const h = controlled('app/materials/materials-catalog-client.tsx', 'MaterialsCatalogClient', { initial: catalogFixture() }, {
    createCustomerMaterialOrder: async body => { submitted.push(body); return sale; },
    publicMaterialCheckout: async () => { throw new Error('Payment unavailable'); },
    cancelCustomerMaterialOrder: async id => { canceled.push(id); throw new Error('Cancellation response lost'); },
    customerMaterialOrder: async id => { reads.push(id); return { ...sale, status: 'CANCELED', canCancel: false }; },
    materialCatalog: async () => catalogFixture(),
  });
  submit(fillCustomerOrder(h)); await tick(); let tree = h.render();
  nodes(tree, e => text(e) === 'Cancel order' && e.props?.onClick)[0].props.onClick(); await tick(); tree = h.render();
  assert.deepEqual(canceled, [sale.id]); assert.deepEqual(reads, [sale.id]);
  assert.equal(nodes(tree, e => e.type === 'fieldset')[0].props.disabled, false);
  assert.match(nodes(tree, e => e.props?.success)[0].props.success, /canceled/);
  assert.equal(nodes(tree, e => e.props?.['aria-label'] === 'Open cart, 0 items').length, 1);
  submit(fillCustomerOrder(h)); await tick();
  assert.equal(submitted.length, 2);
  assert.deepEqual(submitted[1].lines, submitted[0].lines);
  assert.notEqual(submitted[1].requestKey, submitted[0].requestKey);
});

test('unknown cancellation keeps cart locked and prevents payment until cancellation is confirmed', async () => {
  let statusReads = 0, checkouts = 0;
  const h = controlled('app/materials/materials-catalog-client.tsx', 'MaterialsCatalogClient', { initial: catalogFixture() }, {
    createCustomerMaterialOrder: async () => sale,
    publicMaterialCheckout: async () => { checkouts++; throw new Error('Payment unavailable'); },
    cancelCustomerMaterialOrder: async () => { throw new Error('Cancellation response lost'); },
    customerMaterialOrder: async () => { statusReads++; if (statusReads === 1) throw new Error('Status unavailable'); return { ...sale, status: 'CANCELED', canCancel: false }; },
    materialCatalog: async () => catalogFixture(),
  });
  submit(fillCustomerOrder(h)); await tick(); let tree = h.render();
  const oldRetryPayment = nodes(tree, e => text(e) === 'Retry payment' && e.props?.onClick)[0].props.onClick;
  nodes(tree, e => text(e) === 'Cancel order' && e.props?.onClick)[0].props.onClick(); await tick(); tree = h.render();
  assert.equal(nodes(tree, e => e.type === 'fieldset')[0].props.disabled, true);
  assert.equal(nodes(tree, e => text(e) === 'Retry payment' && e.props?.onClick).length, 0);
  assert.equal(nodes(tree, e => text(e) === 'Retry cancellation' && e.props?.onClick).length, 1);
  oldRetryPayment(); await tick(); assert.equal(checkouts, 1); assert.equal(statusReads, 1);
  nodes(tree, e => text(e) === 'Check order status' && e.props?.onClick)[0].props.onClick(); await tick(); tree = h.render();
  assert.equal(nodes(tree, e => e.type === 'fieldset')[0].props.disabled, false);
  assert.equal(checkouts, 1);
});

test('confirmed cancellation stays successful when the separate availability refresh fails', async () => {
  const h = controlled('app/materials/materials-catalog-client.tsx', 'MaterialsCatalogClient', { initial: catalogFixture() }, {
    createCustomerMaterialOrder: async () => sale,
    publicMaterialCheckout: async () => { throw new Error('Payment unavailable'); },
    cancelCustomerMaterialOrder: async () => ({ ...sale, status: 'CANCELED', canCancel: false }),
    materialCatalog: async () => { throw new Error('Catalog unavailable'); },
  });
  submit(fillCustomerOrder(h)); await tick(); let tree = h.render();
  nodes(tree, e => text(e) === 'Cancel order' && e.props?.onClick)[0].props.onClick(); await tick(); tree = h.render();
  const notice = nodes(tree, e => e.props?.success)[0];
  assert.match(notice.props.success, /order was canceled/);
  assert.match(notice.props.error, /Availability could not be refreshed/);
  assert.equal(nodes(tree, e => e.type === 'fieldset')[0].props.disabled, false);
  assert.equal(nodes(tree, e => text(e) === 'Retry cancellation' && e.props?.onClick).length, 0);
  assert.equal(nodes(tree, e => text(e) === 'Refresh availability' && e.props?.onClick).length, 1);
});

test('known-order payment and cancellation verify the original account before any API call', async () => {
  const auth = authenticated(); let checkouts = 0, reads = 0, cancels = 0;
  const h = controlled('app/materials/materials-catalog-client.tsx', 'MaterialsCatalogClient', { initial: catalogFixture() }, {
    createCustomerMaterialOrder: async () => sale,
    publicMaterialCheckout: async () => { checkouts++; throw new Error('Payment unavailable'); },
    customerMaterialOrder: async () => { reads++; return sale; },
    cancelCustomerMaterialOrder: async () => { cancels++; return sale; },
  }, auth);
  submit(fillCustomerOrder(h)); await tick();
  const originalTree = h.render();
  const retry = nodes(originalTree, e => text(e) === 'Retry payment' && e.props?.onClick)[0];
  const cancel = nodes(originalTree, e => text(e) === 'Cancel order' && e.props?.onClick)[0];
  auth.user = { ...customerAccount, id: 9 }; auth.revalidate = async () => auth.user;
  let tree = h.render();
  // Account changes hide the cart. Previously rendered handlers must also fail.
  retry.props.onClick(); await tick(); tree = h.render();
  cancel.props.onClick(); await tick(); tree = h.render();
  assert.equal(checkouts, 1); assert.equal(reads, 0); assert.equal(cancels, 0);
  assert.match(nodes(tree, e => e.props?.error)[0].props.error, /account or role changed/);
});

test('payment recovery notices an already-paid order and never opens another checkout', async () => {
  let checkouts = 0;
  const h = controlled('app/materials/materials-catalog-client.tsx', 'MaterialsCatalogClient', { initial: catalogFixture() }, {
    createCustomerMaterialOrder: async () => sale,
    publicMaterialCheckout: async () => { checkouts++; throw new Error('Payment response lost'); },
    customerMaterialOrder: async () => ({ ...sale, paymentStatus: 'PAID', balance: '0.00', canCancel: false }),
  });
  submit(fillCustomerOrder(h)); await tick(); let tree = h.render();
  nodes(tree, e => text(e) === 'Retry payment' && e.props?.onClick)[0].props.onClick(); await tick(); tree = h.render();
  assert.equal(checkouts, 1);
  assert.match(text(tree), /Payment received/);
  assert.equal(nodes(tree, e => text(e) === 'Retry payment' && e.props?.onClick).length, 0);
  assert.equal(nodes(tree, e => text(e) === 'Cancel order' && e.props?.onClick).length, 0);
});

test('checkout blocks guests, pending verification and unavailable sessions', async () => {
  let attempts = 0;
  for (const override of [{ user: null, isAuthenticated: false }, { isLoading: true }, { error: 'Session unavailable' }]) {
    const h = controlled('app/materials/materials-catalog-client.tsx', 'MaterialsCatalogClient', { initial: catalogFixture() }, {
      createCustomerMaterialOrder: async () => { attempts += 1; },
    }, { ...authenticated(), ...override });
    const tree = fillCustomerOrder(h);
    assert.equal(nodes(tree, e => text(e) === 'Reserve and continue to payment' && 'busy' in e.props)[0].props.disabled, true);
    submit(tree); await tick();
    assert.equal(attempts, 0);
  }
});

test('failed session preflight never creates an order or an uncertain reservation', async () => {
  let attempts = 0;
  for (const revalidate of [async () => { throw new Error('Please sign in again'); }, async () => null, async () => ({ ...customerAccount, id: 9 })]) {
    const h = controlled('app/materials/materials-catalog-client.tsx', 'MaterialsCatalogClient', { initial: catalogFixture() }, {
      createCustomerMaterialOrder: async () => { attempts += 1; },
    }, { ...authenticated(), revalidate });
    submit(fillCustomerOrder(h)); await tick();
    const tree = h.render();
    assert.equal(attempts, 0);
    assert.equal(nodes(tree, e => text(e) === 'Retry same order' && e.props?.onClick).length, 0);
    assert.equal(nodes(tree, e => e.type === 'fieldset')[0].props.disabled, false);
  }
});

test('unknown order recovery survives zero availability and a rate-limited retry', async () => {
  const submitted = [];
  const h = controlled('app/materials/materials-catalog-client.tsx', 'MaterialsCatalogClient', { initial: catalogFixture() }, {
    createCustomerMaterialOrder: async body => { submitted.push(body); if (submitted.length === 1) throw new Error('Response lost'); if (submitted.length === 2) { const error = new Error('Rate limited'); error.status = 429; throw error; } return { publicUrl: 'http://localhost:3000/public/material-sales/recovered' }; },
  });
  let tree = fillCustomerOrder(h); submit(tree); await tick(); tree = h.render();
  assert.equal(nodes(tree, e => e.type === 'fieldset')[0].props.disabled, true);
  assert.equal(nodes(tree, e => text(e) === 'Refresh availability' && e.props?.onClick).length, 0);
  const cartIndex = h.states.findIndex(value => Array.isArray(value) && value[0]?.presentationId);
  h.states[cartIndex] = h.states[cartIndex].map(line => ({ ...line, availableQuantity: 0, unitPrice: 99 }));
  tree = h.render();
  const retry = nodes(tree, e => text(e) === 'Retry same order' && e.props?.onClick)[0]; assert.equal(retry.props.disabled, false);
  const oldWindow = global.window; global.window = { location: { origin: 'http://localhost:3000' } };
  try {
    retry.props.onClick(); await tick(); tree = h.render();
    assert.equal(nodes(tree, e => e.type === 'fieldset')[0].props.disabled, true);
    assert.equal(nodes(tree, e => text(e) === 'Refresh availability' && e.props?.onClick).length, 0);
    nodes(tree, e => text(e) === 'Retry same order' && e.props?.onClick)[0].props.onClick(); await tick();
  } finally { global.window = oldWindow; }
  assert.equal(submitted.length, 3); assert.deepEqual(submitted[1], submitted[0]); assert.deepEqual(submitted[2], submitted[0]);
  assert.deepEqual(Object.keys(submitted[1]).sort(), ['lines', 'requestKey']); assert.deepEqual(submitted[1].lines, [{ presentationId: 1, quantity: 1 }]);
});

test('catalog availability refresh does not change an unchanged order retry key', async () => {
  const submitted = [];
  const changedCatalog = catalogFixture(); changedCatalog.products[0].presentations[0].availableQuantity = 30; changedCatalog.products[0].presentations[0].salePrice = '7.00';
  const h = controlled('app/materials/materials-catalog-client.tsx', 'MaterialsCatalogClient', { initial: catalogFixture() }, {
    createCustomerMaterialOrder: async body => { submitted.push(body); if (submitted.length === 1) { const error = new Error('Review availability'); error.status = 409; throw error; } return { publicUrl: 'http://localhost:3000/public/material-sales/recovered' }; },
    materialCatalog: async () => changedCatalog,
  });
  submit(fillCustomerOrder(h)); await tick();
  let tree = h.render(); await nodes(tree, e => text(e) === 'Refresh availability' && e.props?.onClick)[0].props.onClick(); tree = h.render();
  const oldWindow = global.window; global.window = { location: { origin: 'http://localhost:3000' } };
  try { submit(tree); await tick(); } finally { global.window = oldWindow; }
  assert.equal(submitted.length, 2); assert.deepEqual(submitted[1], submitted[0]);
});

test('catalog package selector and quantity add the chosen presentation at its actual price', () => {
  const initial = catalogFixture();
  initial.products[0].presentations.push({ ...box, salePrice: '100.00', availableQuantity: 3 });
  const h = controlled('app/materials/materials-catalog-client.tsx', 'MaterialsCatalogClient', { initial }, {});
  let tree = h.render();
  nodes(tree, e => e.props?.['aria-label'] === 'Package for White caulking')[0].props.onChange({ target: { value: '2' } });
  tree = h.render();
  const card = nodes(tree, e => e.type === 'article')[0];
  assert.match(text(card), /\$100\.00/); assert.match(text(card), /\/ box/); assert.match(text(card), /3 available/);
  assert.doesNotMatch(text(card), /\$6\.00/);
  nodes(tree, e => e.props?.['aria-label'] === 'Quantity to add for White caulking')[0].props.onChange({ target: { value: '2' } });
  tree = h.render(); nodes(tree, e => text(e) === 'Add to cart' && e.props?.onClick)[0].props.onClick();
  tree = h.render();
  assert.equal(nodes(tree, e => e.props?.['aria-label'] === 'Quantity for White caulking Box of 20')[0].props.value, 2);
  assert.match(text(tree), /\$200\.00/);
  assert.equal(nodes(tree, e => e.props?.['aria-label'] === 'Open cart, 2 items').length, 1);
  nodes(tree, e => e.props?.['aria-label'] === 'Quantity to add for White caulking')[0].props.onChange({ target: { value: '2' } });
  tree = h.render(); assert.equal(nodes(tree, e => text(e) === 'Add to cart' && e.props?.onClick)[0].props.disabled, true);
});

test('catalog browsing requests server pages and filters while preserving off-page cart lines', async () => {
  const initial = catalogFixture(); initial.total = 25;
  const second = { ...catalogFixture(), page: 2, total: 25, products: [{ ...catalogFixture().products[0], id: 2, name: 'Screws', presentations: [{ ...base, id: 3, salePrice: '8.00', availableQuantity: 10 }] }] };
  const requests = [];
  const h = controlled('app/materials/materials-catalog-client.tsx', 'MaterialsCatalogClient', { initial }, {
    materialCatalog: async query => { requests.push(query); return { ...second, page: query.page }; },
  });
  let tree = fillCustomerOrder(h);
  nodes(tree, e => text(e) === 'Next' && e.props?.onClick)[0].props.onClick(); await tick(); tree = h.render();
  assert.equal(requests[0].page, 2); assert.equal(requests[0].pageSize, 24);
  assert.equal(nodes(tree, e => e.type === 'article').length, 1);
  assert.match(text(nodes(tree, e => e.type === 'article')[0]), /Screws/);
  assert.equal(nodes(tree, e => e.props?.['aria-label'] === 'Quantity for White caulking Tube')[0].props.value, 1);
  nodes(tree, e => text(e) === 'Add to cart' && e.props?.onClick)[0].props.onClick(); tree = h.render();
  nodes(tree, e => e.props?.['aria-label'] === 'Filter by category')[0].props.onChange({ target: { value: '1' } }); await tick(); tree = h.render();
  assert.equal(requests[1].categoryId, 1); assert.equal(requests[1].page, 1);
  nodes(tree, e => e.props?.['aria-label'] === 'Search the materials catalog')[0].props.onChange({ target: { value: '  sealant  ' } }); tree = h.render();
  nodes(tree, e => e.type === 'form' && e.props['aria-label'] === 'Search materials')[0].props.onSubmit({ preventDefault() {} }); await tick(); tree = h.render();
  assert.equal(requests[2].q, 'sealant'); assert.equal(requests[2].page, 1);
  assert.equal(nodes(tree, e => e.props?.['aria-label'] === 'Open cart, 2 items').length, 1);
  nodes(tree, e => e.props?.['aria-label'] === 'Remove Screws Tube')[0].props.onClick(); tree = h.render();
  assert.equal(nodes(tree, e => e.props?.['aria-label'] === 'Open cart, 1 items').length, 1);
});

test('catalog refresh looks up all cart IDs independently of current filters and keeps off-page stock', async () => {
  const initial = catalogFixture(); initial.total = 25;
  const second = { ...initial, page: 2, products: [{ ...initial.products[0], id: 2, name: 'Screws', presentations: [{ ...base, id: 3, salePrice: '8.00', availableQuantity: 10 }] }] };
  const requests = [];
  const h = controlled('app/materials/materials-catalog-client.tsx', 'MaterialsCatalogClient', { initial }, {
    createCustomerMaterialOrder: async () => { const error = new Error('Review stock'); error.status = 409; throw error; },
    materialCatalog: async query => { requests.push(query); return query.presentationIds ? { ...initial, products: [...initial.products, ...second.products] } : second; },
  });
  let tree = fillCustomerOrder(h);
  nodes(tree, e => text(e) === 'Next' && e.props?.onClick)[0].props.onClick(); await tick(); tree = h.render();
  nodes(tree, e => text(e) === 'Add to cart' && e.props?.onClick)[0].props.onClick(); tree = h.render();
  submit(tree); await tick(); tree = h.render();
  await nodes(tree, e => text(e) === 'Refresh availability' && e.props?.onClick)[0].props.onClick(); tree = h.render();
  assert.deepEqual(requests.find(query => query.presentationIds), { presentationIds: '1,3', pageSize: 100 });
  assert.equal(nodes(tree, e => e.props?.['aria-label'] === 'Quantity for White caulking Tube')[0].props.max, 60);
  assert.equal(nodes(tree, e => e.props?.['aria-label'] === 'Quantity for Screws Tube')[0].props.max, 10);
  assert.equal(nodes(tree, e => text(e) === 'Reserve and continue to payment' && 'busy' in e.props)[0].props.disabled, false);
});

test('catalog ignores outdated search responses arriving after a newer search', async () => {
  const pending = [];
  const h = controlled('app/materials/materials-catalog-client.tsx', 'MaterialsCatalogClient', { initial: catalogFixture() }, {
    materialCatalog: query => new Promise(resolve => pending.push({ query, resolve })),
  });
  for (const value of ['old search', 'new search']) {
    let tree = h.render(); nodes(tree, e => e.props?.['aria-label'] === 'Search the materials catalog')[0].props.onChange({ target: { value } }); tree = h.render();
    nodes(tree, e => e.type === 'form' && e.props['aria-label'] === 'Search materials')[0].props.onSubmit({ preventDefault() {} });
  }
  const fresh = catalogFixture(); fresh.products[0].name = 'Newest result';
  pending[1].resolve(fresh); await tick();
  pending[0].resolve(catalogFixture()); await tick();
  const card = nodes(h.render(), e => e.type === 'article')[0]; assert.match(text(card), /Newest result/); assert.doesNotMatch(text(card), /White caulking/);
});

test('unknown checkout locks catalog additions and filters until the identical order is recovered', async () => {
  let reads = 0;
  const h = controlled('app/materials/materials-catalog-client.tsx', 'MaterialsCatalogClient', { initial: catalogFixture() }, {
    createCustomerMaterialOrder: async () => { throw new Error('Lost response'); },
    materialCatalog: async () => { reads++; return catalogFixture(); },
  });
  submit(fillCustomerOrder(h)); await tick(); let tree = h.render();
  assert.equal(nodes(tree, e => text(e) === 'Add to cart' && e.props?.onClick)[0].props.disabled, true);
  assert.equal(nodes(tree, e => e.props?.['aria-label'] === 'Filter by category')[0].props.disabled, true);
  nodes(tree, e => e.props?.['aria-label'] === 'Filter by category')[0].props.onChange({ target: { value: '1' } });
  nodes(tree, e => text(e) === 'Add to cart' && e.props?.onClick)[0].props.onClick(); await tick(); tree = h.render();
  assert.equal(reads, 0);
  assert.equal(nodes(tree, e => e.props?.['aria-label'] === 'Quantity for White caulking Tube')[0].props.value, 1);
});

test('unknown checkout cannot be retried from a different signed-in account', async () => {
  const auth = authenticated(); let attempts = 0;
  const h = controlled('app/materials/materials-catalog-client.tsx', 'MaterialsCatalogClient', { initial: catalogFixture() }, {
    createCustomerMaterialOrder: async () => { attempts++; throw new Error('Response lost'); },
  }, auth);
  submit(fillCustomerOrder(h)); await tick();
  const retry = nodes(h.render(), e => text(e) === 'Retry same order' && e.props?.onClick)[0];
  auth.user = { ...customerAccount, id: 9 }; auth.revalidate = async () => auth.user;
  let tree = h.render(); retry.props.onClick(); await tick(); tree = h.render();
  assert.equal(attempts, 1);
  assert.match(nodes(tree, e => e.props?.error?.includes('account or role changed'))[0].props.error, /account or role changed/);
  assert.equal(nodes(tree, e => e.type === 'fieldset')[0].props.disabled, true);
});

test('empty cart availability refresh does not send an unrestricted cart lookup', async () => {
  const reads = [];
  const h = controlled('app/materials/materials-catalog-client.tsx', 'MaterialsCatalogClient', { initial: catalogFixture() }, {
    createCustomerMaterialOrder: async () => { const error = new Error('Review stock'); error.status = 409; throw error; },
    materialCatalog: async query => { reads.push(query); return catalogFixture(); },
  });
  submit(fillCustomerOrder(h)); await tick(); let tree = h.render();
  nodes(tree, e => e.props?.['aria-label'] === 'Remove White caulking Tube')[0].props.onClick(); tree = h.render();
  await nodes(tree, e => text(e) === 'Refresh availability' && e.props?.onClick)[0].props.onClick();
  assert.equal(reads.length, 1); assert.equal('presentationIds' in reads[0], false);
});

test('product details share presentation choice with the card and add without reserving stock', () => {
  const initial = catalogFixture(); initial.products[0].description = 'Long product details'; initial.products[0].presentations.push({ ...box, salePrice: '100.00', availableQuantity: 3 });
  let creates = 0;
  const h = controlled('app/materials/materials-catalog-client.tsx', 'MaterialsCatalogClient', { initial }, { createCustomerMaterialOrder: async () => { creates++; } });
  let tree = h.render(); nodes(tree, e => e.props?.['aria-label'] === 'View White caulking')[0].props.onClick(); tree = h.render();
  assert.match(text(tree), /Long product details/);
  nodes(tree, e => e.props?.['aria-label'] === 'Package for White caulking in product details')[0].props.onChange({ target: { value: '2' } }); tree = h.render();
  assert.equal(nodes(tree, e => e.props?.['aria-label'] === 'Package for White caulking')[0].props.value, 2);
  const addButtons = nodes(tree, e => text(e) === 'Add to cart' && e.props?.onClick); addButtons[addButtons.length - 1].props.onClick(); tree = h.render();
  assert.equal(nodes(tree, e => e.props?.['aria-label'] === 'Quantity for White caulking Box of 20')[0].props.value, 1);
  assert.equal(creates, 0);
});

test('manual payment retry remains identical after refreshing a partially paid sale', async () => {
  const submitted = [], updated = { ...sale, balance: '15.68', paidAmount: '10.00', paymentStatus: 'PARTIAL' };
  const h = controlled('app/warehouse/materials/material-sale-client.tsx', 'MaterialSaleClient', { initial: sale, admin: true }, {
    recordMaterialPayment: async (id, body) => { submitted.push(body); if (submitted.length === 1) throw new Error('Response lost'); return updated; },
    materialSale: async () => updated,
  });
  let tree = h.render(); nodes(tree, e => text(e) === 'Record received payment' && e.props?.onClick)[0].props.onClick(); tree = h.render();
  for (const [label, value] of [['Amount received', '10.00'], ['Method', 'CASH']]) { field(tree, label).props.onChange({ target: { value } }); tree = h.render(); }
  nodes(tree, e => e.type === 'input' && e.props?.type === 'checkbox')[0].props.onChange({ target: { checked: true } }); tree = h.render();
  submit(tree); await tick(); tree = h.render();
  assert.match(text(tree), /Retry same payment/);
  await nodes(tree, e => text(e) === 'Refresh payment status' && e.props?.onClick)[0].props.onClick(); tree = h.render();
  nodes(tree, e => text(e) === 'Retry same payment' && e.props?.onClick)[0].props.onClick(); await tick();
  assert.equal(submitted.length, 2); assert.deepEqual(submitted[1], submitted[0]); assert.equal(submitted[1].amount, 10);
});

test('Code128 labels round-trip through an independent barcode decoder', () => {
  const encode = require('jsbarcode'); const { Code128Reader, BitArray } = require('@zxing/library');
  for (const code of ['MAT-BOX20', 'MAT-A5D132ABC901122ABCD7', '0123456789012']) {
    const target = {}; encode(target, code, { format: 'CODE128', displayValue: false });
    const binary = '0'.repeat(20) + target.encodings.map(e => e.data).join('') + '0'.repeat(20);
    const row = new BitArray(binary.length); [...binary].forEach((bit, index) => { if (bit === '1') row.set(index); });
    assert.equal(new Code128Reader().decodeRow(0, row).getText(), code);
  }
});

test('operators cannot see manual payment controls; admins can', () => {
  const props = { initial: sale, admin: false };
  const operator = controlled('app/warehouse/materials/material-sale-client.tsx', 'MaterialSaleClient', props, {});
  assert.doesNotMatch(text(operator.render()), /Record received payment/);
  const admin = controlled('app/warehouse/materials/material-sale-client.tsx', 'MaterialSaleClient', { ...props, admin: true }, {});
  assert.match(text(admin.render()), /Record received payment/);
});

test('staff can retrieve an older material order from the server by its order number', async () => {
  const queries = [];
  const older = { ...sale, id: 97, code: 'MS-OLDER-ORDER', paymentStatus: 'PAID', balance: '0.00' };
  const h = controlled('app/warehouse/materials/material-sales-client.tsx', 'MaterialSalesClient', { initial: [sale], catalog: catalogFixture(), stores: [store] }, {
    materialSales: async query => { queries.push(query); return [older]; },
  });
  let tree = h.render();
  nodes(tree, e => e.props?.['aria-label'] === 'Find a material order')[0].props.onChange({ target: { value: '  MS-OLDER-ORDER  ' } });
  tree = h.render();
  nodes(tree, e => e.type === 'form' && text(e).includes('Find order'))[0].props.onSubmit({ preventDefault() {} });
  await tick(); tree = h.render();
  assert.deepEqual(queries, [{ q: 'MS-OLDER-ORDER' }]);
  assert.match(text(tree), /MS-OLDER-ORDER/); assert.match(text(tree), /Ready for pickup/);
  assert.equal(nodes(tree, e => e.props?.href === '/warehouse/materials/sales/97').length, 1);
  assert.equal(nodes(tree, e => e.props?.href === '/warehouse/materials/sales/1').length, 0);
});

test('staff refresh retains the applied order search and Clear requests the unfiltered server list', async () => {
  const queries = [];
  const h = controlled('app/warehouse/materials/material-sales-client.tsx', 'MaterialSalesClient', { initial: [sale], catalog: catalogFixture(), stores: [store] }, {
    materialSales: async query => { queries.push(query); return [sale]; },
  });
  let tree = h.render();
  nodes(tree, e => e.props?.['aria-label'] === 'Find a material order')[0].props.onChange({ target: { value: 'Test Customer' } }); tree = h.render();
  nodes(tree, e => e.type === 'form' && text(e).includes('Find order'))[0].props.onSubmit({ preventDefault() {} }); await tick(); tree = h.render();
  nodes(tree, e => e.props?.['aria-label'] === 'Find a material order')[0].props.onChange({ target: { value: 'Unsubmitted search' } }); tree = h.render();
  nodes(tree, e => e.props?.onClick && text(e) === 'Refresh')[0].props.onClick(); await tick(); tree = h.render();
  nodes(tree, e => e.props?.onClick && text(e) === 'Clear')[0].props.onClick(); await tick(); tree = h.render();
  assert.deepEqual(queries, [{ q: 'Test Customer' }, { q: 'Test Customer' }, undefined]);
  assert.equal(nodes(tree, e => e.props?.['aria-label'] === 'Find a material order')[0].props.value, '');
});

const registeredCustomer = { id: 18, name: 'Registered Buyer', email: 'registered@example.test', phone: '+13055550222' };
function customerFieldsHarness(api = {}, auth = authenticated()) {
  const { emptyMaterialSaleCustomer } = loader()('app/warehouse/materials/material-sale-customer-fields.tsx');
  const changes = [];
  const props = { value: emptyMaterialSaleCustomer(), disabled: false, onChange(value) { props.value = value; changes.push(value); } };
  const h = controlled('app/warehouse/materials/material-sale-customer-fields.tsx', 'MaterialSaleCustomerFields', props, api, auth, { effects: true });
  return { ...h, props, changes };
}

test('shared customer input keeps account identity separate from trimmed manual details', () => {
  const { emptyMaterialSaleCustomer, materialSaleCustomerInput } = loader()('app/warehouse/materials/material-sale-customer-fields.tsx');
  const empty = emptyMaterialSaleCustomer();
  assert.equal(materialSaleCustomerInput(empty), null);
  assert.deepEqual(materialSaleCustomerInput({ ...empty, customerName: '  Walk-in  ', customerEmail: '  buyer@example.test ', customerPhone: ' 305 ' }), { customerName: 'Walk-in', customerEmail: 'buyer@example.test', customerPhone: '305' });
  assert.deepEqual(materialSaleCustomerInput({ ...empty, customerName: 'Walk-in' }), { customerName: 'Walk-in', customerEmail: undefined, customerPhone: undefined });
  assert.deepEqual(materialSaleCustomerInput({ ...empty, mode: 'registered', customer: registeredCustomer, customerName: 'Wrong name', customerEmail: 'wrong@example.test' }), { customerUserId: registeredCustomer.id });
  assert.equal(materialSaleCustomerInput({ ...empty, mode: 'registered', customer: null, customerName: 'Not a selected account' }), null);
  assert.equal(materialSaleCustomerInput({ ...empty, mode: 'registered', customer: { ...registeredCustomer, id: 0 } }), null);
});

test('shared customer fields remain editable after StrictMode effect replay', () => {
  const h = customerFieldsHarness(); const tree = h.render();
  h.replayEffects();
  field(tree, 'Customer name').props.onChange({ target: { value: 'Buyer after replay' } });
  assert.equal(h.props.value.customerName, 'Buyer after replay');
  assert.equal(h.changes.length, 1);
});

test('shared customer search suppresses pending results after disable and stale field handlers cannot edit', async () => {
  let resolve;
  const h = customerFieldsHarness({ materialSaleCustomers: () => new Promise(done => { resolve = done; }) });
  field(h.render(), 'Customer type').props.onChange({ target: { value: 'registered' } });
  field(h.render(), 'Find registered customer').props.onChange({ target: { value: 'Buyer' } });
  const before = h.render();
  nodes(before, e => e.props?.onClick && text(e) === 'Search customers')[0].props.onClick(); await tick();
  h.props.disabled = true; h.render();
  resolve([registeredCustomer]); await tick();
  field(before, 'Customer type').props.onChange({ target: { value: 'unregistered' } });
  assert.equal(h.props.value.mode, 'registered');
  h.props.disabled = false;
  assert.doesNotMatch(text(h.render()), /Registered Buyer/);
  assert.equal(field(h.render(), 'Find registered customer').props.value, '');
});

test('shared customer search discards a response after account identity changes', async () => {
  let resolve; const auth = authenticated();
  const h = customerFieldsHarness({ materialSaleCustomers: () => new Promise(done => { resolve = done; }) }, auth);
  field(h.render(), 'Customer type').props.onChange({ target: { value: 'registered' } });
  field(h.render(), 'Find registered customer').props.onChange({ target: { value: 'Buyer' } });
  nodes(h.render(), e => e.props?.onClick && text(e) === 'Search customers')[0].props.onClick(); await tick();
  auth.user = { ...customerAccount, id: 91 }; auth.revalidate = async () => auth.user;
  h.render(); resolve([registeredCustomer]); await tick();
  assert.doesNotMatch(text(h.render()), /Registered Buyer/); assert.equal(h.props.value.customer, null);
});

test('shared customer search verifies the session again before displaying returned contact details', async () => {
  let checks = 0; const auth = authenticated();
  auth.revalidate = async () => ++checks === 1 ? customerAccount : { ...customerAccount, id: 91 };
  const h = customerFieldsHarness({ materialSaleCustomers: async () => [registeredCustomer] }, auth);
  field(h.render(), 'Customer type').props.onChange({ target: { value: 'registered' } });
  field(h.render(), 'Find registered customer').props.onChange({ target: { value: 'Buyer' } });
  nodes(h.render(), e => e.props?.onClick && text(e) === 'Search customers')[0].props.onClick(); await tick();
  assert.equal(checks, 2); assert.doesNotMatch(text(h.render()), /registered@example\.test/);
});

test('unmounted customer fields ignore search completion and previously rendered handlers', async () => {
  let resolve;
  const h = customerFieldsHarness({ materialSaleCustomers: () => new Promise(done => { resolve = done; }) });
  field(h.render(), 'Customer type').props.onChange({ target: { value: 'registered' } });
  field(h.render(), 'Find registered customer').props.onChange({ target: { value: 'Buyer' } });
  const before = h.render();
  nodes(before, e => e.props?.onClick && text(e) === 'Search customers')[0].props.onClick(); await tick();
  h.dispose(); resolve([registeredCustomer]); await tick();
  const previousChanges = h.changes.length;
  field(before, 'Customer type').props.onChange({ target: { value: 'unregistered' } });
  assert.equal(h.changes.length, previousChanges); assert.equal(h.states[0].results.length, 0);
});

function directSaleHarness(api, auth = authenticated()) {
  const h = controlled('app/warehouse/materials/material-sales-client.tsx', 'MaterialSalesClient', { initial: [], catalog: catalogFixture(), stores: [store] }, api, auth);
  const parentRender = h.render;
  let customerFields;
  // Render the shared controlled child with its own hooks, as React does. The
  // parent remains responsible for the selection and submit/session locks.
  h.render = () => {
    function includeCustomerFields(node) {
      if (!node || typeof node !== 'object') return node;
      if (Array.isArray(node)) return node.map(includeCustomerFields);
      if (node.type?.name === 'MaterialSaleCustomerFields') {
        customerFields ||= controlled('app/warehouse/materials/material-sale-customer-fields.tsx', 'MaterialSaleCustomerFields', node.props, api, auth, { effects: true });
        customerFields.setProps(node.props);
        return customerFields.render();
      }
      return node.props?.children ? React.cloneElement(node, {}, includeCustomerFields(node.props.children)) : node;
    }
    return includeCustomerFields(parentRender());
  };
  nodes(h.render(), e => e.props?.onClick && text(e) === 'New sale')[0].props.onClick();
  field(h.render(), 'Store for fulfillment').props.onChange({ target: { value: '1' } });
  nodes(h.render(), e => e.props?.onClick && text(e) === 'Tube · $6.00')[0].props.onClick();
  return h;
}
function setDirectField(h, label, value) { field(h.render(), label).props.onChange({ target: { value } }); }
function createDirectSale(h) { return nodes(h.render(), e => e.type === 'form' && text(e).includes('Create sale for review'))[0].props.onSubmit({ preventDefault() {} }); }
async function chooseRegistered(h) {
  setDirectField(h, 'Customer type', 'registered');
  setDirectField(h, 'Find registered customer', 'registered');
  nodes(h.render(), e => e.props?.onClick && text(e) === 'Search customers')[0].props.onClick(); await tick();
  nodes(h.render(), e => e.type === 'button' && text(e).includes(registeredCustomer.email))[0].props.onClick();
}

test('unregistered direct sale accepts manual contact data without creating or requiring an account', async () => {
  let saved;
  const h = directSaleHarness({ createMaterialSale: async body => { saved = body; return sale; } });
  assert.equal(field(h.render(), 'Customer type').props.value, 'unregistered');
  setDirectField(h, 'Customer name', '  Walk-in Buyer  ');
  setDirectField(h, 'Customer email (optional)', '  walkin@example.test  ');
  setDirectField(h, 'Customer phone (optional)', '  3055551000  ');
  createDirectSale(h); await tick();
  assert.equal(saved.customerName, 'Walk-in Buyer'); assert.equal(saved.customerEmail, 'walkin@example.test'); assert.equal(saved.customerPhone, '3055551000');
  assert.equal('customerUserId' in saved, false); assert.deepEqual(saved.lines, [{ presentationId: 1, quantity: 1 }]);
  assert.match(text(h.render()), /Print invoice/); assert.match(text(h.render()), /No account is required/);
});

test('unregistered direct sale permits no email or phone and still creates an invoice-capable sale', async () => {
  let saved;
  const h = directSaleHarness({ createMaterialSale: async body => { saved = body; return sale; } });
  setDirectField(h, 'Customer name', 'Walk-in Buyer'); createDirectSale(h); await tick();
  assert.equal(saved.customerEmail, undefined); assert.equal(saved.customerPhone, undefined); assert.equal('customerUserId' in saved, false);
  assert.equal(nodes(h.render(), e => e.props?.href === `/warehouse/materials/sales/${sale.id}` && text(e) === 'Open saved sale').length, 1);
});

test('registered direct sale sends only the selected account ID and ignores previous manual values', async () => {
  let saved;
  const h = directSaleHarness({ materialSaleCustomers: async () => [registeredCustomer], createMaterialSale: async body => { saved = body; return sale; } });
  setDirectField(h, 'Customer name', 'Old manual name'); setDirectField(h, 'Customer email (optional)', 'old@example.test');
  await chooseRegistered(h);
  const tree = h.render(); assert.match(text(tree), /Registered Buyer/); assert.match(text(tree), /registered@example\.test/); assert.ok(text(tree).includes(registeredCustomer.phone));
  assert.equal(field(tree, 'Customer name'), undefined); assert.equal(field(tree, 'Customer email (optional)'), undefined);
  createDirectSale(h); await tick();
  assert.equal(saved.customerUserId, registeredCustomer.id);
  for (const key of ['customerName', 'customerEmail', 'customerPhone']) assert.equal(key in saved, false);
});

test('switching from a registered account to an unregistered customer never submits that account ID', async () => {
  let saved;
  const h = directSaleHarness({ materialSaleCustomers: async () => [registeredCustomer], createMaterialSale: async body => { saved = body; return sale; } });
  await chooseRegistered(h); setDirectField(h, 'Customer type', 'unregistered'); setDirectField(h, 'Customer name', 'Different Buyer');
  createDirectSale(h); await tick(); assert.equal(saved.customerName, 'Different Buyer'); assert.equal('customerUserId' in saved, false);
});

test('registered mode blocks creation until a result is selected and Change customer clears the selection', async () => {
  let creates = 0;
  const h = directSaleHarness({ materialSaleCustomers: async () => [registeredCustomer], createMaterialSale: async () => { creates++; return sale; } });
  setDirectField(h, 'Customer type', 'registered'); setDirectField(h, 'Find registered customer', 'registered');
  assert.equal(nodes(h.render(), e => text(e) === 'Create sale for review' && 'busy' in e.props)[0].props.disabled, true);
  createDirectSale(h); await tick(); assert.equal(creates, 0);
  assert.match(nodes(h.render(), e => e.props?.error?.includes('Select a registered customer'))[0].props.error, /Select a registered customer/);
  await chooseRegistered(h); nodes(h.render(), e => e.props?.onClick && text(e) === 'Change customer')[0].props.onClick();
  assert.equal(field(h.render(), 'Find registered customer').props.value, ''); createDirectSale(h); await tick(); assert.equal(creates, 0);
});

test('customer search ignores superseded responses, mode changes and stale result handlers', async () => {
  const pending = new Map();
  const h = directSaleHarness({ materialSaleCustomers: query => new Promise(resolve => pending.set(query, resolve)) });
  setDirectField(h, 'Customer type', 'registered'); setDirectField(h, 'Find registered customer', 'Alpha');
  nodes(h.render(), e => e.props?.onClick && text(e) === 'Search customers')[0].props.onClick(); await tick();
  setDirectField(h, 'Find registered customer', 'Beta');
  nodes(h.render(), e => e.props?.onClick && text(e) === 'Search customers')[0].props.onClick(); await tick();
  const beta = { ...registeredCustomer, name: 'Beta Buyer' }; pending.get('Beta')([beta]); await tick();
  pending.get('Alpha')([{ ...registeredCustomer, name: 'Alpha Buyer' }]); await tick();
  assert.match(text(h.render()), /Beta Buyer/); assert.doesNotMatch(text(h.render()), /Alpha Buyer/);
  const obsolete = nodes(h.render(), e => e.type === 'button' && text(e).includes('Beta Buyer'))[0];
  setDirectField(h, 'Find registered customer', 'Gamma'); nodes(h.render(), e => e.props?.onClick && text(e) === 'Search customers')[0].props.onClick(); await tick();
  setDirectField(h, 'Customer type', 'unregistered'); pending.get('Gamma')([{ ...registeredCustomer, name: 'Gamma Buyer' }]); await tick();
  obsolete.props.onClick(); setDirectField(h, 'Customer type', 'registered');
  assert.doesNotMatch(text(h.render()), /Alpha Buyer|Beta Buyer|Gamma Buyer/);
  assert.equal(field(h.render(), 'Find registered customer').props.value, '');
});

test('customer lookup requires two characters and permits retry after a failed search', async () => {
  let queries = [];
  const h = directSaleHarness({ materialSaleCustomers: async query => { queries.push(query); if (queries.length === 1) throw new Error('Search unavailable'); return [registeredCustomer]; } });
  setDirectField(h, 'Customer type', 'registered'); setDirectField(h, 'Find registered customer', 'a');
  nodes(h.render(), e => e.props?.onClick && text(e) === 'Search customers')[0].props.onClick(); await tick(); assert.deepEqual(queries, []);
  setDirectField(h, 'Find registered customer', '  registered  '); nodes(h.render(), e => e.props?.onClick && text(e) === 'Search customers')[0].props.onClick(); await tick();
  assert.match(nodes(h.render(), e => e.props?.error === 'Search unavailable')[0].props.error, /Search unavailable/);
  nodes(h.render(), e => e.props?.onClick && text(e) === 'Search customers')[0].props.onClick(); await tick();
  assert.deepEqual(queries, ['registered', 'registered']); assert.match(text(h.render()), /Registered Buyer/);
});

test('unknown direct sale outcome locks edits and retries the identical customer, lines and request key', async () => {
  const submitted = [];
  const h = directSaleHarness({ createMaterialSale: async body => { submitted.push(body); if (submitted.length === 1) throw new Error('Response lost'); return sale; } });
  setDirectField(h, 'Customer name', 'Walk-in Buyer');
  const before = h.render(); const originalSubmit = nodes(before, e => e.type === 'form' && text(e).includes('Create sale for review'))[0];
  originalSubmit.props.onSubmit({ preventDefault() {} }); await tick();
  assert.equal(nodes(h.render(), e => e.type === 'fieldset')[0].props.disabled, true);
  // Even a stale form event cannot change the pending request or create another draft.
  field(before, 'Customer name').props.onChange({ target: { value: 'Wrong Buyer' } }); originalSubmit.props.onSubmit({ preventDefault() {} }); await tick(); assert.equal(submitted.length, 1);
  nodes(h.render(), e => e.props?.onClick && text(e) === 'Retry same sale')[0].props.onClick(); await tick();
  assert.equal(submitted.length, 2); assert.deepEqual(submitted[1], submitted[0]); assert.equal(submitted[1].customerName, 'Walk-in Buyer');
  originalSubmit.props.onSubmit({ preventDefault() {} }); await tick(); assert.equal(submitted.length, 2);
});

test('an unknown direct sale cannot be retried with a different staff account', async () => {
  const auth = authenticated(); let creates = 0;
  const h = directSaleHarness({ createMaterialSale: async () => { creates++; throw new Error('Response lost'); } }, auth);
  setDirectField(h, 'Customer name', 'Walk-in Buyer'); createDirectSale(h); await tick();
  const otherStaff = { ...customerAccount, id: 19 }; auth.user = otherStaff; auth.revalidate = async () => otherStaff;
  nodes(h.render(), e => e.props?.onClick && text(e) === 'Retry same sale')[0].props.onClick(); await tick();
  assert.equal(creates, 1); assert.match(nodes(h.render(), e => e.props?.error?.includes('staff account'))[0].props.error, /staff account/);
});

test('public sale projection UI hides warehouse locations and internal notes', () => {
  const { MaterialSaleSummary } = loader()('app/warehouse/materials/material-sale-summary.tsx');
  const fixture = { ...sale, lines: sale.lines.map(line => ({ ...line, storeName: 'Main store' })) };
  const markup = renderToStaticMarkup(React.createElement(MaterialSaleSummary, { sale: fixture, publicView: true }));
  assert.doesNotMatch(markup, /PRIVATE STAFF NOTE|Store #1|Main store/);
  assert.match(markup, /25\.68/); assert.match(markup, /Sales tax/);
  const staff = renderToStaticMarkup(React.createElement(MaterialSaleSummary, { sale: fixture }));
  assert.match(staff, /Main store/);
});

test('an unpaid public order does not become paid because checkout returned', () => {
  const h = controlled('app/public/material-sales/[token]/public-material-sale-client.tsx', 'PublicMaterialSaleClient', { initial: sale, token: 'test-token' }, {});
  const content = text(h.render()); assert.match(content, /Complete your payment/); assert.doesNotMatch(content, /Payment received/);
});

test('customer catalog offers loose units inside closed boxes without exposing stores or purchase costs', () => {
  const catalog = catalogFixture(); catalog.products[0].presentations.push({ ...box, salePrice: '100.00', availableQuantity: 3 });
  const h = controlled('app/materials/materials-catalog-client.tsx', 'MaterialsCatalogClient', { initial: catalog }, {});
  const content = text(h.render()); assert.match(content, /60 available/); assert.doesNotMatch(content, /Main store|Cost per/);
});

test('API routes encode barcodes and keep confirmed physical delivery distinct from checkout', async () => {
  calls.length = 0; const api = loader()('app/api/materials.api.ts');
  await api.materialBarcode('ABC/123'); await api.materialSaleAction(2, 'deliver', 'request-id'); await api.publicMaterialCheckout('token/123');
  await api.customerMaterialOrder(3); await api.cancelCustomerMaterialOrder(3);
  await api.customerMaterialOrders({ page: 2, pageSize: 20 }); await api.materialSales({ q: 'MS-OLDER-ORDER' }); await api.materialSaleCustomers('Registered Buyer');
  assert.equal(calls[0][0], '/api/materials/barcode/ABC%2F123');
  assert.equal(calls[1][0], '/api/materials/sales/2/deliver'); assert.deepEqual(calls[1][1].body, { requestKey: 'request-id' });
  assert.equal(calls[2][0], '/api/materials/public/sales/token%2F123/checkout-session'); assert.equal(calls[2][1].suppressAuthEvent, true);
  assert.equal(calls[3][0], '/api/materials/orders/3'); assert.notEqual(calls[3][1].suppressAuthEvent, true); assert.equal(calls[3][1].cache, 'no-store');
  assert.equal(calls[4][0], '/api/materials/orders/3/cancel'); assert.equal(calls[4][1].method, 'POST'); assert.notEqual(calls[4][1].suppressAuthEvent, true);
  assert.equal(calls[5][0], '/api/materials/orders'); assert.deepEqual(calls[5][1].query, { page: 2, pageSize: 20 }); assert.notEqual(calls[5][1].suppressAuthEvent, true); assert.equal(calls[5][1].cache, 'no-store');
  assert.equal(calls[6][0], '/api/materials/sales'); assert.deepEqual(calls[6][1].query, { q: 'MS-OLDER-ORDER' });
  assert.equal(calls[7][0], '/api/materials/sales/customers'); assert.deepEqual(calls[7][1].query, { q: 'Registered Buyer' }); assert.notEqual(calls[7][1].suppressAuthEvent, true); assert.equal(calls[7][1].cache, 'no-store');
});

(async () => {
  // LAN HTTP exposes getRandomValues, but not the secure-context randomUUID API.
  const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const { webcrypto } = require('node:crypto');
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { getRandomValues: values => webcrypto.getRandomValues(values) } });
  try {
    for (const { name, run } of tests) { await run(); process.stdout.write(`PASS ${name}\n`); }
    process.stdout.write(`${tests.length} material frontend checks passed (LAN HTTP crypto).\n`);
  } finally {
    if (originalCrypto) Object.defineProperty(globalThis, 'crypto', originalCrypto);
    else delete globalThis.crypto;
  }
})().catch(error => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
