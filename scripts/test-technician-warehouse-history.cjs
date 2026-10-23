// Account isolation checks with in-memory history; no server or inventory writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const filename = path.resolve(__dirname, '../src/app/technician/warehouse/history/warehouse-history-client.tsx');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const tech = () => ({ id: 3, role: { name: 'technician' } });
const paged = items => ({ items, total: items.length, page: 1, pageSize: 20 });
const props = () => ({ actorId: 3,
  initialPieces: paged([{ id: 1, lineNumber: '1234', quantity: 2, fromStore: { name: 'Main' }, customerDeliveryId: 9, createdAt: '2026-10-23T12:00:00Z' }]),
  initialMaterials: paged([{ id: 2, product: { name: 'Sealant' }, presentation: { name: 'boxes' }, quantity: 3, store: { name: 'Main' }, note: 'Installation', createdAt: '2026-10-23T12:01:00Z' }]),
});
function harness(auth = { user: tech(), revalidate: async () => tech() }, api = {}) {
  const states = [], refs = []; let stateIndex = 0, refIndex = 0;
  const hooks = { ...React,
    useState(value) { const index = stateIndex++; if (!(index in states)) states[index] = value; return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; },
    useRef(value) { const index = refIndex++; if (!(index in refs)) refs[index] = { current: value }; return refs[index]; },
    useEffect() {},
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(id => {
    if (id === 'react') return hooks;
    if (id === 'react/jsx-runtime') return require(id);
    if (id === 'next/link') return { default: 'a' };
    if (id === 'lucide-react') return { ArrowLeft: 'ArrowLeft', RefreshCw: 'RefreshCw' };
    if (id === '@/components/ui/button') return { Button: 'Button' };
    if (id === '@/contexts/AuthContext') return { useAuth: () => auth };
    if (id === '@/app/api/technician-warehouse.api') return api;
    if (id === '@/app/warehouse/warehouse-shared') return { Pagination: 'Pagination' };
    throw new Error(`Unexpected import ${id}`);
  }, module, module.exports);
  return { render() { stateIndex = 0; refIndex = 0; return module.exports.TechnicianWarehouseHistory(props()); } };
}
const text = element => typeof element === 'string' || typeof element === 'number' ? String(element) : Array.isArray(element) ? element.map(text).join('') : element?.props ? text(element.props.children) : '';
function nodes(element, predicate, result = []) {
  if (Array.isArray(element)) { element.forEach(child => nodes(child, predicate, result)); return result; }
  if (!element || typeof element !== 'object') return result;
  if (predicate(element)) result.push(element);
  nodes(element.props?.children, predicate, result); return result;
}
function click(h, label) {
  const node = nodes(h.render(), n => n.type === 'Button' && text(n) === label)[0];
  assert.ok(node && !node.props.disabled, `Missing or disabled ${label}`);
  node.props.onClick();
}
const settle = () => new Promise(resolve => setImmediate(resolve));
const tests = [], test = (name, run) => tests.push({ name, run });
test('own history links receipts through technician routes and shows automatic material purpose', () => {
  const h = harness();
  assert.match(text(h.render()), /Line 1234/);
  assert.deepEqual(nodes(h.render(), n => n.props?.href).map(n => n.props.href), ['/technician', '/technician/customer-deliveries/9']);
  click(h, 'Materials');
  assert.match(text(h.render()), /Sealant/); assert.match(text(h.render()), /Installation/);
  assert.doesNotMatch(text(h.render()), /Line 1234/);
});
test('history from the previous session is hidden for another account or role', () => {
  for (const user of [undefined, { id: 4, role: { name: 'technician' } }, { id: 3, role: { name: 'admin' } }]) {
    const h = harness({ user, revalidate: async () => user });
    assert.doesNotMatch(text(h.render()), /1234|Sealant/);
    assert.equal(nodes(h.render(), n => n.props?.href).length, 0);
  }
});
test('a changed session blocks refresh before requesting any history', async () => {
  let calls = 0;
  const h = harness({ user: tech(), revalidate: async () => ({ id: 4, role: { name: 'technician' } }) }, {
    technicianWarehouseHistory: async () => { calls++; return paged([]); },
  });
  click(h, 'Refresh'); await settle();
  assert.equal(calls, 0); assert.match(text(h.render()), /account has changed/);
});
test('each tab uses its own read-only endpoint with pagination and no selectable actor', async () => {
  const calls = [];
  const h = harness(undefined, {
    technicianWarehouseHistory: async query => { calls.push(['pieces', query]); return paged([]); },
    technicianMaterialHistory: async query => { calls.push(['materials', query]); return paged([]); },
  });
  click(h, 'Refresh'); await settle();
  click(h, 'Materials'); click(h, 'Refresh'); await settle();
  assert.deepEqual(calls, [['pieces', { page: 1, pageSize: 20 }], ['materials', { page: 1, pageSize: 20 }]]);
});
(async () => {
  for (const { name, run } of tests) { await run(); process.stdout.write(`PASS ${name}\n`); }
  process.stdout.write(`${tests.length} technician history checks passed.\n`);
})().catch(error => { console.error(error); process.exitCode = 1; });
