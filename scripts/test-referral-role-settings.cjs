// Exercise the real role/user settings and dashboard handlers without network or bank data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const jsx = (type, props) => ({ type, props });
const ui = new Proxy({}, { get: (_, name) => name });
let states = [], cursor = 0, calls = [], completed = 0;
const mocks = {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  react: {
    useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
    useEffect() {}, useCallback(callback) { return callback; }, useRef(initial) { return { current: initial }; },
  },
  'lucide-react': ui,
  sonner: { toast: { success() {}, error() {} } },
  '@/app/api/referrals.api': {
    async saveReferralRoleDefault(role, data) { calls.push({ role, data }); },
    async saveReferralProfile(id, data) { calls.push({ id, data }); },
    async createReferralLink() { calls.push({ action: 'create-link' }); },
    async getMyReferrals() { return dashboard; },
  },
  '@/app/api/_base': { ApiError: class ApiError extends Error {} },
  './referral-bank-form': ui, './referral-qr': ui,
};
function load(relative) {
  const filename = path.resolve(__dirname, '../src', relative);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  new Function('require', 'exports', code)(id => {
    if (id === '@/lib/referrals') return load('lib/referrals.ts');
    if (id.startsWith('@/components/ui/')) return ui;
    assert.ok(id in mocks, `Unexpected dependency: ${id}`);
    return mocks[id];
  }, exports);
  return exports;
}
const { ReferralRoleDefaultEditor, ReferralProfileEditor } = load('components/referrals/referral-rule-editor.tsx');
const { ReferralDashboard } = load('components/referrals/referral-dashboard.tsx');
const { referralRewardStatus, referralRoleLabel } = load('lib/referrals.ts');
const expand = node => !node || typeof node !== 'object' ? node : Array.isArray(node) ? node.map(expand)
  : typeof node.type === 'function' ? expand(node.type(node.props)) : { ...node, props: { ...node.props, children: expand(node.props?.children) } };
const all = (node, predicate) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(child => all(child, predicate)) : [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
const text = node => node == null ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
const callbacks = { onDone: async () => { completed++; }, onCancel() {} };
let component, props;
const render = () => { cursor = 0; return expand(component(props)); };
const reset = (next, nextProps, initial = []) => { states = initial; calls = []; completed = 0; component = next; props = nextProps; };
const change = (id, value) => all(render(), node => node.props?.id === id)[0].props.onChange({ target: { value } });
const submit = () => all(render(), node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
const rule = { role: 'CLIENT', mode: 'CUSTOM_PERCENT', percent: '10', revision: 1, allowedModes: ['CUSTOM_PERCENT'] };
const user = { id: 42, referralRole: 'CLIENT', useRoleDefaults: true, allowedModes: ['CUSTOM_PERCENT'], profile: { enabled: true, mode: 'CUSTOM_PERCENT', percent: '10' } };
const dashboard = { profile: { enabled: true, code: null, mode: 'CUSTOM_PERCENT', percent: '99.1234' },
  balances: { pending: '25', available: '10', reserved: '0', paid: '0' }, bank: null, minimumWithdrawal: '0', referrals: [], payouts: [],
  rewards: [{ id: 1, firstName: 'Client', createdAt: '2026-10-08', amount: '25', status: 'PENDING_REAL_COST', reason: 'Final app base cost 1234.56' }] };

(async () => {
  assert.equal(Object.keys(referralRoleLabel).length, 6);
  reset(ReferralRoleDefaultEditor, { rule, ...callbacks });
  change('referral-percent', '12'); await submit();
  assert.deepEqual(calls, [{ role: 'CLIENT', data: { mode: 'CUSTOM_PERCENT', percent: '12' } }]);
  assert.equal(completed, 1);
  reset(ReferralRoleDefaultEditor, { rule, ...callbacks });
  change('referral-percent', '101'); await submit();
  assert.equal(calls.length, 0);
  assert.match(text(render()), /percentage from 0 to 100/);
  reset(ReferralRoleDefaultEditor, { rule: { ...rule, percent: 0 }, ...callbacks });
  assert.match(text(render()), /At 0%, links remain available/);
  await submit();
  assert.equal(calls[0].data.percent, '0', 'Never invent a default reward percentage');

  reset(ReferralProfileEditor, { user, roleDefault: rule, ...callbacks });
  assert.match(text(render()), /10% of material margin/);
  assert.equal(all(render(), node => node.props?.id === 'referral-percent').length, 0, 'Inherited settings are not editable individually');
  change('referral-settings-source', 'custom');
  change('referral-percent', '15'); await submit();
  assert.deepEqual(calls, [{ id: 42, data: { useRoleDefaults: false, enabled: true, mode: 'CUSTOM_PERCENT', percent: '15' } }]);

  reset(ReferralProfileEditor, { user: { ...user, useRoleDefaults: false, profile: { ...user.profile, percent: '15' } }, roleDefault: { ...rule, percent: '12' }, ...callbacks });
  change('referral-settings-source', 'role');
  assert.match(text(render()), /12% of material margin/, 'Reset shows current role settings, not the old user override');
  await submit();
  assert.deepEqual(calls, [{ id: 42, data: { useRoleDefaults: true } }], 'Reset must not re-save stale individual terms');
  assert.equal(completed, 1);

  reset(ReferralRoleDefaultEditor, { rule: { ...rule, role: 'DEALER_INTERNAL', mode: 'DEALER_PLAN', percent: null, allowedModes: ['DEALER_PLAN', 'CUSTOM_PERCENT'] }, ...callbacks });
  await submit();
  assert.deepEqual(calls[0], { role: 'DEALER_INTERNAL', data: { mode: 'DEALER_PLAN' } });

  for (const status of ['PENDING_REAL_COST', 'PENDING_COST', 'PENDING_REVIEW', 'MISSING_DEALER_PLAN', 'APP_BASE_PRICE_123']) assert.equal(referralRewardStatus(status), 'Under review');
  reset(ReferralDashboard, { userId: 42 }, [dashboard]);
  const output = text(render());
  assert.doesNotMatch(output, /99\.1234|1234\.56|margin|app base|dealer price|earnings plan|final costs|cost review|Your reward:|activate your reward terms/i);
  assert.match(output, /Under review/);
  assert.match(output, /\$25\.00/);
  const create = all(render(), node => node.type === 'Button' && text(node) === 'Create referral link')[0];
  assert.ok(create, 'An active inherited account can create a link without individual setup or bank details');
  await create.props.onClick();
  assert.ok(calls.some(call => call.action === 'create-link'));
  console.log('Referral settings UI checks passed: role updates, zero default, override, reset, internal plan, and private user dashboard.');
})().catch(error => { console.error(error); process.exitCode = 1; });
