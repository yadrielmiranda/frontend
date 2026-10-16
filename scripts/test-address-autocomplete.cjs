// Exercise asynchronous address selection and manual-entry behavior without live Google requests.
// Run: node scripts/test-address-autocomplete.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');

const jsx = (type, props) => ({ type, props });
const all = (node, predicate) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(child => all(child, predicate))
  : [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object'
  ? text(node.props?.children) : node == null || typeof node === 'boolean' ? '' : String(node);
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const suggestions = [
  { placeId: 'place-one', text: '100 Example Road, El Portal, FL', mainText: '100 Example Road', secondaryText: 'El Portal, FL' },
  { placeId: 'place-two', text: '100 Example Road, Miami, FL', mainText: '100 Example Road', secondaryText: 'Miami, FL' },
];
const address = { street: '100 Example Road', city: 'El Portal', state: 'FL', postalCode: '33138' };
const tests = [];
const test = (name, run) => tests.push({ name, run });

function load(relative, mocks, globals = {}) {
  const file = path.resolve(__dirname, '../src', relative);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), code)(id => {
    if (id in mocks) return mocks[id];
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id === '@/components/ui/input') return { Input: 'Input' };
    throw new Error(`Unexpected dependency: ${id}`);
  }, module, module.exports, ...Object.values(globals));
  return module.exports;
}

function fixture(overrides = {}, initialProps = {}, crypto = webcrypto) {
  const requests = [], selections = [], timers = new Map(), states = [], refs = [], effects = [];
  let stateIndex = 0, refIndex = 0, effectIndex = 0, dirty = false, pending = [], timerId = 0, now = 0;
  const props = { id: 'street', value: '', contextKey: 'El Portal|FL|33138',
    onChange(event) { props.value = event.target.value; }, onAddressSelect(value) { selections.push(value); }, ...initialProps };
  const hooks = {
    useId() { return 'generated'; },
    useState(initial) { const slot = stateIndex++; if (!(slot in states)) states[slot] = initial;
      return [states[slot], next => { const value = typeof next === 'function' ? next(states[slot]) : next;
        if (!Object.is(value, states[slot])) { states[slot] = value; dirty = true; } }]; },
    useRef(initial) { return refs[refIndex++] ??= { current: initial }; },
    useCallback(fn) { return hooks.useRef(fn).current; },
    useEffect(fn, deps) { const slot = effectIndex++, previous = effects[slot];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        pending.push(() => { previous?.cleanup?.(); effects[slot] = { deps, cleanup: fn() }; });
      } },
  };
  const api = Object.fromEntries(['autocompleteAddress', 'getPlaceAddress'].map(name => [name, (...args) => {
    requests.push({ name, args });
    return overrides[name] ? overrides[name](...args) : Promise.resolve(name === 'autocompleteAddress' ? { suggestions } : address);
  }]));
  const { AddressAutocomplete } = load('components/address-autocomplete.tsx', { react: hooks, '@/app/api/geo.api': api }, {
    globalThis: { crypto }, Date: { now: () => now },
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, due: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  });
  const render = () => {
    let tree, iterations = 0;
    do {
      assert.ok(iterations++ < 12, 'Effects settle');
      stateIndex = refIndex = effectIndex = 0; pending = []; dirty = false;
      tree = AddressAutocomplete(props); pending.forEach(fn => fn());
    } while (dirty);
    return tree;
  };
  const input = () => all(render(), node => node.type === 'Input')[0];
  const tick = async (ms = 300) => {
    now += ms;
    for (const [id, task] of timers) if (task.due <= now) { timers.delete(id); task.fn(); }
    await flush(); render();
  };
  return { requests, selections, props, render, input, tick,
    focus() { input().props.onFocus({}); render(); },
    type(value) { input().props.onChange({ target: { value } }); render(); },
    blur() { input().props.onBlur({}); render(); },
    update(next) { Object.assign(props, next); render(); },
    options() { return all(render(), node => node.props?.role === 'option'); },
    key(key, isComposing = false) {
      const event = { key, nativeEvent: { isComposing }, defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
      input().props.onKeyDown(event); render(); return event;
    },
    unmount() { effects.forEach(effect => effect?.cleanup?.()); },
  };
}

test('mounting, focusing, and loading an existing address never search or overwrite it', async () => {
  const f = fixture({}, { value: 'Already saved street' });
  f.render(); f.focus(); await f.tick(); f.update({ value: 'Another saved street' }); await f.tick();
  assert.equal(f.requests.length, 0); assert.equal(f.selections.length, 0);
});

test('search waits for three characters and debounces consecutive typing', async () => {
  const f = fixture(); f.focus(); f.type('10'); await f.tick();
  assert.equal(f.requests.length, 0);
  f.type('100 E'); await f.tick(200); f.type('100 Example'); await f.tick(299);
  assert.equal(f.requests.length, 0); await f.tick(1);
  assert.equal(f.requests.length, 1); assert.equal(f.requests[0].args[0], '100 Example');
  assert.equal(f.options().length, 2);
  assert.ok(text(f.render()).includes('Google Maps'));
});

test('arrows and Enter select the active address without submitting the form', async () => {
  const f = fixture(); f.focus(); f.type('100 Example'); await f.tick();
  assert.equal(f.input().props['aria-activedescendant'], 'street-suggestions-0');
  assert.equal(f.key('ArrowDown').defaultPrevented, true);
  assert.equal(f.input().props['aria-activedescendant'], 'street-suggestions-1');
  assert.equal(f.key('Enter').defaultPrevented, true); await flush(); f.render();
  assert.equal(f.requests[1].args[0], 'place-two'); assert.deepEqual(f.selections, [address]);
  assert.equal(f.requests[0].args[1], f.requests[1].args[1], 'Autocomplete and details share one session');
  assert.equal(f.input().props['aria-expanded'], false);
  f.update({ value: address.street }); await f.tick(); assert.equal(f.requests.length, 2);
  f.type('200 Example'); await f.tick();
  assert.notEqual(f.requests[2].args[1], f.requests[0].args[1], 'Completed selection uses a new session');
});

test('older autocomplete responses cannot replace newer suggestions', async () => {
  const old = deferred(), current = deferred(); let calls = 0;
  const f = fixture({ autocompleteAddress: () => ++calls === 1 ? old.promise : current.promise });
  f.focus(); f.type('100 Example'); await f.tick(); f.type('200 Example'); await f.tick();
  current.resolve({ suggestions: [suggestions[1]] }); await flush();
  old.resolve({ suggestions: [suggestions[0]] }); await flush();
  assert.equal(f.options().length, 1); assert.equal(f.options()[0].props['aria-label'], suggestions[1].text);
});

test('typing while details load preserves the manual street and ignores the old selection', async () => {
  const details = deferred(); const f = fixture({ getPlaceAddress: () => details.promise });
  f.focus(); f.type('100 Example'); await f.tick(); f.key('Enter');
  f.type('100 Example, apartment 7'); details.resolve(address); await flush();
  assert.equal(f.props.value, '100 Example, apartment 7'); assert.equal(f.selections.length, 0);
  await f.tick(); assert.notEqual(f.requests.at(-1).args[1], f.requests[0].args[1]);
});

test('manual changes to city/state/ZIP cancel an outstanding address selection', async () => {
  const details = deferred(); const f = fixture({ getPlaceAddress: () => details.promise });
  f.focus(); f.type('100 Example'); await f.tick(); f.key('Enter');
  f.update({ contextKey: 'Corrected city|FL|33138' }); details.resolve(address); await flush();
  assert.equal(f.selections.length, 0); assert.equal(f.input().props['aria-expanded'], false);
});

test('blur cancels debounced requests and pending details without replacing manual input', async () => {
  const details = deferred(); const f = fixture({ getPlaceAddress: () => details.promise });
  f.focus(); f.type('100 Example'); f.blur(); await f.tick(); assert.equal(f.requests.length, 0);
  f.focus(); f.type('100 Example Road'); await f.tick(); f.key('Enter'); f.blur();
  details.resolve(address); await flush(); assert.equal(f.selections.length, 0);
  assert.equal(f.input().props['aria-expanded'], false);
});

test('Escape dismisses suggestions and consumes no details request', async () => {
  const f = fixture(); f.focus(); f.type('100 Example'); await f.tick();
  assert.equal(f.key('Escape').defaultPrevented, true); assert.equal(f.options().length, 0);
  assert.equal(f.key('Enter').defaultPrevented, false); assert.equal(f.requests.length, 1);
  assert.equal(f.props.value, '100 Example');
});

test('search and details failures keep manual entry available and restart consumed sessions', async () => {
  let searches = 0;
  const f = fixture({ autocompleteAddress: () => ++searches === 1 ? Promise.reject(new Error('unavailable')) : Promise.resolve({ suggestions }),
    getPlaceAddress: () => Promise.reject(new Error('timeout')) });
  f.focus(); f.type('100 Example'); await f.tick();
  assert.ok(text(f.render()).includes('enter the address manually'));
  f.type('100 Example Road'); await f.tick(); f.key('Enter'); await flush();
  assert.ok(text(f.render()).includes('enter the address manually')); assert.equal(f.selections.length, 0);
  assert.equal(f.props.value, '100 Example Road');
  const consumed = f.requests.at(-1).args[1]; f.type('100 Example Road apt 7'); await f.tick();
  assert.notEqual(f.requests.at(-1).args[1], consumed);
});

test('empty results explain manual entry and never select an address', async () => {
  const f = fixture({ autocompleteAddress: () => Promise.resolve({ suggestions: [] }) });
  f.focus(); f.type('100 Example'); await f.tick(); assert.equal(f.options().length, 0);
  assert.ok(text(f.render()).includes('No matching addresses')); f.key('Enter');
  assert.equal(f.requests.length, 1); assert.equal(f.selections.length, 0);
});

test('unmount discards a pending selection', async () => {
  const details = deferred(); const f = fixture({ getPlaceAddress: () => details.promise });
  f.focus(); f.type('100 Example'); await f.tick(); f.key('Enter'); f.unmount();
  details.resolve(address); await flush(); assert.equal(f.selections.length, 0);
});

test('HTTP LAN browsers generate a valid UUIDv4 without crypto.randomUUID', async () => {
  const f = fixture({}, {}, { getRandomValues: bytes => webcrypto.getRandomValues(bytes) });
  f.focus(); f.type('100 Example'); await f.tick();
  assert.match(f.requests[0].args[1], /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
});

test('long sessions rotate tokens and IME Enter never chooses a suggestion', async () => {
  const f = fixture(); f.focus(); f.type('100 Example'); await f.tick();
  assert.equal(f.key('Enter', true).defaultPrevented, false); assert.equal(f.requests.length, 1);
  await f.tick(180001); f.type('100 Example Road'); await f.tick();
  assert.notEqual(f.requests[1].args[1], f.requests[0].args[1]);
});

test('API helpers send only address search data through the authenticated backend wrapper', async () => {
  const requests = [];
  const api = load('app/api/geo.api.ts', { './_base': { apiFetch: (...args) => { requests.push(args); return Promise.resolve({}); } } });
  await api.autocompleteAddress('100 Example', 'session'); await api.getPlaceAddress('place-one', 'session');
  assert.deepEqual(requests, [
    ['/api/geo/places/autocomplete', { method: 'POST', body: { input: '100 Example', sessionToken: 'session' }, timeoutMs: 10000 }],
    ['/api/geo/places/details', { method: 'POST', body: { placeId: 'place-one', sessionToken: 'session' }, timeoutMs: 10000 }],
  ]);
});

(async () => {
  for (const { name, run } of tests) {
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { console.error(`FAIL ${name}`); throw error; }
  }
  console.log(`${tests.length} address autocomplete tests passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
