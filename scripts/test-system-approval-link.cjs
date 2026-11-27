// Render the real component and its effects with API boundaries mocked; no network.
/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node test harness. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { harness, load, all, flush } = new Function('require', '__dirname',
  fs.readFileSync(path.join(__dirname, 'test-address-operations.cjs'), 'utf8')
    .split("test('warehouse selection")[0] + '\nreturn { harness, load, all, flush };')(require, __dirname);
global.fetch = () => { throw new Error('Network forbidden'); };
const tests = [], test = (name, run) => tests.push({ name, run });
const pending = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const approval = (id, variant = 'LMI') => ({ status: 'available', url: `https://documents.example/${id}.pdf`, approvalId: `FL${id}`, variant });
const links = f => all(f.render(), node => node.type === 'a');
const icon = f => f.find(node => node.type === 'a' || node.type === 'button');
function fixture(systemId = 1) {
  const requests = [];
  const f = harness('components/systems/system-approval-link.tsx', 'SystemApprovalLink', { systemId }, {
    '@/app/api/systems.api': { getSystemInstallationApproval(id) {
      const request = { id, ...pending() }; requests.push(request); return request.promise;
    } },
  });
  f.render();
  return { ...f, requests };
}

test('API helper uses the authenticated wrapper with an uncached bounded request', async () => {
  const calls = [];
  const api = load('app/api/systems.api.ts', { './_base': { apiFetch: (...args) => { calls.push(args); return Promise.resolve(approval(42)); } } });
  assert.deepEqual(await api.getSystemInstallationApproval(42), approval(42));
  assert.deepEqual(calls, [['/api/systems/42/installation-approval', { cache: 'no-store', timeoutMs: 15000 }]]);
});

test('no system selection makes no request and exposes a non-submitting accessible Info icon', () => {
  for (const id of [undefined, null, 0, -1, NaN, 1.5]) {
    const f = fixture(id === undefined ? null : id);
    assert.equal(f.requests.length, 0);
    assert.equal(links(f).length, 0);
    assert.equal(icon(f).props.type, 'button');
    assert.equal(icon(f).props['aria-disabled'], true);
    assert.match(icon(f).props['aria-label'], /Select a system/);
    assert.equal(icon(f).props.onClick, undefined);
    assert.equal(all(f.render(), node => node.type === 'Info').length, 1);
  }
});

test('available LMI and LMI+SMI PDFs open through an already prepared native anchor', async () => {
  for (const variant of ['LMI', 'LMI+SMI']) {
    const f = fixture(7);
    assert.equal(icon(f).props['aria-busy'], true);
    assert.equal(links(f).length, 0);
    f.requests[0].resolve(approval(7, variant)); await flush();
    const link = links(f)[0];
    assert.equal(link.props.href, approval(7).url);
    assert.equal(link.props.target, '_blank');
    assert.equal(link.props.rel, 'noopener noreferrer');
    assert.equal(link.props.onClick, undefined, 'No asynchronous popup or form action');
    assert.equal(link.props.disabled, undefined);
    assert.ok(link.props['aria-label'].includes(variant));
    assert.match(link.props['aria-label'], /installation approval PDF.*FL7.*new tab/);
    assert.equal(f.requests.length, 1);
    assert.equal(f.errors.length, 0);
  }
});

test('changing or clearing a selected system immediately removes its old document link', async () => {
  const f = fixture(1); f.requests[0].resolve(approval(1)); await flush();
  assert.equal(links(f)[0].props.href, approval(1).url);
  f.update({ systemId: 2 });
  assert.equal(links(f).length, 0);
  assert.equal(icon(f).props['aria-busy'], true);
  f.update({ systemId: 0 });
  f.requests[1].resolve(approval(2)); await flush();
  assert.equal(links(f).length, 0);
  assert.match(icon(f).props['aria-label'], /Select a system/);
  assert.deepEqual(f.requests.map(r => r.id), [1, 2]);
});

test('switching language keeps the selected approval document and its catalog identifiers', async () => {
  const f = fixture(42);
  f.requests[0].resolve(approval(42, 'LMI+SMI'));
  await flush();
  f.update({ locale: 'es', systemId: 42 });
  assert.equal(icon(f).props['aria-label'], 'Abrir el PDF de aprobación de instalación (LMI+SMI, FL42) en una pestaña nueva');
  assert.equal(icon(f).props.href, approval(42).url);
  assert.equal(f.requests.length, 1);
});

test('out-of-order responses cannot replace the current system document', async () => {
  const f = fixture(1); f.update({ systemId: 2 });
  f.requests[1].resolve(approval(2)); await flush();
  f.requests[0].resolve(approval(1)); await flush();
  assert.equal(links(f)[0].props.href, approval(2).url);
});

test('returning to a previous system ignores that system earlier request and stale failures', async () => {
  const f = fixture(1); f.update({ systemId: 2 }); f.update({ systemId: 1 });
  f.requests[0].resolve(approval(1)); await flush();
  assert.equal(links(f).length, 0);
  f.requests[2].resolve({ ...approval(1), url: 'https://documents.example/current.pdf' }); await flush();
  f.requests[1].reject(new Error('Old request failed')); await flush();
  assert.equal(links(f)[0].props.href, 'https://documents.example/current.pdf');
  assert.deepEqual(f.requests.map(r => r.id), [1, 2, 1]);
});

test('an unmounted icon ignores its outstanding result', async () => {
  const f = fixture(1); f.unmount();
  f.requests[0].resolve(approval(1)); await flush();
  assert.equal(links(f).length, 0);
});

test('unmatched and ambiguous systems do not invent a link or offer an ineffective retry', async () => {
  for (const status of ['not_found', 'ambiguous']) {
    const f = fixture(3); f.requests[0].resolve({ status }); await flush();
    assert.equal(links(f).length, 0);
    assert.equal(icon(f).props['aria-disabled'], true);
    assert.equal(icon(f).props['aria-busy'], false);
    assert.equal(icon(f).props.onClick, undefined);
    assert.match(icon(f).props['aria-label'], /not available|No installation approval/);
    assert.equal(f.errors.length, 0);
  }
});

test('provider failure remains quiet and retries only on an explicit non-submitting click', async () => {
  const f = fixture(4); f.requests[0].reject(Object.assign(new Error('Unavailable'), { status: 503 })); await flush();
  assert.equal(f.errors.length, 0);
  assert.equal(f.requests.length, 1);
  assert.equal(icon(f).props.type, 'button');
  assert.equal(icon(f).props['aria-disabled'], false);
  assert.match(icon(f).props['aria-label'], /Click to retry/);
  icon(f).props.onClick(); f.render();
  assert.equal(icon(f).props.onClick, undefined, 'Retry is unavailable while its request is pending');
  assert.deepEqual(f.requests.map(r => r.id), [4, 4]);
  f.requests[1].resolve(approval(4)); await flush();
  assert.equal(links(f)[0].props.href, approval(4).url);
});

test('a malformed or unsafe URL never becomes a clickable document', async () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,unsafe', '/relative.pdf', 'http://documents.example/a.pdf', 'https://user:password@documents.example/a.pdf']) {
    const f = fixture(5); f.requests[0].resolve({ ...approval(5), url }); await flush();
    assert.equal(links(f).length, 0);
    assert.match(icon(f).props['aria-label'], /Click to retry/);
  }
});

test('the actual System label passes its selection unchanged even when the piece is read-only', () => {
  const filename = path.join(__dirname, '../src/components/estimates/piece-form.tsx');
  const source = fs.readFileSync(filename, 'utf8');
  const parsed = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let labelContainer;
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(parsed) === 'SystemApprovalLink') {
      assert.equal(labelContainer, undefined, 'Only one installation document entry point');
      labelContainer = node.parent;
      for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
        if (ts.isJsxElement(ancestor)) assert.notEqual(ancestor.openingElement.tagName.getText(parsed), 'fieldset', 'No disabled fieldset blocks the document link');
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed); assert.ok(labelContainer);
  const output = ts.transpileModule(`export function render(systemId: number, isLocked: boolean, locale: string, t: (text: string) => string) { return (${labelContainer.getText(parsed)}); }`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const testModule = { exports: {} };
  new Function('require', 'module', 'exports', 'Label', 'SystemApprovalLink', output)(
    () => ({ jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }), testModule, testModule.exports, 'Label', 'SystemApprovalLink');
  for (const locked of [false, true]) {
    const tree = testModule.exports.render(42, locked, 'en', text => text);
    assert.equal(all(tree, node => node.type === 'Label')[0].props.children, 'System');
    assert.deepEqual(all(tree, node => node.type === 'SystemApprovalLink')[0].props, { systemId: 42, locale: 'en' });
  }
});

(async () => {
  for (const { name, run } of tests) { await run(); console.log(`PASS ${name}`); }
  console.log(`${tests.length} system approval link tests passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
