// Address rollout regressions: real form handlers with simulated UI, RHF and API boundaries.
// Run: node scripts/test-account-address-autocomplete.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const jsx = (type, props) => typeof type === 'function' ? type(props) : ({ type, props });
const ui = new Proxy({}, { get: (_, name) => name });
const all = (node, predicate) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(child => all(child, predicate))
  : [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object'
  ? text(node.props?.children) : node == null || typeof node === 'boolean' ? '' : String(node);
const address = { street: '100 Example Road', city: 'Miami', state: 'FL', postalCode: '33138' };
const user = { id: 10, firstName: 'Test', lastName: 'User', username: 'testuser', email: 'test@example.com',
  phone: '+13055551234', idRole: 1, street: 'Saved street', city: 'El Portal', state: 'FL', postalCode: '33138' };
const roles = [{ id: 1, name: 'client', markup: 0 }];
const tests = [];
const test = (name, run) => tests.push({ name, run });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

function load(relative, mocks, globals = {}) {
  const file = path.resolve(__dirname, '../src', relative);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), code)(id => {
    if (id in mocks) return mocks[id];
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id.startsWith('@/components/ui/') || id === 'lucide-react') return ui;
    if (id.startsWith('@/lib/')) return load(`${id.slice(2)}.ts`, mocks);
    if (id.startsWith('./') || id.startsWith('../')) return load(path.join(path.dirname(relative), `${id}.ts`), mocks);
    if (id.startsWith('@/')) throw new Error(`Unexpected dependency: ${id}`);
    return require(id);
  }, module, module.exports, ...Object.values(globals));
  return module.exports;
}

function fixture(kind, props, overrides = {}) {
  const states = [], refs = [], memos = [], effects = [], requests = [], notices = [];
  let stateIndex = 0, refIndex = 0, memoIndex = 0, effectIndex = 0, dirty = false, pending = [];
  let defaults, values, form;
  const rules = {}, errors = {};
  const hooks = {
    useState(initial) { const slot = stateIndex++; if (!(slot in states)) states[slot] = typeof initial === 'function' ? initial() : initial;
      return [states[slot], next => { const value = typeof next === 'function' ? next(states[slot]) : next;
        if (!Object.is(value, states[slot])) { states[slot] = value; dirty = true; } }]; },
    useRef(initial) { return refs[refIndex++] ??= { current: initial }; },
    useMemo(fn, deps) { const slot = memoIndex++, previous = memos[slot];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) memos[slot] = { deps, value: fn() };
      return memos[slot].value; },
    useEffect(fn, deps) { const slot = effectIndex++, previous = effects[slot];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        effects[slot] = { deps }; pending.push(fn);
      } },
  };
  function validate(name) {
    const value = values[name], rule = rules[name] ?? {};
    let message;
    if (rule.required && !value) message = rule.required;
    else if (rule.maxLength && (value?.length ?? 0) > rule.maxLength.value) message = rule.maxLength.message;
    else if (rule.pattern && !rule.pattern.value.test(value ?? '')) message = rule.pattern.message;
    else if (rule.validate) { const result = rule.validate(value); if (result !== true) message = result; }
    if (message) errors[name] = { message }; else delete errors[name];
  }
  function field(name) { return { name, value: values[name], onBlur() {}, ref() {}, onChange(event) {
    const value = event && typeof event === 'object' && event.target ? event.target.value : event;
    form.setValue(name, rules[name]?.setValueAs ? rules[name].setValueAs(value) : value, { shouldDirty: true });
  } }; }
  const rhf = {
    useForm(options) {
      if (!form) {
        defaults = structuredClone(options.defaultValues); values = structuredClone(defaults);
        form = { control: {}, formState: { errors, isDirty: false, isSubmitting: false },
          register(name, rule = {}) { rules[name] = rule; return field(name); },
          watch(name) { return values[name]; },
          setValue(name, value, options = {}) { values[name] = value;
            if (options.shouldDirty) form.formState.isDirty = JSON.stringify(values) !== JSON.stringify(defaults);
            if (options.shouldValidate) validate(name); },
          reset(next) { defaults = structuredClone(next); values = structuredClone(next); form.formState.isDirty = false;
            Object.keys(errors).forEach(key => delete errors[key]); dirty = true; },
          handleSubmit(fn) { return async () => {
            Object.keys(rules).forEach(validate); if (Object.keys(errors).length) return;
            form.formState.isSubmitting = true;
            try { await fn(structuredClone(values)); } finally { form.formState.isSubmitting = false; }
          }; },
        };
      }
      return form;
    },
    useWatch({ name }) { return Array.isArray(name) ? name.map(key => values[key]) : values[name]; },
    Controller({ name, rules: rule, render }) { rules[name] = rule ?? {}; return render({ field: field(name) }); },
  };
  const api = name => async (...args) => {
    requests.push({ name, args: structuredClone(args) });
    if (overrides[name]) return overrides[name](...args);
    return { ...props.user, ...props.branding, id: 10, ...args.at(-1) };
  };
  const Component = load(kind === 'user' ? 'app/settings/(write)/users/new/user-form.tsx'
    : kind === 'branding' ? 'components/branding/branding-form.tsx' : 'components/dealers/dealer-network-client.tsx', {
    react: hooks, 'react-hook-form': rhf, 'next/link': 'Link',
    'next/navigation': { useRouter: () => ({ push() {}, refresh() {} }) },
    sonner: { toast: { success: message => notices.push(message), error: message => notices.push(message), message() {} } },
    '@/components/address-autocomplete': { AddressAutocomplete: 'AddressAutocomplete' },
    '@/components/StateCombobox': { StateCombobox: 'StateCombobox' },
    '@/app/api/users.api': { createUser: api('createUser'), updateUser: api('updateUser') },
    '@/app/api/auth/me/auth.api': { updateMyProfile: api('updateMyProfile') },
    '@/app/api/brandings.api': Object.fromEntries(['createDealerBranding', 'updateDealerBranding', 'createCompanyBranding',
      'updateCompanyBranding', 'uploadDealerLogo', 'uploadCompanyLogo'].map(name => [name, api(name)])),
    '@/contexts/CompanyBrandingContext': { useCompanyBranding: () => ({ refreshCompanyBranding: api('refreshBranding') }) },
    '@/app/api/dealer-network.api': { createNetworkAccount: api('createNetworkAccount'), updateNetworkMarkup: api('updateNetworkMarkup') },
    './network-business-dialog': { NetworkBusinessDialog: 'NetworkBusinessDialog' },
    './dealer-network-tree': { DealerNetworkTree: 'DealerNetworkTree' },
  }, { FormData: class { constructor(data) { this.data = data; } get(key) { return this.data[key]; } } })[
    kind === 'user' ? 'UserForm' : kind === 'branding' ? 'BrandingForm' : 'DealerNetworkClient'];
  function render() {
    let tree, count = 0;
    do { assert.ok(count++ < 12, 'Effects settle'); stateIndex = refIndex = memoIndex = effectIndex = 0; pending = []; dirty = false;
      tree = Component(props); pending.forEach(fn => fn()); } while (dirty);
    return tree;
  }
  const find = predicate => { const node = all(render(), predicate)[0]; assert.ok(node, 'Expected form control'); return node; };
  const input = name => find(node => ['Input', 'AddressAutocomplete'].includes(node.type) && node.props.name === name);
  const button = label => find(node => node.type === 'Button' && text(node).trim() === label);
  return { render, find, input, button, requests, notices, errors, rules, values: () => structuredClone(values),
    autocomplete: () => find(node => node.type === 'AddressAutocomplete'),
    type(name, value) { input(name).props.onChange({ target: { value } }); render(); },
    click(label) { button(label).props.onClick(); render(); },
    async save(extra = {}) {
      const data = Object.fromEntries(all(render(), node => ['Input', 'AddressAutocomplete'].includes(node.type) && node.props.name)
        .map(node => [node.props.name, node.props.value ?? node.props.defaultValue ?? '']));
      await find(node => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: { ...data, ...extra } });
      for (let i = 0; i < 12; i++) await Promise.resolve();
      render();
    },
  };
}

test('My Profile retains the saved municipality and editing the ZIP never replaces it', () => {
  const f = fixture('user', { user, roles }); f.render();
  assert.equal(f.input('city').props.value, 'El Portal'); assert.equal(f.autocomplete().props.value, 'Saved street');
  const previous = f.autocomplete().props.contextKey;
  f.type('postalCode', '33139'); assert.equal(f.input('city').props.value, 'El Portal');
  assert.notEqual(f.autocomplete().props.contextKey, previous);
});

test('My Profile saves a manual correction after selecting Google and resets its dirty state', async () => {
  const f = fixture('user', { user, roles }); f.autocomplete().props.onAddressSelect(address);
  f.type('city', 'El Portal'); f.type('postalCode', '33138'); await f.save();
  const request = f.requests.find(item => item.name === 'updateMyProfile');
  assert.deepEqual(Object.fromEntries(Object.keys(address).map(key => [key, request.args[0][key]])), { ...address, city: 'El Portal' });
  assert.equal(f.button('Update Profile').props.disabled, true);
});

test('new users keep required street and ZIP validation, including selected long streets', async () => {
  const f = fixture('user', { roles }); f.render();
  Object.entries({ ...user, password: 'Test12345' }).forEach(([key, value]) => {
    const node = all(f.render(), node => node.props.name === key && node.type === 'Input')[0];
    if (node) f.type(key, value);
  });
  await f.save(); assert.equal(f.requests.length, 0); assert.equal(f.errors.street.message, 'Street is required');
  f.autocomplete().props.onAddressSelect({ ...address, street: 'S'.repeat(151) }); await f.save();
  assert.match(f.errors.street.message, /150/); assert.equal(f.requests.length, 0);
  f.autocomplete().props.onAddressSelect(address); f.type('postalCode', 'bad'); await f.save();
  assert.match(f.errors.postalCode.message, /ZIP/); assert.equal(f.requests.length, 0);
  f.type('postalCode', '33138'); f.type('city', 'El Portal'); await f.save();
  assert.equal(f.requests[0].name, 'createUser'); assert.equal(f.requests[0].args[0].city, 'El Portal');
});

test('admin user edits keep address fields disabled and never submit profile changes', async () => {
  const f = fixture('user', { user, roles: [...roles, { id: 2, name: 'admin', markup: 0 }] });
  assert.equal(f.autocomplete().props.disabled, true); assert.equal(f.input('city').props.disabled, true);
  await f.save(); assert.equal(f.requests[0].name, 'updateUser');
  assert.equal('street' in f.requests[0].args[1], false); assert.equal('city' in f.requests[0].args[1], false);
});

for (const mode of ['company', 'dealer']) {
  test(`${mode} branding preserves existing/manual municipalities and saves the selected address`, async () => {
    const f = fixture('branding', { mode, branding: { id: 1, name: 'Test brand', brandingColor: '#123456', ...user } });
    assert.equal(f.autocomplete().props.value, 'Saved street'); assert.equal(f.input('city').props.value, 'El Portal');
    f.autocomplete().props.onAddressSelect(address); const previous = f.autocomplete().props.contextKey;
    f.type('city', 'El Portal'); f.type('postalCode', '33139'); assert.notEqual(f.autocomplete().props.contextKey, previous);
    await f.save(); const request = f.requests.find(item => item.name === (mode === 'company' ? 'updateCompanyBranding' : 'updateDealerBranding'));
    assert.equal(request.args[0].street, address.street); assert.equal(request.args[0].city, 'El Portal');
    assert.equal(request.args[0].postalCode, '33139'); assert.equal(f.button('Save Changes').props.disabled, true);
  });
}

test('branding discard restores the saved address and an optional empty address remains valid', async () => {
  const f = fixture('branding', { mode: 'dealer', branding: { id: 1, name: 'Test brand', ...user } });
  f.autocomplete().props.onAddressSelect(address); f.click('Discard');
  assert.equal(f.autocomplete().props.value, 'Saved street'); assert.equal(f.input('city').props.value, 'El Portal');
  const empty = fixture('branding', { mode: 'company' }); empty.type('name', 'New brand'); await empty.save();
  assert.equal(empty.requests[0].name, 'createCompanyBranding'); assert.equal(empty.requests[0].args[0].street, undefined);
});

test('branding selection validates service field lengths and disables autocomplete while saving', async () => {
  const pending = deferred(); const f = fixture('branding', { mode: 'dealer', branding: { id: 1, name: 'Test brand', ...user } },
    { updateDealerBranding: () => pending.promise });
  f.autocomplete().props.onAddressSelect({ ...address, city: 'C'.repeat(101) }); await f.save();
  assert.match(f.errors.city.message, /100/); assert.equal(f.requests.length, 0);
  f.autocomplete().props.onAddressSelect(address); const saving = f.save(); assert.equal(f.autocomplete().props.disabled, true);
  pending.resolve({ id: 1, name: 'Test brand', ...address }); await saving;
  assert.equal(f.autocomplete().props.disabled, false);
});

const networkProps = { currentUserId: 1, isAdmin: false, initialData: { level: 'Dealer', canCreate: true, defaultTaxPercent: 7,
  members: [{ id: 1, username: 'parent', firstName: 'Parent', lastName: 'Dealer', isActive: true, level: 1, dealerMode: 'EXTERNAL' }] } };
test('network account address selection and manual city correction reach the existing create payload', async () => {
  const f = fixture('network', networkProps); f.click('New subdealer');
  assert.equal(f.autocomplete().props.required, true); assert.equal(f.input('postalCode').props.pattern, '[0-9]{5}');
  f.autocomplete().props.onAddressSelect(address); f.type('city', 'El Portal'); f.type('state', 'fl');
  await f.save({ firstName: 'Test', lastName: 'Dealer', username: 'testdealer', phone: '(305) 555-1234', password: 'Test12345', email: 'test@example.com' });
  assert.equal(f.requests[0].name, 'createNetworkAccount'); assert.equal(f.requests[0].args[0].city, 'El Portal');
  assert.equal(f.requests[0].args[0].state, 'FL'); assert.equal(f.requests[0].args[0].street, address.street);
});

test('network account close/reopen clears selected address and rejects overlong Google values visibly', () => {
  const f = fixture('network', networkProps); f.click('New subdealer'); f.autocomplete().props.onAddressSelect(address);
  f.click('Cancel'); f.click('New subdealer'); assert.equal(f.autocomplete().props.value, ''); assert.equal(f.input('city').props.value, '');
  f.autocomplete().props.onAddressSelect({ ...address, street: 'S'.repeat(151) });
  assert.match(text(f.find(node => node.props.role === 'alert')), /too long/); assert.equal(f.autocomplete().props.value, '');
});

(async () => {
  for (const { name, run } of tests) { await run(); console.log(`PASS ${name}`); }
  console.log(`PASS ${tests.length} account address autocomplete regressions`);
})().catch(error => { console.error(error); process.exitCode = 1; });
