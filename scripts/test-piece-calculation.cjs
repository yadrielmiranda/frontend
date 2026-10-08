/* Isolated stale-calculation regression tests.
 * Executes PieceForm's actual handler, guard effects, Submit condition and submit
 * callback selected with the TypeScript AST, using real RHF form notifications.
 * React lifecycle is simulated (no DOM renderer); all API requests are deferred
 * mocks. No environment files, network, database or generated application files.
 * Run from frontend: node scripts/test-piece-calculation.cjs */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { createFormControl } = require("react-hook-form");

const filename = path.resolve(__dirname, "../src/components/estimates/piece-form.tsx");
const source = ts.createSourceFile(filename, fs.readFileSync(filename, "utf8"),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "PieceForm");
assert.ok(component?.body, "Real PieceForm source exists");
const statements = component.body.statements;
function containsIdentifier(node, name) {
  return (ts.isIdentifier(node) && node.text === name)
    || Boolean(ts.forEachChild(node, child => containsIdentifier(child, name)));
}
function declaration(name, list = statements) {
  const node = list.find(node => (ts.isFunctionDeclaration(node) && node.name?.text === name)
    || (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(source) === name)));
  assert.ok(node, `Real declaration ${name} exists`);
  return node.getText(source);
}
function jsxAttribute(tag, attr, predicate = () => true) {
  const found = [];
  function visit(node) {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
      && node.tagName.getText(source) === tag && predicate(node)) {
      const attribute = node.attributes.properties.find(prop => ts.isJsxAttribute(prop) && prop.name.text === attr);
      if (attribute?.initializer && ts.isJsxExpression(attribute.initializer)) found.push(attribute.initializer.expression.getText(source));
    }
    ts.forEachChild(node, visit);
  }
  visit(component);
  assert.equal(found.length, 1, `Exactly one ${tag}.${attr} selected`);
  return found[0];
}
const submitDisabled = jsxAttribute("Button", "disabled", node => node.attributes.properties.some(prop =>
  ts.isJsxAttribute(prop) && prop.name.text === "type" && prop.initializer?.text === "submit"));
const submitCallback = jsxAttribute("form", "onSubmit");
const guardNames = ["latestCalculationRef", "calculationValuesVersionRef"];
// Before the fix these declarations/effects are absent. The same behavioral
// tests therefore execute the original handler and reproduce its stale writes.
const guardStatements = statements.filter(node =>
  (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => guardNames.includes(d.name.getText(source))))
  || (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)
    && ["useEffect", "useLayoutEffect"].includes(node.expression.expression.getText(source))
    && containsIdentifier(node, "calculationValuesVersionRef")));
function compile(code) {
  return ts.transpileModule(code, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  } }).outputText;
}
const handlerCode = compile([
  declaration("withoutInactiveDimensions", source.statements),
  declaration("MIN_HORIZONTAL_HEIGHT_IN", source.statements),
  ...guardStatements.map(node => node.getText(source)),
  declaration("handleCalculate"), declaration("handleUnlock"),
  "return { calculate: handleCalculate, unlock: handleUnlock };",
].join("\n"));
const forbiddenNetwork = () => { throw new Error("Network access is forbidden in calculation tests"); };
globalThis.fetch = forbiddenNetwork;
for (const name of ["node:http", "node:https"]) {
  const transport = require(name);
  transport.request = transport.get = forbiddenNetwork;
}
function evaluate(code, scope) {
  const values = { fetch: forbiddenNetwork, process: { env: {} }, ...scope };
  return new Function(...Object.keys(values), code)(...Object.values(values));
}
function loadPureModule(relative) {
  const exports = {};
  evaluate(compile(fs.readFileSync(path.resolve(__dirname, relative), "utf8")), { exports });
  return exports;
}
const dimensions = loadPureModule("../src/lib/dimensions.ts");
const formatters = loadPureModule("../src/lib/formatters.ts");
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const flush = async () => { for (let i = 0; i < 3; i++) await new Promise(setImmediate); };
const initial = {
  id: 7, mark: "W1", idProd: 1, idBrand: 2, idSyst: 3, idConf: 4, idFC: 5,
  idCryst: 6, idTint: 7, idCoat: 8, idPrivacy: 9, width: "36", height: "48", qty: 2,
  screen: false, highBottom: false, highBottomPercent: null, idActiveOption: null,
  idPreparationOption: null, idSillOption: null, idReinforcementOption: null,
  muntin: null, panelCount: null, dealerMarkup: 25, price: 0, subtotal: 0,
  netProfitD: 0, customerPrice: 0, customerSubtotal: 0, total: 0,
  dpPosPsf: null, dpNegPsf: null,
};
const response = (price = 100) => ({ price, subtotal: price * 2, netProfitD: price / 2,
  customerPrice: price * 1.25, customerSubtotal: price * 2.5,
  regularPrice: price + 10, regularCustomerPrice: (price + 10) * 1.25,
  promotionSnapshot: { label: "Test promotion" }, highBottom: false,
  highBottomPercent: null, muntin: null, panelCount: 2, dpPosPsf: "70", dpNegPsf: "-80" });

function fixture(options = {}) {
  const form = createFormControl({ defaultValues: structuredClone({ ...initial, ...options.values }) });
  const stopForm = form.subscribe({ formState: { values: true }, callback() {} });
  const registered = new Map();
  const field = name => { if (!registered.has(name)) registered.set(name, form.register(name)); return registered.get(name); };
  Object.keys(form.getValues()).forEach(field);
  const requests = [], prechecks = [], validations = [], writes = [], errors = [], successes = [], submissions = [];
  const refs = [], effects = [];
  let refIndex = 0, effectIndex = 0, subscriptions = 0, mounted = true;
  const state = { isLocked: options.locked ?? false, hasPendingDealerMarkup: options.pendingMarkup ?? false,
    activeAccordionItems: [], isSubmitting: false };
  const requirements = { requiresWidth: true, requiresHeight: !options.linear, ...options.requirements };
  const calculateMock = kind => (dto, ...context) => {
    const pending = deferred();
    requests.push({ kind, dto: structuredClone(dto), context, ...pending });
    return pending.promise;
  };
  const props = { estimateId: 41, canUseCustomerPricing: true,
    onCalculate: options.revision ? calculateMock("revision") : undefined };
  const scope = {
    ...dimensions, ...formatters, props, initialData: { id: initial.id },
    selectedConfigUnavailable: false, selectedCrystalUnavailable: false,
    selectedConfig: { id: 4 }, isLinearMaterial: Boolean(options.linear),
    reinforcementRequired: false, dimensionRequirements: requirements,
    widthLabel: "Width", heightLabel: "Height", fixedPanelCount: undefined,
    requiresManualPanelCount: false, highBottomAllowed: true,
    getValues: form.getValues,
    setValue(name, value, flags) { writes.push({ name, value: structuredClone(value), flags }); form.setValue(name, value, flags); },
    watch(callback) {
      subscriptions++;
      const subscription = form.watch(callback);
      return { unsubscribe() { subscriptions--; subscription.unsubscribe(); } };
    },
    trigger: async names => {
      const result = await form.trigger(names);
      if (!options.deferValidation) return result;
      const pending = deferred(); validations.push(pending); return pending.promise;
    },
    validatePiece(dto) {
      const pending = deferred(); prechecks.push({ dto: structuredClone(dto), ...pending });
      if (!options.deferPrecheck) pending.resolve({ ok: true });
      return pending.promise;
    },
    calculatePiece: calculateMock("estimate"),
    toast: { error: message => errors.push(message), success: message => successes.push(message) },
    setIsLocked: value => { state.isLocked = value; },
    setResultsScrollRequest: value => { state.resultsScrollRequest = value; },
    setHasPendingDealerMarkup: value => { state.hasPendingDealerMarkup = value; },
    setActiveAccordionItems: update => { state.activeAccordionItems = typeof update === "function" ? update(state.activeAccordionItems) : update; },
    useRef(initialValue) { const index = refIndex++; return refs[index] ??= { current: initialValue }; },
    useLayoutEffect(callback, deps) {
      const index = effectIndex++, previous = effects[index];
      if (previous && deps.every((value, i) => Object.is(value, previous.deps[i]))) return;
      previous?.cleanup?.(); effects[index] = { deps, cleanup: callback() };
    },
  };
  let handlers;
  const render = () => {
    refIndex = 0; effectIndex = 0;
    handlers = evaluate(handlerCode, { ...scope, activeAccordionItems: state.activeAccordionItems });
  };
  render();
  return {
    form, state, requests, prechecks, validations, writes, errors, successes, submissions, props,
    calculate() { return handlers.calculate(); }, render,
    async start() { const done = handlers.calculate(); await flush(); return { done }; },
    async change(name, value) { await field(name).onChange({ target: { name, value }, type: "change" }); },
    async blur(name) { await field(name).onBlur({ target: { name, value: form.getValues(name) }, type: "blur" }); },
    async resolve(index, value = response()) { requests[index].resolve(value); await flush(); },
    async reject(index) { requests[index].reject(new Error("Simulated calculation failure")); await flush(); },
    disabled() { return evaluate(`return (${submitDisabled});`, state); },
    async submit() {
      assert.equal(this.disabled(), false, "Submit must be enabled before clicking it");
      const callback = evaluate(compile(declaration("withoutInactiveDimensions", source.statements) + `\nreturn (${submitCallback});`),
        { handleSubmit: form.handleSubmit, onSubmit: values => submissions.push(structuredClone(values)), dimensionRequirements: requirements });
      await callback();
    },
    unmount() {
      if (!mounted) return;
      mounted = false; effects.forEach(effect => effect.cleanup?.()); stopForm();
    },
    subscriptions: () => subscriptions,
  };
}

const tests = [];
const test = (name, run) => tests.push({ name, run });
function assertNotApplied(f) {
  assert.equal(f.form.getValues("price"), 0, "Obsolete result must not set price");
  assert.equal(f.form.getValues("customerPrice"), 0, "Obsolete result must not set customer price");
  assert.equal(f.state.isLocked, false, "Obsolete result must not lock fields");
  assert.equal(f.disabled(), true, "Obsolete result must not enable Submit");
  assert.deepEqual(f.successes, [], "Obsolete result must not announce success");
}

for (const revision of [false, true]) {
  const route = revision ? "material revision" : "estimate";
  test(`${route}: unchanged calculation applies results, locks and submits normally`, async () => {
    const f = fixture({ revision }); const { done } = await f.start();
    assert.equal(f.state.isLocked, false, "Fields remain editable while calculating");
    assert.equal(f.disabled(), true);
    assert.equal(f.requests.length, 1); assert.equal(f.prechecks.length, 1);
    assert.equal(f.requests[0].kind, revision ? "revision" : "estimate");
    assert.equal(f.requests[0].dto.width, "36"); assert.equal(f.requests[0].dto.qty, 2);
    if (!revision) assert.deepEqual(f.requests[0].context, [41, 7]);
    await f.resolve(0); await done;
    assert.equal(f.form.getValues("price"), 100); assert.equal(f.form.getValues("subtotal"), 200);
    assert.equal(f.form.getValues("customerPrice"), 125); assert.equal(f.form.getValues("total"), 250);
    assert.equal(f.form.getValues("dpPosPsf"), 70); assert.equal(f.form.getValues("dpNegPsf"), -80);
    assert.equal(f.state.isLocked, true); assert.equal(f.disabled(), false);
    assert.equal(f.successes.length, 1); assert.deepEqual(f.errors, []);
    await f.submit(); assert.equal(f.submissions.length, 1); assert.equal(f.submissions[0].price, 100);
    assert.equal(f.submissions[0].width, "36"); f.unmount();
  });
  for (const [name, value] of [["width", "40"], ["height", "60"], ["idTint", 12], ["qty", 3], ["dealerMarkup", 40]]) {
    test(`${route}: changing ${name} while pending cannot apply or unlock Submit`, async () => {
      const f = fixture({ revision }); const { done } = await f.start();
      await f.change(name, value); await f.resolve(0); await done;
      assertNotApplied(f); assert.equal(f.form.getValues(name), value); f.unmount();
    });
  }
  test(`${route}: reversed responses retain only the newest calculation`, async () => {
    const f = fixture({ revision }); const a = await f.start();
    await f.change("width", "40"); f.render(); const b = await f.start();
    assert.equal(f.requests[0].dto.width, "36"); assert.equal(f.requests[1].dto.width, "40");
    await f.resolve(1, response(300)); await b.done;
    const newest = structuredClone(f.form.getValues()); const writeCount = f.writes.length;
    await f.resolve(0, response(100)); await a.done;
    assert.deepEqual(f.form.getValues(), newest); assert.equal(f.writes.length, writeCount);
    assert.equal(f.form.getValues("price"), 300); assert.equal(f.state.isLocked, true);
    assert.equal(f.disabled(), false); assert.equal(f.successes.length, 1); f.unmount();
  });
}

test("older response arriving first leaves fields editable until the latest succeeds", async () => {
  const f = fixture(); const a = await f.start(); await f.change("height", "60"); const b = await f.start();
  await f.resolve(0); await a.done; assertNotApplied(f);
  await f.resolve(1, response(200)); await b.done;
  assert.equal(f.form.getValues("price"), 200); assert.equal(f.disabled(), false); f.unmount();
});
test("two calculations with identical inputs still accept only the latest request", async () => {
  const f = fixture(); const a = await f.start(); const b = await f.start();
  await f.resolve(1, response(200)); await b.done; await f.resolve(0, response(100)); await a.done;
  assert.equal(f.form.getValues("price"), 200); assert.equal(f.successes.length, 1); f.unmount();
});
test("change then revert before rerender still discards the pending response", async () => {
  const f = fixture(); const { done } = await f.start();
  await f.change("width", "40"); await f.change("width", "36");
  await f.resolve(0); await done; assertNotApplied(f); f.unmount();
});
test("programmatic option change (setValue) invalidates the pending result", async () => {
  const f = fixture(); const { done } = await f.start();
  f.form.setValue("screen", true, { shouldDirty: true });
  await f.resolve(0); await done; assertNotApplied(f); assert.equal(f.form.getValues("screen"), true); f.unmount();
});
test("nested muntin edit invalidates the pending result", async () => {
  const f = fixture({ values: { muntin: { idPattern: 1, idType: 2, panels: [{ panelIndex: 1, horizontalLites: 2, verticalLites: 2 }] } } });
  const { done } = await f.start(); f.form.setValue("muntin.panels.0.horizontalLites", 3);
  await f.resolve(0); await done; assertNotApplied(f);
  assert.equal(f.form.getValues("muntin.panels.0.horizontalLites"), 3); f.unmount();
});
test("horizontal heights edited through setValue invalidate the pending result", async () => {
  const f = fixture({ values: { height: "72", horizontalHeights: [24] }, requirements: { requiresHorizontalHeights: true } });
  const { done } = await f.start();
  assert.deepEqual(f.requests[0].dto.horizontalHeights, [24]);
  f.form.setValue("horizontalHeights", [36], { shouldDirty: true, shouldValidate: true });
  await f.resolve(0); await done; assertNotApplied(f);
  assert.deepEqual(f.form.getValues("horizontalHeights"), [36]); f.unmount();
});
test("change during form validation stops the obsolete flow before any API call", async () => {
  const f = fixture({ deferValidation: true }); const done = f.calculate(); await flush();
  await f.change("width", "40"); f.validations[0].resolve(true); await flush();
  assert.equal(f.requests.length, 0); assert.equal(f.prechecks.length, 0); await done; assertNotApplied(f); f.unmount();
});
test("change during dimensional precheck stops the obsolete flow before calculation", async () => {
  const f = fixture({ deferPrecheck: true }); const { done } = await f.start();
  await f.change("height", "60"); f.prechecks[0].resolve({ ok: true }); await flush();
  assert.equal(f.requests.length, 0); await done; assertNotApplied(f); f.unmount();
});
test("stale dimensional precheck failure does not show an error for old inputs", async () => {
  const f = fixture({ deferPrecheck: true }); const { done } = await f.start();
  await f.change("height", "60"); f.prechecks[0].resolve({ ok: false, reason: "NOT_RATED" }); await done;
  assert.deepEqual(f.errors, []); assertNotApplied(f); f.unmount();
});
test("current dimensional rejection keeps its existing error and does not calculate", async () => {
  const f = fixture({ deferPrecheck: true }); const { done } = await f.start();
  f.prechecks[0].resolve({ ok: false, reason: "NOT_RATED", note: "Test policy rejection" }); await done;
  assert.equal(f.requests.length, 0); assert.deepEqual(f.errors, ["Test policy rejection"]);
  assertNotApplied(f); f.unmount();
});
test("a second attempt supersedes the first even while form validation is pending", async () => {
  const f = fixture({ deferValidation: true }); const a = await f.start(); const b = await f.start();
  f.validations[1].resolve(true); await flush(); assert.equal(f.requests.length, 1);
  await f.resolve(0, response(300)); await b.done;
  f.validations[0].resolve(true); await flush();
  assert.equal(f.requests.length, 1); await a.done;
  assert.equal(f.form.getValues("price"), 300); assert.equal(f.disabled(), false); f.unmount();
});
test("normalization, blur and validation notifications do not discard a valid calculation", async () => {
  const f = fixture({ values: { width: "36 3/8" } }); const { done } = await f.start();
  assert.equal(f.requests[0].dto.width, "36.375"); assert.equal(f.form.getValues("width"), "36.375");
  await f.blur("width"); await f.form.trigger(); f.form.setValue("width", "36.375");
  await f.resolve(0); await done;
  assert.equal(f.form.getValues("price"), 100); assert.equal(f.disabled(), false); f.unmount();
});
test("linear material retains its normal calculation without dimensional precheck", async () => {
  const f = fixture({ linear: true }); const { done } = await f.start();
  assert.equal(f.prechecks.length, 0); assert.equal(f.requests[0].dto.idCryst, null);
  await f.resolve(0); await done; assert.equal(f.disabled(), false); f.unmount();
});
test("current server failure preserves inputs and a retry can succeed", async () => {
  const f = fixture(); const a = await f.start(); await f.reject(0); await a.done;
  assertNotApplied(f); assert.deepEqual(f.errors, ["Simulated calculation failure"]);
  const b = await f.start(); await f.resolve(1); await b.done;
  assert.equal(f.form.getValues("price"), 100); assert.equal(f.disabled(), false); f.unmount();
});
test("old rejection cannot disturb a newer successful calculation", async () => {
  const f = fixture(); const a = await f.start(); await f.change("width", "40"); const b = await f.start();
  await f.resolve(1, response(300)); await b.done; await f.reject(0); await a.done;
  assert.deepEqual(f.errors, []); assert.equal(f.form.getValues("price"), 300); assert.equal(f.disabled(), false); f.unmount();
});
test("pending dealer markup edit remains pending when an old calculation resolves", async () => {
  const f = fixture({ locked: true, pendingMarkup: true }); const { done } = await f.start();
  await f.change("dealerMarkup", 40); await f.resolve(0); await done;
  assert.equal(f.form.getValues("dealerMarkup"), 40); assert.equal(f.form.getValues("price"), 0);
  assert.equal(f.state.hasPendingDealerMarkup, true); assert.equal(f.disabled(), true); f.unmount();
});
for (const outcome of ["success", "failure"]) {
  test(`unmount suppresses pending ${outcome} and cleans up subscriptions`, async () => {
    const f = fixture(); const { done } = await f.start(); const writes = f.writes.length;
    f.unmount(); assert.equal(f.subscriptions(), 0);
    if (outcome === "success") await f.resolve(0); else await f.reject(0);
    await done; assert.equal(f.writes.length, writes); assert.deepEqual(f.errors, []); assert.deepEqual(f.successes, []);
  });
}
test("switching estimate context discards the old response", async () => {
  const f = fixture(); const { done } = await f.start(); f.props.estimateId = 99; f.render();
  await f.resolve(0); await done; assertNotApplied(f); f.unmount();
});
test("a replacement calculation callback discards the old response and permits a new attempt", async () => {
  const f = fixture({ revision: true }); const a = await f.start();
  const next = deferred();
  f.props.onCalculate = () => next.promise; f.render();
  await f.resolve(0); await a.done; assertNotApplied(f);
  const b = await f.start(); next.resolve(response(300)); await b.done;
  assert.equal(f.form.getValues("price"), 300); assert.equal(f.disabled(), false);
  assert.equal(f.subscriptions(), 1); f.unmount(); assert.equal(f.subscriptions(), 0);
});
test("replacing the configuration catalog discards results for the old context", async () => {
  const f = fixture(); const { done } = await f.start();
  f.props.systemsWithConfigs = [{ id: 3, sysconfs: [] }]; f.render();
  await f.resolve(0); await done; assertNotApplied(f); f.unmount();
});
test("ordinary rerenders with unchanged context keep a pending calculation valid", async () => {
  const f = fixture({ revision: true }); const { done } = await f.start();
  f.render(); f.render(); await f.resolve(0); await done;
  assert.equal(f.form.getValues("price"), 100); assert.equal(f.disabled(), false);
  assert.equal(f.subscriptions(), 1); f.unmount();
});

(async () => {
  let failures = 0;
  for (const { name, run } of tests) {
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
  }
  console.log(`${tests.length - failures}/${tests.length} calculation tests passed (real handler/RHF; simulated lifecycle and I/O).`);
  if (failures) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
