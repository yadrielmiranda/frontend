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
    '@/lib/formatters': { formatMoney: value => `$${Number(value).toFixed(2)}` },
  };
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
  const all = (node, predicate) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
    ? node.flatMap(child => all(child, predicate)) : [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
  const text = node => !node ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
  const button = label => { const b = all(render(), n => n.type === 'Button').find(n => text(n) === label); assert.ok(b, `Button ${label} found`); return b; };
  const checkboxes = () => all(render(), n => n.type === 'Checkbox' && n.props['aria-label']?.startsWith('Pay '));
  const toggle = (label, value) => { const box = checkboxes().find(n => n.props['aria-label'] === `Pay ${label}`); assert.ok(box); assert.equal(Boolean(box.props.disabled), false); box.props.onCheckedChange(value); };
  return { render, text, button, checkboxes, toggle, context, all,
    update(next) { context = next; }, checkout: () => checkout };
}
test('shows due and advance installments individually and preselects only the due amount', () => {
  const f = fixture(); assert.equal(f.checkboxes().length, 3); assert.equal(f.checkboxes().filter(n => n.props.checked).length, 1);
  assert.ok(f.text(f.render()).includes('Charge total$98.26'));
});
test('can uncheck the original release directly from Pay full balance', () => {
  const f = fixture(); f.button('Pay full balance').props.onClick();
  assert.ok(f.checkboxes().every(n => n.props.checked && !n.props.disabled));
  f.toggle('Original release', false); assert.equal(f.checkboxes().filter(n => n.props.checked).length, 2);
  assert.ok(f.text(f.render()).includes('Charge total$196.52'));
});
test('Choose payments retains editable rows instead of hiding future installments', () => {
  const f = fixture(); f.button('Pay full balance').props.onClick(); f.button('Choose payments').props.onClick();
  assert.equal(f.checkboxes().length, 3); f.toggle('Additional release', false);
  assert.ok(f.text(f.render()).includes('Charge total$157.33'));
});
test('can pay only the additional initial installment', async () => {
  const f = fixture(); f.button('Pay now').props.onClick(); await Promise.resolve();
  assert.deepEqual(f.checkout()[6], { items: [{ type: 'INSTALLMENT', sequence: 101 }], expectedBalance: 98.26 });
  assert.equal(f.checkout()[5], undefined);
});
test('can pay a single future change installment', async () => {
  const f = fixture(); f.toggle('Additional initial payment', false); f.toggle('Additional release', true);
  f.button('Pay now').props.onClick(); await Promise.resolve();
  assert.deepEqual(f.checkout()[6], { items: [{ type: 'INSTALLMENT', sequence: 102 }], expectedBalance: 98.26 });
});
test('unchecking original release sends just the two change installments', async () => {
  const f = fixture(); f.button('Pay full balance').props.onClick(); f.toggle('Original release', false);
  f.button('Pay now').props.onClick(); await Promise.resolve();
  assert.deepEqual(f.checkout()[6], { items: [{ type: 'INSTALLMENT', sequence: 101 }, { type: 'INSTALLMENT', sequence: 102 }], expectedBalance: 196.52 });
});
test('disables checkout with an empty selection', () => {
  const f = fixture(); f.toggle('Additional initial payment', false);
  assert.equal(f.button('Select a payment').props.disabled, true);
});
test('does not allow payment before a required signature', () => {
  const f = fixture(); f.context.agreement.satisfied = false;
  assert.equal(f.button('Pay now').props.disabled, true); f.button('Pay now').props.onClick(); assert.equal(f.checkout(), null);
});
test('refreshing changed amounts invalidates a stale custom selection', () => {
  const f = fixture(); f.toggle('Additional initial payment', false); f.toggle('Original release', true);
  const updated = clone(f.context); updated.payments[0].baseAmount = '99.26'; f.update(updated);
  assert.ok(f.text(f.render()).includes('Charge total$99.26'));
  assert.equal(f.checkboxes().find(n => n.props['aria-label'] === 'Pay Original release').props.checked, false);
});
test('old upcoming adjustments are also individually selectable', async () => {
  const f = fixture(true); f.button('Pay full balance').props.onClick(); f.button('Choose payments').props.onClick();
  f.toggle('Original release', false); f.button('Pay now').props.onClick(); await Promise.resolve();
  assert.deepEqual(f.checkout()[6], { items: [{ type: 'INSTALLMENT', sequence: 101 }], expectedBalance: 196.52 });
});
for (const source of ['context', 'schedule']) {
  test(`disables pending installment payments from ${source} without adding visible text`, () => {
    const f = fixture(); const originalText = f.text(f.render());
    if (source === 'context') f.context.materialRevisionPending = true;
    else f.context.schedule = { materialRevisionPending: true };
    assert.equal(f.text(f.render()), originalText);
    assert.ok(f.checkboxes().every(n => n.props.disabled));
    assert.equal(f.button('Pay now').props.disabled, true);
    assert.equal(f.button('Pay full balance').props.disabled, true);
    f.button('Pay now').props.onClick();
    f.button('Pay full balance').props.onClick();
    f.checkboxes()[1].props.onCheckedChange(true);
    assert.equal(f.checkout(), null);
    assert.equal(f.checkboxes().filter(n => n.props.checked).length, 1);
    assert.equal(f.text(f.render()), originalText);
  });
}
for (const type of ['MATERIAL', 'INSTALLATION', 'PERMIT']) {
  test(`disables legacy ${type} payments during a material revision`, () => {
    const f = fixture(); const payment = { ...f.context.payments[0], type };
    f.update({ enabled: true, status: 'due', payment, materialRevisionPending: true });
    assert.equal(f.checkboxes().length, 1);
    assert.equal(f.checkboxes()[0].props.disabled, true);
    assert.equal(f.button('Pay now').props.disabled, true);
    f.button('Pay now').props.onClick(); assert.equal(f.checkout(), null);
  });
}
test('clears full balance selection during a revision and enables only the due payment afterward', () => {
  const f = fixture(); f.button('Pay full balance').props.onClick();
  assert.equal(f.checkboxes().filter(n => n.props.checked).length, 3);
  f.context.materialRevisionPending = true;
  assert.equal(f.button('Pay now').props.disabled, true);
  f.context.materialRevisionPending = false;
  assert.equal(f.checkboxes().filter(n => n.props.checked).length, 1);
  assert.ok(f.checkboxes().every(n => !n.props.disabled));
  assert.equal(f.button('Pay now').props.disabled, false);
  assert.equal(f.button('Pay full balance').props.disabled, false);
});
test('enables the updated balance after a pending revision is completed', async () => {
  const f = fixture(); f.context.materialRevisionPending = true;
  assert.equal(f.button('Pay now').props.disabled, true);
  const updated = clone(f.context); updated.materialRevisionPending = false;
  updated.payments[0].baseAmount = '120.00'; updated.fullBalance = null; f.update(updated);
  assert.ok(f.text(f.render()).includes('Charge total$120.00'));
  assert.equal(f.button('Pay now').props.disabled, false);
  f.button('Pay now').props.onClick(); await Promise.resolve();
  assert.deepEqual(f.checkout()[6], { items: [{ type: 'INSTALLMENT', sequence: 101 }], expectedBalance: 120 });
});
test('disables resuming a checkout and confirming a zero balance while a revision is pending', () => {
  const f = fixture(); f.context.materialRevisionPending = true;
  f.context.checkouts = [{ items: [{ type: 'INSTALLMENT', sequence: 101 }], baseAmount: '98.26', totalAmount: '98.26', surchargeAmount: '0' }];
  assert.equal(f.button('Resume payment').props.disabled, true);
  f.button('Resume payment').props.onClick(); assert.equal(f.checkout(), null);
  f.context.payments[0].baseAmount = '0.00';
  assert.equal(f.button('Confirm step').props.disabled, true);
  f.button('Confirm step').props.onClick(); assert.equal(f.checkout(), null);
});
test('disables City Fee acceptance until the material revision ends', () => {
  const f = fixture(); f.context.materialRevisionPending = true;
  f.context.payments[0].requiresCityFeeAcceptance = true; f.context.payments[0].cityFeeAmount = '10.00';
  const acceptance = () => f.all(f.render(), n => n.type === 'Checkbox' && !n.props['aria-label'])[0];
  assert.equal(acceptance().props.disabled, true);
  acceptance().props.onCheckedChange(true);
  assert.equal(acceptance().props.checked, false);
  f.context.materialRevisionPending = false;
  assert.equal(acceptance().props.disabled, false);
  assert.equal(f.button('Pay now').props.disabled, true);
  acceptance().props.onCheckedChange(true);
  assert.equal(f.button('Pay now').props.disabled, false);
});
for (const type of ['DELIVERY', 'EXTRA', 'INSTALLATION_DEPOSIT']) {
  test(`keeps independent ${type} selectable without including paused installments`, async () => {
    const f = fixture(); f.context.materialRevisionPending = true;
    f.context.payments.push({ ...f.context.payments[0], type, sequence: 1, baseAmount: '20.00', title: 'Independent charge' });
    const boxes = f.checkboxes();
    assert.ok(boxes.slice(0, 3).every(n => n.props.disabled && !n.props.checked));
    assert.equal(boxes[3].props.disabled, false); assert.equal(boxes[3].props.checked, true);
    assert.equal(f.button('Pay now').props.disabled, false);
    f.button('Pay now').props.onClick(); await Promise.resolve();
    assert.deepEqual(f.checkout()[6], { items: [{ type, sequence: 1 }], expectedBalance: 20 });
  });
}
(async () => {
  global.window = { location: { href: '' } };
  let failures = 0;
  for (const { name, run } of tests) {
    try { await run(); console.log(`PASS ${name}`); } catch (error) { failures++; console.error(`FAIL ${name}`, error); }
  }
  console.log(`${tests.length - failures}/${tests.length} isolated component tests passed (simulated React and API).`);
  if (failures) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
