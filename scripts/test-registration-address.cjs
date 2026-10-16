// Real registration schema, selection callback and RHF submission; no network or account creation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createFormControl } = require('react-hook-form');
const { zodResolver } = require('@hookform/resolvers/zod');
const z = require('zod');
const file = path.resolve(__dirname, '../src/components/card-register.tsx');
const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = source.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'CardRegister');
const compile = code => ts.transpileModule(code, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
} }).outputText;
function declaration(name, statements) {
  const node = statements.find(n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(source) === name));
  assert.ok(node, `${name} comes from the real registration component`);
  return node.getText(source);
}
function loadLibrary(name) {
  const exports = {};
  const content = fs.readFileSync(path.resolve(__dirname, '../src/lib', `${name}.ts`), 'utf8');
  new Function('require', 'exports', compile(content))(require, exports);
  return exports;
}
const dependencies = { z, ...loadLibrary('us-states'), ...loadLibrary('validators-zip'),
  ...loadLibrary('validators-email'), ...loadLibrary('validators-phone'), ...loadLibrary('username-policy') };
const schema = new Function(...Object.keys(dependencies), compile(`${declaration('registerSchema', source.statements)}\nreturn registerSchema;`))(...Object.values(dependencies));
const selection = compile(`${declaration('applyAddress', component.body.statements)}\nreturn applyAddress;`);
const valid = { firstName: 'Sample', lastName: 'Customer', username: 'sample-client', email: 'sample@example.test',
  phone: '+13055550111', password: 'Example-password-123', street: '100 Example Street', city: 'Miami',
  state: 'FL', postalCode: '33138', serviceConsent: false, promotionsConsent: false };
const address = { street: '200 Example Avenue', city: 'Miami', state: 'FL', postalCode: '33138' };
const tests = [];
const test = (name, run) => tests.push({ name, run });
function fixture(isSubmitting = false) {
  const form = createFormControl({ defaultValues: valid, resolver: zodResolver(schema) });
  const unsubscribe = form.subscribe({ formState: { values: true }, callback() {} });
  const fields = Object.fromEntries(Object.keys(valid).map(name => [name, form.register(name)]));
  const writes = [];
  const applyAddress = new Function('setValue', 'isSubmitting', selection)((name, value, options) => {
    writes.push({ name, value, options }); form.setValue(name, value, options);
  }, isSubmitting);
  return { form, writes, applyAddress, dispose: unsubscribe,
    async change(name, value) { await fields[name].onChange({ target: { name, value }, type: 'change' }); },
    async submit() { let payload; await form.handleSubmit(value => { payload = value; })(); return payload; },
  };
}

test('selection populates all four fields and preserves registration data and consents', async () => {
  const f = fixture(); f.applyAddress(address);
  const payload = await f.submit();
  assert.deepEqual(payload, { ...valid, ...address });
  assert.equal(f.writes.length, 4);
  assert.ok(f.writes.every(write => write.options.shouldDirty && write.options.shouldValidate));
  f.dispose();
});
test('manual El Portal correction survives ZIP edits and the registration submission', async () => {
  const f = fixture(); f.applyAddress(address);
  await f.change('city', 'El Portal'); await f.change('postalCode', '33139');
  assert.equal(f.form.getValues('city'), 'El Portal');
  const payload = await f.submit();
  assert.equal(payload.city, 'El Portal'); assert.equal(payload.postalCode, '33139');
  assert.equal(payload.street, address.street); f.dispose();
});
test('registration allows manual entry without selecting a suggestion', async () => {
  const f = fixture(); await f.change('street', '300 Example Road'); await f.change('city', 'El Portal');
  const payload = await f.submit();
  assert.equal(payload.street, '300 Example Road'); assert.equal(payload.city, 'El Portal');
  assert.deepEqual(f.writes, []); f.dispose();
});
test('pending selection cannot change address while registration is submitting', async () => {
  const f = fixture(true); f.applyAddress(address);
  assert.deepEqual(f.form.getValues(), valid); assert.deepEqual(f.writes, []); f.dispose();
});
test('required address, state and ZIP validations still reject invalid data', async () => {
  for (const changes of [{ street: '' }, { city: '' }, { state: 'ZZ' }, { postalCode: '123' }]) {
    const result = schema.safeParse({ ...valid, ...changes });
    assert.equal(result.success, false, JSON.stringify(changes));
  }
});
test('overlong selected addresses are reported instead of silently truncated or saved', async () => {
  const f = fixture(); const long = { ...address, street: 'A'.repeat(151), city: 'B'.repeat(101) };
  f.applyAddress(long); assert.equal(await f.submit(), undefined);
  assert.equal(f.form.getValues('street'), long.street);
  assert.ok(f.form.getFieldState('street').error);
  assert.ok(f.form.getFieldState('city').error); f.dispose();
});

(async () => {
  for (const { name, run } of tests) { await run(); console.log(`PASS ${name}`); }
  console.log(`${tests.length} registration address tests passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
