// Real estimate list rendering with simulated UI dependencies; no network or payments.
// Run: node scripts/test-estimate-payment-access.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const jsx = (type, props) => ({ type, props });
const ui = new Proxy({}, { get: (_, name) => name });
let state = null, stateIndex = 0;
const mutations = [], notices = [], navigation = [];
const mocks = {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  react: { useState: value => {
    if (!state) return [value, () => {}];
    const index = stateIndex++;
    if (!(index in state)) state[index] = value;
    return [state[index], value => { state[index] = value; }];
  } },
  'next/link': { default: 'Link' },
  'next/navigation': { useRouter: () => ({ push: url => navigation.push(url), refresh: () => navigation.push('refresh') }) },
  'lucide-react': ui,
  sonner: { toast: { success: message => notices.push(message), error: message => notices.push(message) } },
  '@/app/api/estimates.api': { deleteEstimate: async id => { mutations.push({ action: 'delete', id }); } },
  '@/app/api/payments.api': {},
  '@/lib/estimate-status': {},
  '@/lib/formatters': {},
  './estimate-cost-columns': { getEstimateCostColumns: () => [] },
  '@/components/estimates/estimate-payment-link-actions': ui,
  './estimate-lifecycle-actions': { estimateLifecycleAction: () => null },
  './duplicate-estimate-dialog': ui,
};
function load(relative) {
  const filename = path.resolve(__dirname, '../src', relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exported = {};
  new Function('require', 'exports', compiled)(name => {
    if (name === '@/lib/rbac') return load('lib/rbac.ts');
    if (name === '@/components/delete-conf-dialog') return load('components/delete-conf-dialog.tsx');
    if (name.startsWith('@/components/ui/')) return ui;
    assert.ok(name in mocks, `Unexpected dependency: ${name}`);
    return mocks[name];
  }, exported);
  return exported;
}
const { getEstimateColumns } = load('components/estimates/estimates-columns.tsx');
const all = (node, predicate) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(child => all(child, predicate))
  : [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
const text = node => node == null ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node)
  ? node.map(text).join('') : text(node.props?.children);
const base = { id: 17, number: 'EST-17', name: 'Customer estimate', idUser: 7,
  user: { role: { name: 'dealer' }, dealerMode: 'INTERNAL' }, dealerModeSnapshot: 'INTERNAL',
  status: { name: 'Active' }, totalPayable: '200', units: 1, order: null, payments: [] };
const paid = { type: 'INSTALLMENT', sequence: 1, status: 'PAID', originalBaseAmount: '100', netPaidBaseAmount: '25' };
const pending = { type: 'INSTALLMENT', sequence: 1, status: 'PENDING', stripeSessionId: 'fixture-checkout' };
let count = 0;
function check(name, actor, overrides, expected) {
  const estimate = { ...base, ...overrides };
  const columns = getEstimateColumns(actor);
  const render = column => column.cell({ row: { original: estimate } });
  for (const key of ['number', 'name']) {
    const links = all(render(columns.find(column => column.accessorKey === key)), node => node.type === 'Link');
    assert.equal(links.length, 1, name);
    assert.equal(links[0].props.href, `/estimates/17${expected === 'View Details' ? '' : '/edit'}`, name);
    assert.ok(links[0].props['aria-label'].startsWith(expected + ':'), name);
  }
  const actions = render(columns.find(column => column.id === 'actions'));
  const editorLinks = all(actions, node => node.type === 'Link' && node.props.href === '/estimates/17/edit');
  assert.equal(editorLinks.length, expected === 'View Details' ? 0 : 1, name);
  if (editorLinks.length) assert.equal(text(editorLinks[0]), expected, name);
  if (estimate.payments.length) assert.doesNotMatch(text(actions), /Delete Estimate/, name);
  console.log(`PASS ${name}`); count++;
}
for (const actor of [{ id: 1, role: { name: 'admin' } }, { id: 7, role: { name: 'dealer' } }]) {
  const role = actor.role.name;
  check(`${role}: new estimate still allows editing`, actor, {}, 'Edit Estimate');
  check(`${role}: open customer checkout keeps access to manual payments`, actor, { payments: [pending] }, 'Open Estimate');
  check(`${role}: partial payment keeps access to remaining installments`, actor, { payments: [paid] }, 'Open Estimate');
  check(`${role}: pending order review stays accessible`, actor,
    { status: { name: 'Pending order review' }, payments: [paid] }, 'Open Estimate');
  for (const status of ['Canceled', 'Expired', 'Ordered']) {
    check(`${role}: ${status} estimate does not open the editor`, actor,
      { status: { name: status }, payments: [paid] }, 'View Details');
  }
  check(`${role}: existing order retains report navigation`, actor, { order: { id: 3 }, payments: [paid] }, 'View Details');
}
check('unrelated dealer gets no payment-management access', { id: 9, role: { name: 'dealer' } },
  { payments: [paid] }, 'View Details');
check('internal network member retains authorized access', { id: 9, role: { name: 'dealer' } },
  { payments: [paid], dealerNetwork: { canAssist: true, canPay: false, canRecordManualPayment: true } }, 'Open Estimate');

const owner = { id: 7, role: { name: 'dealer' } };
const preliminaryInstallation = { id: 12, status: 'DEPOSIT_PAYMENT_PENDING' };
function renderActions(estimate, actor = owner) {
  stateIndex = 0;
  return getEstimateColumns(actor).find(column => column.id === 'actions').cell({ row: { original: estimate } });
}
function deleteItem(tree) {
  return all(tree, node => node.type === 'DropdownMenuItem' && text(node) === 'Delete Estimate')[0];
}
function checkDelete(name, overrides, expected, actor = owner) {
  const tree = renderActions({ ...base, ...overrides }, actor);
  assert.equal(Boolean(deleteItem(tree)), expected, name);
  assert.deepEqual(mutations, [], name);
  console.log(`PASS ${name}`); count++;
}
checkDelete('deletes an unpaid estimate without installation', {}, true);
checkDelete('deletes a calculated installation awaiting its first deposit', { installationJob: preliminaryInstallation }, true);
checkDelete('accepts explicit server eligibility for a preliminary installation', {
  installationJob: { ...preliminaryInstallation, canDeleteWithEstimate: true },
}, true);
checkDelete('honors server refusal even while the deposit is pending', {
  installationJob: { ...preliminaryInstallation, canDeleteWithEstimate: false },
}, false);
for (const status of ['MATERIAL_PAYMENT_PENDING', 'PERMIT_PAYMENT_PENDING']) {
  checkDelete(`allows an initial quote with waived deposit at ${status} when the server permits it`, {
    installationJob: { id: 12, status, canDeleteWithEstimate: true },
  }, true);
}
for (const eligible of [undefined, false]) {
  checkDelete(`hides an advanced quote when deletion eligibility is ${eligible}`, {
    installationJob: { id: 12, status: 'CUSTOMER_APPROVAL_PENDING', canDeleteWithEstimate: eligible },
  }, false);
}
checkDelete('retains deletion for canceled installation records', {
  installationJob: { id: 12, status: 'CANCELED' },
}, true);
checkDelete('allows an unpaid scheduled payment with no checkout or history', {
  installationJob: preliminaryInstallation,
  payments: [{ type: 'INSTALLATION_DEPOSIT', status: 'PENDING', stripeSessionId: null }],
}, true);
for (const type of ['INSTALLATION_DEPOSIT', 'PERMIT', 'INSTALLMENT']) {
  for (const evidence of [
    { status: 'PAID' },
    { status: 'REFUNDED' },
    { paidAt: '2026-09-22' },
    { stripeSessionId: 'checkout' },
    { stripePaymentIntentId: 'intent' },
    { netPaidBaseAmount: '1.00' },
    { refundedAmount: '1.00' },
    { refundCreditAmount: '1.00' },
    { refundReviewPending: true },
    { receipts: [{ id: 1 }] },
  ]) {
    checkDelete(`blocks deletion with ${type} ${Object.keys(evidence)[0]} after an unpaid first installment`, {
      installationJob: { ...preliminaryInstallation, canDeleteWithEstimate: true },
      payments: [
        { type: 'INSTALLMENT', sequence: 1, status: 'PENDING', stripeSessionId: null },
        { type, sequence: 2, status: 'PENDING', ...evidence },
      ],
    }, false);
  }
}
for (const overrides of [{ status: { name: 'Canceled' } }, { status: { name: 'Ordered' } }, { order: { id: 3 } }]) {
  checkDelete(`retains lifecycle restriction ${JSON.stringify(overrides)}`, {
    ...overrides, installationJob: preliminaryInstallation,
  }, false);
}
for (const actor of [{ id: 9, role: { name: 'dealer' } }, { id: 1, role: { name: 'admin' } }]) {
  checkDelete(`retains owner-only deletion for ${actor.role.name}`, { installationJob: preliminaryInstallation }, false, actor);
}

async function checkDeleteConfirmation() {
  const estimate = { ...base, installationJob: preliminaryInstallation };
  state = [];
  const dialog = () => {
    const node = all(renderActions(estimate), node => node.type?.name === 'DeleteConfirmationDialog')[0];
    assert.ok(node, 'renders the actual confirmation component');
    return node.type(node.props);
  };
  assert.equal(dialog().props.open, false);
  deleteItem(renderActions(estimate)).props.onSelect();
  const opened = dialog();
  assert.equal(opened.props.open, true);
  assert.match(text(opened), /estimate and its calculated installation together/);
  assert.deepEqual(mutations, [], 'opening does not delete');
  all(opened, node => node.type === 'AlertDialogCancel')[0].props.onClick();
  assert.equal(dialog().props.open, false);
  assert.deepEqual(mutations, [], 'dismissing does not delete');
  deleteItem(renderActions(estimate)).props.onSelect();
  await all(dialog(), node => node.type === 'AlertDialogAction')[0].props.onClick();
  assert.deepEqual(mutations, [{ action: 'delete', id: 17 }], 'one estimate deletion handles both records');
  assert.equal(dialog().props.open, false);
  assert.deepEqual(navigation, ['refresh']);
  assert.deepEqual(notices, ['Estimate deleted successfully.']);
  state = null;
  console.log('PASS confirms deletion of estimate and calculated installation in one operation'); count++;
}
checkDeleteConfirmation().then(() => {
console.log(`${count} estimate payment access checks passed`);
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
