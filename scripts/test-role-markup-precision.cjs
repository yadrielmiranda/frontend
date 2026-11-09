// Real role settings handlers and API payloads, without changing accounts or prices.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const sourceRoot = path.resolve(__dirname, '../src');
const jsx = (type, props) => ({ type, props });
const ui = new Proxy({}, { get: (_, name) => name });
const requests = [], notices = [];
let slots = [], cursor = 0, refreshes = 0, failSave = false;
const mocks = {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  react: { useState(initial) {
    const index = cursor++, values = slots;
    if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial;
    return [values[index], next => { values[index] = typeof next === 'function' ? next(values[index]) : next; }];
  } },
  'next/navigation': { useRouter: () => ({ refresh() { refreshes++; } }) },
  sonner: { toast: { success(message) { notices.push(message); }, error(message) { notices.push(message); } } },
  'lucide-react': ui,
  '@/app/api/_base': { apiFetch: async (url, init) => {
    requests.push({ url, ...structuredClone(init) });
    if (failSave) throw new Error('Save failed');
    return { id: 2, name: 'client', markup: '.755125', ...init.body };
  } },
};
const cache = new Map();
function load(relative) {
  const filename = path.resolve(sourceRoot, relative);
  if (cache.has(filename)) return cache.get(filename);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)(id => {
    if (id in mocks) return mocks[id];
    if (id === './_base') return mocks['@/app/api/_base'];
    if (id.startsWith('@/components/ui/')) return ui;
    if (id.startsWith('@/')) return load(id.slice(2) + '.ts');
    throw new Error('Unexpected dependency ' + id);
  }, module, module.exports);
  cache.set(filename, module.exports);
  return module.exports;
}
const { shiftDecimalString } = load('lib/markup-decimal.ts');
const { getColumns } = load('app/settings/(write)/roles/columns-roles.tsx');
const all = (node, type) => Array.isArray(node) ? node.flatMap(child => all(child, type))
  : !node?.props ? [] : [...(node.type === type ? [node] : []), ...all(node.props.children, type)];
function mount(column, role) {
  const definition = getColumns([], []).find(item => item.id === column || item.accessorKey === column);
  const cell = definition.cell({ row: { original: role } });
  const states = [];
  return () => { slots = states; cursor = 0; return cell.type(cell.props); };
}
const role = { id: 2, name: 'client', markup: '0.755125' };
const input = render => all(render(), 'Input')[0];
const edit = (render, value) => input(render).props.onChange({ target: { value } });
const save = render => all(render(), 'Button')[0].props.onClick();

(async () => {
  const render = mount('markup', role);
  assert.equal(input(render).props.value, '75.5125');
  assert.equal(input(render).props.inputMode, 'decimal');
  edit(render, '75.5125'); await save(render);
  assert.deepEqual(requests.pop(), { url: '/api/roles/2', method: 'PATCH', body: { markup: '0.755125' } });
  assert.equal(input(render).props.value, '75.5125');
  assert.equal(input(mount('markup', role)).props.value, '75.5125', 'Reopening must preserve the saved percentage');
  assert.equal(refreshes, 1);
  console.log('PASS 75.5125% keeps all digits when loaded, saved as 0.755125, and reopened');

  for (const [percentage, ratio] of [
    ['0', '0'], ['15.00', '0.15'], ['-75.5125', '-0.755125'], ['-100', '-1'],
    ['.25', '0.0025'], ['75.5123456789012345', '0.755123456789012345'],
    ['99999999.9999999999999999', '999999.999999999999999999'],
    ['-99999999.9999999999999999', '-999999.999999999999999999'],
    ['0.0000000000000001', '0.000000000000000001'],
  ]) {
    edit(render, percentage); await save(render);
    assert.equal(requests.pop().body.markup, ratio);
    assert.equal(shiftDecimalString(input(render).props.value, -2), ratio);
  }
  assert.equal(input(mount('markup', { ...role, markup: '1e-18' })).props.value, '0.0000000000000001');
  assert.equal(input(mount('markup', { ...role, markup: -1e-8 })).props.value, '-0.000001');
  console.log('PASS signed and high-precision percentages travel as exact decimal strings, including small stored exponents');

  for (const invalid of ['', 'NaN', 'Infinity', '75.5125extra', '1e3', '75,5125',
    '1.12345678901234567', '100000000', '-100000000']) {
    edit(render, invalid); await save(render);
    assert.equal(requests.length, 0, `Invalid value must not be partially saved: ${invalid}`);
    assert.equal(input(render).props.value, invalid);
  }
  failSave = true;
  edit(render, '75.512345'); await save(render);
  assert.equal(requests.pop().body.markup, '0.75512345');
  assert.equal(input(render).props.value, '75.512345', 'A failed save must preserve the draft');
  assert.equal(input(render).props.disabled, false);
  assert.equal(notices.at(-1), 'Save failed');
  failSave = false;
  console.log('PASS invalid values and failed saves cannot silently round or replace the entered percentage');

  // Use an old row value: changing another role setting must not resend that stale markup.
  const staleRole = { ...role, markup: '0.7551' };
  for (const [column, field] of [['paymentPlan', 'paymentPlanId'], ['installationProfile', 'installationPriceProfileId']]) {
    const renderOther = mount(column, staleRole);
    await all(renderOther(), 'Select')[0].props.onValueChange('7');
    assert.deepEqual(requests.pop().body, { [field]: 7 });
    await all(renderOther(), 'Select')[0].props.onValueChange('DEFAULT');
    assert.deepEqual(requests.pop().body, { [field]: null });
  }
  console.log('PASS payment plan and installation profile updates omit markup, preserving newer or high-precision values');
})().catch(error => { console.error(error); process.exitCode = 1; });
