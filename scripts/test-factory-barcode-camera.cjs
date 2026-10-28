// Run: node --test scripts/test-factory-barcode-camera.cjs
// Tests the real modal, decoder and ScanPad. Camera hardware is simulated;
// shared media-session ownership is covered by test-material-barcode-camera.cjs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const zxing = require('@zxing/library');
const { BrowserMultiFormatReader } = require('@zxing/browser');
const JsBarcode = require('jsbarcode');

const dir = path.resolve(__dirname, '../src/app/warehouse');
function compile(filename, dependency, extra = '') {
  const source = fs.readFileSync(path.join(dir, filename), 'utf8');
  const compiled = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled + extra)(dependency, exports);
  return exports;
}
const session = compile('materials/material-barcode-camera-session.ts', () => { throw Error('Unexpected dependency'); });
const parts = compile('factory-parts.ts', () => { throw Error('Unexpected dependency'); });
const jsx = (type, props) => ({ type, props });
const nodes = (node, match) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(item => nodes(item, match))
  : [...(match(node) ? [node] : []), ...nodes(node.props?.children, match)];
const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node)
  : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
const button = (tree, label) => nodes(tree, node => node.type === 'Button' && text(node) === label)[0];
const settle = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function events() {
  const listeners = new Map();
  return {
    addEventListener(name, callback) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(callback); },
    removeEventListener(name, callback) { listeners.get(name)?.delete(callback); },
    emit(name) { for (const fn of [...(listeners.get(name) ?? [])]) fn(); },
    get listenerCount() { return [...listeners.values()].reduce((sum, group) => sum + group.size, 0); },
  };
}
function globals(values) {
  const originals = Object.keys(values).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  Object.entries(values).forEach(([key, value]) => Object.defineProperty(globalThis, key, { configurable: true, value }));
  return () => originals.forEach(([key, desc]) => desc ? Object.defineProperty(globalThis, key, desc) : delete globalThis[key]);
}
function hooksHarness(component, props, beforeEffects = () => {}) {
  const states = [], refs = [], effects = [];
  let si, ri, ei, dirty;
  const hooks = {
    useState(initial) { const i = si++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { const next = typeof value === 'function' ? value(states[i]) : value; if (!Object.is(next, states[i])) { states[i] = next; dirty = true; } }]; },
    useRef(initial) { return refs[ri++] ??= { current: initial }; },
    useEffect(callback, deps) { const i = ei++, old = effects[i]; if (!old || deps.some((value, ix) => !Object.is(value, old.deps[ix]))) effects[i] = { callback, deps, cleanup: old?.cleanup, pending: true }; },
  };
  return {
    props,
    render() {
      for (let pass = 0; pass < 15; pass++) {
        si = ri = ei = 0; dirty = false;
        const tree = component(hooks, props);
        beforeEffects(tree);
        for (const effect of effects) if (effect.pending) { effect.pending = false; effect.cleanup?.(); effect.cleanup = effect.callback(); }
        if (!dirty) return tree;
      }
      throw Error('Effects did not settle');
    },
    unmount() { effects.forEach(effect => { effect.cleanup?.(); effect.cleanup = undefined; }); },
  };
}
const ui = new Proxy({}, { get: (_, key) => key });
function modalModule(hooks, overrides = {}) {
  return compile('factory-barcode-camera.tsx', name => {
    if (name === 'react') return hooks;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'lucide-react' || name.startsWith('@/components/ui/')) return ui;
    if (name === './materials/material-barcode-camera-session') return overrides.session ?? session;
    if (name === '@zxing/library') return zxing;
    if (name === '@zxing/browser') return overrides.browser ?? { BrowserMultiFormatReader };
    throw Error(`Unexpected dependency ${name}`);
  }, '\nexports.testPreview = FactoryCameraPreview; exports.testReader = loadFactoryBarcodeReader;');
}
function modal(t, props = {}) {
  let mod;
  const codes = [];
  const h = hooksHarness((hooks, current) => { mod ??= modalModule(hooks); return mod.FactoryBarcodeCamera(current); }, { onDetected: code => codes.push(code), ...props });
  t.after(() => h.unmount());
  const currentPreview = () => nodes(h.render(), node => node.type === mod.testPreview)[0];
  const open = () => { h.render().props.onOpenChange(true); return currentPreview(); };
  return { h, codes, open, currentPreview };
}

test('Factory camera is closed by default, form-safe and supports a custom trigger label', t => {
  const m = modal(t, { label: 'Scan next part', prominent: true });
  const tree = m.h.render(), trigger = button(tree, 'Scan next part');
  assert.equal(tree.props.open, false);
  assert.equal(trigger.props.type, 'button');
  assert.equal(m.currentPreview(), undefined);
  assert.ok(m.open());
  assert.equal(m.h.render().props.open, true);
});

test('Detection stops capture and closes the controlled dialog before delivering one exact code', t => {
  const m = modal(t);
  let stops = 0;
  m.h.props.onDetected = code => {
    assert.equal(stops, 1);
    assert.equal(m.h.render().props.open, false);
    m.codes.push(code);
  };
  const preview = m.open();
  preview.props.stopCapture.current = () => stops++;
  preview.props.onDetected('001029975-FRAME');
  preview.props.onDetected('001029975-FRAME');
  assert.deepEqual(m.codes, ['001029975-FRAME']);
  assert.equal(stops, 1);
  assert.equal(m.currentPreview(), undefined);
});

test('Cancel rejects old detections both before render and after a new camera has opened', t => {
  const m = modal(t), old = m.open();
  let stops = 0;
  old.props.stopCapture.current = () => stops++;
  old.props.onClose();
  assert.equal(stops, 1);
  old.props.onDetected('1029975-DOOR');
  const fresh = m.open();
  old.props.onDetected('1029975-FRAME');
  assert.deepEqual(m.codes, []);
  assert.equal(m.h.render().props.open, true);
  fresh.props.onDetected('1029975-WINDOW');
  assert.deepEqual(m.codes, ['1029975-WINDOW']);
});

test('Disabled and unmounted cameras cannot deliver a reading or reopen unexpectedly', t => {
  const m = modal(t), preview = m.open();
  let stops = 0;
  preview.props.stopCapture.current = () => stops++;
  m.h.props.disabled = true;
  const tree = m.h.render();
  assert.equal(tree.props.open, false);
  assert.equal(button(tree, 'Scan with camera').props.disabled, true);
  preview.props.onDetected('1029975-DOOR');
  tree.props.onOpenChange(true);
  assert.equal(m.currentPreview(), undefined);
  assert.ok(stops > 0);
  m.h.props.disabled = false;
  assert.equal(m.h.render().props.open, false);
  const fresh = m.open();
  m.h.unmount();
  fresh.props.onDetected('1029975-FRAME');
  assert.deepEqual(m.codes, []);
});

test('Closing returns focus to the camera trigger without scrolling the pickup page', t => {
  const m = modal(t), tree = m.h.render(), focused = [];
  button(tree, 'Scan with camera').props.ref.current = { focus: options => focused.push(options) };
  const content = nodes(tree, node => node.type === 'DialogContent')[0];
  let prevented = false;
  content.props.onCloseAutoFocus({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.deepEqual(focused, [{ preventScroll: true }]);
});

function preview(t, { secure = true, supported = true, hidden = false } = {}) {
  const win = { ...events(), isSecureContext: secure }, doc = { ...events(), hidden };
  const requests = [];
  const restore = globals({ window: win, document: doc, navigator: { mediaDevices: supported ? { getUserMedia: value => { requests.push(value); return Promise.resolve('stream'); } } : undefined } });
  const sessions = [], codes = [], closed = [], video = { mounted: false };
  let mod;
  const h = hooksHarness((hooks, props) => {
    mod ??= modalModule(hooks, { session: { ...session, startMaterialCamera(options) {
      assert.equal(video.mounted, true, 'The preview must mount before a camera session starts');
      assert.equal(options.video, video);
      const item = { options, stops: 0 };
      sessions.push(item);
      return () => { item.stops = 1; };
    } } });
    return mod.testPreview(props);
  }, { onDetected: code => codes.push(code), onClose: () => closed.push(true), stopCapture: { current() {} } }, tree => {
    const element = nodes(tree, node => node.type === 'video')[0];
    assert.equal(element.props.muted, true);
    assert.equal(element.props.playsInline, true);
    element.props.ref.current = video;
    video.mounted = true;
  });
  t.after(() => { h.unmount(); restore(); });
  return { h, win, doc, sessions, codes, closed, requests };
}

test('Factory preview mounts before starting, exposes loading, and forwards readiness and exact readings', async t => {
  const p = preview(t);
  assert.equal(p.sessions.length, 0);
  let tree = p.h.render();
  assert.equal(p.sessions.length, 1);
  assert.match(text(nodes(tree, node => node.props?.role === 'status')[0]), /Opening camera/);
  p.sessions[0].options.onReady();
  tree = p.h.render();
  assert.equal(nodes(tree, node => node.props?.role === 'status').length, 0);
  p.sessions[0].options.onDetected('001029975-SIDELITE');
  assert.deepEqual(p.codes, ['001029975-SIDELITE']);
  const constraints = { video: { facingMode: 'environment' }, audio: false };
  await p.sessions[0].options.getUserMedia(constraints);
  assert.deepEqual(p.requests, [constraints]);
  assert.equal(button(tree, 'Cancel').props.type, 'button');
  button(tree, 'Cancel').props.onClick();
  assert.equal(p.closed.length, 1);
});

for (const kind of ['visibilitychange', 'pagehide']) {
  test(`${kind} releases capture and closes the factory camera`, t => {
    const p = preview(t); p.h.render();
    if (kind === 'visibilitychange') {
      p.doc.emit(kind);
      assert.equal(p.closed.length, 0, 'Visible documents must not close the camera');
      p.doc.hidden = true; p.doc.emit(kind);
    } else p.win.emit(kind);
    assert.equal(p.sessions[0].stops, 1);
    assert.equal(p.closed.length, 1);
    p.h.unmount();
    assert.equal(p.doc.listenerCount, 0);
    assert.equal(p.win.listenerCount, 0);
  });
}

test('An already hidden document closes immediately; unmount clears capture ownership and page listeners', t => {
  const p = preview(t, { hidden: true }); p.h.render();
  assert.equal(p.sessions[0].stops, 1);
  assert.equal(p.closed.length, 1);
  const previousStop = p.h.props.stopCapture.current;
  p.h.unmount();
  assert.notEqual(p.h.props.stopCapture.current, previousStop);
  assert.equal(p.doc.listenerCount, 0);
  assert.equal(p.win.listenerCount, 0);
});

for (const config of [{ secure: false }, { supported: false }]) {
  test(`${JSON.stringify(config)} explains manual fallback without starting a camera`, t => {
    const p = preview(t, config), tree = p.h.render();
    assert.equal(p.sessions.length, 0);
    assert.match(text(nodes(tree, node => node.props?.role === 'alert')[0]), /HTTPS.*manually.*barcode reader/);
    assert.ok(button(tree, 'Cancel'));
  });
}

test('Camera failure remains recoverable and retry releases the old session before starting another', t => {
  const p = preview(t); p.h.render();
  p.sessions[0].options.onError({ name: 'NotAllowedError' });
  let tree = p.h.render();
  assert.match(text(nodes(tree, node => node.props?.role === 'alert')[0]), /denied.*manually/i);
  assert.deepEqual(p.codes, []);
  assert.ok(nodes(tree, node => node.type === 'Button').every(item => item.props.type === 'button'));
  button(tree, 'Try again').props.onClick();
  tree = p.h.render();
  assert.equal(p.sessions.length, 2);
  assert.equal(p.sessions[0].stops, 1);
  assert.equal(nodes(tree, node => node.props?.role === 'alert').length, 0);
  assert.match(text(nodes(tree, node => node.props?.role === 'status')[0]), /Opening camera/);
  p.h.unmount();
  assert.equal(p.sessions[1].stops, 1);
});

test('Factory decoder enables CODE128 only and treats ordinary decode failures as unreadable frames', async () => {
  const hints = [], output = [];
  class Reader {
    constructor(value) { hints.push(value); }
    decode() { const next = output.shift(); if (next instanceof Error) throw next; return { getText: () => next }; }
  }
  const reader = await modalModule({}, { browser: { BrowserMultiFormatReader: Reader } }).testReader();
  assert.deepEqual(hints[0].get(zxing.DecodeHintType.POSSIBLE_FORMATS), [zxing.BarcodeFormat.CODE_128]);
  assert.equal(hints[0].get(zxing.DecodeHintType.TRY_HARDER), true);
  for (const Failure of [zxing.NotFoundException, zxing.ChecksumException, zxing.FormatException]) {
    output.push(new Failure()); assert.equal(reader.read({}), null);
  }
  output.push('001029975-FRAME'); assert.equal(reader.read({}), '001029975-FRAME');
  output.push(new Error('Broken canvas')); assert.throws(() => reader.read({}), /Broken canvas/);
});

function rasterBarcode(format, code) {
  const output = {};
  JsBarcode(output, code, { format, displayValue: false });
  const modules = output.encodings.map(encoding => encoding.data).join('');
  const scale = 3, margin = 40, width = modules.length * scale + margin * 2, height = 120;
  const pixels = new Uint8ClampedArray(width * height).fill(255);
  for (let y = 20; y < 100; y++) for (let x = 0; x < modules.length; x++) if (modules[x] === '1') pixels.fill(0, y * width + margin + x * scale, y * width + margin + (x + 1) * scale);
  return new zxing.BinaryBitmap(new zxing.HybridBinarizer(new zxing.RGBLuminanceSource(pixels, width, height)));
}
for (const code of ['001029975-DOOR', '1029975-FRAME', '1029975-SIDELITE', 'I1029975']) {
  test(`Actual factory decoder preserves CODE128 barcode ${code}`, async () => {
    class RasterReader extends BrowserMultiFormatReader { decode(bitmap) { return super.decodeBitmap(bitmap); } }
    const reader = await modalModule({}, { browser: { BrowserMultiFormatReader: RasterReader } }).testReader();
    assert.equal(reader.read(rasterBarcode('CODE128', code)), code);
    assert.equal(reader.read(rasterBarcode('EAN13', '5901234123457')), null);
  });
}

function scanPad(t, overrides = {}, existing = {}) {
  const stored = new Map(Object.entries(existing)), temporary = new Map(), calls = [], saved = [], pendingChanges = [];
  const storage = map => ({ getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) });
  const local = storage(stored);
  const restore = globals({ localStorage: local, sessionStorage: storage(temporary), document: { activeElement: null }, navigator: { vibrate() {} }, window: {} });
  let mod, nextKey = 0;
  const props = {
    scope: 'pickup-test', cameraDialog: true, persistent: true, prominent: true,
    onRead: async (barcode, requestKey) => { calls.push({ barcode, requestKey }); return { ok: true }; },
    onSaved: result => saved.push(result), onPendingChange: value => pendingChanges.push(value), ...overrides,
  };
  const h = hooksHarness((hooks, current) => {
    mod ??= compile('scan-pad.tsx', name => {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'lucide-react' || name.startsWith('@/components/ui/')) return ui;
      if (name === '@/app/api/_base') return { isApiError: error => Number.isInteger(error?.status) };
      if (name === '@/app/api/warehouse.api') return { warehouseRequestKey: () => `camera-request-${++nextKey}` };
      if (name === './warehouse-shared') return { errorMessage: error => error.message ?? 'Request failed' };
      if (name === './factory-parts') return parts;
      if (name === './factory-barcode-camera') return { FactoryBarcodeCamera: 'FactoryBarcodeCamera' };
      throw Error(`Unexpected dependency ${name}`);
    });
    return mod.ScanPad(current);
  }, props);
  t.after(() => { h.unmount(); restore(); });
  return { h, stored, temporary, local, calls, saved, pendingChanges, camera: () => nodes(h.render(), node => node.type === 'FactoryBarcodeCamera')[0] };
}

test('Opt-in ScanPad uses the modal and keeps manual entry; default mode keeps its inline camera', t => {
  const p = scanPad(t);
  let tree = p.h.render();
  assert.equal(nodes(tree, node => node.type === 'video').length, 0);
  assert.equal(p.camera().props.label, 'Scan with camera');
  assert.equal(p.camera().props.prominent, true);
  assert.ok(nodes(tree, node => node.type === 'Input')[0]);
  assert.ok(nodes(tree, node => node.type === 'form')[0]);
  p.h.props.cameraDialog = undefined; p.h.props.prominent = false;
  tree = p.h.render();
  assert.equal(nodes(tree, node => node.type === 'FactoryBarcodeCamera').length, 0);
  assert.equal(nodes(tree, node => node.type === 'video').length, 1);
  assert.ok(button(tree, 'Start camera'));
});

test('One camera detection submits once, persists its key before sending and enables the next scan after success', async t => {
  const response = deferred(), calls = [];
  const p = scanPad(t, { onRead: (barcode, requestKey) => {
    assert.deepEqual(JSON.parse(p.stored.get('warehouse-reading:pickup-test')), { barcode, requestKey });
    calls.push({ barcode, requestKey }); return response.promise;
  } });
  const camera = p.camera();
  camera.props.onDetected(' 001029975-FRAME ');
  camera.props.onDetected('001029975-FRAME');
  assert.deepEqual(calls, [{ barcode: '001029975-FRAME', requestKey: 'camera-request-1' }]);
  assert.equal(p.camera().props.disabled, true);
  assert.equal(p.saved.length, 0);
  response.resolve({ saved: 1 }); await settle();
  assert.deepEqual(p.saved, [{ saved: 1 }]);
  assert.equal(p.stored.size, 0);
  assert.equal(p.temporary.size, 0);
  assert.equal(p.camera().props.disabled, false);
  assert.equal(p.camera().props.label, 'Scan next part');
  assert.equal(nodes(p.h.render(), node => node.type === 'Input')[0].props.value, '');
});

test('Unconfirmed camera result retries the original persisted barcode and key exactly once', async t => {
  const calls = [];
  const p = scanPad(t, { onRead: async (barcode, requestKey) => {
    calls.push({ barcode, requestKey });
    if (calls.length === 1) throw new Error('Connection lost');
    return { saved: 1 };
  } });
  p.camera().props.onDetected('1029975-DOOR'); await settle();
  const original = JSON.parse(p.stored.get('warehouse-reading:pickup-test'));
  assert.deepEqual(original, calls[0]);
  assert.equal(p.camera().props.disabled, true);
  p.camera().props.onDetected('1029975-FRAME'); await settle();
  assert.equal(calls.length, 1);
  const retry = button(p.h.render(), 'Retry same reading');
  assert.ok(retry); retry.props.onClick(); retry.props.onClick(); await settle();
  assert.deepEqual(calls, [original, original]);
  assert.equal(p.saved.length, 1);
  assert.equal(p.stored.size, 0);
  assert.equal(p.camera().props.disabled, false);
});

test('Recovered pending reading blocks camera and retries the key retained across a reload', async t => {
  const pending = { barcode: '001029975-FRAME', requestKey: 'retained-before-reload' };
  const p = scanPad(t, {}, { 'warehouse-reading:pickup-test': JSON.stringify(pending) });
  assert.equal(p.camera().props.disabled, true);
  assert.equal(p.calls.length, 0);
  assert.match(text(nodes(p.h.render(), node => node.props?.role === 'alert')[0]), /not been confirmed/i);
  button(p.h.render(), 'Retry same reading').props.onClick(); await settle();
  assert.deepEqual(p.calls, [pending]);
  assert.equal(p.stored.size, 0);
  assert.equal(p.saved.length, 1);
});

test('Persistent pickup sends nothing if its retry key cannot be stored', async t => {
  const p = scanPad(t);
  p.local.setItem = () => { throw new Error('Storage denied'); };
  p.camera().props.onDetected('1029975-DOOR'); await settle();
  assert.equal(p.calls.length, 0);
  assert.equal(p.saved.length, 0);
  assert.match(text(nodes(p.h.render(), node => node.props?.role === 'alert')[0]), /storage.*Nothing was sent/i);
  assert.equal(p.camera().props.disabled, false);
});

for (const flag of ['disabled', 'retryOnly']) {
  test(`ScanPad ${flag} prevents a modal reading from being sent`, async t => {
    const p = scanPad(t, { [flag]: true });
    assert.equal(p.camera().props.disabled, true);
    p.camera().props.onDetected('1029975-DOOR'); await settle();
    assert.equal(p.calls.length, 0);
    assert.equal(p.stored.size, 0);
  });
}

test('Ambiguous part choice disables camera until the physical part is selected', async t => {
  const calls = [];
  const p = scanPad(t, { onRead: async (barcode, requestKey) => {
    calls.push({ barcode, requestKey });
    if (calls.length === 1) throw { status: 400, data: { code: 'FACTORY_PART_TYPE_REQUIRED', types: ['DOOR', 'FRAME'] } };
    return { saved: 1 };
  } });
  p.camera().props.onDetected('I1029975'); await settle();
  assert.equal(p.camera().props.disabled, true);
  assert.equal(p.stored.size, 0);
  const choice = nodes(p.h.render(), node => node.props?.['aria-label'] === 'Choose the scanned part')[0];
  assert.ok(choice);
  button(choice, 'Frame').props.onClick(); await settle();
  assert.equal(calls.length, 2);
  assert.equal(calls[1].barcode, '1029975-FRAME');
  assert.notEqual(calls[1].requestKey, calls[0].requestKey);
  assert.equal(p.saved.length, 1);
  assert.equal(p.camera().props.disabled, false);
});
