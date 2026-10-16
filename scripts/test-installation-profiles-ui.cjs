// Functional catalog/modal regressions using real component state and simulated UI/API boundaries.
// Run: node scripts/test-installation-profiles-ui.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const jsx = (type, props) => ({ type, props });
const ui = new Proxy({}, { get: (_, name) => name });
const tests = [];
const test = (name, run) => tests.push({ name, run });
const event = () => ({ preventDefault() {}, stopPropagation() {}, currentTarget: { isConnected: true, focus() {} } });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const closed = node => (['Dialog', 'AlertDialog'].includes(node?.type) && node.props.open === false) || node?.props?.hidden === true;
const all = (node, predicate) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(child => all(child, predicate))
  : [...(predicate(node) ? [node] : []), ...(closed(node) ? [] : all(node.props?.children, predicate))];
const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object'
  ? closed(node) ? '' : text(node.props?.children) : node == null || typeof node === 'boolean' ? '' : String(node);

function load(relative, mocks = {}) {
  const file = path.resolve(__dirname, '../src', relative);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => {
    if (id in mocks) return mocks[id];
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id.startsWith('@/components/ui/') || id === 'lucide-react') return ui;
    if (id === '@/components/delete-conf-dialog') return { DeleteConfirmationDialog: 'DeleteConfirmationDialog' };
    if (id === '@/components/installations/installation-status-badge') return { InstallationStatusBadge: 'InstallationStatusBadge' };
    throw new Error(`Unexpected dependency: ${id}`);
  }, module, module.exports);
  return module.exports;
}

function harness(file, name, initialProps, mocks = {}, currentProps) {
  const states = [], refs = [], memos = [], effects = [];
  let stateIndex = 0, refIndex = 0, memoIndex = 0, effectIndex = 0, pendingEffects = [], dirty = false;
  let props = initialProps;
  const hooks = {
    useState(initial) { const slot = stateIndex++; if (!(slot in states)) states[slot] = typeof initial === 'function' ? initial() : initial;
      return [states[slot], next => { const value = typeof next === 'function' ? next(states[slot]) : next;
        if (!Object.is(value, states[slot])) { states[slot] = value; dirty = true; } }]; },
    useRef(initial) { return refs[refIndex++] ??= { current: initial }; },
    useMemo(fn, deps) { const slot = memoIndex++, previous = memos[slot];
      if (!previous || deps.some((value, index) => !Object.is(value, previous.deps[index]))) memos[slot] = { deps, value: fn() };
      return memos[slot].value; },
    useCallback(fn, deps) { return hooks.useMemo(fn, deps); },
    useEffect(fn, deps) { const slot = effectIndex++, previous = effects[slot];
      if (!previous || deps.some((value, index) => !Object.is(value, previous.deps[index]))) {
        previous?.cleanup?.(); effects[slot] = { deps }; pendingEffects.push(() => { effects[slot].cleanup = fn(); });
      } },
  };
  const Component = load(file, { ...mocks, react: hooks })[name];
  const render = () => {
    let tree, count = 0;
    do { assert.ok(count++ < 12, 'Effects settle'); stateIndex = refIndex = memoIndex = effectIndex = 0;
      pendingEffects = []; dirty = false; tree = Component(currentProps ? currentProps() : props); pendingEffects.forEach(effect => effect());
    } while (dirty);
    return tree;
  };
  const find = predicate => { const value = all(render(), predicate)[0]; assert.ok(value, 'Expected control exists'); return value; };
  const control = id => find(node => node.props?.id === id);
  const button = label => find(node => ['Button', 'AlertDialogAction', 'AlertDialogCancel', 'button'].includes(node.type) &&
    (node.props?.['aria-label'] === label || text(node).trim() === label));
  const select = (id, value) => {
    const native = all(render(), node => node.type === 'select' && node.props?.id === id)[0];
    if (native) return native.props.onChange({ target: { value } });
    return find(node => node.type === 'Select' && (node.props?.id === id || all(node, child => child.props?.id === id).length)).props.onValueChange(value);
  };
  const click = label => {
    const target = button(label);
    if (target.props.onClick) return target.props.onClick(event());
    assert.equal(target.type, 'AlertDialogCancel', 'Only Radix cancel has an implicit close action');
    return find(node => node.type === 'AlertDialog' && node.props.open &&
      all(node, child => child.type === 'AlertDialogCancel' && text(child).trim() === label).length).props.onOpenChange(false);
  };
  return { render, find, control, button, select, click,
    input(id, value) { control(id).props.onChange({ target: { value } }); },
    update(next) { props = { ...props, ...next }; render(); },
  };
}

const formatters = load('lib/formatters.ts');
const pricing = load('lib/installation-profile-pricing.ts', { './formatters': formatters });
const pricingMocks = { '@/lib/installation-profile-pricing': pricing };
function service(id, overrides = {}) {
  return { id, name: `Service ${String(id).padStart(3, '0')}`, description: id === 37 ? 'Hurricane removal' : `Installation ${id}`,
    billingUnit: 'UNIT', ruleMetric: id % 2 ? 'WIDTH' : 'HEIGHT', baseRate: '100.1234', minimumCharge: '500', sortOrder: id,
    availableForRequest: true, availableForField: true, isActive: id % 4 !== 0,
    rules: [{ id: id * 100 + 1, serviceId: id, minValue: `${id * 100}`, maxValue: `${id * 100 + 32}`,
      minInclusive: true, maxInclusive: false, rate: '150.1250', estimatedMinutes: null, sortOrder: 0, isActive: true },
    { id: id * 100 + 2, serviceId: id, minValue: null, maxValue: null, minInclusive: true, maxInclusive: false,
      rate: '90.50', estimatedMinutes: '0', sortOrder: 1, isActive: false }], ...overrides };
}
const catalog = () => Array.from({ length: 57 }, (_, index) => service(index + 1));
function profile(id, overrides = {}) {
  return { id, name: `Profile ${String(id).padStart(3, '0')}`, adjustmentPercent: '0', adjustments: [], minimumCharge: '500',
    isDefault: id === 2, isActive: id % 4 !== 0, sortOrder: id, _count: { roles: id % 3, users: id % 7, quotes: 0 }, ...overrides };
}
const profiles = () => Array.from({ length: 57 }, (_, index) => profile(index + 1));
const retainedAdjustments = () => [
  { serviceId: 1, ruleId: null, type: 'PERCENT', value: '20' },
  { serviceId: 1, ruleId: 101, type: 'AMOUNT', value: '7.5' },
  { serviceId: 53, ruleId: 5302, type: 'PERCENT', value: '-5', legacyLineRounding: true },
  { serviceId: 54, ruleId: null, type: 'AMOUNT', value: '12' },
  { serviceId: 999, ruleId: 99901, type: 'AMOUNT', value: '2' },
];
function rateFixture(initialServices = catalog(), initialAdjustments = {}, disabled = false, currentProps) {
  let value = structuredClone(initialAdjustments); const changes = [];
  const h = harness('components/installations/installation-profile-rates-editor.tsx', 'InstallationProfileRatesEditor',
    { services: initialServices, adjustments: value, disabled, onChange(next) { value = next; changes.push(structuredClone(next)); h.update({ adjustments: value }); } },
    pricingMocks, currentProps);
  return { ...h, changes, value: () => value,
    names: () => all(h.render(), node => /^((Show|Hide) rates for) /.test(node.props?.['aria-label'] ?? '')).map(node => node.props['aria-label'].replace(/^(Show|Hide) rates for /, '')),
    choose(key, type) { h.select(`profile-rate-type-${key}`, type); },
    row(key) { return h.find(node => node.type === 'tr' && all(node, child => child.props?.id === `profile-rate-type-${key}`).length); },
  };
}
function profileFixture(initialProfiles = profiles(), canEdit = true, implementations = {}, services = catalog()) {
  const requests = [], errors = [], successes = [];
  const api = Object.fromEntries(['createInstallationProfile', 'updateInstallationProfile', 'deleteInstallationProfile'].map(name => [name, async (...args) => {
    requests.push([name, ...structuredClone(args)]);
    if (implementations[name]) return implementations[name](...args);
    if (name === 'deleteInstallationProfile') return { deleted: true };
    const id = name === 'createInstallationProfile' ? 1000 : args[0];
    return { ...(initialProfiles.find(item => item.id === id) ?? profile(id)), ...args.at(-1), id };
  }]));
  const h = harness('app/settings/(write)/installation-profiles/installation-profiles-client.tsx', 'InstallationProfilesClient',
    { initialProfiles, services, canEdit }, { ...pricingMocks,
      '@/components/installations/installation-profile-rates-editor': { InstallationProfileRatesEditor: 'RatesEditor' },
      '@/app/api/installations.api': api, sonner: { toast: { success: value => successes.push(value), error: value => errors.push(value) } } });
  const dialog = () => h.find(node => node.type === 'Dialog');
  return { ...h, requests, errors, successes, dialog, editorOpen: () => dialog().props.open,
    names: () => all(h.render(), node => /^(Edit|View) /.test(node.props?.['aria-label'] ?? '')).map(node => node.props['aria-label'].replace(/^(Edit|View) /, '')),
    rates: () => h.find(node => node.type === 'RatesEditor'),
    async save() { await h.button('Save profile').props.onClick(event()); await flush(); },
    mountRates() { return rateFixture([], {}, false, () => h.find(node => node.type === 'RatesEditor').props); },
  };
}

test('57 service accordions paginate in catalog order without rendering hidden rate inputs', () => {
  const f = rateFixture(catalog().reverse());
  assert.deepEqual(f.names(), catalog().slice(0, 10).map(item => item.name));
  assert.equal(all(f.render(), node => node.props?.id?.startsWith('profile-rate-type-')).length, 0);
  const names = [...f.names()];
  while (!f.button('Next services page').props.disabled) { f.click('Next services page'); names.push(...f.names()); }
  assert.deepEqual(names, catalog().map(item => item.name));
  f.select('profile-service-page-size', '20'); assert.deepEqual(f.names(), catalog().slice(0, 20).map(item => item.name));
  f.select('profile-service-page-size', '50'); assert.equal(f.names().length, 50);
  f.click('Next services page'); assert.equal(f.names().length, 7);
});

test('rate search finds off-page names, descriptions and rule labels without mutating adjustments', () => {
  const f = rateFixture(); f.click('Next services page');
  f.input('profile-service-search', '  SERVICE 057  '); assert.deepEqual(f.names(), ['Service 057']);
  f.input('profile-service-search', 'HuRrIcAnE'); assert.deepEqual(f.names(), ['Service 037']);
  f.input('profile-service-search', '5732'); assert.deepEqual(f.names(), ['Service 057']);
  f.input('profile-service-search', 'no matches'); assert.deepEqual(f.names(), []);
  f.input('profile-service-search', ''); assert.equal(f.names()[0], 'Service 001');
  assert.equal(f.changes.length, 0);
});

test('collapse, filters and pages retain every hidden adjustment and independent rule mapping', () => {
  const saved = profile(1, { adjustments: retainedAdjustments() });
  const initial = pricing.profileAdjustmentDrafts(saved), services = catalog(), before = structuredClone(services);
  const f = rateFixture(services, initial);
  f.click('Show rates for Service 001');
  f.input('profile-rate-value-1:base', '22.125');
  assert.ok(text(f.row('1:101')).includes('$157.625'), 'Rule uses its own amount, excluding the service percentage');
  f.click('Hide rates for Service 001');
  f.click('Next services page'); f.input('profile-service-search', 'Service 053');
  f.click('Show rates for Service 053'); assert.equal(f.control('profile-rate-value-53:5302').props.value, '-5');
  f.choose('53:5301', 'AMOUNT'); f.input('profile-rate-value-53:5301', '9.25');
  f.select('profile-service-adjustment-filter', 'adjusted'); f.input('profile-service-search', '');
  assert.deepEqual(f.names(), ['Service 001', 'Service 053', 'Service 054']);
  f.input('profile-service-search', 'no matches'); assert.deepEqual(f.names(), []);
  f.select('profile-service-adjustment-filter', 'all'); f.input('profile-service-search', 'Service 001');
  f.click('Show rates for Service 001'); assert.equal(f.control('profile-rate-value-1:base').props.value, '22.125');
  assert.deepEqual(f.value(), { ...initial, '1:base': { ...initial['1:base'], value: '22.125' },
    '53:5301': { serviceId: 53, ruleId: 5301, type: 'AMOUNT', value: '9.25' } });
  assert.deepEqual(services, before, 'Browsing and editing the profile never changes provider catalog records');
});

test('removing a visible increase never deletes hidden or inactive rule adjustments', () => {
  const initial = pricing.profileAdjustmentDrafts(profile(1, { adjustments: retainedAdjustments() }));
  const f = rateFixture(catalog(), initial); f.select('profile-service-adjustment-filter', 'adjusted');
  f.click('Show rates for Service 001'); f.choose('1:base', 'BASE'); f.choose('1:101', 'BASE');
  assert.deepEqual(f.names(), ['Service 053', 'Service 054']);
  const { '1:base': removedBase, '1:101': removedRule, ...retained } = initial;
  assert.deepEqual(f.value(), retained);
});

test('the adjusted filter keeps zero and temporarily empty values visible while editing', () => {
  const f = rateFixture([service(1)], { '1:base': { serviceId: 1, ruleId: null, type: 'AMOUNT', value: '5' } });
  f.select('profile-service-adjustment-filter', 'adjusted'); f.click('Show rates for Service 001');
  f.input('profile-rate-value-1:base', '');
  assert.deepEqual(f.names(), ['Service 001']); assert.equal(f.control('profile-rate-value-1:base').props.value, '');
  assert.ok(text(f.row('1:base')).includes('—'), 'A temporary blank remains visibly incomplete');
  f.input('profile-rate-value-1:base', '0');
  assert.deepEqual(f.names(), ['Service 001']); assert.equal(f.control('profile-rate-value-1:base').props.value, '0');
  f.click('Hide rates for Service 001'); f.click('Show rates for Service 001');
  assert.equal(f.control('profile-rate-value-1:base').props.value, '0');
  f.input('profile-rate-value-1:base', '7.125'); assert.equal(f.value()['1:base'].value, '7.125');
});

test('opening another service shows at most one table and disabled edits stay unavailable', () => {
  const f = rateFixture(catalog(), { '1:base': { serviceId: 1, ruleId: null, type: 'AMOUNT', value: '3' } }, true);
  f.click('Show rates for Service 001');
  assert.equal(f.control('profile-rate-value-1:base').props.disabled, true);
  assert.ok(all(f.render(), node => node.type === 'Select').every(node => node.props.disabled));
  f.choose('1:base', 'PERCENT'); f.input('profile-rate-value-1:base', '99');
  assert.equal(f.value()['1:base'].type, 'AMOUNT'); assert.equal(f.value()['1:base'].value, '3');
  f.click('Show rates for Service 002');
  assert.equal(all(f.render(), node => node.type === 'table').length, 1);
  assert.equal(all(f.render(), node => node.props?.id === 'profile-rate-type-1:base').length, 0);
  assert.equal(f.changes.length, 0);
});

test('57 profiles paginate and searching or changing status resets to the first matching page', () => {
  const f = profileFixture(profiles().reverse());
  assert.equal(f.editorOpen(), false);
  assert.deepEqual(f.names(), profiles().slice(0, 20).map(item => item.name));
  const seen = [...f.names()];
  f.click('Next page'); seen.push(...f.names()); f.click('Next page'); seen.push(...f.names());
  assert.deepEqual(seen, profiles().map(item => item.name));
  assert.equal(f.button('Next page').props.disabled, true);
  f.input('installation-profile-search', '  PROFILE 057  '); assert.deepEqual(f.names(), ['Profile 057']);
  f.input('installation-profile-search', 'no match'); assert.deepEqual(f.names(), []);
  f.input('installation-profile-search', ''); assert.equal(f.names()[0], 'Profile 001');
  f.click('Next page'); f.select('installation-profile-status-filter', 'inactive');
  assert.deepEqual(f.names(), profiles().filter(item => !item.isActive).map(item => item.name));
  f.select('installation-profile-status-filter', 'active');
  assert.deepEqual(f.names(), profiles().filter(item => item.isActive).slice(0, 20).map(item => item.name));
  f.select('installation-profile-status-filter', 'all'); f.select('installation-profile-page-size', '50');
  assert.equal(f.names().length, 50); f.click('Next page'); assert.equal(f.names().length, 7);
  f.select('installation-profile-page-size', '10'); assert.equal(f.names().length, 10); assert.equal(f.names()[0], 'Profile 001');
  assert.equal(f.requests.length, 0);
});

test('profile modal cancels cleanly, keeps dirty drafts on request, and discards only after confirmation', () => {
  const original = profile(1, { adjustments: retainedAdjustments() }), before = structuredClone(original);
  const f = profileFixture([original]);
  f.click('Edit Profile 001'); f.click('Cancel'); assert.equal(f.editorOpen(), false);
  f.click('Edit Profile 001'); f.input('profile-name', 'Uncommitted name'); f.input('profile-minimum', '650');
  const next = { ...f.rates().props.adjustments, '1:base': { serviceId: 1, ruleId: null, type: 'PERCENT', value: '35' } };
  f.rates().props.onChange(next);
  f.click('Cancel'); assert.equal(f.editorOpen(), true); f.click('Keep editing');
  assert.equal(f.control('profile-name').props.value, 'Uncommitted name');
  assert.equal(f.rates().props.adjustments['1:base'].value, '35');
  f.dialog().props.onOpenChange(false); f.click('Discard changes'); assert.equal(f.editorOpen(), false);
  assert.deepEqual(f.names(), ['Profile 001']); f.click('Edit Profile 001');
  assert.equal(f.control('profile-name').props.value, 'Profile 001');
  assert.equal(f.control('profile-minimum').props.value, '500');
  assert.equal(f.rates().props.adjustments['1:base'].value, '20');
  assert.deepEqual(original, before); assert.equal(f.requests.length, 0);
});

test('browsing rate search, accordion and pages alone leaves the profile clean', () => {
  const f = profileFixture([profile(1, { adjustments: retainedAdjustments() })]);
  f.click('Edit Profile 001'); const rates = f.mountRates();
  rates.click('Show rates for Service 001'); rates.click('Hide rates for Service 001');
  rates.click('Next services page'); rates.input('profile-service-search', 'Service 053');
  rates.select('profile-service-adjustment-filter', 'adjusted'); rates.click('Show rates for Service 053');
  f.click('Cancel'); assert.equal(f.editorOpen(), false);
  assert.equal(all(f.render(), node => node.type === 'AlertDialog' && node.props.open).length, 0);
  assert.equal(f.requests.length, 0);
});

test('saving with the rate editor filtered persists hidden, inactive, independent and legacy targets', async () => {
  const initial = profile(1, { adjustments: retainedAdjustments() }), before = structuredClone(initial);
  const f = profileFixture([initial]); f.click('Edit Profile 001'); const rates = f.mountRates();
  rates.click('Show rates for Service 001'); rates.input('profile-rate-value-1:base', '22.125');
  rates.input('profile-service-search', 'Service 053'); rates.click('Show rates for Service 053');
  rates.choose('53:5301', 'AMOUNT'); rates.input('profile-rate-value-53:5301', '9.25');
  rates.select('profile-service-adjustment-filter', 'adjusted'); rates.input('profile-service-search', 'no matching service');
  f.input('profile-name', '  Renamed  '); await f.save();
  assert.equal(f.editorOpen(), false); assert.equal(f.requests.length, 1);
  const [method, id, payload] = f.requests[0]; assert.equal(method, 'updateInstallationProfile'); assert.equal(id, 1);
  assert.equal(payload.name, 'Renamed'); assert.equal(payload.minimumCharge, 500);
  assert.equal(payload.adjustmentPercent, undefined);
  const byKey = Object.fromEntries(payload.adjustments.map(item => [pricing.profileAdjustmentKey(item.serviceId, item.ruleId), item]));
  assert.deepEqual(byKey, {
    '1:base': { serviceId: 1, ruleId: null, type: 'PERCENT', value: 22.125 },
    '1:101': { serviceId: 1, ruleId: 101, type: 'AMOUNT', value: 7.5 },
    '53:5302': { serviceId: 53, ruleId: 5302, type: 'PERCENT', value: -5 },
    '54:base': { serviceId: 54, ruleId: null, type: 'AMOUNT', value: 12 },
    '999:99901': { serviceId: 999, ruleId: 99901, type: 'AMOUNT', value: 2 },
    '53:5301': { serviceId: 53, ruleId: 5301, type: 'AMOUNT', value: 9.25 },
  });
  assert.deepEqual(initial, before);
});

test('pending profile save blocks duplicate submits and all modal dismissal paths, then preserves failed draft', async () => {
  const pending = deferred(); let calls = 0;
  const f = profileFixture([], true, { createInstallationProfile: async payload => ++calls === 1 ? pending.promise : profile(1000, payload) });
  f.click('New profile'); f.input('profile-name', '  Contractor  '); f.input('profile-minimum', '625.25');
  f.rates().props.onChange({ '1:101': { serviceId: 1, ruleId: 101, type: 'AMOUNT', value: '15' } });
  const save = f.button('Save profile').props.onClick;
  const first = save(event()); await save(event()); assert.equal(f.requests.length, 1);
  assert.equal(f.button('Cancel').props.disabled, true); assert.equal(f.button('Close profile').props.disabled, true);
  assert.equal(f.rates().props.disabled, true);
  f.dialog().props.onOpenChange(false);
  const content = f.find(node => node.type === 'DialogContent');
  content.props.onEscapeKeyDown?.(event()); content.props.onInteractOutside?.(event());
  assert.equal(f.editorOpen(), true);
  pending.reject(new Error('Cannot save profile')); await first; await flush();
  assert.deepEqual(f.errors, ['Cannot save profile']); assert.equal(f.control('profile-name').props.value, '  Contractor  ');
  assert.equal(f.control('profile-minimum').props.value, '625.25'); assert.equal(f.rates().props.adjustments['1:101'].value, '15');
  assert.deepEqual(f.names(), []); await f.save();
  assert.equal(f.editorOpen(), false); assert.deepEqual(f.names(), ['Contractor']); assert.equal(f.requests.length, 2);
});

test('setting another default refreshes the list without altering other profile data', async () => {
  const initial = [profile(1), profile(2)], before = structuredClone(initial), f = profileFixture(initial);
  f.click('Edit Profile 001'); f.control('profile-default').props.onCheckedChange(true); await f.save();
  assert.equal(f.requests[0][2].isDefault, true);
  f.click('Edit Profile 002'); assert.equal(f.control('profile-default').props.checked, false); f.click('Cancel');
  f.click('Edit Profile 001'); assert.equal(f.control('profile-default').props.checked, true);
  assert.deepEqual(initial, before);
});

test('invalid hidden adjustments and provider minimum never reach the save API', async () => {
  const f = profileFixture([]); f.click('New profile'); await f.save();
  f.input('profile-name', 'Retail'); f.input('profile-minimum', '-1'); await f.save();
  f.input('profile-minimum', '100.123'); await f.save(); f.input('profile-minimum', '100');
  f.rates().props.onChange({ '57:5701': { serviceId: 57, ruleId: 5701, type: 'AMOUNT', value: '-5' } });
  const rates = f.mountRates(); rates.input('profile-service-search', 'no matches');
  await f.save(); assert.equal(f.requests.length, 0); assert.equal(f.errors.length, 4);
  assert.equal(f.editorOpen(), true);
});

test('deleting or deactivating the only row on the last page returns to a populated page', async () => {
  for (const deleted of [true, false]) {
    const initial = Array.from({ length: 21 }, (_, index) => profile(index + 1, { isActive: true }));
    const f = profileFixture(initial, true, { deleteInstallationProfile: async id => deleted ? { deleted: true } : { ...initial.find(item => item.id === id), isActive: false } });
    assert.equal(f.button('Delete Profile 002').props.disabled, true, 'Default profile remains protected');
    f.select('installation-profile-status-filter', 'active'); f.click('Next page'); assert.deepEqual(f.names(), ['Profile 021']);
    f.click('Delete Profile 021'); await f.click('Continue'); await flush();
    assert.equal(f.names().length, 20); assert.equal(f.names()[0], 'Profile 001');
    assert.deepEqual(f.requests, [['deleteInstallationProfile', 21]]);
  }
});

test('failed profile deletion stays open for retry and blocks a second in-flight request', async () => {
  const pending = deferred(); let calls = 0;
  const f = profileFixture([profile(1)], true, { deleteInstallationProfile: async () => ++calls === 1 ? pending.promise : { deleted: true } });
  f.click('Delete Profile 001'); const confirm = f.button('Continue').props.onClick;
  const first = confirm(event()); await confirm(event()); assert.equal(f.requests.length, 1);
  f.find(node => node.type === 'AlertDialog' && node.props.open).props.onOpenChange(false);
  assert.equal(all(f.render(), node => node.type === 'AlertDialog' && node.props.open).length, 1);
  pending.reject(new Error('Cannot remove profile')); await first; await flush();
  assert.deepEqual(f.errors, ['Cannot remove profile']); assert.deepEqual(f.names(), ['Profile 001']);
  await f.click('Continue'); await flush(); assert.deepEqual(f.names(), []); assert.equal(f.requests.length, 2);
});

test('read-only profile users can search and paginate but cannot open or mutate financial editors', () => {
  const f = profileFixture(profiles(), false, {}, []);
  assert.equal(all(f.render(), node => node.type === 'RatesEditor').length, 0);
  assert.equal(all(f.render(), node => /^(Edit|Delete|View) /.test(node.props?.['aria-label'] ?? '') ||
    (node.type === 'Button' && ['New profile', 'Save profile'].includes(text(node).trim()))).length, 0);
  assert.equal(all(f.render(), node => ['Checkbox', 'Textarea'].includes(node.type)).length, 0);
  assert.equal(all(f.render(), node => node.type === 'Input').length, 1, 'Only search is editable');
  f.click('Next page'); f.input('installation-profile-search', 'PROFILE 057');
  assert.ok(text(f.render()).includes('Profile 057')); assert.doesNotMatch(text(f.render()), /NaN|\$undefined/);
  assert.equal(f.requests.length, 0);
});

test('rate previews round exact half steps like backend Decimal and leave incomplete input unresolved', () => {
  const cases = [
    [1.001, 'PERCENT', '15', 1.1512],
    [1.15, 'PERCENT', '0.1', 1.1512],
    [1.1438, 'PERCENT', '75', 2.0017],
    [1.001, 'PERCENT', '-5', 0.951],
    [0.0001, 'PERCENT', '-50', 0.0001],
    [0.0001, 'PERCENT', '49.9999', 0.0001],
    [0.0001, 'PERCENT', '50', 0.0002],
    [100.1234, 'AMOUNT', '0.0001', 100.1235],
    [0, 'AMOUNT', '0.1234', 0.1234],
    [99999999.9999, 'PERCENT', '999999.9999', 1000099999898.9999],
  ];
  for (const [base, type, value, expected] of cases) {
    assert.equal(pricing.adjustedProfileRate(base, { serviceId: 1, ruleId: null, type, value }), expected, `${base} ${type} ${value}`);
  }
  for (const value of ['', '-', '1.', 'NaN', 'Infinity', '1e1000', '0.12345']) {
    assert.equal(pricing.adjustedProfileRate(1.001, { serviceId: 1, ruleId: null, type: 'PERCENT', value }), null, value);
  }
  const f = rateFixture([service(1, { baseRate: '1.0010' })]);
  f.click('Show rates for Service 001'); f.choose('1:base', 'PERCENT'); f.input('profile-rate-value-1:base', '15');
  assert.equal(text(all(f.row('1:base'), node => node.type === 'td').at(-1)), '$1.1512');
  assert.equal(text(all(f.row('1:101'), node => node.type === 'td').at(-1)), '$150.125');
});

test('percentage and amount storage limits are validated separately before saving', async () => {
  for (const [type, invalid, maximum] of [
    ['PERCENT', '1000000', '999999.9999'],
    ['AMOUNT', '100000000', '99999999.9999'],
  ]) {
    const f = profileFixture([profile(1)]); f.click('Edit Profile 001');
    f.rates().props.onChange({ '1:base': { serviceId: 1, ruleId: null, type, value: invalid } });
    await f.save(); assert.equal(f.requests.length, 0); assert.equal(f.errors.length, 1); assert.equal(f.editorOpen(), true);
    f.rates().props.onChange({ '1:base': { serviceId: 1, ruleId: null, type, value: maximum } });
    await f.save(); assert.equal(f.requests.length, 1); assert.equal(f.editorOpen(), false);
    assert.equal(JSON.parse(JSON.stringify(f.requests[0][2])).adjustments[0].value, Number(maximum));
  }
});

test('four-decimal independent increases survive JSON save and reopen without modifying provider rates', async () => {
  const initial = profile(1, { adjustments: retainedAdjustments() });
  const services = catalog(); services[0] = service(1, { baseRate: '1.0010' });
  const originalCatalog = structuredClone(services), requests = [];
  let persisted;
  const api = load('app/api/installations.api.ts', { './_base': { async apiFetch(url, options) {
    requests.push({ url, options: JSON.parse(JSON.stringify(options)) });
    const payload = JSON.parse(JSON.stringify(options.body));
    persisted = { ...initial, ...payload, adjustments: payload.adjustments.map(item => ({
      ...item, value: item.value.toFixed(4), ...(item.ruleId === 5302 ? { legacyLineRounding: true } : {}),
    })) };
    return structuredClone(persisted);
  } } });
  const f = profileFixture([initial], true, { updateInstallationProfile: api.updateInstallationProfile }, services);
  f.click('Edit Profile 001'); const rates = f.mountRates();
  rates.click('Show rates for Service 001');
  rates.choose('1:base', 'AMOUNT'); rates.input('profile-rate-value-1:base', '0.0001');
  rates.choose('1:base', 'PERCENT'); rates.input('profile-rate-value-1:base', '15.0000');
  rates.input('profile-rate-value-1:101', '0.0001');
  rates.input('profile-service-search', 'no matches');
  await f.save();
  assert.equal(requests.length, 1); assert.equal(requests[0].url, '/api/installation-price-profiles/1');
  assert.equal(requests[0].options.method, 'PATCH');
  assert.deepEqual(requests[0].options.body.adjustments.slice(0, 2), [
    { serviceId: 1, ruleId: null, type: 'PERCENT', value: 15 },
    { serviceId: 1, ruleId: 101, type: 'AMOUNT', value: 0.0001 },
  ]);
  assert.ok(requests[0].options.body.adjustments.every(item => !('legacyLineRounding' in item)));
  for (const field of ['baseRate', 'rate', 'rules', 'adjustmentPercent']) assert.equal(requests[0].options.body[field], undefined);
  const reopened = profileFixture([JSON.parse(JSON.stringify(persisted))], true, {}, services);
  reopened.click('Edit Profile 001'); const reopenedRates = reopened.mountRates();
  reopenedRates.click('Show rates for Service 001');
  assert.equal(reopenedRates.control('profile-rate-value-1:base').props.value, '15');
  assert.equal(reopenedRates.control('profile-rate-value-1:101').props.value, '0.0001');
  assert.equal(text(all(reopenedRates.row('1:base'), node => node.type === 'td').at(-1)), '$1.1512');
  assert.equal(text(all(reopenedRates.row('1:101'), node => node.type === 'td').at(-1)), '$150.1251');
  reopenedRates.choose('1:101', 'BASE');
  await reopened.save();
  assert.equal(reopened.errors.length, 0, 'Reopened legacy rows still permit an unrelated edit');
  const saved = reopened.requests[0][2].adjustments;
  assert.ok(!saved.some(item => item.ruleId === 101));
  assert.deepEqual(saved.find(item => item.ruleId === 5302), { serviceId: 53, ruleId: 5302, type: 'PERCENT', value: -5 });
  assert.deepEqual(saved.find(item => item.ruleId === 99901), { serviceId: 999, ruleId: 99901, type: 'AMOUNT', value: 2 });
  assert.deepEqual(services, originalCatalog);
  assert.deepEqual(initial.adjustments, retainedAdjustments());
});

(async () => {
  let failures = 0;
  for (const { name, run } of tests) {
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { failures++; console.error(`FAIL ${name}`, error); }
  }
  console.log(`${tests.length - failures}/${tests.length} installation profile catalog flows passed.`);
  if (failures) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
