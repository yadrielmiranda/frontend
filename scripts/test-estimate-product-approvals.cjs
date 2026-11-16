// Real render/effect handlers with API responses controlled in memory.
/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node test harness. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { harness, load, all, text, flush } = new Function('require', '__dirname',
  fs.readFileSync(path.join(__dirname, 'test-address-operations.cjs'), 'utf8')
    .split("test('warehouse selection")[0] + '\nreturn { harness, load, all, text, flush };')(require, __dirname);
global.fetch = () => { throw new Error('Network forbidden'); };
const tests = [], test = (name, run) => tests.push({ name, run });
const pieces = (...ids) => ids.map(idSyst => ({ idSyst }));
const row = (id, extra = {}) => ({ systemId: id, systemName: `Serie ${id}`, brandName: 'Eco Windows Systems', productName: 'Sliding Glass Door',
  status: 'available', approvalId: `FL${id}`, variant: 'LMI', installationUrl: `https://documents.example/${id}/installation.pdf`,
  evaluationUrl: `https://documents.example/${id}/evaluation.pdf`, officialUrl: `https://documents.example/${id}/record`, ...extra });
const result = (...ids) => ({ systems: ids.map(id => row(id)) });
function expand(node) {
  if (Array.isArray(node)) return node.map(expand);
  if (!node || typeof node !== 'object') return node;
  if (typeof node.type === 'function') return expand(node.type(node.props));
  return { ...node, props: { ...node.props, children: expand(node.props?.children) } };
}
const tree = f => expand(f.render());
const links = f => all(tree(f), node => node.type === 'a');
const names = f => all(tree(f), node => node.type === 'h4').map(text);
function fixture(initial = pieces(700), openForTest = true) {
  const requests = [];
  const f = harness('components/estimates/estimate-product-approvals.tsx', 'EstimateProductApprovals', { pieces: initial }, {
    '@/app/api/systems.api': { getSystemsApprovals(ids) {
      let resolve, reject;
      const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
      requests.push({ ids, resolve, reject }); return promise;
    } },
  });
  f.render();
  const instance = { ...f, requests, toggle(open) { f.find(n => n.type === 'details').props.onToggle({ currentTarget: { open } }); f.render(); } };
  if (openForTest) instance.toggle(true);
  return instance;
}

test('batch helper normalizes one authenticated uncached request for the unique ID set', async () => {
  const calls = [];
  const api = load('app/api/systems.api.ts', { './_base': { apiFetch: (...args) => { calls.push(args); return Promise.resolve(result(7, 8)); } } });
  assert.deepEqual(await api.getSystemsApprovals([8, 7, 8, 0, -1, NaN, 1.5]), result(7, 8));
  assert.deepEqual(calls, [['/api/systems/approvals?ids=7,8', { cache: 'no-store', timeoutMs: 15000 }]]);
});

test('estimates start collapsed and preload documents, while empty estimates make no request', () => {
  for (const ids of [pieces(0, null, undefined, -1), pieces(700)]) {
    const f = fixture(ids, false);
    const hasSystem = ids.some(piece => piece.idSyst === 700);
    assert.equal(f.requests.length, hasSystem ? 1 : 0);
    assert.equal(f.find(n => n.type === 'details').props.open, false);
    assert.match(f.find(n => n.type === 'details').props.className, /print:hidden/);
    assert.equal(links(f).length, 0);
    assert.doesNotMatch(text(tree(f)), /Add a piece|Loading product approvals/);
    f.toggle(true);
    if (hasSystem) {
      assert.deepEqual(f.requests.map(request => request.ids), [[700]]);
    } else {
      assert.equal(f.requests.length, 0);
      assert.match(text(tree(f)), /Add a piece/);
    }
  }
});

test('duplicates and piece reorder produce one row per system and no additional fetch', async () => {
  const f = fixture(pieces(800, 700, 800));
  assert.deepEqual(f.requests.map(r => r.ids), [[700, 800]]);
  f.requests[0].resolve(result(800, 700)); await flush();
  assert.deepEqual(names(f), ['Serie 700', 'Serie 800']);
  f.update({ pieces: [{ idSyst: 700, qty: 9 }, { idSyst: 800, qty: 1 }] });
  assert.equal(f.requests.length, 1);
  assert.equal(links(f).length, 6);
  assert.match(text(tree(f)), /Eco Windows Systems · Sliding Glass Door/);
  for (const link of links(f)) {
    assert.equal(link.props.target, '_blank'); assert.equal(link.props.rel, 'noopener noreferrer');
    assert.equal(link.props.onClick, undefined); assert.match(link.props['aria-label'], /opens in a new tab/);
  }
  assert.deepEqual(links(f).slice(0, 3).map(text), ['Installation instructions', 'Evaluation report', 'Official approval record']);
});

test('adding, removing and replacing a system refresh the batch and hide previous links', async () => {
  const f = fixture(); f.requests[0].resolve(result(700)); await flush();
  f.update({ pieces: pieces(700, 800) }); assert.equal(links(f).length, 0);
  assert.match(text(tree(f)), /Loading product approvals/);
  f.requests[1].resolve(result(700, 800)); await flush(); assert.equal(links(f).length, 6);
  f.update({ pieces: pieces(800) }); assert.equal(links(f).length, 0);
  f.requests[2].resolve(result(800)); await flush(); assert.deepEqual(names(f), ['Serie 800']);
  f.update({ pieces: pieces(810) }); assert.equal(links(f).length, 0);
  f.requests[3].resolve(result(810)); await flush(); assert.deepEqual(names(f), ['Serie 810']);
  f.update({ pieces: [] }); assert.equal(links(f).length, 0); assert.match(text(tree(f)), /Add a piece/);
  assert.deepEqual(f.requests.map(r => r.ids), [[700], [700, 800], [800], [810]]);
});

test('late responses and late errors cannot replace a newer selected system set', async () => {
  const f = fixture(pieces(700)); f.update({ pieces: pieces(800) }); f.update({ pieces: pieces(700) });
  f.requests[0].resolve(result(700)); await flush(); assert.equal(links(f).length, 0);
  f.requests[2].resolve({ systems: [row(700, { variant: 'LMI+SMI' })] }); await flush();
  f.requests[1].reject(new Error('Old request')); await flush();
  assert.deepEqual(names(f), ['Serie 700']); assert.match(text(tree(f)), /LMI\+SMI/);
  assert.doesNotMatch(text(tree(f)), /could not be loaded/);
});

test('opening and closing retain in-flight and ready results, while closed system changes preload again', async () => {
  const f = fixture(pieces(700), false);
  f.toggle(true); f.toggle(false);
  assert.deepEqual(f.requests.map(r => r.ids), [[700]]);
  f.requests[0].resolve(result(700)); await flush();
  assert.equal(f.requests.length, 1); assert.equal(links(f).length, 0);
  f.toggle(true); assert.deepEqual(names(f), ['Serie 700']);
  assert.doesNotMatch(text(tree(f)), /Loading product approvals/);
  f.toggle(false); f.update({ pieces: pieces(800, 800) });
  assert.deepEqual(f.requests.map(r => r.ids), [[700], [800]]);
  f.requests[1].resolve(result(800)); await flush(); assert.equal(links(f).length, 0);
  f.toggle(true); assert.deepEqual(names(f), ['Serie 800']);
  assert.doesNotMatch(text(tree(f)), /Loading product approvals/);
  f.toggle(false); f.toggle(true); assert.equal(links(f).length, 3);
  assert.deepEqual(f.requests.map(r => r.ids), [[700], [800]]);
});

test('missing, blank and unsafe URLs are omitted without substituting another document', async () => {
  const f = fixture(pieces(700, 800));
  f.requests[0].resolve({ systems: [row(700, { installationUrl: '', evaluationUrl: null }),
    row(800, { installationUrl: 'javascript:alert(1)', evaluationUrl: 'http://documents.example/unsafe.pdf', officialUrl: 'https://user:pass@documents.example/record' })] });
  await flush();
  assert.equal(links(f).length, 1); assert.equal(text(links(f)[0]), 'Official approval record');
  assert.equal(links(f)[0].props.href, row(700).officialUrl);
  assert.match(text(tree(f)), /No product approval documents/);
});

test('not found and ambiguous systems show metadata and explanations without links', async () => {
  const f = fixture(pieces(700, 800));
  f.requests[0].resolve({ systems: [row(700, { status: 'not_found' }), row(800, { status: 'ambiguous' })] }); await flush();
  assert.deepEqual(names(f), ['Serie 700', 'Serie 800']); assert.equal(links(f).length, 0);
  assert.match(text(tree(f)), /No product approval documents/); assert.match(text(tree(f)), /An exact product approval/);
});

test('a provider error stays inline and retry is explicit, quiet and cannot submit the estimate', async () => {
  const f = fixture(); f.requests[0].reject(Object.assign(new Error('Unavailable'), { status: 503 })); await flush();
  assert.match(text(tree(f)), /Product approvals could not be loaded/);
  assert.equal(f.errors.length, 0); assert.equal(f.requests.length, 1);
  assert.equal(f.button('Retry').props.type, 'button');
  f.click('Retry'); f.render(); assert.equal(f.requests.length, 2);
  assert.match(text(tree(f)), /Loading product approvals/);
  f.requests[1].resolve(result(700)); await flush(); assert.equal(links(f).length, 3);
});

test('an incomplete or mismatched batch never shows documents from an unrelated system', async () => {
  for (const bad of [{ systems: [] }, result(800), result(700, 700)]) {
    const f = fixture(); f.requests[0].resolve(bad); await flush();
    assert.equal(links(f).length, 0); assert.match(text(tree(f)), /could not be loaded/);
  }
});

test('unmounted blocks ignore pending responses and a new visit makes a fresh request', async () => {
  const f = fixture(); f.unmount(); f.requests[0].resolve(result(700)); await flush();
  assert.equal(links(f).length, 0);
  const nextVisit = fixture(pieces(700), false);
  assert.deepEqual(nextVisit.requests.map(r => r.ids), [[700]]);
  nextVisit.toggle(true);
  assert.match(text(tree(nextVisit)), /Loading product approvals/);
  nextVisit.requests[0].resolve(result(700)); await flush();
  assert.equal(links(nextVisit).length, 3);
});

test('both actual entry points use live piece IDs outside disabled fields and printable reports', () => {
  for (const [file, sourceProp, beforeTag] of [
    ['components/estimates/estimate-form.tsx', 'watchedPieces ?? []', 'EstimateInternalNote'],
    ['components/estimates/estimate-details/estimate-details.tsx', 'estimate.pieces', 'EstimateInternalNote'],
  ]) {
    const filename = path.join(__dirname, '../src', file), source = fs.readFileSync(filename, 'utf8');
    const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const found = [];
    function visit(node) {
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'EstimateProductApprovals') found.push(node);
      ts.forEachChild(node, visit);
    }
    visit(ast); assert.equal(found.length, 1);
    const prop = found[0].attributes.properties.find(p => p.name?.getText(ast) === 'pieces');
    assert.equal(prop.initializer.expression.getText(ast), sourceProp);
    assert.ok(found[0].pos < source.indexOf(`<${beforeTag}`));
    for (let ancestor = found[0].parent; ancestor; ancestor = ancestor.parent) {
      if (ts.isJsxElement(ancestor)) assert.ok(!['fieldset', 'EstimateReportShell'].includes(ancestor.openingElement.tagName.getText(ast)));
      assert.ok(!ts.isConditionalExpression(ancestor) && !ts.isBinaryExpression(ancestor), 'Not gated by role or read-only flags');
    }
  }
});

(async () => {
  for (const { name, run } of tests) { await run(); console.log(`PASS ${name}`); }
  console.log(`${tests.length} estimate product approval tests passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
