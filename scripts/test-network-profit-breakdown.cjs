// Render real profit components and exercise the editor's saved-data refresh callbacks.
// Run: node scripts/test-network-profit-breakdown.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '../src');
const childrenOnly = ({ children }) => React.createElement(React.Fragment, null, children);
const blank = () => null;
const ui = new Proxy({}, { get: () => childrenOnly });
const stub = new Proxy({}, { get: () => blank });
const markers = {
  DealerEarningsSummaryCard: () => React.createElement('p', null, 'Legacy earnings'),
  DealerProfitSummary: () => React.createElement('p', null, 'Legacy profit'),
};
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
const mocks = {
  '@/lib/formatters': { formatMoney: money, roundMoney: value => Math.round(value * 100) / 100, formatDateEn: () => 'Today' },
  './formatters': { roundMoney: value => Math.round(value * 100) / 100 },
  '@/lib/installation-flow': { paidBaseFor: () => 0, paidInstallationCredit: () => 0 },
  '@/lib/installation-service-totals': { additionalServiceTotals: () => [] },
  '@/lib/estimate-customer-promotions': { customerCanSeePromotions: () => true },
  'next/link': { __esModule: true, default: childrenOnly },
  'lucide-react': stub,
};
const actualFiles = new Set([
  'lib/rbac.ts', 'lib/dealer-service-earnings.ts', 'lib/customer-charge-additions.ts',
  'components/estimates/network-profit-breakdown-card.tsx',
]);
const cache = new Map();
function load(relative) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const exported = {};
  cache.set(filename, exported);
  new Function('require', 'exports', source)(name => {
    if (name in mocks) return mocks[name];
    if (name === 'react' || name === 'react/jsx-runtime') return require(name);
    if (name.startsWith('@/components/ui/')) return ui;
    if (/dealer-(earnings|profit)-summary$/.test(name)) return markers;
    const resolved = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(filename), name);
    const relativeName = path.relative(root, resolved).split(path.sep).join('/');
    for (const ext of ['.ts', '.tsx']) if (actualFiles.has(relativeName + ext)) return load(relativeName + ext);
    if (name.startsWith('@/components/') || name.startsWith('.')) return stub;
    throw new Error(`Unexpected dependency ${name} in ${relative}`);
  }, exported);
  return exported;
}
const Card = load('components/estimates/network-profit-breakdown-card.tsx').NetworkProfitBreakdownCard;
const Financial = load('components/estimates/estimate-financial-summary.tsx').EstimateFinancialSummary;
const Report = load('components/estimates/estimate-details/parts/report-financial-summary.tsx').ReportFinancialSummary;
const Orders = load('app/orders/[id]/order-details.tsx').OrderDetails;
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const amount = value => ({ amount: String(value), status: 'CALCULATED' });
const pending = { amount: null, status: 'PENDING_REAL_COST' };
const breakdown = {
  version: 1,
  members: [
    { userId: 3, username: 'Distributor Three', level: 'DISTRIBUTOR', mode: 'INTERNAL', material: amount(105), services: amount(30), total: amount(135) },
    { userId: 2, username: 'Subdealer Two', level: 'SUBDEALER', mode: 'INTERNAL', material: amount(72), services: amount(0), total: amount(72) },
    { userId: 1, username: 'Dealer One', level: 'DEALER', mode: 'INTERNAL', material: amount(55), services: amount(0), total: amount(55) },
  ],
  company: { materialExpected: amount(170), materialReal: pending, installation: amount(60), expectedTotal: amount(230) },
};
const earnings = { status: 'CALCULATED', amount: '135', basis: 'AVAILABLE_PROFIT', percent: '100', label: 'Profit' };
const financialProps = {
  ownerRole: 'dealer', dealerMode: 'INTERNAL', dealerEarnings: earnings, subdealerEarnings: earnings,
  ownerIsTaxExempt: false, taxRate: 0, customerTaxRatePercent: 0,
  materialSummary: { totalUnits: 1, pieceBreakdown: {}, subtotal: 1000, taxAmount: 0, totalPayable: 1000,
    dealerTotal: 1200, dealerTaxAmount: 0, dealerGrandTotal: 1200, dealerProfit: 200 },
  installationJob: null, customerChargesSummary: null, networkProfitBreakdown: breakdown,
};
const estimate = {
  id: 10, number: '1000', name: 'Network example', user: { role: { name: 'dealer' } },
  dealerModeSnapshot: 'INTERNAL', dealerEarnings: earnings, subdealerEarnings: earnings,
  priceT: 1000, taxRate: 0, taxAmount: 0, totalPayable: 1000,
  customerPriceT: 1200, customerTaxRate: 0, customerTaxAmount: 0, customerTotalPayable: 1200,
  rateT: 800, networkProfitBreakdown: breakdown,
};
const orderProps = {
  order: { number: '2000', estimate, user: estimate.user, dealerModeSnapshot: 'INTERNAL',
    dealerEarnings: earnings, subdealerEarnings: earnings, networkProfitBreakdown: breakdown },
  installation: null, isOwner: false, currentUserId: 9, isPrivileged: true, isAdmin: true,
  canEdit: false, canViewFinancials: false, cardSurchargeFraction: 0, canRecordManualPayment: false,
};
const tests = [];
const test = (name, run) => tests.push({ name, run });

test('admin card shows each saved participant in server order and separate company margin', () => {
  const html = render(Card, { breakdown, isAdmin: true });
  for (const expected of ['Profit by participant', 'Distributor Three', 'Subdealer Two', 'Dealer One', 'Company', '$135.00', '$72.00', '$55.00', '$230.00']) assert.ok(html.includes(expected), expected);
  assert.ok(html.indexOf('Distributor Three') < html.indexOf('Subdealer Two'));
  assert.ok(html.indexOf('Subdealer Two') < html.indexOf('Dealer One'));
  assert.match(html, /before card processing fees/);
  assert.match(html, /other service margins are not included/);
});

test('pending amount is distinct from a calculated zero and cannot display a stale value', () => {
  const value = structuredClone(breakdown);
  value.members[0].material = { amount: '999', status: 'PENDING_REAL_COST' };
  value.members[0].total = pending;
  const html = render(Card, { breakdown: value, isAdmin: true });
  assert.match(html, /Pending real cost/);
  assert.match(html, /\$0\.00/);
  assert.doesNotMatch(html, /\$999\.00/);
  const dirty = render(Card, { breakdown, isAdmin: true, pendingChanges: true });
  assert.match(dirty, /Pending update/);
  assert.doesNotMatch(dirty, /\$[\d,]+\.\d\d/);
});

test('user names remain escaped text and invalid numbers never appear as money', () => {
  const value = structuredClone(breakdown);
  value.members[0].username = '<script>alert("secret")</script>';
  value.members[0].total = amount('invalid');
  const html = render(Card, { breakdown: value, isAdmin: true });
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|NaN/);
  assert.match(html, /Pending confirmation/);
});

test('card denies all nonadmin callers even when the full payload is present', () => {
  assert.equal(render(Card, { breakdown, isAdmin: false }), '');
  assert.equal(render(Card, { breakdown }), '');
  assert.equal(render(Card, { isAdmin: true, breakdown: null }), '');
});

test('estimate edit replaces legacy cards only for admin with a saved breakdown', () => {
  const admin = render(Financial, { ...financialProps, isAdmin: true });
  assert.match(admin, /Profit by participant/);
  assert.doesNotMatch(admin, /Legacy earnings|Legacy profit/);
  for (const props of [{ isAdmin: false }, { isAdmin: true, networkProfitBreakdown: null }]) {
    const html = render(Financial, { ...financialProps, ...props });
    assert.doesNotMatch(html, /Profit by participant|Distributor Three/);
    assert.match(html, /Legacy earnings/);
  }
});

test('material and service edits both hide stale participant amounts until refresh', () => {
  for (const pendingProp of ['earningsPending', 'serviceEarningsPending']) {
    const html = render(Financial, { ...financialProps, isAdmin: true, [pendingProp]: true });
    const participantSection = html.slice(html.indexOf('aria-label="Profit by participant"'));
    assert.match(participantSection, /Pending update/);
    assert.doesNotMatch(participantSection, /\$135\.00|\$230\.00/);
  }
});

test('View Details requires an admin viewer and admin report selection', () => {
  const admin = render(Report, { estimate, reportKind: 'admin', isAdmin: true });
  assert.match(admin, /Profit by participant/);
  assert.doesNotMatch(admin, /Legacy earnings|Legacy profit/);
  for (const reportKind of ['dealer', 'dealer-customer', 'dealer-customer-total', 'client']) {
    assert.doesNotMatch(render(Report, { estimate, reportKind, isAdmin: true }), /Profit by participant|Distributor Three/);
  }
  const operator = render(Report, { estimate, reportKind: 'admin', isAdmin: false });
  assert.doesNotMatch(operator, /Profit by participant|Distributor Three/);
  assert.match(operator, /Legacy earnings/);
});

test('order details require admin; privileged operators preserve their prior cards', () => {
  assert.match(render(Orders, orderProps), /Profit by participant/);
  assert.doesNotMatch(render(Orders, orderProps), /Legacy earnings/);
  const operator = render(Orders, { ...orderProps, isAdmin: false });
  assert.doesNotMatch(operator, /Profit by participant|Distributor Three/);
  assert.match(operator, /Legacy earnings/);
});

// Execute the actual editor callbacks with API stubs; assertions concern user-visible saved state.
const editorFile = path.join(root, 'components/estimates/estimate-form.tsx');
const editorAst = ts.createSourceFile(editorFile, fs.readFileSync(editorFile, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function expression(name) {
  let found;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(editorAst) === name) found = node.initializer.getText(editorAst);
    ts.forEachChild(node, visit);
  }
  visit(editorAst);
  assert.ok(found, name);
  return found;
}
function callback(name, scope) {
  const code = ts.transpileModule(`const callback = ${expression(name)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  return new Function(...Object.keys(scope), code + '\nreturn callback;')(...Object.values(scope));
}
test('saving a discount and approving an installation quote replace the complete profit snapshot', async () => {
  for (const name of ['onDiscountSaved', 'refreshAfterQuoteApproval']) {
    let state;
    const updated = { ...estimate, networkProfitBreakdown: { ...breakdown, company: { ...breakdown.company, expectedTotal: amount(999) } }, pieces: [] };
    const scope = { estimate, getEstimate: async () => updated, replace() {}, mapEstimatePieceToForm: x => x,
      setPromotionEstimate() {}, setCustomerChargesSummary() {}, setDiscountDirty() {}, router: { refresh() {} },
      setDiscountData: value => { state = value; } };
    await callback(name, scope)(updated);
    assert.equal(state.networkProfitBreakdown.company.expectedTotal.amount, '999');
    assert.equal(state.dealerEarnings, updated.dealerEarnings);
  }
});

test('discount refresh uses only the latest server reply and removes unavailable breakdown data', async () => {
  let state = { networkProfitBreakdown: breakdown }, resolveFirst;
  const first = new Promise(resolve => { resolveFirst = resolve; });
  let calls = 0;
  const scope = { estimate, useCallback: fn => fn, discountRequestGeneration: { current: 0 },
    setDiscountLoading() {}, setDiscountError() {}, setDiscountData: value => { state = value; },
    getEstimateDiscount: () => ++calls === 1 ? first : Promise.resolve({ networkProfitBreakdown: null }) };
  const refresh = callback('refreshDiscountData', scope);
  const earlier = refresh();
  await refresh();
  resolveFirst({ networkProfitBreakdown: breakdown });
  await earlier;
  assert.equal(state.networkProfitBreakdown, null);
});

(async () => {
  for (const { name, run } of tests) { await run(); console.log(`PASS ${name}`); }
  console.log(`${tests.length} network profit UI tests passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
