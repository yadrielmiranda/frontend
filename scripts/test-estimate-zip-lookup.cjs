/* Isolated ZIP lookup regression tests. The TypeScript AST selects the real
 * effect and related autosave callbacks from EstimateForm; no copied lookup
 * implementation. Uses installed react-hook-form's real form control/change
 * notifications, deferred lookup results and fake autosave timers.
 * No React renderer, browser, environment files, network or database.
 * Run from frontend: node scripts/test-estimate-zip-lookup.cjs */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { createFormControl } = require("react-hook-form");

const sourcePath = path.resolve(__dirname, "../src/components/estimates/estimate-form.tsx");
const source = ts.createSourceFile(sourcePath, fs.readFileSync(sourcePath, "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "EstimateForm");
assert.ok(component?.body, "EstimateForm source is available");

function containsCall(node, name) {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name) return true;
  return Boolean(ts.forEachChild(node, child => containsCall(child, name)));
}
function containsIdentifier(node, name) {
  if (ts.isIdentifier(node) && node.text === name) return true;
  return Boolean(ts.forEachChild(node, child => containsIdentifier(child, name)));
}
function effectUsing(name, isCall = false) {
  const found = component.body.statements.filter(node => ts.isExpressionStatement(node)
    && ts.isCallExpression(node.expression) && ts.isIdentifier(node.expression.expression)
    && node.expression.expression.text === "useEffect"
    && (isCall ? containsCall(node, name) : containsIdentifier(node, name)));
  assert.equal(found.length, 1, `Exactly one real effect uses ${name}`);
  return found[0].getText(source);
}
function declaration(name, statements = component.body.statements) {
  const found = statements.find(node => ts.isVariableStatement(node)
    && node.declarationList.declarations.some(d => ts.isIdentifier(d.name) && d.name.text === name));
  assert.ok(found, `Real declaration ${name} is available`);
  return found.getText(source);
}
function compile(code) {
  return ts.transpileModule(code, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  } }).outputText;
}
function evaluate(code, scope) {
  const deniedFetch = () => { throw new Error("Network access is forbidden in ZIP tests"); };
  const values = { fetch: deniedFetch, process: { env: {} }, ...scope };
  return new Function(...Object.keys(values), code)(...Object.values(values));
}
const zipEffect = compile(effectUsing("lookupZip", true));
const autosave = compile([
  declaration("ESTIMATE_HEADER_FIELDS", source.statements),
  declaration("buildEstimateHeaderPayload"),
  declaration("saveEstimateHeader"),
  effectUsing("headerAutosaveReadyRef"),
].join("\n"));
const zipHelpers = {};
evaluate(compile(fs.readFileSync(path.resolve(__dirname, "../src/lib/validators-zip.ts"), "utf8")), { exports: zipHelpers });
const flush = async () => { for (let i = 0; i < 3; i++) await new Promise(setImmediate); };
const tests = [];
const test = (name, run) => tests.push({ name, run });
const initial = { name: "Test estimate", customerCity: "Original city", customerState: "ZZ",
  customerPostalCode: "33101", customerTaxRate: 0 };

function fixture(values = {}) {
  const form = createFormControl({ defaultValues: { ...initial, ...values } });
  // subscribe mounts the real form-control store, as useForm does; getValues
  // and watch now observe registered field changes rather than default values.
  const stopForm = form.subscribe({ formState: { values: true }, callback() {} });
  const fields = Object.fromEntries(Object.keys(initial).map(name => [name, form.register(name)]));
  const requests = [], writes = [], saves = [], toasts = [], timers = new Map();
  let zipCleanup, saveCleanup, timerId = 0, subscriptions = 0;
  const refs = {
    headerAutosaveReadyRef: { current: false }, headerAutosaveTimeoutRef: { current: null },
    lastSavedHeaderRef: { current: "" }, headerSaveQueueRef: { current: Promise.resolve() },
  };
  const scope = {
    ...zipHelpers,
    watch(callback) {
      subscriptions++;
      const subscription = form.watch(callback);
      return { unsubscribe() { subscriptions--; subscription.unsubscribe(); } };
    },
    getValues: form.getValues,
    setValue(name, value, options) { writes.push({ name, value, options }); form.setValue(name, value, options); },
    lookupZip(zip) {
      let resolve, reject;
      const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
      requests.push({ zip, resolve, reject });
      return promise;
    },
  };
  const renderZip = () => {
    zipCleanup?.();
    zipCleanup = undefined;
    evaluate(zipEffect, { ...scope, zip: form.getValues("customerPostalCode"),
      useEffect(callback) { zipCleanup = callback(); } });
  };
  const renderAutosave = () => {
    saveCleanup?.();
    evaluate(autosave, { ...scope, ...refs, canUseCustomerPricing: true,
      readOnly: false, needsRecalculation: false, estimate: { id: 41 }, headerSnapshot: "test-snapshot",
      useCallback: fn => fn, useEffect(callback) { saveCleanup = callback(); },
      trigger: form.trigger, setPromotionEstimate() {}, toast: { error: message => toasts.push(message) },
      updateEstimateHeader: async (id, payload) => { saves.push({ id, payload }); return { id, ...payload }; },
      setTimeout(callback, delay) { assert.equal(delay, 600); timers.set(++timerId, callback); return timerId; },
      clearTimeout(id) { timers.delete(id); },
    });
  };
  return {
    form, requests, writes, saves, toasts, renderZip, renderAutosave,
    // This is RHF's actual registered handler. Controller forwards the same
    // {target: {name, value}, type: 'change'} contract to its registered handler.
    async change(name, value) { await fields[name].onChange({ target: { name, value }, type: "change" }); },
    async blur(name) { await fields[name].onBlur({ target: { name, value: form.getValues(name) }, type: "blur" }); },
    async resolve(index, result) { requests[index].resolve(result); await flush(); },
    async reject(index) { requests[index].reject(new Error("Simulated lookup failure")); await flush(); },
    async runAutosaveTimers() {
      const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn());
      await refs.headerSaveQueueRef.current; await flush();
    },
    unmount() { zipCleanup?.(); zipCleanup = undefined; saveCleanup?.(); saveCleanup = undefined; stopForm(); },
    subscriptions: () => subscriptions,
  };
}

test("normal response fills both fields and retains dirty flags", async () => {
  const f = fixture(); f.renderZip();
  assert.equal(f.requests[0].zip, "33101");
  await f.resolve(0, { city: "Miami", state: "FL" });
  assert.equal(f.form.getValues("customerCity"), "Miami");
  assert.equal(f.form.getValues("customerState"), "FL");
  assert.deepEqual(f.writes.map(write => write.options), [{ shouldDirty: true }, { shouldDirty: true }]);
  f.unmount();
});

test("ZIP A then B with reversed responses keeps the B location", async () => {
  const f = fixture(); f.renderZip();
  await f.change("customerPostalCode", "10001"); f.renderZip();
  assert.deepEqual(f.requests.map(request => request.zip), ["33101", "10001"]);
  await f.resolve(1, { city: "New York", state: "NY" });
  await f.resolve(0, { city: "Miami", state: "FL" });
  assert.equal(f.form.getValues("customerCity"), "New York");
  assert.equal(f.form.getValues("customerState"), "NY");
  assert.equal(f.writes.length, 2, "Stale result performs no writes");
  f.unmount();
});

test("ZIP change before effect cleanup rejects the old response", async () => {
  const f = fixture(); f.renderZip();
  await f.change("customerPostalCode", "10001");
  await f.resolve(0, { city: "Miami", state: "FL" });
  assert.equal(f.writes.length, 0);
  assert.equal(f.form.getValues("customerPostalCode"), "10001");
  f.unmount();
});

test("programmatic ZIP change before effect cleanup is checked against current values", async () => {
  const f = fixture(); f.renderZip();
  f.form.setValue("customerPostalCode", "10001");
  await f.resolve(0, { city: "Miami", state: "FL" });
  assert.equal(f.writes.length, 0);
  f.unmount();
});

for (const field of ["customerCity", "customerState"]) {
  test(`pending lookup preserves manual ${field} and does not write the other field`, async () => {
    const f = fixture(); f.renderZip();
    await f.change(field, field === "customerCity" ? "Manual city" : "CA");
    const expected = f.form.getValues();
    await f.resolve(0, { city: "Miami", state: "FL" });
    assert.deepEqual(f.form.getValues(), expected);
    assert.equal(f.writes.length, 0, "Manual edit invalidates the complete response");
    f.unmount();
  });
}

for (const field of ["customerPostalCode", "customerCity", "customerState"]) {
  test(`manual ${field} change and reversal still invalidates the request without rerender`, async () => {
    const f = fixture(); f.renderZip();
    const original = f.form.getValues(field);
    await f.change(field, field === "customerPostalCode" ? "10001" : "Changed");
    await f.change(field, original);
    await f.resolve(0, { city: "Miami", state: "FL" });
    assert.equal(f.writes.length, 0);
    f.unmount();
  });
}

test("blur, validation and unrelated edits do not cancel a valid result", async () => {
  const f = fixture(); f.renderZip();
  await f.blur("customerCity"); await f.blur("customerPostalCode");
  await f.form.trigger();
  await f.change("name", "Updated project");
  await f.resolve(0, { city: "Miami", state: "FL" });
  assert.equal(f.form.getValues("customerCity"), "Miami");
  assert.equal(f.form.getValues("customerState"), "FL");
  f.unmount();
});

for (const result of ["null", "rejection"]) {
  test(`${result} lookup leaves current address unchanged`, async () => {
    const f = fixture(); f.renderZip();
    if (result === "null") await f.resolve(0, null); else await f.reject(0);
    assert.equal(f.writes.length, 0);
    assert.equal(f.form.getValues("customerCity"), initial.customerCity);
    assert.equal(f.form.getValues("customerState"), initial.customerState);
    f.unmount();
  });
}

test("invalid ZIP never starts lookup and invalidation protects pending results", async () => {
  const f = fixture({ customerPostalCode: "12" }); f.renderZip();
  assert.equal(f.requests.length, 0);
  await f.change("customerPostalCode", "33101"); f.renderZip();
  await f.change("customerPostalCode", "12"); f.renderZip();
  await f.resolve(0, { city: "Miami", state: "FL" });
  assert.equal(f.requests.length, 1); assert.equal(f.writes.length, 0);
  f.unmount();
});

test("unmount cancels result writes and unsubscribes the lookup watcher", async () => {
  const f = fixture(); f.renderZip(); f.unmount();
  assert.equal(f.subscriptions(), 0);
  await f.resolve(0, { city: "Miami", state: "FL" });
  assert.equal(f.writes.length, 0);
});

test("autosave persists only the current ZIP B address after out-of-order lookup", async () => {
  const f = fixture(); f.renderZip(); f.renderAutosave();
  await f.change("customerPostalCode", "10001"); f.renderZip(); f.renderAutosave();
  await f.resolve(1, { city: "New York", state: "NY" }); f.renderAutosave();
  await f.resolve(0, { city: "Miami", state: "FL" });
  await f.runAutosaveTimers();
  assert.equal(f.saves.length, 1);
  assert.equal(f.saves[0].id, 41);
  assert.equal(f.saves[0].payload.customerPostalCode, "10001");
  assert.equal(f.saves[0].payload.customerCity, "New York");
  assert.equal(f.saves[0].payload.customerState, "NY");
  assert.deepEqual(f.toasts, []);
  f.unmount();
});

test("autosave preserves a manual address instead of a late ZIP response", async () => {
  const f = fixture(); f.renderZip(); f.renderAutosave();
  await f.change("customerCity", "Manual city"); await f.change("customerState", "CA");
  f.renderAutosave();
  await f.resolve(0, { city: "Miami", state: "FL" });
  await f.runAutosaveTimers();
  assert.equal(f.saves.length, 1);
  assert.equal(f.saves[0].payload.customerCity, "Manual city");
  assert.equal(f.saves[0].payload.customerState, "CA");
  assert.deepEqual(f.toasts, []);
  f.unmount();
});

(async () => {
  let failures = 0;
  for (const { name, run } of tests) {
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
  }
  console.log(`${tests.length - failures}/${tests.length} ZIP lookup tests passed (real effect/RHF, simulated I/O).`);
  if (failures) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
