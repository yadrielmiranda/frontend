/* Offline regression checks. No server or inventory writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '../src');
class ApiError extends Error {
  constructor(message, status, data) { super(message); this.status = status; this.data = data; }
}
const storage = new Map();
global.sessionStorage = global.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key),
};
global.document = { activeElement: null };
let sequence = 0;
function harness(onRead, persistent = false) {
  const states = [], refs = []; let si = 0, ri = 0;
  const hooks = {
    useState(initial) { const i = si++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useRef(initial) { const i = ri++; if (!(i in refs)) refs[i] = { current: initial }; return refs[i]; },
    useEffect() {},
  };
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const module = { exports: {} };
    function resolve(id) {
      if (id === 'react') return { ...React, ...hooks };
      if (id === 'react/jsx-runtime') return require(id);
      if (id === 'lucide-react' || id.startsWith('@/components/ui/')) return new Proxy({}, { get: (_, name) => name });
      if (id === '@/app/api/warehouse.api') return { warehouseRequestKey: () => `request-${++sequence}` };
      if (id === '@/app/api/_base') return { ApiError, isApiError: error => error instanceof ApiError };
      if (id === './warehouse-shared') return { errorMessage: error => error.message };
      const base = id.startsWith('@/') ? path.resolve(root, id.slice(2)) : id.startsWith('.') ? path.resolve(path.dirname(filename), id) : null;
      if (!base) return require(id);
      const found = ['.ts', '.tsx'].map(extension => base + extension).find(value => fs.existsSync(value));
      if (!found) throw new Error(`Unresolved ${id}`);
      return load(found);
    }
    new Function('require', 'module', 'exports', output)(resolve, module, module.exports);
    cache.set(filename, module.exports); return module.exports;
  }
  const { ScanPad } = load(path.resolve(root, 'app/warehouse/scan-pad.tsx'));
  const saved = [];
  return { saved, render() { si = 0; ri = 0; return ScanPad({ scope: 'test', persistent, onRead, onSaved: result => saved.push(result) }); } };
}
function nodes(element, predicate, found = []) {
  if (Array.isArray(element)) { element.forEach(value => nodes(value, predicate, found)); return found; }
  if (!element || typeof element !== 'object') return found;
  if (predicate(element)) found.push(element);
  nodes(element.props?.children, predicate, found);
  return found;
}
const text = element => typeof element === 'string' || typeof element === 'number' ? String(element) : Array.isArray(element) ? element.map(text).join('') : element?.props ? text(element.props.children) : '';
const button = (h, name) => nodes(h.render(), item => item.type === 'Button' && text(item) === name)[0];
const settle = () => new Promise(resolve => setImmediate(resolve));
async function scan(h, code) {
  nodes(h.render(), item => item.type === 'Input')[0].props.onChange({ target: { value: code } });
  nodes(h.render(), item => item.type === 'form')[0].props.onSubmit({ preventDefault() {} });
  await settle();
}
const tests = [], test = (name, run) => tests.push({ name, run });
test('new suffixed labels pass through unchanged', async () => {
  const calls = [], h = harness(async (barcode, requestKey) => { calls.push({ barcode, requestKey }); return { ok: true }; });
  await scan(h, '12345-FRAME');
  assert.equal(calls[0].barcode, '12345-FRAME');
  assert.equal(h.saved.length, 1);
  assert.equal(button(h, 'Door panel'), undefined);
});
test('old door label prompts for the physical type before retrying', async () => {
  const calls = [], h = harness(async (barcode, requestKey) => {
    calls.push({ barcode, requestKey });
    if (barcode === 'I12345') throw new ApiError('Choose the type', 400, { code: 'FACTORY_PART_TYPE_REQUIRED', types: ['DOOR', 'FRAME'] });
    return { ok: true };
  });
  await scan(h, 'I12345');
  assert.equal(h.saved.length, 0);
  assert.ok(button(h, 'Door panel')); assert.ok(button(h, 'Frame'));
  assert.equal(storage.size, 0);
  button(h, 'Frame').props.onClick();
  await settle();
  assert.equal(calls[1].barcode, '12345-FRAME');
  assert.notEqual(calls[1].requestKey, calls[0].requestKey);
  assert.equal(h.saved.length, 1);
});
test('uncertain typed scan preserves its exact barcode and retry key', async () => {
  const calls = [], h = harness(async (barcode, requestKey) => {
    calls.push({ barcode, requestKey });
    if (calls.length === 1) throw new Error('Connection lost');
    return { ok: true };
  }, true);
  await scan(h, '12345-DOOR');
  assert.equal(h.saved.length, 0);
  assert.equal(button(h, 'Frame'), undefined);
  assert.equal(storage.size, 1);
  button(h, 'Retry same reading').props.onClick();
  await settle();
  assert.deepEqual(calls[1], calls[0]);
  assert.equal(h.saved.length, 1);
  assert.equal(storage.size, 0);
});
(async () => {
  for (const { name, run } of tests) { storage.clear(); await run(); process.stdout.write(`PASS ${name}\n`); }
  process.stdout.write(`${tests.length} factory barcode scan checks passed.\n`);
})().catch(error => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
