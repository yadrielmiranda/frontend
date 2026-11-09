// Render real estimate/order list cells: incomplete earnings cannot become a stale profit or $0.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sourceRoot = path.resolve(__dirname, '../src');
const childrenOnly = ({ children }) => React.createElement(React.Fragment, null, children);
const stub = new Proxy({}, { get: () => () => null });
const ui = new Proxy({}, { get: () => childrenOnly });
const actual = new Set([
  'lib/rbac.ts', 'lib/formatters.ts', 'lib/estimate-status.ts', 'lib/order-po.ts',
  'components/estimates/estimate-cost-columns.tsx',
]);
const mocks = {
  'next/link': { __esModule: true, default: childrenOnly },
  'next/navigation': { useRouter: () => ({}) },
  'lucide-react': stub,
  sonner: { toast: {} },
  '@/components/orders/order-status-badge': {
    OrderStatusBadge: ({ name }) => React.createElement('span', null, name),
  },
};
const cache = new Map();
function load(relative) {
  const filename = path.resolve(sourceRoot, relative);
  if (cache.has(filename)) return cache.get(filename);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exported = {};
  cache.set(filename, exported);
  new Function('require', 'exports', output)(id => {
    if (id in mocks) return mocks[id];
    if (id === 'react' || id === 'react/jsx-runtime') return require(id);
    if (id.startsWith('@/components/ui/')) return ui;
    const resolved = id.startsWith('@/') ? path.join(sourceRoot, id.slice(2)) : path.resolve(path.dirname(filename), id);
    const name = path.relative(sourceRoot, resolved).split(path.sep).join('/');
    for (const extension of ['.ts', '.tsx']) if (actual.has(name + extension)) return load(name + extension);
    if (id.startsWith('@/components/') || id.startsWith('@/app/api/') || id.startsWith('.')) return stub;
    throw new Error(`Unexpected dependency ${id}`);
  }, exported);
  return exported;
}
const { getEstimateColumns } = load('components/estimates/estimates-columns.tsx');
const { getOrderColumns } = load('app/orders/columns-orders.tsx');
const admin = { id: 1, role: { name: 'admin' } };
const review = {
  status: 'PENDING_REVIEW', code: 'INVALID_SAVED_EARNINGS_PLAN',
  message: 'Earnings pending review. The saved earnings plan is missing or invalid.',
};
const source = {
  id: 10, idUser: 7, number: '1001', status: { name: 'Active' },
  priceT: '1200.00', taxAmount: '84.00', customerTotalPayable: '1605.00',
  netProfit: '999.00', netProfitD: '888.00', dealerModeSnapshot: 'INTERNAL',
  dealerEarnings: null, materialProfits: null, earningsReview: review,
};
const renderCell = (columns, key, original) => {
  const column = columns.find(item => (item.id ?? item.accessorKey) === key);
  assert(column, `Missing column ${key}`);
  const getValue = field => {
    const definition = columns.find(item => (item.id ?? item.accessorKey) === field);
    return definition?.accessorFn ? definition.accessorFn(original) : original[field];
  };
  return renderToStaticMarkup(React.createElement(column.cell, { row: { original, getValue } }));
};
const columns = getEstimateColumns(admin);
for (const dealerNetwork of [null, { level: 'DEALER', materialProfit: '777.00' }]) {
  const estimate = { ...source, dealerNetwork };
  const before = JSON.stringify(estimate);
  assert.match(renderCell(columns, 'status', estimate), /Active.*Earnings pending review/);
  for (const key of ['netProfit', 'netProfitD']) {
    const html = renderCell(columns, key, estimate);
    assert.match(html, /Pending review/);
    assert.doesNotMatch(html, /\$[\d,]+\.\d\d/, 'Unknown earnings must not use saved margins or format null as zero');
  }
  assert.match(renderCell(columns, 'priceT', estimate), /\$1,200\.00/);
  assert.match(renderCell(columns, 'taxAmount', estimate), /\$84\.00/);
  assert.equal(JSON.stringify(estimate), before, 'Rendering must not change persisted totals');
}
const healthy = { ...source, earningsReview: undefined };
assert.match(renderCell(columns, 'netProfit', healthy), /\$999\.00/);
assert.match(renderCell(columns, 'netProfitD', healthy), /\$888\.00/);
assert.doesNotMatch(renderCell(columns, 'status', healthy), /pending review/i);
for (const name of ['client', 'dealer', 'operator']) {
  assert.doesNotMatch(renderCell(getEstimateColumns({ id: 7, role: { name } }), 'status', source), /pending review/i);
}
const order = { id: 5, number: '2001', status: { name: 'Pending' }, estimate: source,
  netProfitReal: '600.00', earningsReview: review };
const orderColumns = role => getOrderColumns({ canEdit: false, canViewFinancials: role === 'admin', currentUserId: 1, currentUserRole: role });
assert.match(renderCell(orderColumns('admin'), 'status.name', order), /Earnings pending review/);
assert.match(renderCell(orderColumns('admin'), 'netProfitReal', order), /\$600\.00/,
  'Recorded gross sale minus factory cost is independent of the missing earnings allocation');
assert.match(renderCell(orderColumns('admin'), 'priceT', order), /\$1,200\.00/);
for (const role of ['client', 'dealer', 'operator']) {
  assert.doesNotMatch(renderCell(orderColumns(role), 'status.name', order), /pending review/i);
}
console.log('PASS: estimate/order list warnings are admin-only; missing earnings display Pending review, preserve costs, and never display stale profit or zero.');
