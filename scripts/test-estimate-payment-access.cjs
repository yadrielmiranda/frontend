// Real estimate list rendering with simulated UI dependencies; no network or payments.
// Run: node scripts/test-estimate-payment-access.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const jsx = (type, props) => ({ type, props });
const ui = new Proxy({}, { get: (_, name) => name });
const mocks = {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  react: { useState: value => [value, () => {}] },
  'next/link': { default: 'Link' },
  'next/navigation': { useRouter: () => ({ push() {}, refresh() {} }) },
  'lucide-react': ui,
  sonner: { toast: {} },
  '@/app/api/estimates.api': {},
  '@/app/api/payments.api': {},
  '@/components/delete-conf-dialog': ui,
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
console.log(`${count} estimate payment access checks passed`);
