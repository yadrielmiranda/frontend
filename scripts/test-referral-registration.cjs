// Exercise public registration, referral attribution and the transition to the first estimate offline.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const ui = new Proxy({}, { get: (_, name) => name });
const jsx = (type, props, key) => ({ type, props, key });
let slots = [], cursor = 0, effects = [], calls = [], resolveLink;
let events = [], authenticated = false, loginFailure, registrationFailure;
let pendingLogin, pendingRegistration;
const firstEstimate = '/estimates/new?welcome=1';
const formData = { firstName: 'New', lastName: 'Client', email: 'client@example.test', phone: '+13055550111',
  password: 'Example-password-123', serviceConsent: false, promotionsConsent: false };
const setValue = () => {};
const getValues = field => field ? formData[field] ?? '' : formData;
const react = {
  createContext(initial) {
    const context = { value: initial };
    context.Provider = ({ value }) => { context.value = value; };
    return context;
  },
  useContext: context => context.value,
  useCallback: callback => react.useRef(callback).current,
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
  'next/navigation': { usePathname: () => '/', useRouter: () => ({ push: path => events.push(`push ${path}`),
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
const render = (code, locale) => { cursor = 0; return CardRegister({ referralCode: code, locale }); };
const settle = async (code, locale) => {
  let tree;
  for (let i = 0; i < 5; i++) {
    tree = render(code, locale);
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
  let referralChecks = 0;
  resolveLink = async value => { referralChecks++; return { valid: true, code: value }; };
  const termsApi = mocks['@/app/api/platform-terms.api'];
  const previousTermsLoader = termsApi.getCurrentPlatformTerms;
  let termsChecks = 0;
  termsApi.getCurrentPlatformTerms = async () => {
    termsChecks++;
    return { id: 17, consentText: 'I have read and accept the Terms and Conditions for using the platform.' };
  };
  tree = await settle(code, 'es');
  assert.match(text(tree), /Crear cuenta de cliente/);
  assert.equal(submitButton(tree).props.disabled, true);
  const acceptance = all(tree, node => node.type === 'label' && text(node).includes('He leído y acepto'))[0];
  all(acceptance, node => node.type === 'input')[0].props.onChange({ target: { checked: true } });
  all(tree, node => node.type === 'button' && text(node) === 'Cambiar')[0].props.onClick();
  tree = await settle(code, 'en');
  assert.match(text(tree), /Use automatic username/, 'Language switches keep the manual username field open');
  assert.equal(submitButton(tree).props.disabled, false, 'Changing language preserves acceptance of the same terms');
  assert.equal(termsChecks, 1);
  assert.equal(referralChecks, 1);
  let finishSignIn;
  pendingLogin = new Promise(resolve => { finishSignIn = resolve; });
  const createInEnglish = submit(tree);
  await settle(code, 'es');
  finishSignIn();
  await createInEnglish;
  assert.deepEqual(events, ['register', 'login', `new document ${firstEstimate}&lang=es`], 'Navigation uses the latest language even during automatic sign-in');
  assert.equal(calls[0].referralCode, code);
  assert.equal(calls[0].platformTermsVersionId, 17);
  termsApi.getCurrentPlatformTerms = previousTermsLoader;

  reset();
  let finishRegistration;
  pendingRegistration = new Promise(resolve => { finishRegistration = resolve; });
  const createInSpanish = submit(await settle(undefined, 'es'));
  await settle(undefined, 'en');
  finishRegistration();
  await createInSpanish;
  assert.deepEqual(events, ['register', 'conversion', 'login', `new document ${firstEstimate}&lang=en`], 'Explicit English survives an in-flight registration');

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

  let browserLanguage = 'en';
  let savedLanguage;
  mocks['./company-public-routes'] = load('lib/company-public-routes.ts');
  mocks['next/headers'] = {
    cookies: async () => ({ get: () => savedLanguage && { value: savedLanguage } }),
    headers: async () => ({ get: () => browserLanguage }),
  };
  let loadRegistrationForm;
  Object.assign(mocks, {
    'next/image': { __esModule: true, default: 'img' },
    'next/dynamic': loadForm => { loadRegistrationForm = loadForm; return CardRegister; },
    '@/components/company/company-content': load('components/company/company-content.ts'),
    '@/components/card-register': { CardRegister },
    '@/components/auth/auth-page-shell': ui,
    './auth-page-shell': ui,
    '@/components/site-footer': ui,
    '@/components/pwa/portal-install-button': ui,
    './AuthContext': mocks['@/contexts/AuthContext'],
    '@/lib/public-language-server': load('lib/public-language-server.ts'),
  });
  const language = load('contexts/PortalLanguageContext.tsx');
  mocks['@/contexts/PortalLanguageContext'] = language;
  const { PortalLanguageSwitch } = load('components/portal-language-switch.tsx');
  mocks['@/components/portal-language-switch'] = { PortalLanguageSwitch };
  const loginModule = load('components/card-login.tsx');
  mocks['@/components/card-login'] = loginModule;
  const screenModule = load('components/auth/public-auth-screen.tsx');
  assert.equal(await loadRegistrationForm(), CardRegister);
  mocks['@/components/auth/public-auth-screen'] = screenModule;
  const renderScreen = props => {
    cursor = 0;
    const provider = language.PortalLanguageProvider({ children: null });
    provider.type(provider.props);
    return screenModule.PublicAuthScreen(props);
  };
  const loginPage = load('app/login/page.tsx').default;
  async function checkManualLogin(href, role, destination, locale) {
    reset();
    const searchParams = Object.fromEntries(new URL(href, 'https://example.test').searchParams);
    const page = await loginPage({ searchParams: Promise.resolve(searchParams) });
    assert.equal(page.type, screenModule.PublicAuthScreen);
    assert.equal(page.props.mode, 'login');
    const screen = renderScreen(page.props);
    const card = all(screen, node => node.type === loginModule.CardLogin)[0];
    assert.ok(card, 'The manual login page must render the actual sign-in form');
    assert.equal(card.props.locale, locale);
    mocks['@/contexts/AuthContext'].useAuth = () => ({ signIn: async () => ({ role: { name: role } }) });
    const signInForm = loginModule.CardLogin(card.props);
    assert.ok(text(signInForm).includes(locale === 'es' ? 'Iniciar sesión' : 'Sign In'));
    await submit(signInForm);
    assert.deepEqual(events, [`replace ${destination}`]);
  }
  await checkManualLogin(manualLogin.props.href, 'client', `${firstEstimate}&lang=en`, 'en');
  await checkManualLogin('/login?firstEstimate=1&lang=es', 'client', `${firstEstimate}&lang=es`, 'es');
  browserLanguage = 'es';
  await checkManualLogin(manualLogin.props.href, 'client', `${firstEstimate}&lang=es`, 'es');
  await checkManualLogin('/login?firstEstimate=1&lang=en', 'client', `${firstEstimate}&lang=en`, 'en');
  await checkManualLogin('/login', 'client', '/', 'es');
  await checkManualLogin('/login?lang=en', 'client', '/', 'en');
  await checkManualLogin('/login?lang=es', 'client', '/', 'es');
  savedLanguage = 'en';
  await checkManualLogin('/login?lang=es', 'client', '/', 'en');
  savedLanguage = undefined;
  await checkManualLogin(manualLogin.props.href, 'dealer', '/', 'es');
  await checkManualLogin(`${manualLogin.props.href}&registrationRequest=42`, 'dealer', '/dealers?registrationRequest=42', 'es');

  const registrationPage = load('app/login/register/page.tsx').default;
  const registration = await registrationPage({ searchParams: Promise.resolve({ ref: code, lang: 'en' }) });
  assert.equal(registration.type, screenModule.PublicAuthScreen);
  assert.equal(registration.props.mode, 'register');
  reset();
  const registrationScreen = renderScreen(registration.props);
  const registrationCard = all(registrationScreen, node => node.type === CardRegister)[0];
  assert.equal(registrationCard.props.referralCode, code);
  assert.equal(registrationCard.props.locale, 'en');
  const languageSwitch = screen => all(screen, node => node.type === 'AuthPageShell')[0].props.languageSwitch;
  function languageMenu(screen, expected) {
    const control = languageSwitch(screen);
    assert.equal(control.type, PortalLanguageSwitch);
    const menu = control.type(control.props);
    const trigger = all(menu, node => node.type === 'DropdownMenuTrigger')[0];
    assert.equal(text(trigger).trim(), expected.toUpperCase());
    assert.ok(trigger.props['aria-label']);
    const options = all(menu, node => node.type === 'DropdownMenuRadioItem');
    assert.deepEqual(options.map(option => option.props.value), ['en', 'es']);
    const group = all(menu, node => node.type === 'DropdownMenuRadioGroup')[0];
    assert.equal(group.props.value, expected);
    return value => options.find(option => option.props.value === value).props.onSelect();
  }
  languageMenu(registrationScreen, 'en');
  const guestAuth = mocks['@/contexts/AuthContext'].useAuth;
  mocks['@/contexts/AuthContext'].useAuth = () => ({ isAuthenticated: true });
  assert.ok(!languageSwitch(renderScreen(registration.props)), 'An authenticated visitor already has the language selector in the portal header');
  mocks['@/contexts/AuthContext'].useAuth = guestAuth;

  reset();
  const location = new URL(`https://example.test/?utm_campaign=example&ref=${code}&unrelated=private#account`);
  global.window = { location, history: { replaceState(_, __, url) { location.href = new URL(url, location).href; } } };
  const preferencePosts = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, init) => { preferencePosts.push([url, init.method]); return { ok: true }; };
  const form = mocks['react-hook-form'];
  const originalForm = form.useForm;
  form.useForm = ({ defaultValues }) => {
    const values = react.useRef({ ...defaultValues }).current;
    return {
      register: name => ({ name, onChange: event => { values[name] = event.target.value; } }),
      handleSubmit: callback => () => callback(values),
      formState: { errors: {}, isSubmitting: false },
    };
  };
  try {
    const props = { mode: 'login', initialLocale: 'en' };
    const before = renderScreen(props);
    const loginCard = screen => all(screen, node => node.type === loginModule.CardLogin)[0];
    const beforeCard = loginCard(before);
    const englishForm = loginModule.CardLogin(beforeCard.props);
    const credentials = { identifier: 'test@example.test', password: 'Example-input' };
    for (const [name, value] of Object.entries(credentials)) {
      all(englishForm, node => node.props?.name === name)[0].props.onChange({ target: { value } });
    }
    const chooseLanguage = languageMenu(before, 'en');
    await chooseLanguage('en');
    assert.deepEqual(preferencePosts, [], 'Selecting the current language keeps the form in place');
    await chooseLanguage('es');
    const after = renderScreen(props);
    languageMenu(after, 'es');
    const afterCard = loginCard(after);
    assert.equal(afterCard.key, beforeCard.key, 'Changing language must not remount the credential form');
    assert.equal(afterCard.props.locale, 'es');
    let submitted;
    mocks['@/contexts/AuthContext'].useAuth = () => ({ signIn: async payload => { submitted = payload; return {role:{name:'client'}}; } });
    const spanishForm = loginModule.CardLogin(afterCard.props);
    await submit(spanishForm);
    assert.deepEqual(submitted, credentials);
    const createAccount = all(spanishForm, node => node.type === 'button' && /crea.*cuenta/i.test(text(node)))[0];
    createAccount.props.onClick();
    const signup = new URL(events.at(-1).replace(/^push /, ''), location);
    assert.equal(signup.pathname, '/login/register');
    assert.equal(signup.searchParams.get('lang'), 'es');
    assert.equal(signup.searchParams.get('utm_campaign'), 'example');
    assert.equal(signup.searchParams.get('ref'), code);
    assert.equal(signup.searchParams.has('unrelated'), false);
    assert.deepEqual(preferencePosts, [['/company/language/es/company','POST']]);
    assert.equal(location.searchParams.get('lang'), 'es');
    assert.equal(location.hash, '#account');
    assert.equal(location.searchParams.get('unrelated'), 'private', 'Switching languages preserves the current URL');
    location.searchParams.set('lang', 'en');
    cursor = 0;
    const provider = language.PortalLanguageProvider({ children: null, initialLocale: 'en' });
    provider.props.value.applyPageLocale('en');
    languageMenu(renderScreen(props), 'es');
    assert.equal(preferencePosts.length, 1, 'Restoring stale server data must preserve the manual choice');

    const browserEvents = new EventTarget();
    const storage = new Map();
    Object.assign(global.window, {
      addEventListener: browserEvents.addEventListener.bind(browserEvents),
      removeEventListener: browserEvents.removeEventListener.bind(browserEvents),
      localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    });
    const { announceCompanyLanguage, listenForCompanyLanguage } = mocks['./company-public-routes'];
    const observed = [];
    const unsubscribe = listenForCompanyLanguage(value => observed.push(value));
    announceCompanyLanguage('es');
    browserEvents.dispatchEvent(Object.assign(new Event('storage'), { key: [...storage.keys()][0] }));
    announceCompanyLanguage('en');
    browserEvents.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));
    browserEvents.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));
    assert.deepEqual(observed, ['es', 'en'], 'Open tabs and restored documents apply each completed change once');
    unsubscribe();

    reset();
    global.document = Object.assign(new EventTarget(), { documentElement: {}, visibilityState: 'visible' });
    let cookie = 'en';
    const reads = [];
    global.fetch = async url => {
      reads.push(url);
      return { ok: true, json: async () => ({ locale: cookie ?? 'en', hasPreference: Boolean(cookie) }) };
    };
    const mountPortal = initialLocale => {
      cursor = 0;
      const { value } = language.PortalLanguageProvider({ children: null, initialLocale }).props;
      effects.splice(0).forEach(run => run());
      return value;
    };
    mountPortal('en');
    assert.equal(reads.length, 0, 'The initial server-rendered portal already has the resolved preference');
    reset();
    mountPortal('es').applyPageLocale('es');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(mountPortal('es').locale, 'en', 'Returning to a cached portal tree restores the saved cookie');
    assert.equal(reads.length, 1);
    reset();
    cookie = undefined;
    mountPortal('en').applyPageLocale('es');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(mountPortal('en').locale, 'es', 'Without a saved choice, the translated registration link seeds the portal');
    reset();
  } finally {
    form.useForm = originalForm;
    global.fetch = originalFetch;
    delete global.window;
    delete global.document;
  }
  console.log('Public registration passed: referrals, consents, first estimate, sign-in retry and existing sessions.');
})().catch(error => { console.error(error); process.exitCode = 1; });
