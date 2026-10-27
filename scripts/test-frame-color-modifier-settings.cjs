const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const directory = 'app/settings/(write)/systems/[id]/frame-colors/';
const multiplier = '1.23456789012345678901';
const deduction = '765.43210987654321098765';
const neutral = { modifierEnabled: false, basePriceMultiplier: '1', basePriceDeduction: '0' };
const fixture = () => ({
  system: { id: 42, name: 'Example series', product: { name: 'Custom product' }, brand: { name: 'Example brand' } },
  selectedFrameColorIds: [71, 72],
  selectedFrameColors: [
    { idFrameColor: 71, sortOrder: 0, isDefault: true, modifierEnabled: true, basePriceMultiplier: multiplier, basePriceDeduction: deduction },
    { idFrameColor: 72, sortOrder: 1, isDefault: false },
  ],
  frameColorsCatalog: [
    { id: 71, color: 'Custom finish', hexCode: '#123456', isActive: true },
    { id: 72, color: 'Existing finish', hexCode: '#445566', isActive: true },
    { id: 73, color: 'New finish', hexCode: '#667788', isActive: true },
    { id: 74, color: 'Retired finish', hexCode: '#998877', isActive: false },
  ],
});
function setup(data = fixture()) {
  const slots = [], requests = [], errors = [], modules = new Map();
  let index = 0, changed = false, effects = [], nextSave = null, transform = value => value;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  function load(name) {
    if (modules.has(name)) return modules.get(name).exports;
    const filename = path.resolve(__dirname, '../src', directory, name);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const loaded = { exports: {} }; modules.set(name, loaded);
    new Function('require', 'module', 'exports', code)(requireTest, loaded, loaded.exports);
    return loaded.exports;
  }
  function requireTest(id) {
    if (id === 'react') return {
      useEffect: (fn, deps) => { const n = index++; if (!slots[n] || !same(slots[n].deps, deps)) { slots[n] = { deps }; effects.push(fn); } },
      useMemo: (fn, deps) => { const n = index++; if (!slots[n] || !same(slots[n].deps, deps)) slots[n] = { deps, value: fn() }; return slots[n].value; },
      useState: initial => { const n = index++; if (!(n in slots)) slots[n] = typeof initial === 'function' ? initial() : initial; return [slots[n], next => { const value = typeof next === 'function' ? next(slots[n]) : next; if (!Object.is(value, slots[n])) { slots[n] = value; changed = true; } }]; },
      useRef: initial => { const n = index++; if (!(n in slots)) slots[n] = { current: initial }; return slots[n]; },
    };
    if (id === 'react/jsx-runtime') return require(id);
    if (id === 'next/navigation') return { useRouter: () => ({ refresh() {} }) };
    if (id === 'lucide-react') return new Proxy({}, { get: () => () => null });
    if (id === 'sonner') return { toast: { success() {}, error(message) { errors.push(message); } } };
    if (id.startsWith('@/components/ui/')) return new Proxy({}, { get: (_target, name) => name });
    if (id === '@/app/api/systems.api') return { updateSystemFrameColors: async (systemId, body) => {
      requests.push({ systemId, body: structuredClone(body) });
      if (nextSave) { const save = nextSave; nextSave = null; await save(); }
      return transform({ ...data, selectedFrameColorIds: body.frameColors.map(row => row.frameColorId), selectedFrameColors: body.frameColors.map(({ frameColorId, ...row }) => ({ idFrameColor: frameColorId, ...row })) });
    } };
    if (id.startsWith('./')) { const name = id.slice(2); return load(name + (fs.existsSync(path.resolve(__dirname, '../src', directory, `${name}.tsx`)) ? '.tsx' : '.ts')); }
    throw new Error(`Unexpected module ${id}`);
  }
  const { SystemFrameColorsClient } = load('system-frame-colors-client.tsx');
  return { load, requests, errors,
    transformResponse(fn) { transform = fn; },
    deferNextSave() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); nextSave = () => promise; return { resolve, reject }; },
    render() { let tree, rounds = 0; do { index = 0; changed = false; effects = []; tree = SystemFrameColorsClient({ data }); effects.forEach(fn => fn()); assert.ok(++rounds < 10, 'Effects must settle'); } while (changed); return tree; },
  };
}
function elements(node) { if (Array.isArray(node)) return node.flatMap(elements); if (!React.isValidElement(node)) return []; return [node, ...elements(node.props.children)]; }
const text = node => Array.isArray(node) ? node.map(text).join('') : React.isValidElement(node) ? text(node.props.children) : typeof node === 'string' ? node : '';
function control(tree, label) { const result = elements(tree).find(item => item.props['aria-label'] === label); assert.ok(result, `Inline control: ${label}`); return result; }
function optionalControl(tree, label) { return elements(tree).find(item => item.props['aria-label'] === label); }
function addButton(tree) { const result = elements(tree).find(item => item.type === 'Button' && text(item).trim() === 'Add Frame Color'); assert.ok(result, 'Add Frame Color button'); return result; }
function mainTable(tree) { return control(tree, 'Associated Frame Colors'); }
function addColor(app, tree, name) {
  addButton(tree).props.onClick(); tree = app.render();
  input(control(tree, 'Search frame colors'), name); tree = app.render();
  control(tree, `Add ${name} to this series`).props.onClick(); tree = app.render();
  assert.equal(elements(tree).some(item => item.type === 'Dialog'), false, 'Choosing a color closes the picker');
  return tree;
}
function saveButton(tree) { const result = elements(tree).find(item => item.type === 'Button' && /^(Save Frame Colors|Saving\.\.\.)$/.test(text(item))); assert.ok(result, 'Save Frame Colors button'); return result; }
function check(element, checked) { if (element.props.onCheckedChange) element.props.onCheckedChange(checked); else element.props.onChange({ target: { checked, type: element.props.type, value: element.props.value } }); }
const input = (element, value) => element.props.onChange({ target: { value } });
function disabled(tree, target, inherited = false) {
  if (Array.isArray(tree)) { for (const child of tree) { const result = disabled(child, target, inherited); if (result !== undefined) return result; } return undefined; }
  if (!React.isValidElement(tree)) return undefined;
  const context = inherited || (tree.type === 'fieldset' && tree.props.disabled === true);
  if (tree === target) return context || tree.props.disabled === true;
  return disabled(tree.props.children, target, context);
}
const row = (app, id) => app.requests.at(-1).body.frameColors.find(item => item.frameColorId === id);
const flush = () => new Promise(resolve => setImmediate(resolve));
const submit = tree => saveButton(tree).props.onClick();
(async () => {
  let app = setup();
  const helpers = app.load('frame-color-modifier.ts');
  assert.deepEqual(helpers.neutralFrameColorModifier(), neutral);
  assert.equal(helpers.validateFrameColorModifier({ modifierEnabled: true, basePriceMultiplier: multiplier, basePriceDeduction: deduction }), null);
  assert.equal(helpers.validateFrameColorModifier({ ...neutral, basePriceMultiplier: '0.00000000000000000001' }), null);
  for (const value of ['', '0', '0.00', '-1', 'Infinity', 'NaN', '1e2', '1.123456789012345678901', '1234567890123456789']) assert.ok(helpers.validateFrameColorModifier({ ...neutral, basePriceMultiplier: value }), `Reject multiplier ${value}`);
  for (const value of ['', '-1', 'Infinity', 'NaN', '1e2', '0.123456789012345678901']) assert.ok(helpers.validateFrameColorModifier({ ...neutral, basePriceDeduction: value }), `Reject deduction ${value}`);
  let tree = app.render();
  assert.equal(elements(tree).some(item => item.type === 'Dialog'), false, 'Color picker starts closed');
  assert.equal(elements(tree).some(item => item.type === 'Checkbox' || item.props.type === 'checkbox'), false, 'No availability checkboxes remain');
  assert.equal(elements(mainTable(tree)).some(item => item.type === 'TableHead' && text(item) === 'Available'), false, 'Main table has no Available column');
  for (const color of ['Custom finish', 'Existing finish']) for (const label of [`${color} order`, `Use ${color} as default`, `Apply modifier to ${color}`, `${color} Base multiplier`, `${color} Amount to subtract`, `Remove ${color} from this series`]) control(mainTable(tree), label);
  assert.equal(optionalControl(mainTable(tree), 'New finish Base multiplier'), undefined, 'Unassociated catalog colors are absent from the main table');
  assert.equal(text(mainTable(tree)).includes('Retired finish'), false);
  assert.equal(control(tree, 'Custom finish Base multiplier').props.value, multiplier);
  assert.equal(control(tree, 'Apply modifier to Existing finish').props.checked, false, 'Legacy rows start inactive');
  assert.equal(control(tree, 'Existing finish Base multiplier').props.value, '1');
  assert.equal(control(tree, 'Existing finish Amount to subtract').props.value, '0');
  assert.equal(disabled(tree, control(tree, 'Existing finish Base multiplier')), true);
  assert.equal(saveButton(tree).props.disabled, true, 'Unchanged table cannot be saved');
  addButton(tree).props.onClick(); tree = app.render();
  assert.ok(elements(tree).some(item => item.type === 'Dialog'), 'Add Frame Color opens a picker');
  assert.ok(optionalControl(tree, 'Add New finish to this series'));
  assert.equal(optionalControl(tree, 'Add Custom finish to this series'), undefined, 'Already associated colors are not offered');
  assert.equal(optionalControl(tree, 'Add Retired finish to this series'), undefined, 'Inactive catalog colors are not offered');
  input(control(tree, 'Search frame colors'), 'no-match'); tree = app.render();
  assert.equal(optionalControl(tree, 'Add New finish to this series'), undefined, 'Search narrows the picker');
  input(control(tree, 'Search frame colors'), 'nEw'); tree = app.render();
  assert.ok(optionalControl(tree, 'Add New finish to this series'), 'Search is case insensitive');
  elements(tree).find(item => item.type === 'Dialog').props.onOpenChange(false); tree = app.render();
  assert.equal(saveButton(tree).props.disabled, true, 'Opening and dismissing the picker does not change settings');
  input(control(tree, 'Existing finish order'), '8'); tree = app.render();
  check(control(tree, 'Use Existing finish as default'), true); tree = app.render();
  check(control(tree, 'Apply modifier to Custom finish'), false); tree = app.render();
  assert.equal(control(tree, 'Custom finish Base multiplier').props.value, multiplier, 'Disabling keeps valid values');
  tree = addColor(app, tree, 'New finish');
  assert.equal(control(tree, 'Apply modifier to New finish').props.checked, false);
  assert.equal(control(tree, 'New finish Base multiplier').props.value, '1');
  assert.equal(control(tree, 'New finish Amount to subtract').props.value, '0');
  check(control(tree, 'Apply modifier to New finish'), true); tree = app.render();
  input(control(tree, 'New finish Base multiplier'), ' 1.5000 ');
  input(control(tree, 'New finish Amount to subtract'), deduction); tree = app.render();
  assert.equal(app.requests.length, 0, 'All changes remain draft until one explicit save');
  assert.equal(saveButton(tree).props.disabled, false);
  app.transformResponse(response => ({ ...response, selectedFrameColors: response.selectedFrameColors.map(item => item.idFrameColor === 73 ? { ...item, basePriceMultiplier: '1.5' } : item) }));
  await submit(tree); await flush(); tree = app.render();
  assert.equal(app.requests.length, 1);
  assert.equal(app.requests[0].systemId, 42);
  assert.equal(row(app, 71).modifierEnabled, false);
  assert.equal(row(app, 71).basePriceMultiplier, multiplier);
  assert.equal(row(app, 71).basePriceDeduction, deduction, 'Other-row edits retain exact decimals');
  assert.equal(row(app, 72).sortOrder, 8);
  assert.equal(row(app, 72).isDefault, true);
  assert.equal(row(app, 71).isDefault, false);
  assert.equal(row(app, 73).basePriceMultiplier, '1.5000', 'API receives decimal text');
  assert.equal(row(app, 73).basePriceDeduction, deduction);
  assert.equal(control(tree, 'New finish Base multiplier').props.value, '1.5', 'Success adopts saved server response');
  assert.equal(saveButton(tree).props.disabled, true, 'Success establishes clean baseline');
  input(control(tree, 'New finish Base multiplier'), '-1'); tree = app.render();
  const savesBeforeInvalid = app.requests.length;
  await submit(tree);
  assert.equal(app.requests.length, savesBeforeInvalid, 'Invalid enabled coefficients block API saving');
  assert.ok(app.errors.some(message => message.includes('Base multiplier')));
  check(control(tree, 'Apply modifier to New finish'), false); tree = app.render();
  assert.equal(control(tree, 'New finish Base multiplier').props.value, '1.5', 'Turning off invalid draft restores saved value');
  assert.equal(saveButton(tree).props.disabled, false, 'Deactivation remains saveable');
  control(tree, 'Remove Custom finish from this series').props.onClick(); tree = app.render();
  assert.equal(optionalControl(mainTable(tree), 'Custom finish Base multiplier'), undefined, 'Removing a color hides its inline row');
  const savesBeforeReadding = app.requests.length;
  tree = addColor(app, tree, 'Custom finish');
  assert.equal(app.requests.length, savesBeforeReadding, 'Remove and re-add are draft-only');
  assert.equal(control(tree, 'Custom finish Base multiplier').props.value, multiplier, 'Remove/re-add before Save retains the exact multiplier');
  assert.equal(control(tree, 'Custom finish Amount to subtract').props.value, deduction, 'Remove/re-add before Save retains the exact deduction');
  await submit(tree); tree = app.render();
  assert.equal(row(app, 73).modifierEnabled, false);
  assert.equal(row(app, 73).basePriceMultiplier, '1.5');
  // A pending/rejected table save must not destroy or replace the draft.
  app = setup(); tree = app.render();
  input(control(tree, 'Custom finish Base multiplier'), '1.33333333333333333333'); tree = app.render();
  const pending = app.deferNextSave(); const submission = submit(tree); tree = app.render();
  for (const label of ['Remove Custom finish from this series', 'Custom finish order', 'Custom finish Base multiplier']) assert.equal(disabled(tree, control(tree, label)), true, `Pending form disables ${label}`);
  assert.equal(addButton(tree).props.disabled, true, 'Pending save disables adding colors');
  assert.equal(saveButton(tree).props.disabled, true);
  const duplicate = submit(tree); assert.equal(app.requests.length, 1, 'Pending save cannot be duplicated');
  const originalError = console.error; console.error = () => {};
  try { pending.reject(new Error('Could not save these frame colors.')); await submission; await duplicate; await flush(); } finally { console.error = originalError; }
  tree = app.render();
  assert.equal(control(tree, 'Custom finish Base multiplier').props.value, '1.33333333333333333333', 'Rejected save preserves draft precision');
  assert.equal(saveButton(tree).props.disabled, false, 'Rejected draft is retryable');
  assert.ok(app.errors.includes('Could not save these frame colors.'));
  await submit(tree); tree = app.render(); assert.equal(saveButton(tree).props.disabled, true);
  assert.equal(row(app, 71).basePriceMultiplier, '1.33333333333333333333');
  // Removing the default selects another association; clearing all is allowed.
  app = setup(); tree = app.render();
  control(tree, 'Remove Custom finish from this series').props.onClick(); tree = app.render();
  assert.equal(control(tree, 'Use Existing finish as default').props.checked, true);
  control(tree, 'Remove Existing finish from this series').props.onClick(); tree = app.render();
  assert.match(text(tree), /no (associated )?frame colors|no colors/i, 'Empty associations show guidance');
  await submit(tree); tree = app.render(); assert.deepEqual(app.requests.at(-1).body.frameColors, []);
  tree = addColor(app, tree, 'New finish');
  assert.equal(control(tree, 'Use New finish as default').props.checked, true, 'First available color becomes default');
  await submit(tree);
  assert.deepEqual(row(app, 73), { frameColorId: 73, sortOrder: row(app, 73).sortOrder, isDefault: true, ...neutral });
  console.log('PASS associated frame color settings: searchable Add picker, inline modifiers, draft add/remove, defaults, exact precision, server response and pending/rejected draft retention.');
})().catch(error => { console.error(error); process.exitCode = 1; });
