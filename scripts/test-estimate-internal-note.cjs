// Offline interaction checks against the real note component. No API/database calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../src');
const jsx = (type, props) => ({ type, props });
const ui = new Proxy({}, { get: (_, name) => name });
let slots, cursor, effects, apiCalls, read, write, props, target;
const same = (a, b) => a?.length === b?.length && a.every((value, index) => Object.is(value, b[index]));
const hooks = {
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
  },
  useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
  useCallback(callback, deps) {
    const index = cursor++;
    if (!slots[index] || !same(slots[index].deps, deps)) slots[index] = { callback, deps };
    return slots[index].callback;
  },
  useEffect(callback, deps) {
    const index = cursor++;
    if (!slots[index] || !same(slots[index].deps, deps)) {
      slots[index]?.cleanup?.();
      slots[index] = { deps };
      effects.push(() => { slots[index].cleanup = callback(); });
    }
  },
};
class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } }
const dependencies = {
  react: hooks,
  'react/jsx-runtime': { jsx, jsxs: jsx },
  '@/app/api/_base': { isApiError: error => error instanceof ApiError },
  '@/app/api/estimates.api': {
    getEstimateInternalNote(id) { apiCalls.push({ method: 'GET', id }); return read(id); },
    updateEstimateInternalNote(id, data) { apiCalls.push({ method: 'PATCH', id, data }); return write(id, data); },
  },
  '@/components/ui/button': ui,
  '@/components/ui/textarea': ui,
  '@/lib/rbac': {
    isAdminRole: role => role === 'admin', isDealerRole: role => role === 'dealer',
    isOperatorRole: role => role === 'operator',
  },
};
const source = fs.readFileSync(path.join(root, 'components/estimates/estimate-internal-note.tsx'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
const moduleExports = {};
new Function('require', 'exports', code)(id => {
  assert.ok(id in dependencies, `Unexpected dependency ${id}`);
  return dependencies[id];
}, moduleExports);
const { EstimateInternalNote } = moduleExports;
const all = (node, predicate) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(child => all(child, predicate)) : [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
const text = node => node == null || node === false ? '' : typeof node !== 'object' ? String(node)
  : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
const render = () => {
  cursor = 0;
  target = EstimateInternalNote(props);
  const tree = target ? target.type(target.props) : null;
  const pending = effects; effects = [];
  pending.forEach(effect => effect());
  return tree;
};
const buttons = tree => all(tree, node => node.type === 'Button');
const button = label => buttons(render()).find(node => text(node) === label);
const click = async label => {
  const found = button(label); assert.ok(found, `Missing ${label}`); assert.ok(!found.props.disabled, `${label} disabled`);
  return found.props.onClick();
};
const flush = async () => { for (let n = 0; n < 12; n++) await Promise.resolve(); };
const note = (text = 'Check opening', version = 1) => ({
  text, version, updatedAt: '2026-10-23T12:00:00.000Z', updatedBy: { id: 12, name: 'Pat Dealer' },
});
const reset = (userRole = 'dealer', response = { internalNote: null, canEdit: true }) => {
  slots = []; cursor = 0; effects = []; apiCalls = []; props = { estimateId: 42, userRole };
  read = async () => response;
  write = async (_, payload) => ({ internalNote: note(payload.text, payload.expectedVersion + 1), canEdit: true });
};
const change = value => {
  const input = all(render(), node => node.type === 'Textarea')[0];
  assert.ok(input); assert.ok(!input.props.disabled);
  input.props.onChange({ target: { value } });
};
const draft = () => all(render(), node => node.type === 'Textarea')[0]?.props.value;
let checks = 0;
async function test(name, run) { await run(); checks++; console.log(`PASS ${name}`); }
(async () => {
  await test('only admin, dealer and operator request the private note', async () => {
    for (const role of ['client', 'technician', null, undefined, 'unknown']) {
      reset(); props.userRole = role; assert.equal(render(), null); await flush(); assert.equal(apiCalls.length, 0);
    }
    for (const role of ['admin', 'dealer', 'operator']) {
      reset(role); render(); await flush(); assert.equal(apiCalls.length, 1);
    }
  });
  await test('operator is read-only even if an inconsistent response says canEdit', async () => {
    reset('operator', { internalNote: note(), canEdit: true }); render(); await flush();
    const tree = render(); assert.match(text(tree), /Check opening/); assert.match(text(tree), /Pat Dealer/);
    assert.equal(buttons(tree).length, 0); assert.equal(all(tree, node => node.type === 'Textarea').length, 0);
  });
  await test('server canEdit controls dealer actions and fetch failure is not an empty note', async () => {
    reset('dealer', { internalNote: note(), canEdit: false }); render(); await flush();
    assert.equal(buttons(render()).length, 0);
    reset(); read = async () => { throw new Error('Unavailable'); }; render(); await flush();
    assert.match(text(render()), /Unavailable/); assert.equal(button('Add note'), undefined);
    read = async () => ({ internalNote: null, canEdit: true }); await click('Retry'); await flush();
    assert.ok(button('Add note'));
  });
  await test('new notes save independently with expectedVersion zero and show plain text', async () => {
    reset(); render(); await flush(); await click('Add note');
    change('<b>Private</b>\nNext line'); await click('Save'); await flush();
    assert.deepEqual(apiCalls.filter(call => call.method === 'PATCH'), [{ method: 'PATCH', id: 42,
      data: { text: '<b>Private</b>\nNext line', expectedVersion: 0 } }]);
    assert.match(text(render()), /<b>Private<\/b>\nNext line/);
    assert.equal(all(render(), node => node.props?.dangerouslySetInnerHTML).length, 0);
    assert.ok(button('Edit'));
  });
  await test('cancel discards draft without saving and note can be cleared without losing version', async () => {
    reset('admin', { internalNote: note('Keep', 5), canEdit: true }); render(); await flush();
    await click('Edit'); change('Discard'); await click('Cancel'); assert.match(text(render()), /Keep/);
    assert.equal(apiCalls.length, 1); await click('Edit'); change(''); await click('Save'); await flush();
    assert.equal(apiCalls[1].data.expectedVersion, 5); assert.equal(apiCalls[1].data.text, '');
    await click('Add note'); change('Again'); await click('Save'); await flush();
    assert.equal(apiCalls[2].data.expectedVersion, 6);
  });
  await test('conflicting edits load latest saved text while preserving the draft', async () => {
    reset('dealer', { internalNote: note('First', 3), canEdit: true }); render(); await flush();
    await click('Edit'); change('My draft');
    read = async () => ({ internalNote: note('Another editor', 4), canEdit: true });
    write = async () => { throw new ApiError('Conflict', 409); };
    await click('Save'); await flush();
    assert.equal(draft(), 'My draft'); assert.match(text(render()), /Another editor/);
    assert.match(text(render()), /draft is unchanged/);
    assert.equal(apiCalls.filter(call => call.method === 'PATCH').length, 1);
    write = async (_, payload) => ({ internalNote: note(payload.text, payload.expectedVersion + 1), canEdit: true });
    await click('Save'); await flush();
    assert.equal(apiCalls.at(-1).data.expectedVersion, 4); assert.match(text(render()), /My draft/);
  });
  await test('conflict reload failure preserves draft and blocks save until retry succeeds', async () => {
    reset('dealer', { internalNote: note('First', 2), canEdit: true }); render(); await flush();
    await click('Edit'); change('My draft');
    write = async () => { throw new ApiError('Conflict', 409); };
    read = async () => { throw new Error('Network unavailable'); };
    await click('Save'); await flush(); assert.equal(draft(), 'My draft'); assert.ok(button('Save').props.disabled);
    read = async () => ({ internalNote: note('Latest', 3), canEdit: true }); await click('Retry'); await flush();
    assert.equal(draft(), 'My draft'); assert.ok(!button('Save').props.disabled);
  });
  await test('save failures retain draft and repeated clicks cannot submit twice', async () => {
    reset(); render(); await flush(); await click('Add note'); change('Draft');
    let reject; write = () => new Promise((_, r) => { reject = r; });
    const handler = button('Save').props.onClick; handler(); handler();
    assert.equal(apiCalls.filter(call => call.method === 'PATCH').length, 1);
    reject(new Error('Could not save')); await flush(); assert.equal(draft(), 'Draft');
    assert.match(text(render()), /Could not save/);
  });
  await test('length limit and unchanged note prevent writes', async () => {
    reset('dealer', { internalNote: note(), canEdit: true }); render(); await flush(); await click('Edit');
    assert.ok(button('Save').props.disabled); change('x'.repeat(2001)); assert.ok(button('Save').props.disabled);
    const input = all(render(), node => node.type === 'Textarea')[0]; assert.equal(input.props.maxLength, 2000);
    await button('Save').props.onClick(); await flush(); assert.equal(apiCalls.length, 1);
  });
  await test('revoked access clears visible saved text and draft', async () => {
    reset('dealer', { internalNote: note('Private'), canEdit: true }); render(); await flush();
    await click('Edit'); change('Draft'); write = async () => { throw new ApiError('Access denied', 403); };
    await click('Save'); await flush(); assert.equal(draft(), undefined);
    assert.doesNotMatch(text(render()), /Private|Draft/); assert.match(text(render()), /Access denied/);
  });
  await test('note block is excluded from print and customer report', () => {
    reset(); assert.match(render().props.className, /print:hidden/);
    const form = fs.readFileSync(path.join(root, 'components/estimates/estimate-form.tsx'), 'utf8');
    const details = fs.readFileSync(path.join(root, 'components/estimates/estimate-details/estimate-details.tsx'), 'utf8');
    const formNote = form.indexOf('<EstimateInternalNote');
    assert.ok(formNote > form.indexOf('<EstimateDetailsLeft') && formNote < form.indexOf('>Pieces</h3>'));
    assert.match(form.slice(formNote, formNote + 110), /userRole=\{role\}/);
    assert.match(details, /reportMode !== "customer" && \([\s\S]*?<EstimateInternalNote/);
    assert.ok(details.indexOf('<EstimateInternalNote') < details.indexOf('<EstimateReportShell'));
    assert.doesNotMatch(source, /router\.|updateEstimateHeader|recalculateEstimate|dangerouslySetInnerHTML/);
  });
  console.log(`${checks} internal note UI checks passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
