// Exercise registration handlers offline: removing the banner must not remove attribution.
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
function load(relative) {
  const filename = path.resolve(__dirname, '../src', relative);
  if (cache.has(filename)) return cache.get(filename);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const exports = {};
  cache.set(filename, exports);
  new Function('require', 'exports', code)(id => {
    if (id in mocks) return mocks[id];
    if (id.startsWith('@/components/ui/')) return ui;
    if (id.startsWith('@/lib/')) return load(`${id.slice(2)}.ts`);
    if (id === 'zod' || id === 'libphonenumber-js') return require(id);
    throw new Error(`Unexpected registration dependency: ${id}`);
  }, exports);
  return exports;
}
const { CardRegister } = load('components/card-register.tsx');
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
const reset = () => { for (const slot of slots) slot?.cleanup?.(); slots = []; cursor = 0; effects = []; calls = []; };
const code = 'a'.repeat(36);

(async () => {
  resolveLink = async value => ({ valid: true, code: value, referrerName: 'Private Referrer Name' });
  let tree = await settle(code);
  assert.match(text(tree), /Create Client Account/);
  assert.doesNotMatch(text(tree), /Invited by|Private Referrer Name|eligible purchases|referral reward/i);
  await submit(tree);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].referralCode, code, 'Verified referral must survive a normal-looking registration');
  assert.equal(calls[0].consentVersion, 'test-consent');
  assert.equal(calls[0].serviceConsent, false);

  reset();
  resolveLink = async () => { throw new Error('Inactive link'); };
  tree = await settle(code);
  assert.match(text(tree), /registration link could not be verified/);
  await submit(tree);
  assert.equal(calls.length, 0, 'Invalid referral must not silently become an unattributed registration');

  reset();
  let release;
  resolveLink = value => value === code ? Promise.resolve({ valid: true, code: value })
    : new Promise(resolve => { release = resolve; });
  await settle(code);
  tree = await settle('b'.repeat(36));
  await submit(tree);
  assert.equal(calls.length, 0, 'Switching links must not submit attribution from the previous URL');
  release({ valid: true, code: 'b'.repeat(36) });
  tree = await settle('b'.repeat(36));
  await submit(tree);
  assert.equal(calls[0].referralCode, 'b'.repeat(36));

  reset();
  tree = await settle(undefined);
  await submit(tree);
  assert.equal(calls.length, 0, 'Ordinary registration availability remains unchanged');
  console.log('Referral registration passed: hidden banner, preserved attribution/consents, invalid link, changed link, and normal availability.');
})().catch(error => { console.error(error); process.exitCode = 1; });
