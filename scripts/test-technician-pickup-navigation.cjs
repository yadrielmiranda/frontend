/* Offline navigation checks using FactoryPickups. No camera, network or stock writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const filename = path.resolve(__dirname, '../src/app/technician/factory-pickups.tsx');
const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename,
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const tests = [], test = (name, run) => tests.push({ name, run });
const storage = new Map(), session = new Map(), timers = new Map(); let timerId = 0;
global.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
global.sessionStorage = { getItem: key => session.get(key) ?? null, setItem: (key, value) => session.set(key, value), removeItem: key => session.delete(key) };
global.window = { setInterval: callback => { const id = ++timerId; timers.set(id, callback); return id; }, clearInterval: id => timers.delete(id) };
const storageKey = 'technician-selected-pickup:3';
const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
const wait = () => new Promise(resolve => setImmediate(resolve));
const run = (id = 12, extra = {}) => ({ id, status: 'ACTIVE', collectedParts: 0, expectedParts: 5, remainingParts: 5,
  orders: [{ poNumber: `PO-${id}` }], technicians: [{ id: 3, name: 'Test technician' }], collectors: [], closedBy: null, ...extra });
const page = (items, total = items.length, current = 1) => ({ items, total, page: current, pageSize: 20 });
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function harness(options = {}) {
  const states = [], refs = [], memos = [], effects = [], queue = [], reads = [], busy = [], scanModes = [];
  let si = 0, ri = 0, mi = 0, ei = 0;
  const hooks = {
    ...React,
    useState(initial) { const i = si++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
    useRef(initial) { const i = ri++; return refs[i] ??= { current: initial }; },
    useCallback(callback, deps) { const i = mi++; if (!same(memos[i]?.deps, deps)) memos[i] = { deps, value: callback }; return memos[i].value; },
    useEffect(callback, deps) { const i = ei++; if (!same(effects[i]?.deps, deps)) { const previous = effects[i]; effects[i] = { deps }; queue.push(() => { previous?.cleanup?.(); effects[i].cleanup = callback(); }); } },
  };
  const lookup = surface => async query => {
    reads.push({ surface, ...query });
    return options.list ? options.list(query, surface, reads.length) : page([run()]);
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(id => {
    if (id === 'react') return hooks;
    if (id === 'react/jsx-runtime') return require(id);
    if (id === '@/app/api/technician.api') return { technicianPickups: lookup('technician') };
    if (id === '@/app/api/warehouse.api') return { warehousePickups: lookup('warehouse') };
    if (id === '@/components/ui/button') return { Button: 'Button' };
    if (id === 'lucide-react') return new Proxy({}, { get: (_, name) => name });
    if (id === '@/app/warehouse/warehouse-shared') return { errorMessage: error => error.message };
    if (id === '@/app/warehouse/unit-origin') return { poDisplayName: unit => unit.poName ?? '' };
    if (id === './factory-pickup') return { FactoryPickup: 'FactoryPickup' };
    throw new Error(`Unexpected import ${id}`);
  }, module, module.exports);
  const props = { actorId: 3, offline: false, blocked: false, onBusy: value => busy.push(value), onScanModeChange: value => scanModes.push(value), ...options.props };
  return { props, reads, busy, scanModes,
    render() { si = ri = mi = ei = 0; const tree = module.exports.FactoryPickups(props); while (queue.length) queue.shift()(); return tree; },
    async settle() { for (let i = 0; i < 4; i++) { this.render(); await wait(); } return this.render(); },
    async poll() { for (const callback of [...timers.values()]) callback(); return this.settle(); },
    dispose() { for (const effect of effects) effect.cleanup?.(); },
  };
}
function nodes(element, predicate, result = []) {
  if (Array.isArray(element)) { element.forEach(child => nodes(child, predicate, result)); return result; }
  if (!element || typeof element !== 'object') return result;
  if (predicate(element)) result.push(element);
  nodes(element.props?.children, predicate, result); return result;
}
const text = element => typeof element === 'string' || typeof element === 'number' ? String(element) : Array.isArray(element) ? element.map(text).join('') : element?.props ? text(element.props.children) : '';
const pickup = h => nodes(h.render(), node => node.type === 'FactoryPickup')[0];
const button = (h, name) => nodes(h.render(), node => node.type === 'Button' && text(node) === name)[0];
function click(h, name) { const item = button(h, name); assert.ok(item && !item.props.disabled, `Missing or disabled ${name}`); return item.props.onClick(); }

test('first successful active lookup opens the sole assigned pickup without persisting navigation', async () => {
  const h = harness(); await h.settle();
  assert.equal(pickup(h).props.pickupId, 12); assert.equal(pickup(h).props.surface, 'technician');
  assert.deepEqual(h.reads, [{ surface: 'technician', status: 'ACTIVE', page: 1, pageSize: 20 }]);
  assert.deepEqual([...storage], []);
  assert.equal(timers.size, 0); assert.deepEqual(h.busy, [false]); assert.deepEqual(h.scanModes, [false]); h.dispose();
});

test('legacy selected pickup cannot override the sole currently assigned active pickup', async () => {
  storage.set(storageKey, '45');
  const h = harness(); await h.settle();
  assert.equal(pickup(h).props.pickupId, 12); assert.equal(h.reads.length, 1);
  assert.equal(h.reads[0].status, 'ACTIVE'); assert.equal(storage.has(storageKey), false); h.dispose();
});

test('multiple assigned pickups show Start scanning and Continue scanning and open the chosen one', async () => {
  const h = harness({ list: async () => page([run(12), run(13, { collectedParts: 2, remainingParts: 3 })]) }); await h.settle();
  assert.equal(pickup(h), undefined); assert.ok(button(h, 'Start scanning')); assert.ok(button(h, 'Continue scanning'));
  click(h, 'Continue scanning'); await h.settle();
  assert.equal(pickup(h).props.pickupId, 13); assert.equal(storage.has(storageKey), false); h.dispose();
});

test('first empty list stays visible if a pickup appears during later polling', async () => {
  const h = harness({ list: async (_query, _surface, count) => count === 1 ? page([]) : page([run()]) }); await h.settle();
  assert.equal(pickup(h), undefined); assert.match(text(h.render()), /No active pickups assigned/);
  await h.poll(); assert.equal(pickup(h), undefined); assert.ok(button(h, 'Start scanning')); h.dispose();
});

test('a multiple list becoming a single list during polling never takes over navigation', async () => {
  const h = harness({ list: async (_query, _surface, count) => count === 1 ? page([run(12), run(13)]) : page([run(13)]) }); await h.settle();
  await h.poll(); assert.equal(pickup(h), undefined); assert.match(text(h.render()), /Pickup #13/); h.dispose();
});

test('one visible row is not auto-opened when total indicates other matching pickups', async () => {
  const h = harness({ list: async () => page([run()], 21) }); await h.settle();
  assert.equal(pickup(h), undefined); assert.ok(button(h, 'Next'));
  click(h, 'Next'); await h.settle(); assert.equal(pickup(h), undefined); assert.equal(h.reads.at(-1).page, 2); h.dispose();
});

test('a closed pickup in a result never auto-opens and closed view uses View pickup', async () => {
  const h = harness({ list: async () => page([run(12, { status: 'COMPLETED', collectedParts: 5, remainingParts: 0 })]) }); await h.settle();
  assert.equal(pickup(h), undefined); assert.ok(button(h, 'View pickup'));
  click(h, 'Closed'); await h.settle(); assert.equal(pickup(h), undefined); assert.equal(h.reads.at(-1).status, 'CLOSED'); h.dispose();
});

test('Back to pickups and finished pickup return stay on the list even if one active pickup remains', async () => {
  const h = harness(); await h.settle();
  click(h, 'Back to pickups'); await h.settle(); await h.poll();
  assert.equal(pickup(h), undefined); assert.equal(storage.has(storageKey), false);
  click(h, 'Start scanning'); await h.settle();
  pickup(h).props.onFinished(); await h.settle(); await h.poll();
  assert.equal(pickup(h), undefined); assert.equal(storage.has(storageKey), false); h.dispose();
});

test('manual refresh during the initial lookup prevents both old and refreshed responses from auto-opening', async () => {
  const old = deferred();
  const h = harness({ list: async (_query, _surface, count) => count === 1 ? old.promise : page([run(13)]) }); await h.settle();
  click(h, 'Refresh'); await h.settle();
  old.resolve(page([run(12)])); await h.settle();
  assert.equal(pickup(h), undefined); assert.match(text(h.render()), /Pickup #13/); assert.doesNotMatch(text(h.render()), /Pickup #12/); h.dispose();
});

test('a late active response cannot reopen a pickup after the technician chooses Closed', async () => {
  const old = deferred();
  const h = harness({ list: async query => query.status === 'ACTIVE' ? old.promise : page([run(44, { status: 'PARTIAL' })]) }); await h.settle();
  click(h, 'Closed'); await h.settle(); old.resolve(page([run(12)])); await h.settle();
  assert.equal(pickup(h), undefined); assert.match(text(h.render()), /Pickup #44/); assert.doesNotMatch(text(h.render()), /Pickup #12/);
  assert.equal(button(h, 'Closed').props['aria-pressed'], true); h.dispose();
});

test('initial offline entry does not read pickups and can auto-open after reconnecting', async () => {
  storage.set(storageKey, '45');
  const h = harness({ props: { offline: true } }); await h.settle();
  assert.equal(h.reads.length, 0); assert.equal(pickup(h), undefined); assert.match(text(h.render()), /Connect to load/);
  assert.equal(storage.has(storageKey), false);
  h.props.offline = false; await h.settle(); assert.equal(pickup(h).props.pickupId, 12); h.dispose();
});

test('going offline cancels an in-flight navigation response without consuming the online attempt', async () => {
  const old = deferred();
  const h = harness({ list: async (_query, _surface, count) => count === 1 ? old.promise : page([run(13)]) }); await h.settle();
  h.props.offline = true; await h.settle(); old.resolve(page([run(12)])); await h.settle();
  assert.equal(pickup(h), undefined); h.props.offline = false; await h.settle();
  assert.equal(pickup(h).props.pickupId, 13); h.dispose();
});

test('failed initial lookup may auto-open after a successful retry without recording any collection', async () => {
  storage.set(storageKey, '45');
  const h = harness({ list: async (_query, _surface, count) => { if (count === 1) throw new Error('Read unavailable'); return page([run()]); } }); await h.settle();
  assert.equal(pickup(h), undefined); assert.match(text(h.render()), /Read unavailable/);
  await h.poll(); assert.equal(pickup(h).props.pickupId, 12); assert.equal(h.reads.length, 2); h.dispose();
});

test('physical blocks are passed to the opened pickup and its busy state still disables Back', async () => {
  const h = harness({ props: { blocked: true } }); await h.settle();
  assert.equal(pickup(h).props.blocked, true); pickup(h).props.onBusy(true);
  assert.equal(button(h, 'Back to pickups').props.disabled, true); assert.equal(h.busy.at(-1), true);
  pickup(h).props.onBusy(false); assert.equal(button(h, 'Back to pickups').props.disabled, false); h.dispose();
});

test('warehouse surface keeps its list, creation action and manual opening without persistent selection', async () => {
  storage.set(storageKey, '45');
  storage.set('warehouse-selected-pickup:3', '46');
  const h = harness({ props: { surface: 'warehouse' } }); await h.settle();
  assert.equal(pickup(h), undefined); assert.ok(button(h, 'Create pickup')); assert.ok(button(h, 'Open pickup'));
  assert.equal(h.reads[0].surface, 'warehouse'); click(h, 'Open pickup'); await h.settle();
  assert.equal(pickup(h).props.pickupId, 12); assert.equal(pickup(h).props.surface, 'warehouse');
  assert.equal(storage.has('warehouse-selected-pickup:3'), false); assert.equal(storage.get(storageKey), '45'); h.dispose();
});

for (const surface of ['technician', 'warehouse']) {
  test(`${surface}: legacy navigation never bypasses a fresh empty or multiple active list`, async () => {
    for (const items of [[], [run(45), run(46)]]) {
      const key = `${surface}-selected-pickup:3`;
      storage.set(key, '45');
      const h = harness({ props: { surface }, list: async () => page(items) }); await h.settle();
      assert.equal(pickup(h), undefined); assert.equal(h.reads.length, 1);
      assert.equal(h.reads[0].status, 'ACTIVE'); assert.equal(storage.has(key), false);
      assert.equal(button(h, 'Active').props['aria-pressed'], true); h.dispose();
    }
  });

  test(`${surface}: entering removes only its own obsolete selection and preserves pending recovery`, async () => {
    const key = `${surface}-selected-pickup:3`;
    const otherSurface = surface === 'technician' ? 'warehouse' : 'technician';
    const preserved = [
      [`${surface}-pickup-candidate:3:45`, 'unconfirmed candidate'],
      [`warehouse-reading:${surface}:3:pickup:45`, 'unconfirmed scan'],
      [`${surface}-selected-pickup:4`, 'other account'],
      [`${otherSurface}-selected-pickup:3`, 'other surface'],
    ];
    const savedSession = [
      [`${surface}-customer-delivery:3`, 'signed delivery request'],
      [`${surface}-pickup-customer-delivery:3:45`, 'order:2'],
    ];
    storage.set(key, '45'); preserved.forEach(([name, value]) => storage.set(name, value));
    savedSession.forEach(([name, value]) => session.set(name, value));
    const h = harness({ props: { surface }, list: async () => page([]) }); await h.settle();
    assert.equal(storage.has(key), false);
    for (const [name, value] of preserved) assert.equal(storage.get(name), value);
    assert.deepEqual([...session], savedSession); h.dispose();
  });

  test(`${surface}: manually viewed closed pickup does not reopen after leaving and entering again`, async () => {
    for (const closedStatus of ['PARTIAL', 'COMPLETED']) {
      const closed = run(45, { status: closedStatus });
      const h = harness({ props: { surface }, list: async query => page(query.status === 'CLOSED' ? [closed] : []) });
      await h.settle(); click(h, 'Closed'); await h.settle(); click(h, 'View pickup'); await h.settle();
      assert.equal(pickup(h).props.pickupId, 45); assert.equal(storage.has(`${surface}-selected-pickup:3`), false);
      h.dispose();
      const enteredAgain = harness({ props: { surface } }); await enteredAgain.settle();
      assert.equal(enteredAgain.reads[0].status, 'ACTIVE');
      if (surface === 'technician') assert.equal(pickup(enteredAgain).props.pickupId, 12);
      else { assert.equal(pickup(enteredAgain), undefined); assert.ok(button(enteredAgain, 'Open pickup')); }
      enteredAgain.dispose();
    }
  });

  test(`${surface}: unavailable browser storage cannot restore stale navigation or block normal entry`, async () => {
    const original = global.localStorage, key = `${surface}-selected-pickup:3`;
    storage.set(key, '45');
    global.localStorage = {
      getItem() { throw new Error('Storage blocked'); }, setItem() { throw new Error('Storage blocked'); }, removeItem() { throw new Error('Storage blocked'); },
    };
    try {
      const h = harness({ props: { surface } }); await h.settle();
      assert.equal(h.reads[0].status, 'ACTIVE');
      if (surface === 'technician') assert.equal(pickup(h).props.pickupId, 12);
      else { assert.equal(pickup(h), undefined); click(h, 'Open pickup'); await h.settle(); assert.equal(pickup(h).props.pickupId, 12); }
      assert.equal(storage.get(key), '45'); h.dispose();
    } finally { global.localStorage = original; }
  });
}

(async () => {
  for (const { name, run: execute } of tests) {
    storage.clear(); session.clear(); timers.clear(); await execute(); process.stdout.write(`PASS ${name}\n`);
  }
  process.stdout.write(`${tests.length} technician pickup navigation checks passed.\n`);
})().catch(error => { console.error(error); process.exitCode = 1; });
