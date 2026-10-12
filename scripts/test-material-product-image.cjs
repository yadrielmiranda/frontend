/* Protected-thumbnail regressions. All session and image requests are simulated. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const tests = [];
const test = (name, run) => tests.push({ name, run });
const tick = () => new Promise(resolve => setImmediate(resolve));
const account = { id: 8 };
const photo = `/api/materials/images/${'a'.repeat(64)}.webp`;
function setup(revalidate) {
  let active;
  const auth = { user: account, revalidate };
  const hooks = { ...React,
    useState(initial) {
      const instance = active, index = instance.stateIndex++;
      if (!(index in instance.states)) instance.states[index] = typeof initial === 'function' ? initial() : initial;
      return [instance.states[index], value => { instance.writes++; instance.states[index] = typeof value === 'function' ? value(instance.states[index]) : value; }];
    },
    useRef(initial) { const instance = active, index = instance.refIndex++; if (!(index in instance.refs)) instance.refs[index] = { current: initial }; return instance.refs[index]; },
    useEffect(effect) { const instance = active, index = instance.effectIndex++; if (!(index in instance.cleanups)) instance.cleanups[index] = effect(); },
  };
  const file = path.resolve(__dirname, '../src/components/material-product-image.tsx');
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  const Image = () => null;
  new Function('require', 'module', 'exports', output)(id => {
    if (id === 'react') return hooks;
    if (id === 'react/jsx-runtime') return require(id);
    if (id === 'next/image') return { __esModule: true, default: Image };
    if (id === 'lucide-react') return { Package: () => null };
    if (id === '@/app/api/_base') return { API_URL: 'http://api.example.test' };
    if (id === '@/lib/utils') return { cn: (...parts) => parts.filter(Boolean).join(' ') };
    if (id === '@/contexts/AuthContext') return { useAuth: () => auth };
    throw new Error(id);
  }, module, module.exports);
  return { auth, make(props = { imageUrl: photo, name: '850A' }) {
    const instance = { states: [], refs: [], cleanups: [], writes: 0 };
    return { props, instance, render() { active = instance; instance.stateIndex = 0; instance.refIndex = 0; instance.effectIndex = 0; return module.exports.MaterialProductImage(props); }, unmount() { instance.cleanups.forEach(cleanup => cleanup?.()); } };
  } };
}
const image = tree => tree.props.children.type?.name === 'Image' ? tree.props.children : null;

test('24 failed thumbnails share one session recovery and retry their image once', async () => {
  let calls = 0, resolve;
  const s = setup(() => { calls++; return new Promise(done => { resolve = done; }); });
  const images = Array.from({ length: 24 }, () => s.make());
  for (const item of images) image(item.render()).props.onError();
  await tick(); assert.equal(calls, 1);
  resolve(account); await tick();
  for (const item of images) assert.match(image(item.render()).props.src, /\?retry=1$/);
  for (const item of images) image(item.render()).props.onError();
  await tick();
  for (const item of images) assert.equal(image(item.render()), null);
  assert.equal(calls, 1);
});

test('failed session recovery shows a placeholder without an image retry loop', async () => {
  let calls = 0;
  const s = setup(async () => { calls++; throw new Error('Session unavailable'); });
  const item = s.make();
  const first = image(item.render()); first.props.onError(); first.props.onError();
  await tick();
  assert.equal(image(item.render()), null);
  assert.equal(calls, 1);
});

test('late session responses do not update unmounted or replaced image attempts', async () => {
  let resolve;
  const s = setup(() => new Promise(done => { resolve = done; }));
  const removed = s.make(), replaced = s.make();
  image(removed.render()).props.onError(); image(replaced.render()).props.onError();
  await tick();
  removed.unmount();
  replaced.props.imageUrl = `/api/materials/images/${'b'.repeat(64)}.webp`;
  replaced.render();
  resolve(account); await tick();
  assert.equal(removed.instance.writes, 0);
  assert.equal(replaced.instance.writes, 0);
  assert.equal(image(replaced.render()).props.src.endsWith('?retry=1'), false);
});

test('image recovery never applies a response from a changed user account', async () => {
  let resolve;
  const s = setup(() => new Promise(done => { resolve = done; }));
  const item = s.make();
  image(item.render()).props.onError(); await tick();
  s.auth.user = { id: 9 }; item.render(); resolve(account); await tick();
  assert.equal(item.instance.writes, 0);
});

(async () => {
  for (const [index, entry] of tests.entries()) { await entry.run(); process.stdout.write(`ok ${index + 1} - ${entry.name}\n`); }
  process.stdout.write(`${tests.length} protected-thumbnail checks passed.\n`);
})().catch(error => { console.error(error); process.exitCode = 1; });
