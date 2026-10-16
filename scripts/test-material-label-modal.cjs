// Run: node --test scripts/test-material-label-modal.cjs
// Exercises the real modal, layout engine, and JsBarcode without network or stock writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const JsBarcode = require('jsbarcode');
const { DOMImplementation, XMLSerializer } = require('@xmldom/xmldom');

const sourceRoot = path.resolve(__dirname, '../src');
const jsx = (type, props) => ({ type, props });
const ui = new Proxy({}, { get: (_, name) => name });
const nodes = (node, match) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(child => nodes(child, match))
  : [...(match(node) ? [node] : []), ...nodes(node.props?.children, match)];
const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object'
  ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
const button = (tree, label) => nodes(tree, node => node.type === 'Button' && text(node) === label)[0];
const field = (tree, label) => nodes(tree, node => node.type === 'MaterialField' && node.props.label === label)[0]?.props.children;
const errors = tree => nodes(tree, node => node.type === 'MaterialNotice').map(node => node.props.error).filter(Boolean).join(' ');
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

function printWindow({ pendingImages = false } = {}) {
  let html = '', printed = 0;
  const listeners = {};
  const action = { disabled: false, textContent: '', addEventListener: (event, callback) => { listeners[event] = callback; } };
  const popup = {
    closed: false, opener: {}, focus() {}, requestAnimationFrame: callback => callback(),
    print: () => { printed++; },
    document: {
      open() {}, close() {}, write: value => { html = value; },
      querySelector: selector => { assert.equal(selector, '[data-print-action]'); return action; },
      images: [{ decode: () => pendingImages ? new Promise(() => {}) : Promise.resolve() }],
      fonts: { ready: Promise.resolve() },
    },
  };
  return { popup, action, listeners, get html() { return html; }, get printed() { return printed; } };
}

function fixture(t, { barcode = '123456', stored, denyStorage = false, open } = {}) {
  const oldGlobals = new Map(['document', 'window', 'XMLSerializer'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const document = new DOMImplementation().createDocument('http://www.w3.org/1999/xhtml', 'html', null);
  const createdSvgs = [], saved = [], timers = new Map();
  const originalCreateElement = document.createElementNS.bind(document);
  document.createElementNS = (namespace, name) => {
    const element = originalCreateElement(namespace, name);
    if (name === 'svg') createdSvgs.push(element);
    return element;
  };
  let nextTimer = 0;
  globalThis.document = document;
  globalThis.XMLSerializer = XMLSerializer;
  globalThis.window = {
    localStorage: {
      getItem() { if (denyStorage) throw new Error('Storage disabled'); return stored ?? null; },
      setItem(key, value) { if (denyStorage) throw new Error('Storage disabled'); saved.push({ key, value }); },
    },
    open: open || (() => null),
    setInterval(callback) { const id = ++nextTimer; timers.set(id, callback); return id; },
    clearInterval: id => timers.delete(id),
  };
  t.after(() => {
    for (const [key, descriptor] of oldGlobals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });

  const states = [], refs = [], effects = [], cache = new Map();
  let stateIndex = 0, refIndex = 0, effectIndex = 0, dirty = false;
  const hooks = {
    useState(initial) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], value => {
        const next = typeof value === 'function' ? value(states[index]) : value;
        if (!Object.is(states[index], next)) { states[index] = next; dirty = true; }
      }];
    },
    useRef(initial) { const index = refIndex++; return refs[index] ??= { current: initial }; },
    useEffect(callback, dependencies) {
      const index = effectIndex++, previous = effects[index];
      if (!previous || !dependencies || dependencies.some((value, i) => !Object.is(value, previous.dependencies?.[i]))) {
        effects[index] = { callback, dependencies, cleanup: previous?.cleanup, pending: true };
      }
    },
  };
  function load(relative) {
    if (cache.has(relative)) return cache.get(relative);
    const filename = path.resolve(sourceRoot, relative);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const exported = {};
    new Function('require', 'exports', compiled)(name => {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'jsbarcode') return JsBarcode;
      if (name === 'lucide-react' || name.startsWith('@/components/ui/')) return ui;
      if (name === './materials-shared') return { MaterialField: 'MaterialField', MaterialNotice: 'MaterialNotice' };
      if (name === '@/lib/material-label-print') return load('lib/material-label-print.ts');
      throw new Error(`Unexpected modal dependency: ${name}`);
    }, exported);
    cache.set(relative, exported);
    return exported;
  }
  const { MaterialLabels } = load('app/warehouse/materials/material-labels.tsx');
  const props = {
    product: { name: 'Stainless steel screws', code: 'SC-50', baseUnit: { name: 'units' } },
    presentation: { name: 'Box', multiplier: 50, barcode }, onClose() {},
  };
  return {
    createdSvgs, saved, timers,
    render() {
      for (let pass = 0; pass < 10; pass++) {
        dirty = false; stateIndex = 0; refIndex = 0; effectIndex = 0;
        const tree = MaterialLabels(props);
        for (const effect of effects) if (effect.pending) {
          effect.pending = false; effect.cleanup?.(); effect.cleanup = effect.callback();
        }
        if (!dirty) return tree;
      }
      throw new Error('Modal did not settle after effects');
    },
  };
}

for (const barcode of ['123456', 'MAT-4E618BD0A8CD49AC9C5F']) {
  test(`Actual JsBarcode px width produces a printable modal: ${barcode}`, t => {
    const h = fixture(t, { barcode });
    const tree = h.render();
    assert.match(h.createdSvgs[0].getAttribute('width'), /^\d+(\.\d+)?px$/);
    assert.equal(h.createdSvgs[0].getAttribute('preserveAspectRatio'), 'none');
    assert.equal(errors(tree), '');
    assert.equal(button(tree, 'Print').props.disabled, false);
    assert.equal(button(tree, 'Preview').props.disabled, false);
    assert.ok(nodes(tree, node => node.props?.dangerouslySetInnerHTML?.__html.includes('data:image/svg+xml')).length);
  });
}

test('Long generated barcode blocks an unreadable narrow label and recovers after widening', t => {
  const h = fixture(t, { barcode: 'MAT-4E618BD0A8CD49AC9C5F' });
  let tree = h.render();
  field(tree, 'Width (mm)').props.onChange({ target: { value: '30' } });
  tree = h.render();
  assert.equal(button(tree, 'Print').props.disabled, true);
  assert.match(errors(tree), /at least \d+ mm wide/);
  field(tree, 'Width (mm)').props.onChange({ target: { value: '100' } });
  tree = h.render();
  assert.equal(errors(tree), '');
  assert.equal(button(tree, 'Print').props.disabled, false);
});

for (const options of [{ stored: '{broken' }, { denyStorage: true }]) {
  test(`${options.denyStorage ? 'Denied' : 'Corrupt'} preference storage does not prevent printing`, async t => {
    const result = printWindow();
    const h = fixture(t, { ...options, open: () => result.popup });
    let tree = h.render();
    assert.equal(button(tree, 'Print').props.disabled, false);
    button(tree, 'Print').props.onClick();
    await settle();
    tree = h.render();
    assert.equal(errors(tree), '');
    assert.equal(result.printed, 1);
    assert.match(result.html, /<article class="material-label/);
    assert.equal(button(tree, 'Print').props.disabled, false);
    assert.equal(h.timers.size, 0);
  });
}

test('Blocked pop-up gives a recoverable message and successful preview retry prints only on request', async t => {
  const result = printWindow();
  let attempts = 0;
  const h = fixture(t, { open: () => ++attempts === 1 ? null : result.popup });
  let tree = h.render();
  button(tree, 'Preview').props.onClick();
  tree = h.render();
  assert.match(errors(tree), /Allow pop-ups/);
  assert.equal(button(tree, 'Preview').props.disabled, false);
  button(tree, 'Preview').props.onClick();
  await settle();
  tree = h.render();
  assert.equal(errors(tree), '');
  assert.equal(result.popup.opener, null);
  assert.equal(result.printed, 0);
  assert.equal(result.action.disabled, false);
  result.listeners.click();
  assert.equal(result.printed, 1);
  assert.equal(attempts, 2);
});

test('Closing the print window while barcode images load releases the preparing state', async t => {
  const result = printWindow({ pendingImages: true });
  const h = fixture(t, { open: () => result.popup });
  let tree = h.render();
  button(tree, 'Print').props.onClick();
  tree = h.render();
  assert.equal(button(tree, 'Preparing…').props.disabled, true);
  result.popup.closed = true;
  for (const callback of h.timers.values()) callback();
  await settle();
  tree = h.render();
  assert.equal(button(tree, 'Print').props.disabled, false);
  assert.equal(result.printed, 0);
  assert.equal(h.timers.size, 0);
});
