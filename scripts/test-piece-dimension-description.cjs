/* Isolated regressions for rendered table rows and expanded details.
 * TypeScript is transpiled in memory; React renders the production components.
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
    if (id === 'lucide-react') return new Proxy({}, { get: () => () => null });
    if (id === '@/components/ui/button') return { Button: ({ children, variant, size, ...props }) => React.createElement('button', props, children) };
    if (id === '@/components/ui/input') return { Input: props => React.createElement('input', props) };
    if (id === '@/lib/utils') return { cn: (...parts) => parts.filter(Boolean).join(' ') };
    const target = id.startsWith('@/') ? path.resolve(root, id.slice(2))
      : id.startsWith('.') ? path.resolve(path.dirname(filename), id) : null;
    assert.ok(target, `Unexpected dependency ${id}`);
    const resolved = ['.ts', '.tsx'].map(ext => target + ext).find(file => fs.existsSync(file));
    assert.ok(resolved, id); return load(resolved);
  }, module, module.exports);
  return module.exports;
}
const tableCases = [
  ['dealer', load('components/estimates/pieces-dealer-table.tsx').PiecesDealerTable],
  ['client', load('components/estimates/pieces-client-list.tsx').PiecesClientList],
];
function renderList(Table, piece, options = {}) {
  return renderToStaticMarkup(React.createElement(Table, {
    locale: options.locale, fields: piece ? [{ id: 'row1' }] : [],
    watchedPieces: piece ? [{ idProd: 1, idSyst: 2, idFC: 3, idConf: 4, ...piece }] : [],
    productsWithBrands: [{ id: 1, name: options.productName ?? 'French Door' }],
    systemsWithConfigs: [{ id: 2, sysconfs: [{ idConfig: 4, requiresDoorWidth: true, requiresDoorHeight: options.height === 'Open H' }] }],
    frameColors: [{ id: 3, color: 'White' }], tints: [], coatings: [], crystals: [], privacies: [], muntinPatterns: [], muntinTypes: [],
    formatCurrency: amount => '$' + amount.toFixed(2),
  }));
}
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
for (const [name, Table] of tableCases) {
  const describe = (piece, options) => {
    const html = renderList(Table, piece, options);
    return /<span>(French Door[^<]*)<\/span>/.exec(html)?.[1];
  };
  test(`${name}: Spanish localizes controls without translating even a mark or product named like a label`, () => {
    const piece = { mark: 'Kitchen W1 – Precio', width: '40', height: '80', qty: 2, price: 150 };
    const html = renderList(Table, piece, { locale: 'es', productName: 'Door' });
    for (const text of ['Duplicar pieza', 'Editar pieza', 'Eliminar pieza', 'Identificador de la pieza', 'Kitchen W1 – Precio', 'Door - 40 ancho de la abertura x 80 altura - White']) {
      assert.ok(html.includes(text), text);
    }
    assert.ok(renderList(Table, { ...piece, mark: 'Mark' }, { locale: 'es' }).includes('value="Mark"'));
    assert.ok(renderList(Table, null, { locale: 'es' }).includes('Agrega la primera pieza a tu cotización'));
  });
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
test('Spanish expanded labels preserve the exact product, brand, system and catalog options', () => {
  const html = renderToStaticMarkup(React.createElement(PieceFormDetailsPanel, {
    locale: 'es', piece: { idProd: 1, idSyst: 2, idCryst: 3, idConf: 4, idFC: 5, screen: true },
    productsWithBrands: [{ id: 1, name: 'Single Hung' }],
    systemsWithConfigs: [{ id: 2, name: 'System', brandProduct: { brand: { name: 'Eco Windows' } },
      sysconfs: [{ idConfig: 4, config: { conf: 'Equal Lites' } }] }],
    frameColors: [{ id: 5, color: 'Glass' }], crystals: [{ id: 3, glass: 'White Laminated' }],
    tints: [], coatings: [], privacies: [], muntinPatterns: [], muntinTypes: [],
  }));
  for (const text of ['Detalles del producto', 'Producto:</strong> Single Hung', 'Marca:</strong> Eco Windows',
    'Sistema:</strong> System', 'Configuración:</strong> Equal Lites', 'Color del marco:</strong> Glass',
    'Vidrio:</strong> White Laminated', 'Mosquitero:</strong> Sí', 'Rendimiento energético: datos no disponibles']) {
    assert.ok(html.includes(text), text);
  }
});
let failed = 0;
for (const { name, run } of tests) {
  try { run(); console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}\n${error.stack}`); }
}
console.log(`${tests.length - failed}/${tests.length} dimension description tests passed`);
if (failed) process.exitCode = 1;
