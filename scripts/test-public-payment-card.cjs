/* Pruebas aisladas de estado y eventos del componente real; no sustituyen una
 * prueba en navegador ni ejecutan Stripe. No requieren dependencias adicionales.
 * Ejecutar desde frontend: node scripts/test-public-payment-card.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const file = path.resolve(__dirname, '../src/components/estimates/public-estimate-payment-card.tsx');
const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file, compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} }).outputText;
const tests = [];
const test = (name, run) => tests.push({ name, run });
const jsx = (type, props) => ({ type, props });
const clone = value => JSON.parse(JSON.stringify(value));
function fixture(legacy = false) {
  let state = [], index = 0, checkout = null;
  let effects = [], effectIndex = 0, pendingEffects = [], dirty = false;
  const option = (sequence, baseAmount, advanceOnly, title) => ({ type: 'INSTALLMENT', sequence, baseAmount, advanceOnly,
    title, surchargePercent: '0', surchargeAmount: '0', totalAmount: baseAmount, requiresTerms: false });
  let context = { enabled: true, status: 'due', agreement: { required: true, satisfied: true },
    payments: legacy ? [option(2, '59.07', true, 'Original release'), option(101, '196.52', true, 'Old adjustment')]
      : [option(101, '98.26', false, 'Additional initial payment'), option(2, '59.07', true, 'Original release'), option(102, '98.26', true, 'Additional release')],
  };
  context.fullBalance = { amount: '255.59', items: context.payments.map(({ type, sequence }) => ({ type, sequence })) };
  if (!legacy) {
    const rows = context.payments.map(item => ({ sequence: item.sequence, milestone: item.sequence === 101 ? 'ORDER' : 'RELEASE',
      title: item.title, description: `Description for ${item.title}`, amount: item.baseAmount, balance: item.baseAmount,
      paid: '0', credit: '0', status: item.advanceOnly ? 'UPCOMING' : 'DUE' }));
    context.schedule = { name: 'Project installments', rows, next: rows[0], initialSequence: 101,
      fullBalance: { amount: '255.59', sequences: rows.map(row => row.sequence) }, total: '255.59', paid: '0', balance: '255.59' };
    context.payments.forEach((item, index) => { item.description = rows[index].description; });
  }
  const mocks = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: { useState(initial) { const slot = index++; if (!(slot in state)) state[slot] = initial;
      return [state[slot], next => { const value = typeof next === 'function' ? next(state[slot]) : next;
        if (!Object.is(value, state[slot])) { state[slot] = value; dirty = true; } }]; },
      useEffect(effect, deps) { const slot = effectIndex++; const previous = effects[slot];
        if (!previous || deps.some((value, i) => !Object.is(value, previous[i]))) {
          effects[slot] = deps; pendingEffects.push(effect);
        }
      } },
    'next/navigation': { useRouter: () => ({ refresh() {} }) },
    'lucide-react': { CheckCircle2: 'Icon', CreditCard: 'Icon', Loader2: 'Icon', ShieldCheck: 'Icon' },
    sonner: { toast: { error(message) { throw new Error(message); } } },
    '@/components/promotions/promotion-banner': { usePromotionExpired: () => false },
    '@/lib/card-payment': { getCardPaymentBreakdown: ({ baseAmount }) => ({ totalAmount: baseAmount, surchargeAmount: 0 }) },
    '@/components/payments/payment-schedule': { PaymentScheduleView: 'Schedule' },
    '@/app/api/payments.api': { createPublicCheckoutSession: async (...args) => { checkout = args; return { url: '/test-checkout' }; } },
    '@/components/ui/button': { Button: 'Button' }, '@/components/ui/checkbox': { Checkbox: 'Checkbox' },
    '@/components/ui/input': { Input: 'Input' },
    '@/lib/formatters': { formatMoney: value => `$${Number(value).toFixed(2)}` },
  };
  for (const relative of ['lib/custom-payment.ts', 'components/payments/custom-payment-amount.tsx']) {
    const filename = path.resolve(__dirname, '../src', relative);
    const exported = {};
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText;
    new Function('require', 'exports', compiled)(name => { assert.ok(name in mocks, name); return mocks[name]; }, exported);
    mocks[`@/${relative.replace(/\.tsx?$/, '')}`] = exported;
  }
  const exported = {};
  new Function('require', 'exports', source)(name => { if (!(name in mocks)) throw new Error(`Missing test dependency: ${name}`); return mocks[name]; }, exported);
  const render = () => {
    let node, renders = 0;
    do {
      assert.ok(renders++ < 10, 'Effects settle without a render loop');
      index = 0; effectIndex = 0; pendingEffects = []; dirty = false;
      node = exported.PublicEstimatePaymentCard({ token: 'test', agreementId: 'agreement', context });
      pendingEffects.forEach(effect => effect());
    } while (dirty);
    return node;
  };
  const expand = node => typeof node?.type === 'function' && node.type.name === 'CustomPaymentAmount' ? node.type(node.props) : node;
  const all = (node, predicate) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
    ? node.flatMap(child => all(child, predicate)) : node !== expand(node) ? all(expand(node), predicate)
      : [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
  const text = node => !node ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(text).join('')
    : node !== expand(node) ? text(expand(node)) : text(node.props?.children);
  const button = label => { const b = all(render(), n => n.type === 'Button').find(n => text(n) === label); assert.ok(b, `Button ${label} found`); return b; };
  const checkboxes = () => all(render(), n => n.type === 'Checkbox' && n.props['aria-label']?.startsWith('Pay '));
  const toggle = (label, value) => { const box = checkboxes().find(n => n.props['aria-label'] === `Pay ${label}`); assert.ok(box); assert.equal(Boolean(box.props.disabled), false); box.props.onCheckedChange(value); };
  return { render, text, button, checkboxes, toggle, context, all,
    customInput(value) { const input = all(render(), node => node.type === 'Input' && node.props['aria-label'] === 'Custom payment amount')[0]; assert.ok(input); input.props.onChange({ target: { value } }); },
    update(next) { context = next; }, checkout: () => checkout };
}
const flush = async () => { for (let i = 0; i < 4; i++) await Promise.resolve(); };
const acceptances = f => f.all(f.render(), n => n.type === 'Checkbox' && !n.props['aria-label']);
function addIndependent(f, type = 'EXTRA', title = 'Separate extra') {
  const item = { ...f.context.payments[0], type, sequence: 1, title, description: 'Independent charge description', baseAmount: '20.00' };
  f.context.payments.push(item);
  f.context.fullBalance.amount = '275.59'; f.context.fullBalance.items.push({ type, sequence: 1 });
  return item;
}
test('default shows only schedule.next title, description and amount without installment checkboxes', () => {
  const f = fixture(); const text = f.text(f.render());
  assert.equal(f.checkboxes().length, 0); assert.match(text, /Next paymentAdditional initial paymentDescription for Additional initial payment/);
  assert.match(text, /Payment total\$98.26/); assert.doesNotMatch(text, /Original release|Additional release/);
  assert.equal(f.button('Pay next installment').props.disabled, false);
});
test('several due rows still pay only schedule.next rather than the first option or all due rows', async () => {
  const f = fixture(); f.context.payments[1].advanceOnly = false;
  f.context.schedule.next = { ...f.context.schedule.rows[1], status: 'DUE' };
  f.button('Pay next installment').props.onClick(); await flush();
  assert.deepEqual(f.checkout()[6], { items: [{ type: 'INSTALLMENT', sequence: 2 }], expectedBalance: 59.07 });
  assert.equal(f.checkout()[5], undefined); assert.equal(f.checkout()[7], undefined);
});
test('full project review includes future installments read-only and returns to the next payment', () => {
  const f = fixture(); f.button('Pay full balance').props.onClick();
  const text = f.text(f.render()); assert.match(text, /Full project balance/);
  assert.match(text, /Included project installments.*Additional initial payment.*Original release.*Additional release/);
  assert.match(text, /Payment total\$255.59/); assert.equal(f.checkboxes().length, 0);
  f.button('Back to next payment').props.onClick();
  assert.match(f.text(f.render()), /Payment total\$98.26/); assert.ok(f.button('Pay next installment'));
});
test('full project sends the protected approved balance, excluding public delivery and extra totals', async () => {
  const f = fixture(); addIndependent(f); addIndependent(f, 'DELIVERY', 'Delivery');
  f.button('Pay full balance').props.onClick(); f.button('Continue to payment').props.onClick(); await flush();
  assert.equal(f.checkout()[4], undefined); assert.equal(f.checkout()[5], undefined); assert.equal(f.checkout()[6], undefined);
  assert.deepEqual(f.checkout()[7], { customAmount: 255.59, expectedBalance: 255.59 });
});
test('missing project options do not produce an incomplete full balance review', () => {
  const f = fixture(); f.context.payments.pop();
  assert.equal(f.all(f.render(), n => n.type === 'Button').some(n => f.text(n) === 'Pay full balance'), false);
});
test('a changed schedule discards the previous full review instead of charging stale amounts', () => {
  const f = fixture(); f.button('Pay full balance').props.onClick();
  const updated = clone(f.context); updated.schedule.fullBalance.amount = '256.59'; updated.payments[0].baseAmount = '99.26';
  updated.schedule.next.balance = '99.26'; f.update(updated);
  assert.doesNotMatch(f.text(f.render()), /Included project installments/); assert.match(f.text(f.render()), /Payment total\$99.26/);
  assert.ok(f.button('Pay next installment'));
});
test('future payments cannot be selected individually when no installment is currently due', () => {
  const f = fixture(); f.context.schedule.next = null; f.context.payments.forEach(item => { item.advanceOnly = true; });
  assert.match(f.text(f.render()), /No project payment is currently due/); assert.equal(f.checkboxes().length, 0);
  assert.equal(f.all(f.render(), n => n.type === 'Button').some(n => f.text(n) === 'Pay next installment'), false);
  assert.ok(f.button('Pay full balance')); assert.ok(f.button('Pay another amount'));
});
test('legacy upcoming options are not selectable one by one or mistaken for a due payment', () => {
  const f = fixture(true); assert.equal(f.checkboxes().length, 0);
  assert.equal(f.all(f.render(), n => n.type === 'Button').length, 0);
});
for (const type of ['MATERIAL', 'INSTALLATION', 'PERMIT']) {
  test(`legacy ${type} uses the first due option and retains revision blocking`, async () => {
    const f = fixture(); const payment = { ...f.context.payments[0], type };
    const context = { enabled: true, status: 'due', payment, materialRevisionPending: true };
    f.update(context); assert.equal(f.button('Continue to payment').props.disabled, true);
    f.button('Continue to payment').props.onClick(); assert.equal(f.checkout(), null);
    context.materialRevisionPending = false; f.button('Continue to payment').props.onClick(); await flush();
    assert.deepEqual(f.checkout()[6], { items: [{ type, sequence: 101 }], expectedBalance: 98.26 });
  });
}
test('legacy deposit preserves its signature exemption and explicit deposit acceptance', async () => {
  const f = fixture(); const payment = { ...f.context.payments[0], type: 'INSTALLATION_DEPOSIT', requiresTerms: true, terms: 'Deposit is non-refundable.' };
  f.update({ enabled: true, status: 'due', payment, agreement: { required: true, satisfied: false } });
  assert.equal(f.button('Continue to payment').props.disabled, true); acceptances(f)[0].props.onCheckedChange(true);
  assert.equal(f.button('Continue to payment').props.disabled, false); f.button('Continue to payment').props.onClick(); await flush();
  assert.equal(f.checkout()[1], true); assert.equal(f.checkout()[6].items[0].type, 'INSTALLATION_DEPOSIT');
});
test('a required deposit remains payable when a schedule exists but its next installment is not yet offered', async () => {
  const f = fixture(); f.context.payments = [{ ...f.context.payments[0], type: 'INSTALLATION_DEPOSIT', title: 'Installation deposit', requiresTerms: true, terms: 'Deposit terms.' }];
  f.context.agreement.satisfied = false;
  assert.match(f.text(f.render()), /Next paymentInstallation deposit/);
  assert.equal(f.button('Continue to payment').props.disabled, true); acceptances(f)[0].props.onCheckedChange(true);
  f.button('Continue to payment').props.onClick(); await flush();
  assert.equal(f.checkout()[6].items[0].type, 'INSTALLATION_DEPOSIT'); assert.equal(f.checkout()[1], true);
});
test('required agreement blocks next, full and custom project payments', () => {
  const f = fixture(); f.context.agreement.satisfied = false;
  assert.equal(f.button('Pay next installment').props.disabled, true); f.button('Pay next installment').props.onClick();
  f.button('Pay full balance').props.onClick(); assert.equal(f.button('Continue to payment').props.disabled, true);
  f.button('Continue to payment').props.onClick(); f.button('Pay another amount').props.onClick(); f.customInput('1');
  assert.equal(f.button('Continue to payment').props.disabled, true); f.button('Continue to payment').props.onClick(); assert.equal(f.checkout(), null);
});
for (const source of ['context', 'schedule']) {
  test(`revision from ${source} blocks next and full and clears a previous full choice`, () => {
    const f = fixture(); f.button('Pay full balance').props.onClick();
    const target = source === 'context' ? f.context : f.context.schedule; target.materialRevisionPending = true;
    assert.equal(f.button('Pay next installment').props.disabled, true); assert.equal(f.button('Pay full balance').props.disabled, true);
    f.button('Pay next installment').props.onClick(); f.button('Pay full balance').props.onClick(); assert.equal(f.checkout(), null);
    target.materialRevisionPending = false; assert.equal(f.button('Pay next installment').props.disabled, false);
    assert.doesNotMatch(f.text(f.render()), /Included project installments/);
  });
}
test('next zero balance remains confirmable and keeps order-review and revision guards', async () => {
  const f = fixture(); f.context.payments[0].baseAmount = '0.00'; f.context.schedule.next.balance = '0.00';
  assert.equal(f.button('Confirm order').props.disabled, false); f.context.schedule.requiresOrderReview = true;
  assert.ok(f.button('Submit for order review')); f.context.materialRevisionPending = true;
  assert.equal(f.button('Submit for order review').props.disabled, true); f.button('Submit for order review').props.onClick(); assert.equal(f.checkout(), null);
  f.context.materialRevisionPending = false; f.button('Submit for order review').props.onClick(); await flush();
  assert.deepEqual(f.checkout()[6], { items: [{ type: 'INSTALLMENT', sequence: 101 }], expectedBalance: 0 });
});
test('pending checkout must match both amount and exact items before resuming', () => {
  const f = fixture(); f.context.checkouts = [{ items: [{ type: 'INSTALLMENT', sequence: 101 }, { type: 'INSTALLMENT', sequence: 2 }], baseAmount: '157.33', totalAmount: '157.33', surchargeAmount: '0' }];
  assert.ok(f.button('Pay next installment'));
  f.context.checkouts.push({ items: [{ type: 'INSTALLMENT', sequence: 101 }], baseAmount: '98.26', totalAmount: '98.26', surchargeAmount: '0' });
  assert.ok(f.button('Resume payment')); f.context.materialRevisionPending = true;
  assert.equal(f.button('Resume payment').props.disabled, true); f.button('Resume payment').props.onClick(); assert.equal(f.checkout(), null);
});
test('City Fee consent is required, disabled by revision and invalidated when the fee changes', () => {
  const f = fixture(); f.context.payments[0].requiresCityFeeAcceptance = true; f.context.payments[0].cityFeeAmount = '10.00';
  f.context.materialRevisionPending = true; assert.equal(acceptances(f)[0].props.disabled, true);
  acceptances(f)[0].props.onCheckedChange(true); assert.equal(acceptances(f)[0].props.checked, false);
  f.context.materialRevisionPending = false; assert.equal(f.button('Pay next installment').props.disabled, true);
  acceptances(f)[0].props.onCheckedChange(true); assert.equal(f.button('Pay next installment').props.disabled, false);
  f.context.payments[0].cityFeeAmount = '11.00'; assert.equal(f.button('Pay next installment').props.disabled, true);
});
test('full review retains City Fee acceptance for included project installments', async () => {
  const f = fixture(); f.context.payments[2].requiresCityFeeAcceptance = true; f.context.payments[2].cityFeeAmount = '98.26';
  f.button('Pay full balance').props.onClick(); assert.equal(f.button('Continue to payment').props.disabled, true);
  acceptances(f)[0].props.onCheckedChange(true); f.button('Continue to payment').props.onClick(); await flush();
  assert.equal(f.checkout()[3], true); assert.equal(f.checkout()[7].customAmount, 255.59);
});
for (const type of ['DELIVERY', 'EXTRA']) {
  test(`${type} is a separate action and never silently replaces a paused next installment`, async () => {
    const f = fixture(); addIndependent(f, type, 'Independent charge'); f.context.materialRevisionPending = true;
    assert.equal(f.button('Pay next installment').props.disabled, true);
    f.button('Pay Independent charge').props.onClick(); assert.equal(f.button('Continue to payment').props.disabled, false);
    assert.match(f.text(f.render()), /Payment total\$20.00/); f.button('Continue to payment').props.onClick(); await flush();
    assert.deepEqual(f.checkout()[6], { items: [{ type, sequence: 1 }], expectedBalance: 20 });
    assert.equal(f.checkout()[5], undefined); assert.equal(f.checkout()[7], undefined);
  });
}
test('returning from a separate charge restores the next installment and refresh drops a stale charge choice', () => {
  const f = fixture(); addIndependent(f); f.button('Pay Separate extra').props.onClick(); f.button('Back to next payment').props.onClick();
  assert.ok(f.button('Pay next installment')); f.button('Pay Separate extra').props.onClick();
  const updated = clone(f.context); updated.payments.at(-1).baseAmount = '25.00'; f.update(updated);
  assert.ok(f.button('Pay next installment')); assert.match(f.text(f.render()), /Payment total\$98.26/);
});
test('when next is null a delivery charge is not mislabeled as the next project installment', () => {
  const f = fixture(); f.context.schedule.next = null; addIndependent(f, 'DELIVERY', 'Delivery');
  f.context.payment = f.context.payments.at(-1);
  assert.match(f.text(f.render()), /No project payment is currently due/); assert.ok(f.button('Pay Delivery'));
  assert.equal(f.all(f.render(), n => n.type === 'Button').some(n => f.text(n) === 'Pay next installment'), false);
});
test('custom payment maximum and allocation exclude separate charges and reset when returning', async () => {
  const f = fixture(); addIndependent(f); f.button('Pay another amount').props.onClick(); f.customInput('260');
  assert.equal(f.button('Enter a valid amount').props.disabled, true); f.customInput('150');
  assert.match(f.text(f.render()), /How this payment will be applied.*Additional initial payment.*Original release/);
  f.button('Back to next payment').props.onClick(); assert.ok(f.button('Pay next installment'));
  f.button('Pay another amount').props.onClick(); assert.equal(f.button('Enter a valid amount').props.disabled, true);
  f.customInput('150'); f.button('Continue to payment').props.onClick(); await flush();
  assert.deepEqual(f.checkout()[7], { customAmount: 150, expectedBalance: 255.59 }); assert.equal(f.checkout()[6], undefined);
});
test('refund-review context without payable options shows no payment controls', () => {
  const f = fixture(); const context = clone(f.context); context.status = 'review'; context.payments = []; context.payment = null;
  context.schedule.refundReviewPending = true; context.schedule.fullBalance = null; f.update(context);
  assert.match(f.text(f.render()), /A refund is under review/); assert.equal(f.all(f.render(), n => n.type === 'Button').length, 0);
});
test('cancellation removes all payment controls including independent charges', () => {
  const f = fixture(); addIndependent(f); f.button('Pay full balance').props.onClick();
  f.update({ ...f.context, status: 'canceled', payment: null }); assert.match(f.text(f.render()), /This estimate has been canceled/);
  assert.equal(f.all(f.render(), n => n.type === 'Button' || n.type === 'Checkbox').length, 0); assert.equal(f.checkout(), null);
});
module.exports = { fixture };
if (require.main === module) (async () => {
  global.window = { location: { href: '' } };
  global.fetch = () => { throw new Error('Network forbidden in public payment tests'); };
  let failures = 0;
  for (const { name, run } of tests) {
    try { await run(); console.log(`PASS ${name}`); } catch (error) { failures++; console.error(`FAIL ${name}`, error); }
  }
  console.log(`${tests.length - failures}/${tests.length} isolated component tests passed (simulated React and API).`);
  if (failures) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
