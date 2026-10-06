/* Window Wall shared grid: real helper and PieceForm effects/handlers with RHF,
 * the real form grid JSX, and the real SVG renderer via React SSR. No API/DB.
 * Run from frontend: node scripts/test-window-wall-muntin.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { fixture, patterns, types, fullView, rule, policy, helper } = require('./test-muntin-availability.cjs');
const { buildWindowWallMuntinLayout: layout, syncWindowWallMuntinPanels: sync,
  hasAmbiguousWindowWallMuntinPanels: ambiguous } = helper;
// The imported fixture blocks fetch and HTTP(S). Load only explicit source files.
const root = path.resolve(__dirname, '../src');
const cache = new Map();
const compile = (code, filename = 'fixture.tsx') => ts.transpileModule(code, { fileName: filename,
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, resolveJsonModule: true } }).outputText;
function load(filename) {
  filename = path.resolve(root, filename); assert.ok(filename.startsWith(root + path.sep));
  if (cache.has(filename)) return cache.get(filename).exports;
  if (filename.endsWith('.json')) return JSON.parse(fs.readFileSync(filename, 'utf8'));
  assert.match(filename, /\.tsx?$/);
  const module = { exports: {} }; cache.set(filename, module);
  new Function('require', 'module', 'exports', compile(fs.readFileSync(filename, 'utf8'), filename))(id => {
    if (id === 'react' || id === 'react/jsx-runtime') return require(id);
    const target = id.startsWith('@/') ? path.resolve(root, id.slice(2))
      : id.startsWith('.') ? path.resolve(path.dirname(filename), id) : null;
    assert.ok(target, `Unexpected dependency ${id}`);
    const resolved = (path.extname(target) ? [target] : ['.ts', '.tsx', '.json'].map(ext => target + ext))
      .find(file => fs.existsSync(file)); assert.ok(resolved, id);
    return load(resolved);
  }, module, module.exports);
  return module.exports;
}
const { WindowWallDiagram } = load('components/piece-diagram/renderers/window-wall/window-wall-diagram.tsx');
const { resolveFormMuntinForDiagram } = load('components/piece-diagram/muntin-data.ts');
const diagramTypes = types.map(type => ({ ...type, name: type.id === 61 ? '1 in Flat-Flat' : '1 in Ogee-Flat' }));
const shared = (horizontalLites = 2, verticalLites = 3) => [{ ...layout()[0], horizontalLites, verticalLites }];
const legacy = (count = 6, horizontalLites = 2, verticalLites = 3) => Array.from({ length: count }, (_, index) => ({
  panelIndex: index + 1, panelCode: `R${Math.floor(index / 2) + 1}C${index % 2 + 1}`,
  panelLabel: `Old cell ${index + 1}`, horizontalLites, verticalLites,
}));
const colonial = panels => ({ idPattern: 20, idType: 61, panels });
const wwFixture = (selection = fullView(), overrides = {}, settings = {}) => fixture(
  { dimensionMode: 'WINDOW_WALL', ...settings }, selection,
  { selectedConfig: { id: 2, muntinLayout: [] },
    formValues: { height: '90', panelCount: 2, horizontalHeights: [30, 60] }, ...overrides });
const attrs = value => Object.fromEntries([...value.matchAll(/([\w:-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
const groups = html => [...html.matchAll(/<g\b([^>]*data-part="muntin-panel"[^>]*)>/g)].map(match => attrs(match[1]));
const render = (selection, props = {}) => renderToStaticMarkup(React.createElement(WindowWallDiagram, {
  width: 120, height: 90, panelCount: 2, horizontalHeights: [30, 60], showDimensions: false,
  muntin: resolveFormMuntinForDiagram(selection, patterns, diagramTypes), ...props,
}));

const source = ts.createSourceFile('piece-form.tsx', fs.readFileSync(path.join(root, 'components/estimates/piece-form.tsx'), 'utf8'),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let gridExpression;
function findGrid(node) {
  if (ts.isConditionalExpression(node) && node.condition.getText(source).startsWith('!patternRequiresLites')
    && node.getText(source).includes('currentMuntinPanels.map')) gridExpression = node.getText(source);
  ts.forEachChild(node, findGrid);
}
findGrid(source); assert.ok(gridExpression, 'Actual PieceForm grid JSX');
const gridCode = compile(`return (${gridExpression});`);
function renderFormGrid(f) {
  const values = f.values();
  const scope = { exports: {}, require(id) { assert.equal(id, 'react/jsx-runtime'); return require(id); },
    patternRequiresLites: values.patternRequiresLites, hasAmbiguousWindowWallMuntin: values.ambiguous,
    hasMuntinLayout: values.hasMuntinLayout, currentMuntinPanels: values.panels,
    isWindowWall: values.isWindowWall, isLocked: f.state.isLocked, inputClass: '',
    handleMuntinPanelChange: values.panel, Input: props => React.createElement('input', props) };
  return renderToStaticMarkup(new Function(...Object.keys(scope), gridCode)(...Object.values(scope)));
}
const tests = [];
const test = (name, run) => tests.push({ name, run });

test('WW defines exactly one persisted configuration for all glass panels', () => {
  assert.deepEqual(layout(), [{ panelIndex: 1, panelCode: 'O', panelLabel: 'All glass panels' }]);
  assert.deepEqual(sync(layout(), []), shared(1, 1));
});
test('A single legacy panel keeps its H/V without using its index, code or position', () => {
  assert.deepEqual(sync(layout(), [{ ...legacy(1, 4, 5)[0], panelIndex: 99, panelCode: 'Right' }]), shared(4, 5));
});
test('Uniform legacy grids collapse to one pair regardless of count, order or codes', () => {
  for (const count of [2, 4, 6, 9]) {
    const panels = legacy(count, 3, 4).reverse();
    assert.equal(ambiguous(layout(), panels), false); assert.deepEqual(sync(layout(), panels), shared(3, 4));
  }
});
test('Nonuniform legacy values are never silently chosen or overwritten', () => {
  for (const axis of ['horizontalLites', 'verticalLites']) {
    const panels = legacy(); panels[3][axis] += 1;
    assert.equal(ambiguous(layout(), panels), true); assert.equal(sync(layout(), panels), panels);
  }
});
test('Invalid or partial H/V remains reviewable instead of becoming one by one', () => {
  for (const value of [undefined, null, 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    const panels = [{ ...shared()[0], horizontalLites: value }];
    assert.equal(ambiguous(layout(), panels), true, String(value)); assert.equal(sync(layout(), panels), panels);
  }
});
test('An unchanged shared panel retains identity independently of object-property order', () => {
  const panels = [{ panelIndex: 1, panelLabel: 'All glass panels', panelCode: 'O', horizontalLites: 2, verticalLites: 3 }];
  assert.equal(sync(layout(), panels), panels);
});
test('PieceForm offers Colonial with empty static layout and renders one real H/V pair', () => {
  const f = wwFixture(); f.values().pattern('20'); f.render();
  assert.deepEqual(f.form.getValues('muntin').panels, shared(1, 1));
  const html = renderFormGrid(f);
  assert.equal((html.match(/<input\b/g) ?? []).length, 2);
  assert.match(html, /All glass panels/); assert.doesNotMatch(html, /Row \d|Column \d/); f.close();
});
test('Dimension mode selects the WW rule independently of diagram family', () => {
  const f = wwFixture(fullView(), { selectedProduct: { diagramFamily: 'GENERIC' } });
  assert.ok(f.values().patterns.some(p => p.id === 20)); f.close();
  const standard = fixture({ dimensionMode: 'STANDARD' }, fullView(), {
    selectedProduct: { diagramFamily: 'WINDOW_WALL' }, selectedConfig: { id: 2, muntinLayout: [] },
  });
  assert.deepEqual(standard.values().patterns.map(p => p.id), [10]); standard.close();
});
test('Opening a calculated shared grid keeps its price and Submit state untouched', () => {
  const saved = colonial(shared()); const f = wwFixture(saved);
  assert.deepEqual(f.writes, []); assert.equal(f.disabled(), false);
  assert.deepEqual(f.form.getValues('muntin'), saved); f.render(); assert.deepEqual(f.writes, []); f.close();
});
test('Changing columns, cuts or incomplete dimensions never resets the shared H/V', () => {
  const f = wwFixture(colonial(shared(4, 5)));
  for (const [name, value] of [['panelCount', 3], ['horizontalHeights', [20, 40, 60]],
    ['height', ''], ['horizontalHeights', [30, 30]], ['panelCount', null], ['horizontalHeights', []]]) {
    f.form.setValue(name, value); f.render(); assert.deepEqual(f.form.getValues('muntin').panels, shared(4, 5));
    assert.equal((renderFormGrid(f).match(/<input\b/g) ?? []).length, 2);
  }
  assert.deepEqual(f.writes.filter(write => write.name === 'muntin'), []); f.close();
});
test('The actual form handler edits the sole shared H/V pair', () => {
  const f = wwFixture(colonial(shared()));
  f.values().panel(1, 'horizontalLites', '7'); f.render();
  f.values().panel(1, 'verticalLites', '4'); f.render();
  assert.deepEqual(f.form.getValues('muntin').panels, shared(7, 4)); f.close();
});
test('Geometry and shared-count edits invalidate pending calculation synchronously', () => {
  const f = wwFixture(colonial(shared()));
  for (const edit of [() => f.form.setValue('panelCount', 3),
    () => f.form.setValue('horizontalHeights', [20, 40, 60]),
    () => f.values().panel(1, 'verticalLites', '8')]) {
    const request = f.values().latestCalculationRef.current;
    const version = f.values().calculationValuesVersionRef.current;
    const pendingIsCurrent = () => request === f.values().latestCalculationRef.current
      && version === f.values().calculationValuesVersionRef.current;
    assert.equal(pendingIsCurrent(), true); edit(); assert.equal(pendingIsCurrent(), false); f.render();
  }
  f.close();
});
test('Uniform legacy hydration collapses to one row and requires recalculation', () => {
  const f = wwFixture(colonial(legacy(6, 3, 4))); f.render();
  assert.deepEqual(f.form.getValues('muntin').panels, shared(3, 4));
  assert.equal((renderFormGrid(f).match(/<input\b/g) ?? []).length, 2);
  assert.equal(f.disabled(), true); assert.equal(f.state.accordion.includes('item-results'), false); f.close();
});
test('Nonuniform legacy hides per-cell inputs until explicit Reconfigure grid', () => {
  const panels = legacy(); panels[1].horizontalLites = 5; const saved = colonial(panels);
  const f = wwFixture(saved); assert.equal(f.values().ambiguous, true);
  assert.deepEqual(f.form.getValues('muntin'), saved); assert.equal(renderFormGrid(f), '');
  assert.equal(f.disabled(), true); assert.equal(f.state.accordion.includes('item-results'), false);
  assert.deepEqual(f.writes.filter(write => write.name === 'muntin'), []);
  f.values().reconfigure(); f.render();
  assert.equal(f.values().ambiguous, false); assert.deepEqual(f.form.getValues('muntin').panels, shared(1, 1));
  assert.equal((renderFormGrid(f).match(/<input\b/g) ?? []).length, 2);
  assert.equal(f.disabled(), true); assert.equal(f.state.accordion.includes('item-results'), false); f.close();
});
test('Full View remains empty and no exact rule continues to forbid Colonial', () => {
  const f = wwFixture(); f.form.setValue('panelCount', 3); f.render();
  assert.deepEqual(f.form.getValues('muntin'), fullView()); assert.equal(renderFormGrid(f), ''); f.close();
  const restricted = wwFixture(fullView(), {}, policy());
  restricted.values().pattern('20'); assert.deepEqual(restricted.form.getValues('muntin'), fullView()); restricted.close();
});
test('An unavailable historical profile stays reviewable until deliberate reconfiguration', () => {
  const saved = colonial(shared(4, 5)); saved.idType = 62;
  const f = wwFixture(saved, {}, policy(rule(20, [61])));
  assert.deepEqual(f.form.getValues('muntin'), saved); assert.equal(f.disabled(), true);
  f.values().pattern('20'); f.render();
  assert.equal(f.form.getValues('muntin').idType, 61); assert.deepEqual(f.form.getValues('muntin').panels, shared(4, 5)); f.close();
});
test('SSR repeats the shared 2x3 grid in all six crystals', () => {
  const rendered = groups(render(colonial(shared()))); assert.equal(rendered.length, 6);
  assert.ok(rendered.every(group => group['data-horizontal-lites'] === '2' && group['data-vertical-lites'] === '3'));
});
test('SSR repetition follows current geometry without requiring extra persisted panels', () => {
  for (const [panelCount, horizontalHeights, count] of [[1, [], 1], [3, [], 3], [3, [30, 60], 9], [1, [30, 60], 3]]) {
    const rendered = groups(render(colonial(shared(3, 4)), { panelCount, horizontalHeights }));
    assert.equal(rendered.length, count);
    assert.ok(rendered.every(group => group['data-horizontal-lites'] === '3' && group['data-vertical-lites'] === '4'));
  }
});
test('SSR accepts uniform saved arrays but refuses to choose between unequal counts', () => {
  assert.equal(groups(render(colonial(legacy(2, 3, 4)))).length, 6);
  const nonuniform = legacy(); nonuniform[2].verticalLites = 5;
  assert.equal(groups(render(colonial(nonuniform))).length, 0);
  assert.equal(groups(render(fullView())).length, 0);
});

let failed = 0;
for (const { name, run } of tests) {
  try { run(); console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}\n${error.stack}`); }
}
console.log(`${tests.length - failed}/${tests.length} Window Wall shared-grid tests passed`);
if (failed) process.exitCode = 1;
