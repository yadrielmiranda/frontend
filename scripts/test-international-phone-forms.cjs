// Real registration/schema and estimate field validation with offline UI/API boundaries.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createFormControl } = require('react-hook-form');
const jsx = (type, props) => typeof type === 'function' ? type(props) : ({ type, props });
const ui = new Proxy({}, { get: (_, name) => name });
const all = (node, predicate) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(child => all(child, predicate))
  : [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object'
  ? text(node.props?.children) : node == null || typeof node === 'boolean' ? '' : String(node);
const valid = { firstName: 'Sample', lastName: 'Customer', username: 'sample-client', email: 'sample@example.test',
  phone: '+13055551234', password: 'Example-password-123', street: '100 Example Street', addressLine2: '', city: 'Miami',
  state: 'FL', postalCode: '33138', serviceConsent: false, promotionsConsent: false };
const tests = [];
const test = (name, run) => tests.push({ name, run });

function load(relative, mocks) {
  const filename = path.resolve(__dirname, '../src', relative);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => {
    if (id in mocks) return mocks[id];
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id.startsWith('@/components/ui/') || id === 'lucide-react') return ui;
    if (id.startsWith('@/lib/')) return load(`${id.slice(2)}.ts`, mocks);
    if (id.startsWith('@/')) throw new Error(`Unexpected dependency: ${id}`);
    return require(id);
  }, module, module.exports);
  return module.exports;
}

function fixture(kind = 'registration') {
  let form, index = 0, effects = [];
  const slots = [], requests = [], phoneRules = {};
  const hooks = {
    useState(initial) { const slot = index++; if (!(slot in slots)) slots[slot] = typeof initial === 'function' ? initial() : initial;
      return [slots[slot], next => { slots[slot] = typeof next === 'function' ? next(slots[slot]) : next; }]; },
    useEffect(work, deps) { const slot = index++, previous = slots[slot];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        previous?.cleanup?.(); slots[slot] = { deps }; effects.push(() => { slots[slot].cleanup = work(); });
      } },
  };
  const rhf = {
    useForm(options) {
      if (!form) {
        form = createFormControl({ ...options, defaultValues: valid });
        form.subscribe({ formState: { values: true, errors: true }, callback() {} });
      }
      return { ...form, formState: { errors: {}, isSubmitting: false } };
    },
    useWatch({ name }) { return Array.isArray(name) ? name.map(key => form.getValues(key)) : form.getValues(name); },
    Controller({ name, rules, render }) {
      phoneRules[name] = rules;
      const registered = form.register(name, rules);
      return render({ field: { ...registered, value: form.getValues(name),
        onChange: value => form.setValue(name, value, { shouldDirty: true }), onBlur() {} } });
    },
  };
  const mocks = {
    react: hooks, 'react-hook-form': rhf, 'next/link': 'Link',
    'next/navigation': { useRouter: () => ({ push() {}, refresh() {} }) },
    sonner: { toast: { success() {}, error() {} } },
    '@/components/international-phone-input': { InternationalPhoneInput: 'InternationalPhoneInput' },
    '@/components/address-autocomplete': { AddressAutocomplete: 'AddressAutocomplete' },
    '@/components/StateCombobox': { StateCombobox: 'StateCombobox' },
    '@/app/api/auth/me/auth.api': { registerUser: async data => { requests.push(data); return { deliveryAvailable: true }; } },
    '@/app/api/referrals.api': { resolveReferral: async () => ({ valid: true }) },
    '@/app/api/sms.api': { getSmsProgram: async () => ({ registration: {}, version: 'phone-test' }) },
    '@/app/api/platform-terms.api': { getCurrentPlatformTerms: async () => null, platformTermsPageUrl: () => '/terms' },
  };
  const Component = kind === 'registration' ? load('components/card-register.tsx', mocks).CardRegister
    : load('components/estimates/customer-details-card.tsx', mocks).CustomerDetailsCard;
  if (kind === 'estimate') rhf.useForm({ defaultValues: {} });
  function render() {
    index = 0;
    const tree = kind === 'registration' ? Component() : Component({ control: form.control, register: form.register,
      setValue: form.setValue, errors: {} });
    effects.splice(0).forEach(run => run());
    return tree;
  }
  async function settle() { let tree; for (let i = 0; i < 5; i++) { tree = render(); await new Promise(done => setImmediate(done)); } return tree; }
  render();
  return { requests, phoneRules, render, settle, values: () => form.getValues(),
    set(name, value) { form.setValue(name, value); },
    async submit() { const tree = render(); await all(tree, node => node.type === 'form')[0].props.onSubmit(); },
  };
}

test('registration accepts a foreign number and normalizes it without SMS opt-in', async () => {
  const f = fixture(); await f.settle(); f.set('phone', '+34 612 345 678');
  const tree = await f.settle();
  assert.match(text(tree), /SMS notifications are not available for this phone number/);
  assert.ok(all(tree, node => node.props?.id === 'service-consent')[0].props.disabled);
  await f.submit();
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].phone, '+34612345678');
  assert.equal(f.requests[0].serviceConsent, false);
  assert.equal(f.requests[0].promotionsConsent, false);
});

test('changing to an unsupported number clears SMS choices and does not restore them later', async () => {
  const f = fixture(); await f.settle(); f.set('serviceConsent', true); f.set('promotionsConsent', true);
  f.set('phone', '+447911123456'); await f.settle();
  assert.equal(f.values().serviceConsent, false); assert.equal(f.values().promotionsConsent, false);
  f.set('phone', '+13055551234'); await f.settle();
  assert.equal(f.values().serviceConsent, false); assert.equal(f.values().promotionsConsent, false);
});

test('international submit cannot preserve unsupported SMS choices even before a rerender', async () => {
  const f = fixture(); await f.settle(); f.set('phone', '+34612345678'); await f.settle();
  f.set('serviceConsent', true); f.set('promotionsConsent', true); await f.submit();
  assert.equal(f.requests[0].serviceConsent, false); assert.equal(f.requests[0].promotionsConsent, false);
});

test('US registration retains expressly selected SMS choices', async () => {
  const f = fixture(); await f.settle(); f.set('serviceConsent', true); f.set('promotionsConsent', true);
  await f.submit();
  assert.equal(f.requests[0].phone, valid.phone);
  assert.equal(f.requests[0].serviceConsent, true); assert.equal(f.requests[0].promotionsConsent, true);
});

test('registration blocks malformed foreign numbers while retaining the entered value', async () => {
  const f = fixture(); await f.settle(); f.set('phone', '+34 612'); await f.submit();
  assert.equal(f.requests.length, 0); assert.equal(f.values().phone, '+34 612');
});

test('estimate customer phone remains optional and rejects invalid nonempty values', () => {
  const f = fixture('estimate');
  const validate = f.phoneRules.customerPhone.validate;
  assert.equal(validate(''), true); assert.equal(validate(undefined), true);
  assert.equal(validate('+34612345678'), true);
  assert.equal(validate('+13055551234'), true);
  assert.equal(validate('+34 612'), 'Invalid phone number');
  const phone = all(f.render(), node => node.type === 'InternationalPhoneInput')[0];
  phone.props.onChange('+34 612');
  assert.equal(f.values().customerPhone, '+34 612');
});

(async () => {
  for (const { name, run } of tests) { await run(); console.log(`PASS ${name}`); }
  console.log(`${tests.length} international phone form tests passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
