// Exercise the real estimate panel, confirmation dialog, and payment eligibility rules.
// Run: node scripts/test-installation-admin-controls.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const jsx = (type, props) => typeof type === 'function' ? type(props) : { type, props };
const ui = new Proxy({}, { get: (_, name) => name });
const all = (node, predicate) => Array.isArray(node) ? node.flatMap(child => all(child, predicate))
  : node && typeof node === 'object' && !(node.type === 'AlertDialog' && !node.props.open)
    ? [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)] : [];
const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object'
  ? text(node.props?.children) : node == null || typeof node === 'boolean' ? '' : String(node);
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const compiled = new Map();

function load(relative, mocks = {}) {
  const filename = path.resolve(__dirname, '../src', relative);
  if (!compiled.has(filename)) {
    compiled.set(filename, ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText);
  }
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled.get(filename))(id => {
    if (id in mocks) return mocks[id];
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id === '@/components/delete-conf-dialog') return load('components/delete-conf-dialog.tsx', mocks);
    if (id === '@/components/installations/additional-service-fields') return load('components/installations/additional-service-fields.tsx', mocks);
    if (id === 'lucide-react' || id.startsWith('@/components/') || id === './estimate-revision-dialog') return ui;
    if (id === 'next/link') return { default: 'Link' };
    if (id.startsWith('@/lib/')) return load(`${id.slice(2)}.ts`, mocks);
    if (id.startsWith('./')) return load(path.relative(path.resolve(__dirname, '../src'), path.resolve(path.dirname(filename), `${id}.ts`)), mocks);
    throw new Error(`Unexpected dependency ${id}`);
  }, module, module.exports);
  return module.exports;
}

const { isAdminRole } = load('lib/rbac.ts');
const address = { street: '1307 SW 57th Ave', city: 'West Miami', state: 'FL', postalCode: '33144' };
const removeLabel = 'Remove installation and continue with material only';
const waiveLabel = 'Accept measurements and waive deposit';
const jobFixture = (overrides = {}) => ({ id: 55, status: 'DEPOSIT_PAYMENT_PENDING', installationAddress: address,
  installationAddressConfirmedAt: '2026-10-27T12:00:00Z', payments: [], quotes: [], revisions: [], appointments: [],
  estimate: { status: { name: 'Active' }, user: { role: { name: 'dealer' }, dealerMode: 'INTERNAL' } }, permit: null,
  ...overrides });
const paymentFixture = (overrides = {}) => ({ id: 82, type: 'INSTALLATION_DEPOSIT', status: 'PENDING',
  baseAmount: 100, paidAt: null, stripeSessionId: null, ...overrides });

async function fixture({ role = 'admin', initialJob = jobFixture(), ...extraProps } = {}) {
  const states = [], refs = [], memos = [], effects = [], errors = [], successes = [], calls = [], commits = [];
  let si = 0, ri = 0, mi = 0, ei = 0, pending = [], dirty = false;
  const props = { estimateId: 103, estimateOwnerId: 20, currentUserId: 99, suggestedAddress: address,
    estimateStatus: 'Active', order: null, estimatePayments: [], pieces: [{ id: 1, mark: 'A', qty: 1 }], initialJob,
    isPrivileged: role === 'admin' || role === 'operator', isAdmin: isAdminRole(role), canAssist: false,
    allowAdditionalServiceNotes: true, companyName: 'Company', refreshKey: '1',
    onJobChange: value => commits.push(value), ...extraProps };
  const hooks = {
    useState(initial) { const slot = si++; if (!(slot in states)) states[slot] = typeof initial === 'function' ? initial() : initial;
      return [states[slot], next => { const value = typeof next === 'function' ? next(states[slot]) : next;
        if (!Object.is(value, states[slot])) { states[slot] = value; dirty = true; } }]; },
    useRef(initial) { return refs[ri++] ??= { current: initial }; },
    useMemo(fn, deps) { const slot = mi++, previous = memos[slot];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) memos[slot] = { value: fn(), deps };
      return memos[slot].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const slot = ei++, previous = effects[slot];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        previous?.cleanup?.(); effects[slot] = { deps }; pending.push(() => { effects[slot].cleanup = fn(); });
      } },
  };
  const Component = load('components/estimates/installation-estimate-panel.tsx', {
    react: hooks, sonner: { toast: { error: value => errors.push(value), success: value => successes.push(value) } },
    '@/app/api/installations.api': {
      getEstimateInstallation: async () => initialJob,
      getInstallationServices: async () => [{ id: 7, name: 'Remove bars', availableForRequest: true, billingUnit: 'UNIT', ruleMetric: null }],
      updateInstallationRequest: async (id, payload) => {
        calls.push({ kind: 'update', id, payload: structuredClone(payload) });
        return jobFixture({ id, installationAddress: payload.installationAddress });
      },
      cancelInstallation: async id => { calls.push({ kind: 'remove', id }); return null; },
      requestInstallation: async () => { throw new Error('Editing must not create a new installation'); },
    },
  }).InstallationEstimatePanel;
  const render = () => {
    let tree, iterations = 0;
    do { assert.ok(iterations++ < 12, 'Effects settle'); si = ri = mi = ei = 0; pending = []; dirty = false;
      tree = Component(props); pending.forEach(effect => effect());
    } while (dirty);
    return tree;
  };
  const query = predicate => all(render(), predicate)[0];
  const find = predicate => { const node = query(predicate); assert.ok(node, 'Expected control'); return node; };
  const button = (label, type = 'Button') => find(node => node.type === type && text(node).trim() === label);
  const click = (label, type) => { const node = button(label, type); assert.ok(!node.props.disabled, `${label} is enabled`); return node.props.onClick(); };
  render(); await flush(); render();
  return { render, query, find, button, click, calls, commits, errors, successes,
    hasButton: label => Boolean(query(node => node.type === 'Button' && text(node).trim() === label)),
    control: id => find(node => node.props?.id === id),
    update(next) { Object.assign(props, next); render(); },
    async settle() { await flush(); render(); },
  };
}

const tests = [], test = (name, run) => tests.push({ name, run });
const assertNoControls = f => {
  assert.equal(f.hasButton('Edit installation'), false);
  assert.equal(f.hasButton(removeLabel), false);
  assert.deepEqual(f.calls, []);
};

test('estimate form passes the specific admin role to the installation panel', () => {
  const filename = path.resolve(__dirname, '../src/components/estimates/estimate-form.tsx');
  const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const panels = [];
  function visit(node) {
    if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(source) === 'InstallationEstimatePanel') panels.push(node);
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(panels.length, 1);
  const attribute = panels[0].attributes.properties.find(node => ts.isJsxAttribute(node) && node.name.getText(source) === 'isAdmin');
  assert.equal(attribute?.initializer?.expression?.getText(source), 'isAdminRole(role)');
});

test('non-owner admin saves the correct job with the selected address, permit, and services', async () => {
  const f = await fixture();
  assert.equal(f.button(removeLabel).props.disabled, false);
  assert.equal(f.hasButton(waiveLabel), false, 'Admin access does not add deposit waiver permission');
  f.click('Edit installation');
  f.click('Use this address');
  f.find(node => node.type === 'RadioGroup').props.onValueChange('COMPANY');
  f.control('additional-service-7').props.onCheckedChange(true);
  f.find(node => node.type === 'Input' && node.props.type === 'number').props.onChange({ target: { value: '3' } });
  f.control('additional-service-note-1').props.onChange({ target: { value: 'Keep hardware' } });
  f.click('Save installation changes');
  await f.settle();
  assert.deepEqual(f.calls, [{ kind: 'update', id: 55, payload: {
    installationAddress: address, installationAddressConfirmed: true, permitRequested: true,
    selectedServices: [{ serviceId: 7, occurrences: 3, description: 'Keep hardware' }],
  } }]);
  assert.equal(f.commits.at(-1).id, 55);
  assert.deepEqual(f.errors, []);
  assert.deepEqual(f.successes, ['Installation updated and recalculated.']);
});

test('non-owner admin cancels confirmation without removal, then confirms the correct job', async () => {
  const f = await fixture();
  f.click(removeLabel);
  assert.equal(f.find(node => node.type === 'AlertDialog').props.open, true);
  assert.deepEqual(f.calls, []);
  f.click('Cancel', 'AlertDialogCancel');
  assert.equal(f.query(node => node.type === 'AlertDialog'), undefined);
  assert.deepEqual(f.calls, []);
  f.click(removeLabel);
  await f.click('Remove installation', 'AlertDialogAction');
  await f.settle();
  assert.deepEqual(f.calls, [{ kind: 'remove', id: 55 }]);
  assert.equal(f.commits.at(-1), null);
  assert.deepEqual(f.errors, []);
  assert.deepEqual(f.successes, ['Installation removed. The estimate remains material only.']);
  assert.equal(f.hasButton('Request installation price'), true);
});

test('owner retains edit, remove, and existing deposit waiver controls without admin access', async () => {
  const f = await fixture({ role: 'dealer', currentUserId: 20 });
  assert.equal(f.button('Edit installation').props.disabled, false);
  assert.equal(f.button(removeLabel).props.disabled, false);
  assert.equal(f.hasButton(waiveLabel), true);
});

test('network assistant retains edit and waiver access but removal stays disabled and guarded', async () => {
  const f = await fixture({ role: 'dealer', canAssist: true });
  assert.equal(f.button('Edit installation').props.disabled, false);
  assert.equal(f.hasButton(waiveLabel), true);
  assert.equal(f.button(removeLabel).props.disabled, true);
  // Deliberately invoke the disabled control to verify the handler also enforces removal permission.
  f.button(removeLabel).props.onClick();
  await f.click('Remove installation', 'AlertDialogAction');
  assert.deepEqual(f.calls, []);
  assert.deepEqual(f.successes, []);
});

for (const role of ['operator', 'dealer', 'client', 'technician']) {
  test(`non-owner ${role} does not gain edit or remove access`, async () => assertNoControls(await fixture({ role })));
}

test('omitting the new admin flag does not promote a privileged non-owner', async () => {
  assertNoControls(await fixture({ isAdmin: undefined, isPrivileged: true }));
});

for (const location of ['job', 'estimate']) {
  for (const [name, payment] of [
    ['paid', { status: 'PAID' }],
    ['refunded', { status: 'REFUNDED' }],
    ['recorded payment date', { paidAt: '2026-10-27T12:00:00Z' }],
    ['Stripe checkout started', { stripeSessionId: 'cs_existing_checkout' }],
  ]) {
    test(`admin cannot edit or remove when ${location} payment is ${name}`, async () => {
      const payments = [paymentFixture(payment)];
      const f = await fixture(location === 'job' ? { initialJob: jobFixture({ payments }) } : { estimatePayments: payments });
      assertNoControls(f);
    });
  }
}

test('an unpaid payment without a checkout session still permits admin editing', async () => {
  const f = await fixture({ initialJob: jobFixture({ payments: [paymentFixture()] }) });
  assert.equal(f.button('Edit installation').props.disabled, false);
  assert.equal(f.button(removeLabel).props.disabled, false);
});

for (const status of ['MEASUREMENT_SCHEDULING', 'MATERIAL_PAID', 'COMPLETED', 'CANCELED']) {
  test(`admin cannot edit or remove an installation in ${status}`, async () => {
    assertNoControls(await fixture({ initialJob: jobFixture({ status }) }));
  });
}

for (const [name, props] of [
  ['an existing order', { order: { id: 902 } }],
  ['an expired estimate', { estimateStatus: 'Expired' }],
  ['a canceled estimate', { estimateStatus: 'Canceled' }],
]) {
  test(`admin cannot edit or remove with ${name}`, async () => assertNoControls(await fixture(props)));
}

test('removal confirmation rechecks admin permission if it changes while the dialog is open', async () => {
  const f = await fixture();
  f.click(removeLabel);
  f.update({ isAdmin: false });
  await f.click('Remove installation', 'AlertDialogAction');
  assert.deepEqual(f.calls, []);
});

(async () => {
  for (const { name, run } of tests) {
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { console.error(`FAIL ${name}`); throw error; }
  }
  console.log(`${tests.length} installation admin control tests passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
