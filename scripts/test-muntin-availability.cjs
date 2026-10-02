/* Isolated availability regression tests: real helper, PieceForm handlers/effects,
 * and React Hook Form notifications. React lifecycle is simulated, no DOM/API/DB.
 * Run from frontend: node scripts/test-muntin-availability.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createFormControl } = require('react-hook-form');
const root = path.resolve(__dirname, '../src');
const compile = code => ts.transpileModule(code, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
} }).outputText;
const forbidNetwork = () => { throw new Error('Network access is forbidden in availability tests'); };
global.fetch = forbidNetwork;
for (const name of ['node:http', 'node:https']) {
  const transport = require(name); transport.request = transport.get = forbidNetwork;
}
function evaluate(code, scope) { return new Function(...Object.keys(scope), code)(...Object.values(scope)); }
const helper = { exports: {} };
evaluate(compile(fs.readFileSync(path.join(root, 'components/estimates/muntin-availability.ts'), 'utf8')), { exports: helper.exports });
const { getMuntinOptions, normalizeMuntinSelection } = helper.exports;
const filename = path.join(root, 'components/estimates/piece-form.tsx');
const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'PieceForm');
assert.ok(component?.body);
const statements = component.body.statements;
function hasName(node, name) {
  return ts.isIdentifier(node) && node.text === name || Boolean(ts.forEachChild(node, child => hasName(child, name)));
}
function declaration(name, nodes = statements) {
  const found = nodes.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name
    || ts.isVariableStatement(node) && node.declarationList.declarations.some(item => item.name.getText(source) === name));
  assert.ok(found, `Real declaration ${name}`);
  return found.getText(source);
}
function effect(hook, identifier) {
  const found = statements.filter(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)
    && node.expression.expression.getText(source) === hook && hasName(node, identifier));
  assert.equal(found.length, 1, `One real ${hook} for ${identifier}`);
  return found[0].getText(source);
}
let submitDisabled;
function visit(node) {
  if (ts.isJsxOpeningElement(node) && node.tagName.getText(source) === 'Button'
    && node.attributes.properties.some(prop => ts.isJsxAttribute(prop) && prop.name.text === 'type' && prop.initializer?.text === 'submit')) {
    const attribute = node.attributes.properties.find(prop => prop.name?.text === 'disabled');
    submitDisabled = attribute.initializer.expression.getText(source);
  }
  ts.forEachChild(node, visit);
}
visit(component); assert.ok(submitDisabled, 'Real Submit predicate');
const fixtureCode = compile([
  declaration('buildDefaultPanelsFromLayout', source.statements),
  declaration('syncMuntinWithConfigLayout', source.statements),
  declaration('latestCalculationRef'), declaration('calculationValuesVersionRef'),
  effect('useLayoutEffect', 'calculationValuesVersionRef'),
  declaration('selectedSysConf'), declaration('hasMuntinLayout'), declaration('muntinOptions'),
  declaration('activeMuntinPatterns'), declaration('activeMuntinTypes'), declaration('defaultMuntinType'),
  declaration('defaultMuntinPattern'), declaration('defaultFullViewPattern'),
  declaration('initialMuntinAdjustedRef'),
  effect('useLayoutEffect', 'normalizeMuntinSelection'), declaration('previousSysConfKeyRef'),
  effect('useEffect', 'hasInitialResults'),
  effect('useEffect', 'syncMuntinWithConfigLayout'),
  declaration('handleMuntinPatternChange'), declaration('handleMuntinTypeChange'),
  'return { patterns: activeMuntinPatterns, types: activeMuntinTypes, pattern: handleMuntinPatternChange, type: handleMuntinTypeChange, latestCalculationRef, calculationValuesVersionRef };',
].join('\n'));
const patterns = [
  { id: 10, name: 'Full View', requiresLites: false, isActive: true, isDefault: true },
  { id: 20, name: 'Colonial', requiresLites: true, isActive: true, isDefault: false },
  { id: 30, name: 'Inactive Pattern', requiresLites: true, isActive: false, isDefault: false },
];
const types = [
  { id: 61, name: 'Flat', isActive: true, isDefault: false },
  { id: 62, name: 'Ogee', isActive: true, isDefault: true },
  { id: 63, name: 'Inactive Type', isActive: false, isDefault: false },
];
const layout = [
  { panelIndex: 1, panelCode: 'O', panelLabel: 'Top Panel' },
  { panelIndex: 2, panelCode: 'X', panelLabel: 'Bottom Panel' },
];
const colonial = (idType = 62) => ({ idPattern: 20, idType,
  panels: layout.map((part, index) => ({ ...part, horizontalLites: index + 2, verticalLites: index + 3 })) });
const fullView = () => ({ idPattern: 10, idType: null, panels: [] });
const ids = items => items.map(item => item.id);
const options = settings => getMuntinOptions(settings, patterns, types, true);
function fixture(settings = {}, selection = colonial(), overrides = {}) {
  const initialData = { id: 17, idSyst: 1, idConf: 2 };
  const form = createFormControl({ defaultValues: { ...initialData, muntin: structuredClone(selection), price: 125, screen: false } });
  const stop = form.subscribe({ formState: { values: true }, callback() {} });
  Object.keys(form.getValues()).forEach(name => form.register(name));
  const writes = [], refs = [], hooks = [];
  const state = { isLocked: true, isSubmitting: false, hasPendingDealerMarkup: false, accordion: ['item-options', 'item-results'] };
  let refIndex = 0, hookIndex = 0, values;
  const scope = {
    ...helper.exports, initialData,
    selectedConfig: { id: 2, muntinLayout: layout }, availableSysConfs: [],
    props: { muntinPatterns: patterns, muntinTypes: types },
    isLinearMaterial: false, fixedPanelCount: null, screenAllowed: false,
    hasOptionsSection: true, hasInitialResults: true,
    availableActiveOptions: [], availablePreparationOptions: [], availableSillOptions: [],
    availableReinforcementOptions: [], availableFrameColors: [],
    getValues: form.getValues, watch: form.watch,
    setValue(name, value, flags) { writes.push({ name, value: structuredClone(value), flags }); form.setValue(name, value, flags); },
    setIsLocked(value) { state.isLocked = value; },
    setActiveAccordionItems(change) { state.accordion = change(state.accordion); },
    useMemo(factory) { return factory(); },
    useRef(value) { return refs[refIndex++] ??= { current: value }; },
    ...overrides,
  };
  function runEffect(callback, deps) {
    const index = hookIndex++, previous = hooks[index];
    if (previous && deps.length === previous.deps.length && deps.every((value, i) => Object.is(value, previous.deps[i]))) return;
    previous?.cleanup?.(); hooks[index] = { deps, cleanup: callback() };
  }
  scope.useLayoutEffect = scope.useEffect = runEffect;
  function setPolicy(next, systemId = Number(form.getValues('idSyst'))) {
    scope.availableSysConfs = [{ idSystem: systemId, idConfig: 2, config: scope.selectedConfig, ...next }];
  }
  function render() {
    refIndex = 0; hookIndex = 0;
    values = evaluate(fixtureCode, { ...scope, systemId: form.getValues('idSyst'), idConf: form.getValues('idConf'), currentMuntin: form.getValues('muntin') });
  }
  setPolicy(settings); render();
  return {
    form, state, writes, scope, render, values: () => values,
    disabled: () => evaluate(`return (${submitDisabled});`, state),
    policy(next) { setPolicy(next); render(); },
    series(next) { form.setValue('idSyst', 9); setPolicy(next, 9); render(); },
    close() { hooks.forEach(hook => hook.cleanup?.()); stop(); },
  };
}
const tests = [];
const test = (name, run) => tests.push({ name, run });

test('Omitted policy and ALL retain active catalog types and patterns', () => {
  for (const settings of [undefined, {}, { muntinAvailability: 'ALL', allowedMuntinTypeIds: [61] }]) {
    assert.deepEqual(ids(options(settings).types), [61, 62]);
    assert.deepEqual(ids(options(settings).patterns), [10, 20]);
  }
});
test('NONE offers only Full View regardless of selected type IDs', () => {
  const available = options({ muntinAvailability: 'NONE', allowedMuntinTypeIds: [61, 62] });
  assert.deepEqual(ids(available.patterns), [10]); assert.deepEqual(available.types, []);
});
test('SELECTED intersects explicit IDs with active types and ignores unknown or inactive IDs', () => {
  const available = options({ muntinAvailability: 'SELECTED', allowedMuntinTypeIds: [61, 63, 999, 61] });
  assert.deepEqual(ids(available.types), [61]); assert.equal(available.defaultType.id, 61);
  assert.deepEqual(ids(available.patterns), [10, 20]);
});
test('Empty SELECTED never falls back to ALL and Full View remains available', () => {
  for (const allowedMuntinTypeIds of [undefined, [], [63, 999]]) {
    const available = options({ muntinAvailability: 'SELECTED', allowedMuntinTypeIds });
    assert.deepEqual(ids(available.patterns), [10]); assert.deepEqual(available.types, []);
  }
});
test('A missing layout keeps Full View even if the policy permits every type', () => {
  const available = getMuntinOptions({ muntinAvailability: 'ALL' }, patterns, types, false);
  assert.deepEqual(ids(available.patterns), [10]); assert.deepEqual(available.types, []);
});
test('Supported selection retains object identity and does not mutate saved data', () => {
  const selection = colonial(61), before = JSON.stringify(selection);
  assert.equal(normalizeMuntinSelection(selection, options({})), selection);
  assert.equal(JSON.stringify(selection), before);
});
test('Unsupported type changes to the only allowed one while preserving lite counts', () => {
  const selection = colonial(62);
  const normalized = normalizeMuntinSelection(selection, options({ muntinAvailability: 'SELECTED', allowedMuntinTypeIds: [61] }));
  assert.equal(normalized.idPattern, 20); assert.equal(normalized.idType, 61);
  assert.deepEqual(normalized.panels, selection.panels); assert.equal(selection.idType, 62);
});
test('The first permitted type is selected when no permitted default exists', () => {
  const available = getMuntinOptions({ muntinAvailability: 'ALL' }, patterns, types.map(type => ({ ...type, isDefault: false })), true);
  assert.equal(normalizeMuntinSelection(colonial(null), available).idType, 61);
});
test('NONE clears type and panels when an existing grid becomes unsupported', () => {
  assert.deepEqual(normalizeMuntinSelection(colonial(), options({ muntinAvailability: 'NONE' })), fullView());
});
test('Full View never acquires a type or panels during normalization', () => {
  assert.deepEqual(normalizeMuntinSelection({ ...colonial(), idPattern: 10 }, options({})), fullView());
  const selection = fullView(); assert.equal(normalizeMuntinSelection(selection, options({})), selection);
});
test('PieceForm reads the SysConf policy and exposes only its allowed dropdown options', () => {
  const f = fixture({ muntinAvailability: 'SELECTED', allowedMuntinTypeIds: [61] }, fullView());
  assert.deepEqual(ids(f.values().types), [61]); assert.deepEqual(ids(f.values().patterns), [10, 20]); f.close();
});
test('Opening an allowed calculated piece neither changes it nor disables Submit', () => {
  const f = fixture({}, colonial(62));
  assert.deepEqual(f.writes, []); assert.equal(f.state.isLocked, true); assert.equal(f.disabled(), false); f.close();
});
test('Availability normalization unlocks an old price and hides results before Submit', () => {
  const f = fixture({ muntinAvailability: 'SELECTED', allowedMuntinTypeIds: [61] }, colonial(62));
  assert.equal(f.form.getValues('muntin').idType, 61); assert.equal(f.form.getValues('price'), 125);
  assert.equal(f.state.isLocked, false); assert.equal(f.disabled(), true);
  assert.equal(f.state.accordion.includes('item-results'), false);
  assert.equal(f.writes.find(write => write.name === 'muntin').flags.shouldDirty, true); f.close();
});
test('The initial accordion effect cannot reopen results invalidated by muntin normalization', () => {
  const f = fixture({ muntinAvailability: 'NONE' }, colonial());
  assert.deepEqual(f.form.getValues('muntin'), fullView());
  assert.equal(f.state.accordion.includes('item-results'), false);
  assert.equal(f.disabled(), true);
  f.render();
  assert.equal(f.state.accordion.includes('item-results'), false);
  // A later successful Calculate explicitly opens results; a normal options
  // rerender must preserve that new result instead of treating it as historical.
  f.state.isLocked = true;
  f.state.accordion.push('item-results');
  f.scope.hasOptionsSection = false;
  f.render();
  assert.equal(f.state.accordion.includes('item-results'), true);
  f.close();
});
test('A same-config policy change invalidates the existing pending-calculation value guard', () => {
  const f = fixture({}, colonial()); const version = f.values().calculationValuesVersionRef.current;
  f.policy({ muntinAvailability: 'NONE' });
  assert.deepEqual(f.form.getValues('muntin'), fullView());
  assert.ok(f.values().calculationValuesVersionRef.current > version);
  assert.equal(f.disabled(), true); f.close();
});
test('Switching series with the same Config replaces a forbidden type and preserves counts', () => {
  const f = fixture({}, colonial(62));
  const counts = f.form.getValues('muntin').panels.map(part => [part.horizontalLites, part.verticalLites]);
  f.series({ muntinAvailability: 'SELECTED', allowedMuntinTypeIds: [61] });
  assert.equal(f.form.getValues('muntin').idType, 61);
  assert.deepEqual(f.form.getValues('muntin').panels.map(part => [part.horizontalLites, part.verticalLites]), counts);
  assert.equal(f.disabled(), true); f.close();
});
test('Switching series to NONE cannot restore forbidden panels in the later config effect', () => {
  const f = fixture({}, colonial()); f.series({ muntinAvailability: 'NONE' }); f.render();
  assert.deepEqual(f.form.getValues('muntin'), fullView()); assert.equal(f.disabled(), true); f.close();
});
test('Pattern handler automatically chooses the permitted type and rejects hidden patterns', () => {
  const f = fixture({ muntinAvailability: 'SELECTED', allowedMuntinTypeIds: [61] }, fullView());
  f.values().pattern('20'); assert.equal(f.form.getValues('muntin').idType, 61);
  assert.equal(f.form.getValues('muntin').panels.length, 2);
  f.policy({ muntinAvailability: 'NONE' }); f.values().pattern('20');
  assert.deepEqual(f.form.getValues('muntin'), fullView()); f.close();
});
test('Type handler refuses an unavailable type even if an old dropdown event arrives', () => {
  const f = fixture({ muntinAvailability: 'SELECTED', allowedMuntinTypeIds: [61] }, colonial(61));
  f.values().type('62'); assert.equal(f.form.getValues('muntin').idType, 61);
  f.values().type('0'); assert.equal(f.form.getValues('muntin').idType, 61); f.close();
});
test('Initialization on a newly selected configuration chooses Full View, not a priced grid', () => {
  const f = fixture({ muntinAvailability: 'SELECTED', allowedMuntinTypeIds: [61] }, null);
  f.series({ muntinAvailability: 'SELECTED', allowedMuntinTypeIds: [61] });
  assert.deepEqual(f.form.getValues('muntin'), fullView()); f.close();
});
test('Linear material and unresolved configs are not rewritten by the availability effect', () => {
  const f = fixture({ muntinAvailability: 'NONE' }, null, { isLinearMaterial: true });
  assert.equal(f.form.getValues('muntin'), null); f.close();
  const missing = fixture({ muntinAvailability: 'NONE' }, colonial(), { selectedConfig: null });
  assert.deepEqual(missing.form.getValues('muntin'), colonial()); missing.close();
});

let failed = 0;
for (const { name, run } of tests) {
  try { run(); console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}\n${error.stack}`); }
}
console.log(`${tests.length - failed}/${tests.length} muntin availability tests passed`);
if (failed) process.exitCode = 1;
