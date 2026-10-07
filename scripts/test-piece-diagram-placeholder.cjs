/* Real React renderers, isolated from browser, server and database access. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '../src');
const cache = new Map();
const failNetwork = () => { throw new Error('Network access is not allowed in diagram tests.'); };
global.fetch = failNetwork;
for (const protocol of ['node:http', 'node:https']) {
  require(protocol).request = failNetwork;
  require(protocol).get = failNetwork;
}
function load(filename) {
  filename = path.resolve(root, filename);
  assert.ok(filename.startsWith(root + path.sep));
  if (cache.has(filename)) return cache.get(filename).exports;
  if (filename.endsWith('.json')) return JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (/\.(png|jpe?g|webp)$/i.test(filename)) return { src: filename };
  assert.match(filename, /\.tsx?$/);
  const module = { exports: {} };
  cache.set(filename, module);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', code)(id => {
    if (id === 'react' || id === 'react/jsx-runtime') return require(id);
    const target = id.startsWith('@/') ? path.resolve(root, id.slice(2))
      : id.startsWith('.') ? path.resolve(path.dirname(filename), id) : null;
    if (!target) throw new Error(`Unexpected dependency: ${id}`);
    const candidates = path.extname(target) ? [target]
      : ['.ts', '.tsx', '.json', '/index.ts', '/index.tsx'].map(extension => target + extension);
    const resolved = candidates.find(file => fs.existsSync(file));
    if (!resolved) throw new Error(`Unresolved dependency: ${id}`);
    return load(resolved);
  }, module, module.exports);
  return module.exports;
}
const { PieceDiagram: Legacy } = load('components/piece-diagram/legacy-piece-diagram.tsx');
const { PieceDiagram } = load('components/piece-diagram.tsx');
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const assertPlaceholder = html => {
  assert.match(html, /data-diagram-state="unavailable"/);
  assert.match(html, /Complete the piece details to see the preview/);
  assert.doesNotMatch(html, /<svg\b|<rect\b|<image\b/);
};
let passed = 0;
function test(name, run) { run(); passed += 1; console.log(`PASS ${name}`); }
for (const variant of ['editor', 'report']) {
  test(`${variant}: unresolved product families never invent a rectangle`, () => {
    for (const diagramFamily of ['FRENCH_DOOR', 'CASEMENT', 'FIXED_SHAPE', 'WINDOW_WALL', 'GENERIC']) {
      assertPlaceholder(render(Legacy, { diagramFamily, configuration: 'Unsupported', piece: { width: 272, height: 116 }, variant }));
    }
  });
  test(`${variant}: incomplete dimensions stay neutral`, () => {
    for (const diagramFamily of ['HORIZONTAL_SLIDER', 'SINGLE_HUNG', 'LINEAR_MATERIAL', 'FIXED_SHAPE']) {
      assertPlaceholder(render(Legacy, { diagramFamily, configuration: 'XO', piece: { height: 80 }, variant }));
    }
  });
  test(`${variant}: known legacy drawings remain available`, () => {
    for (const props of [
      { diagramFamily: 'HORIZONTAL_SLIDER', configuration: 'XO' },
      { diagramFamily: 'SINGLE_HUNG', configuration: 'Equal Lites' },
      { diagramFamily: 'LINEAR_MATERIAL', configuration: 'Mullion' },
      { diagramFamily: 'FIXED_SHAPE', configuration: 'Circle' },
      { diagramFamily: 'FIXED_SHAPE', configuration: 'Half Circle' },
    ]) {
      const html = render(Legacy, { ...props, piece: { width: 40, height: 80 }, variant });
      assert.match(html, /<svg\b/);
      assert.doesNotMatch(html, /data-diagram-state="unavailable"/);
    }
  });
  test(`${variant}: incomplete French Door through dispatcher stays neutral`, () => {
    assertPlaceholder(render(PieceDiagram, {
      diagramFamily: 'FRENCH_DOOR', systemName: 'Serie 675', configuration: 'OXXO', dimensionMode: 'ECO_NOVO_DOOR',
      piece: { width: 272, height: 116, doorWidth: 68, leftSideliteWidth: 34, leftPanels: 3 }, variant,
    }));
  });
  test(`${variant}: real rectangular fixed window is preserved`, () => {
    const html = render(PieceDiagram, { diagramFamily: 'FIXED_SHAPE', configuration: 'Picture Window', piece: { width: 40, height: 80 }, variant });
    assert.match(html, /data-diagram-renderer="FIXED_WINDOW_SHAPE"/);
    assert.match(html, /<svg\b/);
    assert.doesNotMatch(html, /data-diagram-state="unavailable"/);
  });
}
console.log(`${passed} diagram placeholder tests passed.`);
