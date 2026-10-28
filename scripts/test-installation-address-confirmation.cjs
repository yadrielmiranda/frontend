// Exercise the real installation request handlers with simulated Google corrections.
// Run: node scripts/test-installation-address-confirmation.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const jsx = (type, props) => ({ type, props });
const ui = new Proxy({}, { get: (_, name) => name });
const all = (node, predicate) => Array.isArray(node) ? node.flatMap(child => all(child, predicate))
  : node && typeof node === 'object' ? [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)] : [];
const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object'
  ? text(node.props?.children) : node == null || typeof node === 'boolean' ? '' : String(node);
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const tests = [], test = (name, run) => tests.push({ name, run });
const entered = { street: '1307 SW 57th Ave', city: 'West Miami', state: 'FL', postalCode: '33144' };
const suggested = { ...entered, city: 'Coral Gables', postalCode: '33144-5717' };
const correction = (address = suggested, overrides = {}) => Object.assign(new Error('Google suggests a corrected installation address. Confirm it to continue.'), {
  status: 400, data: { code: 'INSTALLATION_ADDRESS_CONFIRMATION_REQUIRED', suggestedAddress: address }, ...overrides,
});
const resultJob = (address = suggested) => ({ id: 55, status: 'DEPOSIT_PAYMENT_PENDING', installationAddress: address,
  installationAddressConfirmedAt: '2026-10-27T12:00:00Z', quotes: [], revisions: [], appointments: [],
  estimate: { user: { role: { name: 'customer' } } }, permit: null });

function load(relative, mocks = {}) {
  const filename = path.resolve(__dirname, '../src', relative);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)(id => {
    if (id in mocks) return mocks[id];
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id === 'lucide-react' || id.startsWith('@/components/') || id.startsWith('./')) return ui;
    if (id === 'next/link') return { default: 'Link' };
    if (id === '@/lib/installation-flow') return { hasStartedInstallationPayment: () => false, paidBaseFor: () => 0,
      canEditInstallationBeforePayment: () => true, installationStageLabel: () => 'Preliminary price' };
    if (id === '@/lib/installation-additional-service') return load('lib/installation-additional-service.ts');
    throw new Error(`Unexpected dependency ${id}`);
  }, module, module.exports);
  return module.exports;
}

async function fixture({ initialJob = null, save, beforeRequest, ...extraProps } = {}) {
  const states = [], refs = [], memos = [], effects = [], errors = [], successes = [], calls = [], commits = [];
  let si = 0, ri = 0, mi = 0, ei = 0, pending = [], dirty = false;
  const props = { estimateId: 103, estimateOwnerId: 20, currentUserId: 20, suggestedAddress: entered,
    estimateStatus: 'Active', order: null, estimatePayments: [], pieces: [{ id: 1, mark: 'A', qty: 1 }], initialJob,
    isPrivileged: false, allowAdditionalServiceNotes: true, companyName: 'Company', refreshKey: '1',
    beforeRequest, onJobChange: value => commits.push(value), ...extraProps };
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
  const request = (kind, id, payload) => {
    calls.push({ kind, id, payload: structuredClone(payload) });
    return save ? save(payload, calls.length) : calls.length === 1 ? Promise.reject(correction()) : Promise.resolve(resultJob(payload.installationAddress));
  };
  const Component = load('components/estimates/installation-estimate-panel.tsx', {
    react: hooks, sonner: { toast: { error: value => errors.push(value), success: value => successes.push(value) } },
    '@/app/api/installations.api': {
      getEstimateInstallation: async () => initialJob,
      getInstallationServices: async () => [{ id: 7, name: 'Remove bars', availableForRequest: true, billingUnit: 'UNIT', ruleMetric: null }],
      requestInstallation: (id, payload) => request('create', id, payload),
      updateInstallationRequest: (id, payload) => request('update', id, payload),
    },
  }).InstallationEstimatePanel;
  const render = () => {
    let tree, iterations = 0;
    do { assert.ok(iterations++ < 12, 'Effects settle'); si = ri = mi = ei = 0; pending = []; dirty = false;
      tree = Component(props); pending.forEach(effect => effect());
    } while (dirty);
    return tree;
  };
  const find = predicate => { const node = all(render(), predicate)[0]; assert.ok(node, 'Expected form control'); return node; };
  const button = label => find(node => node.type === 'Button' && text(node).trim() === label);
  const click = label => button(label).props.onClick();
  const control = id => find(node => node.props?.id === id);
  render(); await flush(); render();
  click(initialJob ? 'Edit installation' : 'Request installation price'); click('Use this address');
  find(node => node.type === 'RadioGroup').props.onValueChange('COMPANY'); render();
  const calculate = async () => { click(initialJob ? 'Save installation changes' : 'Calculate installation'); await flush(); render(); };
  return { render, find, button, click, control, calculate, errors, successes, calls, commits,
    input(id, value) { control(id).props.onChange({ target: { value } }); render(); },
    update(next) { Object.assign(props, next); render(); },
    unmount() { effects.forEach(effect => effect?.cleanup?.()); },
    hasSuggestion() { return text(render()).includes('Google suggests this installation address'); },
    async accept() { click('Use suggested address and calculate'); await flush(); render(); },
  };
}

test('Google correction requires explicit approval and recalculates with all four corrected fields', async () => {
  const f = await fixture();
  f.control('additional-service-7').props.onCheckedChange(true);
  f.input('additional-service-note-1', 'Keep hardware');
  await f.calculate();
  assert.equal(f.calls.length, 1); assert.equal(f.hasSuggestion(), true); assert.equal(f.errors.length, 0);
  assert.ok(text(f.render()).includes('West Miami')); assert.ok(text(f.render()).includes('Coral Gables'));
  assert.equal(f.button('Calculate installation').props.disabled, true);
  await f.accept();
  assert.equal(f.calls.length, 2);
  assert.deepEqual(f.calls[1].payload, { ...f.calls[0].payload, installationAddress: suggested });
  assert.equal(f.calls[1].payload.installationAddressConfirmed, true);
  assert.equal(f.calls[1].payload.permitRequested, true);
  assert.equal(f.calls[1].payload.selectedServices[0].description, 'Keep hardware');
  assert.deepEqual(f.commits.at(-1).installationAddress, suggested); assert.equal(f.hasSuggestion(), false);
  assert.deepEqual(f.successes, ['Preliminary installation price calculated.']);
});

test('edit preserves the entered address and cancel dismisses the correction without saving', async () => {
  const f = await fixture(); await f.calculate(); f.click('Edit my address');
  assert.equal(f.hasSuggestion(), false); assert.equal(f.control('installation-city').props.value, 'West Miami');
  assert.equal(f.control('installation-postalCode').props.value, '33144');
  assert.equal(f.find(node => node.type === 'Checkbox' && !node.props.id).props.checked, false);
  f.input('installation-city', 'Manual city');
  assert.equal(f.calls.length, 1);
  f.click('Cancel'); assert.ok(text(f.render()).includes('Request installation price')); assert.equal(f.calls.length, 1);
});

test('a failed calculation retains the accepted corrected address for retry or editing', async () => {
  const f = await fixture({ save: (payload, count) => Promise.reject(count === 1 ? correction() : new Error('Route unavailable')) });
  await f.calculate(); await f.accept();
  assert.equal(f.control('installation-city').props.value, 'Coral Gables');
  assert.equal(f.control('installation-postalCode').props.value, '33144-5717');
  assert.equal(f.find(node => node.type === 'Checkbox' && !node.props.id).props.checked, true);
  assert.equal(f.hasSuggestion(), false); assert.deepEqual(f.errors, ['Route unavailable']);
  await f.calculate(); assert.deepEqual(f.calls.at(-1).payload.installationAddress, suggested);
});

test('existing installations use the update endpoint after accepting a correction', async () => {
  const f = await fixture({ initialJob: resultJob(entered) }); await f.calculate(); await f.accept();
  assert.deepEqual(f.calls.map(call => [call.kind, call.id]), [['update', 55], ['update', 55]]);
  assert.deepEqual(f.calls[1].payload.installationAddress, suggested);
  assert.deepEqual(f.successes, ['Installation updated and recalculated.']);
});

test('duplicate clicks cannot submit during the estimate pre-save or confirmation retry', async () => {
  const first = deferred(), retry = deferred(); let saves = 0;
  const f = await fixture({ beforeRequest: () => ++saves === 1 ? first.promise : Promise.resolve(true),
    save: (_, count) => count === 1 ? Promise.reject(correction()) : retry.promise });
  const calculate = f.button('Calculate installation').props.onClick;
  calculate(); calculate(); await flush(); assert.equal(saves, 1); assert.equal(f.calls.length, 0);
  first.resolve(true); await flush(); f.render(); assert.equal(f.calls.length, 1);
  const accept = f.button('Use suggested address and calculate').props.onClick;
  accept(); accept(); await flush(); assert.equal(f.calls.length, 2);
  retry.resolve(resultJob()); await flush(); assert.equal(f.successes.length, 1);
});

test('the prerequisite header save may refresh totals before address verification starts', async () => {
  let f, saves = 0;
  f = await fixture({ beforeRequest: async () => {
    f.update({ refreshKey: `saved-header-totals-${++saves}` });
    return true;
  } });
  await f.calculate(); assert.equal(f.calls.length, 1); assert.equal(f.hasSuggestion(), true);
  await f.accept(); assert.equal(f.calls.length, 2); assert.deepEqual(f.calls[1].payload.installationAddress, suggested);
  assert.equal(f.successes.length, 1);
});

test('a deferred totals refresh during verification does not discard the address correction', async () => {
  const first = deferred(), retry = deferred();
  const f = await fixture({ beforeRequest: async () => true,
    save: (_, count) => count === 1 ? first.promise : retry.promise });
  await f.calculate(); f.update({ refreshKey: 'header-rendered-after-save' });
  first.reject(correction()); await flush();
  assert.equal(f.hasSuggestion(), true);
  f.click('Use suggested address and calculate'); await flush();
  f.update({ refreshKey: 'another-material-total-refresh' });
  retry.resolve(resultJob()); await flush();
  assert.equal(f.calls.length, 2); assert.equal(f.successes.length, 1);
});

test('an actual estimate or address change during prerequisite save still cancels calculation', async () => {
  for (const change of [{ estimateId: 104 }, { suggestedAddress: { ...entered, street: '999 Another Street' } }]) {
    let f;
    f = await fixture({ beforeRequest: async () => { f.update(change); return true; } });
    await f.calculate(); assert.equal(f.calls.length, 0); assert.equal(f.hasSuggestion(), false);
  }
});

test('estimate changes dismiss a correction and invalidate a previously captured acceptance handler', async () => {
  for (const change of [{ estimateId: 104 }, { suggestedAddress: { ...entered, city: 'Miami' } }]) {
    const f = await fixture(); await f.calculate(); const oldAccept = f.button('Use suggested address and calculate').props.onClick;
    f.update(change); oldAccept(); await flush();
    assert.equal(f.hasSuggestion(), false); assert.equal(f.calls.length, 1);
  }
});

test('late correction responses are discarded after estimate change or unmount', async () => {
  for (const unmount of [false, true]) {
    const response = deferred(); const f = await fixture({ save: () => response.promise });
    await f.calculate(); if (unmount) f.unmount(); else f.update({ estimateId: 104 });
    response.reject(correction()); await flush();
    assert.equal(f.hasSuggestion(), false); assert.equal(f.errors.length, 0);
  }
});

test('manual edits invalidate a pending response without losing the new address', async () => {
  const response = deferred(); const f = await fixture({ save: () => response.promise });
  f.click('Use a different address');
  f.control('installation-street').props.onAddressSelect(entered);
  f.find(node => node.type === 'Checkbox' && !node.props.id).props.onCheckedChange(true);
  const city = f.control('installation-city').props.onChange;
  await f.calculate(); city({ target: { value: 'New city' } }); f.render();
  response.reject(correction()); await flush();
  assert.equal(f.hasSuggestion(), false); assert.equal(f.control('installation-city').props.value, 'New city');
});

test('missing, invalid, out-of-state, unchanged and unrelated suggestions remain ordinary errors', async () => {
  const errors = [correction({ ...suggested, street: '' }), correction({ ...suggested, state: 'GA' }),
    correction({ ...suggested, postalCode: 'wrong' }), correction(entered), correction(null),
    correction(suggested, { status: 503 }), correction(suggested, { data: { code: 'OTHER', suggestedAddress: suggested } })];
  for (const error of errors) {
    const f = await fixture({ save: () => Promise.reject(error) }); await f.calculate();
    assert.equal(f.hasSuggestion(), false); assert.deepEqual(f.errors, [error.message]); assert.equal(f.calls.length, 1);
  }
});

test('the existing selection text does not claim Google has already verified the address', async () => {
  const f = await fixture(); assert.ok(text(f.render()).includes('Installation address selected.'));
  assert.ok(!text(f.render()).includes('Installation address confirmed.'));
});

(async () => {
  for (const { name, run } of tests) {
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { console.error(`FAIL ${name}`); throw error; }
  }
  console.log(`${tests.length} installation address confirmation tests passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
