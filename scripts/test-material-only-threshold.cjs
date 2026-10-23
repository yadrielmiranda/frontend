// Offline checks of the real settings handlers and schedule rendering. No API or database calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const jsx = (type, props) => ({ type, props });
const ui = new Proxy({}, { get: (_, name) => name });
let states = [], cursor = 0, calls = [], errors = [], refreshes = 0;
const mocks = {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  react: {
    useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
    useEffect() {}, useRef(initial) { return { current: initial }; },
  },
  'next/navigation': { useRouter: () => ({ refresh() { refreshes++; } }) },
  'lucide-react': ui,
  sonner: { toast: { success() {}, error(value) { errors.push(value); } } },
  '@/app/api/global-parameters.api': { async updateGlobalParameter(key, data) { calls.push({ key, data }); } },
};
function load(relative) {
  const filename = path.resolve(__dirname, '../src', relative);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  new Function('require', 'exports', code)(id => {
    if (id === '@/lib/formatters') return load('lib/formatters.ts');
    if (id.startsWith('@/components/ui/')) return ui;
    assert.ok(id in mocks, `Unexpected dependency: ${id}`);
    return mocks[id];
  }, exports);
  return exports;
}
const { columns } = load('app/settings/(write)/global-parameters/columns-global-parameters.tsx');
const { PaymentScheduleView } = load('components/payments/payment-schedule.tsx');
const expand = node => !node || typeof node !== 'object' ? node : Array.isArray(node) ? node.map(expand)
  : typeof node.type === 'function' ? expand(node.type(node.props)) : { ...node, props: { ...node.props, children: expand(node.props?.children) } };
const all = (node, predicate) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(child => all(child, predicate)) : [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
const text = node => node == null || node === false ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
const key = 'MATERIAL_ONLY_UPFRONT_THRESHOLD';
let parameter;
const reset = (overrides = {}) => {
  states = []; calls = []; errors = []; refreshes = 0;
  parameter = { key, value: 0, unit: 'USD', description: 'An explanation from the API', ...overrides };
};
const cell = (name) => {
  cursor = 0;
  const column = columns.find(column => column.accessorKey === name);
  return expand(column.cell ? column.cell({ row: { original: parameter } }) : parameter[column.accessorKey]);
};
const change = value => all(cell('value'), node => node.type === 'Input')[0].props.onChange({ target: { value } });
const save = () => all(cell('value'), node => node.type === 'Button')[0].props.onClick();
let checks = 0;
async function test(name, run) { await run(); checks++; console.log(`PASS ${name}`); }
(async () => {
  await test('shows the parameter key, API description and USD input', () => {
    reset();
    assert.equal(text(cell('key')), key);
    assert.equal(cell('description'), parameter.description);
    const input = all(cell('value'), node => node.type === 'Input')[0];
    assert.equal(input.props.value, '0');
    assert.equal(input.props.min, '0');
    assert.equal(input.props.max, '999999.99');
    assert.equal(input.props['aria-label'], key);
    assert.match(text(cell('value')), /USD/);
  });
  for (const amount of ['0', '1250.50', '999999.99']) {
    await test(`saves configured amount ${amount} instead of a hardcoded amount`, async () => {
      reset(); change(amount); await save();
      assert.deepEqual(calls, [{ key, data: { value: String(Number(amount)) } }]);
      assert.equal(errors.length, 0); assert.equal(refreshes, 1);
    });
  }
  for (const amount of ['', ' ', '-1', '1.001', '1000000', 'Infinity', 'NaN', '1e2', '12abc']) {
    await test(`rejects ${JSON.stringify(amount)} before attempting a save`, async () => {
      reset(); change(amount); await save();
      assert.equal(calls.length, 0); assert.equal(errors.length, 1); assert.equal(refreshes, 0);
    });
  }
  await test('preserves unrelated parameter descriptions and percentage conversion', async () => {
    reset({ key: 'SALES_TAX', value: 0.07, unit: '%', description: 'Existing tax description' });
    assert.equal(text(cell('description')), 'Existing tax description');
    change('7.25'); await save();
    assert.deepEqual(calls, [{ key: 'SALES_TAX', data: { value: '0.0725' } }]);
  });
  await test('schedule displays supplied installments without exposing the internal rule', () => {
    const schedule = { name: 'Plan', provisional: false, total: '400', paid: '0', balance: '400',
      depositPaid: '0', permitPaid: '0', creditBalance: '0', rows: [{ sequence: 1, title: 'Place order',
        description: '100% materials', amount: '400', paid: '0', credit: '0', balance: '400', status: 'DUE' }] };
    const rendered = PaymentScheduleView({ schedule });
    assert.match(text(rendered), /\$400\.00/);
    assert.doesNotMatch(text(rendered), /threshold|limit saved|at or below|material-only/);
  });
  console.log(`${checks} material-only threshold UI checks passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
