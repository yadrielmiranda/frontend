/* Garage design selection, persistence and report regressions; no network or database. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '../src');
const cache = new Map();
global.fetch = () => { throw new Error('Network forbidden'); };
const compile = (source, file = 'test.tsx') => ts.transpileModule(source, { fileName: file, compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} }).outputText;
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  if (/\.(png|jpe?g|webp)$/i.test(file)) return { src: file };
  const module = { exports: {} }; cache.set(file, module);
  new Function('require', 'module', 'exports', compile(fs.readFileSync(file, 'utf8'), file))((id) => {
    if (['react', 'react/jsx-runtime'].includes(id)) return require(id);
    if (id === '@/components/ui/checkbox') return { Checkbox: ({ checked, onCheckedChange, ...props }) => React.createElement('input', { ...props, type: 'checkbox', checked, readOnly: true }) };
    if (id === '@/components/ui/button') return { Button: ({ children, variant, size, ...props }) => React.createElement('button', props, children) };
    const target = id.startsWith('@/') ? path.resolve(root, id.slice(2)) : id.startsWith('.') ? path.resolve(path.dirname(file), id) : null;
    assert.ok(target, `Unexpected dependency: ${id}`);
    const resolved = (path.extname(target) ? [target] : ['.ts', '.tsx', '.json'].map(ext => target + ext)).find(fs.existsSync);
    assert.ok(resolved, `Missing dependency: ${id}`);
    return load(path.relative(root, resolved));
  }, module, module.exports);
  return module.exports;
}
const selection = load('components/estimates/piece-garage-design.ts');
const { GarageDesignFields } = load('components/estimates/garage-design-fields.tsx');
const { revisionPieceForm, revisionPieceInput } = load('components/estimates/material-revisions/piece-values.ts');
const { buildPieceReportDetails } = load('components/estimates/estimate-details/parts/piece-decription.tsx');
const { buildGarageDesignSvg } = load('lib/garage-design-templates.ts');
const slatTemplate = { version: 1, columns: [1], rows: [0.25, 0.25, 0.25, 0.25], cells: [['slat'], ['slat'], ['slat'], ['slat']] };
const centerTemplate = { version: 1, columns: [0.25, 0.5, 0.25], rows: [0.5, 0.5], cells: [['slat', 'glass', 'slat'], ['slat', 'glass', 'slat']] };
const design = { id: 21, name: 'Horizontal', imageUrl: '/design.jpg', template: slatTemplate, isActive: true, sortOrder: 0 };
const walnut = { id: 31, name: 'Walnut', hexCode: '#614126', isActive: true, sortOrder: 0 };
const white = { id: 32, name: 'White', hexCode: '#ffffff', isActive: true, sortOrder: 1 };
const option = (color = walnut, extra = {}) => ({ idSystem: 3, idDesign: 21, idDesignColor: color.id, sortOrder: 0, design, color, ...extra });
const system = { id: 3, allowDesign: true, defaultDesignId: 21, defaultDesignColorId: 31, designOptions: [option(), option(white)] };
const snapshot = { version: 1, systemId: 3, design: { id: 21, name: 'Original horizontal', imageUrl: '/old.jpg' },
  color: { id: 31, name: 'Original walnut', hexCode: '#614126' } };
const piece = { id: 7, idProd: 1, idBrand: 2, idSyst: 3, idConf: 4, idFC: 5, mark: 'G1', qty: 1,
  idDesign: 21, idDesignColor: 31, designSnapshot: snapshot, prod: { name: 'Garage Door', diagramFamily: 'GARAGE_DOOR' },
  syst: system, fColor: { color: 'Bronze' }, conf: { conf: 'Single' }, width: '120', height: '84' };
const validate = (overrides = {}) => selection.garageDesignSelectionError({ enabled: true, piece, initial: {}, diagramFamily: 'GARAGE_DOOR', system, ...overrides });

assert.deepEqual(selection.defaultGarageDesignPair(system), { idDesign: 21, idDesignColor: 31 });
assert.deepEqual(selection.defaultGarageDesignPair({ ...system, allowDesign: false }), { idDesign: null, idDesignColor: null });
assert.deepEqual(selection.defaultGarageDesignPair({ ...system, designOptions: [option(walnut, { color: { ...walnut, isActive: false } })] }), { idDesign: null, idDesignColor: null });
assert.equal(validate(), null);
assert.match(validate({ piece: { ...piece, idDesignColor: 99 } }), /no longer available/);
assert.match(validate({ piece: { ...piece, idDesignColor: null } }), /both/);
assert.match(validate({ diagramFamily: 'SINGLE_HUNG' }), /not available/);
assert.match(validate({ system: { ...system, allowDesign: false } }), /not available/);
assert.match(validate({ system: { ...system, designOptions: [option(walnut, { idSystem: 44 })] } }), /no longer available/);
assert.match(validate({ system: { ...system, designOptions: [option(walnut, { design: { ...design, isActive: false } })] } }), /no longer available/);
assert.equal(validate({ enabled: false, piece: { ...piece, idDesign: null, idDesignColor: null }, system: null }), null);

// Existing pieces keep their exact archived pair. Cloning cannot inherit permission.
assert.equal(validate({ initial: piece, system: { ...system, allowDesign: false } }), null);
assert.match(validate({ initial: { ...piece, id: undefined }, system: { ...system, allowDesign: false } }), /not available/);
assert.match(validate({ initial: piece, piece: { ...piece, idSyst: 44 }, system: { ...system, allowDesign: false } }), /not available/);
assert.match(validate({ initial: piece, piece: { ...piece, idDesignColor: 32 }, system: { ...system, allowDesign: false } }), /not available/);
assert.equal(validate({ initial: { ...piece, id: undefined, preserveExistingDesign: true }, system: null }), null);

const centerDesign = { ...design, id: 22, name: 'Center glass', imageUrl: null, template: centerTemplate };
const whiteDesign = { ...centerDesign, id: 23, name: 'White exclusive' };
const flowSystem = { ...system, designOptions: [...system.designOptions,
  option(walnut, { idDesign: 22, design: centerDesign }), option(white, { idDesign: 23, design: whiteDesign })] };
const available = selection.availableGarageDesignOptions(flowSystem);
assert.deepEqual(selection.garageDesignPairForColor(available, 21, 32), { idDesign: 21, idDesignColor: 32 }, 'Changing color retains a compatible design');
assert.deepEqual(selection.garageDesignPairForColor(available, 22, 32), { idDesign: null, idDesignColor: 32 }, 'Changing color clears an incompatible design');
assert.deepEqual(selection.garageDesignPairForColor(available, null, 31), { idDesign: null, idDesignColor: 31 }, 'A color can be selected before a design');
assert.deepEqual(selection.garageDesignPairForDesign(available, 21, 31), { idDesign: 21, idDesignColor: 31 }, 'Changing design retains a compatible color');
assert.deepEqual(selection.garageDesignPairForDesign(available, 23, 31), { idDesign: 23, idDesignColor: null }, 'Changing design clears an incompatible color');
assert.deepEqual(selection.garageDesignPairForDesign(available, 22, null), { idDesign: 22, idDesignColor: null }, 'Selecting a design without a color does not invent a color');

const names = selection.garageDesignDescription(piece, system);
assert.equal(names, 'Design: Original horizontal | Design Color: Original walnut');
assert.doesNotMatch(selection.garageDesignDescription({ ...piece, idDesignColor: 32 }, system), /Original walnut/);
assert.equal(selection.garageDesignDescription({ ...piece, idDesign: null, idDesignColor: null }), null);
const report = buildPieceReportDetails(piece).detailLines.join('\n');
assert.match(report, /Frame Color: Original walnut/); assert.match(report, /Design: Original horizontal \|/);
assert.match(report, /Design Color: Original walnut/);

const fields = { index: 0, allowed: true, enabled: true, locked: false, retained: false,
  idDesign: 21, idDesignColor: 31, options: system.designOptions, selected: selection.pieceGarageDesign(piece, system),
  error: null, onToggle() {}, onDesignChange() {}, onColorChange() {} };
let html = renderToStaticMarkup(React.createElement(GarageDesignFields, fields));
assert.match(html, /Add design/); assert.match(html, /Design Color/); assert.match(html, /Walnut/); assert.match(html, /White/);
assert.match(html, /src="\/old.jpg"/); assert.match(html, /Original walnut color swatch/);
assert.match(html, /background-color:#614126/); assert.equal((html.match(/<img /g) ?? []).length, 1);
html = renderToStaticMarkup(React.createElement(GarageDesignFields, { ...fields, enabled: false, selected: null }));
assert.doesNotMatch(html, /<select/); assert.doesNotMatch(html, /checked=""/); assert.doesNotMatch(html, /<img/);
html = renderToStaticMarkup(React.createElement(GarageDesignFields, { ...fields, allowed: false, retained: true, options: [] }));
assert.match(html, /saved design and color are retained/); assert.match(html, /Original horizontal/); assert.doesNotMatch(html, /<select/);
html = renderToStaticMarkup(React.createElement(GarageDesignFields, { ...fields, options: [option(walnut, { idDesign: 22, design: { ...design, id: 22 } })], error: 'Choose an available color' }));
assert.match(html, /<option value="31" selected="">Walnut/); assert.match(html, /role="alert"/);
assert.match(html, /saved \/ unavailable/, 'Unavailable selected designs remain visible separately from selectable cards');
html = renderToStaticMarkup(React.createElement(GarageDesignFields, { ...fields,
  selected: { design: { ...snapshot.design, imageUrl: 'javascript:alert(1)' }, color: snapshot.color } }));
assert.doesNotMatch(html, /<img/);

function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!React.isValidElement(node)) return [];
  return [node, ...elements(node.props.children)];
}
function designCards(tree) { return elements(tree).filter(item => item.type === 'button' && item.props['aria-label']?.startsWith('Select design ')); }
function svgImages(node) {
  const markup = renderToStaticMarkup(node);
  return [...markup.matchAll(/src="(data:image\/svg\+xml[^\"]+)"/g)].map(match => decodeURIComponent(match[1].slice(match[1].indexOf(',') + 1)));
}
function glassParts(svg) {
  return [svg.match(/<linearGradient id="glass"[\s\S]*?<\/linearGradient>/)?.[0], ...svg.matchAll(/<rect\b[^>]*data-material="glass"[^>]*\/>/g)].map(item => Array.isArray(item) ? item[0] : item);
}
let flowPiece = { idSyst: 3, idDesign: null, idDesignColor: null, designSnapshot: null };
const flowProps = () => ({ ...fields, idDesign: flowPiece.idDesign, idDesignColor: flowPiece.idDesignColor,
  options: available, selected: selection.pieceGarageDesign(flowPiece, flowSystem),
  onColorChange(id) { flowPiece = { ...flowPiece, ...selection.garageDesignPairForColor(available, flowPiece.idDesign, id), designSnapshot: null }; },
  onDesignChange(id) { flowPiece = { ...flowPiece, ...selection.garageDesignPairForDesign(available, id, flowPiece.idDesignColor), designSnapshot: null }; },
});
let flowTree = GarageDesignFields(flowProps());
const colorSelect = () => elements(flowTree).find(item => item.type === 'select');
const chooseColor = id => { colorSelect().props.onChange({ target: { value: String(id) } }); flowTree = GarageDesignFields(flowProps()); };
const chooseDesign = name => { const card = designCards(flowTree).find(item => item.props['aria-label'] === `Select design ${name}`); assert.ok(card, `Selectable design ${name}`); card.props.onClick(); flowTree = GarageDesignFields(flowProps()); };
assert.equal(designCards(flowTree).length, 3, 'Before choosing a color, every available design is shown once');
assert.deepEqual(elements(colorSelect()).filter(item => item.type === 'option').map(item => item.props.value), ['', 31, 32], 'The color control includes all colors offered by this series');
chooseColor(31);
assert.equal(flowPiece.idDesign, null);
assert.deepEqual(designCards(flowTree).map(item => item.props['aria-label']), ['Select design Center glass', 'Select design Horizontal'], 'Color-first selection filters the design cards');
const walnutSvgs = designCards(flowTree).flatMap(svgImages);
assert.equal(walnutSvgs.length, 2);
assert.ok(walnutSvgs.every(svg => svg.includes('data-slat-color="#614126"')), 'Every compatible thumbnail uses the selected color before a design is selected');
assert.ok(elements(flowTree).some(item => item.props.style?.backgroundColor === '#614126'), 'Color-first selection shows its actual swatch');
chooseDesign('Center glass');
assert.deepEqual({ idDesign: flowPiece.idDesign, idDesignColor: flowPiece.idDesignColor }, { idDesign: 22, idDesignColor: 31 });
assert.equal(designCards(flowTree).find(item => item.props['aria-label'] === 'Select design Center glass').props['aria-pressed'], true);
chooseColor(32);
assert.equal(flowPiece.idDesign, null, 'Selecting an incompatible color clears the old design');
assert.deepEqual(designCards(flowTree).map(item => item.props['aria-label']), ['Select design Horizontal', 'Select design White exclusive']);
assert.ok(designCards(flowTree).flatMap(svgImages).every(svg => svg.includes('data-slat-color="#FFFFFF"')), 'Thumbnails immediately recolor after clearing an incompatible design');
chooseDesign('Horizontal');
chooseColor(31);
assert.equal(flowPiece.idDesign, 21, 'A compatible design remains selected after a color change');
assert.equal(designCards(flowTree).find(item => item.props['aria-label'] === 'Select design Horizontal').props['aria-pressed'], true);
assert.deepEqual(glassParts(buildGarageDesignSvg(centerTemplate, walnut.hexCode)), glassParts(buildGarageDesignSvg(centerTemplate, white.hexCode)), 'Changing slat color leaves the glass geometry, stroke and gradient unchanged');

const captured = { ...snapshot, design: { ...snapshot.design, template: centerTemplate } };
const retiredPiece = { ...piece, designSnapshot: captured };
const retiredSelection = selection.pieceGarageDesign(retiredPiece, { ...flowSystem, allowDesign: false, designOptions: [] });
assert.deepEqual(retiredSelection.design.template, centerTemplate, 'A removed catalog entry keeps its captured geometry');
const retiredMarkup = React.createElement(GarageDesignFields, { ...fields, allowed: false, retained: true, options: [], selected: retiredSelection });
const retiredSvg = svgImages(retiredMarkup);
assert.equal(retiredSvg.length, 1);
assert.ok(retiredSvg[0].includes('data-material="glass"') && retiredSvg[0].includes('data-slat-color="#614126"'));
assert.equal(selection.garageDesignSelectionError({ enabled: true, piece: retiredPiece, initial: retiredPiece, diagramFamily: 'GARAGE_DOOR', system: null }), null);

const products = [{ id: 1, kind: 'GLAZED_UNIT' }];
const input = revisionPieceInput(piece, products);
for (const key of ['idDesign', 'idDesignColor', 'designSnapshot']) assert.deepEqual(input[key], piece[key]);
const restored = revisionPieceForm(input);
assert.deepEqual(restored.designSnapshot, snapshot); assert.equal(restored.idDesignColor, 31);

// Execute the real save mappers and duplicate action, so omitted DTO fields fail here.
function sourceDeclaration(file, name) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(node) {
    if ((ts.isFunctionDeclaration(node) && node.name?.text === name)
      || (ts.isVariableStatement(node) && node.declarationList.declarations.some(item => item.name.getText(source) === name))) found = node;
    ts.forEachChild(node, visit);
  }
  visit(source); assert.ok(found, `Real declaration ${name} exists`); return found.getText(source);
}
function evaluateDeclaration(file, name, scope) {
  return new Function(...Object.keys(scope), compile(`${sourceDeclaration(file, name)}\nreturn ${name};`))(...Object.values(scope));
}
for (const [file, name] of [['components/estimates/estimate-form.tsx', 'mapPieceForPersistence'], ['app/installations/[id]/installation-detail-client.tsx', 'pieceForPersistence']]) {
  const mapper = evaluateDeclaration(file, name, { productsWithBrands: products, canUseCustomerPricing: false, normalizePieceMark: value => value.trim() });
  const result = mapper(piece, products);
  for (const key of ['idDesign', 'idDesignColor', 'designSnapshot']) assert.deepEqual(result[key], piece[key], `${name} carries ${key}`);
  assert.equal(result.idFC, 5, 'Frame color remains separate');
}
const staleMuntin = { idPattern: 91, idType: 92, panels: [{ panelIndex: 1, horizontalLites: 3, verticalLites: 2 }] };
const muntinCases = [
  { label: 'disabled', product: { id: 1, kind: 'GLAZED_UNIT', allowMuntin: false }, allowed: false },
  { label: 'enabled', product: { id: 1, kind: 'GLAZED_UNIT', allowMuntin: true }, allowed: true },
  { label: 'missing flag', product: { id: 1, kind: 'GLAZED_UNIT' }, allowed: true },
  { label: 'linear material', product: { id: 1, kind: 'LINEAR_MATERIAL', allowMuntin: true }, allowed: false },
];
for (const scenario of muntinCases) {
  const catalog = [scenario.product];
  // The current product catalog must override an older embedded product record.
  const stalePiece = { ...piece, prod: { ...piece.prod, allowMuntin: !scenario.allowed }, muntin: structuredClone(staleMuntin) };
  const mappers = [
    ['revisionPieceInput', candidate => revisionPieceInput(candidate, catalog)],
    ...[['components/estimates/estimate-form.tsx', 'mapPieceForPersistence'], ['app/installations/[id]/installation-detail-client.tsx', 'pieceForPersistence']].map(([file, name]) => {
      const mapper = evaluateDeclaration(file, name, { productsWithBrands: catalog, canUseCustomerPricing: false, normalizePieceMark: value => value.trim() });
      return [name, candidate => mapper(candidate, catalog)];
    }),
  ];
  for (const [name, mapper] of mappers) {
    const result = mapper(stalePiece);
    assert.deepEqual(result.muntin, scenario.allowed ? staleMuntin : null, `${name}: ${scenario.label} uses the current product muntin setting`);
    assert.deepEqual(result.designSnapshot, snapshot, `${name}: clearing muntins leaves the garage design unchanged`);
    assert.deepEqual(stalePiece.muntin, staleMuntin, `${name}: persistence mapping does not mutate form state`);
  }
}

const { PieceFormDetailsPanel } = load('components/estimates/piece-form-details-panel.tsx');
const { PieceDiagram } = load('components/piece-diagram.tsx');
for (const scenario of muntinCases) {
  const details = PieceFormDetailsPanel({
    piece: { ...piece, muntin: staleMuntin },
    productsWithBrands: [{ ...scenario.product, name: 'Configured product', diagramFamily: 'GENERIC' }],
    systemsWithConfigs: [], frameColors: [], crystals: [], tints: [], coatings: [], privacies: [],
    muntinPatterns: [{ id: 91, name: 'Colonial', inputMode: 'GRID', requiresType: true }],
    muntinTypes: [{ id: 92, name: '1 in flat-flat' }],
  });
  const markup = renderToStaticMarkup(details);
  assert.equal(markup.includes('<strong>Muntin Pattern:</strong>'), scenario.allowed, `Details panel: ${scenario.label} controls the Muntin Pattern label`);
  assert.equal(markup.includes('<strong>Muntin Type:</strong>'), scenario.allowed, `Details panel: ${scenario.label} controls the Muntin Type label`);
  const diagram = elements(details).find(item => item.type === PieceDiagram);
  assert.ok(diagram);
  if (scenario.allowed) assert.equal(diagram.props.muntin?.profile, 'flat', 'Enabled products retain their diagram grid');
  else assert.equal(diagram.props.muntin, null, 'Disabled products cannot draw a stale grid');
}
let duplicate;
evaluateDeclaration('components/estimates/estimate-form.tsx', 'handleDuplicatePiece', { getValues: () => ({ ...piece, frameColorBeforeDesignId: 73 }),
  setEditingPieceIndex() {}, setDuplicatingPieceData: value => { duplicate = value; }, setIsPieceModalOpen() {}, toast: { info() {} },
})(0);
assert.equal(duplicate.id, undefined); assert.equal(duplicate.idDesign, 21); assert.equal(duplicate.idDesignColor, 31);
assert.equal(duplicate.designSnapshot, null); assert.equal(duplicate.price, 0);
assert.equal(duplicate.frameColorBeforeDesignId, 73, 'Duplicating a design piece retains the remembered ordinary frame');

// Material comes from the validated captured template, never from a design name.
const { garageDesignHasGlass } = load('lib/garage-design-templates.ts');
assert.equal(garageDesignHasGlass(slatTemplate), false);
assert.equal(garageDesignHasGlass(centerTemplate), true);
for (const missing of [null, undefined, {}, { ...slatTemplate, cells: [] }, { ...slatTemplate, cells: [['slat']] }]) {
  assert.equal(garageDesignHasGlass(missing), null);
}
const solidSnapshot = { ...snapshot, design: { ...snapshot.design, name: 'Custom solid design', template: slatTemplate } };
const solidPiece = {
  ...piece, designSnapshot: solidSnapshot, idCryst: 41, idTint: 42, idCoat: 43, idPrivacy: 44,
  cryst: { glass: 'Internal pricing crystal' }, tin: { color: 'Paid tint' }, coat: { name: 'Paid coating' },
  privacyOption: { name: 'Paid privacy' }, dpPosPsf: 45, dpNegPsf: -55,
  prod: { ...piece.prod, kind: 'GLAZED_UNIT', allowMuntin: false },
};
const mixedPiece = { ...solidPiece, designSnapshot: captured };
assert.equal(selection.pieceHasSolidGarageDesign(solidPiece, flowSystem), true);
assert.equal(selection.pieceHasSolidGarageDesign(mixedPiece, system), false, 'Captured glass wins over the catalog slats');
assert.equal(selection.pieceHasSolidGarageDesign({ ...solidPiece, designSnapshot: null }, system), true, 'New selections read their catalog geometry');
assert.equal(selection.pieceHasSolidGarageDesign({ ...solidPiece, designSnapshot: snapshot }, system), false, 'Legacy snapshots without geometry keep glass behavior');
assert.equal(selection.pieceHasSolidGarageDesign({ ...solidPiece, idDesign: null, idDesignColor: null }, system), false, 'Removing the design restores glass');
assert.equal(selection.pieceHasSolidGarageDesign({ ...solidPiece, idDesignColor: null }, system), false, 'Incomplete pairs do not hide glass');
assert.equal(selection.pieceHasSolidGarageDesign({ ...solidPiece, idSyst: 999 }, system), false, 'A different system does not inherit a snapshot');
const detailsProps = candidate => ({
  piece: candidate, productsWithBrands: [{ ...solidPiece.prod, id: 1 }], systemsWithConfigs: [system],
  frameColors: [], crystals: [{ id: 41, glass: 'Internal pricing crystal' }],
  tints: [{ id: 42, color: 'Paid tint' }], coatings: [{ id: 43, name: 'Paid coating' }],
  privacies: [{ id: 44, name: 'Paid privacy' }], muntinPatterns: [], muntinTypes: [],
});
for (const [candidate, solid] of [[solidPiece, true], [mixedPiece, false], [{ ...solidPiece, idDesign: null, idDesignColor: null }, false]]) {
  const reportText = buildPieceReportDetails(candidate).detailLines.join('\n');
  const detailsMarkup = renderToStaticMarkup(PieceFormDetailsPanel(detailsProps(candidate)));
  for (const text of [reportText, detailsMarkup]) {
    assert.equal(text.includes('Internal pricing crystal'), !solid);
    assert.equal(text.includes('Paid tint'), !solid);
    assert.equal(text.includes('Paid coating'), !solid);
    assert.equal(text.includes('Paid privacy'), !solid);
    assert.equal(text.includes('Energy performance'), !solid);
    assert.ok(text.includes('45'), 'DP stays visible');
  }
}
assert.equal(solidPiece.idCryst, 41, 'Presentation does not erase the crystal used for base pricing');
assert.equal(solidPiece.idTint, 42, 'Presentation does not mutate saved glass choices');
for (const mapper of [
  candidate => revisionPieceInput(candidate, products),
  ...[['components/estimates/estimate-form.tsx', 'mapPieceForPersistence'], ['app/installations/[id]/installation-detail-client.tsx', 'pieceForPersistence']].map(([file, name]) => {
    const map = evaluateDeclaration(file, name, { productsWithBrands: products, canUseCustomerPricing: false, normalizePieceMark: value => value.trim() });
    return candidate => map(candidate, products);
  }),
]) {
  const payload = mapper({ ...solidPiece, idTint: null, idCoat: null, idPrivacy: null });
  assert.equal(payload.idCryst, 41, 'Save keeps the internal pricing crystal');
  for (const key of ['idTint', 'idCoat', 'idPrivacy']) assert.equal(payload[key], null, 'Missing glass options stay null rather than becoming a zero catalog ID');
  assert.equal(payload.frameColorBeforeDesignId, null, 'Legacy pieces have no guessed pre-design frame');
  const remembered = mapper({ ...solidPiece, frameColorBeforeDesignId: 73 });
  assert.equal(remembered.frameColorBeforeDesignId, 73, 'Estimate, revision and installation saves retain the remembered frame');
  const cleared = mapper({ ...solidPiece, idDesign: null, idDesignColor: null, frameColorBeforeDesignId: null });
  assert.equal(cleared.frameColorBeforeDesignId, null, 'Removing a design can clear the remembered frame without converting null to zero');
}

// Material revision cards share the same omission rule.
const Specifications = evaluateDeclaration('components/estimates/material-revisions/material-revision-client.tsx', 'Specifications', {
  React, require, exports: {},
  pieceHasSolidGarageDesign: selection.pieceHasSolidGarageDesign,
  pieceFrameColor: selection.pieceFrameColor, garageDesignDescription: selection.garageDesignDescription,
});
for (const [candidate, solid] of [[solidPiece, true], [mixedPiece, false]]) {
  const props = detailsProps(candidate);
  props.systemsWithConfigs = [{ ...system, sysconfs: [] }];
  props.productsWithBrands = [{ ...solidPiece.prod, id: 1, brandProducts: [] }];
  const markup = renderToStaticMarkup(Specifications({ input: candidate, catalogs: props }));
  for (const token of ['Internal pricing crystal', 'Paid tint', 'Paid coating', 'Paid privacy']) assert.equal(markup.includes(token), !solid);
  assert.match(markup, /Screen:/);
}
console.log('PASS garage design: color-first cards/recolor, compatible pairs, unchanged glass, defaults, retired snapshots/fallback, clone validation, reports and save mappers');
console.log('PASS solid design: template materials, captured geometry, preserved internal crystal, glass-free detail/report/revision descriptions and normal mixed designs.');
console.log('PASS product muntin guard: estimate/revision/installation payloads and details labels/diagram follow false, true, missing flag and linear material.');
