/* Regression entry point for estimate addresses (formerly ZIP lookup).
 * Real selection/autosave callbacks and react-hook-form; no network or DB.
 * Run: node scripts/test-estimate-zip-lookup.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createFormControl } = require('react-hook-form');
function readSource(relative) {
  const file = path.resolve(__dirname, '../src', relative);
  return ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
const source = readSource('components/estimates/estimate-form.tsx');
const card = readSource('components/estimates/customer-details-card.tsx');
const component = source.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'EstimateForm');
const cardComponent = card.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'CustomerDetailsCard');
function containsIdentifier(node, name) {
  if (ts.isIdentifier(node) && node.text === name) return true;
  return Boolean(ts.forEachChild(node, child => containsIdentifier(child, name)));
}
function declaration(name, statements = component.body.statements, file = source) {
  const node = statements.find(n => ts.isVariableStatement(n)
    && n.declarationList.declarations.some(d => ts.isIdentifier(d.name) && d.name.text === name));
  assert.ok(node, `Real declaration ${name} is available`);
  return node.getText(file);
}
function compile(code) {
  return ts.transpileModule(code, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  } }).outputText;
}
function evaluate(code, scope) {
  const values = { fetch() { throw new Error('Network access is forbidden'); }, process: { env: {} }, ...scope };
  return new Function(...Object.keys(values), code)(...Object.values(values));
}
const saveEffect = component.body.statements.find(n => ts.isExpressionStatement(n)
  && ts.isCallExpression(n.expression) && n.expression.expression.getText(source) === 'useEffect'
  && containsIdentifier(n, 'headerAutosaveReadyRef'));
assert.ok(saveEffect);
const autosave = compile([
  declaration('ESTIMATE_HEADER_FIELDS', source.statements),
  declaration('buildEstimateHeaderPayload'), declaration('saveEstimateHeader'), saveEffect.getText(source),
].join('\n'));
const selection = compile(`${declaration('applyAddress', cardComponent.body.statements, card)}\nreturn applyAddress;`);
const flush = async () => { for (let i = 0; i < 3; i++) await new Promise(setImmediate); };
const tests = [];
const test = (name, run) => tests.push({ name, run });
const saved = { name: 'Test estimate', customerStreet: '100 Example Street', customerCity: 'El Portal',
  customerState: 'FL', customerPostalCode: '33138', customerTaxRate: 0 };
const selected = { street: '200 Example Avenue', city: 'El Portal', state: 'FL', postalCode: '33138' };
function fixture(values = {}, disabled = false) {
  const form = createFormControl({ defaultValues: { ...saved, ...values } });
  const stopForm = form.subscribe({ formState: { values: true }, callback() {} });
  const fields = Object.fromEntries(Object.keys(saved).map(name => [name, form.register(name)]));
  const writes = [], saves = [], toasts = [], timers = new Map();
  let cleanup, timerId = 0;
  const refs = { headerAutosaveReadyRef: { current: false }, headerAutosaveTimeoutRef: { current: null },
    lastSavedHeaderRef: { current: '' }, headerSaveQueueRef: { current: Promise.resolve() } };
  const scope = { getValues: form.getValues,
    setValue(name, value, options) { writes.push({ name, value, options }); form.setValue(name, value, options); } };
  const applyAddress = evaluate(selection, { ...scope, disabled });
  const render = () => {
    cleanup?.();
    evaluate(autosave, { ...scope, ...refs, canUseCustomerPricing: true, readOnly: disabled,
      needsRecalculation: false, estimate: { id: 41 }, headerSnapshot: JSON.stringify(form.getValues()),
      useCallback: fn => fn, useEffect(fn) { cleanup = fn(); }, trigger: form.trigger,
      setPromotionEstimate() {}, toast: { error: message => toasts.push(message) },
      updateEstimateHeader: async (id, payload) => { saves.push({ id, payload }); return { id, ...payload }; },
      setTimeout(fn, delay) { assert.equal(delay, 600); timers.set(++timerId, fn); return timerId; },
      clearTimeout(id) { timers.delete(id); },
    });
  };
  return { form, writes, saves, toasts, render, applyAddress,
    async change(name, value) { await fields[name].onChange({ target: { name, value }, type: 'change' }); },
    async save() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn());
      await refs.headerSaveQueueRef.current; await flush(); },
    unmount() { cleanup?.(); stopForm(); },
  };
}
test('no ZIP lookup can replace a saved or manually entered city', () => {
  assert.equal(containsIdentifier(source, 'lookupZip'), false);
  assert.equal(containsIdentifier(card, 'lookupZip'), false);
  assert.ok(containsIdentifier(card, 'AddressAutocomplete'));
});
test('opening an estimate preserves El Portal without autosave', async () => {
  const f = fixture(); f.render(); await f.save();
  assert.deepEqual(f.form.getValues(), saved);
  assert.deepEqual(f.writes, []); assert.deepEqual(f.saves, []); f.unmount();
});
test('selected address persists all four fields through real autosave', async () => {
  const f = fixture(); f.render(); f.applyAddress(selected); f.render(); await f.save();
  assert.equal(f.saves.length, 1); assert.equal(f.saves[0].id, 41);
  for (const [field, value] of Object.entries({ customerStreet: selected.street, customerCity: selected.city,
    customerState: selected.state, customerPostalCode: selected.postalCode })) {
    assert.equal(f.form.getValues(field), value); assert.equal(f.saves[0].payload[field], value);
  }
  assert.equal(f.writes.length, 4);
  assert.ok(f.writes.every(w => w.options.shouldDirty && w.options.shouldValidate));
  assert.deepEqual(f.toasts, []); f.unmount();
});
test('manual city and ZIP corrections survive saving and reopening', async () => {
  const f = fixture(); f.render();
  await f.change('customerCity', 'Manual city'); await f.change('customerPostalCode', '10001');
  f.render(); await f.save();
  assert.equal(f.saves.length, 1);
  assert.equal(f.saves[0].payload.customerCity, 'Manual city');
  assert.equal(f.saves[0].payload.customerPostalCode, '10001');
  const reopened = fixture(f.saves[0].payload); reopened.render(); await reopened.save();
  assert.equal(reopened.form.getValues('customerCity'), 'Manual city');
  assert.deepEqual(reopened.saves, []); reopened.unmount(); f.unmount();
});
test('manual correction after selection wins over pending autosave', async () => {
  const f = fixture(); f.render();
  f.applyAddress({ ...selected, city: 'Miami' }); f.render();
  await f.change('customerCity', 'El Portal'); f.render(); await f.save();
  assert.equal(f.saves.length, 1); assert.equal(f.saves[0].payload.customerCity, 'El Portal');
  assert.equal(f.saves[0].payload.customerStreet, selected.street); f.unmount();
});
test('manual entry works without selecting a suggestion', async () => {
  const f = fixture({ customerStreet: '', customerCity: '', customerState: '', customerPostalCode: '' });
  f.render();
  for (const [name, value] of Object.entries(saved)) await f.change(name, value);
  f.render(); await f.save();
  assert.equal(f.saves.length, 1); assert.equal(f.saves[0].payload.customerCity, 'El Portal');
  assert.equal(f.saves[0].payload.customerStreet, saved.customerStreet); f.unmount();
});
test('read-only selection cannot change or save the address', async () => {
  const f = fixture({}, true); f.render(); f.applyAddress(selected); f.render(); await f.save();
  assert.deepEqual(f.form.getValues(), saved);
  assert.deepEqual(f.writes, []); assert.deepEqual(f.saves, []); f.unmount();
});
(async () => {
  let failures = 0;
  for (const { name, run } of tests) {
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
  }
  console.log(`${tests.length - failures}/${tests.length} estimate address tests passed (real callbacks/RHF, simulated I/O).`);
  if (failures) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
