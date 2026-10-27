/* Product-level muntin configuration: form controls, API payloads and system links. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');

function setup(product) {
  let values;
  let defaults;
  const requests = [];
  const states = [];
  let stateIndex = 0;
  function requireTest(id) {
    if (id === 'react') return {
      useMemo: fn => fn(),
      useState: initial => {
        const index = stateIndex++;
        if (!(index in states)) states[index] = initial;
        return [states[index], value => { states[index] = value; }];
      },
    };
    if (id === 'react/jsx-runtime') return require(id);
    if (id === 'react-hook-form') return { useForm: ({ defaultValues }) => {
      if (!values) { values = { ...defaultValues }; defaults = { ...defaultValues }; }
      return {
        register: name => ({ name, onChange: event => { values[name] = event.target.type === 'checkbox' ? event.target.checked : event.target.value; } }),
        watch: name => values[name],
        setValue: (name, value) => { values[name] = value; },
        handleSubmit: callback => async event => { event?.preventDefault(); await callback({ ...values }); },
        formState: { errors: {}, isSubmitting: false, isDirty: JSON.stringify(values) !== JSON.stringify(defaults) },
      };
    } };
    if (id === 'next/navigation') return { useParams: () => product ? { id: String(product.id) } : {}, useRouter: () => ({ push() {}, back() {}, refresh() {} }) };
    if (id === 'next/link') return { __esModule: true, default: 'Link' };
    if (id === 'lucide-react') return new Proxy({}, { get: () => () => null });
    if (id === 'sonner') return { toast: { success() {}, error(message) { throw new Error(message); } } };
    if (id === '@/app/api/products.api') return {
      createProduct: async body => { requests.push({ method: 'POST', body }); },
      updateProduct: async (id, body) => { requests.push({ method: 'PATCH', id, body }); },
    };
    if (id === '@/app/api/systems.api') return { deleteSystem() { throw new Error('Not part of this test'); } };
    if (id === '@/components/delete-conf-dialog') return { DeleteConfirmationDialog: 'DeleteConfirmationDialog' };
    if (id.startsWith('@/components/ui/')) return new Proxy({}, { get: (_target, name) => name });
    throw new Error(`Unexpected dependency: ${id}`);
  }
  function load(relative) {
    const filename = path.resolve(__dirname, '../src', relative);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const loaded = { exports: {} };
    new Function('require', 'module', 'exports', code)(requireTest, loaded, loaded.exports);
    return loaded.exports;
  }
  const { ProductForm } = load('app/settings/(write)/products/new/product-form.tsx');
  return { requests, load, render() { stateIndex = 0; return ProductForm({ product }); } };
}
function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!React.isValidElement(node)) return [];
  return [node, ...elements(node.props.children)];
}
const byId = (tree, id) => { const control = elements(tree).find(item => item.props.id === id); assert.ok(control, `Control ${id}`); return control; };
const base = { id: 42, name: 'Configurable door', sortOrder: 3, isActive: true, kind: 'GLAZED_UNIT', pricingMode: 'AREA_PERIMETER', diagramFamily: 'GARAGE_DOOR' };

(async () => {
  let app = setup();
  let tree = app.render();
  assert.equal(byId(tree, 'allowMuntin').props.checked, true, 'New regular products allow muntins by default');
  byId(tree, 'name').props.onChange({ target: { value: ' Custom product ' } });
  byId(tree, 'allowMuntin').props.onCheckedChange(false);
  tree = app.render();
  await tree.props.onSubmit({ preventDefault() {} });
  assert.deepEqual(app.requests, [{ method: 'POST', body: { name: 'Custom product', kind: 'GLAZED_UNIT', pricingMode: 'AREA_PERIMETER', diagramFamily: 'GENERIC', allowMuntin: false } }]);

  app = setup({ ...base, allowMuntin: false });
  tree = app.render();
  assert.equal(byId(tree, 'allowMuntin').props.checked, false, 'Editing preserves an explicit disabled flag');
  assert.equal(byId(tree, 'allowMuntin').props.disabled, false, 'Garage Door muntins are configurable by flag');
  byId(tree, 'allowMuntin').props.onCheckedChange(true);
  tree = app.render();
  await tree.props.onSubmit({ preventDefault() {} });
  assert.equal(app.requests[0].method, 'PATCH');
  assert.equal(app.requests[0].id, 42);
  assert.equal(app.requests[0].body.allowMuntin, true, 'Editing sends the selected flag');

  app = setup(base);
  tree = app.render();
  assert.equal(byId(tree, 'allowMuntin').props.checked, true, 'A missing flag preserves existing regular-product behavior');
  byId(tree, 'kind').props.onChange({ target: { value: 'LINEAR_MATERIAL' } });
  tree = app.render();
  assert.equal(byId(tree, 'allowMuntin').props.checked, false);
  assert.equal(byId(tree, 'allowMuntin').props.disabled, true);
  await tree.props.onSubmit({ preventDefault() {} });
  assert.equal(app.requests[0].body.allowMuntin, false, 'Switching to a linear material submits false even after a true selection');
  assert.equal(app.requests[0].body.pricingMode, 'LINEAR_INCH');

  app = setup({ ...base, kind: 'LINEAR_MATERIAL', allowMuntin: true });
  tree = app.render();
  assert.equal(byId(tree, 'allowMuntin').props.checked, false, 'Linear materials never expose an enabled switch');
  assert.equal(byId(tree, 'allowMuntin').props.disabled, true);

  const { getSystemColumns } = app.load('app/settings/systems/columns-systems.tsx');
  const action = getSystemColumns({ canEdit: true }).find(column => column.id === 'actions');
  for (const [product, expected] of [[base, true], [{ ...base, allowMuntin: false }, false], [{ ...base, allowMuntin: true }, true], [{ ...base, kind: 'LINEAR_MATERIAL', allowMuntin: true }, false]]) {
    const content = action.cell({ row: { original: { id: 7, name: 'Series', brandProduct: { product } } } });
    assert.equal(elements(content).some(item => item.props.href === '/settings/systems/7/muntins'), expected, 'Manage Muntins follows the product flag and excludes linear materials');
  }
  assert.equal(getSystemColumns({ canEdit: false }).some(column => column.id === 'actions'), false);
  console.log('PASS product muntin settings: defaults, create/edit payloads, configurable Garage Door, linear guard and system menu visibility.');
})().catch(error => { console.error(error); process.exitCode = 1; });
