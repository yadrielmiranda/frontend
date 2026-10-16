// Functional catalog regressions with real component state and simulated UI/API boundaries.
// Run: node scripts/test-installation-services.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const jsx = (type, props) => ({ type, props });
const ui = new Proxy({}, { get: (_, name) => name });
const tests = [];
const test = (name, run) => tests.push({ name, run });
const event = () => ({ preventDefault() {}, stopPropagation() {}, currentTarget: { focus() {} } });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const closed = node => ['Dialog', 'AlertDialog'].includes(node?.type) && node.props.open === false;
const all = (node, predicate) => !node || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(child => all(child, predicate))
  : [...(predicate(node) ? [node] : []), ...(closed(node) ? [] : all(node.props?.children, predicate))];
const text = node => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object'
  ? String(node) : Array.isArray(node) ? node.map(text).join('') : closed(node) ? '' : text(node.props?.children);

function service(id, overrides = {}) {
  return { id, name: `Service ${String(id).padStart(3, '0')}`, description: id === 37 ? 'Special hurricane anchors' : 'General installation work',
    billingUnit: ['UNIT', 'PANEL', 'SQFT', 'SQFT_RECTANGULAR', 'LINEAR_FOOT'][(id - 1) % 5], ruleMetric: 'NONE',
    baseRate: '100.25', minimumCharge: '500', estimatedMinutes: '12.5', sortOrder: id,
    availableForRequest: id % 2 === 0, availableForField: id % 3 === 0, isActive: id % 4 !== 0,
    _count: { sysConfs: id % 7 === 0 ? 3 : 0, lines: 0 }, rules: [], ...overrides };
}
const catalog = () => Array.from({ length: 57 }, (_, index) => service(index + 1));
const ranged = () => service(3, { name: 'Opening installation', billingUnit: 'UNIT', ruleMetric: 'WIDTH', isActive: false,
  rules: [
    { id: 32, serviceId: 3, minValue: '48', minInclusive: false, maxValue: null, maxInclusive: false, rate: '150.75', estimatedMinutes: '0', sortOrder: 1, isActive: false },
    { id: 31, serviceId: 3, minValue: null, minInclusive: true, maxValue: null, maxInclusive: false, rate: '100.25', estimatedMinutes: null, sortOrder: 0, isActive: true },
  ] });

function fixture(initialServices = catalog(), canEdit = true, implementations = {}) {
  const states = [], refs = [], memos = [], effects = [], requests = [], errors = [], successes = [];
  let stateIndex = 0, refIndex = 0, memoIndex = 0, effectIndex = 0, pendingEffects = [], dirty = false;
  let props = { initialServices, canEdit };
  const hooks = {
    useState(initial) { const slot = stateIndex++; if (!(slot in states)) states[slot] = typeof initial === 'function' ? initial() : initial;
      return [states[slot], next => { const value = typeof next === 'function' ? next(states[slot]) : next;
        if (!Object.is(value, states[slot])) { states[slot] = value; dirty = true; } }]; },
    useRef(initial) { return refs[refIndex++] ??= { current: initial }; },
    useMemo(fn, deps) { const slot = memoIndex++, previous = memos[slot];
      if (!previous || deps.some((value, index) => !Object.is(value, previous.deps[index]))) memos[slot] = { deps, value: fn() };
      return memos[slot].value; },
    useCallback(fn, deps) { return hooks.useMemo(fn, deps); },
    useEffect(fn, deps) { const slot = effectIndex++, previous = effects[slot];
      if (!previous || deps.some((value, index) => !Object.is(value, previous.deps[index]))) {
        previous?.cleanup?.(); effects[slot] = { deps }; pendingEffects.push(() => { effects[slot].cleanup = fn(); });
      } },
  };
  const api = Object.fromEntries(['createInstallationService', 'updateInstallationService', 'deleteInstallationService'].map(name => [name, async (...args) => {
    requests.push([name, ...structuredClone(args)]);
    if (implementations[name]) return implementations[name](...args);
    if (name === 'deleteInstallationService') return { deleted: true };
    const id = name === 'createInstallationService' ? 1000 : args[0];
    const payload = args.at(-1);
    return { ...(initialServices.find(item => item.id === id) ?? service(id)), ...payload, id,
      rules: payload.rules.map((rule, index) => ({ ...rule, id: rule.id ?? 10000 + index, serviceId: id })) };
  }]));
  const filename = path.resolve(__dirname, '../src/app/settings/(write)/installation-services/installation-services-client.tsx');
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exported = {};
  new Function('require', 'exports', output)(name => {
    if (name === 'react') return hooks;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'lucide-react' || name.startsWith('@/components/ui/')) return ui;
    if (name === '@/components/delete-conf-dialog') return { DeleteConfirmationDialog: 'DeleteConfirmationDialog' };
    if (name === '@/components/installations/installation-status-badge') return { InstallationStatusBadge: 'InstallationStatusBadge' };
    if (name === '@/app/api/installations.api') return api;
    if (name === 'sonner') return { toast: { success: value => successes.push(value), error: value => errors.push(value) } };
    throw new Error(`Unexpected dependency: ${name}`);
  }, exported);
  const render = () => {
    let tree, count = 0;
    do { assert.ok(count++ < 12, 'Effects settle'); stateIndex = refIndex = memoIndex = effectIndex = 0;
      pendingEffects = []; dirty = false; tree = exported.InstallationServicesClient(props); pendingEffects.forEach(effect => effect());
    } while (dirty);
    return tree;
  };
  const find = predicate => { const value = all(render(), predicate)[0]; assert.ok(value, 'Expected control exists'); return value; };
  const control = id => find(node => node.props?.id === id);
  const button = label => find(node => ['Button', 'AlertDialogAction', 'AlertDialogCancel', 'button'].includes(node.type) &&
    (node.props?.['aria-label'] === label || text(node).trim() === label));
  const select = (id, value) => {
    const native = all(render(), node => node.type === 'select' && node.props?.id === id)[0];
    if (native) return native.props.onChange({ target: { value } });
    return find(node => node.type === 'Select' && (node.props?.id === id || all(node, child => child.props?.id === id).length)).props.onValueChange(value);
  };
  const click = label => {
    const target = button(label);
    if (target.props.onClick) return target.props.onClick(event());
    assert.equal(target.type, 'AlertDialogCancel', 'Only Radix cancel has an implicit close action');
    return find(node => node.type === 'AlertDialog' && node.props.open &&
      all(node, child => child.type === 'AlertDialogCancel' && text(child).trim() === label).length).props.onOpenChange(false);
  };
  const input = (id, value) => control(id).props.onChange({ target: { value } });
  const dialog = () => find(node => node.type === 'Dialog');
  const editorOpen = () => dialog().props.open;
  const visibleNames = () => all(render(), node => node.type === 'Button' && /^(Edit|View) /.test(node.props?.['aria-label'] ?? ''))
    .map(node => node.props['aria-label'].replace(/^(Edit|View) /, ''));
  const submitHandler = () => {
    const save = button('Save service');
    return save.props.onClick ?? find(node => node.type === 'form').props.onSubmit;
  };
  return { render, find, control, button, select, click, input, dialog, editorOpen, visibleNames, requests, errors, successes,
    save() { return submitHandler()(event()); }, submitHandler,
    update(next) { props = { ...props, ...next }; render(); },
  };
}

test('57 services paginate without duplicates and changing page size returns to the first page', () => {
  const f = fixture(catalog().reverse());
  assert.equal(f.editorOpen(), false);
  assert.deepEqual(f.visibleNames(), catalog().slice(0, 20).map(item => item.name));
  assert.equal(f.button('Previous page').props.disabled, true);
  const seen = [...f.visibleNames()];
  f.click('Next page'); seen.push(...f.visibleNames());
  f.click('Next page'); seen.push(...f.visibleNames());
  assert.equal(f.button('Next page').props.disabled, true);
  assert.deepEqual(seen, catalog().map(item => item.name));
  f.select('installation-service-page-size', '50');
  assert.deepEqual(f.visibleNames(), catalog().slice(0, 50).map(item => item.name));
  f.click('Next page'); assert.equal(f.visibleNames().length, 7);
  f.select('installation-service-page-size', '10'); assert.equal(f.visibleNames()[0], 'Service 001');
  assert.equal(f.visibleNames().length, 10);
});

test('search covers names and descriptions beyond the current page and empty results recover', () => {
  const f = fixture(); f.click('Next page'); f.click('Next page');
  f.input('installation-service-search', '  SERVICE 057  ');
  assert.deepEqual(f.visibleNames(), ['Service 057']);
  f.input('installation-service-search', 'HuRrIcAnE');
  assert.deepEqual(f.visibleNames(), ['Service 037']);
  f.input('installation-service-search', 'no matching service');
  assert.deepEqual(f.visibleNames(), []);
  assert.equal(f.button('Next page').props.disabled, true);
  f.input('installation-service-search', '');
  assert.equal(f.visibleNames()[0], 'Service 001');
  assert.equal(f.requests.length, 0, 'Local browsing does not mutate or refetch the catalog');
});

test('status, usage and formula filters intersect and reset the current page', () => {
  const f = fixture(); f.click('Next page');
  f.select('installation-service-status-filter', 'inactive');
  assert.deepEqual(f.visibleNames(), catalog().filter(item => !item.isActive).map(item => item.name));
  f.select('installation-service-usage-filter', 'request');
  f.select('installation-service-formula-filter', 'SQFT');
  assert.deepEqual(f.visibleNames(), ['Service 008', 'Service 028', 'Service 048']);
  f.select('installation-service-status-filter', 'all');
  f.select('installation-service-formula-filter', 'all');
  f.select('installation-service-usage-filter', 'field');
  assert.deepEqual(f.visibleNames(), catalog().filter(item => item.availableForField).map(item => item.name));
  f.select('installation-service-usage-filter', 'automatic');
  assert.deepEqual(f.visibleNames(), catalog().filter(item => item._count.sysConfs > 0).map(item => item.name));
});

test('editing is isolated until save; clean cancel closes and dirty cancel requires explicit discard', () => {
  const original = ranged(), before = structuredClone(original), f = fixture([original]);
  f.click('Edit Opening installation'); f.click('Cancel'); assert.equal(f.editorOpen(), false);
  f.click('Edit Opening installation');
  f.input('installation-service-name', 'Uncommitted name');
  f.input('installation-rule-rate-0', '777');
  f.click('Cancel');
  assert.equal(f.editorOpen(), true);
  f.click('Keep editing');
  assert.equal(f.control('installation-service-name').props.value, 'Uncommitted name');
  f.dialog().props.onOpenChange(false);
  f.click('Discard changes'); assert.equal(f.editorOpen(), false);
  assert.deepEqual(f.visibleNames(), ['Opening installation']);
  f.click('Edit Opening installation');
  assert.equal(f.control('installation-service-name').props.value, 'Opening installation');
  assert.equal(f.control('installation-rule-rate-0').props.value, '100.25');
  assert.deepEqual(original, before);
  assert.equal(f.requests.length, 0);
});

test('saving existing ranges retains identities, activation and the distinction between inherited and zero time', async () => {
  const original = ranged(), f = fixture([original]);
  f.click('Edit Opening installation'); f.input('installation-service-description', '  Updated description  ');
  await f.save();
  assert.equal(f.editorOpen(), false);
  const [method, id, payload] = f.requests[0];
  assert.equal(method, 'updateInstallationService'); assert.equal(id, original.id);
  assert.equal(payload.description, 'Updated description'); assert.equal(payload.isActive, false);
  assert.equal(payload.baseRate, 100.25); assert.equal(payload.minimumCharge, 500); assert.equal(payload.estimatedMinutes, 12.5);
  assert.deepEqual(payload.rules.map(rule => [rule.id, rule.rate, rule.estimatedMinutes, rule.isActive]), [[31, 100.25, null, true], [32, 150.75, 0, false]]);
  assert.deepEqual(payload.rules.map(rule => [rule.minValue, rule.minInclusive, rule.maxValue, rule.maxInclusive]), [[null, true, null, false], [48, false, null, false]]);
  f.click('Edit Opening installation'); assert.equal(f.control('installation-service-description').props.value, 'Updated description');
});

test('formula changes reset only time units while temporarily disabling ranges preserves their identity', async () => {
  const f = fixture([ranged()]); f.click('Edit Opening installation');
  f.select('installation-service-formula', 'PANEL');
  assert.equal(f.control('installation-service-time').props.value, '0');
  assert.equal(f.control('installation-rule-time-0').props.value, '');
  assert.equal(f.control('installation-rule-time-1').props.value, '');
  assert.equal(f.control('installation-service-base-rate').props.value, '100.25');
  assert.equal(f.control('installation-service-minimum').props.value, '500');
  f.select('installation-service-metric', 'NONE');
  f.select('installation-service-metric', 'WIDTH');
  assert.equal(f.control('installation-rule-rate-1').props.value, '150.75');
  f.select('installation-service-metric', 'NONE'); await f.save();
  const payload = f.requests[0][2];
  assert.equal(payload.billingUnit, 'PANEL'); assert.equal(payload.estimatedMinutes, 0);
  assert.deepEqual(payload.rules.map(rule => [rule.id, rule.rate, rule.estimatedMinutes, rule.isActive]), [[31, 100.25, null, false], [32, 150.75, null, false]]);
});

test('adding a range never borrows another rule identity', async () => {
  const original = ranged(); original.rules.forEach(rule => { rule.isActive = true; });
  Object.assign(original.rules.find(rule => rule.id === 31), { maxValue: '48', maxInclusive: true });
  const f = fixture([original]); f.click('Edit Opening installation'); f.click('Add range');
  f.input('installation-rule-max-1', '96'); f.input('installation-rule-min-2', '96');
  f.input('installation-rule-rate-2', '180'); await f.save();
  const rules = f.requests[0][2].rules;
  assert.deepEqual(rules.map(rule => rule.id), [31, 32, undefined]);
  assert.equal(rules[2].rate, 180); assert.equal(rules[2].estimatedMinutes, null); assert.equal(rules[2].isActive, true);
});

test('a pending save blocks duplicate submits and dismissal; failure preserves the draft for retry', async () => {
  const pending = deferred(); let calls = 0;
  const f = fixture([], true, { createInstallationService: async payload => {
    if (++calls === 1) return pending.promise;
    return service(1000, payload);
  } });
  f.click('New service'); f.input('installation-service-name', '  Balcony repair  ');
  const submit = f.submitHandler();
  const first = submit(event()); await submit(event());
  assert.equal(f.requests.length, 1);
  assert.equal(f.button('Cancel').props.disabled, true);
  f.dialog().props.onOpenChange(false); assert.equal(f.editorOpen(), true);
  pending.reject(new Error('Service could not be saved')); await first; await flush();
  assert.deepEqual(f.errors, ['Service could not be saved']);
  assert.equal(f.control('installation-service-name').props.value, '  Balcony repair  ');
  assert.equal(f.visibleNames().length, 0);
  await f.save(); assert.equal(f.editorOpen(), false);
  assert.deepEqual(f.visibleNames(), ['Balcony repair']);
  assert.equal(f.requests.length, 2);
});

test('invalid required names and times never reach the mutation API', async () => {
  const f = fixture([]); f.click('New service'); await f.save();
  assert.equal(f.requests.length, 0);
  f.input('installation-service-name', 'Installation'); f.input('installation-service-time', '-1'); await f.save();
  assert.equal(f.requests.length, 0); assert.ok(f.errors.length >= 2);
});

test('deleting or deactivating the final filtered row moves back to a populated page', async () => {
  for (const deleted of [true, false]) {
    const initial = Array.from({ length: 21 }, (_, index) => service(index + 1, { isActive: true }));
    const f = fixture(initial, true, { deleteInstallationService: async id => deleted ? { deleted: true } : { ...initial.find(item => item.id === id), isActive: false } });
    f.select('installation-service-status-filter', 'active'); f.click('Next page');
    assert.deepEqual(f.visibleNames(), ['Service 021']);
    f.click('Delete Service 021');
    f.click('Continue'); await flush();
    assert.equal(f.visibleNames()[0], 'Service 001'); assert.equal(f.visibleNames().length, 20);
    assert.equal(f.button('Next page').props.disabled, true);
    assert.deepEqual(f.requests, [['deleteInstallationService', 21]]);
  }
});

test('read-only users can browse service details without edit, delete or submit controls', () => {
  const item = ranged(); delete item.baseRate; delete item.minimumCharge;
  const f = fixture([item], false);
  assert.deepEqual(f.visibleNames(), ['Opening installation']);
  assert.equal(all(f.render(), node => node.props?.['aria-label'] === 'Delete Opening installation' || text(node).trim() === 'New service').length, 0);
  f.click('View Opening installation'); assert.equal(f.editorOpen(), true);
  assert.equal(all(f.render(), node => node.type === 'form' || ['Input', 'Textarea', 'Checkbox'].includes(node.type)).length, 1, 'Only the catalog search input remains interactive');
  assert.equal(all(f.render(), node => text(node).trim() === 'Save service' && node.props?.onClick).length, 0);
  assert.doesNotMatch(text(f.render()), /NaN|\$undefined/);
  assert.equal(f.requests.length, 0);
});

(async () => {
  let failures = 0;
  for (const { name, run } of tests) {
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { failures++; console.error(`FAIL ${name}`, error); }
  }
  console.log(`${tests.length - failures}/${tests.length} installation service catalog flows passed.`);
  if (failures) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
