/* Real TypeScript resolvers and React SSR renderers; no browser, server or database.
 * Run from frontend: node scripts/test-muntin-diagrams.cjs */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '../src');
const cache = new Map();
const failNetwork = () => { throw new Error('Network access is not allowed in diagram tests.'); };
global.fetch = failNetwork;
for (const protocol of ['node:http', 'node:https']) {
  const client = require(protocol);
  client.request = failNetwork;
  client.get = failNetwork;
}

function load(filename) {
  filename = path.resolve(root, filename);
  assert.ok(filename.startsWith(root + path.sep), 'Only frontend source modules may be loaded');
  if (cache.has(filename)) return cache.get(filename).exports;
  if (filename.endsWith('.json')) return JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (/\.(png|jpe?g|webp)$/i.test(filename)) return { src: filename };
  assert.match(filename, /\.tsx?$/, 'Unexpected source file type');
  const module = { exports: {} };
  cache.set(filename, module);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, resolveJsonModule: true,
    },
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

const { resolveMuntinForDiagram, resolveFormMuntinForDiagram } = load('components/piece-diagram/muntin-data.ts');
const { MuntinLayer } = load('components/piece-diagram/renderers/muntin-layer.tsx');
const { HorizontalRollingWindowDiagram } = load('components/piece-diagram/renderers/horizontal-rolling/horizontal-rolling-window-diagram.tsx');
const { SingleHungWindowDiagram } = load('components/piece-diagram/renderers/single-hung/single-hung-window-diagram.tsx');
const { PieceDiagram } = load('components/piece-diagram.tsx');
const { PieceReportCard } = load('components/estimates/estimate-details/parts/piece-report-card.tsx');
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const patterns = [
  { id: 41, name: 'Full View', requiresLites: false, isActive: true, isDefault: true },
  { id: 73, name: 'Colonial', requiresLites: true, isActive: true, isDefault: false },
];
const types = [
  { id: 56, name: '1 in Flat-Flat', isActive: true, isDefault: false },
  { id: 89, name: '1 in Ogee-Flat', isActive: true, isDefault: false },
];
const panel = (panelIndex, horizontalLites = 2, verticalLites = 3, panelLabel = '', panelCode = '') =>
  ({ panelIndex, horizontalLites, verticalLites, panelLabel, panelCode });
const saved = (panels, overrides = {}) => ({ pattern: patterns[1], type: types[0], panels, ...overrides });
const resolved = (panels, profile = 'flat') => resolveMuntinForDiagram(saved(panels, { type: types[profile === 'flat' ? 0 : 1] }));
const hrPanels = () => [panel(1, 2, 3), panel(2, 4, 2)];
const defaults = { width: 48, height: 60, screenEnabled: false, showDimensions: false, frameColorHex: '#2468AC' };
const hr = (overrides = {}) => render(HorizontalRollingWindowDiagram, { ...defaults, configuration: 'XO', muntin: resolved(hrPanels()), ...overrides });
const sh = (overrides = {}) => render(SingleHungWindowDiagram, { ...defaults, configuration: 'EQUAL_LITES', muntin: resolved(hrPanels()), ...overrides });
const attrs = source => Object.fromEntries([...source.matchAll(/([\w:-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
const tags = (html, tag) => [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'g'))].map(match => attrs(match[1]));
const bars = html => tags(html, 'rect').filter(rect => rect['data-part'] === 'muntin-bar');
const panels = html => [...html.matchAll(/<g\b([^>]*data-part="muntin-panel"[^>]*)>([\s\S]*?)<\/g>/g)]
  .map(match => ({ ...attrs(match[1]), bars: bars(match[2]) }));
function clipFor(html, group) {
  const id = group['clip-path'].slice(5, -1);
  const clip = [...html.matchAll(/<clipPath\b([^>]*)>([\s\S]*?)<\/clipPath>/g)]
    .find(match => attrs(match[1]).id === id);
  assert.ok(clip, `Missing glass clip ${id}`);
  const rect = tags(clip[2], 'rect')[0];
  return Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, Number(rect[key])]));
}
const nearly = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);
function assertPanel(group, position, horizontal, vertical) {
  assert.ok(group, `Missing ${position} panel`);
  assert.equal(group['data-glass-position'], position);
  assert.equal(group['data-horizontal-lites'], String(horizontal));
  assert.equal(group['data-vertical-lites'], String(vertical));
  assert.equal(group.bars.filter(bar => bar['data-axis'] === 'vertical').length, horizontal - 1);
  assert.equal(group.bars.filter(bar => bar['data-axis'] === 'horizontal').length, vertical - 1);
}
function assertClippedBars(html) {
  for (const group of panels(html)) {
    const clip = clipFor(html, group);
    for (const bar of group.bars) {
      const x = Number(bar.x), y = Number(bar.y), width = Number(bar.width), height = Number(bar.height);
      assert.ok(x >= clip.x - 1e-7 && y >= clip.y - 1e-7);
      assert.ok(x + width <= clip.x + clip.width + 1e-7);
      assert.ok(y + height <= clip.y + clip.height + 1e-7);
    }
  }
}
const tests = [];
const test = (name, run) => tests.push({ name, run });

test('Full View, null and missing muntin never draw bars even with leftover panels', () => {
  for (const input of [undefined, null, saved(hrPanels(), { pattern: patterns[0] })]) {
    const value = resolveMuntinForDiagram(input);
    assert.equal(value, null);
    assert.equal(bars(hr({ muntin: value })).length, 0);
    assert.equal(bars(sh({ muntin: value })).length, 0);
  }
});

test('Colonial 2 by 3 means one vertical and two horizontal bars, centered in the glass', () => {
  const html = renderToStaticMarkup(React.createElement('svg', null, React.createElement(MuntinLayer, {
    muntin: resolved([panel(1)]), unitsPerInch: 2, frameColorHex: '#2468AC', idNamespace: 'fixture',
    glassPanels: [{ panelIndex: 1, panelCode: 'X', panelLabel: 'Left', rect: { x: 10, y: 20, width: 100, height: 180 } }],
  })));
  const group = panels(html)[0];
  assertPanel(group, 'Left', 2, 3);
  const vertical = group.bars.find(bar => bar['data-axis'] === 'vertical');
  assert.deepEqual(['x', 'y', 'width', 'height'].map(key => Number(vertical[key])), [59, 20, 2, 180]);
  assert.deepEqual(group.bars.filter(bar => bar['data-axis'] === 'horizontal').map(bar => Number(bar.y)), [79, 139]);
  assertClippedBars(html);
});

test('Flat and Ogee keep the same one-inch geometry but use different profile shading', () => {
  const flat = hr();
  const ogee = hr({ muntin: resolved(hrPanels(), 'ogee') });
  assert.match(flat, /data-muntin-profile="flat"/);
  assert.match(ogee, /data-muntin-profile="ogee"/);
  const geometry = html => bars(html).map(bar => [bar.x, bar.y, bar.width, bar.height]);
  assert.deepEqual(geometry(flat), geometry(ogee));
  const gradientStops = html => [...html.matchAll(/<linearGradient\b([^>]*)>([\s\S]*?)<\/linearGradient>/g)]
    .filter(match => attrs(match[1]).id.includes('muntin')).map(match => tags(match[2], 'stop'));
  assert.deepEqual(gradientStops(flat).map(stops => stops.length), [4, 4]);
  assert.deepEqual(gradientStops(ogee).map(stops => stops.length), [7, 7]);
  assert.ok(gradientStops(flat).flat().some(stop => stop['stop-color'].toLowerCase() === '#2468ac'));
});

test('Unknown patterns or profiles are omitted instead of inventing a grid', () => {
  for (const overrides of [
    { pattern: { name: 'Prairie', requiresLites: true } },
    { type: { name: 'None' } }, { type: { name: '2 in Flat-Flat' } },
    { type: { name: 'Custom Profile' } }, { type: null }, { pattern: null },
  ]) assert.equal(resolveMuntinForDiagram(saved(hrPanels(), overrides)), null);
});

test('Catalog names are normalized without assuming fixed pattern or type IDs', () => {
  const value = resolveMuntinForDiagram(saved(hrPanels(), {
    pattern: { name: ' COLONIAL ', requiresLites: true }, type: { name: ' 1  in Ogee–Flat ' },
  }));
  assert.equal(value.profile, 'ogee');
  assert.equal(resolveFormMuntinForDiagram({ idPattern: 73, idType: 89, panels: hrPanels() }, patterns, types).profile, 'ogee');
  assert.equal(resolveFormMuntinForDiagram({ idPattern: 999, idType: 56, panels: hrPanels() }, patterns, types), null);
});

test('Historical inactive catalog selections still describe the chosen profile', () => {
  assert.equal(resolveFormMuntinForDiagram({ idPattern: 73, idType: 56, panels: hrPanels() },
    patterns.map(item => ({ ...item, isActive: false })), types.map(item => ({ ...item, isActive: false }))).profile, 'flat');
});

for (const [name, invalidPanels] of [
  ['empty', []], ['undefined panel', [undefined]], ['duplicate index', [panel(1), panel(1)]],
  ['zero index', [panel(0)]], ['zero lites', [panel(1, 0)]], ['negative lites', [panel(1, -2)]],
  ['fractional lites', [panel(1, 2.5)]], ['NaN lites', [panel(1, NaN)]],
  ['infinite lites', [panel(1, 2, Infinity)]], ['unsafe integer', [panel(1, Number.MAX_SAFE_INTEGER + 1)]],
]) test(`Invalid ${name} returns no grid and leaves the HR renderer available`, () => {
  const muntin = resolveMuntinForDiagram(saved(invalidPanels));
  assert.equal(muntin, null);
  const html = hr({ muntin });
  assert.match(html, /data-family="HORIZONTAL_ROLLING_WINDOW"/);
  assert.equal(bars(html).length, 0);
});

test('Transient impossible density is omitted without allocating a huge bar array', () => {
  const html = hr({ muntin: resolved([panel(1, Number.MAX_SAFE_INTEGER), panel(2, Number.MAX_SAFE_INTEGER)]) });
  assert.equal(bars(html).length, 0);
  assert.match(html, /data-family="HORIZONTAL_ROLLING_WINDOW"/);
});

test('Mismatched or ambiguous panel layouts omit the overlay and keep the window', () => {
  for (const selection of [[panel(1)], [panel(1, 2, 3, 'Left'), panel(2, 4, 2, 'Left')]]) {
    const html = hr({ muntin: resolved(selection) });
    assert.equal(bars(html).length, 0);
    assert.match(html, /data-family="HORIZONTAL_ROLLING_WINDOW"/);
  }
});

for (const code of ['R', 'O']) test(`HR XO rejects Left with conflicting ${code} code`, () => {
  const html = hr({ muntin: resolved([panel(1, 2, 3, 'Left', code), panel(2, 4, 2, 'Right', 'O')]) });
  assert.equal(bars(html).length, 0);
  assert.match(html, /data-family="HORIZONTAL_ROLLING_WINDOW"/);
});

for (const configuration of ['XO', 'OX']) test(`HR ${configuration} uses exterior panel indices and one product mirror only`, () => {
  const html = hr({ configuration, muntin: resolved(hrPanels().reverse()) });
  const left = panels(html).find(group => group['data-panel-index'] === '1');
  const right = panels(html).find(group => group['data-panel-index'] === '2');
  assertPanel(left, 'Left', 2, 3);
  assertPanel(right, 'Right', 4, 2);
  const leftClip = clipFor(html, left), rightClip = clipFor(html, right);
  if (configuration === 'XO') {
    assert.ok(leftClip.x < rightClip.x);
    assert.equal((html.match(/scale\(-1 1\)/g) ?? []).length, 0);
  } else {
    const mirror = html.match(/transform="translate\(([\d.]+) 0\) scale\(-1 1\)"/);
    assert.ok(mirror);
    assert.equal((html.match(/scale\(-1 1\)/g) ?? []).length, 1);
    assert.ok(Number(mirror[1]) - leftClip.x - leftClip.width < Number(mirror[1]) - rightClip.x - rightClip.width);
  }
  assertClippedBars(html);
});

test('HR unique X/O codes follow the operating panels rather than source array order', () => {
  const selection = [panel(1, 2, 3, '', 'X'), panel(2, 4, 2, '', 'O')];
  for (const configuration of ['XO', 'OX']) {
    const groups = panels(hr({ configuration, muntin: resolved(selection) }));
    assertPanel(groups.find(group => group['data-panel-index'] === '1'), configuration === 'XO' ? 'Left' : 'Right', 2, 3);
    assertPanel(groups.find(group => group['data-panel-index'] === '2'), configuration === 'XO' ? 'Right' : 'Left', 4, 2);
  }
});

for (const split of ['1/3-1/3-1/3', '1/4-1/2-1/4']) test(`HR XOX ${split} keeps three independent colonial grids`, () => {
  const html = hr({ configuration: 'XOX', split, width: 90, muntin: resolved([
    panel(3, 4, 2, 'Right', 'X'), panel(1, 2, 2, 'Left', 'X'), panel(2, 3, 2, 'Center', 'O'),
  ]) });
  for (const [index, position, count] of [[1, 'Left', 2], [2, 'Center', 3], [3, 'Right', 4]]) {
    assertPanel(panels(html).find(group => group['data-panel-index'] === String(index)), position, count, 2);
  }
  assert.equal(bars(html).length, 9);
  assertClippedBars(html);
});

test('HR bars are exactly one inch in product coordinates at different window sizes', () => {
  for (const [width, height] of [[48, 60], [96, 120], [90, 40]]) {
    const html = hr({ width, height });
    const image = tags(html, 'image').find(tag => tag['data-part'] === 'c148-screen-off-master-with-visible-glass');
    assert.ok(image);
    for (const bar of bars(html)) {
      if (bar['data-axis'] === 'vertical') nearly(Number(bar.width), Number(image.width) / width);
      else nearly(Number(bar.height), Number(image.height) / height);
    }
  }
});

for (const configuration of ['EQUAL_LITES', 'UNEQUAL_LITES']) test(`SH ${configuration} maps upper and lower glass independently`, () => {
  const html = sh({ configuration, sashHeight: 22, muntin: resolved([
    panel(2, 4, 2, 'Bottom', 'X'), panel(1, 2, 3, 'Top', 'O'),
  ]) });
  const top = panels(html).find(group => group['data-glass-position'] === 'Top');
  const bottom = panels(html).find(group => group['data-glass-position'] === 'Bottom');
  assertPanel(top, 'Top', 2, 3);
  assertPanel(bottom, 'Bottom', 4, 2);
  assert.ok(clipFor(html, top).y < clipFor(html, bottom).y);
  assertClippedBars(html);
});

test('SH over fixed distinguishes the extra fixed light from the upper fixed sash', () => {
  const html = sh({ configuration: 'SH_OVER_FIX_EQUAL_LITES', height: 90, windowHeight: 60,
    muntin: resolved([panel(3, 4, 4, 'Fixed', 'O'), panel(1, 2, 3, 'Top', 'O'), panel(2, 3, 2, 'Bottom', 'X')]),
  });
  const groups = panels(html);
  assert.equal(groups.length, 3);
  for (const [position, h, v] of [['Top', 2, 3], ['Bottom', 3, 2], ['Fixed', 4, 4]]) {
    assertPanel(groups.find(group => group['data-glass-position'] === position), position, h, v);
  }
  const y = position => clipFor(html, groups.find(group => group['data-glass-position'] === position)).y;
  assert.ok(y('Top') < y('Bottom') && y('Bottom') < y('Fixed'));
  assertClippedBars(html);
});

test('SH doubles physical size with the same proportion and halves its one-inch bars', () => {
  const normal = bars(sh());
  const large = bars(sh({ width: 96, height: 120 }));
  assert.equal(normal.length, large.length);
  normal.forEach((bar, index) => {
    const thickness = bar['data-axis'] === 'vertical' ? 'width' : 'height';
    nearly(Number(large[index][thickness]), Number(bar[thickness]) / 2);
  });
});

const diagramProps = {
  diagramFamily: 'HORIZONTAL_SLIDER', configuration: 'XO',
  diagramSpec: { renderer: 'HORIZONTAL_ROLLING_WINDOW', configuration: 'XO', split: '1/2-1/2' },
  piece: { width: '48', height: '60' }, frameColorHex: '#2468AC', showDimensions: false,
};
test('PieceDiagram forwards the live resolved grid in both editor and report variants', () => {
  for (const variant of ['editor', 'report']) {
    const html = render(PieceDiagram, { ...diagramProps, variant, muntin: resolved(hrPanels()) });
    assert.equal(bars(html).length, 7);
    assert.match(html, /data-diagram-renderer="HORIZONTAL_ROLLING_WINDOW"/);
  }
});

test('Live null or Full View never falls back to an old saved pieceMuntin', () => {
  const piece = { ...diagramProps.piece, pieceMuntin: saved(hrPanels()) };
  for (const live of [null, { idPattern: 41, idType: 56, panels: hrPanels() }]) {
    const html = render(PieceDiagram, { ...diagramProps, piece: { ...piece, muntin: live },
      muntin: resolveFormMuntinForDiagram(live, patterns, types) });
    assert.equal(bars(html).length, 0);
  }
});

test('Changing live panel counts and profile ignores stale saved relations without mutating either', () => {
  const live = { idPattern: 73, idType: 89, panels: [panel(1, 3, 2), panel(2, 2, 2)] };
  const piece = { ...diagramProps.piece, pieceMuntin: saved(hrPanels()), muntin: live };
  const before = JSON.stringify(piece);
  const html = render(PieceDiagram, { ...diagramProps, piece, muntin: resolveFormMuntinForDiagram(live, patterns, types) });
  assert.match(html, /data-muntin-profile="ogee"/);
  assert.equal(bars(html).length, 5);
  assert.equal(JSON.stringify(piece), before);
});

const reportPiece = () => ({
  id: 123, qty: 1, width: '48', height: '60', screen: false,
  prod: { name: 'Horizontal Roller', diagramFamily: 'HORIZONTAL_SLIDER' },
  syst: { name: 'HR' }, bran: { name: 'Fixture' },
  conf: { conf: 'XO', diagramSpec: diagramProps.diagramSpec },
  fColor: { color: 'Fixture Color', hexCode: '#2468AC' },
  diagramMetadata: { dimensionMode: 'STANDARD', hasCoating: false, hasPrivacy: false },
  pieceMuntin: saved(hrPanels()),
});
test('Real saved PieceReportCard includes the grid and preserves the PDF capture element', () => {
  const html = render(PieceReportCard, { piece: reportPiece(), displayMark: 'A1', showPrices: false });
  assert.equal(bars(html).length, 7);
  assert.match(html, /data-piece-diagram-id="123"/);
  assert.match(html, /Colonial/);
  assert.doesNotMatch(html, /Unit Price/);
});

test('Real saved SH report sends the persisted top and bottom grids to its renderer', () => {
  const piece = { ...reportPiece(), prod: { name: 'Single Hung', diagramFamily: 'SINGLE_HUNG' },
    conf: { conf: 'Equal Lites', diagramSpec: { renderer: 'SINGLE_HUNG_WINDOW', configuration: 'EQUAL_LITES' } },
    pieceMuntin: saved([panel(1, 2, 3, 'Top', 'O'), panel(2, 4, 2, 'Bottom', 'X')]),
  };
  const html = render(PieceReportCard, { piece, displayMark: 'S1', showPrices: false });
  assert.equal(bars(html).length, 7);
  assertPanel(panels(html).find(group => group['data-glass-position'] === 'Top'), 'Top', 2, 3);
  assertPanel(panels(html).find(group => group['data-glass-position'] === 'Bottom'), 'Bottom', 4, 2);
  assert.match(html, /data-piece-diagram-id="123"/);
});

test('Saved report Full View or no grid remains unobstructed for public and PDF rendering', () => {
  for (const pieceMuntin of [null, saved(hrPanels(), { pattern: patterns[0] })]) {
    const html = render(PieceReportCard, { piece: { ...reportPiece(), pieceMuntin }, displayMark: 'A1', showPrices: false });
    assert.equal(bars(html).length, 0);
    assert.match(html, /data-piece-diagram-id="123"/);
  }
});

test('Screen and movement indicators remain after the muntin layer in HR and SH', () => {
  for (const html of [hr({ screenEnabled: true }), sh({ screenEnabled: true })]) {
    assert.equal(bars(html).length, 7);
    const grid = html.indexOf('data-part="muntin-layer"');
    const indicator = html.indexOf('data-indicator-panel=', grid);
    assert.ok(grid >= 0 && indicator > grid);
    assert.match(html.slice(grid), /data-screen(?:-part|-layer-order|-style|=)/);
  }
});

// Regression: Serie 155 SH/FIX uses whole-assembly Top/Center/Bottom labels.
// These fixtures exercise both supported code conventions without assuming DB IDs.
const shFixPanels = (codes, counts = [[2, 2], [2, 2], [2, 2]]) =>
  ['Top Panel', 'Center Panel', 'Bottom Panel'].map((label, index) =>
    panel(index + 1, counts[index][0], counts[index][1], label, codes[index]));
function assertShFixGrid(html, counts) {
  const groups = panels(html);
  assert.equal(groups.length, 3, 'Top, center and bottom must each receive their grid');
  const ordered = [1, 2, 3].map(index => groups.find(group => group['data-panel-index'] === String(index)));
  ordered.forEach((group, index) => {
    assert.ok(group, `Missing assembly panel ${index + 1}`);
    assert.equal(group['data-horizontal-lites'], String(counts[index][0]));
    assert.equal(group['data-vertical-lites'], String(counts[index][1]));
    assert.equal(group.bars.filter(bar => bar['data-axis'] === 'vertical').length, counts[index][0] - 1);
    assert.equal(group.bars.filter(bar => bar['data-axis'] === 'horizontal').length, counts[index][1] - 1);
  });
  const clips = ordered.map(group => clipFor(html, group));
  assert.ok(clips[0].y + clips[0].height <= clips[1].y + 1e-7, 'Top grid must precede center glass');
  assert.ok(clips[1].y + clips[1].height <= clips[2].y + 1e-7, 'Center grid must precede bottom fixed glass');
  assertClippedBars(html);
}
for (const codes of [['T', 'C', 'B'], ['O', 'X', 'O']]) {
  test(`SH/FIX 38x70 windowHeight50 draws Top/Center/Bottom Panel 2x2 with ${codes.join('/')}`, () => {
    const html = sh({ configuration: 'SH_OVER_FIX_EQUAL_LITES', width: 38, height: 70, windowHeight: 50,
      muntin: resolved(shFixPanels(codes)),
    });
    assertShFixGrid(html, [[2, 2], [2, 2], [2, 2]]);
    assert.equal(bars(html).length, 6);
  });
}
test('SH/FIX Top/Center/Bottom keeps distinct counts in physical order despite shuffled data', () => {
  const counts = [[2, 3], [3, 2], [4, 4]];
  const selection = shFixPanels(['T', 'C', 'B'], counts);
  const html = sh({ configuration: 'SH_OVER_FIX_EQUAL_LITES', width: 38, height: 70, windowHeight: 50,
    muntin: resolved([selection[2], selection[0], selection[1]], 'ogee'),
  });
  assertShFixGrid(html, counts);
  assert.equal(bars(html).length, 12);
  assert.match(html, /data-muntin-profile="ogee"/);
});
test('SH/FIX Top Fixed and Bottom Fixed keep their qualified positions around Center Panel', () => {
  const counts = [[2, 3], [3, 2], [4, 4]];
  const selection = [panel(1, 2, 3, 'Top Fixed', 'O'), panel(2, 3, 2, 'Center Panel', 'X'), panel(3, 4, 4, 'Bottom Fixed', 'O')];
  const html = sh({ configuration: 'SH_OVER_FIX_EQUAL_LITES', width: 38, height: 70, windowHeight: 50,
    muntin: resolved(selection),
  });
  assertShFixGrid(html, counts);
});
const shFixReportPiece = (pieceMuntin) => ({
  ...reportPiece(), width: '38', height: '70', windowHeight: '50',
  prod: { name: 'Single Hung', diagramFamily: 'SINGLE_HUNG' }, syst: { name: 'Serie 155' },
  conf: { conf: 'SH/FIX Equal Lites', diagramSpec: { renderer: 'SINGLE_HUNG_WINDOW', configuration: 'SH_OVER_FIX_EQUAL_LITES' } },
  pieceMuntin,
});
test('Saved Serie155 SH/FIX report renders Top/Center/Bottom grids and preserves PDF capture', () => {
  const counts = [[2, 2], [3, 2], [2, 4]];
  const piece = shFixReportPiece(saved(shFixPanels(['O', 'X', 'O'], counts)));
  const html = render(PieceReportCard, { piece, displayMark: 'SH1', showPrices: false });
  assertShFixGrid(html, counts);
  assert.equal(bars(html).length, 9);
  assert.match(html, /data-piece-diagram-id="123"/);
});
test('SH/FIX Full View ignores leftover Top/Center/Bottom panels in preview and saved report', () => {
  const selection = shFixPanels(['T', 'C', 'B']);
  const fullView = saved(selection, { pattern: patterns[0] });
  const preview = sh({ configuration: 'SH_OVER_FIX_EQUAL_LITES', width: 38, height: 70, windowHeight: 50,
    muntin: resolveFormMuntinForDiagram({ idPattern: 41, idType: 56, panels: selection }, patterns, types),
  });
  const report = render(PieceReportCard, { piece: shFixReportPiece(fullView), displayMark: 'SH1', showPrices: false });
  for (const html of [preview, report]) {
    assert.equal(bars(html).length, 0);
    assert.match(html, /data-authentic-evolution-family="SINGLE_HUNG_WINDOW"/);
  }
});

const rendererTestContext = { test, load, render, panel, resolved, bars, panels,
  clipFor, assertClippedBars, attrs, tags, PieceDiagram, PieceReportCard, reportPiece, saved };
require('./muntin-french-door-cases.cjs')(rendererTestContext);
require('./muntin-fixed-casement-cases.cjs')(rendererTestContext);
require('./muntin-sliding-window-wall-cases.cjs')(rendererTestContext);

let failures = 0;
for (const { name, run } of tests) {
  try { run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack}`); }
}
console.log(`${tests.length - failures}/${tests.length} muntin diagram tests passed`);
if (failures) process.exitCode = 1;
