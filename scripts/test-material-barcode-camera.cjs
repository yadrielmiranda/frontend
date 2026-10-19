// Run: node --test scripts/test-material-barcode-camera.cjs
// Exercises actual session ownership, modal events, and ZXing against rasterized retail barcodes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const zxing = require('@zxing/library');
const { BrowserMultiFormatReader } = require('@zxing/browser');
const JsBarcode = require('jsbarcode');

const dir = path.resolve(__dirname, '../src/app/warehouse/materials');
function compile(filename, requireDependency, extra = '') {
  const source = fs.readFileSync(path.join(dir, filename), 'utf8');
  const compiled = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled + extra)(requireDependency, exports);
  return exports;
}
const session = compile('material-barcode-camera-session.ts', () => { throw Error('Unexpected dependency'); });
const settle = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}
function events() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(name, callback) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(callback); },
    removeEventListener(name, callback) { listeners.get(name)?.delete(callback); },
    emit(name) { for (const fn of [...(listeners.get(name) ?? [])]) fn(); },
    get listenerCount() { return [...listeners.values()].reduce((sum, group) => sum + group.size, 0); },
  };
}
function media() {
  const tracks = Array.from({ length: 2 }, () => ({ ...events(), stopped: 0, stop() { this.stopped++; } }));
  return { tracks, getTracks: () => tracks };
}
function videoElement() {
  return { ...events(), srcObject: null, readyState: 2, videoWidth: 1280, videoHeight: 720, pauses: 0, play: async () => {}, pause() { this.pauses++; } };
}
function clock(t) {
  const oldSet = global.setTimeout, oldClear = global.clearTimeout;
  let id = 0;
  const timers = new Map();
  global.setTimeout = (callback, delay) => { timers.set(++id, { callback, delay }); return id; };
  global.clearTimeout = key => timers.delete(key);
  t.after(() => { global.setTimeout = oldSet; global.clearTimeout = oldClear; });
  return {
    timers,
    run(delay) {
      const next = [...timers.entries()].find(([, item]) => item.delay === delay);
      assert.ok(next, `Expected a timer with delay ${delay}`);
      timers.delete(next[0]); next[1].callback();
    },
  };
}
function camera(t, overrides = {}) {
  const time = clock(t), stream = media(), video = videoElement();
  const reads = [], detected = [], errors = [], constraints = [], ready = [];
  const options = {
    video,
    loadReader: async () => ({ read() { return reads.shift() ?? null; } }),
    getUserMedia: async value => { constraints.push(value); return stream; },
    onReady: () => ready.push(true), onDetected: code => detected.push(code), onError: error => errors.push(error),
    ...overrides,
  };
  const stop = session.startMaterialCamera(options);
  t.after(stop);
  return { time, stream, video, reads, detected, errors, constraints, ready, stop, options };
}
function stopped(h) {
  assert.ok(h.stream.tracks.every(track => track.stopped === 1));
  assert.ok(h.stream.tracks.every(track => track.listenerCount === 0));
  assert.equal(h.video.srcObject, null);
  assert.equal(h.video.listenerCount, 0);
  assert.equal(h.time.timers.size, 0);
}

test('One result preserves leading zeros, stops every track before delivery and cannot repeat', async t => {
  const h = camera(t, { onDetected(code) { stopped(h); h.detected.push(code); } });
  h.reads.push('001234567890');
  await settle();
  assert.deepEqual(h.constraints[0], { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
  assert.equal(h.ready.length, 1);
  h.time.run(0);
  assert.deepEqual(h.detected, ['001234567890']);
  h.stop(); h.stop();
  stopped(h);
});

test('Unreadable frames keep scanning; close cancels the scheduled next attempt', async t => {
  const h = camera(t);
  await settle(); h.time.run(0); h.time.run(200);
  assert.equal(h.detected.length, 0);
  h.stop(); stopped(h);
});

test('Closing while decoder imports prevents any camera permission request', async t => {
  const importing = deferred();
  const h = camera(t, { loadReader: () => importing.promise });
  h.stop(); importing.resolve({ read: () => '123' }); await settle();
  assert.equal(h.constraints.length, 0);
  assert.equal(h.detected.length, 0);
  assert.equal(h.time.timers.size, 0);
});

test('Closing during permission prompt stops a later stream without touching the video', async t => {
  const permission = deferred();
  const h = camera(t, { getUserMedia: () => permission.promise });
  await settle(); h.stop(); permission.resolve(h.stream); await settle();
  stopped(h);
  assert.equal(h.video.pauses, 0);
  assert.equal(h.detected.length, 0);
});

test('Closing during pending playback cancels listeners and tracks without waiting for play', async t => {
  const play = deferred(), video = videoElement();
  video.play = () => play.promise; video.readyState = 0;
  const h = camera(t, { video });
  await settle(); assert.ok(h.time.timers.size);
  h.stop(); stopped(h);
  play.resolve(); await settle();
  assert.equal(h.detected.length, 0); assert.equal(h.errors.length, 0);
});

test('Playback must have dimensions before starting the decoder', async t => {
  const video = videoElement(); video.readyState = 0; video.videoWidth = 0;
  const h = camera(t, { video }); await settle();
  assert.equal(h.ready.length, 0);
  video.readyState = 2; video.videoWidth = 1280; video.emit('canplay'); await settle();
  assert.equal(h.ready.length, 1); assert.equal(video.listenerCount, 0);
  h.stop(); stopped(h);
});

test('Hung video startup expires and releases the stream', async t => {
  const video = videoElement(); video.readyState = 0;
  const h = camera(t, { video }); await settle(); h.time.run(15000); await settle();
  stopped(h); assert.equal(h.errors[0].name, 'CameraStartupTimeout');
});

test('Camera permission failure is actionable and a new session can start', async t => {
  const h = camera(t, { getUserMedia: async () => { throw { name: 'NotAllowedError' }; } });
  await settle(); assert.match(session.materialCameraErrorMessage(h.errors[0]), /denied.*manually/i);
  assert.equal(h.time.timers.size, 0);
  const next = session.startMaterialCamera({ ...h.options, getUserMedia: async () => h.stream });
  t.after(next); await settle(); h.time.run(0); next(); stopped(h);
});

test('Rejecting an obsolete permission prompt after close does not show an error', async t => {
  const permission = deferred();
  const h = camera(t, { getUserMedia: () => permission.promise });
  await settle(); h.stop(); permission.reject({ name: 'NotAllowedError' }); await settle();
  assert.equal(h.errors.length, 0);
});

test('An older pending camera cannot detach a new camera after reopen', async t => {
  const permission = deferred();
  const h = camera(t, { getUserMedia: () => permission.promise });
  await settle(); h.stop();
  const newer = media();
  const stopNew = session.startMaterialCamera({ ...h.options, getUserMedia: async () => newer });
  t.after(stopNew); await settle();
  assert.equal(h.video.srcObject, newer);
  permission.resolve(h.stream); await settle();
  assert.ok(h.stream.tracks.every(track => track.stopped === 1));
  assert.equal(h.video.srcObject, newer);
  assert.ok(newer.tracks.every(track => track.stopped === 0));
  stopNew(); assert.ok(newer.tracks.every(track => track.stopped === 1));
});

test('Unexpected decoder error and disconnected hardware release all resources', async t => {
  const h = camera(t, { loadReader: async () => ({ read() { throw new Error('Canvas unavailable'); } }) });
  await settle(); h.time.run(0); stopped(h); assert.equal(h.errors.length, 1);
  const stream = media();
  const stop = session.startMaterialCamera({ ...h.options, getUserMedia: async () => stream });
  await settle(); stream.tracks[0].emit('ended');
  assert.ok(stream.tracks.every(track => track.stopped === 1));
  assert.equal(h.errors[1].name, 'CameraInterrupted'); stop();
});

for (const [name, expected] of [['NotFoundError', /No camera/], ['NotReadableError', /another app/], ['SecurityError', /denied/]]) {
  test(`${name} explains recovery without hiding manual entry`, () => {
    assert.match(session.materialCameraErrorMessage({ name }), expected);
    assert.match(session.materialCameraErrorMessage({ name }), /manually/);
  });
}

const jsx = (type, props) => ({ type, props });
const nodes = (node, match) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(item => nodes(item, match)) : [...(match(node) ? [node] : []), ...nodes(node.props?.children, match)];
function hooksHarness(component, props, beforeEffects = () => {}) {
  const states = [], refs = [], effects = [];
  let si, ri, ei, dirty;
  const hooks = {
    useState(initial) { const i = si++; if (!(i in states)) states[i] = initial; return [states[i], value => { const next = typeof value === 'function' ? value(states[i]) : value; if (!Object.is(next, states[i])) { states[i] = next; dirty = true; } }]; },
    useRef(initial) { return refs[ri++] ??= { current: initial }; },
    useEffect(callback, deps) { const i = ei++, old = effects[i]; if (!old || deps.some((v, ix) => !Object.is(v, old.deps[ix]))) effects[i] = { callback, deps, cleanup: old?.cleanup, pending: true }; },
  };
  return {
    hooks, props,
    render() {
      for (let pass = 0; pass < 10; pass++) {
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
function modalModule(hooks, overrides = {}) {
  const ui = new Proxy({}, { get: (_, key) => key });
  return compile('material-barcode-camera.tsx', name => {
    if (name === 'react') return hooks;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'lucide-react' || name.startsWith('@/components/ui/')) return ui;
    if (name === './material-barcode-camera-session') return overrides.session ?? session;
    if (name === '@zxing/library') return zxing;
    if (name === '@zxing/browser') return overrides.browser ?? { BrowserMultiFormatReader };
    throw Error(`Unexpected dependency ${name}`);
  }, '\nexports.testPreview = MaterialCameraPreview; exports.testReader = loadMaterialBarcodeReader;');
}

test('Camera trigger cannot submit a form, uses custom label and stays closed when disabled', () => {
  let mod;
  const h = hooksHarness((hooks, props) => { mod ??= modalModule(hooks); return mod.MaterialBarcodeCamera(props); }, { label: 'Scan package', disabled: false, onDetected() {} });
  let tree = h.render();
  const trigger = nodes(tree, node => node.type === 'Button')[0];
  assert.equal(trigger.props.type, 'button');
  assert.equal(trigger.props.children[1], 'Scan package');
  tree.props.onOpenChange(true); tree = h.render(); assert.equal(tree.props.open, true);
  h.props.disabled = true; tree = h.render(); assert.equal(tree.props.open, false);
  assert.equal(nodes(tree, node => node.type === mod.testPreview).length, 0);
  h.props.disabled = false; assert.equal(h.render().props.open, false);
  h.unmount();
});

test('Closing the modal stops immediately and rejects callbacks before unmount effects run', () => {
  let mod, stops = 0;
  const detected = [];
  const h = hooksHarness((hooks, props) => { mod ??= modalModule(hooks); return mod.MaterialBarcodeCamera(props); }, { onDetected: code => detected.push(code) });
  let tree = h.render(); tree.props.onOpenChange(true); tree = h.render();
  let preview = nodes(tree, node => node.type === mod.testPreview)[0];
  preview.props.stopCapture.current = () => stops++;
  tree.props.onOpenChange(false);
  assert.equal(stops, 1);
  preview.props.onDetected('000OLD');
  assert.deepEqual(detected, []);
  tree = h.render(); tree.props.onOpenChange(true); tree = h.render();
  preview = nodes(tree, node => node.type === mod.testPreview)[0];
  preview.props.onDetected('000NEW'); preview.props.onDetected('000NEW');
  assert.deepEqual(detected, ['000NEW']);
  assert.equal(h.render().props.open, false);
  h.unmount();
});

function preview(t, { secure = true, supported = true } = {}) {
  const descriptors = ['window', 'document', 'navigator'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  const win = { ...events(), isSecureContext: secure }, doc = { ...events(), hidden: false };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: win });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: supported ? { getUserMedia() {} } : undefined } });
  const sessions = [], codes = [], closed = [];
  let mod;
  const h = hooksHarness((hooks, props) => {
    mod ??= modalModule(hooks, { session: { ...session, startMaterialCamera(options) { const item = { options, stops: 0 }; sessions.push(item); return () => item.stops++; } } });
    return mod.testPreview(props);
  }, { onDetected: code => codes.push(code), onClose: () => closed.push(true), stopCapture: { current: () => {} } }, tree => {
    const video = nodes(tree, node => node.type === 'video')[0]; if (!video.props.ref.current) video.props.ref.current = videoElement();
  });
  t.after(() => { h.unmount(); descriptors.forEach(([key, desc]) => desc ? Object.defineProperty(globalThis, key, desc) : delete globalThis[key]); });
  return { h, sessions, codes, closed, win, doc };
}

for (const kind of ['visibilitychange', 'pagehide']) {
  test(`${kind} stops capture immediately and closes the camera`, t => {
    const p = preview(t); p.h.render();
    if (kind === 'visibilitychange') { p.doc.hidden = true; p.doc.emit(kind); } else p.win.emit(kind);
    assert.equal(p.sessions[0].stops, 1); assert.equal(p.closed.length, 1);
    p.h.unmount(); assert.equal(p.doc.listenerCount, 0); assert.equal(p.win.listenerCount, 0);
  });
}

test('Unmount removes page listeners and releases the session', t => {
  const p = preview(t); p.h.render(); p.h.unmount();
  assert.equal(p.sessions[0].stops, 1); assert.equal(p.doc.listenerCount, 0); assert.equal(p.win.listenerCount, 0);
});

for (const config of [{ secure: false }, { supported: false }]) {
  test(`${JSON.stringify(config)} shows manual fallback without requesting camera`, t => {
    const p = preview(t, config); const tree = p.h.render();
    assert.equal(p.sessions.length, 0);
    const error = nodes(tree, node => node.props?.role === 'alert')[0];
    assert.match(error.props.children, /HTTPS.*manually.*barcode reader/);
  });
}

test('Try again cleans the failed session and starts a new one; every action is form-safe', t => {
  const p = preview(t); p.h.render(); p.sessions[0].options.onError({ name: 'NotAllowedError' });
  let tree = p.h.render();
  const buttons = nodes(tree, node => node.type === 'Button');
  assert.ok(buttons.every(button => button.props.type === 'button'));
  buttons.find(button => button.props.children === 'Try again').props.onClick(); p.h.render();
  assert.equal(p.sessions.length, 2); assert.equal(p.sessions[0].stops, 1);
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

for (const [format, code] of [
  ['UPC', '035777434642'], ['EAN13', '5901234123457'], ['EAN8', '96385074'],
  ['ITF14', '10035777434649'], ['CODE128', 'MAT-4E618BD0A8CD49AC9C5F'], ['CODE39', '0012-BOX'],
]) {
  test(`Actual material decoder reads ${format} without losing its code: ${code}`, async () => {
    class RasterReader extends BrowserMultiFormatReader { decode(bitmap) { return super.decodeBitmap(bitmap); } }
    const reader = await modalModule({}, { browser: { BrowserMultiFormatReader: RasterReader } }).testReader();
    assert.equal(reader.read(rasterBarcode(format, code)), code);
  });
}

test('Unsupported experimental UPC-E does not get mistaken for a different material', async () => {
  class RasterReader extends BrowserMultiFormatReader { decode(bitmap) { return super.decodeBitmap(bitmap); } }
  const reader = await modalModule({}, { browser: { BrowserMultiFormatReader: RasterReader } }).testReader();
  assert.equal(reader.read(rasterBarcode('UPCE', '01234565')), null);
});

test('Material decoder does not accept informational QR codes', async () => {
  class RasterReader extends BrowserMultiFormatReader { decode(bitmap) { return super.decodeBitmap(bitmap); } }
  const reader = await modalModule({}, { browser: { BrowserMultiFormatReader: RasterReader } }).testReader();
  const matrix = new zxing.QRCodeWriter().encode('https://example.com/learn-more', zxing.BarcodeFormat.QR_CODE, 250, 250, new Map());
  const pixels = new Uint8ClampedArray(250 * 250);
  for (let y = 0; y < 250; y++) for (let x = 0; x < 250; x++) pixels[y * 250 + x] = matrix.get(x, y) ? 0 : 255;
  assert.equal(reader.read(new zxing.BinaryBitmap(new zxing.HybridBinarizer(new zxing.RGBLuminanceSource(pixels, 250, 250)))), null);
});
