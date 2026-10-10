// Exercise registration handlers offline, including the global form gate and future referral attribution.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const ui = new Proxy({}, { get: (_, name) => name });
const jsx = (type, props) => ({ type, props });
let slots = [], cursor = 0, effects = [], calls = [], resolveLink;
const formData = { firstName: 'New', lastName: 'Client', email: 'client@example.test', phone: '+13055550111',
  username: 'new-client', password: 'Example-password-123', street: '123 Example St', city: 'Miami',
  state: 'FL', postalCode: '33101', serviceConsent: false, promotionsConsent: false };
const setValue = () => {};
const getValues = () => '';
const react = {
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
  'react/jsx-runtime': { jsx, jsxs: jsx }, react,
  'react-hook-form': {
    useForm: () => ({ register: name => ({ name }), handleSubmit: callback => () => callback(formData), control: {},
      setValue, getValues, formState: { errors: {}, isSubmitting: false } }),
    useWatch: () => '',
  },
  'next/navigation': { useRouter: () => ({ push() {}, refresh() {} }) },
  'next/link': { __esModule: true, default: 'a' },
  'lucide-react': ui,
  'sonner': { toast: { success() {}, error() {} } },
  '@hookform/resolvers/zod': { zodResolver: () => () => {} },
  '@/app/api/auth/me/auth.api': { registerUser: async data => { calls.push(data); return { deliveryAvailable: true }; } },
  '@/app/api/referrals.api': { resolveReferral: code => resolveLink(code) },
  '@/app/api/sms.api': { getSmsProgram: async () => ({ registration: {}, version: 'test-consent' }) },
  '@/app/api/platform-terms.api': { getCurrentPlatformTerms: async () => null, platformTermsPageUrl: () => '/terms' },
  '@/components/StateCombobox': ui,
  '@/app/api/geo.api': { lookupZip: async () => null },
};
const cache = new Map();
function load(relative, enableRegistration = false) {
  const filename = path.resolve(__dirname, '../src', relative);
  const cacheKey = `${filename}:${enableRegistration}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  let source = fs.readFileSync(filename, 'utf8');
  if (enableRegistration) {
    assert.match(source, /const REGISTRATION_ENABLED = false;/, 'The real application must remain closed');
    // Test the future open state in memory only; never enable registration in application files.
    source = source.replace('const REGISTRATION_ENABLED = false;', 'const REGISTRATION_ENABLED = true;');
  }
  const code = ts.transpileModule(source, { fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const exports = {};
  cache.set(cacheKey, exports);
  new Function('require', 'exports', code)(id => {
    if (id in mocks) return mocks[id];
    if (id.startsWith('@/components/ui/')) return ui;
    if (id.startsWith('@/lib/')) return load(`${id.slice(2)}.ts`);
    if (id === 'zod' || id === 'libphonenumber-js') return require(id);
    throw new Error(`Unexpected registration dependency: ${id}`);
  }, exports);
  return exports;
}
let { CardRegister } = load('components/card-register.tsx');
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
const reset = () => { for (const slot of slots) slot?.cleanup?.(); slots = []; cursor = 0; effects = []; calls = []; };
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
  ({ CardRegister } = load('components/card-register.tsx', true));
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
  assert.equal(calls.length, 1, 'The future open state permits ordinary registration');
  assert.equal(calls[0].referralCode, undefined);
  console.log('Referral registration passed: closed form blocks every entry and direct submit; in-memory open state preserves attribution/consents and rejects unverified links.');
})().catch(error => { console.error(error); process.exitCode = 1; });
