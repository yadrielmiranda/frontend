/* Isolated regressions for actual table description blocks and expanded details.
 * TypeScript is transpiled in memory; React SSR uses a stub only for the diagram.
 * No requests, environment files, database or generated application files.
 * Run: node scripts/test-piece-dimension-description.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '../src');
const cache = new Map();
const denyNetwork = () => { throw new Error('Network forbidden in description tests'); };
global.fetch = denyNetwork;
for (const protocol of ['node:http', 'node:https']) {
  const client = require(protocol); client.request = client.get = denyNetwork;
}
const compile = (source, fileName = 'fixture.tsx') => ts.transpileModule(source, {
  fileName, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
function load(filename) {
  filename = path.resolve(root, filename);
  assert.ok(filename.startsWith(root + path.sep)); assert.match(filename, /\.tsx?$/);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} }; cache.set(filename, module);
  new Function('require', 'module', 'exports', compile(fs.readFileSync(filename, 'utf8'), filename))(id => {
    if (id === 'react' || id === 'react/jsx-runtime') return require(id);
    if (id === '@/components/piece-diagram') return { PieceDiagram: () => null };
    const target = id.startsWith('@/') ? path.resolve(root, id.slice(2))
      : id.startsWith('.') ? path.resolve(path.dirname(filename), id) : null;
    assert.ok(target, `Unexpected dependency ${id}`);
    const resolved = ['.ts', '.tsx'].map(ext => target + ext).find(file => fs.existsSync(file));
    assert.ok(resolved, id); return load(resolved);
  }, module, module.exports);
  return module.exports;
}
const dimensions = load('lib/dimensions.ts');
const helperPath = 'components/estimates/piece-dimension-description.ts';
const helper = fs.existsSync(path.join(root, helperPath)) ? load(helperPath) : {};
function tableDescription(relative) {
  const filename = path.join(root, relative);
  const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const hasVariable = (node, name) => ts.isVariableStatement(node)
    && node.declarationList.declarations.some(item => item.name.getText(source) === name);
  let statements;
  function visit(node) {
    if (ts.isBlock(node) && node.statements.some(item => hasVariable(item, 'description'))) statements = node.statements;
    ts.forEachChild(node, visit);
  }
  visit(source); assert.ok(statements, 'Actual table description block');
  const start = statements.findIndex(node => hasVariable(node, 'wTxt') || hasVariable(node, 'sizeText'));
  const end = statements.findIndex(node => hasVariable(node, 'description'));
  assert.ok(start >= 0 && end >= start);
  const code = compile(statements.slice(start, end + 1).map(node => node.getText(source)).join('\n') + '\nreturn description;');
  return (piece, tokens = {}) => {
    const scope = { ...dimensions, ...helper, currentPieceData: piece,
      product: { name: 'French Door' }, frameColor: { color: 'White' },
      widthToken: tokens.width ?? 'Open W', heightToken: tokens.height ?? 'H' };
    return new Function(...Object.keys(scope), code)(...Object.values(scope));
  };
}
const tableCases = [
  ['dealer', tableDescription('components/estimates/pieces-dealer-table.tsx')],
  ['client', tableDescription('components/estimates/pieces-client-list.tsx')],
];
const { PieceFormDetailsPanel } = load('components/estimates/piece-form-details-panel.tsx');
const detailedDoor = piece => {
  const html = renderToStaticMarkup(React.createElement(PieceFormDetailsPanel, { piece,
    productsWithBrands: [], systemsWithConfigs: [], frameColors: [], crystals: [], tints: [],
    coatings: [], privacies: [], muntinPatterns: [], muntinTypes: [] }));
  const paragraph = /<p>\s*<strong>Door Size:<\/strong>([\s\S]*?)<\/p>/.exec(html);
  return paragraph ? paragraph[1].replace(/<[^>]*>/g, '').trim() : '';
};
const tests = [];
const test = (name, run) => tests.push({ name, run });
for (const [name, describe] of tableCases) {
  test(`${name}: screenshot shows only supplied door width`, () => {
    const piece = { width: '55', height: '80', doorWidth: '39', doorHeight: null };
    const before = JSON.stringify(piece);
    assert.equal(describe(piece), 'French Door - 55 Open W x 80 H - Door 39 W - White');
    assert.equal(JSON.stringify(piece), before);
  });
  test(`${name}: missing general width or height never creates a question mark or dangling x`, () => {
    assert.equal(describe({ height: '80' }), 'French Door - 80 H - White');
    assert.equal(describe({ width: '55' }), 'French Door - 55 Open W - White');
    assert.equal(describe({}), 'French Door - White');
  });
  test(`${name}: numerically equal door height is omitted, including decimal representations`, () => {
    for (const doorHeight of ['80', '80.000', 80]) {
      assert.equal(describe({ width: '55', height: '80', doorWidth: '39', doorHeight }),
        'French Door - 55 Open W x 80 H - Door 39 W - White');
    }
    assert.equal(describe({ height: '80', doorHeight: '80.0' }), 'French Door - 80 H - White');
  });
  test(`${name}: distinct door height and transom opening height remain visible`, () => {
    assert.equal(describe({ width: '55', height: '96', doorWidth: '39', doorHeight: '80' }, { height: 'Open H' }),
      'French Door - 55 Open W x 96 Open H - Door 39 W x 80 H - White');
  });
  test(`${name}: door height alone is displayed without inventing a width`, () => {
    assert.equal(describe({ height: '96', doorHeight: '80' }), 'French Door - 96 H - Door 80 H - White');
    assert.equal(describe({ doorHeight: '80' }), 'French Door - Door 80 H - White');
  });
  test(`${name}: fraction formatting and all extra dimension fields are retained`, () => {
    const output = describe({ width: '55.5', height: '96', doorWidth: '39.375', doorHeight: '80.125',
      sashHeight: '28', windowHeight: '50', heightLeft: '94', heightRight: '95', legHeight: '30',
      leftSideliteWidth: '10.5', rightSideliteWidth: '14', leftPanels: 1, rightPanels: 2,
      panelCount: 4, horizontalHeights: [30, 60] });
    for (const text of ['55 1/2 Open W x 96 H / Sash 28 / Window H 50', '94 HL', '95 HR', '30 LegH',
      'Door 39 3/8 W x 80 1/8 H', 'Left Sidelite 10 1/2', 'Right Sidelite 14',
      'Left Panels 1', 'Right Panels 2', 'Panels 4', 'Horizontals @ 30, 60']) assert.ok(output.includes(text), text);
  });
}
test('Expanded details omit absent or repeated door height consistently', () => {
  assert.equal(detailedDoor({ height: '80', doorWidth: '39', doorHeight: null }), '39 W');
  assert.equal(detailedDoor({ height: '80', doorWidth: '39', doorHeight: '80.00' }), '39 W');
  assert.equal(detailedDoor({ height: '80', doorHeight: '80' }), '');
});
test('Expanded details retain differing height and height-only door dimensions', () => {
  assert.equal(detailedDoor({ height: '96', doorWidth: '39', doorHeight: '80' }), '39 W x 80 H');
  assert.equal(detailedDoor({ height: '96', doorHeight: '80' }), '80 H');
});
let failed = 0;
for (const { name, run } of tests) {
  try { run(); console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}\n${error.stack}`); }
}
console.log(`${tests.length - failed}/${tests.length} dimension description tests passed`);
if (failed) process.exitCode = 1;
