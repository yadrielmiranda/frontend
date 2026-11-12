// Exercise the shared phone field with real normalization and controlled form values.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const jsx = (type, props) => ({ type, props });
const ui = new Proxy({}, { get: (_, key) => key });
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => {
    if (id in mocks) return mocks[id];
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id.startsWith('@/components/ui/') || id === 'lucide-react') return ui;
    if (id === '@/lib/utils') return { cn: (...parts) => parts.filter(Boolean).join(' ') };
    return require(id);
  }, module, module.exports);
  return module.exports;
}
const phones = load('lib/validators-phone.ts');
for (const [raw, country, expected] of [
  ['(305) 555-1234', 'US', '+13055551234'],
  ['020 7946 0018', 'GB', '+442079460018'],
  ['+53 51234567', 'US', '+5351234567'],
  ['+52 55 1234 5678', 'US', '+525512345678'],
  ['+34 612 345 678', 'US', '+34612345678'],
  ['+1 416 555 1234', 'US', '+14165551234'],
]) assert.equal(phones.normalizePhoneToE164(raw, country), expected, raw);
for (const invalid of ['', '123', 'Call +13055551234', '+13055551234 ext 5', '+13055551234#5', '+99912345678', '1'.repeat(81), 13055551234, null]) {
  assert.equal(phones.normalizePhoneToE164(invalid), null, String(invalid));
}
assert.equal(phones.isSmsPhoneSupported('+34612345678'), false);
assert.equal(phones.isSmsPhoneSupported('+13055551234'), true);
assert.equal(phones.isSmsPhoneSupported('+14165551234'), true);

function all(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => all(child, predicate));
  if (!node || typeof node !== 'object') return [];
  return [...(predicate(node) ? [node] : []), ...all(node.props?.children, predicate)];
}
function fixture(initial = '') {
  const states = [], refs = [], deps = [];
  let si, ri, ei, effects = [], changed, tree;
  const props = { value: initial, onChange(value) { props.value = value; } };
  const hooks = {
    forwardRef: fn => fn,
    useState(initialValue) { const i = si++; if (!(i in states)) states[i] = typeof initialValue === 'function' ? initialValue() : initialValue;
      return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; changed = true; }]; },
    useRef(value) { return refs[ri++] ??= { current: value }; },
    useEffect(fn, values) { const i = ei++; if (!deps[i] || values.some((v, j) => v !== deps[i][j])) { deps[i] = values; effects.push(fn); } },
  };
  const { InternationalPhoneInput } = load('components/international-phone-input.tsx', { react: hooks, '@/lib/validators-phone': phones });
  function render() { do { changed = false; si = ri = ei = 0; tree = InternationalPhoneInput(props, null); const current = effects; effects = []; current.forEach(fn => fn()); } while (changed); return tree; }
  const input = () => all(tree, node => node.type === 'Input')[0];
  const country = () => all(tree, node => node.type === 'Button')[0].props['aria-label'];
  render();
  return { props, render, input, country,
    type(value) { input().props.onChange({ target: { value } }); render(); },
    select(code) { all(tree, node => node.type === 'CommandItem' && node.props.value.includes(` ${code} +`))[0].props.onSelect(); render(); },
    blur() { input().props.onBlur({ target: { value: input().props.value } }); render(); },
  };
}
const f = fixture();
assert.match(f.country(), /United States/);
f.select('GB');
assert.equal(f.props.value, '');
assert.match(f.country(), /United Kingdom/);
f.type('020 7946 0018');
assert.equal(f.props.value, '+442079460018');
assert.equal(f.input().props.value, '020 7946 0018');
f.blur();
assert.equal(f.props.value, '+442079460018');
f.type('+52 55 1234 5678');
assert.match(f.country(), /Mexico/);
f.blur();
assert.equal(f.props.value, '+525512345678');
f.props.value = '+34612345678'; f.render();
assert.match(f.country(), /Spain/);
assert.equal(phones.normalizePhoneToE164(f.input().props.value, 'ES'), '+34612345678');
f.type('invalid');
assert.ok(f.props.value.length > 0);
assert.equal(phones.normalizePhoneToE164(f.props.value), null);
f.props.value = ''; f.render();
assert.equal(f.input().props.value, '');
assert.match(f.country(), /United States/);
const canadian = fixture('+14165551234');
assert.match(canadian.country(), /Canada/);
canadian.type('416 555 1234');
assert.equal(canadian.props.value, '+14165551234');
console.log('International phone normalization and controlled input checks passed.');
