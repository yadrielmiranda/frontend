/* Isolated availability regression tests: real helper, PieceForm handlers/effects,
 * and React Hook Form notifications. React lifecycle is simulated, no DOM/API/DB.
 * Run from frontend: node scripts/test-muntin-availability.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createFormControl } = require('react-hook-form');
const root = path.resolve(__dirname, '../src');
const compile = code => ts.transpileModule(code, { fileName: 'fixture.tsx', compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
const forbidNetwork = () => { throw new Error('Network access is forbidden in availability tests'); };
global.fetch = forbidNetwork;
for (const name of ['node:http', 'node:https']) {
  const transport = require(name); transport.request = transport.get = forbidNetwork;
}
function evaluate(code, scope) { return new Function(...Object.keys(scope), code)(...Object.values(scope)); }
const helper = { exports: {} };
evaluate(compile(fs.readFileSync(path.join(root, 'components/estimates/muntin-availability.ts'), 'utf8')), { exports: helper.exports });
evaluate(compile(fs.readFileSync(path.join(root, 'components/estimates/window-wall-muntin.ts'), 'utf8')), {
  exports: helper.exports,
});
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
function jsxExpression(prefix, content) {
  const found = [];
  function visit(node) {
    if (ts.isJsxExpression(node) && node.expression?.getText(source).startsWith(prefix)
      && node.expression.getText(source).includes(content)) found.push(node.expression.getText(source));
    ts.forEachChild(node, visit);
  }
  visit(component); assert.equal(found.length, 1, `Real JSX ${content}`); return found[0];
}
const typeUi = jsxExpression('patternRequiresType &&', 'Muntin Type');
const presetHintUi = jsxExpression('getMuntinInputMode(selectedPattern)', 'drawing preview');
const fullViewUi = jsxExpression('!defaultFullViewPattern &&', 'Full View');
function renderExpression(expression, values) {
  const Element = ({ children }) => React.createElement('span', null, children);
  return renderToStaticMarkup(evaluate(compile(`return (${expression});`), {
    exports: {},
    require(id) { assert.equal(id, 'react/jsx-runtime'); return require(id); },
    Label: Element, Select: Element, SelectTrigger: Element, SelectValue: Element,
    SelectContent: Element, SelectItem: Element, fieldLabelClass: '', selectTriggerClass: '',
    handleMuntinTypeChange() {}, isLocked: false, ...helper.exports, ...values,
  }));
}
const fixtureCode = compile([
  declaration('buildDefaultPanelsFromLayout', source.statements),
  declaration('syncMuntinWithConfigLayout', source.statements),
  declaration('latestCalculationRef'), declaration('calculationValuesVersionRef'),
  effect('useLayoutEffect', 'calculationValuesVersionRef'),
  declaration('selectedSysConf'), declaration('isWindowWall'), declaration('windowWallMuntinLayout'),
  declaration('hasMuntinLayout'), declaration('muntinOptions'),
  declaration('activeMuntinPatterns'), declaration('activeMuntinTypes'),
  declaration('defaultMuntinPattern'), declaration('defaultFullViewPattern'),
  declaration('selectedPattern'), declaration('patternRequiresLites'), declaration('patternRequiresType'),
  'const [muntinAvailabilityNotice, setMuntinAvailabilityNotice] = useState(null);',
  declaration('previousMuntinContextRef'), declaration('muntinContextChangedRef'), declaration('hasAmbiguousWindowWallMuntin'),
  declaration('initialMuntinAdjustedRef'),
  effect('useLayoutEffect', 'normalizeMuntinSelection'), declaration('previousSysConfKeyRef'),
  effect('useEffect', 'hasInitialResults'),
  effect('useEffect', 'syncMuntinWithConfigLayout'),
  declaration('handleMuntinPatternChange'), declaration('handleMuntinTypeChange'),
  declaration('handleMuntinPanelChange'), declaration('handleReconfigureWindowWallMuntin'),
  declaration('currentMuntinPanels'),
  'return { patterns: activeMuntinPatterns, types: activeMuntinTypes, pattern: handleMuntinPatternChange, type: handleMuntinTypeChange, panel: handleMuntinPanelChange, reconfigure: handleReconfigureWindowWallMuntin, ambiguous: hasAmbiguousWindowWallMuntin, layout: windowWallMuntinLayout, panels: currentMuntinPanels, isWindowWall, patternRequiresLites, patternRequiresType, hasMuntinLayout, latestCalculationRef, calculationValuesVersionRef };',
].join('\n'));
const patterns = [
  { id: 10, name: 'Full View', requiresLites: false, isActive: true, isDefault: true },
  { id: 20, name: 'Colonial', requiresLites: true, isActive: true, isDefault: false },
  { id: 30, name: 'Inactive Pattern', requiresLites: true, isActive: false, isDefault: false },
  { id: 40, name: 'Diamond Grid', inputMode: 'GRID', requiresType: true, requiresLites: true, isActive: true },
  { id: 50, name: 'Prairie Preset', inputMode: 'PRESET', requiresType: true, requiresLites: false, isActive: true },
  { id: 60, name: 'Decorative Preset', inputMode: 'PRESET', requiresType: false, requiresLites: false, isActive: true },
  { id: 70, name: 'Integral Grid', inputMode: 'GRID', requiresType: false, requiresLites: true, isActive: true },
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
const rule = (patternId = 20, allowedTypeIds = null, crystalId = 7) => ({
  ruleId: patternId, crystalId, patternId, availability: allowedTypeIds === null ? 'ALL' : 'SELECTED', allowedTypeIds: allowedTypeIds ?? [],
});
const policy = (...rules) => ({ muntinRules: rules });
const options = (settings, selected = 20, crystal = 7, hasLayout = true) => getMuntinOptions(settings, patterns, types, hasLayout, crystal, selected);
function fixture(settings = {}, selection = colonial(), overrides = {}) {
  const initialData = { id: 17, idSyst: 1, idConf: 2, idCryst: 7 };
  const form = createFormControl({ defaultValues: { ...initialData, muntin: structuredClone(selection), price: 125, screen: false, ...overrides.formValues } });
  const stop = form.subscribe({ formState: { values: true }, callback() {} });
  Object.keys(form.getValues()).forEach(name => form.register(name));
  const writes = [], refs = [], hooks = [];
  const state = { isLocked: true, isSubmitting: false, hasPendingDealerMarkup: false, accordion: ['item-options', 'item-results'], notice: null };
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
    useState(value) { return [state.notice ?? value, next => { state.notice = next; }]; },
    ...overrides,
  };
  function runEffect(callback, deps) {
    const index = hookIndex++, previous = hooks[index];
    if (previous && deps.length === previous.deps.length && deps.every((value, i) => Object.is(value, previous.deps[i]))) return;
    previous?.cleanup?.(); hooks[index] = { deps, cleanup: callback() };
  }
  scope.useLayoutEffect = scope.useEffect = runEffect;
  function setPolicy(next, systemId = Number(form.getValues('idSyst'))) {
    scope.availableSysConfs = [{ idSystem: systemId, idConfig: scope.selectedConfig?.id ?? 2,
      config: scope.selectedConfig, muntinRules: [rule()], ...next }];
  }
  function render() {
    refIndex = 0; hookIndex = 0;
    values = evaluate(fixtureCode, { ...scope, pieceValues: form.getValues(), systemId: form.getValues('idSyst'), idConf: form.getValues('idConf'), currentMuntin: form.getValues('muntin') });
  }
  setPolicy(settings); render();
  return {
    form, state, writes, scope, render, values: () => values,
    disabled: () => evaluate(`return (${submitDisabled});`, state),
    policy(next) { setPolicy(next); render(); },
    series(next) { form.setValue('idSyst', 9); setPolicy(next, 9); render(); },
    crystal(id) { form.setValue('idCryst', id); render(); },
    config(next) { scope.selectedConfig = { ...scope.selectedConfig, id: 3 }; form.setValue('idConf', 3); setPolicy(next); render(); },
    close() { hooks.forEach(hook => hook.cleanup?.()); stop(); },
  };
}
const tests = [];
const test = (name, run) => tests.push({ name, run });

test('Missing exact rules and legacy ALL never grant divided patterns', () => {
  for (const settings of [undefined, {}, { muntinAvailability: 'ALL', allowedMuntinTypeIds: [61, 62] }, policy(rule(20, null, 8))]) {
    assert.deepEqual(ids(options(settings).patterns), [10]); assert.deepEqual(options(settings).types, []);
  }
});
test('ALL permits only active types for its exact crystal and pattern', () => {
  assert.deepEqual(ids(options(policy(rule())).types), [61, 62]);
  assert.deepEqual(ids(options(policy(rule())).patterns), [10, 20]);
  assert.deepEqual(ids(options(policy(rule()), 40).types), []);
});
test('Different patterns have independent type sets for the same crystal', () => {
  const settings = policy(rule(20, [61]), rule(40, [62]));
  assert.deepEqual(ids(options(settings, 20).types), [61]);
  assert.deepEqual(ids(options(settings, 40).types), [62]);
  assert.deepEqual(ids(options(settings).patterns), [10, 20, 40]);
});
test('Empty, inactive and unknown selected types hide a type-required pattern', () => {
  for (const typeIds of [[], [63], [999]]) assert.deepEqual(ids(options(policy(rule(20, typeIds))).patterns), [10]);
  assert.deepEqual(ids(options(policy(rule(20, [61, 63, 999, 61]))).types), [61]);
});
test('PRESET works without layout; GRID requires layout independently of type requirements', () => {
  const settings = policy(rule(), rule(50, [61]), rule(60, []), rule(70, []));
  assert.deepEqual(ids(options(settings, 50, 7, false).patterns), [10, 50, 60]);
  assert.deepEqual(ids(options(settings, 70).patterns), [10, 20, 50, 60, 70]);
});
test('Supported selections retain identity while an unsupported type becomes Full View, never another type', () => {
  const selection = colonial(62), before = JSON.stringify(selection);
  assert.equal(normalizeMuntinSelection(selection, options(policy(rule()))), selection);
  assert.deepEqual(normalizeMuntinSelection(selection, options(policy(rule(20, [61])))), fullView());
  assert.equal(JSON.stringify(selection), before);
});
test('Full View clears type and panels; PRESET keeps its type without lites', () => {
  assert.deepEqual(normalizeMuntinSelection({ ...colonial(), idPattern: 10 }, options(policy())), fullView());
  assert.deepEqual(normalizeMuntinSelection({ ...colonial(61), idPattern: 50 }, options(policy(rule(50, [61])), 50)),
    { idPattern: 50, idType: 61, panels: [] });
});
test('Opening and rerendering an allowed calculated piece preserves values and Submit', () => {
  const f = fixture(); f.render();
  assert.deepEqual(f.writes, []); assert.equal(f.disabled(), false); assert.equal(f.state.notice, null); f.close();
});
test('Opening unsupported historical details preserves values, warns and cannot submit an obsolete calculation', () => {
  const saved = colonial(62), f = fixture(policy(rule(20, [61])), saved);
  assert.deepEqual(f.form.getValues('muntin'), saved); assert.deepEqual(f.writes, []);
  assert.equal(f.form.getValues('price'), 125); assert.equal(f.disabled(), true);
  assert.match(f.state.notice, /saved muntin selection is unavailable/);
  assert.equal(f.state.accordion.includes('item-results'), false); f.render();
  assert.equal(f.state.accordion.includes('item-results'), false); assert.deepEqual(f.writes, []); f.close();
});
test('Changing crystal resets forbidden selection to Full View and shows a notice', () => {
  const f = fixture(policy(rule(), rule(20, [61], 8))); const version = f.values().calculationValuesVersionRef.current;
  f.crystal(8);
  assert.deepEqual(f.form.getValues('muntin'), fullView()); assert.equal(f.disabled(), true);
  assert.match(f.state.notice, /Full View has been selected/);
  assert.ok(f.values().calculationValuesVersionRef.current > version); f.close();
});
test('A permitted crystal switch preserves the selected pattern, type and lite counts', () => {
  const f = fixture(policy(rule(), rule(20, [62], 8))); const saved = f.form.getValues('muntin');
  f.crystal(8); assert.deepEqual(f.form.getValues('muntin'), saved); assert.equal(f.state.notice, null); f.close();
});
test('Series/config changes never silently replace a forbidden type or restore old panels', () => {
  for (const change of ['series', 'config']) {
    const f = fixture(); f[change](policy(rule(20, [61]))); f.render();
    assert.deepEqual(f.form.getValues('muntin'), fullView()); assert.equal(f.disabled(), true);
    assert.match(f.state.notice, /Full View has been selected/); f.close();
  }
});
test('Deliberate pattern selection chooses its own allowed type and updates its menu', () => {
  const f = fixture(policy(rule(20, [61]), rule(40, [62])), fullView());
  f.values().pattern('20'); f.render(); assert.equal(f.form.getValues('muntin').idType, 61);
  assert.deepEqual(ids(f.values().types), [61]);
  f.values().pattern('40'); f.render(); assert.equal(f.form.getValues('muntin').idType, 62);
  assert.deepEqual(ids(f.values().types), [62]); assert.equal(f.form.getValues('muntin').panels.length, 2); f.close();
});
test('PRESET with and without a type has no lite inputs or panels', () => {
  const f = fixture(policy(rule(50, [61]), rule(60, [])), fullView(), { selectedConfig: { id: 2, muntinLayout: [] } });
  f.values().pattern('50'); f.render();
  assert.deepEqual(f.form.getValues('muntin'), { idPattern: 50, idType: 61, panels: [] });
  assert.equal(f.values().patternRequiresType, true); assert.equal(f.values().patternRequiresLites, false);
  f.values().pattern('60'); f.render(); assert.equal(f.values().patternRequiresType, false);
  assert.deepEqual(f.form.getValues('muntin'), { idPattern: 60, idType: null, panels: [] }); f.close();
});
test('Real PRESET controls render the independent type menu and explicit preview limitation', () => {
  const selectedPattern = patterns.find(pattern => pattern.id === 50);
  const values = { selectedPattern, patternRequiresType: helper.exports.muntinPatternRequiresType(selectedPattern),
    currentMuntin: { idPattern: 50, idType: 61, panels: [] }, props: { muntinTypes: types }, activeMuntinTypes: [types[0]] };
  const html = renderExpression(typeUi, values);
  assert.match(html, /Muntin Type/); assert.match(html, /Flat/); assert.doesNotMatch(html, /Ogee/);
  assert.match(renderExpression(presetHintUi, values), /drawing preview is not available/);
  assert.equal(renderExpression(typeUi, { ...values, patternRequiresType: false }), '');
});
test('GRID without a required type keeps editable panels and no type value', () => {
  const f = fixture(policy(rule(70, [])), fullView()); f.values().pattern('70'); f.render();
  assert.equal(f.values().patternRequiresType, false); assert.equal(f.values().patternRequiresLites, true);
  assert.equal(f.form.getValues('muntin').idType, null); assert.equal(f.form.getValues('muntin').panels.length, 2); f.close();
});
test('Hidden pattern and unavailable type events cannot bypass current options', () => {
  const f = fixture(policy(rule(20, [61])), colonial(61));
  f.values().type('62'); f.values().pattern('40'); f.values().type('0');
  assert.deepEqual(f.form.getValues('muntin'), colonial(61)); f.close();
});
test('A saved unavailable selection can be deliberately repaired and its notice clears', () => {
  const f = fixture(policy(rule(20, [61])), colonial(62));
  f.values().pattern('20'); f.render(); assert.equal(f.form.getValues('muntin').idType, 61);
  assert.equal(f.state.notice, null); assert.equal(f.disabled(), true); f.close();
});
test('Initialization on a new configuration starts at Full View', () => {
  const f = fixture({}, null); f.series(policy(rule()));
  assert.deepEqual(f.form.getValues('muntin'), fullView()); f.close();
});
test('Full View remains selectable as null without inventing a missing NONE pattern ID', () => {
  const f = fixture(policy(rule()), colonial(), { props: { muntinPatterns: patterns.filter(p => p.id !== 10), muntinTypes: types } });
  f.values().pattern('none'); f.render(); assert.equal(f.form.getValues('muntin'), null);
  assert.match(renderExpression(fullViewUi, { defaultFullViewPattern: null }), /Full View/);
  f.values().pattern('20'); f.render(); assert.equal(f.form.getValues('muntin').idPattern, 20);
  f.crystal(8); assert.equal(f.form.getValues('muntin'), null); assert.match(f.state.notice, /Full View has been selected/); f.close();
});
test('Linear material and unresolved configs are not rewritten by availability', () => {
  const f = fixture(policy(), null, { isLinearMaterial: true }); assert.equal(f.form.getValues('muntin'), null); f.close();
  const missing = fixture(policy(), colonial(), { selectedConfig: null });
  assert.deepEqual(missing.form.getValues('muntin'), colonial()); missing.close();
});

module.exports = { fixture, patterns, types, fullView, rule, policy, helper: helper.exports };
if (require.main === module) {
  let failed = 0;
  for (const { name, run } of tests) {
    try { run(); console.log(`PASS ${name}`); }
    catch (error) { failed++; console.error(`FAIL ${name}\n${error.stack}`); }
  }
  console.log(`${tests.length - failed}/${tests.length} muntin availability tests passed`);
  if (failed) process.exitCode = 1;
}
