// Exercise the real page guards and rendered financial controls without a database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sourceRoot = path.resolve(__dirname, '../src');
let currentUser = null;
let financialReads = 0;
const manufacturers = [{ id: 4, name: 'Example manufacturer', active: true, isDefault: true }];
const baseOrder = {
  orderId: 1, orderNumber: 'ORD-1', orderDate: '2026-11-09T00:00:00.000Z', projectName: 'Sample project',
  poNumber: '294137', imported: true, manufacturer: null, accountId: null, version: null,
  factoryTotal: '40000.00', importedTotal: '40000.00', sourceCostChanged: false,
  paid: '41001.27', remaining: '-1001.27', status: 'CREDIT',
};
const list = {
  rows: [baseOrder, { ...baseOrder, orderId: 2, orderNumber: 'ORD-2', projectName: 'Awaiting import',
    imported: false, factoryTotal: null, importedTotal: null, paid: '0.00', remaining: null, status: 'PENDING_IMPORT' }],
  total: 2, page: 1, pageSize: 25,
  summary: { factoryTotal: '40000.00', paid: '41001.27', remaining: '0.00', credit: '1001.27' },
};
const children = ({ children }) => React.createElement(React.Fragment, null, children);
const Button = ({ children, asChild, variant, size, ...props }) => asChild ? children : React.createElement('button', props, children);
const Dialog = ({ open, children }) => open ? React.createElement(React.Fragment, null, children) : null;
const ui = {
  Button, Input: props => React.createElement('input', props), Dialog,
  DialogContent: children, DialogTitle: children, DialogDescription: children, DialogFooter: children, DialogHeader: children,
};
const api = new Proxy({
  getFactoryManufacturers: async () => { financialReads++; return manufacturers; },
  getFactoryPaymentOrders: async () => { financialReads++; return list; },
}, { get(target, key) { return key in target ? target[key] : () => { throw new Error(`Unexpected API call: ${String(key)}`); }; } });
const mocks = {
  'next/navigation': { notFound: () => { throw new Error('NOT_FOUND'); } },
  'next/link': { __esModule: true, default: ({ children, href }) => React.createElement('a', { href }, children) },
  'lucide-react': new Proxy({}, { get: () => () => null }),
  sonner: { toast: {} },
  '@/lib/session': { getCurrentUser: async () => currentUser },
  '@/app/api/factory-payments.api': api,
  '@/app/api/orders.api': { getOrders: async () => [] },
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
    if (id === './orders-client') return { OrdersClient: () => null };
    const resolved = id.startsWith('@/') ? path.join(sourceRoot, id.slice(2)) : path.resolve(path.dirname(filename), id);
    for (const extension of ['.ts', '.tsx']) if (fs.existsSync(resolved + extension)) return load(path.relative(sourceRoot, resolved + extension));
    throw new Error(`Unexpected dependency: ${id}`);
  }, exported);
  return exported;
}
async function main() {
  const page = load('app/orders/factory-payments/page.tsx').default;
  const ordersPage = load('app/orders/page.tsx').default;
  for (const role of [null, 'client', 'dealer', 'operator', 'technician']) {
    currentUser = role ? { id: 1, role: { name: role } } : null;
    financialReads = 0;
    await assert.rejects(page, /NOT_FOUND/);
    assert.equal(financialReads, 0, `${role} must not read manufacturer balances`);
    if (role) assert.doesNotMatch(renderToStaticMarkup(await ordersPage({ searchParams: Promise.resolve({}) })), /factory-payments/);
  }
  currentUser = { id: 1, role: { name: 'admin' } };
  financialReads = 0;
  const html = renderToStaticMarkup(await page());
  assert.equal(financialReads, 2);
  assert.match(renderToStaticMarkup(await ordersPage({ searchParams: Promise.resolve({}) })), /href="\/orders\/factory-payments"/);
  assert.match(html, /Credit balance/);
  assert.match(html, /-\$1,001\.27/, 'Credit must not be clamped to zero');
  assert.match(html, /Pending PO import/);
  const awaiting = html.slice(html.indexOf('ORD-2'), html.indexOf('</tr>', html.indexOf('ORD-2')));
  assert.match(awaiting, /—/, 'Unknown factory cost and balance must remain unknown');
  assert.doesNotMatch(html, /type="file"|surcharge|total amount|add po/i);
  const { PaymentDialog } = load('app/orders/factory-payments/payment-dialog.tsx');
  const form = order => renderToStaticMarkup(React.createElement(PaymentDialog, { order, manufacturers, onClose() {}, onSaved() {} }));
  const eligible = { ...baseOrder, paid: '0.00', remaining: '40000.00', status: 'UNPAID' };
  const enabled = form(eligible);
  assert.match(enabled, /Amount \(USD\)/);
  assert.match(enabled, /Invoice number/);
  assert.doesNotMatch(enabled, /type="file"|surcharge|total amount/i);
  assert.match(enabled, /<button type="submit">Record payment<\/button>/);
  for (const blocked of [{ ...eligible, imported: false }, { ...eligible, sourceCostChanged: true }]) {
    assert.match(form(blocked), /<button type="submit" disabled="">Record payment<\/button>/);
  }
  const { factoryMoney, factoryDate, newFactoryPaymentRequestId } = load('lib/factory-payments.ts');
  assert.equal(factoryMoney(null), '—');
  assert.equal(factoryMoney('0.00'), '$0.00');
  assert.equal(factoryDate('2026-11-09'), '11/09/2026');
  const fallbackId = newFactoryPaymentRequestId({ getRandomValues: bytes => { bytes.fill(255); return bytes; } });
  assert.match(fallbackId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    'HTTP local installations without randomUUID must still generate UUIDv4 payment IDs');
  assert.equal(newFactoryPaymentRequestId({ randomUUID: () => 'provided-id' }), 'provided-id');
  assert.throws(() => newFactoryPaymentRequestId({}), /Could not prepare the payment/);
  console.log('PASS: Factory Payments is admin-only; unknown balances and credit render correctly; payment fields are data-only; unimported or changed PO totals block registration.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
