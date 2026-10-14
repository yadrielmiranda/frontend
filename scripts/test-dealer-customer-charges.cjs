// Exercises the real pricing controls and financial summaries with simulated APIs.
// Run: node scripts/test-dealer-customer-charges.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '../src');
const jsx = (type, props) => ({ type, props });
const ui = new Proxy({}, { get: (_, name) => name });
const money = value => `$${Number(value).toFixed(2)}`;
const rounding = value => Math.round((value + Number.EPSILON) * 100) / 100;
const baseMocks = {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'lucide-react': ui,
  '@/lib/formatters': { formatMoney: money, roundMoney: rounding },
  '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') },
  '@/lib/rbac': { canSetCustomerOnEstimate: role => ['admin', 'operator', 'dealer'].includes(role), isDealerRole: role => role === 'dealer' },
  '@/lib/installation-flow': { paidBaseFor: job => job.retainedDeposit ?? 0, paidInstallationCredit: () => 0 },
  '@/lib/installation-service-totals': { additionalServiceTotals: () => [] },
  '@/lib/estimate-customer-promotions': { customerCanSeePromotions: () => true },
  '@/components/promotions/promotion-price': { OriginalPrice: 'OriginalPrice' },
  '@/components/payments/payment-schedule': { PaymentScheduleView: 'PaymentScheduleView' },
  './manual-discount-summary': { ManualDiscountSummary: 'ManualDiscountSummary' },
  '../../manual-discount-summary': { ManualDiscountSummary: 'ManualDiscountSummary' },
  './dealer-profit-summary': { DealerProfitSummary: 'DealerProfitSummary' },
  '../../dealer-profit-summary': { DealerProfitSummary: 'DealerProfitSummary' },
  './dealer-earnings-summary': { DealerEarningsSummaryCard: 'DealerEarningsSummaryCard' },
  '../../dealer-earnings-summary': { DealerEarningsSummaryCard: 'DealerEarningsSummaryCard' },
  '../../material-profit-adjustments': { MaterialProfitAdjustments: 'MaterialProfitAdjustments' },
  './pieces-breakdown-bar': { PiecesBreakdownBar: 'PiecesBreakdownBar' },
};
function load(relative, mocks = {}, extraExports = '') {
  const filename = path.resolve(root, relative);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exported = {};
  new Function('require', 'exports', source + extraExports)(name => {
    if (name.startsWith('@/components/ui/')) return ui;
    assert.ok(name in mocks || name in baseMocks, `Unexpected dependency: ${name}`);
    return mocks[name] ?? baseMocks[name];
  }, exported);
  return exported;
}
const all = (node, match) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(child => all(child, match))
  : [...(match(node) ? [node] : []), ...all(node.props?.children, match)];
const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object'
  ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
const expand = node => node == null || typeof node !== 'object' ? node : Array.isArray(node)
  ? node.map(expand) : typeof node.type === 'function' ? expand(node.type(node.props))
    : { ...node, props: { ...node.props, children: expand(node.props?.children) } };

const line = { id: null, origin: 'SYSTEM', source: 'INSTALLATION', sourceKey: 'INSTALLATION',
  sourceRefId: null, description: 'Installation', systemAmount: '1000.00', customerAmount: '1000.00',
  pricingMode: null, pricingValue: null, usedInCustomerQuote: true, needsReview: false, sortOrder: 10 };
const customLine = { ...line, id: 2, origin: 'DEALER', source: 'CUSTOM', sourceKey: null,
  description: 'Remove shutters', systemAmount: null, customerAmount: '150', pricingMode: 'FINAL', pricingValue: '150' };
const summary = { enabled: true, lines: [{ ...line, pricingMode: 'AMOUNT', pricingValue: '200', customerAmount: '1200' }, customLine],
  systemTotal: '1000', customerTotal: '1350', knownSystemMargin: '200', dealerCreatedTotal: '150',
  customerTotalIncomplete: false, systemTotalIncomplete: false };

const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function fixture(kind, overrides = {}, apiOverrides = {}) {
  const state = [], refs = [], effects = [], memos = [], requests = [], changes = [], notices = [];
  let index = 0, refIndex = 0, effectIndex = 0, memoIndex = 0, pendingEffects = [], dirty;
  const hooks = {
    useState(initial) {
      const slot = index++;
      if (!(slot in state)) state[slot] = typeof initial === 'function' ? initial() : initial;
      return [state[slot], next => { const value = typeof next === 'function' ? next(state[slot]) : next;
        if (!Object.is(value, state[slot])) { state[slot] = value; dirty = true; } }];
    },
    useRef(value) { return refs[refIndex++] ??= { current: value }; },
    useMemo(fn, deps) { const slot = memoIndex++, previous = memos[slot];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) memos[slot] = { deps, value: fn() };
      return memos[slot].value;
    },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const slot = effectIndex++, previous = effects[slot];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        previous?.cleanup?.(); effects[slot] = { deps };
        pendingEffects.push(() => { effects[slot].cleanup = fn(); });
      }
    },
  };
  const api = Object.fromEntries(['saveSystemCustomerCharge', 'createDealerCustomerCharge',
    'updateDealerCustomerCharge', 'deleteEstimateCustomerCharge', 'getEstimateCustomerCharges'].map(name => [name, async (...args) => {
      requests.push([name, ...args]); return apiOverrides[name] ? apiOverrides[name](...args) : summary;
    }]));
  const components = load('components/estimates/dealer-customer-charges-card.tsx', {
    react: hooks, '@/app/api/estimates.api': api,
    sonner: { toast: { success() {}, error(message) { notices.push(message); } } },
  }, '\nexports.SystemChargeRow = SystemChargeRow;');
  let props = kind === 'SystemChargeRow'
    ? { estimateId: 7, line, editable: true, busy: false, internalDealer: true,
      runMutation: async operation => { changes.push(await operation()); return true; }, ...overrides }
    : { estimateId: 7, initialSummary: summary, dealerMode: 'INTERNAL', editable: true, refreshKey: 'test', onSummaryChange: next => changes.push(next), ...overrides };
  const render = () => {
    let tree, count = 0;
    do { assert.ok(count++ < 12, 'Effects settle'); index = refIndex = effectIndex = memoIndex = 0;
      pendingEffects = []; dirty = false; tree = components[kind](props); pendingEffects.forEach(effect => effect());
    } while (dirty);
    return tree;
  };
  const find = match => { const result = all(render(), match)[0]; assert.ok(result, 'Expected control exists'); return result; };
  const control = id => find(node => node.props?.id === id);
  const input = (id, value) => control(id).props.onChange({ target: { value } });
  const button = label => find(node => node.type === 'Button' && text(node).trim() === label);
  return { render, find, control, input, button, requests, changes, notices,
    update(next) { props = { ...props, ...next }; render(); },
    async ready() { render(); await flush(); render(); },
  };
}

const financialProps = { ownerRole: 'dealer', dealerMode: 'INTERNAL', ownerIsTaxExempt: false,
  taxRate: 0, customerTaxRatePercent: 0,
  materialSummary: { totalUnits: 1, pieceBreakdown: {}, subtotal: 1000, taxAmount: 0, totalPayable: 1000,
    dealerTotal: 1200, dealerTaxAmount: 0, dealerGrandTotal: 1200, dealerProfit: 200 },
  installationJob: { id: 9, status: 'DEPOSIT_PAYMENT_PENDING', depositAmountSnapshot: 100, revisions: [], payments: [],
    estimate: { priceT: 1000, taxRate: 0, taxAmount: 0, totalPayable: 1000,
      customerPriceT: 1200, customerTaxRate: 0, customerTaxAmount: 0, customerTotalPayable: 1200 },
    quotes: [{ id: 1, status: 'APPROVED', total: '1000' }] }, customerChargesSummary: summary };
const discount = { payer: 'CUSTOMER', scope: 'INSTALLATION', discount: '100',
  material: { total: '1200', tax: '0', netDiscount: '0' },
  installation: { total: '900', discount: '100' }, permit: { total: '0', discount: '0' }, city: { total: '0', discount: '0' } };
baseMocks['@/lib/customer-charge-additions'] = load('lib/customer-charge-additions.ts', {
  './formatters': { roundMoney: rounding },
});
const Financial = load('components/estimates/estimate-financial-summary.tsx').EstimateFinancialSummary;
const Report = load('components/estimates/estimate-details/parts/report-financial-summary.tsx').ReportFinancialSummary;
const paymentMocks = {
  react: {}, 'next/navigation': {}, sonner: {}, '@/lib/payment-accounting': { hasRefundHistory: () => false },
  '@/components/payments/payment-history': {}, '@/components/payments/installment-selection': {},
  '@/components/payments/custom-payment-amount': {}, '@/app/api/payments.api': {},
  '@/components/payments/manual-payment-dialog': {}, '@/components/estimates/estimate-payment-link-actions': {},
  '@/components/payments/card-fee-breakdown': {}, '@/lib/card-payment': {},
};
const resolvePayment = load('components/estimates/estimate-payment-card.tsx', paymentMocks).resolveEstimatePaymentAction;
const reportEstimate = { ...financialProps.installationJob.estimate, user: { role: { name: 'dealer' } },
  dealerModeSnapshot: 'INTERNAL', customerChargesSummary: summary,
  installationSummary: { status: 'DEPOSIT_PAYMENT_PENDING', quoteStatus: 'APPROVED', installationAmount: '1000',
    installationTotal: '1000', additionalServices: [], permitIncluded: false } };
const tests = [];
const test = (name, run) => tests.push({ name, run });

test('internal dealer only offers percentage/amount and always includes calculated charges', async () => {
  const f = fixture('SystemChargeRow');
  assert.deepEqual(all(f.render(), node => node.type === 'SelectItem').map(node => node.props.value), ['PERCENTAGE', 'AMOUNT']);
  assert.equal(all(f.render(), node => node.type === 'Switch').length, 0);
  assert.equal(f.control('customer-charge-INSTALLATION').props.value, '0');
  assert.match(text(f.render()), /Customer price\$1000\.00/);
  await f.button('Save').props.onClick();
  assert.deepEqual(f.requests[0], ['saveSystemCustomerCharge', 7, { source: 'INSTALLATION', sourceRefId: null,
    pricingMode: 'AMOUNT', value: 0, usedInCustomerQuote: true }]);
});
test('both markup modes preview and save the added value', async () => {
  for (const [mode, value] of [['PERCENTAGE', '20'], ['AMOUNT', '200']]) {
    const f = fixture('SystemChargeRow');
    f.find(node => node.type === 'Select').props.onValueChange(mode);
    f.input('customer-charge-INSTALLATION', value);
    assert.match(text(f.render()), /Customer price\$1200\.00/);
    await f.button('Save').props.onClick();
    assert.equal(f.requests[0][2].value, Number(value));
    assert.equal(f.requests[0][2].pricingMode, mode);
  }
});
test('internal pending prices and negative additions cannot be saved', () => {
  const pending = fixture('SystemChargeRow', { line: { ...line, systemAmount: null } });
  assert.equal(pending.button('Save').props.disabled, true);
  assert.match(text(pending.render()), /Customer pricePending/);
  const negative = fixture('SystemChargeRow'); negative.input('customer-charge-INSTALLATION', '-20');
  assert.equal(negative.button('Save').props.disabled, true);
});
test('external dealer retains all four pricing modes and can omit a calculated charge', async () => {
  const f = fixture('SystemChargeRow', { internalDealer: false });
  assert.deepEqual(all(f.render(), node => node.type === 'SelectItem').map(node => node.props.value), ['SAME', 'PERCENTAGE', 'AMOUNT', 'FINAL']);
  await f.find(node => node.type === 'Switch').props.onCheckedChange(false);
  assert.equal(f.requests[0][2].usedInCustomerQuote, false);
  assert.match(text(f.render()), /Not used/);
});
test('internal dealer creates a custom charge payable to the company', async () => {
  const f = fixture('DealerCustomerChargesCard');
  await f.ready();
  assert.match(text(f.render()), /total the customer pays us/);
  assert.doesNotMatch(text(f.render()), /never change what you owe us/);
  f.input('new-customer-charge-description', '  Remove shutters  ');
  f.input('new-customer-charge-amount', '150.50');
  await f.button('Add charge').props.onClick();
  assert.deepEqual(f.requests.find(request => request[0] === 'createDealerCustomerCharge'), ['createDealerCustomerCharge', 7, { description: 'Remove shutters', amount: 150.5 }]);
  assert.equal(f.changes[0], summary);
  assert.equal(f.control('new-customer-charge-amount').props.value, '');
});
test('read-only pricing exposes no controls while preserving displayed prices', () => {
  const f = fixture('SystemChargeRow', { editable: false });
  assert.equal(all(f.render(), node => node.type === 'Button' || node.type === 'Select' || node.type === 'Switch').length, 0);
  assert.match(text(f.render()), /Customer price\$1000\.00/);
  const card = fixture('DealerCustomerChargesCard', { editable: false });
  assert.equal(all(card.render(), node => node.props?.id === 'new-customer-charge-amount').length, 0);
});
test('internal estimate total includes markup and custom charges once, after base discounts', () => {
  const plain = text(expand(Financial(financialProps)));
  assert.match(plain, /Customer Project Total\$2550\.00Your Project Cost\$2000\.00/);
  const discounted = text(expand(Financial({ ...financialProps, manualDiscount: discount })));
  assert.match(discounted, /Customer Project Total\$2450\.00Your Project Cost\$2000\.00/);
  assert.match(discounted, /Services total\$1000\.00\$1250\.00/);
});
test('removing installation drops its markup but preserves custom charges', () => {
  assert.match(text(expand(Financial({ ...financialProps, installationJob: null }))), /Customer Project Total\$1350\.00Your Project Cost\$1000\.00/);
  const canceled = { ...financialProps.installationJob, status: 'CANCELED', retainedDeposit: 100 };
  assert.match(text(expand(Financial({ ...financialProps, installationJob: canceled }))), /Customer Project Total\$1450\.00Your Project Cost\$1100\.00/);
});
test('internal installation balance includes installation additions and custom charges, excluding permit and city additions', () => {
  const charges = { ...summary, lines: [...summary.lines,
    { ...line, source: 'PERMIT', sourceKey: 'PERMIT', customerAmount: '200', systemAmount: '100' },
    { ...line, source: 'CITY_FEE', sourceKey: 'CITY_FEE', customerAmount: '100', systemAmount: '50' }] };
  const result = text(expand(Financial({ ...financialProps, manualDiscount: discount,
    customerChargesSummary: charges,
    installationJob: { ...financialProps.installationJob, status: 'INSTALLATION_PAYMENT_PENDING' } })));
  assert.match(result, /Remaining installation balance\$1250\.00/);
});
test('internal customer and comparison reports include additions and base discount', () => {
  const estimate = { ...reportEstimate, manualDiscountSummary: discount };
  assert.match(text(expand(Report({ estimate, reportKind: 'dealer-customer' }))), /Project Total\$2450\.00/);
  const comparison = text(expand(Report({ estimate, reportKind: 'dealer' })));
  assert.match(comparison, /Services total\$1000\.00\$1250\.00/);
  assert.match(comparison, /Customer Project Total\$2450\.00Your Project Cost\$2000\.00/);
});
test('external estimate retains company cost independently from customer charges', () => {
  const externalDiscount = { ...discount, payer: 'ACCOUNT_OWNER', material: { total: '1000', tax: '0', netDiscount: '0' } };
  const result = text(expand(Financial({ ...financialProps, dealerMode: 'EXTERNAL', manualDiscount: externalDiscount })));
  assert.match(result, /Customer Project Total\$2550\.00Your Project Cost\$1900\.00/);
  assert.match(result, /Services total\$900\.00\$1350\.00/);
});
test('legacy payments include internal additions in their corresponding payment only', () => {
  const charges = { ...summary, lines: [...summary.lines,
    { ...line, source: 'PERMIT', sourceKey: 'PERMIT', customerAmount: '200', systemAmount: '100' },
    { ...line, source: 'CITY_FEE', sourceKey: 'CITY_FEE', customerAmount: '100', systemAmount: '50' }] };
  const props = { estimateStatus: 'Active', order: null, materialPayments: [], materialAmount: 1200,
    dealerMode: 'INTERNAL', customerChargesSummary: charges, installationJob: null };
  assert.equal(resolvePayment(props).amount, 1350);
  const job = { ...financialProps.installationJob, permit: { permitFeeSnapshot: 100, cityFee: 50 } };
  assert.equal(resolvePayment({ ...props, installationJob: job }).amount, 100, 'deposit remains unchanged');
  assert.equal(resolvePayment({ ...props, installationJob: { ...job, status: 'PERMIT_PAYMENT_PENDING' } }).amount, 200);
  assert.equal(resolvePayment({ ...props, installationJob: { ...job, status: 'MATERIAL_PAYMENT_PENDING' } }).amount, 1300);
  assert.equal(resolvePayment({ ...props, manualDiscount: discount, order: { id: 2 },
    installationJob: { ...job, status: 'INSTALLATION_PAYMENT_PENDING' } }).amount, 1250);
  assert.equal(resolvePayment({ ...props, dealerMode: 'EXTERNAL' }).amount, 1200);
  assert.equal(resolvePayment({ ...props, paymentSchedule: { next: { sequence: 1, balance: '600', amount: '600' } } }).amount, 600, 'schedule already includes additions');
});
test('initial loads block edits and superseded reads cannot replace current charges', async () => {
  const first = deferred(), second = deferred(), busy = [];
  let reads = 0, attemptedWrites = 0;
  const current = { ...summary, customerTotal: '1550' };
  const f = fixture('DealerCustomerChargesCard', { onBusyChange: value => busy.push(value) }, {
    getEstimateCustomerCharges: () => (++reads === 1 ? first.promise : second.promise),
  });
  f.render(); await flush();
  assert.equal(f.button('Add charge').props.disabled, true);
  const row = f.find(node => node.type?.name === 'SystemChargeRow');
  assert.equal(row.props.busy, true);
  assert.equal(await row.props.runMutation(async () => { attemptedWrites++; return summary; }), false);
  assert.equal(attemptedWrites, 0);
  f.update({ refreshKey: 'new-calculation' });
  assert.equal(reads, 1, 'reads remain serialized');
  first.resolve(summary); await flush();
  assert.equal(f.changes.length, 0, 'old summary never reaches the parent');
  assert.equal(reads, 2);
  assert.equal(busy.includes(false), false);
  second.resolve(current); await flush();
  assert.deepEqual(f.changes, [current]);
  assert.equal(f.button('Add charge').props.disabled, false);
  assert.equal(busy.at(-1), false);
});
test('a save blocks all other mutations and remains busy until payment totals finish refreshing', async () => {
  const mutation = deferred(), calendar = deferred(), busy = [], committed = [];
  const savedSummary = { ...summary, customerTotal: '1600' };
  let extraWrites = 0;
  const f = fixture('DealerCustomerChargesCard', {
    onBusyChange: value => busy.push(value),
    onSummaryChange: async next => { committed.push(next); if (next === savedSummary) await calendar.promise; },
  });
  await f.ready(); busy.length = 0;
  const run = f.find(node => node.type?.name === 'SystemChargeRow').props.runMutation;
  const save = run(() => mutation.promise);
  assert.equal(await run(async () => { extraWrites++; return summary; }), false);
  assert.equal(extraWrites, 0, 'ref lock protects same-tick events before React rerenders');
  assert.equal(f.control('new-customer-charge-description').props.disabled, true);
  assert.equal(f.find(node => node.type?.name === 'DealerChargeRow').props.busy, true);
  mutation.resolve(savedSummary); await flush();
  assert.equal(committed.at(-1), savedSummary);
  assert.equal(f.button('Add charge').props.disabled, true);
  assert.equal(busy.includes(false), false, 'payment actions stay blocked across save and schedule refresh');
  calendar.resolve(); assert.equal(await save, true); await flush();
  assert.equal(f.button('Add charge').props.disabled, false);
  assert.equal(busy.at(-1), false);
});
test('recalculation arriving during a save reads afterward and never publishes the obsolete mutation snapshot', async () => {
  const mutation = deferred(), busy = [];
  const oldSaved = { ...summary, customerTotal: '1450' };
  const recalculated = { ...summary, customerTotal: '1850' };
  let reads = 0;
  const f = fixture('DealerCustomerChargesCard', { onBusyChange: value => busy.push(value) }, {
    getEstimateCustomerCharges: async () => (++reads === 1 ? summary : recalculated),
  });
  await f.ready(); busy.length = 0;
  const save = f.find(node => node.type?.name === 'SystemChargeRow').props.runMutation(() => mutation.promise);
  await flush(); f.update({ refreshKey: 'recalculated-installation' }); await flush();
  assert.equal(reads, 1);
  mutation.resolve(oldSaved); await save; await flush();
  assert.deepEqual(f.changes, [summary, recalculated]);
  assert.equal(reads, 2);
  assert.deepEqual(busy.filter(value => !value), [false]);
});
test('failed payment-total refresh reports the error to the parent before clearing busy', async () => {
  const events = [];
  const failed = { ...summary, customerTotal: '1600' };
  const f = fixture('DealerCustomerChargesCard', {
    onBusyChange: value => events.push(value ? 'busy' : 'idle'),
    onError: () => events.push('error'),
    onSummaryChange: async next => { if (next === failed) throw new Error('Calendar unavailable'); },
  });
  await f.ready(); events.length = 0;
  const saved = await f.find(node => node.type?.name === 'SystemChargeRow').props.runMutation(async () => failed);
  assert.equal(saved, false);
  assert.deepEqual(events, ['busy', 'error', 'idle']);
  assert.deepEqual(f.notices, ['Calendar unavailable']);
});
test('revision comparison displays custom charges included in the project total', () => {
  const Revision = load('components/estimates/estimate-revision-summary.tsx').EstimateRevisionSummary;
  const amounts = { units: 1, materialSubtotal: '1000', materialTax: '0', materialTotal: '1000',
    installationTotal: '1200', additionalCharges: '150', projectTotal: '2350' };
  const props = { revision: { id: 1, version: 2, status: 'DRAFT', items: [], originalTotals: {}, revisedTotals: {} },
    comparison: { revisionId: 1, original: amounts, revised: { ...amounts, installationTotal: '1300', projectTotal: '2450' }, difference: '100' } };
  const output = text(Revision(props));
  assert.match(output, /Additional charges\$150\.00\$150\.00/);
  assert.match(output, /Project total\$2,350\.00\$2,450\.00/);
});

(async () => {
  for (const { name, run } of tests) { await run(); console.log(`PASS ${name}`); }
  console.log(`${tests.length}/${tests.length} customer charge tests passed`);
})().catch(error => { console.error(error); process.exitCode = 1; });
