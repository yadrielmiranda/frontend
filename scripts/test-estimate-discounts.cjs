/* Exercises the real discount editor, summaries, normalization and API wrapper.
 * All persistence is simulated. No network, database or existing estimates.
 * Run: node scripts/test-estimate-discounts.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

global.fetch = () => { throw new Error('Network forbidden in discount tests'); };
for (const name of ['node:http', 'node:https']) require(name).request = require(name).get = global.fetch;

const root = path.resolve(__dirname, '../src');
const jsx = (type, props) => ({ type, props });
const money = value => `$${Number(value).toFixed(2)}`;
function load(relative, mocks = {}, cache = new Map()) {
  if (cache.has(relative)) return cache.get(relative);
  const filename = path.resolve(root, relative);
  assert.ok(filename.startsWith(root + path.sep) && /\.tsx?$/.test(filename));
  const exports = {}; cache.set(relative, exports);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require', 'exports', compiled)(name => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('@/components/ui/')) return new Proxy({}, { get: (_, prop) => prop });
    const target = name.startsWith('@/') ? name.slice(2) : name.startsWith('.')
      ? path.relative(root, path.resolve(path.dirname(filename), name)).replaceAll('\\', '/') : null;
    assert.ok(target, `Unexpected dependency ${name}`);
    const resolved = ['.ts', '.tsx'].map(ext => target + ext).find(file => fs.existsSync(path.resolve(root, file)));
    assert.ok(resolved, name); return load(resolved, mocks, cache);
  }, exports);
  return exports;
}
const all = (node, match) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(child => all(child, match))
  : [...(match(node) ? [node] : []), ...all(node.props?.children, match)];
const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object'
  ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const percentage = value => ({ type: 'PERCENTAGE', value: String(value) });
const amount = value => ({ type: 'AMOUNT', value: String(value) });
const combined = () => ({ scope: 'MULTIPLE', material: percentage(10), installation: amount(125.5) });

function fixture(overrides = {}, saveImpl = async () => ({ id: 17 })) {
  const state = [], effects = [], requests = [], notices = [], saved = [], dirtyCalls = [];
  let index, effectIndex, pending, changed;
  let props = { estimateId: 17, config: null, summary: null, hasInstallation: true, disabled: false,
    onSaved: value => saved.push(value), onDirtyChange: value => dirtyCalls.push(value), ...overrides };
  const mocks = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: {
      useState(initial) { const slot = index++;
        if (!(slot in state)) state[slot] = typeof initial === 'function' ? initial() : initial;
        return [state[slot], next => { const value = typeof next === 'function' ? next(state[slot]) : next;
          if (!Object.is(value, state[slot])) { state[slot] = value; changed = true; } }]; },
      useEffect(effect, deps) { const slot = effectIndex++, previous = effects[slot];
        if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
          previous?.cleanup?.(); effects[slot] = { deps };
          pending.push(() => { effects[slot].cleanup = effect(); });
        }
      },
    },
    sonner: { toast: { success: value => notices.push(['success', value]), error: value => notices.push(['error', value]) } },
    '@/lib/formatters': { formatMoney: money },
    '@/app/api/estimates.api': { updateEstimateDiscount: async (id, body) => {
      requests.push([id, body]); return saveImpl(id, body);
    } },
  };
  const { ManualDiscountEditor: Editor } = load('components/estimates/manual-discount-editor.tsx', mocks);
  const render = () => {
    let tree, count = 0;
    do { assert.ok(count++ < 12, 'React effects should settle');
      index = effectIndex = 0; pending = []; changed = false;
      tree = Editor(props); pending.forEach(effect => effect());
    } while (changed);
    return tree;
  };
  const find = match => { const found = all(render(), match)[0]; assert.ok(found, 'Expected element exists'); return found; };
  const button = label => find(node => node.type === 'Button' &&
    (text(node) === label || node.props['aria-label'] === label));
  const control = id => find(node => node.props?.id === id);
  const input = (id, value) => control(id).props.onChange({ target: { value } });
  return { render, button, control, input, requests, notices, saved, dirtyCalls,
    update(next) { props = { ...props, ...next }; },
    async save() { button('Save discounts').props.onClick(); await flush(); },
  };
}

const tests = [];
const test = (name, run) => tests.push({ name, run });

test('material percentage and installation fixed amount are saved together as numeric independent rules', async () => {
  const f = fixture();
  assert.equal(f.button('Save discounts').props.disabled, true);
  assert.equal(all(f.render(), node => node.type === 'input').length, 2);
  f.input('material-discount-value', '10.25');
  f.input('installation-discount-type', 'AMOUNT');
  f.input('installation-discount-value', '125.50');
  assert.equal(f.button('Save discounts').props.disabled, false);
  await f.save();
  assert.deepEqual(f.requests, [[17, { material: { type: 'PERCENTAGE', value: 10.25 }, installation: { type: 'AMOUNT', value: 125.5 } }]]);
  assert.deepEqual(f.saved, [{ id: 17 }]);
  assert.equal(f.notices[0][0], 'success');
});

test('material fixed amount and installation percentage keep their own units', async () => {
  const f = fixture(); f.input('material-discount-type', 'AMOUNT'); f.input('material-discount-value', '200');
  f.input('installation-discount-value', '15'); await f.save();
  assert.deepEqual(f.requests[0][1], { material: { type: 'AMOUNT', value: 200 }, installation: { type: 'PERCENTAGE', value: 15 } });
});

test('legacy material and installation discounts load in their correct field and survive adding the other rule', async () => {
  for (const [scope, active, sibling] of [['MATERIAL', 'material', 'installation'], ['INSTALLATION', 'installation', 'material']]) {
    const f = fixture({ config: { scope, ...amount(45.75) } });
    assert.equal(f.control(`${active}-discount-type`).props.value, 'AMOUNT');
    assert.equal(f.control(`${active}-discount-value`).props.value, '45.75');
    assert.equal(f.control(`${sibling}-discount-value`).props.value, '');
    assert.equal(f.button('Save discounts').props.disabled, true);
    f.input(`${sibling}-discount-value`, '5'); await f.save();
    assert.deepEqual(f.requests[0][1][active], { type: 'AMOUNT', value: 45.75 });
    assert.deepEqual(f.requests[0][1][sibling], { type: 'PERCENTAGE', value: 5 });
  }
});

test('removing either discount preserves the other rule', async () => {
  for (const [removed, kept, expected] of [['material', 'installation', { type: 'AMOUNT', value: 125.5 }],
    ['installation', 'material', { type: 'PERCENTAGE', value: 10 }]]) {
    const f = fixture({ config: combined() });
    f.button(`Remove ${removed} discount`).props.onClick(); await f.save();
    assert.equal(f.requests[0][1][removed], null);
    assert.deepEqual(f.requests[0][1][kept], expected);
  }
});

test('removing all explicitly sends both rules as null', async () => {
  const f = fixture({ config: combined() });
  f.button('Remove all discounts').props.onClick(); await flush();
  assert.deepEqual(f.requests[0], [17, { material: null, installation: null }]);
  assert.match(f.notices[0][1], /removed/);
});

test('empty or zero rules clear only their own component', async () => {
  for (const value of ['', '0', '0.00']) {
    const f = fixture({ config: combined() }); f.input('material-discount-value', value); await f.save();
    assert.equal(f.requests[0][1].material, null);
    assert.deepEqual(f.requests[0][1].installation, { type: 'AMOUNT', value: 125.5 });
  }
});

test('dirty state tracks both rules and discard restores the complete saved pair', () => {
  const f = fixture({ config: combined() }); f.render(); assert.equal(f.dirtyCalls.at(-1), false);
  f.input('material-discount-value', '15'); f.input('installation-discount-type', 'PERCENTAGE'); f.render();
  assert.equal(f.dirtyCalls.at(-1), true);
  f.button('Discard').props.onClick(); f.render();
  assert.equal(f.control('material-discount-value').props.value, '10');
  assert.equal(f.control('installation-discount-type').props.value, 'AMOUNT');
  assert.equal(f.dirtyCalls.at(-1), false);
  assert.equal(f.button('Save discounts').props.disabled, true);
  assert.equal(f.requests.length, 0);
});

test('new saved configuration resets the form and clears dirty state after parent refresh', async () => {
  const f = fixture(); f.input('material-discount-value', '10'); f.input('installation-discount-value', '5');
  await f.save(); f.update({ config: { scope: 'MULTIPLE', material: percentage(10), installation: percentage(5) } });
  f.render(); assert.equal(f.dirtyCalls.at(-1), false); assert.equal(f.button('Save discounts').props.disabled, true);
  f.update({ config: null }); f.render();
  assert.equal(f.control('material-discount-value').props.value, '');
  assert.equal(f.control('installation-discount-value').props.value, '');
});

test('without calculated installation its controls are disabled and material remains independently saveable', async () => {
  const f = fixture({ hasInstallation: false });
  assert.equal(f.control('installation-discount-value').props.disabled, true);
  assert.equal(f.control('installation-discount-type').props.disabled, true);
  assert.equal(f.control('material-discount-value').props.disabled, false);
  f.input('material-discount-value', '7'); await f.save();
  assert.deepEqual(f.requests[0][1], { material: { type: 'PERCENTAGE', value: 7 }, installation: null });
});

test('an existing installation rule must be cleared if installation is no longer available', async () => {
  const f = fixture({ hasInstallation: false, config: combined() });
  f.input('material-discount-value', '15');
  assert.equal(f.button('Save discounts').props.disabled, true); await f.save(); assert.equal(f.requests.length, 0);
  f.button('Remove installation discount').props.onClick(); await f.save();
  assert.deepEqual(f.requests[0][1], { material: { type: 'PERCENTAGE', value: 15 }, installation: null });
});

test('invalid negative, nonfinite, excess precision and percentage over 100 cannot be saved', async () => {
  for (const key of ['material', 'installation']) {
    for (const value of ['-1', 'Infinity', 'NaN', '0.001', '1.234', '100.01']) {
      const f = fixture(); f.input(`${key}-discount-value`, value);
      assert.equal(f.button('Save discounts').props.disabled, true, `${key}: ${value}`);
      await f.save(); assert.equal(f.requests.length, 0, `${key}: ${value}`);
    }
  }
  const f = fixture(); f.input('material-discount-type', 'AMOUNT'); f.input('material-discount-value', '10000000000');
  assert.equal(f.button('Save discounts').props.disabled, true); await f.save(); assert.equal(f.requests.length, 0);
});

test('valid two-decimal percentages and fixed amounts above 100 are supported', async () => {
  const f = fixture(); f.input('material-discount-value', '100');
  f.input('installation-discount-type', 'AMOUNT'); f.input('installation-discount-value', '999.99');
  assert.equal(f.button('Save discounts').props.disabled, false); await f.save();
  assert.deepEqual(f.requests[0][1], { material: { type: 'PERCENTAGE', value: 100 }, installation: { type: 'AMOUNT', value: 999.99 } });
});

test('locked, disabled and busy estimates block saving and removal, including direct handler calls', async () => {
  for (const overrides of [{ disabled: true }, { busy: true }, { config: { ...combined(), lockedAt: '2026-10-07T12:00:00Z' } }]) {
    const f = fixture({ config: combined(), ...overrides });
    f.input('material-discount-value', '15');
    assert.equal(all(f.render(), node => node.type === 'fieldset')[0].props.disabled, true);
    assert.equal(f.button('Save discounts').props.disabled, true);
    assert.equal(f.button('Remove all discounts').props.disabled, true);
    await f.save(); f.button('Remove all discounts').props.onClick(); await flush(); assert.equal(f.requests.length, 0);
  }
});

test('an in-flight save blocks another save and keeps the parent dirty until completion', async () => {
  let complete;
  const f = fixture({}, () => new Promise(resolve => { complete = resolve; }));
  f.input('material-discount-value', '10'); f.button('Save discounts').props.onClick(); f.render();
  assert.equal(f.button('Saving…').props.disabled, true); assert.equal(f.dirtyCalls.at(-1), true);
  f.button('Saving…').props.onClick(); await flush(); assert.equal(f.requests.length, 1);
  complete({ id: 17 }); await flush(); assert.equal(f.saved.length, 1); assert.equal(f.button('Save discounts').props.disabled, false);
});

test('save errors retain entered discounts, show an error and allow retry', async () => {
  const f = fixture({}, async () => { throw new Error('Estimate already paid'); });
  f.input('material-discount-value', '10'); f.input('installation-discount-type', 'AMOUNT');
  f.input('installation-discount-value', '75'); await f.save();
  assert.deepEqual(f.notices, [['error', 'Estimate already paid']]); assert.equal(f.saved.length, 0);
  assert.equal(f.control('material-discount-value').props.value, '10');
  assert.equal(f.control('installation-discount-value').props.value, '75');
  assert.equal(f.button('Save discounts').props.disabled, false);
});

test('legacy project discounts remain unchanged until the administrator explicitly replaces or removes them', async () => {
  const config = { scope: 'PROJECT', ...amount(150) };
  const f = fixture({ config });
  assert.equal(f.control('material-discount-value').props.value, '');
  assert.equal(f.control('installation-discount-value').props.value, '');
  assert.match(text(f.render()), /previous project discount.*replace it/);
  assert.equal(f.button('Save discounts').props.disabled, true); await f.save(); assert.equal(f.requests.length, 0);
  f.input('material-discount-value', '10'); await f.save();
  assert.deepEqual(f.requests[0][1], { material: { type: 'PERCENTAGE', value: 10 }, installation: null });
  const remove = fixture({ config }); remove.button('Remove all discounts').props.onClick(); await flush();
  assert.deepEqual(remove.requests[0][1], { material: null, installation: null });
});

test('combined summary separates commercial material and installation discounts without adding material tax savings twice', () => {
  const { ManualDiscountSummary } = load('components/estimates/manual-discount-summary.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx }, '@/lib/formatters': { formatMoney: money },
  });
  const summary = { scope: 'MULTIPLE', discount: '250.00',
    material: { netDiscount: '200.00', discount: '214.00' }, installation: { discount: '50.00' } };
  const output = text(ManualDiscountSummary({ summary }));
  assert.match(output, /Additional discounts−\$250\.00Material−\$200\.00Installation−\$50\.00/);
  assert.doesNotMatch(output, /214\.00|264\.00/);
  assert.match(text(ManualDiscountSummary({ summary: { ...summary, lockedAt: '2026-10-07T12:00:00Z' } })), /preserved after payment/);
  assert.equal(ManualDiscountSummary({ summary: null }), null);
  for (const [scope, label] of [['MATERIAL', 'Material'], ['INSTALLATION', 'Installation'], ['PROJECT', 'Project total']]) {
    const result = text(ManualDiscountSummary({ summary: { ...summary, scope } }));
    assert.ok(result.startsWith(`Additional discount · ${label}−$250.00`));
    assert.equal(all(ManualDiscountSummary({ summary: { ...summary, scope } }), node => node.type === 'dl').length, 0);
  }
});

test('API wrapper forwards both discount rules and null removals in one PATCH request', async () => {
  const calls = [];
  const api = load('app/api/estimates.api.ts', { './_base': { apiFetch: async (url, request) => { calls.push([url, request]); return { id: 17 }; } } });
  const body = { material: { type: 'PERCENTAGE', value: 10 }, installation: { type: 'AMOUNT', value: 75 } };
  await api.updateEstimateDiscount(17, body);
  await api.updateEstimateDiscount(17, { material: null, installation: null });
  assert.equal(calls[0][0], '/api/estimates/17/discount'); assert.equal(calls[0][1].method, 'PATCH');
  assert.deepEqual(calls[0][1].body, body); assert.deepEqual(calls[1][1].body, { material: null, installation: null });
});

(async () => {
  let failures = 0;
  for (const { name, run } of tests) {
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack}`); }
  }
  console.log(`${tests.length - failures}/${tests.length} estimate discount tests passed`);
  if (failures) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
