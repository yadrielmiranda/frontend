// Exercises real profile controls and installation finance presentation using simulated UI/API boundaries.
// Run: node scripts/test-installation-profiles.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const jsx = (type, props) => ({ type, props });
const ui = new Proxy({}, { get: (_, key) => key });
const tests = [];
const test = (name, run) => tests.push({ name, run });
const event = () => ({ preventDefault() {}, currentTarget: { isConnected: true, focus() {} } });
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
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
const closed = node => ['Dialog', 'AlertDialog'].includes(node?.type) && node.props.open === false;
const all = (node, predicate) => Array.isArray(node) ? node.flatMap(child => all(child, predicate))
  : !node || typeof node !== 'object' ? [] : [...(predicate(node) ? [node] : []), ...(closed(node) ? [] : all(node.props?.children, predicate))];
const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object'
  ? closed(node) ? '' : text(node.props?.children) : node == null || typeof node === 'boolean' ? '' : String(node);
const formatters = load('lib/formatters.ts');
const helpers = load('lib/installation-profile-pricing.ts', { './formatters': formatters });
function harness(file, name, initialProps, mocks = {}) {
  const state = [], refs = []; let index = 0, refIndex = 0; let props = initialProps;
  const hooks = { useState(initial) { const slot = index++;
    if (!(slot in state)) state[slot] = typeof initial === 'function' ? initial() : initial;
    return [state[slot], next => { state[slot] = typeof next === 'function' ? next(state[slot]) : next; }];
  }, useMemo: fn => fn(), useRef(initial) { return refs[refIndex++] ??= { current: initial }; } };
  const Component = load(file, { ...mocks, react: hooks })[name];
  const render = () => { index = refIndex = 0; return Component(props); };
  const find = predicate => { const found = all(render(), predicate)[0]; assert.ok(found, 'Expected UI control exists'); return found; };
  return { render, find, update(next) { props = { ...props, ...next }; },
    button: label => {
      const found = find(node => node.type === 'Button' && (text(node).trim() === label || node.props?.['aria-label'] === label));
      return { ...found, props: { ...found.props, async onClick(clickEvent = event()) { await found.props.onClick(clickEvent); await flush(); } } };
    },
    input(id, value) { find(node => node.props?.id === id).props.onChange({ target: { value } }); },
  };
}
const service = { id: 3, name: 'Opening installation', billingUnit: 'UNIT', ruleMetric: 'WIDTH',
  baseRate: '100', minimumCharge: '0', isActive: true, availableForRequest: true, availableForField: true, sortOrder: 0,
  rules: [{ id: 8, serviceId: 3, minValue: '40', maxValue: '60', minInclusive: true, maxInclusive: false, rate: '150', sortOrder: 0, isActive: true }] };
const profile = { id: 1, name: 'Retail', adjustmentPercent: '0', adjustments: [], minimumCharge: '500', isDefault: false, isActive: true, sortOrder: 0 };
const profileMocks = { '@/lib/installation-profile-pricing': helpers,
  '@/components/installations/installation-profile-rates-editor': { InstallationProfileRatesEditor: 'RatesEditor' } };
function rates(initial = {}) {
  let adjustments = initial;
  const h = harness('components/installations/installation-profile-rates-editor.tsx', 'InstallationProfileRatesEditor',
    { services: [structuredClone(service)], adjustments, disabled: false, onChange(next) { adjustments = next; h.update({ adjustments }); } },
    { '@/lib/installation-profile-pricing': helpers });
  h.button('Show rates for Opening installation').props.onClick();
  return { ...h, value: () => adjustments, choose(key, type) {
    h.find(node => node.type === 'Select' && all(node, child => child.props?.id === `profile-rate-type-${key}`).length).props.onValueChange(type);
  }, row(label) { return h.find(node => node.type === 'tr' && text(node).includes(label)); } };
}
function profiles(initial = profile, canEdit = true) {
  const requests = [], errors = [];
  const api = { async updateInstallationProfile(id, payload) { requests.push({ id, payload }); return { ...initial, ...payload }; },
    async createInstallationProfile(payload) { requests.push({ payload }); return { ...profile, ...payload, id: 2 }; } };
  const h = harness('app/settings/(write)/installation-profiles/installation-profiles-client.tsx', 'InstallationProfilesClient',
    { initialProfiles: [initial], services: [structuredClone(service)], canEdit },
    { ...profileMocks, '@/app/api/installations.api': api, sonner: { toast: { success() {}, error(value) { errors.push(value); } } } });
  return { ...h, requests, errors };
}

test('service percent previews its own rate while the rule remains at provider base', () => {
  const h = rates(); h.choose('3:base', 'PERCENT'); h.input('profile-rate-value-3:base', '20');
  assert.ok(text(h.row('Base rate')).includes('$120.00'));
  assert.ok(text(h.row('Width (in)')).includes('$150.00'));
  assert.equal(h.value()['3:8'], undefined);
});
test('rule amount and percentage are independent of the service increase; choosing base removes it', () => {
  const h = rates({ '3:base': { serviceId: 3, ruleId: null, type: 'PERCENT', value: '20' } });
  h.choose('3:8', 'AMOUNT'); h.input('profile-rate-value-3:8', '25');
  assert.ok(text(h.row('Width (in)')).includes('$175.00'));
  h.choose('3:8', 'PERCENT'); h.input('profile-rate-value-3:8', '10');
  assert.ok(text(h.row('Width (in)')).includes('$165.00'));
  h.choose('3:8', 'BASE'); assert.equal(h.value()['3:8'], undefined);
  assert.ok(text(h.row('Width (in)')).includes('$150.00'));
  assert.equal(h.value()['3:base'].value, '20');
});
test('rate preview keeps four decimal places without changing provider inputs', () => {
  const original = JSON.stringify(service);
  const h = rates(); h.choose('3:base', 'AMOUNT'); h.input('profile-rate-value-3:base', '0.1234');
  assert.ok(text(h.row('Base rate')).includes('$100.1234'));
  assert.equal(JSON.stringify(service), original);
});
test('saving sends the independent overrides and provider minimum, with no global percentage', async () => {
  const h = profiles(); h.button('Edit').props.onClick();
  h.find(node => node.type === 'RatesEditor').props.onChange({
    '3:base': { serviceId: 3, ruleId: null, type: 'PERCENT', value: '20' },
    '3:8': { serviceId: 3, ruleId: 8, type: 'AMOUNT', value: '30.125' },
  });
  assert.ok(text(h.render()).includes('$300 base, a $500 provider minimum, and $60 in increases result in a $560'));
  await h.button('Save profile').props.onClick();
  assert.deepEqual(h.requests[0].payload, { name: 'Retail', minimumCharge: 500, isDefault: false, isActive: true, sortOrder: 0,
    adjustments: [{ serviceId: 3, ruleId: null, type: 'PERCENT', value: 20 }, { serviceId: 3, ruleId: 8, type: 'AMOUNT', value: 30.125 }] });
});
test('new profile with no increases submits an empty list, preserving base pricing', async () => {
  const h = profiles(); h.button('New profile').props.onClick(); h.input('profile-name', 'Base only');
  await h.button('Save profile').props.onClick();
  assert.deepEqual(h.requests[0].payload.adjustments, []); assert.equal(h.requests[0].payload.minimumCharge, 0);
});
test('metadata edit keeps a migrated negative percentage without sending its internal flag', async () => {
  const h = profiles({ ...profile, adjustments: [{ serviceId: 3, ruleId: 8, type: 'PERCENT', value: '-5.0000', legacyLineRounding: true }] });
  h.button('Edit').props.onClick(); h.input('profile-name', 'Renamed'); await h.button('Save profile').props.onClick();
  assert.deepEqual(h.requests[0].payload.adjustments, [{ serviceId: 3, ruleId: 8, type: 'PERCENT', value: -5 }]);
});
test('a newly entered negative increase cannot be saved', async () => {
  const h = profiles(); h.button('Edit').props.onClick();
  h.find(node => node.type === 'RatesEditor').props.onChange({ '3:8': { serviceId: 3, ruleId: 8, type: 'AMOUNT', value: '-10' } });
  await h.button('Save profile').props.onClick(); assert.equal(h.requests.length, 0); assert.equal(h.errors.length, 1);
});
test('service editor preserves existing rule identity and gives new rules no borrowed ID', async () => {
  let submitted;
  const h = harness('app/settings/(write)/installation-services/installation-services-client.tsx', 'InstallationServicesClient',
    { initialServices: [service], canEdit: true }, { sonner: { toast: { success() {}, error(message) { throw new Error(message); } } },
      '@/app/api/installations.api': { async updateInstallationService(id, payload) { submitted = payload; return { ...service, ...payload }; } } });
  h.find(node => node.props?.['aria-label'] === 'Edit Opening installation').props.onClick({ currentTarget: { focus() {} } });
  h.button('Add range').props.onClick();
  const save = h.button('Save service');
  await (save.props.onClick ?? h.find(node => node.type === 'form').props.onSubmit)({ preventDefault() {} });
  assert.equal(submitted.rules[0].id, 8); assert.equal(submitted.rules[1].id, undefined); assert.equal(submitted.rules[0].rate, 150);
});
test('read-only profile view offers no editing controls', () => {
  const rendered = profiles(profile, false).render();
  assert.equal(all(rendered, node => node.type === 'Button' &&
    (/^(Edit|Delete) /.test(node.props?.['aria-label'] ?? '') || ['New profile', 'Save profile'].includes(text(node).trim()))).length, 0);
  assert.equal(all(rendered, node => node.type === 'RatesEditor').length, 0);
});
test('profile server page fetches provider rates only for admin', async () => {
  for (const role of ['admin', 'operator']) {
    let fetched = 0;
    const Page = load('app/settings/(write)/installation-profiles/page.tsx', {
      'next/navigation': { notFound() { throw new Error('Not found'); } },
      '@/lib/session': { getCurrentUser: async () => ({ role: { name: role } }) },
      '@/lib/rbac': { canAccessSettings: () => true, isAdminRole: value => value === 'admin' },
      '@/app/api/installations.api': { getInstallationProfiles: async () => [profile], getInstallationServices: async () => { fetched++; return [service]; } },
      './installation-profiles-client': { InstallationProfilesClient: 'Profiles' },
    }).default;
    const output = await Page(); assert.equal(fetched, role === 'admin' ? 1 : 0);
    assert.deepEqual(output.props.services, role === 'admin' ? [service] : []);
  }
});
const Financial = load('components/installations/installation-financial-summary.tsx', { '@/lib/formatters': formatters }).InstallationFinancialSummary;
const quote = { total: '560', providerCostSnapshot: { total: '500' }, lines: [{ id: 1, serviceNameSnapshot: 'Installation', rate: '100', saleRate: '120', occurrences: 3, billableQuantity: 1, adjustedAmount: '360' }] };
const share = { collected: '250', processingFee: '8', surcharge: '3', netProcessingCost: '5', netCollected: '245' };
const processing = { status: 'CONFIRMED', provider: share, company: { ...share, collected: '30', netCollected: '29' }, dealer: { ...share, collected: '0', netCollected: '0' } };
test('admin summary separates total provider cost and gross margin from partial card collections', () => {
  const output = text(Financial({ quote, processing, userRole: 'admin' }));
  for (const expected of ['Provider cost$500.00', 'Company gross margin$60.00', 'Quote total$560.00', 'Card collections to date', '$245.00']) assert.ok(output.includes(expected), expected);
  assert.ok(!output.includes('$495.00'), 'Does not subtract partial card costs from the full provider quote');
});
test('unconfirmed processing amounts are pending and missing historical provider costs are not invented', () => {
  const pending = text(Financial({ quote, processing: { ...processing, status: 'PENDING' }, userRole: 'admin' }));
  assert.ok(pending.includes('Card fees pending confirmation')); assert.ok(!pending.includes('$245.00'));
  const old = text(Financial({ quote: { ...quote, providerCostSnapshot: null }, userRole: 'admin' }));
  assert.ok(old.includes('Provider cost was not recorded')); assert.ok(!old.includes('Company gross margin'));
});
test('unallocated and pending card collections do not present unknown principal or surcharge as definitive amounts', () => {
  for (const status of ['PENDING', 'REVIEW', 'UNALLOCATED']) {
    const output = Financial({ quote, processing: { ...processing, status }, userRole: 'admin' });
    const rows = all(output, node => node.type === 'tbody')[0];
    assert.equal(all(rows, node => node.type === 'td').length, 15);
    assert.ok(all(rows, node => node.type === 'td').every(cell => text(cell) === 'Pending'));
  }
});
test('provider costs and margins are absent for every non-admin role', () => {
  for (const userRole of ['operator', 'dealer', 'subdealer', 'client', 'technician']) assert.equal(Financial({ quote, processing, userRole }), null);
});
test('quote table displays provider/profile rates only in internal view', () => {
  const Table = load('components/installations/installation-quote-table.tsx', { '@/lib/formatters': formatters,
    '@/lib/installation-flow': { titleCase: value => value } }).InstallationQuoteTable;
  const admin = text(Table({ quote, showInternal: true }));
  assert.ok(admin.includes('Provider rate')); assert.ok(admin.includes('Profile rate')); assert.ok(admin.includes('$100.00')); assert.ok(admin.includes('$120.00'));
  const customer = text(Table({ quote })); assert.ok(!customer.includes('Provider rate')); assert.ok(!customer.includes('$100.00')); assert.ok(customer.includes('$120.00'));
});
(async () => {
  let failures = 0;
  for (const { name, run } of tests) { try { await run(); console.log(`PASS ${name}`); } catch (error) { failures++; console.error(`FAIL ${name}`, error); } }
  console.log(`${tests.length - failures}/${tests.length} installation profile UI cases passed.`);
  if (failures) process.exitCode = 1;
})();
