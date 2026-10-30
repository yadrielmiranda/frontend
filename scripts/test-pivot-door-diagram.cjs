/* Real React/SVG renderers, isolated from the browser, database and network. */
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

const { PieceDiagram } = load('components/piece-diagram.tsx');
const { pivotDoorLayout } = load('components/piece-diagram/renderers/pivot-door/pivot-door-layout.ts');
const props = { diagramFamily: 'PIVOT_DOOR', configuration: 'X', piece: { width: 45, height: 100 } };
const compositeCases = [
  { configuration: 'OXO', width: 150, height: 100, doorWidth: 60, leftWidth: 45, rightWidth: 45, panes: 3 },
  { configuration: 'O/O-O/X', width: 105, height: 130, doorWidth: 60, doorHeight: 100, leftWidth: 45, rightWidth: 0, panes: 4 },
  { configuration: 'O/X-O/O', width: 105, height: 130, doorWidth: 60, doorHeight: 100, leftWidth: 0, rightWidth: 45, panes: 4 },
  { configuration: 'O/O-O/X-O/O', width: 150, height: 130, doorWidth: 60, doorHeight: 100, leftWidth: 45, rightWidth: 45, panes: 6 },
];
const render = overrides => renderToStaticMarkup(React.createElement(PieceDiagram, { ...props, ...overrides }));
const placeholder = html => {
  assert.match(html, /data-diagram-state="unavailable"/);
  assert.match(html, /Complete the piece details to see the preview/);
  assert.doesNotMatch(html, /<svg\b|<image\b|data-diagram-renderer="PIVOT_DOOR_X"/);
};
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Extract a complete SVG element, including nested groups, without requiring a DOM.
function element(html, attribute, value) {
  const opening = new RegExp(`<([A-Za-z][\\w:-]*)\\b[^>]*\\s${attribute}="${escape(value)}"[^>]*>`).exec(html);
  assert.ok(opening, `Missing ${attribute}="${value}"`);
  if (opening[0].endsWith('/>')) return opening[0];
  const tags = new RegExp(`<\\/?${opening[1]}\\b[^>]*>`, 'g');
  tags.lastIndex = opening.index + opening[0].length;
  let depth = 1;
  for (let match; (match = tags.exec(html));) {
    if (match[0].startsWith('</')) depth--;
    else if (!match[0].endsWith('/>')) depth++;
    if (depth === 0) return html.slice(opening.index, tags.lastIndex);
  }
  throw new Error(`Unclosed ${opening[1]} element`);
}

function compositeSlots(item) {
  const columns = [];
  if (item.leftWidth) columns.push({ column: 'left', code: 'O', width: item.leftWidth });
  columns.push({ column: item.leftWidth && item.rightWidth ? 'center' : item.leftWidth ? 'right' : 'left', code: 'X', width: item.doorWidth });
  if (item.rightWidth) columns.push({ column: 'right', code: 'O', width: item.rightWidth });
  let offset = 0;
  for (const column of columns) { column.offset = offset; offset += column.width; }
  const hasTransom = item.doorHeight !== undefined;
  return (hasTransom ? ['top', 'bottom'] : ['bottom']).flatMap(row => columns.map(column => ({
    ...column, row, code: row === 'top' ? 'O' : column.code,
    label: (hasTransom ? `${row[0].toUpperCase()}${row.slice(1)} ` : '') + column.column[0].toUpperCase() + column.column.slice(1),
  })));
}

function compositePane(html, row, column) {
  const opening = new RegExp(`<g\\b(?=[^>]*\\sdata-row="${row}")(?=[^>]*\\sdata-column="${column}")[^>]*>`).exec(html);
  assert.ok(opening, `Missing composite pane ${row} ${column}`);
  const label = opening[0].match(/data-panel-label="([^"]+)"/);
  assert.ok(label, `Missing composite panel label for ${row} ${column}`);
  return element(html.slice(opening.index), 'data-panel-label', label[1]);
}

function compositeMuntin(item) {
  const slots = compositeSlots(item);
  // Catalog layout rows are manual; their order need not be the physical order.
  return { profile: 'flat', panels: slots.map((slot, index) => ({
    panelIndex: slots.length - index, panelCode: slot.code, panelLabel: slot.label,
    horizontalLites: slots.length - index + 1, verticalLites: 1,
  })).sort((a, b) => a.panelIndex - b.panelIndex) };
}
const layer = (html, name) => element(html, 'data-layer', name);
const referencedAppearance = (html, name) => {
  const content = layer(html, name);
  const ids = [...new Set([...content.matchAll(/url\(#([^\)]+)\)/g)].map(match => match[1]))];
  return content + ids.map(id => element(html, 'id', id)).join('');
};

let passed = 0;
function test(name, run) { run(); passed++; console.log(`PASS ${name}`); }

test('Pivot X renders in the editor and saved report with the actual dimensions', () => {
  for (const variant of ['editor', 'report']) {
    const html = render({ variant, configuration: ' x ' });
    assert.match(html, /data-diagram-renderer="PIVOT_DOOR_X"/);
    assert.equal((html.match(/<svg\b/g) || []).length, 1);
    assert.match(html, /data-opening-direction="OUTWARD"/);
    assert.match(html, /F\.W\. 45″/);
    assert.match(html, /F\.H\. 100″/);
    assert.doesNotMatch(html, /data-diagram-state="unavailable"/);
  }
});

test('Right Active mirrors the whole 45 by 108 artwork in editor and report while measurements stay readable', () => {
  for (const variant of ['editor', 'report']) {
    const piece = { width: 45, height: 108 };
    const left = render({ variant, piece, activeOptionName: 'Left Active' });
    const right = render({ variant, piece, activeOptionName: 'Right Active' });
    assert.match(right, /data-exterior-pivot-side="right"/);
    assert.match(right, /F\.W\. 45″/);
    assert.match(right, /F\.H\. 108″/);
    const artwork = element(right, 'data-part', 'pivot-door-artwork');
    assert.match(artwork, /^<g[^>]*transform="translate\(450 0\) scale\(-1 1\)"/);
    assert.equal(artwork.replace(' transform="translate(450 0) scale(-1 1)"', ''),
      element(left, 'data-part', 'pivot-door-artwork'), 'All product layers share the same mirror');
    assert.doesNotMatch(artwork, /data-dimensions="VISIBLE"|F\.W\.|F\.H\./);
    assert.equal(element(right, 'data-dimensions', 'VISIBLE'), element(left, 'data-dimensions', 'VISIBLE'));
    assert.match(element(right, 'data-part', 'pivot-door-frame'), /data-width="450" data-height="1080"/);
  }
});

test('Active selection accepts normalized Right Active and returns to the original left or default drawing', () => {
  const piece = { width: 45, height: 108 };
  const original = render({ piece });
  const right = render({ piece, activeOptionName: 'Right Active' });
  for (const activeOptionName of [' right active ', 'RIGHT ACTIVE', 'right-active']) {
    assert.equal(render({ piece, activeOptionName }), right);
  }
  for (const activeOptionName of ['Left Active', null, undefined]) {
    const restored = render({ piece, activeOptionName });
    assert.equal(restored, original);
    assert.match(restored, /data-exterior-pivot-side="left"/);
    assert.doesNotMatch(element(restored, 'data-part', 'pivot-door-artwork').split('>')[0], /transform=/);
  }
});

test('Repeated Right Active glass and muntin layers retain their own matching clip resources', () => {
  const rightProps = { ...props, piece: { width: 45, height: 108 }, activeOptionName: 'Right Active',
    glassTintHex: '#789ABC', hasCoating: true, hasPrivacy: true,
    muntin: { profile: 'flat', panels: [{ panelIndex: 1, panelCode: 'X', panelLabel: 'Center', horizontalLites: 3, verticalLites: 2 }] } };
  const html = renderToStaticMarkup(React.createElement(React.Fragment, null,
    React.createElement(PieceDiagram, rightProps), React.createElement(PieceDiagram, { ...rightProps, variant: 'report' })));
  const allIds = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(allIds).size, allIds.length);
  const svgs = html.match(/<svg\b[\s\S]*?<\/svg>/g) || [];
  assert.equal(svgs.length, 2);
  for (const svg of svgs) {
    assert.match(svg, /data-exterior-pivot-side="right"/);
    const artwork = element(svg, 'data-part', 'pivot-door-artwork');
    const muntin = element(artwork, 'data-part', 'muntin-layer');
    assert.equal((muntin.match(/data-part="muntin-bar"/g) || []).length, 3);
    const clipId = muntin.match(/clip-path="url\(#([^\)]+)\)"/)[1];
    const glassPath = element(svg, 'data-part', 'pivot-glass').match(/\sd="([^"]+)"/)[1];
    assert.equal(element(svg, 'id', clipId).match(/\sd="([^"]+)"/)[1], glassPath);
    const clippedAppearance = element(artwork, 'clip-path', `url(#${clipId})`);
    for (const effect of ['TINT', 'COATING', 'PRIVACY']) assert.match(clippedAppearance, new RegExp(`data-glass-effect="${effect}"`));
    const ids = new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]));
    for (const match of svg.matchAll(/url\(#([^\)]+)\)/g)) assert.ok(ids.has(match[1]), `Unresolved right-active resource ${match[1]}`);
  }
});

test('Decimal and fraction inputs produce the same actual dimensions and geometry', () => {
  for (const variant of ['editor', 'report']) {
    const numeric = render({ variant, piece: { width: 45.375, height: 100.125 } });
    const fractional = render({ variant, piece: { width: '45 3/8″', height: '100-1/8' } });
    assert.equal(fractional, numeric);
    assert.match(fractional, /F\.W\. 45\.375″/);
    assert.match(fractional, /F\.H\. 100\.125″/);
  }
});

test('Missing or invalid actual dimensions stay unavailable even with door dimensions', () => {
  for (const variant of ['editor', 'report']) {
    for (const field of ['width', 'height']) {
      for (const value of [undefined, null, '', 0, -1, NaN, Infinity, 'abc', '1/0', '2/2']) {
        placeholder(render({ variant, piece: { width: 45, height: 100, doorWidth: 45, doorHeight: 100, [field]: value } }));
      }
    }
    placeholder(render({ variant, piece: { doorWidth: 45, doorHeight: 100 } }));
  }
});

test('Other Pivot configurations remain unavailable and unrelated families do not use Pivot renderers', () => {
  for (const configuration of ['', 'O/O', 'O/O-OX-O/O', 'O/X-O/X', 'XOX']) {
    placeholder(render({ configuration }));
  }
  for (const diagramFamily of ['FRENCH_DOOR', 'GENERIC', 'SLIDING_DOOR', 'FIXED_SHAPE']) {
    for (const configuration of ['X', 'O', 'O/X', 'XO', 'OX', ...compositeCases.map(item => item.configuration)]) {
      assert.doesNotMatch(render({ diagramFamily, configuration, piece: { width: 150, height: 130, doorWidth: 60, doorHeight: 100 } }),
        /data-diagram-renderer="(?:PIVOT_DOOR_X|PIVOT_FIXED_O|PIVOT_DOOR_TRANSOM|PIVOT_DOOR_SIDELITE|PIVOT_DOOR_COMPOSITE_TRANSOM)"/);
    }
  }
});

test('Fixed O renders in editor and report without active hardware or movement', () => {
  for (const variant of ['editor', 'report']) {
    const options = { variant, configuration: ' o ', piece: { width: 30, height: 100 } };
    const html = render(options);
    assert.match(html, /data-diagram-renderer="PIVOT_FIXED_O"/);
    assert.match(html, /F\.W\. 30″/);
    assert.match(html, /F\.H\. 100″/);
    assert.equal((html.match(/<svg\b/g) || []).length, 1);
    assert.match(element(html, 'data-part', 'pivot-fixed-glass'), /data-panel-code="O"/);
    const marker = layer(html, 'CONFIGURATION_MARKER');
    assert.match(marker, /data-configuration="O"/);
    assert.match(marker, /stroke="#D51028"/);
    assert.match(marker, /<ellipse\b/);
    assert.doesNotMatch(html, /data-layer="(?:PULL_HANDLE|OPEN_LEAF)"|data-opening-direction="(?:OUTWARD|INWARD)"/);
    assert.equal(render({ ...options, activeOptionName: 'Right Active' }), html);
    assert.equal(render({ ...options, activeOptionName: 'Left Active' }), html);
  }
});

test('O and O/X require actual dimensions, and O/X requires a valid smaller Door Height', () => {
  for (const variant of ['editor', 'report']) {
    for (const configuration of ['O', 'O/X']) {
      for (const field of ['width', 'height']) {
        for (const value of [undefined, '', 0, -1, Infinity, 'not a number']) {
          placeholder(render({ variant, configuration, piece: { width: 45, height: 120, doorWidth: 45, doorHeight: 100, [field]: value } }));
        }
      }
    }
    for (const doorHeight of [undefined, null, '', 0, -1, NaN, Infinity, 'bad', '1/0', 120, 121]) {
      placeholder(render({ variant, configuration: 'O/X', piece: { width: 45, height: 120, doorHeight } }));
    }
  }
});

test('O/X normalizes fractional opening and door dimensions before drawing the transom', () => {
  for (const variant of ['editor', 'report']) {
    const options = { variant, configuration: ' o/x ' };
    const numeric = render({ ...options, piece: { width: 45.375, height: 120.125, doorHeight: 100.125 } });
    const fractional = render({ ...options, piece: { width: '45 3/8″', height: '120-1/8', doorHeight: '100 1/8' } });
    assert.equal(fractional, numeric);
    assert.match(fractional, /data-diagram-renderer="PIVOT_DOOR_TRANSOM"/);
    assert.match(fractional, /F\.W\. 45\.375″/);
    assert.match(fractional, /F\.H\. 120\.125″/);
    assert.match(fractional, /D\.H\. 100\.125″/);
    assert.match(fractional, /T\.H\. 20″/);
  }
});

test('O/X keeps one full-height frame and one divider at the derived transom height', () => {
  for (const variant of ['editor', 'report']) {
    for (const [width, height, doorHeight, transomHeight] of [[60, 130, 100, 30], [45, 120, 100, 20]]) {
      const html = render({ variant, configuration: 'O/X', piece: { width, height, doorHeight } });
      assert.match(html, /data-diagram-renderer="PIVOT_DOOR_TRANSOM"/);
      assert.match(html, new RegExp(`data-door-height="${doorHeight}" data-transom-height="${transomHeight}"`));
      assert.equal((html.match(/data-part="pivot-door-frame"/g) || []).length, 1);
      assert.equal((html.match(/data-layer="FRAME"/g) || []).length, 1);
      assert.equal((html.match(/data-part="pivot-transom-divider"/g) || []).length, 1);
      const frame = element(html, 'data-part', 'pivot-door-frame');
      const frameWidth = Number(frame.match(/data-width="([^"]+)"/)[1]);
      const frameHeight = Number(frame.match(/data-height="([^"]+)"/)[1]);
      assert.equal(frameWidth, width * 10);
      assert.equal(frameHeight, height * 10);
      assert.equal(frameWidth / frameHeight, width / height);
      const divider = element(html, 'data-part', 'pivot-transom-divider');
      assert.equal(Number(divider.match(/\sy="([^"]+)"/)[1]), transomHeight * 10);
      const top = element(html, 'data-part', 'pivot-fixed-glass');
      const topY = Number(top.match(/\sy="([^"]+)"/)[1]);
      const topHeight = Number(top.match(/\sheight="([^"]+)"/)[1]);
      assert.ok(topY > 0 && topHeight > 0);
      assert.ok(Math.abs(topY + topHeight - transomHeight * 10) < 1e-10);
      const lower = element(html, 'data-part', 'pivot-door-leaf-artwork');
      assert.match(lower, new RegExp(`^<g[^>]*transform="translate\\(0 ${transomHeight * 10}\\)"`));
      assert.match(lower, /data-opening-direction="OUTWARD"/);
      assert.match(lower, /data-layer="PULL_HANDLE"/);
      for (const [label, value] of [['F.W.', width], ['F.H.', height], ['D.H.', doorHeight], ['T.H.', transomHeight]]) {
        assert.ok(html.includes(`${label} ${value}″`));
      }
    }
  }
});

test('O/X Right Active mirrors only the lower outward door and preserves the fixed transom', () => {
  for (const variant of ['editor', 'report']) {
    const options = { variant, configuration: 'O/X', piece: { width: 45, height: 120, doorHeight: 100 } };
    const left = render({ ...options, activeOptionName: 'Left Active' });
    const right = render({ ...options, activeOptionName: 'Right Active' });
    assert.match(right, /data-exterior-pivot-side="right"/);
    assert.doesNotMatch(element(right, 'data-part', 'pivot-door-artwork').split('>')[0], /transform=/);
    const lower = element(right, 'data-part', 'pivot-door-leaf-artwork');
    assert.match(lower, /^<g[^>]*transform="translate\(0 200\) translate\(450 0\) scale\(-1 1\)"/);
    assert.equal(lower.replace(' translate(450 0) scale(-1 1)', ''), element(left, 'data-part', 'pivot-door-leaf-artwork'));
    assert.equal(element(right, 'data-part', 'pivot-transom'), element(left, 'data-part', 'pivot-transom'));
    assert.equal(layer(right, 'FRAME'), layer(left, 'FRAME'));
    assert.equal(element(right, 'data-dimensions', 'VISIBLE'), element(left, 'data-dimensions', 'VISIBLE'));
    assert.equal(render({ ...options, activeOptionName: 'Left Active' }), left);
  }
});

test('O and O/X can hide every dimension label without changing their product geometry', () => {
  for (const variant of ['editor', 'report']) {
    for (const configuration of ['O', 'O/X']) {
      const options = { variant, configuration, piece: { width: 45, height: 120, doorHeight: 100 } };
      const visible = render(options);
      const hidden = render({ ...options, showDimensions: false });
      assert.match(hidden, /<svg\b/);
      assert.doesNotMatch(hidden, /F\.W\.|F\.H\.|D\.H\.|T\.H\.|data-dimensions="VISIBLE"|data-part="pivot-segment-dimensions"/);
      const part = configuration === 'O' ? 'pivot-fixed-artwork' : 'pivot-door-artwork';
      assert.equal(element(hidden, 'data-part', part), element(visible, 'data-part', part));
    }
  }
});

test('O and O/X finishes and distinct muntin selections stay inside their matching glass panes', () => {
  for (const configuration of ['O', 'O/X']) {
    const isTransom = configuration === 'O/X';
    const options = { configuration, piece: { width: 60, height: 130, doorHeight: 100 },
      activeOptionName: 'Right Active', frameColorHex: '#704A35',
      muntin: { profile: 'flat', panels: isTransom ? [
        { panelIndex: 2, panelCode: 'X', panelLabel: 'Bottom', horizontalLites: 3, verticalLites: 2 },
        { panelIndex: 1, panelCode: 'O', panelLabel: 'Top', horizontalLites: 2, verticalLites: 1 },
      ] : [{ panelIndex: 1, panelCode: 'O', panelLabel: 'Center', horizontalLites: 2, verticalLites: 2 }] } };
    const plain = render(options);
    const finishedOptions = { ...options, glassTintHex: '#789ABC', hasCoating: true, hasPrivacy: true };
    const finished = render(finishedOptions);
    assert.equal(layer(plain, 'FRAME'), layer(finished, 'FRAME'));
    if (isTransom) assert.equal(layer(plain, 'PULL_HANDLE'), layer(finished, 'PULL_HANDLE'));
    assert.doesNotMatch(plain, /data-glass-effect=/);
    for (const effect of ['TINT', 'COATING', 'PRIVACY']) {
      assert.equal((finished.match(new RegExp(`data-glass-effect="${effect}"`, 'g')) || []).length, isTransom ? 2 : 1);
    }
    const fixedPane = element(finished, 'data-part', 'pivot-fixed-pane');
    const fixedClipId = fixedPane.match(/<clipPath id="([^"]+)"/)[1];
    const fixedClip = element(finished, 'id', fixedClipId);
    const fixedGlass = element(finished, 'data-part', 'pivot-fixed-glass');
    for (const attr of ['x', 'y', 'width', 'height']) {
      assert.equal(fixedClip.match(new RegExp(`\\s${attr}="([^"]+)"`))[1], fixedGlass.match(new RegExp(`\\s${attr}="([^"]+)"`))[1]);
    }
    const fixedEffects = element(fixedPane, 'clip-path', `url(#${fixedClipId})`);
    assert.match(fixedEffects, /data-layer="GLASS_APPEARANCE"/);
    const upperGrid = element(fixedEffects, 'data-part', 'muntin-panel');
    assert.match(upperGrid, /data-panel-index="1"/);
    assert.equal((upperGrid.match(/data-part="muntin-bar"/g) || []).length, isTransom ? 1 : 2);
    if (isTransom) {
      const lower = element(finished, 'data-part', 'pivot-door-leaf-artwork');
      const lowerGrid = element(lower, 'data-part', 'muntin-panel');
      assert.match(lowerGrid, /data-panel-index="2"/);
      assert.equal((lowerGrid.match(/data-part="muntin-bar"/g) || []).length, 3);
      const lowerMuntin = element(lower, 'data-part', 'muntin-layer');
      const lowerClipId = lowerMuntin.match(/clip-path="url\(#([^\)]+)\)"/)[1];
      assert.notEqual(lowerClipId, fixedClipId);
      const lowerGlass = element(lower, 'data-part', 'pivot-glass');
      assert.equal(element(finished, 'id', lowerClipId).match(/\sd="([^"]+)"/)[1], lowerGlass.match(/\sd="([^"]+)"/)[1]);
      assert.match(element(lower, 'clip-path', `url(#${lowerClipId})`), /data-layer="GLASS_APPEARANCE"/);
    }
    const multiple = renderToStaticMarkup(React.createElement(React.Fragment, null,
      React.createElement(PieceDiagram, { ...props, ...finishedOptions }),
      React.createElement(PieceDiagram, { ...props, ...finishedOptions, variant: 'report' })));
    const allIds = [...multiple.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(allIds).size, allIds.length);
    for (const svg of multiple.match(/<svg\b[\s\S]*?<\/svg>/g) || []) {
      const ids = new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]));
      for (const match of svg.matchAll(/url\(#([^\)]+)\)/g)) assert.ok(ids.has(match[1]));
    }
  }
});

test('XO and OX normalize actual opening and door widths in editor and report and ignore stale Door Height', () => {
  for (const variant of ['editor', 'report']) {
    for (const configuration of ['XO', 'OX']) {
      const options = { variant, configuration: ` ${configuration.toLowerCase()} ` };
      const piece = { width: 80.375, height: 108.125, doorWidth: 45.125 };
      const numeric = render({ ...options, piece });
      const fractional = render({ ...options, piece: { width: '80 3/8″', height: '108-1/8', doorWidth: '45 1/8' } });
      assert.equal(fractional, numeric);
      assert.match(numeric, /data-diagram-renderer="PIVOT_DOOR_SIDELITE"/);
      assert.match(numeric, /data-door-width="45\.125"/);
      assert.match(numeric, /data-sidelite-width="35\.25"/);
      assert.match(numeric, /F\.W\. 80\.375″/);
      assert.match(numeric, /F\.H\. 108\.125″/);
      assert.equal((numeric.match(/<svg\b/g) || []).length, 1);
      assert.doesNotMatch(numeric, /data-part="pivot-transom"|data-transom-height=/);
      for (const doorHeight of [100, 500, NaN, 'invalid']) {
        assert.equal(render({ ...options, piece: { ...piece, doorHeight } }), numeric);
      }
    }
  }
});

test('XO and OX require valid actual opening dimensions and a positive smaller Door Width', () => {
  for (const variant of ['editor', 'report']) {
    for (const configuration of ['XO', 'OX']) {
      for (const doorWidth of [undefined, null, '', 0, -1, NaN, Infinity, 'invalid', '1/0', 80, 81]) {
        placeholder(render({ variant, configuration, piece: { width: 80, height: 108, doorWidth, doorHeight: 108 } }));
      }
      for (const field of ['width', 'height']) {
        for (const value of [undefined, null, '', 0, -1, NaN, Infinity, 'invalid', '1/0']) {
          placeholder(render({ variant, configuration, piece: { width: 80, height: 108, doorWidth: 45, doorHeight: 108, [field]: value } }));
        }
      }
    }
  }
});

test('XO and OX use one whole frame and one divider while preserving the actual door and sidelite widths', () => {
  for (const variant of ['editor', 'report']) {
    for (const configuration of ['XO', 'OX']) {
      for (const [width, height, doorWidth] of [[80, 108, 45], [60, 100, 22.125]]) {
        const html = render({ variant, configuration, piece: { width, height, doorWidth } });
        const doorFirst = configuration === 'XO';
        const sideliteWidth = width - doorWidth;
        assert.match(html, new RegExp(`data-door-width="${doorWidth}"`));
        assert.match(html, new RegExp(`data-sidelite-width="${sideliteWidth}"`));
        assert.equal((html.match(/data-part="pivot-door-frame"/g) || []).length, 1);
        assert.equal((html.match(/data-layer="FRAME"/g) || []).length, 1);
        assert.equal((html.match(/data-part="pivot-sidelite-divider"/g) || []).length, 1);
        const frame = element(html, 'data-part', 'pivot-door-frame');
        assert.equal(Number(frame.match(/data-width="([^"]+)"/)[1]), width * 10);
        assert.equal(Number(frame.match(/data-height="([^"]+)"/)[1]), height * 10);
        const sidelite = element(html, 'data-part', 'pivot-sidelite');
        assert.match(sidelite, new RegExp(`data-side="${doorFirst ? 'right' : 'left'}"`));
        const glass = element(sidelite, 'data-part', 'pivot-fixed-glass');
        const glassRect = Object.fromEntries(['x', 'y', 'width', 'height'].map(attr => [attr, Number(glass.match(new RegExp(`\\s${attr}="([^"]+)"`))[1])]));
        assert.ok(glassRect.width > 0 && glassRect.height > 0);
        assert.ok(glassRect.y > 0 && glassRect.y + glassRect.height < height * 10);
        if (doorFirst) assert.ok(glassRect.x >= doorWidth * 10);
        else assert.ok(glassRect.x + glassRect.width <= sideliteWidth * 10);
        const divider = element(html, 'data-part', 'pivot-sidelite-divider');
        const dividerX = Number(divider.match(/\sx="([^"]+)"/)[1]);
        const dividerWidth = Number(divider.match(/\swidth="([^"]+)"/)[1]);
        const boundary = (doorFirst ? doorWidth : sideliteWidth) * 10;
        assert.ok(dividerWidth > 0 && dividerX <= boundary && dividerX + dividerWidth >= boundary);
        const localDoor = element(html, 'data-part', 'pivot-door-leaf-artwork');
        assert.match(localDoor, new RegExp(`^<g[^>]*transform="translate\\(${doorFirst ? 0 : sideliteWidth * 10} 0\\)"`));
        const singleDoor = render({ variant, piece: { width: doorWidth, height } });
        assert.equal(element(localDoor, 'data-part', 'pivot-door-leaf'), element(singleDoor, 'data-part', 'pivot-door-leaf'));
        assert.equal(element(localDoor, 'data-part', 'pivot-glass'), element(singleDoor, 'data-part', 'pivot-glass'));
        assert.doesNotMatch(sidelite, /data-layer="(?:PULL_HANDLE|OPEN_LEAF)"/);
      }
    }
  }
});

test('XO and OX keep their panel order when Active changes and mirror only the local outward door', () => {
  for (const variant of ['editor', 'report']) {
    for (const configuration of ['XO', 'OX']) {
      const options = { variant, configuration, piece: { width: 80, height: 108, doorWidth: 45 } };
      const left = render({ ...options, activeOptionName: 'Left Active' });
      const right = render({ ...options, activeOptionName: 'Right Active' });
      const localDoor = element(right, 'data-part', 'pivot-door-leaf-artwork');
      const offset = configuration === 'XO' ? 0 : 350;
      assert.match(localDoor, new RegExp(`^<g[^>]*transform="translate\\(${offset} 0\\) translate\\(450 0\\) scale\\(-1 1\\)"`));
      assert.equal(localDoor.replace(' translate(450 0) scale(-1 1)', ''), element(left, 'data-part', 'pivot-door-leaf-artwork'));
      assert.match(localDoor, /data-opening-direction="OUTWARD"/);
      assert.match(localDoor, /data-layer="PULL_HANDLE"/);
      assert.doesNotMatch(element(right, 'data-part', 'pivot-door-artwork').split('>')[0], /transform=/);
      assert.equal(element(right, 'data-part', 'pivot-sidelite'), element(left, 'data-part', 'pivot-sidelite'));
      assert.equal(layer(right, 'FRAME'), layer(left, 'FRAME'));
      assert.equal(element(right, 'data-dimensions', 'VISIBLE'), element(left, 'data-dimensions', 'VISIBLE'));
      assert.equal(render(options), left);
    }
  }
});

test('XO and OX show total and segment dimensions and can hide all labels without changing geometry', () => {
  for (const variant of ['editor', 'report']) {
    for (const configuration of ['XO', 'OX']) {
      const options = { variant, configuration, piece: { width: 80, height: 108, doorWidth: 45 } };
      const visible = render(options);
      for (const [label, value] of [['F.W.', 80], ['F.H.', 108], ['D.W.', 45], ['S.W.', 35]]) {
        assert.ok(visible.includes(`${label} ${value}″`));
      }
      assert.doesNotMatch(visible, /D\.H\.|T\.H\./);
      const hidden = render({ ...options, showDimensions: false });
      assert.doesNotMatch(hidden, /F\.W\.|F\.H\.|D\.W\.|S\.W\.|data-dimensions="VISIBLE"/);
      assert.equal(element(hidden, 'data-part', 'pivot-door-artwork'), element(visible, 'data-part', 'pivot-door-artwork'));
    }
  }
});

test('XO and OX map distinct glass effects and muntins to the correct fixed and moving panels with unique resources', () => {
  const instances = [];
  for (const configuration of ['XO', 'OX']) {
    const doorFirst = configuration === 'XO';
    const doorIndex = doorFirst ? 1 : 2;
    const fixedIndex = doorFirst ? 2 : 1;
    const options = { configuration, piece: { width: 80, height: 108, doorWidth: 45 },
      activeOptionName: 'Right Active', frameColorHex: '#704A35',
      muntin: { profile: 'flat', panels: [
        { panelIndex: fixedIndex, panelCode: 'O', panelLabel: doorFirst ? 'Right' : 'Left', horizontalLites: 2, verticalLites: 1 },
        { panelIndex: doorIndex, panelCode: 'X', panelLabel: doorFirst ? 'Left' : 'Right', horizontalLites: 3, verticalLites: 2 },
      ] } };
    const plain = render(options);
    const finishedOptions = { ...options, glassTintHex: '#789ABC', hasCoating: true, hasPrivacy: true };
    const finished = render(finishedOptions);
    assert.equal(layer(plain, 'FRAME'), layer(finished, 'FRAME'));
    assert.equal(layer(plain, 'PULL_HANDLE'), layer(finished, 'PULL_HANDLE'));
    assert.doesNotMatch(plain, /data-glass-effect=/);
    for (const effect of ['TINT', 'COATING', 'PRIVACY']) {
      assert.equal((finished.match(new RegExp(`data-glass-effect="${effect}"`, 'g')) || []).length, 2);
    }
    const fixedPane = element(finished, 'data-part', 'pivot-fixed-pane');
    const fixedClipId = fixedPane.match(/<clipPath id="([^"]+)"/)[1];
    const fixedClip = element(finished, 'id', fixedClipId);
    const fixedGlass = element(finished, 'data-part', 'pivot-fixed-glass');
    for (const attr of ['x', 'y', 'width', 'height']) {
      assert.equal(fixedClip.match(new RegExp(`\\s${attr}="([^"]+)"`))[1], fixedGlass.match(new RegExp(`\\s${attr}="([^"]+)"`))[1]);
    }
    const fixedEffects = element(fixedPane, 'clip-path', `url(#${fixedClipId})`);
    assert.match(fixedEffects, /data-layer="GLASS_APPEARANCE"/);
    const fixedGrid = element(fixedEffects, 'data-part', 'muntin-panel');
    assert.match(fixedGrid, new RegExp(`data-panel-index="${fixedIndex}"`));
    assert.match(fixedGrid, new RegExp(`data-glass-position="${doorFirst ? 'Right' : 'Left'}"`));
    assert.equal((fixedGrid.match(/data-part="muntin-bar"/g) || []).length, 1);
    const localDoor = element(finished, 'data-part', 'pivot-door-leaf-artwork');
    const doorGrid = element(localDoor, 'data-part', 'muntin-panel');
    assert.match(doorGrid, new RegExp(`data-panel-index="${doorIndex}"`));
    assert.equal((doorGrid.match(/data-part="muntin-bar"/g) || []).length, 3);
    const doorClipId = element(localDoor, 'data-part', 'muntin-layer').match(/clip-path="url\(#([^\)]+)\)"/)[1];
    assert.notEqual(doorClipId, fixedClipId);
    assert.equal(element(finished, 'id', doorClipId).match(/\sd="([^"]+)"/)[1],
      element(localDoor, 'data-part', 'pivot-glass').match(/\sd="([^"]+)"/)[1]);
    const doorEffects = element(localDoor, 'clip-path', `url(#${doorClipId})`);
    for (const effect of ['TINT', 'COATING', 'PRIVACY']) {
      assert.match(fixedEffects, new RegExp(`data-glass-effect="${effect}"`));
      assert.match(doorEffects, new RegExp(`data-glass-effect="${effect}"`));
    }
    instances.push(React.createElement(PieceDiagram, { ...props, ...finishedOptions, key: configuration }),
      React.createElement(PieceDiagram, { ...props, ...finishedOptions, variant: 'report', key: `${configuration}-report` }));
  }
  const multiple = renderToStaticMarkup(React.createElement(React.Fragment, null, ...instances));
  const allIds = [...multiple.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(allIds).size, allIds.length);
  const svgs = multiple.match(/<svg\b[\s\S]*?<\/svg>/g) || [];
  assert.equal(svgs.length, 4);
  for (const svg of svgs) {
    const ids = new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]));
    for (const match of svg.matchAll(/url\(#([^\)]+)\)/g)) assert.ok(ids.has(match[1]));
  }
});

test('OXO and compound transoms normalize configuration spacing and fractional measurements in editor and report', () => {
  for (const variant of ['editor', 'report']) {
    for (const item of compositeCases) {
      const hasTransom = item.doorHeight !== undefined;
      const configuration = ` ${item.configuration.toLowerCase().replaceAll('/', ' / ').replaceAll('-', ' - ')} `;
      const piece = { width: 150.375, height: 130.125, doorWidth: 60.125, ...(hasTransom ? { doorHeight: 100.125 } : {}) };
      const numeric = render({ variant, configuration: item.configuration, piece });
      const fractional = render({ variant, configuration, piece: { width: '150 3/8″', height: '130-1/8', doorWidth: '60 1/8', ...(hasTransom ? { doorHeight: '100 1/8' } : {}) } });
      assert.equal(fractional, numeric);
      assert.match(numeric, new RegExp(`data-diagram-renderer="${hasTransom ? 'PIVOT_DOOR_COMPOSITE_TRANSOM' : 'PIVOT_DOOR_SIDELITE'}"`));
      assert.equal((numeric.match(/<svg\b/g) || []).length, 1);
      assert.match(numeric, /F\.W\. 150\.375″/);
      assert.match(numeric, /F\.H\. 130\.125″/);
      if (hasTransom) {
        assert.match(numeric, /data-transom-height="30"/);
        assert.match(numeric, /D\.H\. 100\.125″/);
        assert.match(numeric, /T\.H\. 30″/);
      } else {
        assert.equal(render({ variant, configuration: item.configuration, piece: { ...piece, doorHeight: 1 } }), numeric);
        assert.doesNotMatch(numeric, /data-transom-height=|D\.H\.|T\.H\./);
      }
    }
  }
});

test('OXO and compound transoms remain neutral until every required opening and door measurement is valid', () => {
  for (const variant of ['editor', 'report']) {
    for (const item of compositeCases) {
      const { configuration, width, height, doorWidth, doorHeight } = item;
      const piece = { width, height, doorWidth, doorHeight };
      for (const field of ['width', 'height', 'doorWidth', ...(doorHeight === undefined ? [] : ['doorHeight'])]) {
        for (const value of [undefined, null, '', 0, -1, NaN, Infinity, 'invalid', '1/0']) {
          placeholder(render({ variant, configuration, piece: { ...piece, [field]: value } }));
        }
      }
      for (const invalidWidth of [width, width + 1]) {
        placeholder(render({ variant, configuration, piece: { ...piece, doorWidth: invalidWidth } }));
      }
      if (doorHeight !== undefined) {
        for (const invalidHeight of [height, height + 1]) {
          placeholder(render({ variant, configuration, piece: { ...piece, doorHeight: invalidHeight } }));
        }
      }
    }
  }
});

test('Composite assemblies keep one full frame, aligned shared dividers and the actual reference pane geometry', () => {
  for (const variant of ['editor', 'report']) {
    for (const item of compositeCases) {
      const { configuration, width, height, doorWidth, doorHeight, leftWidth, rightWidth } = item;
      const html = render({ variant, configuration, piece: { width, height, doorWidth, doorHeight } });
      const transomHeight = doorHeight === undefined ? 0 : height - doorHeight;
      assert.equal((html.match(/data-part="pivot-door-frame"/g) || []).length, 1);
      assert.equal((html.match(/data-layer="FRAME"/g) || []).length, 1);
      const frame = element(html, 'data-part', 'pivot-door-frame');
      assert.equal(Number(frame.match(/data-width="([^"]+)"/)[1]), width * 10);
      assert.equal(Number(frame.match(/data-height="([^"]+)"/)[1]), height * 10);
      assert.equal(Number(html.match(/data-left-sidelite-width="([^"]+)"/)?.[1] ?? 0), leftWidth);
      assert.equal(Number(html.match(/data-right-sidelite-width="([^"]+)"/)?.[1] ?? 0), rightWidth);
      const boundaries = [...(leftWidth ? [leftWidth] : []), ...(rightWidth ? [leftWidth + doorWidth] : [])];
      const verticalDividers = html.match(/<rect\b[^>]*data-part="pivot-sidelite-divider"[^>]*>/g) || [];
      assert.equal(verticalDividers.length, boundaries.length);
      const dividerRects = verticalDividers.map(rect => Object.fromEntries(['x', 'y', 'width', 'height']
        .map(attr => [attr, Number(rect.match(new RegExp(`\\s${attr}="([^"]+)"`))[1])]))).sort((a, b) => a.x - b.x);
      dividerRects.forEach((rect, index) => {
        const boundary = boundaries[index] * 10;
        assert.ok(rect.width > 0 && rect.height > 0);
        assert.ok(rect.x <= boundary + 1e-8 && rect.x + rect.width >= boundary - 1e-8);
        if (transomHeight) assert.ok(rect.y < transomHeight * 10 && rect.y + rect.height > transomHeight * 10);
      });
      assert.equal((html.match(/data-part="pivot-transom-divider"/g) || []).length, transomHeight ? 1 : 0);
      const slots = compositeSlots(item);
      const paneTags = html.match(/<g\b(?=[^>]*\sdata-row="(?:top|bottom)")(?=[^>]*\sdata-column="(?:left|center|right)")[^>]*>/g) || [];
      assert.equal(paneTags.length, item.panes);
      const doorLayout = pivotDoorLayout(doorWidth, doorHeight ?? height);
      for (const slot of slots) {
        const pane = compositePane(html, slot.row, slot.column);
        assert.match(pane.split('>')[0], new RegExp(`data-panel-code="${slot.code}"`));
        if (slot.code === 'X') continue;
        const glass = element(pane, 'data-part', 'pivot-fixed-glass');
        const rect = Object.fromEntries(['x', 'y', 'width', 'height'].map(attr => [attr, Number(glass.match(new RegExp(`\\s${attr}="([^"]+)"`))[1])]));
        assert.ok(rect.width > 0 && rect.height > 0);
        assert.ok(rect.x >= slot.offset * 10 - 1e-8 && rect.x + rect.width <= (slot.offset + slot.width) * 10 + 1e-8);
        if (slot.row === 'top') {
          assert.ok(rect.y > 0);
          assert.ok(Math.abs(rect.y + rect.height - transomHeight * 10) < 1e-8);
        } else {
          assert.ok(Math.abs(rect.y - (transomHeight * 10 + doorLayout.opening.y)) < 1e-8);
          assert.ok(Math.abs(rect.height - doorLayout.opening.height) < 1e-8);
        }
      }
      if (transomHeight) {
        const divider = element(html, 'data-part', 'pivot-transom-divider');
        const x = Number(divider.match(/\sx="([^"]+)"/)[1]);
        const dividerWidth = Number(divider.match(/\swidth="([^"]+)"/)[1]);
        assert.equal(Number(divider.match(/\sy="([^"]+)"/)[1]), transomHeight * 10);
        for (const slot of slots.filter(slot => slot.row === 'top')) {
          assert.ok(x < (slot.offset + slot.width / 2) * 10 && x + dividerWidth > (slot.offset + slot.width / 2) * 10);
        }
      }
      const door = element(html, 'data-part', 'pivot-door-leaf-artwork');
      assert.equal(Number(door.match(/data-door-offset="([^"]+)"/)[1]), leftWidth * 10);
      assert.equal(Number(door.match(/data-door-offset-y="([^"]+)"/)[1]), transomHeight * 10);
      const single = render({ piece: { width: doorWidth, height: doorHeight ?? height } });
      for (const part of ['pivot-door-leaf', 'pivot-glass']) {
        assert.equal(element(door, 'data-part', part).match(/\sd="([^"]+)"/)[1], element(single, 'data-part', part).match(/\sd="([^"]+)"/)[1]);
      }
    }
  }
});

test('Changing Active in OXO and compound transoms mirrors only the local door and keeps every fixed pane in place', () => {
  for (const variant of ['editor', 'report']) {
    for (const item of compositeCases) {
      const { configuration, width, height, doorWidth, doorHeight, leftWidth } = item;
      const options = { variant, configuration, piece: { width, height, doorWidth, doorHeight } };
      const left = render({ ...options, activeOptionName: 'Left Active' });
      const right = render({ ...options, activeOptionName: 'Right Active' });
      const transomUnits = doorHeight === undefined ? 0 : (height - doorHeight) * 10;
      const localDoor = element(right, 'data-part', 'pivot-door-leaf-artwork');
      assert.match(localDoor, new RegExp(`^<g[^>]*transform="translate\\(${leftWidth * 10} ${transomUnits}\\) translate\\(${doorWidth * 10} 0\\) scale\\(-1 1\\)"`));
      assert.equal(localDoor.replace(` translate(${doorWidth * 10} 0) scale(-1 1)`, ''), element(left, 'data-part', 'pivot-door-leaf-artwork'));
      assert.match(localDoor, /data-opening-direction="OUTWARD"/);
      assert.doesNotMatch(element(right, 'data-part', 'pivot-door-artwork').split('>')[0], /transform=/);
      assert.equal(layer(right, 'FRAME'), layer(left, 'FRAME'));
      assert.equal(element(right, 'data-dimensions', 'VISIBLE'), element(left, 'data-dimensions', 'VISIBLE'));
      for (const slot of compositeSlots(item).filter(slot => slot.code === 'O')) {
        assert.equal(compositePane(right, slot.row, slot.column), compositePane(left, slot.row, slot.column));
      }
      assert.equal(render(options), left);
    }
  }
});

test('Composite total and individual segment labels report actual dimensions and all hide without altering artwork', () => {
  for (const variant of ['editor', 'report']) {
    for (const item of compositeCases) {
      const { configuration, width, height, doorWidth, doorHeight, leftWidth, rightWidth } = item;
      const options = { variant, configuration, piece: { width, height, doorWidth, doorHeight } };
      const visible = render(options);
      const labels = [['F.W.', width], ['F.H.', height], ['D.W.', doorWidth]];
      if (leftWidth && rightWidth) labels.push(['L.S.W.', leftWidth], ['R.S.W.', rightWidth]);
      else labels.push(['S.W.', leftWidth || rightWidth]);
      if (doorHeight !== undefined) labels.push(['D.H.', doorHeight], ['T.H.', height - doorHeight]);
      for (const [label, value] of labels) assert.ok(visible.includes(`${label} ${value}″`), `Missing ${label} ${value}`);
      const hidden = render({ ...options, showDimensions: false });
      assert.doesNotMatch(hidden, /F\.W\.|F\.H\.|D\.W\.|S\.W\.|D\.H\.|T\.H\.|data-dimensions="VISIBLE"/);
      assert.equal(element(hidden, 'data-part', 'pivot-door-artwork'), element(visible, 'data-part', 'pivot-door-artwork'));
    }
  }
});

test('Composite muntins follow explicit pane positions rather than manual catalog indices and every glass effect stays clipped', () => {
  const instances = [];
  for (const item of compositeCases) {
    const { configuration, width, height, doorWidth, doorHeight } = item;
    const muntin = compositeMuntin(item);
    const options = { configuration, piece: { width, height, doorWidth, doorHeight },
      activeOptionName: 'Right Active', frameColorHex: '#704A35', muntin };
    const plain = render(options);
    const finishedOptions = { ...options, glassTintHex: '#789ABC', hasCoating: true, hasPrivacy: true };
    const finished = render(finishedOptions);
    assert.equal(layer(plain, 'FRAME'), layer(finished, 'FRAME'));
    assert.equal(layer(plain, 'PULL_HANDLE'), layer(finished, 'PULL_HANDLE'));
    assert.doesNotMatch(plain, /data-glass-effect=/);
    assert.equal((finished.match(/data-part="muntin-panel"/g) || []).length, item.panes);
    for (const effect of ['TINT', 'COATING', 'PRIVACY']) {
      assert.equal((finished.match(new RegExp(`data-glass-effect="${effect}"`, 'g')) || []).length, item.panes);
    }
    const clips = new Set();
    compositeSlots(item).forEach((slot, index) => {
      const pane = compositePane(finished, slot.row, slot.column);
      const grid = element(pane, 'data-part', 'muntin-panel');
      const manualIndex = item.panes - index;
      assert.match(grid, new RegExp(`data-panel-index="${manualIndex}"`));
      assert.equal((grid.match(/data-part="muntin-bar"/g) || []).length, manualIndex);
      const clipId = pane.match(/<g\b[^>]*clip-path="url\(#([^\)]+)\)"/)[1];
      assert.ok(!clips.has(clipId), 'Each pane has its own visible-glass clipping resource');
      clips.add(clipId);
      const clipped = element(pane, 'clip-path', `url(#${clipId})`);
      for (const effect of ['TINT', 'COATING', 'PRIVACY']) assert.match(clipped, new RegExp(`data-glass-effect="${effect}"`));
      const clip = element(finished, 'id', clipId);
      const glass = element(pane, 'data-part', slot.code === 'X' ? 'pivot-glass' : 'pivot-fixed-glass');
      if (slot.code === 'X') {
        assert.equal(clip.match(/\sd="([^"]+)"/)[1], glass.match(/\sd="([^"]+)"/)[1]);
      } else {
        for (const attr of ['x', 'y', 'width', 'height']) {
          assert.equal(clip.match(new RegExp(`\\s${attr}="([^"]+)"`))[1], glass.match(new RegExp(`\\s${attr}="([^"]+)"`))[1]);
        }
      }
    });
    instances.push(React.createElement(PieceDiagram, { ...props, ...finishedOptions, key: configuration }),
      React.createElement(PieceDiagram, { ...props, ...finishedOptions, variant: 'report', key: `${configuration}-report` }));
  }
  const multiple = renderToStaticMarkup(React.createElement(React.Fragment, null, ...instances));
  const allIds = [...multiple.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(allIds).size, allIds.length);
  const svgs = multiple.match(/<svg\b[\s\S]*?<\/svg>/g) || [];
  assert.equal(svgs.length, compositeCases.length * 2);
  for (const svg of svgs) {
    const ids = new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]));
    for (const match of svg.matchAll(/url\(#([^\)]+)\)/g)) assert.ok(ids.has(match[1]));
    for (const match of svg.matchAll(/aria-labelledby="([^"]+)"/g)) {
      for (const id of match[1].split(/\s+/)) assert.ok(ids.has(id));
    }
  }
});

test('Explicit composite positions support custom catalog codes and the unique X door can resolve by its role', () => {
  for (const item of compositeCases) {
    const { configuration, width, height, doorWidth, doorHeight } = item;
    const source = compositeMuntin(item);
    const selections = [
      { ...source, panels: source.panels.map(panel => ({ ...panel, panelCode: `CUSTOM${panel.panelIndex}` })) },
      { ...source, panels: source.panels.map(panel => panel.panelCode === 'X' ? { ...panel, panelLabel: 'Operable door' } : panel) },
    ];
    for (const muntin of selections) {
      const html = render({ configuration, piece: { width, height, doorWidth, doorHeight }, muntin });
      assert.equal((html.match(/data-part="muntin-panel"/g) || []).length, item.panes);
      compositeSlots(item).forEach((slot, index) => {
        const grid = element(compositePane(html, slot.row, slot.column), 'data-part', 'muntin-panel');
        assert.match(grid, new RegExp(`data-panel-index="${item.panes - index}"`));
        assert.equal((grid.match(/data-part="muntin-bar"/g) || []).length, item.panes - index);
      });
    }
  }
});

test('Compound transoms reject ambiguous or conflicting muntin identities without losing the product drawing', () => {
  for (const item of compositeCases.filter(item => item.doorHeight !== undefined)) {
    const { configuration, width, height, doorWidth, doorHeight } = item;
    const source = compositeMuntin(item);
    const fixed = source.panels.filter(panel => panel.panelCode === 'O');
    const invalidSelections = [
      source.panels.map(panel => ({ ...panel, panelLabel: panel.panelCode === 'X' ? 'Door' : 'Fixed' })),
      source.panels.map(panel => panel.panelIndex === fixed[0].panelIndex ? { ...panel, panelLabel: 'Top Left Right' } : panel),
      source.panels.map(panel => panel.panelIndex === fixed[0].panelIndex ? { ...panel, panelCode: 'X' } : panel),
      source.panels.map(panel => panel.panelCode === 'X' ? { ...panel, panelCode: 'O' } : panel),
      source.panels.map(panel => panel.panelIndex === fixed[1].panelIndex ? { ...panel, panelLabel: fixed[0].panelLabel } : panel),
      source.panels.slice(1),
      source.panels.map(panel => ({ ...panel, panelCode: `CUSTOM${panel.panelIndex}`, panelLabel: `Glass ${panel.panelIndex}` })),
    ];
    for (const panels of invalidSelections) {
      const html = render({ configuration, piece: { width, height, doorWidth, doorHeight }, muntin: { ...source, panels } });
      assert.match(html, /data-diagram-renderer="PIVOT_DOOR_COMPOSITE_TRANSOM"/);
      assert.match(html, /data-part="pivot-door-leaf"/);
      assert.equal((html.match(/data-part="pivot-fixed-glass"/g) || []).length, item.panes - 1);
      assert.doesNotMatch(html, /data-part="muntin-panel"|data-part="muntin-bar"/);
    }
  }
});

test('Dimensions can be hidden while preserving the product drawing', () => {
  const visible = render();
  const hidden = render({ showDimensions: false });
  assert.match(hidden, /<svg\b/);
  assert.doesNotMatch(hidden, /F\.W\.|F\.H\.|data-dimensions="VISIBLE"/);
  for (const name of ['FRAME', 'OPEN_LEAF', 'PULL_HANDLE', 'CONFIGURATION_MARKER']) {
    assert.equal(layer(hidden, name), layer(visible, name));
  }
});

test('Changing width and height changes the drawing proportions and displayed measurements', () => {
  const narrow = render({ piece: { width: 30, height: 120 } });
  const wide = render({ piece: { width: 60, height: 80 } });
  assert.notEqual(layer(narrow, 'FRAME'), layer(wide, 'FRAME'));
  assert.notEqual(layer(narrow, 'OPEN_LEAF'), layer(wide, 'OPEN_LEAF'));
  assert.match(narrow, /F\.W\. 30″/);
  assert.match(narrow, /F\.H\. 120″/);
  assert.match(wide, /F\.W\. 60″/);
  assert.match(wide, /F\.H\. 80″/);
});

test('Approved frame profiles and handle width remain physical sizes across priced dimensions', () => {
  const reference = pivotDoorLayout(60, 110);
  for (const [width, height] of [[22.125, 72.125], [30, 80], [45, 100], [60, 110]]) {
    const layout = pivotDoorLayout(width, height);
    assert.ok(layout);
    assert.equal(layout.profileScale, 1, 'Priced sizes do not compress the frame profiles');
    assert.equal(layout.opening.x, reference.opening.x);
    assert.equal(layout.opening.y, reference.opening.y);
    assert.ok(Math.abs((layout.frame.width - layout.opening.width)
      - (reference.frame.width - reference.opening.width)) < 1e-10);
    assert.ok(Math.abs((layout.frame.height - layout.opening.height)
      - (reference.frame.height - reference.opening.height)) < 1e-10);
    assert.equal(layout.handle.width, reference.handle.width);
    assert.ok(layout.glass.tr.x > layout.glass.tl.x && layout.glass.br.x > layout.glass.bl.x);
    assert.ok(layout.glass.bl.y > layout.glass.tl.y && layout.glass.br.y > layout.glass.tr.y);
  }
});

test('Frame finish changes the frame without recoloring glass or hardware', () => {
  const white = render({ frameColorHex: '#FFFFFF' });
  const bronze = render({ frameColorHex: '#704A35' });
  assert.match(bronze, /data-frame-color="#704A35"/);
  assert.notEqual(referencedAppearance(bronze, 'FRAME'), referencedAppearance(white, 'FRAME'));
  assert.equal(referencedAppearance(bronze, 'GLASS'), referencedAppearance(white, 'GLASS'));
  assert.equal(referencedAppearance(bronze, 'PULL_HANDLE'), referencedAppearance(white, 'PULL_HANDLE'));
});

test('Tint, coating and privacy affect the clipped glass without changing frame or hardware', () => {
  const plain = render({ frameColorHex: '#704A35' });
  const finished = render({ frameColorHex: '#704A35', glassTintHex: '#789ABC', hasCoating: true, hasPrivacy: true });
  const effects = layer(finished, 'GLASS_APPEARANCE');
  for (const effect of ['TINT', 'COATING', 'PRIVACY']) assert.match(effects, new RegExp(`data-glass-effect="${effect}"`));
  assert.doesNotMatch(plain, /data-glass-effect=/);
  assert.match(finished, /clip-path="url\(#[^\)]+\)"/);
  for (const name of ['FRAME', 'PULL_HANDLE', 'CONFIGURATION_MARKER']) {
    assert.equal(referencedAppearance(finished, name), referencedAppearance(plain, name));
  }
});

test('Repeated instances have unique SVG IDs and valid local references', () => {
  const html = renderToStaticMarkup(React.createElement(React.Fragment, null,
    React.createElement(PieceDiagram, props), React.createElement(PieceDiagram, { ...props, variant: 'report' })));
  const svgs = html.match(/<svg\b[\s\S]*?<\/svg>/g) || [];
  assert.equal(svgs.length, 2);
  const allIds = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.ok(allIds.length > 0);
  assert.equal(new Set(allIds).size, allIds.length);
  for (const svg of svgs) {
    const ids = new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]));
    for (const match of svg.matchAll(/url\(#([^\)]+)\)/g)) assert.ok(ids.has(match[1]), `Unresolved SVG reference ${match[1]}`);
    for (const match of svg.matchAll(/aria-labelledby="([^"]+)"/g)) {
      for (const id of match[1].split(/\s+/)) assert.ok(ids.has(id), `Unresolved accessible label ${id}`);
    }
  }
});

test('The runtime uses the outward vector drawing without bitmap or source-document annotations', () => {
  const html = render();
  assert.match(html, /data-opening-direction="OUTWARD"/);
  const face = element(html, 'data-part', 'pivot-door-leaf');
  const points = face.match(/\sd="([^"]+)"/)[1].match(/-?\d+(?:\.\d+)?/g).map(Number);
  const frame = element(html, 'data-part', 'pivot-door-frame');
  const frameHeight = Number(frame.match(/data-height="([^"]+)"/)[1]);
  assert.equal(points.length, 8, 'The face has four exterior corners');
  assert.ok(points[1] > 0 && points[7] < frameHeight, 'The short left edge recedes inside the opening');
  assert.ok(points[3] < 0 && points[5] > frameHeight, 'The main right edge projects in front of the frame');
  assert.match(html, /data-part="pivot-glass"/);
  assert.doesNotMatch(html, /<img\b|<image\b|<foreignObject\b|<metadata\b|data:image|C129|REVIEW\.png|referenceDimensions|data-opening-direction="INWARD"/i);
  assert.equal((html.match(/data-layer="CONFIGURATION_MARKER"/g) || []).length, 1);
});

console.log(`${passed} Pivot Door diagram tests passed.`);
