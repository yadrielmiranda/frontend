/* Real allocation helper, payment components, handlers and API wrappers with
 * simulated React lifecycle and I/O. No browser, Stripe, network or database.
 * Run: node scripts/test-custom-payments.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { fixture: publicFixture } = require('./test-public-payment-card.cjs');
global.fetch = () => { throw new Error('Network forbidden in payment tests'); };
for (const name of ['node:http', 'node:https']) require(name).request = require(name).get = global.fetch;
global.window = { location: { href: '' } };
const root = path.resolve(__dirname, '../src');
const compile = (code, filename) => ts.transpileModule(code, { fileName: filename, compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} }).outputText;
const money = value => `$${Number(value).toFixed(2)}`;
const roundMoney = value => Math.round(Number(value) * 100) / 100;
const jsx = (type, props) => ({ type, props });
function load(relative, mocks = {}, cache = new Map()) {
  if (cache.has(relative)) return cache.get(relative);
  const filename = path.resolve(root, relative);
  assert.ok(filename.startsWith(root + path.sep) && /\.tsx?$/.test(filename));
  const exported = {}; cache.set(relative, exported);
  let source = fs.readFileSync(filename, 'utf8');
  if (relative.endsWith('/estimate-payment-card.tsx')) source += '\nexport { EstimatePaymentCardContent as TestContent };';
  new Function('require', 'exports', compile(source, filename))(name => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('@/components/ui/')) return new Proxy({}, { get: (_, property) => property });
    const target = name.startsWith('@/') ? name.slice(2) : name.startsWith('.')
      ? path.relative(root, path.resolve(path.dirname(filename), name)).replaceAll('\\', '/') : null;
    assert.ok(target, `Unexpected dependency ${name}`);
    const resolved = ['.ts', '.tsx'].map(ext => target + ext).find(file => fs.existsSync(path.resolve(root, file)));
    assert.ok(resolved, name); return load(resolved, mocks, cache);
  }, exported);
  return exported;
}
const { previewCustomPayment } = load('lib/custom-payment.ts');
const row = (sequence, milestone, balance, status = 'UPCOMING', extra = {}) => ({ sequence, milestone,
  title: `Payment ${sequence}`, description: '', amount: balance, paid: '0', credit: '0', balance, status, ...extra });
function schedule(rows = [row(1, 'ORDER', '5320.64', 'DUE'), row(2, 'RELEASE', '5320.63')]) {
  const balance = (rows.reduce((sum, row) => sum + Math.round(Number(row.balance) * 100), 0) / 100).toFixed(2);
  return { name: 'Test schedule', rows, fullBalance: { amount: balance, sequences: rows.map(row => row.sequence) },
    next: rows.find(row => row.status === 'DUE') ?? null, total: balance, paid: '0', balance,
    initialSequence: 1, provisional: false, depositPaid: '0', permitPaid: '0', creditBalance: '0' };
}
const tests = []; const test = (name, run) => tests.push({ name, run });
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function fixture(kind, overrides = {}) {
  const state = [], refs = [], effects = [], requests = [], notices = [], routes = [];
  let index, refIndex, effectIndex, pending, dirty;
  const router = { refresh() {}, replace(route) { routes.push(route); }, push(route) { routes.push(route); } };
  const defaults = kind === 'manual' ? { estimateId: 17, type: 'INSTALLMENT', sequences: [1], amount: 5320.64, paymentSchedule: schedule() }
    : { estimateId: 17, estimateOwnerId: 2, currentUserId: 2, ownerRole: 'dealer', estimateStatus: 'Active',
      order: null, materialPayments: [], installationJob: null, materialAmount: 10641.27, paymentSchedule: schedule(),
      dealerMode: 'EXTERNAL', cardSurchargeFraction: .03, canRecordManualPayment: true };
  let props = { ...defaults, ...overrides };
  const mocks = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: {
      useState(initial) { const slot = index++; if (!(slot in state)) state[slot] = typeof initial === 'function' ? initial() : initial;
        return [state[slot], next => { const value = typeof next === 'function' ? next(state[slot]) : next;
          if (!Object.is(value, state[slot])) { state[slot] = value; dirty = true; } }]; },
      useRef(value) { return refs[refIndex++] ??= { current: value }; }, useMemo(fn) { return fn(); },
      useEffect(effect, deps) { const slot = effectIndex++, previous = effects[slot];
        if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
          previous?.cleanup?.(); effects[slot] = { deps }; pending.push(() => { effects[slot].cleanup = effect(); });
        } },
    },
    'next/navigation': { useRouter: () => router, useSearchParams: () => new URLSearchParams('estimateId=17&type=INSTALLMENT&sequence=1') },
    'lucide-react': new Proxy({}, { get: () => 'Icon' }),
    sonner: { toast: { success: value => notices.push(value), error: value => notices.push(value) } },
    '@/lib/formatters': { formatMoney: money, roundMoney },
    '@/lib/payment-accounting': { hasRefundHistory: () => false, refundedBalance: () => 0 },
    '@/lib/installation-flow': { paidInstallationCredit: () => 0 },
    '@/components/payments/payment-history': { PaymentHistory: 'History' },
    '@/components/payments/payment-schedule': { PaymentScheduleView: 'Schedule' },
    '@/components/payments/card-fee-breakdown': { CardFeeBreakdown: 'CardBreakdown' },
    '@/components/estimates/estimate-payment-link-actions': { EstimatePaymentLinkActions: 'PaymentLink' },
    '@/app/api/payments.api': {
      createCheckoutSession: async (...args) => { requests.push(args); return { url: '/test-checkout' }; },
      recordManualPayment: async body => { requests.push(body); return { id: 1, order: null }; },
    },
    '@/app/api/estimates.api': { getEstimate: async () => props.estimate },
    '@/app/api/installations.api': { getEstimateInstallation: async () => null },
    '@/app/api/orders.api': { getOrder: async () => null },
  };
  const relative = kind === 'manual' ? 'components/payments/manual-payment-dialog.tsx'
    : kind === 'success' ? 'app/checkout/success/checkout-success-content.tsx' : 'components/estimates/estimate-payment-card.tsx';
  const module = load(relative, mocks);
  const Component = kind === 'manual' ? module.ManualPaymentDialog : kind === 'success' ? module.default : module.TestContent;
  const render = () => {
    let tree, count = 0;
    do { assert.ok(count++ < 10, 'Effects settle'); index = refIndex = effectIndex = 0; pending = []; dirty = false;
      tree = Component(props); pending.forEach(effect => effect());
    } while (dirty);
    return tree;
  };
  const expand = node => typeof node?.type === 'function' && ['CustomPaymentAmount', 'FullBalanceToggle', 'FullBalancePrompt', 'FullBalanceReview'].includes(node.type.name) ? node.type(node.props) : node;
  const all = (node, match) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(n => all(n, match))
    : expand(node) !== node ? all(expand(node), match) : [...(match(node) ? [node] : []), ...all(node.props?.children, match)];
  const text = node => !node ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(text).join('')
    : expand(node) !== node ? text(expand(node)) : text(node.props?.children);
  const button = label => { const found = all(render(), node => node.type === 'Button').find(node => text(node) === label); assert.ok(found, label); return found; };
  const input = (name, value) => { const found = all(render(), node => node.type === 'Input' && (node.props.id === name || node.props['aria-label'] === name))[0]; assert.ok(found, name); found.props.onChange({ target: { value } }); };
  return { render, all, text, button, input, requests, notices, routes, props,
    update(next) { props = { ...props, ...next }; },
    verified() { input('manual-reference', 'test-check'); const box = all(render(), node => node.type === 'Checkbox').at(-1); box.props.onCheckedChange(true); },
    close() { effects.forEach(effect => effect.cleanup?.()); } };
}

test('8000 pays 5320.64 first and 2679.36 next, leaving 2641.27', () => {
  const preview = previewCustomPayment(schedule(), '8000'); assert.equal(preview.valid, true);
  assert.deepEqual(preview.allocations.map(item => [item.row.sequence, item.amount, item.remaining]), [[1, 5320.64, 0], [2, 2679.36, 2641.27]]);
});
test('a second payment applies to the remaining balance without counting the first receipt twice', () => {
  const next = schedule([row(1, 'ORDER', '0', 'PAID'), row(2, 'RELEASE', '2641.27')]);
  next.fullBalance.sequences = [2]; // Already-confirmed installments are not eligible again.
  assert.deepEqual(previewCustomPayment(next, '1000').allocations.map(item => [item.row.sequence, item.amount, item.remaining]), [[2, 1000, 1641.27]]);
  assert.equal(previewCustomPayment(next, '2641.28').valid, false);
});
test('allocation follows milestone then sequence and only approved schedule sequences', () => {
  const plan = schedule([row(2, 'RELEASE', '20'), row(101, 'ORDER', '5'), row(1, 'ORDER', '10'), row(102, 'RELEASE', '30')]);
  plan.rows.push(row(999, 'ORDER', '100')); // not in fullBalance: no allocation
  assert.deepEqual(previewCustomPayment(plan, '40').allocations.map(item => [item.row.sequence, item.amount]), [[1, 10], [101, 5], [2, 20], [102, 5]]);
});
test('positive cents are permitted; invalid precision, excess amounts and unavailable balances are blocked', () => {
  assert.equal(previewCustomPayment(schedule(), '0.01').valid, true);
  assert.equal(previewCustomPayment(schedule(), '.50').amount, .5);
  for (const amount of ['', '0', '-5', '8000.001', 'NaN', 'Infinity', '1e3', '10641.28']) assert.equal(previewCustomPayment(schedule(), amount).valid, false, amount);
  for (const block of [{ fullBalance: null }, { materialRevisionPending: true }, { refundReviewPending: true }, { estimateCanceled: true }])
    assert.equal(previewCustomPayment({ ...schedule(), ...block }, '1').available, false);
});
test('City Fee acceptance is required only when the chronological allocation reaches it', () => {
  const plan = schedule([row(1, 'ORDER', '100', 'DUE'), row(3, 'RELEASE', '10', 'DUE', { kind: 'CITY_FEE' })]);
  assert.equal(previewCustomPayment(plan, '100').cityFeeKey, '');
  assert.equal(previewCustomPayment(plan, '101').cityFeeAmount, 10);
  assert.notEqual(previewCustomPayment(plan, '101').cityFeeKey, '');
});
function customPublic() {
  const f = publicFixture(); const plan = schedule();
  f.context.schedule = plan; f.context.payments = plan.rows.map(row => ({ type: 'INSTALLMENT', sequence: row.sequence,
    title: row.title, baseAmount: row.balance, advanceOnly: row.status === 'UPCOMING', surchargePercent: '0', requiresTerms: false }));
  f.context.payments.push({ type: 'EXTRA', sequence: 1, title: 'Separate extra', baseAmount: '50', surchargePercent: '0' });
  f.context.fullBalance = { amount: '10691.27', items: f.context.payments.map(({ type, sequence }) => ({ type, sequence })) };
  return f;
}
test('public UI previews custom allocations and sends only amount plus approved project balance', async () => {
  const f = customPublic(); f.button('Pay another amount').props.onClick(); f.customInput('8000');
  assert.match(f.text(f.render()), /\$5320.64.*\$2679.36.*\$2641.27/);
  f.button('Continue to payment').props.onClick(); await flush();
  assert.equal(f.checkout()[4], undefined); assert.equal(f.checkout()[5], undefined); assert.equal(f.checkout()[6], undefined);
  assert.deepEqual(f.checkout()[7], { customAmount: 8000, expectedBalance: 10641.27 });
});
test('public custom payment retains required signature and rejects above-balance input', () => {
  const f = customPublic(); f.button('Pay another amount').props.onClick(); f.customInput('8000');
  f.context.agreement.satisfied = false; assert.equal(f.button('Continue to payment').props.disabled, true);
  f.button('Continue to payment').props.onClick(); assert.equal(f.checkout(), null);
  f.customInput('10641.28'); assert.equal(f.button('Enter a valid amount').props.disabled, true);
});
test('public schedule changes and revision pauses discard custom input instead of silently reusing it', () => {
  const f = customPublic(); f.button('Pay another amount').props.onClick(); f.customInput('8000');
  f.context.materialRevisionPending = true; f.render(); f.context.materialRevisionPending = false;
  assert.ok(f.button('Pay another amount')); f.button('Pay another amount').props.onClick();
  assert.equal(f.button('Enter a valid amount').props.disabled, true);
});
test('authenticated default pays only the next installment even when several rows are due', async () => {
  const plan = schedule([row(1, 'ORDER', '100', 'DUE'), row(101, 'ORDER', '20', 'DUE'), row(2, 'RELEASE', '100')]);
  const f = fixture('authenticated', { paymentSchedule: plan });
  assert.equal(f.all(f.render(), node => node.type === 'Checkbox').length, 0);
  assert.equal(f.all(f.render(), node => node.type === 'Schedule')[0].props.schedule.rows.length, 3);
  f.button('Pay next installment').props.onClick(); await flush();
  assert.deepEqual(f.requests[0][6], [1]); assert.equal(f.requests[0][7], undefined); assert.equal(f.requests[0][8], undefined); f.close();
});
test('authenticated full balance shows a read-only breakdown and returns to the next installment', async () => {
  const plan = schedule([row(1, 'ORDER', '100', 'DUE'), row(101, 'ORDER', '20', 'DUE')]);
  const f = fixture('authenticated', { paymentSchedule: plan });
  f.button('Pay full balance').props.onClick();
  assert.match(f.text(f.render()), /Included installments.*Payment 1.*Payment 101/);
  assert.equal(f.all(f.render(), node => node.type === 'Checkbox').length, 0);
  f.button('Back to next payment').props.onClick();
  f.button('Pay next installment').props.onClick(); await flush();
  assert.deepEqual(f.requests[0][6], [1]); f.close();
});
test('authenticated full balance sends all project installments through its existing protected request', async () => {
  const f = fixture('authenticated'); f.button('Pay full balance').props.onClick();
  f.button('Continue to payment').props.onClick(); await flush();
  assert.equal(f.requests[0][6], undefined);
  assert.deepEqual(f.requests[0][7], { payFullBalance: true, expectedBalance: 10641.27 }); f.close();
});
test('a pending checkout for a larger selection is not mistaken for the next installment', () => {
  const f = fixture('authenticated', { materialPayments: [1, 2].map(sequence => ({ type: 'INSTALLMENT', sequence,
    status: 'PENDING', stripeSessionId: 'pending-full', baseAmount: sequence === 1 ? '5320.64' : '5320.63', surchargeAmount: '0', amount: '5320.64' })) });
  assert.ok(f.button('Pay next installment')); f.close();
});
test('authenticated checkout sends custom principal separately from its card fee', async () => {
  const f = fixture('authenticated'); f.button('Pay another amount').props.onClick(); f.input('Custom payment amount', '8000');
  assert.match(f.text(f.render()), /\$8240.00/); f.button('Continue to payment').props.onClick(); await flush();
  assert.equal(f.requests[0][1], 'INSTALLMENT'); assert.equal(f.requests[0][2], undefined);
  assert.equal(f.requests[0][6], undefined); assert.equal(f.requests[0][7], undefined);
  assert.deepEqual(f.requests[0][8], { customAmount: 8000, expectedBalance: 10641.27 }); f.close();
});
test('authenticated advance payments remain available when nothing is currently due', () => {
  const f = fixture('authenticated', { paymentSchedule: schedule([row(1, 'ORDER', '100')]) });
  f.button('Pay another amount').props.onClick(); f.input('Custom payment amount', '50');
  assert.equal(f.button('Continue to payment').props.disabled, false); f.close();
});
test('authenticated client still must accept material details for a partial first installment', () => {
  const f = fixture('authenticated', { ownerRole: 'client' }); f.button('Pay another amount').props.onClick(); f.input('Custom payment amount', '1');
  assert.equal(f.button('Accept terms to continue').props.disabled, true); f.close();
});
test('an initial zero balance covered by credit still preserves its confirmation and material acceptance', () => {
  const plan = schedule([row(1, 'ORDER', '0', 'DUE', { amount: '100', credit: '100' }), row(2, 'RELEASE', '100')]);
  assert.deepEqual(previewCustomPayment(plan, '1').allocations.map(item => [item.row.sequence, item.amount]), [[1, 0], [2, 1]]);
  const f = fixture('authenticated', { ownerRole: 'client', paymentSchedule: plan });
  f.button('Pay another amount').props.onClick(); f.input('Custom payment amount', '1');
  assert.equal(f.button('Accept terms to continue').props.disabled, true); f.close();
});
test('a credit-covered initial row marked PAID but still awaiting confirmation remains in custom allocation', () => {
  const plan = schedule([row(1, 'ORDER', '0', 'PAID', { amount: '100', credit: '100' }), row(2, 'RELEASE', '100')]);
  plan.next = plan.rows[0];
  assert.deepEqual(previewCustomPayment(plan, '1').allocations.map(item => [item.row.sequence, item.amount]), [[1, 0], [2, 1]]);
  const f = fixture('authenticated', { ownerRole: 'client', paymentSchedule: plan });
  f.button('Pay another amount').props.onClick(); f.input('Custom payment amount', '1');
  assert.equal(f.button('Accept terms to continue').props.disabled, true); f.close();
});
test('manual payment accepts a reviewed custom amount without marking entire selected installments paid', async () => {
  const f = fixture('manual'); f.button('Pay another amount').props.onClick(); f.input('Custom payment amount', '8000'); f.verified();
  assert.equal(f.button('Mark paid').props.disabled, false); f.button('Mark paid').props.onClick(); await flush();
  assert.equal(f.requests[0].customAmount, 8000); assert.equal(f.requests[0].expectedBalance, 10641.27);
  assert.equal(f.requests[0].sequences, undefined); assert.equal(f.requests[0].sequence, undefined);
  assert.equal(f.requests[0].payFullBalance, undefined); assert.equal(f.requests[0].type, 'INSTALLMENT'); f.close();
});
test('manual custom mode inherited from the card cannot fall back to a mismatched default amount', () => {
  const f = fixture('manual', { amount: 8000, customAmount: 8000, sequences: undefined });
  assert.equal(f.all(f.render(), node => node.type === 'Button').some(node => f.text(node) === 'Use scheduled amount'), false);
  f.input('Custom payment amount', '10641.28'); f.verified(); assert.equal(f.button('Mark paid').props.disabled, true); f.close();
});
test('manual City Fee requires acceptance only after input reaches that installment', async () => {
  const f = fixture('manual', { paymentSchedule: schedule([row(1, 'ORDER', '100', 'DUE'), row(2, 'RELEASE', '10', 'DUE', { kind: 'CITY_FEE' })]) });
  f.button('Pay another amount').props.onClick(); f.input('Custom payment amount', '101'); f.verified();
  assert.equal(f.button('Mark paid').props.disabled, true);
  f.all(f.render(), node => node.type === 'Checkbox')[0].props.onCheckedChange(true);
  assert.equal(f.button('Mark paid').props.disabled, false); f.button('Mark paid').props.onClick(); await flush();
  assert.equal(f.requests[0].cityFeeAccepted, true); f.close();
});
test('API wrappers carry the new request through authenticated, public and manual paths', async () => {
  const calls = []; const api = load('app/api/payments.api.ts', { './_base': { apiFetch: async (url, request) => { calls.push([url, request.body]); return {}; } } });
  const custom = { customAmount: 8000, expectedBalance: 10641.27 };
  await api.createCheckoutSession(17, 'INSTALLMENT', undefined, undefined, undefined, undefined, undefined, undefined, custom);
  await api.createPublicCheckoutSession('test', undefined, undefined, undefined, undefined, undefined, undefined, custom);
  await api.recordManualPayment({ estimateId: 17, type: 'INSTALLMENT', method: 'CHECK', fundsVerified: true, reference: 'test', ...custom });
  for (const [, body] of calls) { assert.equal(body.customAmount, 8000); assert.equal(body.expectedBalance, 10641.27);
    for (const field of ['sequence', 'sequences', 'items', 'payFullBalance']) assert.equal(body[field], undefined); }
});
test('a captured initial partial payment completes success UI without waiting for an order', async () => {
  const oldInterval = global.setInterval, oldTimeout = global.setTimeout;
  global.setInterval = global.setTimeout = () => 0;
  try {
    const f = fixture('success', { estimate: { order: null, status: { name: 'Active' }, payments: [{ type: 'INSTALLMENT', sequence: 1, status: 'PAID' }] } });
    f.render(); await flush(); assert.deepEqual(f.routes, ['/estimates/17/edit']);
    assert.deepEqual(f.notices, ['Payment confirmed. Applied toward your project balance.']); f.close();
  } finally { global.setInterval = oldInterval; global.setTimeout = oldTimeout; }
});

(async () => {
  let failures = 0;
  for (const { name, run } of tests) { try { await run(); console.log(`PASS ${name}`); }
    catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack}`); } }
  console.log(`${tests.length - failures}/${tests.length} custom payment tests passed`);
  if (failures) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
