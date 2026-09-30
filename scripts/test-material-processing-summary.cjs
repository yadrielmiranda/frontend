/* Isolated rendering of the real summaries with installed React/ReactDOM.
 * API/payment components are stubs: no browser, database, Stripe or network.
 * Run from frontend: node scripts/test-material-processing-summary.cjs */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '../src');
const cache = new Map();
const empty = () => null;
const passthrough = ({ children }) => React.createElement('div', null, children);
const stubs = {
  'next/link': { __esModule: true, default: passthrough },
  '@/components/ui/button': { Button: passthrough },
  '@/components/estimates/estimate-payment-card': { EstimatePaymentCard: empty },
  '@/components/orders/order-status-badge': { OrderStatusBadge: empty },
  '@/components/orders/order-installation-panel': { OrderInstallationPanel: empty },
  '@/components/orders/order-extra-charges-panel': { OrderExtraChargesPanel: empty },
  '@/components/orders/order-material-panel': { OrderMaterialPanel: empty },
  '@/components/orders/order-delivery-panel': { OrderDeliveryPanel: empty },
  '@/components/payments/payment-schedule': { PaymentScheduleView: empty },
  '../../manual-discount-summary': { ManualDiscountSummary: empty },
  '../../dealer-profit-summary': { DealerProfitSummary: empty },
  '@/components/promotions/promotion-price': { OriginalPrice: empty },
  '@/lib/estimate-customer-promotions': { customerCanSeePromotions: () => true },
};
function load(relativeFile) {
  const filename = path.resolve(root, relativeFile);
  if (cache.has(filename)) return cache.get(filename);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => {
    if (id === 'react' || id === 'react/jsx-runtime') return require(id);
    if (Object.hasOwn(stubs, id)) return stubs[id];
    const target = id.startsWith('@/') ? path.resolve(root, id.slice(2))
      : id.startsWith('.') ? path.resolve(path.dirname(filename), id) : null;
    if (!target) throw new Error(`Unexpected dependency: ${id}`);
    const resolved = ['.ts', '.tsx'].map(extension => target + extension).find(file => fs.existsSync(file));
    if (!resolved) throw new Error(`Unresolved dependency: ${id}`);
    return load(path.relative(root, resolved));
  }, module, module.exports);
  cache.set(filename, module.exports);
  return module.exports;
}
const { MaterialProfitAdjustments } = load('components/estimates/material-profit-adjustments.tsx');
const { DealerEarningsSummaryCard } = load('components/estimates/dealer-earnings-summary.tsx');
const { OrderDetails } = load('app/orders/[id]/order-details.tsx');
const { ReportFinancialSummary } = load('components/estimates/estimate-details/parts/report-financial-summary.tsx');
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const profits = { expectedProfit: '180.00', realProfit: '200.00', netProfitD: '80.00',
  processingCost: '5.50', processingCostStatus: 'CONFIRMED', netRealProfit: '194.50',
  authenticExpectedProfit: '140.00', authenticRealProfit: '154.50' };
const earnings = { planId: 1, planName: 'Saved plan', basis: 'REAL_PROFIT', percent: '20',
  label: 'Saved plan', status: 'CALCULATED', amount: '40.00' };
function estimate(overrides = {}) {
  return { id: 1, number: 63, name: 'Fixture', user: { id: 3, username: 'dealer', role: { name: 'dealer' } },
    dealerModeSnapshot: 'INTERNAL', rateT: '120.00', priceT: '220.00', customerPriceT: '300.00',
    totalPayable: '220.00', customerTotalPayable: '300.00', taxRate: '0', customerTaxRate: '0',
    dealerEarnings: earnings, materialProfits: profits, payments: [], ...overrides };
}
function order(overrides = {}) {
  return { id: 24, idEst: 1, units: 1, userId: 3, user: { username: 'dealer', role: { name: 'dealer' } },
    status: { name: 'Ordered' }, estimate: estimate(), createdAt: '2026-10-01T00:00:00.000Z',
    dealerModeSnapshot: 'INTERNAL', rate: '120.00', rateReal: '100.00', saleSubtotal: '300.00',
    netProfit: '180.00', netProfitReal: '200.00', dealerEarnings: earnings, materialProfits: profits, ...overrides };
}
function orderView(value, canViewFinancials) {
  return render(OrderDetails, { order: value, installation: null, currentUserId: 3, isOwner: true,
    isPrivileged: canViewFinancials, isAdmin: canViewFinancials, canViewFinancials, canEdit: false,
    cardSurchargeFraction: 0, canRecordManualPayment: false });
}
function reportView(value, reportKind) {
  return render(ReportFinancialSummary, { estimate: value, reportKind, showPaymentSchedule: false });
}
const tests = [];
const test = (name, run) => tests.push({ name, run });
test('staff sees the separate confirmed processing cost, net profit and company remainder supplied by the backend', () => {
  const html = render(MaterialProfitAdjustments, { profits, showDealerEarnings: true });
  for (const text of ['Material processing cost', '$5.50', 'Net real material profit', '$194.50',
    'Company real profit after processing costs and dealer earnings', '$154.50']) assert.ok(html.includes(text), text);
});
test('a confirmed zero processing cost remains an explicit zero', () => {
  const html = render(MaterialProfitAdjustments, { profits: { ...profits, processingCost: '0.00', netRealProfit: '200.00' }, showDealerEarnings: false });
  assert.ok(html.includes('$0.00')); assert.ok(html.includes('$200.00')); assert.ok(!html.includes('Pending'));
});
test('unconfirmed processing costs and net profits stay pending instead of displaying zero', () => {
  const html = render(MaterialProfitAdjustments, { profits: { ...profits, processingCost: null,
    processingCostStatus: 'PENDING', netRealProfit: null, authenticRealProfit: null }, showDealerEarnings: true });
  assert.ok(html.includes('Pending processing cost confirmation')); assert.ok(!html.includes('$0.00'));
  assert.ok(!html.includes('$194.50')); assert.ok(!html.includes('$154.50'));
});
test('a missing factory cost leaves net profit pending after the processing cost is confirmed', () => {
  const html = render(MaterialProfitAdjustments, { profits: { ...profits, realProfit: null,
    netRealProfit: null, authenticRealProfit: null }, showDealerEarnings: true });
  assert.ok(html.includes('$5.50')); assert.ok(html.includes('Pending real factory cost')); assert.ok(!html.includes('$0.00'));
});
test('negative net and company profits are not clamped to zero', () => {
  const html = render(MaterialProfitAdjustments, { profits: { ...profits, netRealProfit: '-5.50', authenticRealProfit: '-10.50' }, showDealerEarnings: true });
  assert.ok(html.includes('-$5.50')); assert.ok(html.includes('-$10.50'));
});
test('older summaries without processing fields keep the existing company presentation', () => {
  const { processingCost, processingCostStatus, netRealProfit, ...legacy } = profits;
  const html = render(MaterialProfitAdjustments, { profits: legacy, showDealerEarnings: true });
  assert.ok(html.includes('Company real profit after dealer earnings')); assert.ok(!html.includes('processing'));
});
test('the shared dealer card uses only a generic pending message for unconfirmed costs', () => {
  const html = render(DealerEarningsSummaryCard, { earnings: { ...earnings, status: 'PENDING_COST', amount: null } });
  assert.ok(html.includes('Dealer material earnings')); assert.ok(html.includes('Earnings pending confirmation'));
  assert.ok(!/Stripe|processing|factory|card cost/i.test(html)); assert.ok(!html.includes('$0.00'));
});
test('the dealer card continues showing the supplied confirmed earnings without processing details', () => {
  const html = render(DealerEarningsSummaryCard, { earnings });
  assert.ok(html.includes('$40.00')); assert.ok(!/Stripe|processing|Net real/i.test(html));
});
test('an authorized order view distinguishes gross and net real material profits', () => {
  const html = orderView(order(), true);
  for (const text of ['Gross real material profit', '$200.00', 'Material processing cost', '$5.50', 'Net real material profit', '$194.50']) assert.ok(html.includes(text), text);
});
test('an order without financial permission never renders processing details, even with a staff-shaped payload', () => {
  const html = orderView(order(), false);
  assert.ok(html.includes('Dealer material earnings')); assert.ok(html.includes('$40.00'));
  assert.ok(!/processing|Gross real|Net real|Company real/i.test(html)); assert.ok(!html.includes('$5.50'));
});
for (const mode of ['EXTERNAL', null]) {
  test(`an authorized ${mode ?? 'DIRECT CLIENT'} order shows costs without inventing dealer earnings`, () => {
    const html = orderView(order({ dealerModeSnapshot: mode, dealerEarnings: null }), true);
    assert.ok(html.includes('Material processing cost')); assert.ok(html.includes('Net real material profit'));
    assert.ok(!html.includes('after dealer earnings')); assert.ok(!html.includes('and dealer earnings')); assert.ok(!html.includes('Dealer material earnings'));
  });
}
test('the administrative estimate report shows processing adjustments', () => {
  const html = reportView(estimate(), 'admin');
  for (const text of ['Gross real material profit', 'Material processing cost', '$5.50', 'Net real material profit', '$194.50']) assert.ok(html.includes(text), text);
});
for (const reportKind of ['dealer', 'client', 'dealer-customer', 'dealer-customer-total']) {
  test(`${reportKind} reports never show staff processing fields even if supplied`, () => {
    const html = reportView(estimate(), reportKind);
    assert.ok(!/processing|Gross real|Net real|Company real/i.test(html)); assert.ok(!html.includes('$5.50'));
  });
}
for (const mode of ['EXTERNAL', null]) {
  test(`the administrative ${mode ?? 'DIRECT CLIENT'} estimate report shows costs without inventing earnings`, () => {
    const html = reportView(estimate({ dealerModeSnapshot: mode, dealerEarnings: null,
      user: { role: { name: mode ? 'dealer' : 'client' } } }), 'admin');
    assert.ok(html.includes('Material processing cost')); assert.ok(html.includes('Net real material profit'));
    assert.ok(!html.includes('after dealer earnings')); assert.ok(!html.includes('and dealer earnings')); assert.ok(!html.includes('Dealer material earnings'));
  });
}
let failures = 0;
for (const { name, run } of tests) {
  try { run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}`, error); }
}
console.log(`${tests.length - failures}/${tests.length} isolated material processing summary tests passed (real React SSR, stubbed external components).`);
if (failures) process.exitCode = 1;
