// Exercise real page handlers and request contracts without browser, network, or database access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const jsx = (type, props) => ({ type, props });
const ui = new Proxy({}, { get: (_, name) => name });
const all = (node, predicate) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(child => all(child, predicate)) : [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
const text = node => node == null ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
let hooks = [], cursor = 0, effects = [], requests = [], component, props = {};
const react = {
  useState(initial) { const index = cursor++; if (!(index in hooks)) hooks[index] = typeof initial === 'function' ? initial() : initial;
    return [hooks[index], value => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value; }]; },
  useRef(initial) { const index = cursor++; if (!(index in hooks)) hooks[index] = { current: initial }; return hooks[index]; },
  useCallback(callback, deps) { const index = cursor++; if (!same(hooks[index]?.deps, deps)) hooks[index] = { callback, deps }; return hooks[index].callback; },
  useEffect(effect, deps) { const index = cursor++; if (!same(hooks[index]?.deps, deps)) {
    const cleanup = hooks[index]?.cleanup; hooks[index] = { deps };
    effects.push(() => { cleanup?.(); hooks[index].cleanup = effect(); });
  } },
};
function queue(type, ...args) { const pending = deferred(); requests.push({ type, args, ...pending }); return pending.promise; }
const mocks = {
  react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/link': { default: 'Link' }, 'lucide-react': ui,
  sonner: { toast: { success() {}, error() {} } },
  '@/app/api/referrals.api': {
    getReferralAdmin: (...args) => queue('overview', ...args),
    getReferralRoleDefaults: (...args) => queue('roles', ...args),
    getReferralUsers: (...args) => queue('users', ...args),
  },
  './referral-rule-editor': ui, './referral-payout-recovery': ui,
};
function load(relative, overrides = {}) {
  const filename = path.resolve(__dirname, '../src', relative);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  new Function('require', 'exports', code)(id => {
    if (id in overrides) return overrides[id];
    if (id === '@/lib/referrals') return load('lib/referrals.ts');
    if (id.startsWith('@/components/ui/')) return ui;
    assert.ok(id in mocks, `Unexpected dependency: ${id}`); return mocks[id];
  }, exports);
  return exports;
}
const { ReferralAdmin } = load('components/referrals/referral-admin.tsx');
const { ReferralRoleDefaults, ReferralIndividualSettings } = load('components/referrals/referral-admin-settings.tsx');
const render = () => {
  cursor = 0; let result = component(props);
  // SettingsPage is a pure shared presentation wrapper, not a mocked page.
  if (typeof result.type === 'function') result = result.type(result.props);
  const scheduled = effects; effects = []; scheduled.forEach(effect => effect()); return result;
};
const reset = (next, nextProps = {}) => { hooks.forEach(hook => hook?.cleanup?.()); hooks = []; cursor = 0; effects = []; requests = []; component = next; props = nextProps; };
const button = label => all(render(), node => node.type === 'Button' && text(node) === label)[0];
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };
const finish = async (request, data) => { request.resolve(data); await tick(); };
const rule = { role: 'CLIENT', mode: 'CUSTOM_PERCENT', percent: '10', revision: 1, allowedModes: ['CUSTOM_PERCENT'] };
const user = id => ({ id, firstName: `User${id}`, lastName: 'Example', username: `account${id}`, referralRole: 'CLIENT', useRoleDefaults: true,
  allowedModes: ['CUSTOM_PERCENT'], profile: { enabled: true, mode: 'CUSTOM_PERCENT', percent: '10' } });
const page = (index, count = 501, prefix = 'User') => ({ page: index, pages: Math.max(1, Math.ceil(count / 25)), limit: 25, userCount: count,
  roleDefaults: [rule], users: Array.from({ length: Math.max(0, Math.min(25, count - index * 25)) }, (_, offset) => ({ ...user(index * 25 + offset + 1), firstName: `${prefix}${index * 25 + offset + 1}` })) });
const search = async value => {
  all(render(), node => node.props?.['aria-label'] === 'Search referral users')[0].props.onChange({ target: { value } });
  all(render(), node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} }); render(); await tick();
};

(async () => {
  const apiCalls = [];
  const api = load('app/api/referrals.api.ts', { './_base': { apiFetch(url, options) { apiCalls.push({ url, options }); } } });
  api.getReferralAdmin(2, 'ALL'); api.getReferralRoleDefaults(); api.getReferralUsers('Pepe', 3);
  assert.deepEqual(apiCalls.map(call => call.url), ['/api/referrals/admin', '/api/referrals/admin/role-defaults', '/api/referrals/admin/users']);
  assert.deepEqual(apiCalls[0].options.query, { payoutsPage: 2, payoutStatus: 'ALL' });
  assert.deepEqual(apiCalls[2].options.query, { q: 'Pepe', page: 3 });

  reset(ReferralAdmin, { currentUserId: 1 });
  let output = render();
  for (const href of ['/settings/referrals/roles', '/settings/referrals/users']) assert.equal(all(output, node => node.props?.href === href).length, 1);
  assert.equal(requests.length, 1); assert.equal(requests[0].type, 'overview');
  await finish(requests[0], { settings: { minimumWithdrawal: '100' }, summary: { earned: '0', reserved: '0', paid: '0', bankFees: '0' }, payouts: [], payoutsPage: 0, payoutPages: 1, payoutCount: 0 });
  output = render();
  assert.match(text(output), /Withdrawal settings/); assert.match(text(output), /Withdrawal requests/);
  assert.equal(all(output, node => node.type === 'table').length, 1, 'Overview loads only its withdrawal table');
  assert.equal(all(output, node => node.props?.['aria-label'] === 'Search referral users').length, 0);

  reset(ReferralRoleDefaults); render();
  assert.equal(requests[0].type, 'roles'); await finish(requests[0], { roleDefaults: [rule] });
  output = render(); assert.match(text(output), /Default rewards by role/); assert.match(text(output), /10% of material margin/);
  assert.ok(all(output, node => node.props?.href === '/settings/referrals').length);
  button('Edit default').props.onClick();
  const roleEditor = all(render(), node => node.type === 'ReferralRoleDefaultEditor')[0];
  assert.deepEqual(roleEditor.props.rule, rule);
  const saved = roleEditor.props.onDone(); await finish(requests.at(-1), { roleDefaults: [{ ...rule, percent: '12' }] }); await saved;
  assert.match(text(render()), /12% of material margin/);

  reset(ReferralIndividualSettings); render();
  assert.deepEqual(requests[0].args, ['', 0]); await finish(requests[0], page(0));
  output = render(); assert.match(text(output), /Showing 1–25 of 501 users/); assert.match(text(output), /Page 1 of 21/);
  assert.equal(all(output, node => node.type === 'tbody')[0].props.children.length, 25);
  assert.equal(button('Previous').props.disabled, true);
  assert.ok(all(output, node => node.props?.href === '/settings/referrals').length);
  button('Next').props.onClick(); render();
  assert.deepEqual(requests.at(-1).args, ['', 1]); assert.equal(button('Next').props.disabled, true); assert.equal(button('Previous').props.disabled, true);
  await finish(requests.at(-1), page(1)); assert.match(text(render()), /Showing 26–50 of 501 users/);

  await search('  Pepe  '); assert.deepEqual(requests.at(-1).args, ['Pepe', 0], 'New search resets to the first page');
  await finish(requests.at(-1), page(0, 51, 'Pepe')); button('Next').props.onClick(); render();
  const stale = requests.at(-1); assert.deepEqual(stale.args, ['Pepe', 1], 'Pagination retains the committed query');
  await search('Ana'); const current = requests.at(-1); assert.deepEqual(current.args, ['Ana', 0]);
  await finish(current, page(0, 1, 'Ana')); await finish(stale, page(1, 51, 'Pepe'));
  output = render(); assert.match(text(output), /Ana1/); assert.doesNotMatch(text(output), /Pepe26/); assert.match(text(output), /Showing 1–1 of 1 users/);
  assert.equal(button('Next').props.disabled, true);
  button('Edit settings').props.onClick(); const editor = all(render(), node => node.type === 'ReferralProfileEditor')[0];
  assert.equal(editor.props.user.firstName, 'Ana1'); assert.deepEqual(editor.props.roleDefault, rule);
  editor.props.onCancel();

  await search('many'); await finish(requests.at(-1), page(0, 51)); button('Next').props.onClick(); render();
  await finish(requests.at(-1), page(0, 1, 'Remaining'));
  assert.match(text(render()), /Page 1 of 1/, 'Use the server-clamped page when the list shrinks');
  assert.equal(button('Previous').props.disabled, true); assert.equal(button('Next').props.disabled, true);
  await search('missing'); await finish(requests.at(-1), page(0, 0));
  output = render(); assert.match(text(output), /No matching users/); assert.match(text(output), /Showing 0–0 of 0 users/);
  assert.equal(button('Next').props.disabled, true);
  await search('slow'); const lateError = requests.at(-1); await search('fast'); await finish(requests.at(-1), page(0, 1, 'Fast'));
  lateError.reject(new Error('Stale request failed')); await tick(); assert.doesNotMatch(text(render()), /Stale request failed/);

  // Both new routes reject unauthenticated/non-admin callers before rendering.
  for (const route of ['roles', 'users']) {
    let currentUser = null;
    const Page = load(`app/settings/(write)/referrals/${route}/page.tsx`, {
      'next/navigation': { notFound() { throw new Error('NOT_FOUND'); } },
      '@/lib/session': { async getCurrentUser() { return currentUser; } },
      '@/components/referrals/referral-admin-settings': ui,
    }).default;
    for (const role of [null, 'dealer', 'client', 'seller']) {
      currentUser = role ? { role: { name: role } } : null; await assert.rejects(Page, /NOT_FOUND/);
    }
    currentUser = { role: { name: 'admin' } }; assert.ok((await Page()).type);
  }
  console.log('Referral admin page checks passed: navigation, isolated endpoints, admin access, existing editors, 25-row pagination, search, stale responses, and empty/clamped pages.');
})().catch(error => { console.error(error); process.exitCode = 1; });
