// Real form handlers with simulated UI/API boundaries. No network or business-data writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const tests = [], test = (name, run) => tests.push({ name, run });
const jsx = (type, props) => ({ type, props });
const ui = new Proxy({}, { get: (_, name) => name });
const all = (node, predicate) => Array.isArray(node) ? node.flatMap(child => all(child, predicate))
  : node && typeof node === 'object' ? [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)] : [];
const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object'
  ? text(node.props?.children) : node == null || typeof node === 'boolean' ? '' : String(node);
const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };
const event = () => ({ preventDefault() {} });
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
    if (id === 'next/navigation') return { useRouter: () => ({ refresh() {} }) };
    if (id === '@/lib/us-states') return load('lib/us-states.ts');
    if (id === '@/lib/formatters') return load('lib/formatters.ts');
    if (id === '@/lib/installation-flow') return { hasStartedInstallationPayment: () => false, paidBaseFor: () => 0, canEditInstallationBeforePayment: () => true, titleCase: value => value };
    if (id === '@/lib/installation-additional-service') return {};
    if (id === '@/lib/card-payment') return {};
    if (id.startsWith('@/app/api/')) return {};
    throw new Error(`Unmocked dependency ${id}`);
  }, module, module.exports);
  return module.exports;
}
function harness(file, name, props, apiMocks = {}) {
  const states = [], refs = [], memos = [], effects = [], errors = [];
  let si = 0, ri = 0, mi = 0, ei = 0, pending = [], dirty = false;
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
  const Component = load(file, { ...apiMocks, react: hooks, sonner: { toast: { error: value => errors.push(value), success() {} } } })[name];
  const render = () => {
    let tree, iterations = 0;
    do { assert.ok(iterations++ < 12, 'Effects settle'); si = ri = mi = ei = 0; pending = []; dirty = false;
      tree = Component(props); pending.forEach(effect => effect());
    } while (dirty);
    return tree;
  };
  const find = predicate => { const result = all(render(), predicate)[0]; assert.ok(result, 'Expected form control'); return result; };
  const control = id => find(node => node.props?.id === id);
  const button = label => find(node => node.type === 'Button' && text(node).trim() === label);
  return { render, find, control, button, errors,
    input(id, value) { control(id).props.onChange({ target: { value } }); },
    select(id, address) { const input = control(id); assert.equal(input.type, 'AddressAutocomplete'); input.props.onAddressSelect({ ...address }); },
    click(label) { return button(label).props.onClick(event()); },
    submit() { return find(node => node.type === 'form').props.onSubmit(event()); },
  };
}
const oldAddress = { street: '10 Existing Street', city: 'Miami', state: 'FL', postalCode: '33138' };
const selected = { street: '100 Example Avenue', city: 'El Portal', state: 'FL', postalCode: '33138-1234' };
const companyAddress = { street: '200 Company Street', city: 'Miami Gardens', state: 'FL', postalCode: '33056' };
const settings = () => ({ configuration: { ...oldAddress, id: 1, revision: 3, maxDeliveryMiles: '100.00' },
  pricing: { basePrice: '150.00', includedMiles: '20', additionalMilePrice: '2.5' } });
const coverage = () => ({ originStreet: oldAddress.street, originCity: oldAddress.city, originState: 'FL', originPostalCode: oldAddress.postalCode,
  revision: 4, maxDistanceMiles: '100', includedMiles: '20', hoursPerDay: '8', ranges: [{ upToMiles: '100', chargeType: 'FIXED', value: '50', dailyCharge: '20' }] });
function warehouse(saveImpl) {
  const calls = [];
  const h = harness('app/settings/(write)/warehouse-delivery/warehouse-delivery-client.tsx', 'WarehouseDeliveryClient',
    { initialSettings: settings(), companyAddress }, { '@/app/api/warehouse-delivery.api': {
      saveWarehouseDeliverySettings(payload) { calls.push(payload); return saveImpl ? saveImpl(payload) : Promise.resolve({ configuration: { ...payload, revision: 4 },
        pricing: { basePrice: String(payload.basePrice), includedMiles: String(payload.includedMiles), additionalMilePrice: String(payload.additionalMilePrice) } }); },
    } });
  return { ...h, calls };
}
function coverageFixture(saveImpl) {
  const calls = [];
  const h = harness('app/settings/(write)/installation-coverage/installation-coverage-client.tsx', 'InstallationCoverageClient',
    { initialCoverage: coverage(), companyAddress }, { '@/app/api/installation-coverage.api': {
      saveInstallationCoverage(payload) { calls.push(payload); return saveImpl ? saveImpl(payload) : Promise.resolve({ ...payload, revision: 5 }); },
    } });
  return { ...h, calls };
}
async function installation(extraProps = {}, requestImpl) {
  const calls = [], editing = [];
  const h = harness('components/estimates/installation-estimate-panel.tsx', 'InstallationEstimatePanel', {
    estimateId: 10, estimateOwnerId: 20, currentUserId: 20, suggestedAddress: oldAddress, estimateStatus: 'Active', order: null,
    estimatePayments: [], pieces: [{ id: 1, mark: 'A', qty: 1 }], initialJob: null, isPrivileged: false,
    allowAdditionalServiceNotes: false, companyName: 'Company', refreshKey: '1', onRequestEditingChange: value => editing.push(value), ...extraProps,
  }, { '@/app/api/installations.api': {
    getEstimateInstallation: async () => null, getInstallationServices: async () => [],
    requestInstallation(id, payload) { calls.push({ id, payload }); return requestImpl ? requestImpl() : Promise.resolve(null); },
  } });
  h.render(); await flush(); h.click('Request installation price'); h.click('Use a different address');
  return { ...h, calls, editing,
    confirm() { h.find(node => node.type === 'Checkbox').props.onCheckedChange(true); },
    permit(value = 'INDEPENDENT') { h.find(node => node.type === 'RadioGroup').props.onValueChange(value); },
  };
}
function delivery(type = 'STANDARD', createImpl, extraProps = {}) {
  const calls = [];
  const order = { id: 11, idEst: 10, user: { ...oldAddress, role: { name: 'dealer' } }, estimate: {
    customerStreet: oldAddress.street, customerCity: oldAddress.city, customerState: 'FL', customerPostalCode: oldAddress.postalCode,
  }, status: { name: type === 'REDELIVERY' ? 'Delivered' : 'Preparing for pickup' }, deliveries: [], fulfillmentMethod: null };
  const h = harness('components/orders/order-delivery-panel.tsx', 'OrderDeliveryPanel', {
    order, installation: ['INSTALLATION_OVERRIDE', 'PRE_DELIVERY'].includes(type) ? { status: 'DEPOSIT_PAYMENT_PENDING' } : null,
    isOwner: true, isPrivileged: true, isAdmin: true, cardSurchargeFraction: 0.03, canRecordManualPayment: false, paymentTarget: null, ...extraProps,
  }, { '@/app/api/orders.api': {
    createOrderDelivery(id, payload) { calls.push({ id, payload }); return createImpl ? createImpl() : Promise.reject(new Error('Validation remains on server')); },
  } });
  const labels = { STANDARD: 'Calculate delivery', PRE_DELIVERY: 'Add separate pre-delivery', INSTALLATION_OVERRIDE: 'Charge delivery with installation', REDELIVERY: 'Add redelivery charge' };
  return { ...h, calls, open() { h.click(labels[type]); }, async calculate() { h.click('Verify address & create charge'); await flush(); } };
}

test('warehouse selection updates all address fields while preserving prices and revision', async () => {
  const h = warehouse(); h.select('warehouse-street', selected);
  assert.equal(h.control('warehouse-city').props.value, selected.city);
  assert.equal(h.control('warehouse-state').props.value, 'FL');
  assert.equal(h.control('warehouse-zip').props.value, selected.postalCode);
  await h.submit();
  assert.deepEqual(h.calls, [{ ...selected, revision: 3, maxDeliveryMiles: 100, basePrice: 150, includedMiles: 20, additionalMilePrice: 2.5 }]);
});
test('warehouse manual city survives ZIP changes and invalidates pending autocomplete context', async () => {
  const h = warehouse(); h.select('warehouse-street', selected);
  const context = h.control('warehouse-street').props.contextKey;
  h.input('warehouse-city', 'Corrected Municipality'); h.input('warehouse-zip', '33138');
  assert.notEqual(h.control('warehouse-street').props.contextKey, context);
  await h.submit(); assert.equal(h.calls[0].city, 'Corrected Municipality');
});
test('warehouse company address, discard, ZIP and coverage-price validations remain functional', async () => {
  const h = warehouse(); h.click('Use company address'); assert.equal(h.control('warehouse-city').props.value, companyAddress.city);
  h.click('Discard changes'); assert.equal(h.control('warehouse-city').props.value, oldAddress.city);
  h.select('warehouse-street', selected); h.input('warehouse-zip', 'wrong'); await h.submit();
  assert.match(text(h.render()), /Enter a valid ZIP/); assert.equal(h.calls.length, 0);
  h.input('warehouse-zip', selected.postalCode); h.input('warehouse-included', '101'); await h.submit();
  assert.match(text(h.render()), /Included miles cannot exceed/); assert.equal(h.calls.length, 0);
});
test('warehouse disables suggestions while saving', async () => {
  const pending = deferred(), h = warehouse(() => pending.promise); h.select('warehouse-street', selected);
  const saving = h.submit(); assert.equal(h.control('warehouse-street').props.disabled, true);
  pending.resolve(settings()); await saving; assert.equal(h.control('warehouse-street').props.disabled, false);
});
test('coverage selection and manual city changes preserve ranges and send one complete departure address', async () => {
  const h = coverageFixture(); h.select('coverage-street', selected);
  const context = h.control('coverage-street').props.contextKey;
  h.input('coverage-city', 'Corrected Municipality'); h.input('coverage-zip', '33138');
  assert.notEqual(h.control('coverage-street').props.contextKey, context); await h.submit();
  assert.deepEqual(h.calls[0], { revision: 4, originStreet: selected.street, originCity: 'Corrected Municipality', originState: 'FL', originPostalCode: '33138',
    maxDistanceMiles: 100, includedMiles: 20, hoursPerDay: 8, ranges: [{ upToMiles: 100, chargeType: 'FIXED', value: 50, dailyCharge: 20 }] });
});
test('coverage keeps company-address reuse and rejects invalid ZIP, missing range coverage and invalid workdays', async () => {
  const h = coverageFixture(); h.click('Use company address'); assert.equal(h.control('coverage-city').props.value, companyAddress.city);
  h.select('coverage-street', selected); h.input('coverage-zip', '1234'); await h.submit(); assert.equal(h.calls.length, 0);
  assert.match(text(h.render()), /valid ZIP/); h.input('coverage-zip', '33138'); h.input('coverage-to-0', '90');
  await h.submit(); assert.match(text(h.render()), /ranges must cover the entire distance/); assert.equal(h.calls.length, 0);
  h.input('coverage-to-0', '100'); h.input('coverage-hours-per-day', '25'); await h.submit();
  assert.match(text(h.render()), /no more than 24/); assert.equal(h.calls.length, 0);
});
test('coverage disables suggestions during save and preserves input limits', async () => {
  const pending = deferred(), h = coverageFixture(() => pending.promise); h.select('coverage-street', selected);
  assert.equal(h.control('coverage-street').props.maxLength, 150); assert.equal(h.control('coverage-city').props.maxLength, 100);
  const saving = h.submit(); assert.equal(h.control('coverage-street').props.disabled, true); pending.resolve(coverage()); await saving;
});
test('installation selections require explicit confirmation and the existing permit decision', async () => {
  const h = await installation(); h.select('installation-street', selected); await h.click('Calculate installation');
  assert.match(h.errors.at(-1), /Confirm a complete installation address/); assert.equal(h.calls.length, 0);
  h.confirm(); await h.click('Calculate installation'); assert.match(h.errors.at(-1), /permit management/);
  h.permit(); await h.click('Calculate installation');
  assert.deepEqual(h.calls[0], { id: 10, payload: { installationAddress: selected, installationAddressConfirmed: true, permitRequested: false, selectedServices: [] } });
  assert.equal(h.editing.at(-1), false);
});
test('installation rejects non-Florida autocomplete selections without relabeling their state', async () => {
  const h = await installation(); h.select('installation-street', selected); h.confirm();
  h.select('installation-street', { street: '200 Georgia Avenue', city: 'Atlanta', state: 'GA', postalCode: '30301' });
  assert.match(h.errors.at(-1), /only in Florida/);
  assert.equal(h.control('installation-street').props.value, selected.street);
  assert.equal(h.control('installation-city').props.value, selected.city);
  assert.equal(h.find(node => node.type === 'Checkbox').props.checked, false);
  await h.click('Calculate installation'); assert.equal(h.calls.length, 0);
});
test('installation manual city and ZIP changes reset confirmation and cancel stale selection context', async () => {
  const h = await installation(); h.select('installation-street', selected); h.confirm();
  const context = h.control('installation-street').props.contextKey;
  h.input('installation-city', 'Corrected Municipality'); h.input('installation-postalCode', '33138');
  assert.equal(h.find(node => node.type === 'Checkbox').props.checked, false);
  assert.notEqual(h.control('installation-street').props.contextKey, context);
  h.confirm(); h.permit(); await h.click('Calculate installation');
  assert.equal(h.calls[0].payload.installationAddress.city, 'Corrected Municipality');
});
test('installation prevents late suggestions while recalculation is pending and honors the pre-save callback', async () => {
  const pending = deferred(), h = await installation({}, () => pending.promise); h.select('installation-street', selected); h.confirm(); h.permit();
  const calculation = h.click('Calculate installation'); assert.equal(h.control('installation-street').props.disabled, true);
  pending.resolve(null); await calculation;
  const blocked = await installation({ beforeRequest: async () => false }); blocked.select('installation-street', selected); blocked.confirm(); blocked.permit();
  await blocked.click('Calculate installation'); assert.equal(blocked.calls.length, 0);
});
for (const type of ['STANDARD', 'PRE_DELIVERY', 'INSTALLATION_OVERRIDE', 'REDELIVERY']) {
  test(`${type} delivery selection and corrected city go through existing verification`, async () => {
    const h = delivery(type); h.open(); h.select('delivery-street', selected);
    const context = h.control('delivery-street').props.contextKey; h.input('delivery-city', 'Corrected Municipality'); h.input('delivery-zip', '33138');
    assert.notEqual(h.control('delivery-street').props.contextKey, context);
    if (type !== 'STANDARD') {
      await h.calculate(); assert.equal(h.calls.length, 0); assert.match(h.errors.at(-1), /internal reason/);
      h.input('delivery-internal-reason', ' Site access requested ');
    }
    await h.calculate();
    assert.deepEqual(h.calls[0], { id: 11, payload: { ...selected, city: 'Corrected Municipality', postalCode: '33138', type, taxable: false,
      internalReason: type === 'STANDARD' ? undefined : 'Site access requested' } });
    assert.equal(h.errors.at(-1), 'Validation remains on server');
  });
}
test('delivery retains complete-address, two-letter state and ZIP verification', async () => {
  const h = delivery(); h.open(); h.select('delivery-street', selected);
  h.input('delivery-city', ''); await h.calculate(); assert.match(h.errors.at(-1), /entire delivery address/);
  h.input('delivery-city', selected.city); h.input('delivery-state', 'Florida'); await h.calculate(); assert.match(h.errors.at(-1), /two-letter state/);
  h.input('delivery-state', 'FL'); h.input('delivery-zip', '1234'); await h.calculate(); assert.match(h.errors.at(-1), /5-digit ZIP/);
  assert.equal(h.calls.length, 0);
});
test('delivery disables address editing and suggestions while address verification creates its charge', async () => {
  const pending = deferred(), h = delivery('STANDARD', () => pending.promise); h.open(); h.select('delivery-street', selected);
  h.click('Verify address & create charge');
  for (const id of ['delivery-street', 'delivery-city', 'delivery-state', 'delivery-zip']) assert.equal(h.control(id).props.disabled, true);
  pending.resolve({ id: 99, type: 'STANDARD', status: 'CANCELED', amount: '100', destinationStreet: selected.street,
    destinationCity: selected.city, destinationState: 'FL', destinationPostalCode: selected.postalCode }); await flush();
});
test('programmatic warehouse and coverage selections cannot bypass street, city, state or ZIP limits', async () => {
  for (const [fixture, prefix] of [[warehouse, 'warehouse'], [coverageFixture, 'coverage']]) {
    const h = fixture();
    for (const patch of [{ street: 'S'.repeat(151) }, { city: 'C'.repeat(101) }, { state: 'ZZ' }, { postalCode: '33138-12345' }]) {
      h.select(`${prefix}-street`, { ...selected, ...patch }); await h.submit();
      assert.equal(h.calls.length, 0); assert.ok(all(h.render(), node => node.props?.role === 'alert').length);
    }
  }
});
test('programmatic installation selections retain their text but cannot bypass address length or ZIP limits', async () => {
  const h = await installation(); h.permit();
  for (const patch of [{ street: 'S'.repeat(151) }, { city: 'C'.repeat(101) }, { postalCode: '33138-12345' }]) {
    h.select('installation-street', { ...selected, ...patch }); h.confirm(); await h.click('Calculate installation');
    assert.equal(h.calls.length, 0); assert.match(h.errors.at(-1), /150 characters|valid 5-digit ZIP/);
    if (patch.city) assert.equal(h.control('installation-city').props.value.length, 101, 'No silent truncation');
  }
});
test('programmatic delivery selections cannot bypass address length limits', async () => {
  const h = delivery(); h.open();
  for (const patch of [{ street: 'S'.repeat(151) }, { city: 'C'.repeat(101) }]) {
    h.select('delivery-street', { ...selected, ...patch }); await h.calculate();
    assert.equal(h.calls.length, 0); assert.match(h.errors.at(-1), /150 characters/);
  }
});

(async () => {
  for (const { name, run } of tests) { await run(); console.log(`PASS ${name}`); }
  console.log(`${tests.length} address operations tests passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
