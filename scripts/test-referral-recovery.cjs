// Exercise the real recovery form's event handlers with isolated state and API stubs.
// No bank transfers, browser, network, or database access.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const jsx = (type, props) => ({ type, props });
const ui = new Proxy({}, { get: (_, name) => name });
let states = [], cursor = 0, calls = [], done = 0;
const mocks = {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  react: { useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial;
    return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; } },
  sonner: { toast: { success() {} } },
  '@/app/api/referrals.api': { async recoverReferralPayout(id, data) { calls.push({ id, data }); } },
};
function load(relative) {
  const filename = path.resolve(__dirname, '../src', relative);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  new Function('require', 'exports', code)(id => {
    if (id === '@/lib/referrals') return load('lib/referrals.ts');
    if (id.startsWith('@/components/ui/')) return ui;
    assert.ok(id in mocks, `Unexpected dependency: ${id}`);
    return mocks[id];
  }, exports);
  return exports;
}
const { ReferralPayoutRecoveryForm } = load('components/referrals/referral-payout-recovery.tsx');
const payout = { id: 17, userName: 'Test member', amount: '100.00', status: 'PROCESSING', bankName: 'Test bank', accountLast4: '1234', processingById: 99 };
const render = () => { cursor = 0; return ReferralPayoutRecoveryForm({ payout, onDone: async () => { done++; }, onCancel() {} }); };
const all = (node, predicate) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(child => all(child, predicate)) : [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
const text = node => node == null ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
const field = id => all(render(), node => node.props?.id === id)[0];
const change = (id, value) => field(id).props.onChange({ target: { value } });
const check = index => all(render(), node => node.type === 'input' && node.props.type === 'checkbox')[index].props.onChange({ target: { checked: true } });
const submit = () => all(render(), node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
const expand = () => all(render(), node => node.type === 'Button' && text(node) === 'Record verified bank outcome')[0].props.onClick();

(async () => {
  assert.match(text(render()), /Another administrator is processing/);
  assert.equal(all(render(), node => node.type === 'form').length, 0);
  assert.doesNotMatch(text(render()), /View bank details|Start processing|ACH routing:/);
  expand();
  change('recovery-reference', 'BANK-TEST');
  change('recovery-date', '2026-10-08T10:30:45');
  change('recovery-note', 'Verified with bank while assigned administrator was unavailable.');
  await submit();
  assert.equal(calls.length, 0, 'Bank verification must be explicit');
  check(0);
  await submit();
  assert.equal(calls.length, 0, 'Bank receipt proof is required for recovery');
  change('recovery-proof', 'RECEIPT-TEST');
  await submit();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].data.status, 'PAID');
  assert.equal(calls[0].data.expectedProcessingById, 99);
  assert.equal(calls[0].data.bankOutcomeConfirmed, true);
  assert.equal(calls[0].data.proofReference, 'RECEIPT-TEST');
  assert.ok(!('accountNumber' in calls[0].data));
  assert.equal(done, 1);

  states = []; calls = []; done = 0;
  expand();
  change('recovery-status', 'FAILED');
  change('recovery-note', 'Bank confirms no funds sent and no transfer pending.');
  check(0);
  await submit();
  assert.equal(calls.length, 0, 'No-funds/no-pending confirmation is separately required');
  assert.match(text(render()), /no funds were sent and no transfer is pending/);
  check(1);
  await submit();
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].data, { status: 'FAILED', expectedProcessingById: 99, bankOutcomeConfirmed: true,
    note: 'Bank confirms no funds sent and no transfer pending.', confirmedNotSent: true });
  assert.equal(done, 1);
  console.log('Referral recovery UI checks passed: explicit entry, no bank access, paid proof, no-pending confirmation, and original claim preserved.');
})().catch(error => { console.error(error); process.exitCode = 1; });
