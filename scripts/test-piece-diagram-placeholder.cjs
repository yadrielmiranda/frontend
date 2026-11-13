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
const garageTemplate = {
  version: 1,
  columns: [0.2, 0.35, 0.45],
  rows: [0.15, 0.25, 0.6],
  cells: [['glass', 'slat', 'glass'], ['slat', 'slat', 'glass'], ['glass', 'slat', 'slat']],
};
const garageSnapshot = {
  version: 1, systemId: 999,
  design: { id: 777, name: 'Courtyard layout <A> & B', imageUrl: '/unused-image.png', template: garageTemplate },
  color: { id: 888, name: 'Custom teal', hexCode: '#218D91' },
};
const assertPlaceholder = html => {
  assert.match(html, /data-diagram-state="unavailable"/);
  assert.match(html, /Complete the piece details to see the preview/);
  assert.doesNotMatch(html, /<svg\b|<rect\b|<image\b/);
};
const frenchDoorCatalog = [
  { systemName: 'Serie 800', singlePreparation: '3P-Lock + C Handle + Push Bar',
    doublePreparation: 'Act:3P-Lock/Inact:2P-Lock + C Handle + Push Bar' },
  { systemName: 'Serie 810', singlePreparation: '3P-Lock + Hardware Valli Bronze',
    doublePreparation: 'Act:3P-Lock/Inact:2P-Lock + Hardware Summit White' },
];
const frenchDoorAppearance = { frameColorHex: '#876543', glassTintHex: '#123456', showDimensions: true };
const frenchDoorTransoms = [
  { configuration: 'XT', width: 36, height: 100, doorHeight: 80, leaves: 1 },
  { configuration: 'XXT', width: 72, height: 110, doorHeight: 90, leaves: 2 },
];
function assertFrenchDoor(html, configuration, width, label) {
  assert.match(html, /<svg\b/, `${label}: a complete door renders its drawing`);
  assert.doesNotMatch(html, /data-diagram-state="unavailable"/);
  assert.match(html, /data-diagram-renderer="SERIES_600_SHARED"/);
  assert.match(html, new RegExp(`aria-label="French Door ${configuration}, ${width} by 80 inches"`));
  assert.match(html, /fill="#876543"/, 'The selected frame color reaches the artwork');
  assert.match(html, /<rect\b[^>]*fill="#123456"[^>]*data-glass-effect="TINT"/, 'The selected tint reaches the glass');
  assert.match(html, new RegExp(`W\\. ${width}&quot;`));
  assert.match(html, /H\. 80&quot;/);
}
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
  test(`${variant}: Serie 800 and 810 single doors preserve handing, appearance and dimensions`, () => {
    for (const { systemName, singlePreparation } of frenchDoorCatalog) {
      for (const side of ['Left', 'Right']) {
        const html = render(PieceDiagram, {
          diagramFamily: 'FRENCH_DOOR', systemName, configuration: 'X', dimensionMode: 'STANDARD',
          piece: { width: 36, height: 80 }, activeOptionName: `${side} Active`,
          preparationOptionName: singlePreparation, ...frenchDoorAppearance, variant,
        });
        assertFrenchDoor(html, 'X', 36, `${systemName} ${side} Active`);
        assert.match(html, new RegExp(`data-hinge-side="${side.toLowerCase()}"`));
      }
    }
  });
  test(`${variant}: Serie 800 and 810 double doors use their catalog preparation and active leaf`, () => {
    for (const { systemName, doublePreparation } of frenchDoorCatalog) {
      for (const side of ['Left', 'Right']) {
        const html = render(PieceDiagram, {
          diagramFamily: 'FRENCH_DOOR', systemName, configuration: 'XX', dimensionMode: 'STANDARD',
          piece: { width: 72, height: 80 }, activeOptionName: `${side} Active`,
          preparationOptionName: doublePreparation, ...frenchDoorAppearance, variant,
        });
        assertFrenchDoor(html, 'XX', 72, `${systemName} ${side} Active`);
        assert.match(html, new RegExp(`data-active-leaf="${side.toLowerCase()}"`));
        assert.match(html, /data-bore-count="3"/);
      }
    }
  });
  test(`${variant}: similar series names and incomplete Serie 800/810 doors stay neutral`, () => {
    for (const { systemName, singlePreparation } of frenchDoorCatalog) {
      const props = {
        diagramFamily: 'FRENCH_DOOR', systemName, configuration: 'X', dimensionMode: 'STANDARD',
        activeOptionName: 'Left Active', preparationOptionName: singlePreparation, variant,
      };
      assertPlaceholder(render(PieceDiagram, { ...props, systemName: `${systemName}0`, piece: { width: 36, height: 80 } }));
      assertPlaceholder(render(PieceDiagram, { ...props, piece: { height: 80 } }));
    }
  });
  test(`${variant}: French Door transoms preserve lower leaves, a fixed top, finishes and section dimensions`, () => {
    for (const { systemName } of frenchDoorCatalog) {
      for (const { configuration, width, height, doorHeight, leaves } of frenchDoorTransoms) {
        const props = { diagramFamily: 'FRENCH_DOOR', systemName, configuration,
          piece: { width, height, doorHeight }, ...frenchDoorAppearance, variant };
        const html = render(PieceDiagram, props);
        assert.match(html, /data-diagram-renderer="FRENCH_DOOR_TRANSOM"/);
        assert.match(html, /<svg\b/);
        assert.doesNotMatch(html, /data-diagram-state="unavailable"/);
        assert.match(html, new RegExp(`data-door-height="${doorHeight}"`));
        assert.match(html, /data-transom-height="20"/);
        assert.equal((html.match(/data-part="(?:single|double)-leaf"/g) ?? []).length, leaves);
        assert.equal((html.match(/data-part="transom-glass"/g) ?? []).length, 1);
        assert.equal((html.match(/data-part="french-door-transom"/g) ?? []).length, 1);
        assert.match(html, /data-part="french-door-leaves" transform="translate\(0 20\)"/, 'The door leaves sit below the fixed transom');
        assert.match(html, /data-frame-color="#876543"/);
        assert.match(html, /stop-color="#876543"/, 'The selected frame finish colors the artwork');
        assert.equal((html.match(/<rect\b[^>]*fill="#123456"[^>]*data-glass-effect="TINT"/g) ?? []).length, leaves + 1);
        assert.doesNotMatch(html, /data-part="(?:lock-bore|barrel-hinge)"|data-hinge-side=|data-active-leaf=/,
          'No unselected handing or hardware is invented');
        for (const dimension of ['width', 'height', 'door-height', 'transom-height']) {
          assert.match(html, new RegExp(`data-dimension="${dimension}"`));
        }
        for (const [axis, value] of [['W', width], ['H', height], ['H', doorHeight], ['H', 20]]) {
          assert.match(html, new RegExp(`${axis}\\.? ${value}(?:&quot;|″)`));
        }
        const hidden = render(PieceDiagram, { ...props, showDimensions: false });
        assert.doesNotMatch(hidden, /data-dimension="(?:width|height|door-height|transom-height)"/);
        assert.equal((hidden.match(/data-part="(?:single|double)-leaf"/g) ?? []).length, leaves);
      }
    }
  });
  test(`${variant}: French Door transoms require a valid door height and at least ten inches above`, () => {
    for (const { systemName } of frenchDoorCatalog) {
      for (const { configuration, width } of frenchDoorTransoms) {
        const props = { diagramFamily: 'FRENCH_DOOR', systemName, configuration, variant };
        for (const doorHeight of [undefined, 'bad', 0, 100, 101, 90.001]) {
          assertPlaceholder(render(PieceDiagram, { ...props, piece: { width, height: 100, doorHeight } }));
        }
        for (const [height, doorHeight] of [[100, 90], [65.67, 55.67]]) {
          const html = render(PieceDiagram, { ...props, piece: { width, height, doorHeight } });
          assert.match(html, /data-diagram-renderer="FRENCH_DOOR_TRANSOM"/, `${systemName} ${configuration}: a ten-inch transom is valid`);
          assert.match(html, /<svg\b/);
          assert.doesNotMatch(html, /data-diagram-state="unavailable"/);
        }
      }
    }
  });
  test(`${variant}: French Door transom muntins target each pane once using the internal top-first layout`, () => {
    for (const { configuration, width, height, doorHeight, leaves } of frenchDoorTransoms) {
      const positions = leaves === 1 ? ['Top', 'Bottom'] : ['Top', 'Left', 'Right'];
      const panels = Array.from({ length: leaves + 1 }, (_, index) => ({
        panelIndex: index + 1, panelCode: index === 0 ? 'O' : 'X',
        panelLabel: positions[index], horizontalLites: index + 2, verticalLites: 2,
      }));
      const html = render(PieceDiagram, { diagramFamily: 'FRENCH_DOOR', systemName: 'Serie 810', configuration,
        piece: { width, height, doorHeight }, muntin: { profile: 'flat', panels: [...panels].reverse() }, variant });
      assert.match(html, /data-diagram-renderer="FRENCH_DOOR_TRANSOM"/);
      assert.equal((html.match(/data-part="muntin-layer"/g) ?? []).length, 1);
      assert.equal((html.match(/data-part="muntin-panel"/g) ?? []).length, leaves + 1);
      for (const panel of panels) {
        assert.match(html, new RegExp(`data-part="muntin-panel"[^>]*data-panel-index="${panel.panelIndex}"[^>]*data-glass-position="${panel.panelLabel}"[^>]*data-horizontal-lites="${panel.horizontalLites}"`));
      }
    }
  });
  test(`${variant}: real rectangular fixed window is preserved`, () => {
    const html = render(PieceDiagram, { diagramFamily: 'FIXED_SHAPE', configuration: 'Picture Window', piece: { width: 40, height: 80 }, variant });
    assert.match(html, /data-diagram-renderer="FIXED_WINDOW_SHAPE"/);
    assert.match(html, /<svg\b/);
    assert.doesNotMatch(html, /data-diagram-state="unavailable"/);
  });
  test(`${variant}: garage snapshot renders arbitrary stored geometry and its own color`, () => {
    const html = render(PieceDiagram, {
      diagramFamily: 'GARAGE_DOOR', systemName: 'Custom garage series', frameColorHex: '#000000',
      piece: { width: 123, height: 87, designSnapshot: garageSnapshot }, variant,
    });
    assert.match(html, /data-diagram-renderer="GARAGE_DOOR_DYNAMIC"/);
    assert.match(html, /F.W. 123″/);
    assert.match(html, /F.H. 87″/);
    assert.doesNotMatch(html, /src="\/unused-image.png"/);
    const svg = html;
    assert.match(svg, /<title[^>]*>Courtyard layout &lt;A&gt; &amp; B<\/title>/, 'A custom name needs no catalog entry and is escaped');
    assert.match(svg, /data-slat-color="#218D91"/, 'The saved design color determines the slats');
    assert.match(svg, /data-frame-color="#218D91"/, 'The frame follows the design color');
    assert.match(svg, /data-section-count="4"/);
    assert.equal((svg.match(/data-row=/g) ?? []).length, 12);
    assert.match(svg, /data-material="glass"/);
    assert.match(svg, /data-material="slat"/);
    const faces = [...svg.matchAll(/<rect\b[^>]*\swidth="([\d.]+)"[^>]*data-panel-face="true"/g)];
    assert.ok(Math.abs(Number(faces[0][1]) / Number(faces[2][1]) - .2 / .45) < 1e-10, 'The arbitrary column proportions reach the renderer');
    assert.doesNotMatch(svg, /<img|<image/, 'The detailed diagram is native SVG, not an enlarged thumbnail');
  });
  test(`${variant}: explicitly removing a garage design overrides a saved snapshot`, () => {
    const props = { diagramFamily: 'GARAGE_DOOR', systemName: 'Custom garage series', piece: { width: 123, height: 87 }, variant };
    const withoutDesign = render(PieceDiagram, props);
    const removedDesign = render(PieceDiagram, { ...props, piece: { ...props.piece, designSnapshot: garageSnapshot }, garageDesign: null });
    assert.equal(removedDesign, withoutDesign, 'A null current selection takes priority over the persisted snapshot');
    assert.match(removedDesign, /data-garage-mode="GF"/);
    assert.doesNotMatch(removedDesign, /data-material="slat"|data:image\/svg\+xml/);
  });
  test(`${variant}: garage glass options pass through in both modes`, () => {
    for (const designSnapshot of [garageSnapshot, null]) {
      const html = render(PieceDiagram, { diagramFamily: 'GARAGE_DOOR',
        piece: { width: 90, height: 100, designSnapshot }, glassTintHex: '#123456',
        frameColorHex: '#876543', hasPrivacy: true, hasCoating: true, showDimensions: false, variant });
      for (const effect of ['TINT', 'COATING', 'PRIVACY']) assert.match(html, new RegExp(`data-glass-effect="${effect}"`));
      assert.doesNotMatch(html, /data-dimensions="VISIBLE"/);
      assert.match(html, new RegExp(`data-frame-color="${designSnapshot ? '#218D91' : '#876543'}"`));
    }
  });
  test(`${variant}: incomplete garage dimensions stay neutral`, () => {
    assertPlaceholder(render(PieceDiagram, { diagramFamily: 'GARAGE_DOOR',
      piece: { height: 100, designSnapshot: garageSnapshot }, variant }));
  });
  test(`${variant}: garage section count follows height and series setting`, () => {
    for (const designSnapshot of [garageSnapshot, null]) {
      for (const [height, sections] of [[90, 4], [100, 5], [120, 5]]) {
        const html = render(PieceDiagram, { diagramFamily: 'GARAGE_DOOR',
          piece: { width: 120, height, designSnapshot }, garageMaxSectionHeightIn: '24.00', variant });
        assert.match(html, new RegExp(`data-section-count="${sections}"`));
      }
      const html = render(PieceDiagram, { diagramFamily: 'GARAGE_DOOR',
        piece: { width: 120, height: 100, designSnapshot }, garageMaxSectionHeightIn: 18, variant });
      assert.match(html, /data-section-count="6"/);
    }
  });
}
console.log(`${passed} diagram placeholder tests passed.`);
