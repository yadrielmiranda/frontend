/* Real SVG rendering, including raster checks. No browser, database or network. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../src');
const cache = new Map();
function load(filename) {
  filename = path.resolve(root, filename);
  assert.ok(filename.startsWith(root + path.sep));
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} }; cache.set(filename, module);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  new Function('require', 'module', 'exports', code)(id => {
    if (id === 'react' || id === 'react/jsx-runtime') return require(id);
    const target = id.startsWith('@/') ? path.resolve(root, id.slice(2)) : id.startsWith('.') ? path.resolve(path.dirname(filename), id) : null;
    assert.ok(target, id);
    const resolved = ['.ts', '.tsx'].map(ext => target + ext).find(fs.existsSync);
    assert.ok(resolved, id);
    return load(resolved);
  }, module, module.exports);
  return module.exports;
}
const { GarageDoorDiagram } = load('components/piece-diagram/renderers/garage-door/garage-door-diagram.tsx');
const render = props => renderToStaticMarkup(React.createElement(GarageDoorDiagram, props));
const template = { version: 1, columns: [.2, .35, .45], rows: [.2, .3, .5], cells: [['glass', 'slat', 'glass'], ['slat', 'slat', 'glass'], ['slat', 'glass', 'slat']] };
const props = { width: 120, height: 100, template, designName: 'Custom <layout> & finish', designColorHex: '#965B2E', frameColorHex: '#EEEEEE' };
let passed = 0;
function test(name, run) { run(); passed++; console.log(`PASS ${name}`); }
test('Arbitrary database geometry renders with no design-name lookup', () => {
  const svg = render(props);
  assert.match(svg, /Custom &lt;layout&gt; &amp; finish/);
  assert.match(svg, /data-garage-mode="DESIGN"/);
  assert.match(svg, /data-section-count="3"/);
  assert.equal((svg.match(/data-material="glass"/g) || []).length, 4);
  assert.equal((svg.match(/data-material="slat"/g) || []).length, 5);
  const faces = [...svg.matchAll(/<rect[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"[^>]*data-panel-face="true"/g)];
  assert.equal(faces.length, 9);
  assert.equal(Number(faces[0][1]) / Number(faces[2][1]), .2 / .45);
  assert.ok(Math.abs(Number(faces[0][2]) / Number(faces[6][2]) - .2 / .5) < 1e-10);
});
test('Selected design color controls both frame and grooved slats', () => {
  const svg = render(props);
  assert.match(svg, /data-frame-color="#965B2E"/);
  assert.match(svg, /data-slat-color="#965B2E"/);
  assert.match(svg, /<pattern[^>]*-slats/);
  assert.match(svg, /data-layer="FRAME_GASKET"/);
  assert.doesNotMatch(svg, /#EEEEEE/);
  const changed = render({ ...props, designColorHex: '#18222C' });
  assert.match(changed, /data-frame-color="#18222C"/);
  assert.notEqual(changed, svg);
});
test('GF has five glass sections, uses normal frame finish, and needs no catalog design', () => {
  const svg = render({ width: 90, height: 90, frameColorHex: '#704A35' });
  assert.match(svg, /data-garage-mode="GF"/);
  assert.match(svg, /data-frame-color="#704A35"/);
  assert.equal((svg.match(/data-material="glass"/g) || []).length, 5);
  assert.doesNotMatch(svg, /data-material="slat"|data-slat-color=/);
});
test('System section height produces 90=4, 100=5, 120=5 and supports another configured maximum', () => {
  for (const [height, expected] of [[90, 4], [100, 5], [120, 5]]) {
    const svg = render({ width: 120, height, maxSectionHeightIn: 24 });
    assert.match(svg, new RegExp(`data-section-count="${expected}"`));
    assert.equal((svg.match(/data-material="glass"/g) || []).length, expected);
  }
  assert.match(render({ width: 120, height: 100, maxSectionHeightIn: 18 }), /data-section-count="6"/);
  for (const value of [0, -24, Infinity, NaN, 0.001]) assert.equal(render({ ...props, maxSectionHeightIn: value }), '');
});
test('Top glass stays one physical section while repeated slats adapt to height', () => {
  const topGlass = { version: 1, columns: [1], rows: [.25, .25, .25, .25], cells: [['glass'], ['slat'], ['slat'], ['slat']] };
  for (const [height, count] of [[90, 4], [100, 5], [120, 5], [192, 8]]) {
    const svg = render({ ...props, height, template: topGlass, designName: 'New custom top glass', maxSectionHeightIn: 24 });
    assert.match(svg, new RegExp(`data-section-count="${count}"`));
    assert.equal((svg.match(/data-material="glass"/g) || []).length, 1);
    assert.equal((svg.match(/data-material="slat"/g) || []).length, count - 1);
  }
});
test('Custom row arrangements adapt without mutating saved geometry or thumbnails', () => {
  const before = JSON.stringify(template);
  const svg = render({ ...props, height: 120, maxSectionHeightIn: 24 });
  assert.match(svg, /data-section-count="5"/);
  assert.equal((svg.match(/data-panel-face="true"/g) || []).length, 15);
  assert.equal(JSON.stringify(template), before);
  const short = render({ ...props, height: 24, maxSectionHeightIn: 24 });
  assert.match(short, /data-section-count="1"/);
  assert.equal((short.match(/data-panel-face="true"/g) || []).length, 3);
});
test('Tint, coating and privacy affect glass only', () => {
  const svg = render({ ...props, glassTintHex: '#789ABC', hasCoating: true, hasPrivacy: true });
  for (const effect of ['TINT', 'COATING', 'PRIVACY']) assert.equal((svg.match(new RegExp(`data-glass-effect="${effect}"`, 'g')) || []).length, 4);
  const faces = value => [...value.matchAll(/<rect[^>]*data-panel-face="true"/g)].map(match => match[0]);
  assert.deepEqual(faces(svg), faces(render(props)), 'Glass effects do not recolor the frame or slat faces');
  assert.doesNotMatch(render(props), /data-glass-effect=/);
  assert.doesNotMatch(render({ ...props, glassTintHex: '#F7FBFF' }), /data-glass-effect="TINT"/);
});
test('All-slat designs have no glass overlays even when glass options are selected', () => {
  const solid = { version: 1, columns: [1], rows: [1], cells: [['slat']] };
  const svg = render({ ...props, template: solid, hasCoating: true, hasPrivacy: true, glassTintHex: '#333333' });
  assert.doesNotMatch(svg, /data-glass-effect=/);
});
test('Width and height change proportions; measurement labels are optional', () => {
  const narrow = render({ ...props, width: 60, height: 120 });
  const wide = render({ ...props, width: 180, height: 90 });
  assert.match(narrow, /viewBox="-20 -78 635 1098"/);
  assert.match(wide, /viewBox="-20 -78 1135 598"/);
  assert.match(wide, /F.W. 180″/);
  assert.match(wide, /F.H. 90″/);
  assert.doesNotMatch(render({ ...props, showDimensions: false }), /data-dimensions=|F.W.|F.H./);
});
test('Invalid dimensions do not render misleading geometry', () => {
  for (const value of [0, -1, NaN, Infinity]) assert.equal(render({ ...props, width: value }), '');
});
test('Malformed catalog data and CSS colors never become executable SVG', () => {
  const svg = render({ ...props, template: { ...template, markup: '<script>attack()</script>' }, frameColorHex: 'url(https://invalid)', designColorHex: 'red' });
  assert.match(svg, /data-garage-mode="GF"/);
  assert.match(svg, /data-frame-color="#FFFFFF"/);
  assert.doesNotMatch(svg, /<script|https:|<image|<foreignObject|onload=/i);
});
test('Multiple SVGs in one report have independent gradient IDs', () => {
  const html = renderToStaticMarkup(React.createElement(React.Fragment, null, React.createElement(GarageDoorDiagram, props), React.createElement(GarageDoorDiagram, { ...props, designColorHex: '#000000' })));
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});

(async () => {
  const entries = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/garage-design-templates.json'), 'utf8'));
  const scenarios = [
    { title: 'GF · WHITE / CLEAR', width: 120, height: 100, frameColorHex: '#FFFFFF' },
    { title: 'GF · BRONZE / TINT', width: 120, height: 100, frameColorHex: '#4A403B', glassTintHex: '#40505B' },
    { title: 'SF · OAK', ...props, ...entries.find(entry => entry.name === 'SF'), designColorHex: '#965B2E' },
    { title: 'SRL36 · OAK / CLEAR', ...props, ...entries.find(entry => entry.name === 'SRL36') },
    { title: 'GT · PINE / PRIVACY', ...props, ...entries.find(entry => entry.name === 'GT'), designColorHex: '#E1CF9C', hasPrivacy: true },
    { title: 'GR36 · CHERRY / COATING', ...props, ...entries.find(entry => entry.name === 'GR36'), designColorHex: '#793E2B', glassTintHex: '#646F7C', hasCoating: true },
    { title: 'SF · BLACK', ...props, ...entries.find(entry => entry.name === 'SF'), designColorHex: '#0C0C0C' },
    { title: 'SF · PINE', ...props, ...entries.find(entry => entry.name === 'SF'), designColorHex: '#E1CF9C' },
    { title: 'GL36 · WIDE 180 × 90', ...props, ...entries.find(entry => entry.name === 'GL36'), width: 180, height: 90, designColorHex: '#965B2E', glassTintHex: '#40505B' },
  ];
  const composites = [];
  for (const [index, scenario] of scenarios.entries()) {
    const svg = render({ ...scenario, designName: scenario.name, maxSectionHeightIn: 24, showDimensions: true }).replace('width="100%" height="100%"', 'width="560" height="470"');
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    const metadata = await sharp(png).metadata();
    assert.equal(metadata.width, 560); assert.equal(metadata.height, 470);
    composites.push({ input: png, left: (index % 3) * 600 + 20, top: Math.floor(index / 3) * 520 + 40 });
    const label = `<svg width="580" height="35"><text x="10" y="25" font-family="Arial" font-size="16" fill="#263244">${scenario.title}</text></svg>`;
    composites.push({ input: Buffer.from(label), left: (index % 3) * 600 + 10, top: Math.floor(index / 3) * 520 });
  }
  const output = path.resolve(__dirname, '../../outputs/garage-door-detailed-preview.png');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await sharp({ create: { width: 1800, height: 1560, channels: 4, background: '#F8FAFC' } }).composite(composites).png().toFile(output);
  console.log(`PASS nine SVG previews rasterize without external assets: ${output}`);
  console.log(`${passed + 1} garage door diagram tests passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
