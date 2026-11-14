// Real revision UI handlers with API/browser boundaries mocked; no network or business-data writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const fixtureSource = fs.readFileSync(path.join(__dirname, 'test-address-operations.cjs'), 'utf8').split("test('warehouse selection")[0];
const { harness, load, text, all, flush, deferred } = new Function('require', '__dirname', fixtureSource + '\nreturn { harness, load, text, all, flush, deferred };')(require, __dirname);
const tests = [], test = (name, run) => tests.push({ name, run });
const browser = global.window;
global.window = { confirm: () => true, setInterval: () => 1, addEventListener() {}, removeEventListener() {} };
const customerModule = load('components/estimates/material-revisions/revision-customer-details.tsx');
const customer = { name: 'Existing estimate', firstName: 'Jo', lastName: 'Owner', email: 'jo@example.test', phone: '+13055550100',
  street: '10 Original Street', addressLine2: 'Apt 4B', city: 'Miami', state: 'FL', postalCode: '33145' };
const piece = { mark: 'W1', qty: 2, idProd: 1, idBrand: 1, idSyst: 1, idConf: 1, idFC: 1, idCryst: 1,
  width: '36', height: '48', dealerMarkup: 10 };
const summary = { material: '100', installation: '50', servicesAndFees: '0', projectTotal: '150', paid: '75', approvedCredit: '0', balance: '75', creditBalance: '0', provisionalInstallation: true };
const revision = { id: 9, version: 1, status: 'DRAFT', reason: 'Requested changes', createdAt: '2026-11-14T12:00:00Z',
  canEdit: true, canApprove: false, canCancel: true, requiresSignature: false, original: summary, revised: summary, items: [], customer: null, originalCustomer: null };
const base = { estimateId: 215, estimateNumber: '191124', orderId: null, installationId: 30, isOwner: true,
  canBegin: true, canReviseExisting: true, canEditCustomer: true, canRemovePieces: true, canChangeQuantity: true,
  dealerPricing: true, defaultDealerMarkup: 10, canRequestSignature: true, currentCustomer: customer, customer,
  pieces: [{ id: 10, label: 'Window W1', input: piece }], current: revision, history: [] };
const catalogs = { productsWithBrands: [], systemsWithConfigs: [], frameColors: [], crystals: [], tints: [], coatings: [], privacies: [], muntinPatterns: [], muntinTypes: [] };
function client(patch = {}, api = {}, extraProps = {}) {
  let data = structuredClone({ ...base, ...patch });
  const calls = [];
  const methods = {
    saveMaterialRevisionCustomer: async (id, rev, value) => { calls.push({ method: 'customer', id, rev, value });
      data = { ...data, customer: { ...data.customer, ...value }, current: { ...data.current, customer: { ...data.customer, ...value }, originalCustomer: customer } }; return data; },
    saveMaterialRevisionPiece: async (id, rev, value) => { calls.push({ method: 'piece', id, rev, value }); return data; },
    removeMaterialRevisionPiece: async (id, rev, originalPieceId) => { calls.push({ method: 'remove-piece', id, rev, originalPieceId });
      data = { ...data, current: { ...data.current, items: [{ key: 'remove-10', action: 'REMOVE', originalPieceId: 10, label: 'Window W1', input: piece, changeDescription: ['Remove 2 units'], subtotal: '0' }] } }; return data; },
    removeMaterialRevisionItem: async (id, rev, key) => { calls.push({ method: 'remove-change', id, rev, key }); data = { ...data, current: { ...data.current, items: [] } }; return data; },
    submitMaterialRevision: async (id, rev, accepted) => { calls.push({ method: 'submit', id, rev, accepted }); return data; },
    decideMaterialRevision: async (id, rev, decision, accepted) => { calls.push({ method: 'decision', id, rev, decision, accepted }); return data; },
    beginMaterialRevision: async (...args) => { calls.push({ method: 'begin', args }); return data; },
    getMaterialRevisions: async () => data,
    ...api,
  };
  const h = harness('components/estimates/material-revisions/material-revision-client.tsx', 'MaterialRevisionClient', {
    initialData: data, ...catalogs, ...extraProps,
  }, { '@/app/api/material-revisions.api': methods,
    '../piece-modal': { PieceModal: 'PieceModal' },
    './piece-values': load('components/estimates/material-revisions/piece-values.ts'),
    './revision-customer-details': { ...customerModule, RevisionCustomerDetails: 'RevisionCustomerDetails', RevisionCustomerComparison: 'RevisionCustomerComparison' },
    '../piece-garage-design': {},
  });
  h.render();
  return { ...h, calls, customerEditor: () => h.find(node => node.type === 'RevisionCustomerDetails'),
    async settle() { await flush(); h.render(); },
    choosePiece() { h.find(node => node.type === 'select' && node.props['aria-label'] === 'Piece to revise').props.onChange({ target: { value: '10' } }); h.render(); },
  };
}
function access(data, context = 'estimate') {
  return harness('components/estimates/material-revisions/material-revision-access.tsx', 'MaterialRevisionAccess', { estimateId: 215, context }, {
    '@/lib/use-material-revisions': { useMaterialRevisions: () => ({ data }) },
  });
}
function reviewPanel(data, isAdmin = true, extra = {}) {
  const calls = [];
  const h = harness('components/estimates/order-review-panel.tsx', 'OrderReviewPanel', { estimateId: 215, isAdmin }, {
    '@/lib/use-material-revisions': { useMaterialRevisions: () => ({ data, loading: false, failed: false, refresh() {}, ...extra }) },
    '@/app/api/payments.api': { approveEstimateOrder: async id => { calls.push(id); return { id: 77, number: '7001' }; } },
    'next/navigation': { useRouter: () => ({ replace() {}, refresh() {} }) },
  });
  return { ...h, calls };
}

test('pending review combines payment, revision and administrator approval in one block', () => {
  const f = reviewPanel({ ...base, current: null });
  const output = text(f.render());
  for (const label of ['Pending order review', 'Payment confirmed', 'Customer details', 'Pieces', 'Installation', 'Revise estimate', 'Approve order', 'Existing payments stay credited']) assert.ok(output.includes(label), label);
  assert.equal(f.button('Approve order').props.disabled, false);
  assert.equal(all(f.render(), node => node.props?.['aria-label'] === 'Order review').length, 1);
});
test('estimate page mounts the unified panel only once and keeps paid fields read-only', async () => {
  let status = 'Pending order review';
  const empty = async () => [];
  const api = {
    '@/lib/session': { getCurrentUser: async () => ({ id: 1, role: { name: 'admin' } }) },
    '@/lib/rbac': { isAdminRole: role => role === 'admin', isOperatorRole: role => role === 'operator' },
    '@/app/api/estimates.api': { getEstimate: async () => ({ id: 215, number: '191124', idUser: 2, status: { name: status }, payments: [], order: null }) },
    '@/app/api/installations.api': { getEstimateInstallation: async () => null },
    '@/app/api/products.api': { getProductsWithBrands: empty }, '@/app/api/systems.api': { getSystemsWithConfigs: empty },
    '@/app/api/tints.api': { getTints: empty }, '@/app/api/coatings.api': { getCoatings: empty }, '@/app/api/privacies.api': { getPrivacies: empty },
    '@/app/api/fcolors.api': { getFColors: empty, getGlobalFrameColors: empty }, '@/app/api/crystals.api': { getCrystals: empty },
    '@/app/api/global-parameters.api': { getGlobalParameters: empty }, '@/app/api/muntin-patterns.api': { getMuntinPatterns: empty },
    '@/app/api/muntin-types.api': { getMuntinTypes: empty },
    'next/navigation': { notFound() { throw new Error('Not found'); } },
  };
  const Page = load('app/estimates/[id]/edit/page.tsx', api).default;
  const pending = await Page({ params: Promise.resolve({ id: '215' }) });
  assert.equal(all(pending, node => node.type === 'OrderReviewPanel').length, 1);
  assert.equal(all(pending, node => node.type === 'MaterialRevisionAccess').length, 0);
  assert.equal(all(pending, node => node.type === 'EstimateForm')[0].props.readOnly, true);
  status = 'Active';
  const active = await Page({ params: Promise.resolve({ id: '215' }) });
  assert.equal(all(active, node => node.type === 'OrderReviewPanel').length, 0);
  assert.equal(all(active, node => node.type === 'MaterialRevisionAccess').length, 1);
});
test('approval remains unavailable during a revision, loading, or failed capability lookup', async () => {
  for (const [data, extra] of [[base, {}], [{ ...base, current: null, installationRevisionId: 30 }, {}], [null, { loading: true }], [null, { failed: true }]]) {
    const f = reviewPanel(data, true, extra); assert.equal(f.button('Approve order').props.disabled, true);
    await f.click('Approve order'); assert.deepEqual(f.calls, []);
  }
});
test('non-admin owner sees only permitted revision actions, never order approval', () => {
  const f = reviewPanel({ ...base, current: null }, false);
  assert.ok(text(f.render()).includes('Revise estimate')); assert.ok(!text(f.render()).includes('Approve order'));
  const blocked = reviewPanel({ ...base, current: null, canBegin: false }, false);
  assert.ok(!text(blocked.render()).includes('Revise estimate'));
});
test('estimate and installation show view-order/history after ordering; only order offers Revise order', () => {
  const data = { ...base, orderId: 77, current: null, history: [revision] };
  for (const context of ['estimate', 'installation']) {
    const f = access(data, context); assert.ok(text(f.render()).includes('View order')); assert.ok(text(f.render()).includes('Revision history'));
    assert.ok(!/Revise order|Revise estimate/.test(text(f.render())));
    assert.ok(all(f.render(), node => node.type === 'Link').some(node => node.props.href.endsWith('?view=history')));
  }
  assert.ok(text(access(data, 'order').render()).includes('Revise order'));
});
test('existing owner review stays accessible without permission to start another', () => {
  const f = access({ ...base, canBegin: false }); assert.ok(text(f.render()).includes('Review revision'));
  assert.ok(!text(f.render()).includes('Revise estimate'));
});
test('customer-only proposal preserves untouched fields and cannot submit unsaved edits', async () => {
  const f = client(); const editor = f.customerEditor();
  editor.props.onChange({ ...editor.props.value, name: 'Updated estimate', city: 'Coral Gables' }); f.render();
  assert.equal(f.button('Add Piece').props.disabled, true); assert.equal(f.button('Refresh').props.disabled, true);
  f.customerEditor().props.onSave(); await f.settle();
  assert.deepEqual(f.calls, [{ method: 'customer', id: 215, rev: 9, value: { name: 'Updated estimate', city: 'Coral Gables' } }]);
  assert.equal(f.customerEditor().props.value.addressLine2, 'Apt 4B');
  f.find(node => node.type === 'input' && node.props.type === 'checkbox').props.onChange({ target: { checked: true } }); f.render();
  await f.click('Accept revision'); await f.settle(); assert.equal(f.calls.at(-1).method, 'submit');
  assert.equal(f.calls.at(-1).accepted, true);
});
test('customer address autocomplete preserves the unit and never changes installation coordinates', () => {
  let changed;
  const f = harness('components/estimates/material-revisions/revision-customer-details.tsx', 'RevisionCustomerDetails', {
    value: customer, disabled: false, dirty: false, onChange: value => { changed = value; }, onSave() {}, onDiscard() {},
  });
  f.select('revision-customer-street', { street: '20 New Street', city: 'El Portal', state: 'FL', postalCode: '33138' });
  assert.deepEqual(changed, { ...customer, street: '20 New Street', city: 'El Portal', postalCode: '33138' });
  assert.ok(text(f.render()).includes('The installation address is managed separately.'));
});
test('an unchanged server refresh preserves unsaved customer edits in the same revision', async () => {
  const f = client(); const editor = f.customerEditor();
  editor.props.onChange({ ...editor.props.value, city: 'Unsaved new city' }); f.render();
  f.update({ initialData: structuredClone(base) });
  assert.equal(f.customerEditor().props.value.city, 'Unsaved new city');
  assert.equal(f.customerEditor().props.dirty, true);
  f.customerEditor().props.onSave(); await f.settle();
  assert.deepEqual(f.calls[0].value, { city: 'Unsaved new city' });
});
test('customer save ignores double clicks and late responses after changing estimate', async () => {
  const pending = deferred(); let calls = 0;
  const f = client({}, { saveMaterialRevisionCustomer: () => { calls++; return pending.promise; } });
  const editor = f.customerEditor(); editor.props.onChange({ ...editor.props.value, city: 'Unsaved city' }); f.render();
  const save = f.customerEditor().props.onSave; save(); save(); await flush(); assert.equal(calls, 1);
  const next = structuredClone({ ...base, estimateId: 216, customer: { ...customer, name: 'Next estimate' } });
  f.update({ initialData: next });
  pending.resolve({ ...base, customer: { ...customer, city: 'Late old response' } }); await f.settle();
  assert.equal(f.customerEditor().props.value.name, 'Next estimate');
  assert.equal(f.customerEditor().props.value.city, customer.city);
});
test('a normalized no-op customer save resets the draft from the server response', async () => {
  let sent;
  const f = client({}, { saveMaterialRevisionCustomer: async (_, __, value) => { sent = value; return structuredClone(base); } });
  const editor = f.customerEditor(); editor.props.onChange({ ...editor.props.value, city: ' Miami ' }); f.render();
  assert.equal(f.customerEditor().props.dirty, true);
  f.customerEditor().props.onSave(); await f.settle();
  assert.deepEqual(sent, { city: 'Miami' });
  assert.equal(f.customerEditor().props.value.city, 'Miami');
  assert.equal(f.customerEditor().props.dirty, false);
  assert.equal(f.button('Add Piece').props.disabled, false);
});
test('existing quantities unlock only with server capability; dealer markup stays locked', () => {
  for (const canChangeQuantity of [true, false]) {
    const f = client({ canChangeQuantity }); f.choosePiece(); f.click('Modify Piece');
    const modal = f.find(node => node.type === 'PieceModal');
    assert.equal(modal.props.lockQuantity, !canChangeQuantity); assert.equal(modal.props.lockDealerMarkup, true);
  }
});
test('changed quantity is sent through the revision endpoint without changing original piece data', async () => {
  const f = client(); f.choosePiece(); f.click('Modify Piece');
  const modal = f.find(node => node.type === 'PieceModal');
  await modal.props.onSave({ ...modal.props.initialData, qty: 3 }); await f.settle();
  assert.equal(f.calls[0].method, 'piece'); assert.equal(f.calls[0].value.originalPieceId, 10); assert.equal(f.calls[0].value.piece.qty, 3);
  assert.equal(piece.qty, 2);
});
test('original-piece removal is a proposal and Undo removal discards it rather than deleting the original', async () => {
  const f = client(); f.choosePiece(); f.click('Remove Piece'); await f.settle();
  assert.deepEqual(f.calls[0], { method: 'remove-piece', id: 215, rev: 9, originalPieceId: 10 });
  assert.ok(text(f.render()).includes('2 units removed in this proposal'));
  assert.ok(!text(f.render()).includes('Edit change'));
  await f.click('Undo removal'); await f.settle();
  assert.deepEqual(f.calls[1], { method: 'remove-change', id: 215, rev: 9, key: 'remove-10' });
});
test('missing capabilities keep customer and original removal controls hidden', () => {
  const f = client({ canEditCustomer: false, canRemovePieces: false });
  assert.equal(all(f.render(), node => node.type === 'RevisionCustomerDetails').length, 0);
  assert.ok(!text(f.render()).includes('Remove Piece'));
});
test('history is read-only even when the server actor can edit the active revision', () => {
  const f = client({}, {}, { readOnly: true });
  for (const forbidden of ['Add Piece', 'Modify Piece', 'Remove Piece', 'Cancel revision', 'Accept revision']) assert.ok(!text(f.render()).includes(forbidden), forbidden);
  assert.equal(all(f.render(), node => node.type === 'RevisionCustomerDetails').length, 0);
});
test('installation remains in the proposal with an explicit separate address/service flow', () => {
  const f = client(); const output = text(f.render());
  assert.ok(output.includes('Changes to pieces update the installation quote in this revision.'));
  assert.ok(output.includes('The installation address and services are managed separately'));
  assert.ok(output.includes('required measurements and quote approval'));
});
test('owner approval and required signature remain available for an existing submitted revision', async () => {
  const f = client({ canBegin: false, current: { ...revision, status: 'PENDING_APPROVAL', canEdit: false, canApprove: true, requiresSignature: true,
    customer: { ...customer, name: 'New name' }, originalCustomer: customer } });
  assert.ok(text(f.render()).includes('until the customer signs the updated agreement'));
  f.find(node => node.type === 'input' && node.props.type === 'checkbox').props.onChange({ target: { checked: true } }); f.render();
  await f.click('Accept revision'); await f.settle(); assert.equal(f.calls.at(-1).decision, 'APPROVE');
});
test('customer comparisons show only changed values, including explicit clearing', () => {
  const result = customerModule.RevisionCustomerComparison({ before: customer, after: { ...customer, addressLine2: '', city: 'El Portal' } });
  assert.ok(text(result).includes('Apt 4B')); assert.ok(text(result).includes('El Portal'));
  assert.ok(!text(result).includes('jo@example.test'));
});
test('new API helpers target proposals without writing live estimate or piece endpoints', async () => {
  const calls = [];
  const api = load('app/api/material-revisions.api.ts', { './_base': { apiFetch: async (...args) => { calls.push(args); } } });
  await api.saveMaterialRevisionCustomer(215, 9, { city: 'Miami', addressLine2: '' });
  await api.removeMaterialRevisionPiece(215, 9, 10);
  assert.deepEqual(calls.map(([url, options]) => [url, options.method, options.body]), [
    ['/api/estimates/215/material-revisions/9/customer', 'POST', { city: 'Miami', addressLine2: '' }],
    ['/api/estimates/215/material-revisions/9/remove-piece', 'POST', { originalPieceId: 10 }],
  ]);
});

(async () => {
  try { for (const { name, run } of tests) { await run(); console.log(`PASS ${name}`); } console.log(`${tests.length} estimate revision tests passed.`); }
  finally { global.window = browser; }
})().catch(error => { console.error(error); process.exitCode = 1; });
