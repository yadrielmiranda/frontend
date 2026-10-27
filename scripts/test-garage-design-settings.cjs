const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');

const source = fs.readFileSync(path.resolve(__dirname, '../src/lib/garage-designs.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const moduleObject = { exports: {} };
new Function('exports', 'module', compiled)(moduleObject.exports, moduleObject);
const { safeDesignImageUrl, validateSystemDesignSettings } = moduleObject.exports;
const { neutralDesignColorModifier, validateDesignColorModifier } = moduleObject.exports;
const templateModule = { exports: {} };
const templateSource = fs.readFileSync(path.resolve(__dirname, '../src/lib/garage-design-templates.ts'), 'utf8');
new Function('exports', 'module', ts.transpileModule(templateSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText)(templateModule.exports, templateModule);
const storedTemplate = { version: 1, columns: [0.25, 0.75], rows: [0.2, 0.8], cells: [['glass', 'slat'], ['slat', 'glass']] };

const designs = [
  { id: 1, name: 'Solid', imageUrl: null, template: storedTemplate, isActive: true, sortOrder: 0 },
  { id: 2, name: 'Glass Top', imageUrl: null, isActive: true, sortOrder: 1 },
  { id: 3, name: 'Previous', imageUrl: null, isActive: false, sortOrder: 2 },
];
const colors = [
  { id: 10, name: 'Oak', hexCode: '#996633', idFrameColor: 50, isActive: true, sortOrder: 0 },
  { id: 11, name: 'Black', hexCode: '#000000', isActive: true, sortOrder: 1 },
  { id: 12, name: 'Previous', hexCode: '#FFFFFF', idFrameColor: 53, isActive: false, sortOrder: 2 },
];
const frameColors = [
  { id: 50, color: 'Oak frame', hexCode: '#996633', isActive: true },
  { id: 51, color: 'Cherry frame', hexCode: '#AA3322', isActive: true },
  { id: 52, color: 'Bronze', hexCode: '#776655', isActive: true },
  { id: 53, color: 'Retired frame', hexCode: '#112233', isActive: false },
];
const settings = {
  allowDesign: true,
  defaultDesignId: 1,
  defaultDesignColorId: 10,
  designs: [
    { designId: 1, colorIds: [10], sortOrder: 0 },
    { designId: 2, colorIds: [11], sortOrder: 1 },
  ],
};
const validate = (value) => validateSystemDesignSettings(value, designs, colors);

const preciseModifier = { designColorId: 10, modifierEnabled: true, basePriceMultiplier: '1.050000629572269', basePriceDeduction: '105.00160112819593' };
assert.equal(validate({ ...settings, colorModifiers: [preciseModifier] }), null);
assert.equal(validateDesignColorModifier({ ...preciseModifier, basePriceMultiplier: '0.00000000000000000001', basePriceDeduction: '999999999999999999.99999999999999999999' }), null);
for (const multiplier of ['0', '-1', '1e2', '', '1234567890123456789', '1.123456789012345678901', null, 1.2]) {
  assert.match(validateDesignColorModifier({ ...preciseModifier, basePriceMultiplier: multiplier }), /Base Multiplier/);
}
for (const deduction of ['-1', '1e2', '', '0.123456789012345678901', null, 0]) {
  assert.match(validateDesignColorModifier({ ...preciseModifier, basePriceDeduction: deduction }), /Amount to Subtract/);
}
assert.match(validate({ ...settings, colorModifiers: [preciseModifier, preciseModifier] }), /only once/);
assert.match(validate({ ...settings, colorModifiers: [{ ...preciseModifier, designColorId: 999 }] }), /unknown color/);
assert.match(validate({ ...settings, colorModifiers: null }), /must be a list/);

assert.equal(validate(settings), null, 'An enabled series accepts its configured default pair');
assert.equal(validate({ allowDesign: false, defaultDesignId: null, defaultDesignColorId: null, designs: [] }), null, 'A series with designs disabled needs no catalog associations');
assert.match(validate({ ...settings, defaultDesignId: null, defaultDesignColorId: null }), /both a default/);
assert.match(validate({ ...settings, defaultDesignColorId: null }), /both a default/);
assert.match(validate({ ...settings, defaultDesignColorId: 11 }), /allowed combination/, 'A color allowed for another design cannot become this design default');
assert.match(validate({ ...settings, designs: settings.designs.slice(1) }), /allowed combination/, 'Removing the default design requires an explicit new default');
assert.match(validate({ ...settings, designs: [{ designId: 1, colorIds: [], sortOrder: 0 }] }), /at least one color/);
assert.match(validate({ ...settings, designs: [{ designId: 1, colorIds: [10], sortOrder: 0.5 }] }), /whole number/);
assert.match(validate({ ...settings, defaultDesignId: 3, designs: [{ designId: 3, colorIds: [10], sortOrder: 0 }] }), /active default/);
assert.match(validate({ ...settings, defaultDesignColorId: 12, designs: [{ designId: 1, colorIds: [12], sortOrder: 0 }] }), /active default/);
assert.equal(validate({ ...settings, allowDesign: false, defaultDesignColorId: 12, designs: [{ designId: 1, colorIds: [12], sortOrder: 0 }] }), null, 'Disabled series can retain an inactive historical association');
for (const value of [1, 24, 24.25, 240]) {
  assert.equal(validate({ ...settings, garageMaxSectionHeightIn: value }), null, `Accepted section height ${value}`);
}
for (const value of [0, -1, 240.01, 24.001, NaN, Infinity, null, '24']) {
  assert.match(validate({ ...settings, garageMaxSectionHeightIn: value }), /Maximum section height/, `Rejected invalid section height ${value}`);
}

for (const unsafe of ['javascript:alert(1)', 'data:image/svg+xml,<svg/>', '//external.test/image.png', '/\\external.test/image.png', 'https://example.test/\nimage.png']) {
  assert.equal(safeDesignImageUrl(unsafe), null, `Unsafe image reference: ${unsafe}`);
}
for (const allowed of ['/designs/solid.png', 'https://example.test/solid.png', 'http://localhost/design.png']) {
  assert.equal(safeDesignImageUrl(allowed), allowed);
}
assert.equal(safeDesignImageUrl(''), null);

// Exercise the real management screen's state transitions and submitted payload.
const hookState = [];
let hookIndex = 0;
const savedRequests = [];
const catalogRequests = [];
const deleteRequests = [];
let pendingDelete = null;
const reportedErrors = [];
let nextServerError = null;
const data = {
  ...settings,
  allowDesign: false,
  system: { id: 42, name: 'Configurable series', product: { id: 4, name: 'Garage Door', diagramFamily: 'GARAGE_DOOR' } },
  designCatalog: designs,
  colorCatalog: colors,
};
let activeData = data;
const componentSource = fs.readFileSync(path.resolve(__dirname, '../src/app/settings/(write)/systems/[id]/designs/system-designs-client.tsx'), 'utf8');
const componentCode = ts.transpileModule(componentSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
const componentModule = { exports: {} };
function requireComponent(id) {
  if (id === 'react') return {
    useMemo: (calculate) => calculate(),
    useState: (initial) => {
      const index = hookIndex++;
      if (!(index in hookState)) hookState[index] = typeof initial === 'function' ? initial() : initial;
      return [hookState[index], (next) => { hookState[index] = typeof next === 'function' ? next(hookState[index]) : next; }];
    },
  };
  if (id === 'react/jsx-runtime') return require(id);
  if (id === 'next/link') return ({ children }) => children;
  if (id === 'next/image') return () => null;
  if (id === 'lucide-react') return new Proxy({}, { get: () => () => null });
  if (id === 'sonner') return { toast: { success() {}, error(message) { reportedErrors.push(message); } } };
  if (id === '@/lib/garage-designs') return moduleObject.exports;
  if (id === '@/lib/garage-design-templates') return templateModule.exports;
  if (id === '@/components/estimates/garage-design-preview') return { GarageDesignPreview: 'GarageDesignPreview' };
  if (id === './garage-design-template-editor') return templateEditorModule.exports;
  if (id === '@/app/api/garage-designs.api') return {
    updateSystemDesigns: async (systemId, body) => {
      if (nextServerError) throw new Error(nextServerError);
      savedRequests.push({ systemId, body: structuredClone(body) });
      return { ...data, ...body };
    },
    createDesignPattern: async (body) => {
      catalogRequests.push({ operation: 'createPattern', body });
      return { id: 100, ...body };
    },
    updateDesignPattern: async (id, body) => {
      catalogRequests.push({ operation: 'updatePattern', id, body });
      return { ...designs.find((design) => design.id === id), ...body };
    },
    deleteDesignPattern: (id) => {
      deleteRequests.push(id);
      return new Promise((resolve, reject) => { pendingDelete = { resolve, reject }; });
    },
    createDesignColor: async (body) => {
      catalogRequests.push({ operation: 'createColor', body });
      return { id: 101, ...body };
    },
    updateDesignColor: async (id, body) => {
      catalogRequests.push({ operation: 'updateColor', id, body });
      return { ...colors.find((color) => color.id === id), ...body };
    },
  };
  if (id.startsWith('@/components/ui/')) return new Proxy({}, { get: (_target, name) => name });
  throw new Error(`Unexpected screen dependency: ${id}`);
}
const templateEditorModule = { exports: {} };
const templateEditorSource = fs.readFileSync(path.resolve(__dirname, '../src/app/settings/(write)/garage-designs/garage-design-template-editor.tsx'), 'utf8');
const templateEditorCode = ts.transpileModule(templateEditorSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
new Function('require', 'module', 'exports', templateEditorCode)(requireComponent, templateEditorModule, templateEditorModule.exports);
new Function('require', 'module', 'exports', componentCode)(requireComponent, componentModule, componentModule.exports);
let tree;
function render() {
  hookIndex = 0;
  tree = componentModule.exports.SystemDesignsClient({ data: activeData });
}
function elements(node) {
  if (Array.isArray(node)) return node.flatMap((child) => elements(child));
  if (!React.isValidElement(node)) return [];
  if (node.type === templateEditorModule.exports.GarageDesignTemplateEditor) return [node, ...elements(node.type(node.props))];
  return [node, ...elements(node.props.children ?? null)];
}
function byId(id) {
  const element = elements(tree).find((item) => item.props.id === id);
  assert.ok(element, `Expected control ${id}`);
  return element;
}
function saveButton() { return elements(tree).find((item) => item.type === 'Button' && item.props.type === 'submit'); }
function textContent(node) {
  if (Array.isArray(node)) return node.map(textContent).join('');
  if (React.isValidElement(node)) return textContent(node.props.children);
  return typeof node === 'string' || typeof node === 'number' ? String(node) : '';
}
async function screenChecks() {
  render();
  assert.equal(textContent(elements(byId('defaultDesignId')).find((item) => item.type === 'option' && item.props.value === 1)), 'Solid', 'System defaults display the design name');
  assert.ok(textContent(tree).includes('Allowed colors for Solid'));
  assert.equal(elements(tree).find((item) => item.type === 'GarageDesignPreview').props.color, '#996633', 'System previews use the selected default color');
  assert.equal(saveButton().props.disabled, true, 'Unchanged settings cannot be saved');
  assert.equal(byId('garageMaxSectionHeightIn').props.value, 24, 'Older responses use the initial 24-inch section limit');
  assert.notEqual(byId('garageMaxSectionHeightIn').props.disabled, true, 'The section limit is editable even with designs disabled');
  byId('garageMaxSectionHeightIn').props.onChange({ target: { value: '30' } });
  render();
  assert.equal(byId('allowDesign').props.checked, false);
  assert.equal(saveButton().props.disabled, false, 'GF section settings can be saved without enabling designs');
  await tree.props.onSubmit({ preventDefault() {} });
  render();
  const withoutDesignSave = savedRequests.pop();
  assert.equal(withoutDesignSave.body.allowDesign, false);
  assert.equal(withoutDesignSave.body.garageMaxSectionHeightIn, 30, 'Maximum section height is sent independently of the design switch');
  assert.equal(byId('garageMaxSectionHeightIn').props.value, 30, 'The saved section limit survives the response round trip');
  assert.equal(saveButton().props.disabled, true);
  byId('garageMaxSectionHeightIn').props.onChange({ target: { value: '' } });
  render();
  assert.equal(saveButton().props.disabled, true, 'An empty height cannot be submitted');
  assert.match(textContent(tree), /Maximum section height must/);
  byId('garageMaxSectionHeightIn').props.onChange({ target: { value: '30' } });
  render();
  byId('allowDesign').props.onCheckedChange(true);
  render();
  assert.equal(saveButton().props.disabled, false, 'A configured default pair enables saving the newly enabled series');
  const firstColor = elements(tree).find((item) => item.type === 'input' && item.props.type === 'checkbox' && !item.props.id);
  firstColor.props.onChange({ target: { checked: false } });
  render();
  assert.equal(byId('defaultDesignColorId').props.value, '', 'Removing the default color clears that default');
  assert.equal(saveButton().props.disabled, true);
  byId('design-1').props.onChange({ target: { checked: false } });
  render();
  assert.equal(byId('defaultDesignId').props.value, '', 'Removing the default design clears both defaults');
  byId('defaultDesignId').props.onChange({ target: { value: '2' } });
  render();
  const optionValues = elements(byId('defaultDesignColorId')).filter((item) => item.type === 'option').map((item) => item.props.value);
  assert.deepEqual(optionValues, ['', 11], 'Default colors are restricted to the chosen design');
  byId('defaultDesignColorId').props.onChange({ target: { value: '11' } });
  render();
  assert.equal(saveButton().props.disabled, false);
  await tree.props.onSubmit({ preventDefault() {} });
  render();
  assert.deepEqual(savedRequests, [{ systemId: 42, body: {
    allowDesign: true, garageMaxSectionHeightIn: 30, defaultDesignId: 2, defaultDesignColorId: 11,
    designs: [{ designId: 2, colorIds: [11], sortOrder: 1 }],
    colorModifiers: [neutralDesignColorModifier(10), neutralDesignColorModifier(11)],
  } }]);
  assert.equal(saveButton().props.disabled, true, 'Successful save resets the unsaved state');
  byId('order-2').props.onChange({ target: { value: '2' } });
  render();
  nextServerError = 'The default design is no longer active.';
  await tree.props.onSubmit({ preventDefault() {} });
  render();
  assert.deepEqual(reportedErrors, [nextServerError], 'Server rejection for a stale default is shown to the user');
  assert.equal(saveButton().props.disabled, false, 'A rejected save keeps the edited state available for correction');
  assert.equal(byId('order-2').props.value, 2);
  assert.equal(savedRequests.length, 1, 'Rejected settings are not marked as saved');
  console.log('Garage design settings: allowed pairs, inactive entries, safe images, default changes and save payload passed.');
}

async function modifierChecks() {
  hookState.length = 0;
  savedRequests.length = 0;
  reportedErrors.length = 0;
  nextServerError = null;
  const hiddenModifier = { ...neutralDesignColorModifier(12), basePriceMultiplier: '2.12345678901234567890', basePriceDeduction: '0.00000000000000000001' };
  activeData = { ...data, ...settings,
    designs: [{ designId: 1, colorIds: [10, 11], sortOrder: 0 }, { designId: 2, colorIds: [10], sortOrder: 1 }],
    colorModifiers: [preciseModifier, hiddenModifier],
  };
  const modifierTable = () => elements(tree).find((item) => item.type === 'Table' && item.props['aria-label'] === 'Design Color Modifiers');
  const field = (colorId, name) => byId(`design-color-${colorId}-${name}`);
  const toggle = (colorId, checked) => { byId(`design-color-modifier-${colorId}`).props.onCheckedChange(checked); render(); };
  const allowColor = (pattern, color, checked) => {
    const control = elements(tree).find((item) => item.props['aria-label'] === `Allow ${color} for ${pattern}`);
    assert.ok(control);
    control.props.onChange({ target: { checked } }); render();
  };
  render();
  assert.equal(saveButton().props.disabled, true);
  assert.equal(elements(modifierTable()).filter((item) => item.props.id === 'design-color-modifier-10').length, 1, 'A color used by two patterns has one shared modifier row');
  assert.equal(elements(modifierTable()).some((item) => item.props.id === 'design-color-modifier-12'), false, 'Unused catalog colors are absent even when a retained modifier exists');
  assert.equal(field(10, 'basePriceMultiplier').props.value, preciseModifier.basePriceMultiplier);
  assert.equal(field(10, 'basePriceDeduction').props.value, preciseModifier.basePriceDeduction);
  assert.equal(byId('design-color-modifier-11').props.checked, false);
  assert.equal(field(11, 'basePriceMultiplier').props.value, '1');
  assert.equal(field(11, 'basePriceDeduction').props.value, '0');
  assert.equal(field(11, 'basePriceMultiplier').props.disabled, true);
  const changedMultiplier = '1.20000000000000000002';
  const changedDeduction = '629.995999999999982';
  field(10, 'basePriceMultiplier').props.onChange({ target: { value: changedMultiplier } });
  render();
  field(10, 'basePriceDeduction').props.onChange({ target: { value: changedDeduction } });
  render();
  toggle(10, false);
  assert.equal(field(10, 'basePriceMultiplier').props.value, changedMultiplier, 'Turning off a valid modifier retains all digits');
  toggle(10, true);
  byId('design-1').props.onChange({ target: { checked: false } }); render();
  assert.equal(field(10, 'basePriceMultiplier').props.value, changedMultiplier, 'Removing one pattern does not change the shared color rate');
  byId('design-2').props.onChange({ target: { checked: false } }); render();
  assert.equal(elements(modifierTable()).some((item) => item.type === 'Switch'), false, 'No modifier rows remain without assigned colors');
  byId('allowDesign').props.onCheckedChange(false); render();
  await tree.props.onSubmit({ preventDefault() {} }); render();
  let submitted = savedRequests.at(-1).body;
  assert.equal(submitted.allowDesign, false);
  assert.equal(submitted.designs.length, 0);
  assert.deepEqual(submitted.colorModifiers.find((item) => item.designColorId === 10), { ...preciseModifier, basePriceMultiplier: changedMultiplier, basePriceDeduction: changedDeduction }, 'Removing every pattern and disabling designs preserves saved modifier configuration');
  assert.deepEqual(submitted.colorModifiers.find((item) => item.designColorId === 12), hiddenModifier, 'Unassigned saved colors retain exact values too');
  byId('design-1').props.onChange({ target: { checked: true } }); render();
  allowColor('Solid', 'Oak', true);
  assert.equal(field(10, 'basePriceMultiplier').props.value, changedMultiplier, 'Reassigning a color restores its modifier after a save round trip');
  assert.equal(field(10, 'basePriceDeduction').props.value, changedDeduction);
  field(10, 'basePriceMultiplier').props.onChange({ target: { value: '0' } }); render();
  assert.equal(saveButton().props.disabled, true, 'Invalid coefficients block save');
  toggle(10, false);
  assert.equal(field(10, 'basePriceMultiplier').props.value, changedMultiplier, 'Disabling an invalid draft restores the last valid saved coefficient');
  toggle(10, true);
  field(10, 'basePriceDeduction').props.onChange({ target: { value: '-1' } }); render();
  byId('design-1').props.onChange({ target: { checked: false } }); render();
  assert.equal(saveButton().props.disabled, true, 'Removing an invalid draft color restores its unchanged saved values without a hidden error');
  assert.ok(!textContent(tree).includes('Amount to Subtract must'));
  byId('design-1').props.onChange({ target: { checked: true } }); render();
  allowColor('Solid', 'Oak', true);
  assert.equal(field(10, 'basePriceDeduction').props.value, changedDeduction);
  allowColor('Solid', 'Black', true);
  toggle(11, true);
  field(11, 'basePriceMultiplier').props.onChange({ target: { value: '1.12345678901234567890' } }); render();
  nextServerError = 'Cannot save these modifiers.';
  await tree.props.onSubmit({ preventDefault() {} }); render();
  assert.equal(field(11, 'basePriceMultiplier').props.value, '1.12345678901234567890', 'A failed save preserves the editable exact-value draft');
  assert.equal(saveButton().props.disabled, false);
  nextServerError = null;
  await tree.props.onSubmit({ preventDefault() {} }); render();
  submitted = savedRequests.at(-1).body;
  assert.equal(submitted.colorModifiers.find((item) => item.designColorId === 11).basePriceMultiplier, '1.12345678901234567890', 'Submission preserves decimal strings including trailing zeroes');
  assert.equal(saveButton().props.disabled, true);
  activeData = { ...data, system: { ...data.system, id: 43 } };
  hookState.length = 0;
  render();
  assert.equal(field(10, 'basePriceMultiplier').props.value, '1', 'Another series starts neutral instead of inheriting the prior series rate');
  assert.equal(byId('design-color-modifier-10').props.checked, false);
  activeData = data;
  console.log('Design color modifiers: shared per-color rows, neutral defaults, exact decimals, visibility, retained settings, toggles, validation and save retry passed.');
}

async function catalogChecks() {
  hookState.length = 0;
  const catalogSource = fs.readFileSync(path.resolve(__dirname, '../src/app/settings/(write)/garage-designs/garage-design-catalogs-client.tsx'), 'utf8');
  const catalogCode = ts.transpileModule(catalogSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const catalogModule = { exports: {} };
  new Function('require', 'module', 'exports', catalogCode)(requireComponent, catalogModule, catalogModule.exports);
  function renderCatalog() {
    hookIndex = 0;
    tree = catalogModule.exports.GarageDesignCatalogsClient({
      initialPatterns: designs.map((design) => ({ ...design, imageUrl: '/design-preview.png' })),
      initialColors: colors,
      frameColors,
    });
  }
  function clickButton(label) {
    const button = elements(tree).find((item) => item.type === 'Button' && (item.props['aria-label'] === label || textContent(item).trim() === label));
    assert.ok(button, `Expected button ${label}`);
    button.props.onClick();
    renderCatalog();
  }
  function change(id, value) {
    byId(id).props.onChange({ target: { value } });
    renderCatalog();
  }
  async function saveCatalog() {
    await elements(tree).find((item) => item.type === 'form').props.onSubmit({ preventDefault() {} });
    renderCatalog();
    assert.equal(elements(tree).filter((item) => item.props.role === 'alert').length, 0);
  }
  function assertNoCodeField() {
    assert.equal(elements(tree).some((item) => item.props.id === 'catalog-code'), false);
    assert.equal(elements(tree).filter((item) => item.props.id === 'catalog-name').length, 1);
  }
  function assertNoColorImage() {
    assert.equal(elements(tree).some((item) => item.props.id === 'catalog-image'), false, 'Color editor has no image field');
    const colorSection = elements(tree).find((item) => item.type === 'section' && textContent(item).includes('Design Colors'));
    assert.equal(elements(colorSection).some((item) => item.props.src), false, 'Colors use hex swatches without images');
  }

  renderCatalog();
  const initialColorNames = elements(tree).filter((item) => item.type === 'p').map(textContent);
  assert.equal(initialColorNames.includes('Bronze'), false, 'An ordinary frame color does not create a Design Color');
  assert.ok(textContent(tree).includes('Frame Color: Oak frame'), 'Catalog displays the explicitly linked frame, even with a different name');
  assert.ok(textContent(tree).includes('Frame Color not linked'), 'Legacy unlinked colors expose the missing configuration');
  assert.ok(elements(tree).some((item) => item.type === 'p' && textContent(item) === 'Solid'), 'Catalog displays the design name');
  assert.ok(elements(tree).some((item) => item.type === 'GarageDesignPreview' && item.props.imageUrl === '/design-preview.png'), 'Design image fallback remains available');
  assert.deepEqual(elements(tree).find((item) => item.type === 'GarageDesignPreview').props.template, storedTemplate, 'Catalog previews use database geometry');
  change('catalog-preview-color', '11');
  assert.ok(elements(tree).filter((item) => item.type === 'GarageDesignPreview').every((item) => item.props.color === '#000000'), 'Catalog color selection recolors every preview');
  assert.ok(elements(tree).some((item) => item.props.style?.backgroundColor === '#996633'), 'Color swatch uses the hex value');
  clickButton('Add Design');
  assertNoCodeField();
  assert.equal(byId('template-rows').props.value, 4);
  assert.equal(byId('template-columns').props.value, 1);
  assert.deepEqual(elements(tree).filter((item) => item.type === 'Button' && item.props['aria-label']?.startsWith('Row ')).map((item) => textContent(item)), ['Slats', 'Slats', 'Slats', 'Slats'], 'New designs begin with a generic four-row slat layout');
  assert.equal(elements(byId('template-columns')).filter((item) => item.type === 'option').length, 12, 'The editor limits columns to 12');
  change('catalog-name', '  My <custom> & "door"  ');
  change('catalog-image', '/designs/glass-top.png');
  change('template-columns', '3');
  change('template-width-0', '20');
  change('template-width-1', '30');
  change('template-width-2', '50');
  clickButton('Row 1, column 2: Slats');
  assert.equal(textContent(elements(tree).find((item) => item.props['aria-label'] === 'Row 1, column 2: Glass')), 'Glass');
  change('template-rows', '2');
  assert.deepEqual(elements(tree).find((item) => item.type === templateEditorModule.exports.GarageDesignTemplateEditor).props.value.rows, [0.5, 0.5], 'Resizing rows assigns equal heights');
  change('template-rows', '4');
  change('template-preview-color', '10');
  change('template-width-0', '0');
  await elements(tree).find((item) => item.type === 'form').props.onSubmit({ preventDefault() {} });
  renderCatalog();
  assert.equal(catalogRequests.length, 0, 'Invalid widths block persistence');
  change('template-width-0', '20');
  await saveCatalog();
  const expectedTemplate = { version: 1, columns: [0.2, 0.3, 0.5], rows: [0.25, 0.25, 0.25, 0.25], cells: [['slat', 'glass', 'slat'], ['slat', 'slat', 'slat'], ['slat', 'slat', 'slat'], ['slat', 'slat', 'slat']] };
  assert.deepEqual(catalogRequests.at(-1), { operation: 'createPattern', body: { name: 'My <custom> & "door"', sortOrder: 0, isActive: true, imageUrl: '/designs/glass-top.png', template: expectedTemplate } }, 'Custom names and normalized geometry are saved without preview colors');
  const svg = templateModule.exports.buildGarageDesignSvg(expectedTemplate, '#996633', catalogRequests.at(-1).body.name);
  assert.ok(svg.includes('&lt;custom&gt;') && !svg.includes('<custom>'), 'Custom names are escaped by the shared SVG renderer');

  clickButton('Edit design Solid');
  assertNoCodeField();
  assert.equal(byId('template-width-0').props.value, '25');
  assert.equal(byId('template-width-1').props.value, '75');
  assert.deepEqual(elements(tree).find((item) => item.type === templateEditorModule.exports.GarageDesignTemplateEditor).props.value.rows, [0.2, 0.8], 'Existing row proportions are retained while editing');
  change('catalog-name', 'SF');
  change('catalog-image', '');
  await saveCatalog();
  assert.deepEqual(catalogRequests.at(-1), { operation: 'updatePattern', id: 1, body: { name: 'SF', sortOrder: 0, isActive: true, imageUrl: null, template: storedTemplate } }, 'Editing a name preserves existing geometry');

  clickButton('Edit design Glass Top');
  assert.equal(elements(tree).some((item) => item.props.id === 'template-rows'), false, 'An image-only design keeps its fallback until a layout is created');
  clickButton('Create editable layout');
  assert.equal(byId('template-rows').props.value, 4);
  await saveCatalog();
  assert.deepEqual(catalogRequests.at(-1).body.template, { version: 1, columns: [1], rows: [0.25, 0.25, 0.25, 0.25], cells: [['slat'], ['slat'], ['slat'], ['slat']] }, 'Image-only designs can acquire an editable template');

  clickButton('Add Color');
  assertNoColorImage();
  assert.equal(byId('catalog-frame-color').props.required, true);
  assert.equal(byId('catalog-frame-color').props.value, '', 'New colors do not automatically link by name');
  assert.deepEqual(elements(byId('catalog-frame-color')).filter(item => item.type === 'option' && item.props.value !== '').map(item => item.props.value).sort(), [50, 51, 52], 'Only active frame colors are offered');
  change('catalog-name', ' Cherry ');
  change('catalog-color', '#aa3322');
  const beforeUnlinked = catalogRequests.length;
  await elements(tree).find((item) => item.type === 'form').props.onSubmit({ preventDefault() {} });
  renderCatalog();
  assert.equal(catalogRequests.length, beforeUnlinked, 'Missing mapping blocks save');
  assert.ok(textContent(tree).includes('Choose an active Frame Color'));
  change('catalog-frame-color', '51');
  await saveCatalog();
  assert.deepEqual(catalogRequests.at(-1), { operation: 'createColor', body: { name: 'Cherry', sortOrder: 0, isActive: true, hexCode: '#AA3322', idFrameColor: 51 } });

  clickButton('Edit design color Oak');
  assertNoColorImage();
  assert.equal(byId('catalog-frame-color').props.value, '50', 'Editing loads the saved link');
  change('catalog-name', 'Dark Oak');
  change('catalog-color', '#664422');
  await saveCatalog();
  assert.deepEqual(catalogRequests.at(-1), { operation: 'updateColor', id: 10, body: { name: 'Dark Oak', sortOrder: 0, isActive: true, hexCode: '#664422', idFrameColor: 50 } }, 'Editing a color preserves its explicit frame mapping');
  assert.equal(catalogRequests.length, 5);
  clickButton('Edit design color Previous');
  assert.equal(byId('catalog-frame-color').props.value, '53', 'An inactive historical link is displayed, not silently replaced');
  const retiredOption = elements(byId('catalog-frame-color')).find(item => item.type === 'option' && item.props.value === '53');
  assert.equal(retiredOption.props.disabled, true);
  assert.match(textContent(retiredOption), /inactive/);
  await elements(tree).find((item) => item.type === 'form').props.onSubmit({ preventDefault() {} });
  renderCatalog();
  assert.equal(catalogRequests.length, 5, 'An inactive frame mapping cannot be saved as a current color');
  clickButton('Cancel');
  clickButton('Deactivate design color Black');
  await new Promise(setImmediate);
  renderCatalog();
  assert.deepEqual(catalogRequests.at(-1), { operation: 'updateColor', id: 11, body: { isActive: false } }, 'An active toggle never discards a mapping or requires editing an old record');
  const { createTemplateDraft, normalizeTemplateDraft } = templateEditorModule.exports;
  assert.deepEqual(normalizeTemplateDraft({ ...createTemplateDraft(storedTemplate), columnWidths: ['2', '6'] }), storedTemplate, 'Relative widths normalize on save');
  console.log('Garage catalogs: generic templates, explicit frame links, missing/inactive mapping validation and independent frame/design catalogs passed.');

  const deleteDialog = () => elements(tree).find((item) => item.type === 'AlertDialog');
  const deleteAction = () => elements(deleteDialog()).find((item) => item.type === 'AlertDialogAction');
  const deleteCancel = () => elements(deleteDialog()).find((item) => item.type === 'AlertDialogCancel');
  function rowsIn(sectionName) {
    const section = elements(tree).find((item) => item.type === 'section' && elements(item).some((child) => child.type === 'h2' && textContent(child).trim() === sectionName));
    assert.ok(section, `Expected ${sectionName} catalog section`);
    return elements(section).filter((item) => item.type === 'li').map((item) => ({ id: item.key, text: textContent(item) }));
  }
  function confirmDelete() {
    let preventedDefault = false;
    deleteAction().props.onClick({ preventDefault() { preventedDefault = true; } });
    assert.equal(preventedDefault, true, 'Confirming deletion prevents Radix from automatically closing the dialog');
    renderCatalog();
  }
  async function settleDelete(error) {
    assert.ok(pendingDelete, 'The delete request is pending');
    const current = pendingDelete;
    pendingDelete = null;
    if (error) current.reject(new Error(error)); else current.resolve({ id: deleteRequests.at(-1) });
    await new Promise(setImmediate);
    renderCatalog();
  }
  const originalDesignRows = rowsIn('Designs');
  const originalColorRows = rowsIn('Design Colors');
  assert.ok(originalDesignRows.some((row) => row.id === '3'));
  clickButton('Delete design Previous');
  assert.equal(deleteDialog().props.open, true);
  assert.equal(textContent(elements(deleteDialog()).find((item) => item.type === 'AlertDialogDescription')), 'Permanently delete “Previous” from the design catalog? This cannot be undone.', 'Confirmation identifies the exact chosen design');
  assert.equal(deleteRequests.length, 0, 'Opening confirmation sends no delete request');
  assert.equal(deleteCancel().props.disabled, false);
  // Radix Cancel invokes its parent dialog's onOpenChange(false).
  deleteDialog().props.onOpenChange(false);
  renderCatalog();
  assert.equal(deleteDialog().props.open, false);
  assert.equal(deleteRequests.length, 0, 'Cancel sends no delete request');
  assert.deepEqual(rowsIn('Designs'), originalDesignRows);

  clickButton('Delete design Previous');
  confirmDelete();
  assert.deepEqual(deleteRequests, [3], 'Only the confirmed ID is submitted');
  assert.equal(deleteAction().props.disabled, true);
  assert.equal(deleteCancel().props.disabled, true);
  assert.equal(textContent(deleteAction()).trim(), 'Deleting...');
  assert.ok(elements(tree).filter((item) => item.type === 'Button' && typeof item.props.onClick === 'function').every((item) => item.props.disabled === true), 'Catalog mutation controls are disabled while deletion is pending');
  assert.deepEqual(rowsIn('Designs'), originalDesignRows, 'No design disappears before server confirmation');
  deleteDialog().props.onOpenChange(false);
  renderCatalog();
  assert.equal(deleteDialog().props.open, true, 'A pending deletion cannot close the confirmation dialog');
  confirmDelete();
  assert.deepEqual(deleteRequests, [3], 'A repeated confirmation while busy cannot submit another request');
  const deletionError = 'This design is still used by a saved piece.';
  await settleDelete(deletionError);
  assert.equal(deleteDialog().props.open, true, 'Server rejection keeps the dialog open');
  assert.equal(deleteAction().props.disabled, false);
  assert.equal(deleteCancel().props.disabled, false);
  assert.deepEqual(elements(deleteDialog()).filter((item) => item.props.role === 'alert').map(textContent), [deletionError], 'Server errors are displayed inside the confirmation dialog');
  assert.deepEqual(rowsIn('Designs'), originalDesignRows, 'Rejected deletion preserves the design and its siblings');
  assert.deepEqual(rowsIn('Design Colors'), originalColorRows);

  deleteDialog().props.onOpenChange(false);
  renderCatalog();
  assert.equal(deleteDialog().props.open, false);
  clickButton('Delete design Previous');
  assert.equal(elements(deleteDialog()).filter((item) => item.props.role === 'alert').length, 0, 'Reopening confirmation clears the previous error');
  confirmDelete();
  assert.deepEqual(deleteRequests, [3, 3]);
  await settleDelete();
  assert.equal(deleteDialog().props.open, false, 'Successful deletion closes confirmation');
  assert.deepEqual(rowsIn('Designs'), originalDesignRows.filter((row) => row.id !== '3'), 'Success removes only the confirmed design ID');
  assert.deepEqual(rowsIn('Design Colors'), originalColorRows, 'Deleting a design leaves colors intact, including a color with the same name');
  assert.ok(elements(tree).filter((item) => item.type === 'Button' && typeof item.props.onClick === 'function').every((item) => item.props.disabled === false), 'Catalog actions are available again after success');
  console.log('Garage design deletion: open/cancel, exact confirmation, pending controls, duplicate guard, server rejection and exact-row success passed.');
}

screenChecks().then(modifierChecks).then(catalogChecks).catch((error) => { console.error(error); process.exitCode = 1; });
