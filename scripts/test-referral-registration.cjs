// Exercise public registration, referral attribution and the transition to the first estimate offline.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const ui = new Proxy({}, { get: (_, name) => name });
const jsx = (type, props) => ({ type, props });
let slots = [], cursor = 0, effects = [], calls = [], resolveLink;
let events = [], authenticated = false, loginFailure, registrationFailure;
let pendingLogin, pendingRegistration;
const firstEstimate = '/estimates/new?welcome=1';
const formData = { firstName: 'New', lastName: 'Client', email: 'client@example.test', phone: '+13055550111',
  password: 'Example-password-123', serviceConsent: false, promotionsConsent: false };
const setValue = () => {};
const getValues = field => field ? formData[field] ?? '' : formData;
const react = {
  useRef(initial) {
    const index = cursor++;
    return slots[index] ??= { current: initial };
  },
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
  },
  useEffect(work, dependencies) {
    const index = cursor++;
    const previous = slots[index];
    if (!previous || dependencies.some((value, i) => !Object.is(value, previous.dependencies[i]))) {
      previous?.cleanup?.();
      slots[index] = { dependencies };
      effects.push(() => { slots[index].cleanup = work(); });
    }
  },
};
const mocks = {
  '@/contexts/AuthContext': { useAuth: () => ({ isAuthenticated: authenticated, isLoading: false }) },
  '@/app/api/_base': { isApiError: () => false },
  '@/components/platform-terms/platform-terms-document': ui,
  '@/lib/registration-pixel': { hasRegistrationPixel: () => false, sendRegistrationPageView() {},
    sendCompletedRegistration: async () => { events.push('conversion'); return true; } },
  '@/lib/auth-session': { navigateAfterSessionChange: path => events.push(`new document ${path}`) },
  '@/lib/registration-measurement': { useRegistrationMeasurement: () => ({ record() {}, header() {} }) },
  'react/jsx-runtime': { jsx, jsxs: jsx }, react,
  'react-hook-form': {
    Controller: 'Controller',
    useForm: () => ({ register: name => ({ name }), handleSubmit: callback => () => callback(formData), control: {},
      setValue, getValues, formState: { errors: {}, isSubmitting: false } }),
    useWatch: () => '',
  },
  'next/navigation': { useRouter: () => ({ push: path => events.push(`push ${path}`),
    replace: path => events.push(`replace ${path}`), refresh() {} }) },
  'next/link': { __esModule: true, default: 'a' },
  'lucide-react': ui,
  'sonner': { toast: { success() {}, error() {} } },
  '@hookform/resolvers/zod': { zodResolver: () => () => {} },
  '@/app/api/auth/me/auth.api': {
    registerUser: async data => {
      calls.push(data);
      events.push('register');
      if (pendingRegistration) await pendingRegistration;
      if (registrationFailure) throw registrationFailure;
      return { username: 'NewClient' };
    },
    loginUser: async credentials => {
      events.push('login');
      assert.deepEqual(credentials, { identifier: formData.email, password: formData.password });
      if (pendingLogin) await pendingLogin;
      if (loginFailure) throw loginFailure;
      return { role: 'client' };
    },
  },
  '@/app/api/referrals.api': { resolveReferral: code => resolveLink(code) },
  '@/app/api/sms.api': { getSmsProgram: async () => ({ registration: {}, version: 'test-consent' }) },
  '@/app/api/platform-terms.api': { getCurrentPlatformTerms: async () => null, platformTermsPageUrl: () => '/terms' },
  '@/components/StateCombobox': ui,
  '@/components/address-autocomplete': { AddressAutocomplete: 'AddressAutocomplete' },
  '@/components/international-phone-input': { InternationalPhoneInput: 'InternationalPhoneInput' },
};
const cache = new Map();
function load(relative, testClosed = false) {
  const filename = path.resolve(__dirname, '../src', relative);
  const cacheKey = `${filename}:${testClosed}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  let source = fs.readFileSync(filename, 'utf8');
  if (testClosed) {
    assert.match(source, /const REGISTRATION_ENABLED = true;/);
    source = source.replace('const REGISTRATION_ENABLED = true;', 'const REGISTRATION_ENABLED = false;');
  }
  const code = ts.transpileModule(source, { fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const exports = {};
  cache.set(cacheKey, exports);
  new Function('require', 'exports', code)(id => {
    if (id in mocks) return mocks[id];
    if (id.startsWith('@/components/ui/')) return ui;
    if (id.startsWith('@/lib/')) return load(`${id.slice(2)}.ts`);
    if (id === 'zod' || id.startsWith('libphonenumber-js')) return require(id);
    throw new Error(`Unexpected registration dependency: ${id}`);
  }, exports);
  return exports;
}
let { CardRegister } = load('components/card-register.tsx', true);
const all = (node, predicate) => node == null || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(child => all(child, predicate)) : [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
const text = node => node == null ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node)
  ? node.map(text).join('') : text(node.props?.children);
const render = code => { cursor = 0; return CardRegister({ referralCode: code }); };
const settle = async code => {
  let tree;
  for (let i = 0; i < 5; i++) {
    tree = render(code);
    effects.splice(0).forEach(run => run());
    await new Promise(resolve => setImmediate(resolve));
  }
  return tree;
};
const submit = tree => all(tree, node => node.type === 'form')[0].props.onSubmit();
const submitButton = tree => all(tree, node => node.props?.type === 'submit')[0];
function reset() {
  for (const slot of slots) slot?.cleanup?.();
  slots = []; cursor = 0; effects = []; calls = []; events = [];
  authenticated = false; loginFailure = undefined; registrationFailure = undefined;
  pendingLogin = undefined; pendingRegistration = undefined;
}
const code = 'a'.repeat(36);
const assertClosed = async (tree, description) => {
  assert.equal(submitButton(tree).props.disabled, true, `${description}: submit button must be disabled`);
  assert.equal(submitButton(tree).props['aria-describedby'], 'registration-availability');
  assert.match(text(tree), /Account registration is not available yet\. Please check back later\./);
  await submit(tree);
  assert.equal(calls.length, 0, `${description}: direct submission must also respect the closed form`);
};

(async () => {
  resolveLink = async value => ({ valid: true, code: value, referrerName: 'Private Referrer Name' });
  let tree = await settle(undefined);
  assert.equal(all(tree, node => node.props?.name === 'street').length, 0);
  await assertClosed(tree, 'Ordinary registration');

  reset();
  tree = await settle(code);
  await assertClosed(tree, 'Valid referral');
  assert.doesNotMatch(text(tree), /Invited by|Private Referrer Name|eligible purchases|referral reward/i);

  reset();
  resolveLink = async () => { throw new Error('Inactive link'); };
  tree = await settle(code);
  await assertClosed(tree, 'Invalid referral');

  reset();
  resolveLink = () => new Promise(() => {});
  tree = await settle(code);
  await assertClosed(tree, 'Pending referral verification');

  reset();
  ({ CardRegister } = load('components/card-register.tsx'));
  resolveLink = async value => ({ valid: true, code: value, referrerName: 'Private Referrer Name' });
  tree = await settle(code);
  assert.match(text(tree), /Create Client Account/);
  assert.doesNotMatch(text(tree), /Invited by|Private Referrer Name|eligible purchases|referral reward/i);
  assert.doesNotMatch(text(tree), /Account registration is not available yet/);
  assert.equal(submitButton(tree).props.disabled, false);
  await submit(tree);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].referralCode, code, 'Verified referral must survive a normal-looking registration');
  assert.equal(calls[0].consentVersion, 'test-consent');
  assert.equal(calls[0].serviceConsent, false);
  assert.deepEqual(events, ['register', 'login', `new document ${firstEstimate}`]);

  reset();
  resolveLink = async () => { throw new Error('Inactive link'); };
  tree = await settle(code);
  assert.match(text(tree), /registration link could not be verified/);
  assert.equal(submitButton(tree).props.disabled, true);
  await submit(tree);
  assert.equal(calls.length, 0, 'Invalid referral must not silently become an unattributed registration');

  reset();
  let release;
  resolveLink = value => value === code ? Promise.resolve({ valid: true, code: value })
    : new Promise(resolve => { release = resolve; });
  await settle(code);
  tree = await settle('b'.repeat(36));
  assert.equal(submitButton(tree).props.disabled, true);
  await submit(tree);
  assert.equal(calls.length, 0, 'Switching links must not submit attribution from the previous URL');
  release({ valid: true, code: 'b'.repeat(36) });
  tree = await settle('b'.repeat(36));
  await submit(tree);
  assert.equal(calls[0].referralCode, 'b'.repeat(36));

  reset();
  tree = await settle(undefined);
  assert.equal(submitButton(tree).props.disabled, false);
  await submit(tree);
  assert.equal(calls.length, 1, 'Public registration permits ordinary registration');
  assert.equal(calls[0].referralCode, undefined);
  assert.deepEqual(events, ['register', 'conversion', 'login', `new document ${firstEstimate}`]);

  reset();
  loginFailure = new Error('Simulated session failure');
  await submit(await settle());
  tree = await settle();
  assert.match(text(tree), /your account is ready/i);
  assert.equal(all(tree, node => node.type === 'form').length, 0, 'A created account must not be submitted again');
  const retry = all(tree, node => node.type === 'Button' && /continue to my first estimate/i.test(text(node)))[0];
  assert.ok(retry, 'A failed session must offer a way to continue');
  const manualLogin = all(tree, node => node.type === 'a' && /sign in manually/i.test(text(node)))[0];
  assert.equal(manualLogin?.props.href, '/login?firstEstimate=1');
  assert.deepEqual(events, ['register', 'conversion', 'login']);
  loginFailure = undefined;
  let releaseLogin;
  pendingLogin = new Promise(resolve => { releaseLogin = resolve; });
  retry.props.onClick();
  retry.props.onClick();
  assert.deepEqual(events, ['register', 'conversion', 'login', 'login']);
  releaseLogin();
  await settle();
  assert.deepEqual(events, ['register', 'conversion', 'login', 'login', `new document ${firstEstimate}`]);
  assert.equal(calls.length, 1);

  reset();
  let releaseRegistration;
  pendingRegistration = new Promise(resolve => { releaseRegistration = resolve; });
  pendingLogin = new Promise(resolve => { releaseLogin = resolve; });
  tree = await settle();
  const firstSubmit = submit(tree);
  await submit(tree);
  assert.deepEqual(events, ['register'], 'Double submit while creating the account sends one request');
  releaseRegistration();
  await settle();
  await submit(tree);
  assert.deepEqual(events, ['register', 'conversion', 'login'], 'Repeated submit during sign-in cannot create another account');
  releaseLogin();
  await firstSubmit;
  assert.deepEqual(events, ['register', 'conversion', 'login', `new document ${firstEstimate}`]);

  reset();
  registrationFailure = new Error('Simulated registration failure');
  await submit(await settle());
  assert.deepEqual(events, ['register'], 'A rejected registration must never start a session or count a conversion');

  reset();
  authenticated = true;
  await submit(await settle());
  assert.deepEqual(events, ['register', 'push /'], 'Creating an account from an existing session must preserve its identity');

  const loginModule = load('components/card-login.tsx');
  Object.assign(mocks, {
    '@/components/card-login': loginModule,
    '@/components/auth/auth-page-shell': ui,
    '@/components/pwa/portal-install-button': ui,
  });
  const loginPage = load('app/login/page.tsx').default;
  async function checkManualLogin(href, role, destination) {
    reset();
    const searchParams = Object.fromEntries(new URL(href, 'https://example.test').searchParams);
    const page = await loginPage({ searchParams: Promise.resolve(searchParams) });
    const card = all(page, node => node.type === loginModule.CardLogin)[0];
    assert.ok(card, 'The manual login page must render the actual sign-in form');
    mocks['@/contexts/AuthContext'].useAuth = () => ({ signIn: async () => ({ role: { name: role } }) });
    await submit(loginModule.CardLogin(card.props));
    assert.deepEqual(events, [`replace ${destination}`]);
  }
  await checkManualLogin(manualLogin.props.href, 'client', firstEstimate);
  await checkManualLogin('/login', 'client', '/');
  await checkManualLogin(manualLogin.props.href, 'dealer', '/');
  await checkManualLogin(`${manualLogin.props.href}&registrationRequest=42`, 'dealer', '/dealers?registrationRequest=42');
  console.log('Public registration passed: referrals, consents, first estimate, sign-in retry and existing sessions.');
})().catch(error => { console.error(error); process.exitCode = 1; });
