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
  '@/app/api/estimates.api': {
    deleteEstimate: async id => { mutations.push({ action: 'delete', id }); },
    recalculateEstimate: async (...args) => { mutations.push({ action: 'recalculate', args }); },
  },
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
  const reportLabel = actor.role.name === 'dealer' ? 'Dealer View' : 'View Details';
  const reportLinks = all(actions, node => node.type === 'Link' && text(node) === reportLabel);
  assert.equal(reportLinks.length, 1, `${name}: explicit report menu action`);
  assert.equal(reportLinks[0].props.href, '/estimates/17?view=details', `${name}: report menu must bypass pending-review redirect`);
  if (actor.role.name === 'dealer') {
    const publicLinks = all(actions, node => node.type === 'Link' && text(node) === 'Customer View');
    assert.equal(publicLinks.length, 1, name);
    assert.equal(publicLinks[0].props.href, '/estimates/17?view=public', `${name}: customer report stays separate`);
  }
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
const admin = { id: 1, role: { name: 'admin' } };
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
for (const actor of [owner, admin]) {
  for (const eligible of [undefined, false]) {
    checkDelete(`${actor.role.name}: hides an advanced quote when deletion eligibility is ${eligible}`, {
      installationJob: { id: 12, status: 'CUSTOMER_APPROVAL_PENDING', canDeleteWithEstimate: eligible },
    }, false, actor);
  }
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
    for (const actor of [owner, admin]) {
      checkDelete(`${actor.role.name}: blocks deletion with ${type} ${Object.keys(evidence)[0]} after an unpaid first installment`, {
        installationJob: { ...preliminaryInstallation, canDeleteWithEstimate: true },
        payments: [
          { type: 'INSTALLMENT', sequence: 1, status: 'PENDING', stripeSessionId: null },
          { type, sequence: 2, status: 'PENDING', ...evidence },
        ],
      }, false, actor);
    }
  }
}
for (const overrides of [{ status: { name: 'Canceled' } }, { status: { name: 'Ordered' } }, { order: { id: 3 } }]) {
  for (const actor of [owner, admin]) {
    checkDelete(`${actor.role.name}: retains lifecycle restriction ${JSON.stringify(overrides)}`, {
      ...overrides, installationJob: preliminaryInstallation,
    }, false, actor);
  }
}
for (const role of ['dealer', 'client']) {
  for (const installationJob of [null, preliminaryInstallation]) {
    checkDelete(`admin deletes another ${role}'s eligible estimate ${installationJob ? 'with' : 'without'} installation`, {
      user: { role: { name: role } }, installationJob,
    }, true, admin);
  }
}
for (const role of ['dealer', 'client', 'operator']) {
  checkDelete(`unrelated ${role} cannot delete`, { installationJob: preliminaryInstallation }, false,
    { id: 9, role: { name: role } });
  checkDelete(`${role} retains deletion of own estimate`, { installationJob: preliminaryInstallation }, true,
    { id: 7, role: { name: role } });
}
checkDelete('network assistance does not grant deletion to another dealer', {
  installationJob: preliminaryInstallation, dealerNetwork: { canAssist: true, canPay: true },
}, false, { id: 9, role: { name: 'dealer' } });
checkDelete('missing actor cannot delete', {}, false, null);
checkDelete('admin honors server refusal while the deposit is pending', {
  installationJob: { ...preliminaryInstallation, canDeleteWithEstimate: false },
}, false, admin);
const adminExpiredActions = renderActions({ ...base, status: { name: 'Expired' } }, admin);
assert.ok(deleteItem(adminExpiredActions));
assert.match(text(adminExpiredActions), /Recalculate Estimate/);
assert.doesNotMatch(text(adminExpiredActions), /Pay now/,
  'administrator recalculation does not grant owner payment actions');
console.log('PASS administrator can recalculate another owner\'s expired estimate without gaining payment actions'); count++;

function recalculateItem(tree) {
  return all(tree, node => node.type === 'DropdownMenuItem' && text(node) === 'Recalculate Estimate')[0];
}
function checkRecalculate(name, actor, overrides, expected) {
  const tree = renderActions({ ...base, status: { name: 'Expired' }, ...overrides }, actor);
  assert.equal(Boolean(recalculateItem(tree)), expected, name);
  assert.deepEqual(mutations, [], 'rendering must not recalculate');
  console.log(`PASS ${name}`); count++;
}
for (const role of ['client', 'dealer']) {
  checkRecalculate(`admin can recalculate an expired estimate owned by a ${role}`, admin,
    { user: { role: { name: role } } }, true);
  checkRecalculate(`${role} owner retains expired estimate recalculation`, { id: 7, role: { name: role } }, {}, true);
}
for (const actor of [owner, admin]) {
  for (const overrides of [
    { status: { name: 'Active' } },
    { status: { name: 'Canceled' } },
    { status: { name: 'Ordered' } },
    { order: { id: 3 } },
    { payments: [paid] },
    { payments: [pending] },
  ]) {
    checkRecalculate(`${actor.role.name}: retains recalculation restriction ${JSON.stringify(overrides)}`, actor, overrides, false);
  }
}
for (const role of ['client', 'dealer', 'operator']) {
  checkRecalculate(`unrelated ${role} gains no recalculation action`, { id: 9, role: { name: role } }, {}, false);
}
checkRecalculate('missing actor cannot recalculate', null, {}, false);
checkRecalculate('network assistance retains its current list recalculation permissions',
  { id: 9, role: { name: 'dealer' } }, { dealerNetwork: { canAssist: true } }, false);
assert.equal(recalculateItem(renderActions({ ...base, status: { name: 'Expired' },
  user: { ...base.user, networkSalesBlocked: true } }, admin)).props.disabled, true);
console.log('PASS admin recalculation retains the owner network sales block'); count++;

async function checkAdminRecalculate() {
  mutations.length = notices.length = navigation.length = 0;
  state = [];
  const estimate = { ...base, status: { name: 'Expired' } };
  await recalculateItem(renderActions(estimate, admin)).props.onSelect();
  assert.deepEqual(mutations, [{ action: 'recalculate', args: [17] }],
    'sends only the estimate id; owner pricing is resolved by the backend');
  assert.deepEqual(navigation, ['refresh']);
  assert.deepEqual(notices, ['Estimate recalculated successfully.']);
  assert.equal(recalculateItem(renderActions(estimate, admin)).props.disabled, undefined);
  state = null;
  console.log('PASS admin recalculation calls the existing endpoint and refreshes the estimate list'); count++;
}

async function checkDeleteConfirmation(actor) {
  const estimate = { ...base, installationJob: preliminaryInstallation };
  mutations.length = notices.length = navigation.length = 0;
  state = [];
  const dialog = () => {
    const node = all(renderActions(estimate, actor), node => node.type?.name === 'DeleteConfirmationDialog')[0];
    assert.ok(node, 'renders the actual confirmation component');
    return node.type(node.props);
  };
  assert.equal(dialog().props.open, false);
  deleteItem(renderActions(estimate, actor)).props.onSelect();
  const opened = dialog();
  assert.equal(opened.props.open, true);
  assert.match(text(opened), /estimate and its calculated installation together/);
  assert.deepEqual(mutations, [], 'opening does not delete');
  all(opened, node => node.type === 'AlertDialogCancel')[0].props.onClick();
  assert.equal(dialog().props.open, false);
  assert.deepEqual(mutations, [], 'dismissing does not delete');
  deleteItem(renderActions(estimate, actor)).props.onSelect();
  await all(dialog(), node => node.type === 'AlertDialogAction')[0].props.onClick();
  assert.deepEqual(mutations, [{ action: 'delete', id: 17 }], 'one estimate deletion handles both records');
  assert.equal(dialog().props.open, false);
  assert.deepEqual(navigation, ['refresh']);
  assert.deepEqual(notices, ['Estimate deleted successfully.']);
  state = null;
  console.log(`PASS ${actor.role.name}: confirms deletion of estimate and calculated installation in one operation`); count++;
}
checkDeleteConfirmation(owner).then(() => checkDeleteConfirmation(admin)).then(checkAdminRecalculate).then(() => {
console.log(`${count} estimate payment access checks passed`);
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
