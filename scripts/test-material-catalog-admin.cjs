/* Offline catalog administration regressions. No uploads, API writes or server process. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '../src');
const tests = [];
const test = (name, run) => tests.push({ name, run });
const tick = () => new Promise(resolve => setImmediate(resolve));

function controlled(file, exportName, props, api, push = () => {}) {
  const states = [], refs = [], cache = new Map();
  let stateIndex = 0, refIndex = 0;
  const hooks = {
    ...React,
    useState(initial) { const index = stateIndex++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
    useRef(initial) { const index = refIndex++; if (!(index in refs)) refs[index] = { current: initial }; return refs[index]; },
    useEffect() {},
  };
  const pass = ({ children }) => React.createElement('div', null, children);
  function load(filename) {
    filename = path.resolve(root, filename);
    if (cache.has(filename)) return cache.get(filename);
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const module = { exports: {} };
    const localRequire = id => {
      if (id === 'react') return hooks;
      if (id === 'react/jsx-runtime') return require(id);
      if (id === 'next/link') return { __esModule: true, default: pass };
      if (id === 'next/navigation') return { useRouter: () => ({ push }) };
      if (id === 'lucide-react') return new Proxy({}, { get: () => () => null });
      if (id === '@/components/material-product-image') return { MaterialProductImage: pass };
      if (id.startsWith('@/components/ui/')) return new Proxy({}, { get: () => pass });
      if (id === '@/app/api/materials.api') return api;
      if (id === '@/app/api/warehouse.api') return { warehouseRequestKey: () => require('node:crypto').randomUUID() };
      if (id === 'jsbarcode') return () => {};
      const base = id.startsWith('@/') ? path.resolve(root, id.slice(2)) : id.startsWith('.') ? path.resolve(path.dirname(filename), id) : null;
      if (!base) return require(id);
      const resolved = ['.ts', '.tsx'].map(ext => base + ext).find(fs.existsSync);
      if (!resolved) throw new Error(`Unresolved: ${id}`);
      return load(resolved);
    };
    new Function('require', 'module', 'exports', output)(localRequire, module, module.exports);
    cache.set(filename, module.exports);
    return module.exports;
  }
  const Component = load(file)[exportName];
  return { render() { stateIndex = 0; refIndex = 0; return Component(props); } };
}
function nodes(element, predicate, output = []) {
  if (!element || typeof element !== 'object') return output;
  if (Array.isArray(element)) { element.forEach(child => nodes(child, predicate, output)); return output; }
  if (predicate(element)) output.push(element);
  nodes(element.props?.children, predicate, output);
  return output;
}
const text = element => typeof element === 'string' || typeof element === 'number' ? String(element) : Array.isArray(element) ? element.map(text).join('') : element?.props ? text(element.props.children) : '';
const field = (tree, label) => nodes(tree, e => e.props?.label === label)[0]?.props.children;
const click = (tree, label) => nodes(tree, e => text(e) === label && e.props?.onClick)[0].props.onClick();
const submit = form => form.props.onSubmit({ preventDefault() {}, stopPropagation() {} });
const helpers = 'app/warehouse/materials/material-catalog-fields.tsx';
const unit = { id: 1, name: 'Tube', isActive: true };
const product = { id: 5, name: '850A', code: 'MAT-000005', description: '', baseUnit: unit, baseUnitId: 1, category: { id: 2, name: 'Sealants', isActive: true }, brand: 'Sherwin-Williams', imageUrl: '/api/materials/images/8cfcb0e2-25d9-4222-9b49-4f905489c233.webp', version: 4, isActive: true, isSaleEnabled: false, presentations: [], inventoryByStore: [] };

test('photo input rejects unsupported files and files over 5 MB before uploading', async () => {
  let uploads = 0;
  const h = controlled(helpers, 'MaterialPhotoField', { imageUrl: null, name: '850A', onChange() {}, onUploadingChange() {} }, { uploadMaterialImage: async () => { uploads++; } });
  for (const file of [{ type: 'image/svg+xml', size: 30 }, { type: 'image/png', size: 5 * 1024 * 1024 + 1 }]) {
    nodes(h.render(), e => e.type === 'input' && e.props.type === 'file')[0].props.onChange({ target: { files: [file], value: 'selected' } });
    await tick();
  }
  assert.equal(uploads, 0);
  assert.match(nodes(h.render(), e => e.props?.error)[0].props.error, /smaller than 5 MB/);
});

test('photo upload disables saving until complete and preserves original photo after failure', async () => {
  const pendingStates = [], changes = [];
  let rejectUpload;
  const original = product.imageUrl;
  const h = controlled(helpers, 'MaterialPhotoField', { imageUrl: original, name: '850A', onChange: value => changes.push(value), onUploadingChange: value => pendingStates.push(value) }, { uploadMaterialImage: () => new Promise((_, reject) => { rejectUpload = reject; }) });
  nodes(h.render(), e => e.type === 'input')[0].props.onChange({ target: { files: [{ type: 'image/jpeg', size: 100 }], value: 'selected' } });
  assert.deepEqual(pendingStates, [true]);
  assert.equal(nodes(h.render(), e => e.type === 'input')[0].props.disabled, true);
  rejectUpload(new Error('Upload unavailable'));
  await tick();
  assert.deepEqual(pendingStates, [true, false]);
  assert.deepEqual(changes, []);
  assert.match(nodes(h.render(), e => e.props?.error)[0].props.error, /photo has not changed/);
});

test('successful photo upload uses returned URL and remove explicitly clears it', async () => {
  const props = { imageUrl: null, name: '850A', onChange: value => { props.imageUrl = value; }, onUploadingChange() {} };
  const h = controlled(helpers, 'MaterialPhotoField', props, { uploadMaterialImage: async () => ({ imageUrl: product.imageUrl }) });
  nodes(h.render(), e => e.type === 'input')[0].props.onChange({ target: { files: [{ type: 'image/webp', size: 100 }], value: 'selected' } });
  await tick();
  assert.equal(props.imageUrl, product.imageUrl);
  click(h.render(), 'Remove');
  assert.equal(props.imageUrl, null);
});

test('creating a product stores catalog metadata and cannot duplicate after navigation fails', async () => {
  let writes = 0, body;
  const h = controlled('app/warehouse/materials/materials-client.tsx', 'MaterialsClient', { initial: { items: [], total: 0, page: 1, pageSize: 24 }, initialUnits: [unit], admin: true }, { createMaterialProduct: async value => { writes++; body = value; return product; } }, () => { throw new Error('Navigation interrupted'); });
  click(h.render(), 'New product');
  const creationForm = h.render();
  for (const [label, value] of [['Product name', '850A'], ['Base unit', '1'], ['Purchase unit', '1'], ['Base units in each purchase package', '1'], ['Brand (optional)', 'Sherwin-Williams']]) field(creationForm, label).props.onChange({ target: { value } });
  nodes(h.render(), e => e.type?.name === 'MaterialCategorySelect')[0].props.onChange('2');
  nodes(h.render(), e => e.type?.name === 'MaterialPhotoField')[0].props.onChange(product.imageUrl);
  const form = () => nodes(h.render(), e => e.type === 'form' && field(e, 'Product name'))[0];
  submit(form()); await tick(); submit(form()); await tick();
  assert.equal(writes, 1);
  assert.equal(body.categoryId, 2);
  assert.equal(body.imageUrl, product.imageUrl);
  assert.equal(body.brand, 'Sherwin-Williams');
  assert.equal(body.quantity, undefined);
  assert.equal(body.baseBarcode, undefined);
});

test('product settings cannot submit during photo upload and explicitly clear optional metadata', async () => {
  let body, writes = 0;
  const h = controlled('app/warehouse/materials/material-detail-client.tsx', 'MaterialDetailClient', { initial: product, units: [unit], stores: [], admin: true }, { updateMaterialProduct: async (_, value) => { writes++; body = value; return { ...product, ...value, version: 5 }; } });
  click(h.render(), 'Product settings');
  nodes(h.render(), e => e.type?.name === 'MaterialPhotoField')[0].props.onUploadingChange(true);
  submit(nodes(h.render(), e => e.type === 'form')[0]); await tick();
  assert.equal(writes, 0);
  nodes(h.render(), e => e.type?.name === 'MaterialPhotoField')[0].props.onUploadingChange(false);
  nodes(h.render(), e => e.type?.name === 'MaterialPhotoField')[0].props.onChange(null);
  nodes(h.render(), e => e.type?.name === 'MaterialCategorySelect')[0].props.onChange('');
  field(h.render(), 'Brand (optional)').props.onChange({ target: { value: '' } });
  submit(nodes(h.render(), e => e.type === 'form')[0]); await tick();
  assert.equal(writes, 1);
  assert.equal(body.imageUrl, null);
  assert.equal(body.categoryId, null);
  assert.equal(body.brand, null);
  assert.equal(body.version, 4);
});

test('category rename and deactivate retain category identity without fetching again', async () => {
  const operations = [];
  const props = { categories: [product.category], onChange: value => { props.categories = value; } };
  const h = controlled(helpers, 'MaterialCategoryManager', props, { updateMaterialCategory: async (id, body) => { operations.push({ id, ...body }); return { ...props.categories[0], ...body }; } });
  click(h.render(), 'Categories'); click(h.render(), 'Rename');
  field(h.render(), 'New category name').props.onChange({ target: { value: 'Caulking and sealants' } });
  submit(nodes(h.render(), e => e.type === 'form' && field(e, 'New category name'))[0]); await tick();
  click(h.render(), 'Deactivate'); await tick();
  assert.equal(props.categories[0].id, 2);
  assert.equal(props.categories[0].name, 'Caulking and sealants');
  assert.equal(props.categories[0].isActive, false);
  assert.equal(operations.length, 2);
  assert.notEqual(operations[0].requestKey, operations[1].requestKey);
});

(async () => {
  const originalCreate = URL.createObjectURL;
  URL.createObjectURL = () => 'blob:offline-preview';
  try {
    for (const [index, entry] of tests.entries()) {
      await entry.run();
      process.stdout.write(`ok ${index + 1} - ${entry.name}\n`);
    }
    process.stdout.write(`${tests.length} catalog admin checks passed.\n`);
  } finally { URL.createObjectURL = originalCreate; }
})().catch(error => { console.error(error); process.exitCode = 1; });
