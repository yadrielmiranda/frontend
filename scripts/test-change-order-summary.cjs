/* Pruebas aisladas de los componentes reales con React y API simulados.
 * No ejecutan navegador, firma ni cobros. Desde frontend:
 * node scripts/test-change-order-summary.cjs */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const jsx = (type, props) => ({ type, props });
const tests = [];
const test = (name, run) => tests.push({ name, run });
const base = path.resolve(__dirname, '../src/components/estimates/agreements');
function load(name, mocks) {
  const file = path.join(base, name);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file, compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => {
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id === '@/lib/formatters') return { formatMoney: value => `$${Number(value).toFixed(2)}` };
    if (id in mocks) return mocks[id];
    throw new Error(`Missing explicit mock: ${id}`);
  }, module, module.exports);
  return module.exports;
}
const nodes = value => Array.isArray(value) ? value.flatMap(nodes)
  : value && typeof value === 'object' ? [value, ...nodes(value.props?.children)] : [];
const text = value => Array.isArray(value) ? value.map(text).join('')
  : value && typeof value === 'object' ? text(value.props?.children)
  : value == null || typeof value === 'boolean' ? '' : String(value);
const change = { number: 1, previousTotal: '1200.00', newTotal: '1400.00', difference: '200.00',
  previousIncomplete: false, newIncomplete: false, changedCharges: ['Installation'], items: [] };
const preview = { dueAfterSigning: '100.00', remainingScheduled: '200.00', paid: '1100.00', balance: '300.00' };
const { ChangeOrderDetails } = load('change-order-details.tsx', {});
function panel({ signed = false, external = false, acceptedElsewhere = false, material = false, invalidated = false, canceled = false } = {}) {
  const mocks = {
    react: { useState: v => [v, () => {}], useCallback: fn => fn, useEffect() {}, useMemo: fn => fn() },
    'next/navigation': { useRouter: () => ({ refresh() {} }) },
    '@/components/ui/button': { Button: 'Button' }, '@/components/ui/input': { Input: 'Input' },
    '@/components/ui/label': { Label: 'Label' },
    '@/app/api/contracts.api': { publicAgreementPdfUrl: () => '/test.pdf' },
    '@/app/api/payments.api': {},
    './signature-pad': { SignaturePad: 'SignaturePad' }, './contract-pages': { ContractPages: 'ContractPages' },
    './change-order-details': { ChangeOrderDetails: 'ChangeOrderDetails' },
    './material-change-details': { MaterialChangeDetails: 'MaterialChangeDetails' },
    '@/components/estimates/public-estimate-payment-card': { PublicEstimatePaymentCard: 'PaymentCard' },
    '../estimate-details/views/estimate-view-dealer-public': { EstimateViewDealerPublic: 'Report' },
    '@/components/promotions/promotion-banner': { usePromotionExpired: () => false },
  };
  const { PublicAgreementPanel } = load('public-agreement-panel.tsx', mocks);
  return PublicAgreementPanel({ token: 'test', estimate: { publicPricingMode: 'detailed' },
    initialStatus: { current: { id: 'agreement', kind: material ? 'AGREEMENT' : 'CHANGE_ORDER',
      changeOrderNumber: 1, materialRevisionId: material ? 10 : null, state: signed ? 'SIGNED' : 'AWAITING_SIGNATURE',
      signedAt: signed ? '2026-09-26T12:00:00Z' : null, invalidatedAt: invalidated ? '2026-09-26' : null },
      estimateCanceled: canceled, history: [], paymentsEnabled: !external, changeOrder: material ? null : change,
      changeOrderPaymentPreview: external ? null : preview,
      materialChange: material ? { ...change, paymentPreview: preview } : null,
    },
    paymentContext: external ? null : { enabled: true, status: 'due', schedule: {},
      agreement: { required: true, satisfied: signed || acceptedElsewhere } },
  });
}
test('shows the change total and its initial and scheduled balances before signature', () => {
  const output = text(ChangeOrderDetails({ change, paymentPreview: preview }));
  for (const expected of ['$200.00', '$1400.00', 'Amount payable after signing$100.00', 'Remaining scheduled balance$200.00', 'Payments already made$1100.00'])
    assert.ok(output.includes(expected), expected);
});
test('explains when installation is not due immediately after signature', () => {
  const output = text(ChangeOrderDetails({ change, paymentPreview: { ...preview, dueAfterSigning: '0.00' } }));
  assert.ok(output.includes('No payment becomes due immediately after signing'));
});
test('does not display a private payment preview when none was supplied', () => {
  const output = text(ChangeOrderDetails({ change }));
  assert.ok(!output.includes('Amount payable after signing'));
  assert.ok(!output.includes('$1100.00'));
});
test('keeps payment controls hidden for an unsigned installation-only Change Order', () => {
  const output = nodes(panel());
  assert.ok(!output.some(n => n.type === 'PaymentCard'));
  assert.equal(output.find(n => n.type === 'Report').props.showPaymentSchedule, false);
  assert.deepEqual(output.find(n => n.type === 'ChangeOrderDetails').props.paymentPreview, preview);
});
test('restores independent payments after the Change Order is signed', () => {
  const output = nodes(panel({ signed: true }));
  assert.ok(output.some(n => n.type === 'PaymentCard'));
  assert.equal(output.find(n => n.type === 'ChangeOrderDetails').props.paymentPreview, null);
});
test('accepts a current signature supplied through the other authorized view', () => {
  assert.ok(nodes(panel({ acceptedElsewhere: true })).some(n => n.type === 'PaymentCard'));
});
test('does not enable payments for external-dealer customer links', () => {
  const output = nodes(panel({ external: true }));
  assert.ok(!output.some(n => n.type === 'PaymentCard'));
  assert.equal(output.find(n => n.type === 'ChangeOrderDetails').props.paymentPreview, null);
});
test('keeps the material-revision pre-signature behavior', () => {
  const output = nodes(panel({ material: true }));
  assert.ok(!output.some(n => n.type === 'PaymentCard'));
  assert.equal(output.find(n => n.type === 'MaterialChangeDetails').props.awaitingSignature, true);
});
test('does not show payment controls for an invalidated signed document', () => {
  assert.ok(!nodes(panel({ signed: true, invalidated: true })).some(n => n.type === 'PaymentCard'));
});
test('hides signature and payment actions for a canceled unsigned agreement', () => {
  const output = nodes(panel({ canceled: true }));
  assert.ok(!output.some(n => ['PaymentCard', 'SignaturePad', 'form'].includes(n.type)));
  assert.equal(output.find(n => n.type === 'ChangeOrderDetails').props.paymentPreview, null);
});
test('retains the signed PDF download on canceled agreements while payments stay hidden', () => {
  const output = panel({ signed: true, canceled: true });
  assert.ok(text(output).includes('Download signed Change Order'));
  assert.ok(!nodes(output).some(n => n.type === 'PaymentCard'));
});
let failures = 0;
for (const { name, run } of tests) {
  try { run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}`, error); }
}
console.log(`${tests.length - failures}/${tests.length} isolated summary tests passed (simulated React and API).`);
if (failures) process.exitCode = 1;
