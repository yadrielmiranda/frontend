/* Synthetic saved-delivery regressions; no live stock, signatures or network. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '../src');
const tests = [], test = (name, run) => tests.push({ name, run });
function load(relative, overrides = {}, cache = new Map()) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  function resolve(id) {
    if (Object.hasOwn(overrides, id)) return overrides[id];
    const base = id.startsWith('@/') ? path.resolve(root, id.slice(2)) : id.startsWith('.') ? path.resolve(path.dirname(filename), id) : null;
    if (!base) return require(id);
    const found = ['.ts', '.tsx'].map(ext => base + ext).find(file => fs.existsSync(file));
    if (!found) throw new Error(`Unresolved ${id}`);
    return load(path.relative(root, found), overrides, cache);
  }
  new Function('require', 'module', 'exports', output)(resolve, module, module.exports);
  cache.set(filename, module.exports); return module.exports;
}
const item = (lineNumber, poNumber, quantity, rest = {}) => ({ lineNumber, barcode: `I${lineNumber}`, poNumber,
  source: 'EXTERNAL', orderNumber: '', mark: '1', description: 'French door', product: '', system: '', configuration: '', quantity, ...rest });
const receipt = (overrides = {}) => ({ source: 'WAREHOUSE', storeId: 1, storeName: 'Main',
  firstName: 'Synthetic', lastName: 'Recipient', signatureStrokes: [],
  items: [item('1133926', '293232', 1, { parts: { DOOR: 1 } })], totalPieces: 1, totalParts: 1,
  pendingItems: [item('1133926', '293232', 2, { parts: { DOOR: 1, FRAME: 1 } }), item('1134000', '293233', 1, { description: 'Uncollected window', parts: { WINDOW: 1 } })], ...overrides });
const { CustomerDeliveryReceipt } = load('app/warehouse/customer-deliveries/customer-delivery-receipt.tsx');
const render = value => renderToStaticMarkup(React.createElement(CustomerDeliveryReceipt, { delivery: value }));
test('signed summary separates delivered door panels from pending panels, frames and wholly unscanned POs', () => {
  const html = render(receipt());
  const boundary = html.indexOf('Pending pickup');
  const delivered = html.slice(0, boundary), pending = html.slice(boundary);
  assert.match(delivered, /PO 293232/); assert.match(delivered, /1 door panel/);
  assert.doesNotMatch(delivered, /Uncollected window|PO 293233/);
  assert.match(pending, /1 frame/); assert.match(pending, /Uncollected window/); assert.match(pending, /PO 293233/);
  assert.match(pending, /have not been received in this delivery/);
});
test('pending unknown quantities stay visibly unknown instead of claiming zero or complete', () => {
  const html = render(receipt({ pendingItems: [item('1134001', '293234', 0, { unknownQuantity: true, description: 'Unconfirmed piece' })] }));
  assert.match(html, /To be confirmed/); assert.match(html, /Unconfirmed piece/);
  assert.doesNotMatch(html, /All parts from the included POs have been delivered/);
});
test('completed POs explicitly show no pending pickup while old receipts preserve their original content', () => {
  assert.match(render(receipt({ pendingItems: [] })), /All parts from the included POs have been delivered/);
  assert.doesNotMatch(render(receipt({ pendingItems: undefined })), /Pending pickup/);
});
test('pending description and PO text remain escaped in signed summaries', () => {
  const html = render(receipt({ pendingItems: [item('1134002', '<script>bad()</script>', 1, { description: '<img src=x onerror=bad()>' })] }));
  assert.doesNotMatch(html, /<script|<img/); assert.match(html, /&lt;script&gt;/); assert.match(html, /&lt;img/);
});
test('customer receipt aggregates parts without displaying internal storage origins', () => {
  const html = render(receipt({ storeId: null, storeName: 'Multiple storages', orders: [], pendingItems: [], totalPieces: 1, totalParts: 3,
    items: [item('1133926', '293232', 3, { parts: { DOOR: 2, FRAME: 1 }, origins: [
      { storeId: 1, storeName: 'Main', quantity: 1, parts: { DOOR: 1 } },
      { storeId: 2, storeName: 'Overflow', quantity: 2, parts: { DOOR: 1, FRAME: 1 } },
    ] })] }));
  assert.doesNotMatch(html, /Delivered from|Main|Overflow|Multiple storages/); assert.equal((html.match(/1133926/g) || []).length, 1);
  assert.match(html, /2 door panels/); assert.match(html, /1 frame/);
  assert.match(html, /<dt>Total pieces<\/dt><dd[^>]*>1<\/dd>/); assert.match(html, /<dt>Total physical parts<\/dt><dd[^>]*>3<\/dd>/);
  const legacy = render(receipt({ pendingItems: undefined, orders: undefined }));
  assert.doesNotMatch(legacy, /Delivered from|Main|Overflow|Multiple storages/);
});

class ApiError extends Error { constructor(message, status, data) { super(message); this.status = status; this.data = data; } }
const storage = new Map();
global.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
global.window = { scrollTo() {}, addEventListener() {}, removeEventListener() {} };
const account = { id: 10, role: { name: 'admin' } };
const drawnSignature = [[{x:.1,y:.1},{x:.2,y:.4},{x:.3,y:.2},{x:.4,y:.5},{x:.6,y:.2}]];
const run = (changes = {}) => ({ id: 7, status: 'ACTIVE', storeId: 1, storeName: 'Main', createdById: 10, createdBy: 'Test Admin',
  createdAt: '2026-11-04T18:00:00Z', updatedAt: '2026-11-04T18:00:00Z', closedAt: null, revision: 'revision-7',
  orders: [{key:'external:1',poNumber:'293232',source:'EXTERNAL',orderNumber:'',totalPieces:1,totalParts:1,pendingPieces:2,pendingParts:3,unknownPending:false}],
  items: receipt().items, pendingItems: receipt().pendingItems, totalPieces:1,totalParts:1,pendingPieces:2,pendingParts:3,hasPending:true,deliveryId:null,delivery:null,...changes });
let keyId = 0;
function harness({ initialRun = run(), initialList, api = {}, auth = { user: account, revalidate: async () => account }, props: extraProps = {} } = {}) {
  const states = [], refs = []; let stateIndex = 0, refIndex = 0, mounted = false, effects = [];
  const hooks = {
    useState(initial) { const i = stateIndex++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useRef(initial) { const i = refIndex++; if (!(i in refs)) refs[i] = { current: initial }; return refs[i]; },
    useCallback(value) { return value; }, useEffect(effect) { if (!mounted) effects.push(effect); },
  };
  const primitives = new Proxy({}, { get: (_, name) => name });
  const overrides = {
    react: {...React,...hooks}, 'next/link': {__esModule:true,default:'a'},
    'next/navigation': {useRouter:()=>({replace(){},refresh(){}})}, 'lucide-react':primitives,
    '@/components/ui/button':primitives, '@/components/ui/input':primitives, '@/components/ui/label':primitives, '@/components/ui/alert-dialog':primitives,
    '@/components/ui/dialog':primitives,
    '@/components/estimates/agreements/signature-pad':{SignaturePad:'SignaturePad'},
    '@/contexts/AuthContext':{useAuth:()=>auth}, '@/app/api/_base':{ApiError,isApiError:e=>e instanceof ApiError},
    '@/app/api/warehouse.api':{warehouseRequestKey:()=>`synthetic-${++keyId}`},
    '@/app/api/customer-delivery-runs.api':{customerDeliveryRun:async()=>structuredClone(initialRun),customerDeliveryRuns:async()=>({items:[],total:0,page:1,pageSize:20}),...api},
    '../scan-pad':{ScanPad:'ScanPad'}, '../store-select':{StoreSelect:'StoreSelect'},
    './customer-delivery-po-picker':{CustomerDeliveryPoPicker:'CustomerDeliveryPoPicker'},
    '../warehouse-shared':{errorMessage:error=>error.message,Pagination:'Pagination'}, './customer-delivery-receipt':{CustomerDeliveryReceipt:'CustomerDeliveryReceipt'},
  };
  const Component = load('app/warehouse/customer-deliveries/customer-delivery-runs-client.tsx',overrides).CustomerDeliveryRunsClient;
  const props = {actorId:10,actorRole:'admin',initialList:initialList??{items:[],total:0,page:1,pageSize:20},initialRun,initialStores:[{id:1,name:'Main',isActive:true}],initialStoreId:'1',...extraProps};
  const h = { auth, render() { stateIndex=0;refIndex=0;effects=[];const tree=Component(props);if(!mounted){mounted=true;effects.forEach(effect=>effect());return h.render();}return tree; } };
  return h;
}
const flatten = (element, predicate, found=[]) => { if(Array.isArray(element)){element.forEach(child=>flatten(child,predicate,found));return found;} if(!element||typeof element!=='object')return found;if(predicate(element))found.push(element);flatten(element.props?.children,predicate,found);return found; };
const text = element => typeof element==='string'||typeof element==='number'?String(element):Array.isArray(element)?element.map(text).join(''):element?.props?text(element.props.children):'';
const type = (h, name) => flatten(h.render(),node=>node.type===name)[0];
const button = (h, name) => flatten(h.render(),node=>node.type==='Button'&&text(node)===name)[0];
const click = (h,name) => {const node=button(h,name);assert.ok(node,`Missing ${name}`);assert.ok(!node.props.disabled,`Disabled ${name}`);return node.props.onClick();};
const ariaButton = (h, name) => flatten(h.render(), node => node.type === 'Button' && node.props['aria-label'] === name)[0];
const clickAria = (h, name) => { const node = ariaButton(h, name); assert.ok(node, `Missing ${name}`); assert.ok(!node.props.disabled, `Disabled ${name}`); return node.props.onClick(); };
const chooseStorage = (h, name = 'Main') => {
  const dialog = flatten(h.render(), node => node.type === 'Dialog' && flatten(node, child => child.type === 'Button' && ['Choose storage', 'Change storage'].includes(text(child))).length)[0];
  assert.ok(dialog, 'Missing storage selector'); dialog.props.onOpenChange(true); click(h, name);
};
const enter = (h,id,value) => {const node=flatten(h.render(),node=>node.props?.id===id)[0];assert.ok(node,`Missing ${id}`);node.props.onChange({target:{value}});};
const flush = async () => {for(let i=0;i<10;i++)await Promise.resolve();};
async function sign(h) {
  await click(h,'Review and close delivery');enter(h,'delivery-first-name','Synthetic');enter(h,'delivery-last-name','Recipient');
  type(h,'SignaturePad').props.onChange(structuredClone(drawnSignature));
  flatten(h.render(),node=>node.type==='input'&&node.props.type==='checkbox').forEach(node=>node.props.onChange({target:{checked:true}}));
}
test('opening a saved delivery recovers server scans with no selection checkboxes', () => {
  storage.clear();const h=harness();assert.match(text(h.render()),/Scanned and saved/);assert.match(text(h.render()),/1133926/);
  assert.equal(flatten(h.render(),node=>node.type==='input'&&node.props.type==='checkbox').length,0);
  assert.equal(type(h,'ScanPad').props.persistent,true);
});

test('manual PO delivery skips scanner and planning but retains all saved parts and signed close', async () => {
  storage.clear(); const writes = [];
  const h = harness({ props: { manual: true }, api: { closeCustomerDeliveryRun: async (id, body) => {
    writes.push({ id, body }); return run({ status: 'CLOSED', delivery: receipt(), deliveryId: 21 });
  } } });
  assert.equal(type(h, 'ScanPad'), undefined); assert.equal(button(h, 'Choose storage'), undefined);
  assert.equal(type(h, 'CustomerDeliveryPoPicker'), undefined); assert.ok(button(h, 'Add another PO'));
  assert.match(text(h.render()), /Parts in this delivery/); assert.match(text(h.render()), /1133926/);
  await click(h, 'Review and close delivery');
  assert.equal(button(h, 'Sign and close delivery').props.disabled, true);
  assert.deepEqual(type(h, 'CustomerDeliveryReceipt').props.delivery.items, run().items);
  assert.deepEqual(type(h, 'CustomerDeliveryReceipt').props.delivery.pendingItems, run().pendingItems);
  assert.equal(button(h, 'Continue scanning'), undefined); await click(h, 'Back to delivery');
  await sign(h); await click(h, 'Sign and close delivery');
  assert.equal(writes.length, 1); assert.equal(writes[0].id, 7); assert.equal(writes[0].body.revision, 'revision-7');
  assert.match(text(h.render()), /Signed and delivered/);
});

test('manual view recovers a pre-existing uncertain scan before allowing signed close', async () => {
  storage.clear(); const requestKey = 'a0000000-0000-4000-8000-000000000091'; const writes = [];
  storage.set('customer-delivery-run:10:source:7', JSON.stringify({ runId: 7, source: { storeId: 1, storeName: 'Main' }, sourceConfirmed: true,
    reading: { requestKey, barcode: '1133926-DOOR', storeId: 1, legacy: false } }));
  const h = harness({ props: { manual: true }, api: { scanCustomerDeliveryPart: async (id, body) => { writes.push(body); return run(); } } });
  assert.equal(type(h, 'ScanPad').props.retryOnly, true);
  assert.equal(button(h, 'Review and close delivery').props.disabled, true);
  await type(h, 'ScanPad').props.onRead('1133926-DOOR', requestKey);
  assert.equal(writes.length, 1); assert.equal(writes[0].requestKey, requestKey);
  assert.equal(type(h, 'ScanPad'), undefined); assert.equal(button(h, 'Review and close delivery').props.disabled, false);
});
test('PO exclusion discards only the pending scan and keeps earlier saved parts', async () => {
  storage.clear();const calls=[];const h=harness({api:{scanCustomerDeliveryPart:async(...args)=>{calls.push(args);throw new ApiError('Other PO',409,{code:'DELIVERY_PO_NOT_INCLUDED',poNumber:'293233'});}}});
  chooseStorage(h);
  const scan=type(h,'ScanPad');const pending=scan.props.onRead('1134000-WINDOW','same-scan-key');await flush();
  assert.match(text(h.render()),/Add PO 293233/);click(h,'No, discard scan');
  assert.equal(await pending,null);assert.equal(calls.length,1);assert.match(text(h.render()),/1133926/);
});
test('PO inclusion retries the original reading with explicit consent and the same request key', async () => {
  storage.clear();const calls=[];const saved=run({totalParts:2});
  const h=harness({api:{scanCustomerDeliveryPart:async(id,body)=>{calls.push(body);if(!body.addPo)throw new ApiError('Other PO',409,{code:'DELIVERY_PO_NOT_INCLUDED',poNumber:'293233'});return saved;}}});
  chooseStorage(h);
  const pending=type(h,'ScanPad').props.onRead('1134000-WINDOW','same-scan-key');await flush();click(h,'Yes, add PO and part');
  assert.deepEqual(await pending,saved);assert.deepEqual(calls.map(x=>x.requestKey),['same-scan-key','same-scan-key']);assert.equal(calls[1].addPo,true);
});

test('uncertain scan reload preserves its storage and request key despite a different delivery default', async () => {
  storage.clear();const sourceKey='customer-delivery-run:10:source:7',scannerKey='warehouse-reading:customer-delivery-run:10:7',requestKey='a0000000-0000-4000-8000-000000000001';
  storage.set(sourceKey,JSON.stringify({runId:7,source:{storeId:1,storeName:'Main'},sourceConfirmed:true,reading:null}));
  const calls=[];let lost=true;const api={scanCustomerDeliveryPart:async(id,body)=>{calls.push(structuredClone(body));if(lost)throw new Error('Connection lost');return run({multiStore:true});}};
  const h=harness({initialRun:run({multiStore:true,storeId:null,storeName:'Multiple storages'}),api});
  await assert.rejects(()=>type(h,'ScanPad').props.onRead('1133926-DOOR',requestKey),/Connection lost/);
  const saved=JSON.parse(storage.get(sourceKey));assert.equal(saved.reading.storeId,1);assert.equal(saved.reading.requestKey,requestKey);
  const restored=harness({initialRun:run({multiStore:true,storeId:2,storeName:'Overflow'}),api});restored.render();
  assert.deepEqual(JSON.parse(storage.get(scannerKey)),{requestKey,barcode:'1133926-DOOR'});
  await assert.rejects(()=>type(restored,'ScanPad').props.onRead('1133926-DOOR','different-key'),/Retry the pending scan/);
  lost=false;await type(restored,'ScanPad').props.onRead('1133926-DOOR',requestKey);
  assert.deepEqual(calls[1],calls[0]);assert.equal(calls[1].storeId,1);assert.equal(JSON.parse(storage.get(sourceKey)).reading,null);
});

test('a pending scan saved by the old single-storage flow keeps its original request shape', async () => {
  storage.clear();const requestKey='a0000000-0000-4000-8000-000000000002';storage.set('warehouse-reading:customer-delivery-run:10:7',JSON.stringify({requestKey,barcode:'1133926-DOOR'}));
  const calls=[];const h=harness({api:{scanCustomerDeliveryPart:async(id,body)=>{calls.push(body);return run();}}});
  assert.equal(type(h,'ScanPad').props.disabled,false);assert.equal(type(h,'ScanPad').props.retryOnly,true);
  await type(h,'ScanPad').props.onRead('1133926-DOOR',requestKey);
  assert.deepEqual(calls,[{barcode:'1133926-DOOR',requestKey}]);
  assert.equal(type(h,'ScanPad').props.disabled,true);assert.ok(button(h,'Choose storage'));
});

test('a scan persisted before dispatch preserves explicitly unassigned storage on a legacy delivery', async () => {
  storage.clear();const requestKey='a0000000-0000-4000-8000-000000000003';
  storage.set('customer-delivery-run:10:source:7',JSON.stringify({runId:7,source:{storeId:null,storeName:'Unassigned'},reading:null}));
  storage.set('warehouse-reading:customer-delivery-run:10:7',JSON.stringify({requestKey,barcode:'1133926-DOOR'}));
  const calls=[];const h=harness({initialRun:run({storeId:1}),api:{scanCustomerDeliveryPart:async(id,body)=>{calls.push(body);return run();}}});
  await type(h,'ScanPad').props.onRead('1133926-DOOR',requestKey);
  assert.deepEqual(calls,[{barcode:'1133926-DOOR',requestKey,storeId:null}]);
  assert.equal(type(h,'ScanPad').props.disabled,true);assert.equal(type(h,'ScanPad').props.retryOnly,true);
});

test('admin and technician must explicitly select storage even with a legacy or previously implicit default', async () => {
  for (const role of ['admin','technician']) for (const scenario of ['fresh','legacy','implicit']) {
    storage.clear();let writes=0;
    const person={id:10,role:{name:role}},sourceKey='customer-delivery-run:10:source:7';
    if(scenario==='implicit')storage.set(sourceKey,JSON.stringify({runId:7,source:{storeId:1,storeName:'Main'},reading:null}));
    const options={initialRun:run({multiStore:scenario!=='legacy',storeId:scenario==='fresh'?null:1}),
      auth:{user:person,revalidate:async()=>person},props:{actorRole:role,technician:role==='technician'},
      api:{scanCustomerDeliveryPart:async()=>{writes++;return run();}}};
    const h=harness(options);
    assert.equal(type(h,'ScanPad').props.disabled,true,`${role}/${scenario} scan disabled`);
    assert.equal(type(h,'ScanPad').props.retryOnly,true);assert.ok(button(h,'Choose storage'));
    assert.doesNotMatch(text(h.render()),/Scanning from: Main/);
    await assert.rejects(()=>type(h,'ScanPad').props.onRead('1133926-DOOR','unselected-reading'),/Choose.*storage/i);
    assert.equal(writes,0);
    chooseStorage(h);
    assert.equal(type(h,'ScanPad').props.disabled,false);assert.equal(type(h,'ScanPad').props.retryOnly,false);
    assert.equal(JSON.parse(storage.get(sourceKey)).sourceConfirmed,true);
    const restored=harness(options);
    assert.equal(type(restored,'ScanPad').props.disabled,false);assert.match(text(restored.render()),/Scanning from: Main/);
  }
});

test('an old uncertain scan retries its saved source without enabling a new scan until storage is chosen', async () => {
  storage.clear();const requestKey='a0000000-0000-4000-8000-000000000004',calls=[];
  storage.set('customer-delivery-run:10:source:7',JSON.stringify({runId:7,source:{storeId:2,storeName:'Overflow'},
    reading:{requestKey,barcode:'1133926-DOOR',storeId:2,legacy:false}}));
  const h=harness({initialRun:run({multiStore:true,storeId:1}),api:{scanCustomerDeliveryPart:async(id,body)=>{calls.push(body);return run();}}});
  assert.equal(type(h,'ScanPad').props.disabled,false);assert.equal(type(h,'ScanPad').props.retryOnly,true);
  await type(h,'ScanPad').props.onRead('1133926-DOOR',requestKey);
  assert.deepEqual(calls,[{barcode:'1133926-DOOR',requestKey,storeId:2}]);
  assert.equal(type(h,'ScanPad').props.disabled,true);
  await assert.rejects(()=>type(h,'ScanPad').props.onRead('1133926-DOOR','new-reading'),/Choose.*storage/i);
  assert.equal(calls.length,1);chooseStorage(h);assert.equal(type(h,'ScanPad').props.disabled,false);
});
test('partial review includes whole-PO pending summary and requires acknowledgement before closing', async () => {
  storage.clear();const h=harness();await click(h,'Review and close delivery');assert.match(text(h.render()),/Some POs are incomplete/);
  assert.deepEqual(type(h,'CustomerDeliveryReceipt').props.delivery.pendingItems,run().pendingItems);
  enter(h,'delivery-first-name','Synthetic');enter(h,'delivery-last-name','Recipient');type(h,'SignaturePad').props.onChange(drawnSignature);
  const checks=flatten(h.render(),node=>node.type==='input'&&node.props.type==='checkbox');checks[1].props.onChange({target:{checked:true}});
  assert.equal(button(h,'Sign and close delivery').props.disabled,true);checks[0].props.onChange({target:{checked:true}});assert.equal(button(h,'Sign and close delivery').props.disabled,false);
});
test('changing recipient identity invalidates the existing signature and acceptance', async () => {
  storage.clear();const h=harness();await sign(h);enter(h,'delivery-last-name','Changed');
  assert.deepEqual(type(h,'SignaturePad').props.value,[]);assert.equal(button(h,'Sign and close delivery').props.disabled,true);
});
test('uncertain close survives reload and reuses exact signed snapshot even if server data changed', async () => {
  storage.clear();const calls=[];const api={closeCustomerDeliveryRun:async(id,body)=>{calls.push(structuredClone(body));throw new Error('Connection lost');}};
  const h=harness({api});await sign(h);await click(h,'Sign and close delivery');assert.ok(button(h,'Check delivery close'));
  const restored=harness({initialRun:run({revision:'newer-revision',totalParts:2}),api});assert.ok(button(restored,'Check delivery close'));
  await click(restored,'Check delivery close');assert.equal(calls.length,2);assert.deepEqual(calls[0],calls[1]);assert.equal(calls[1].revision,'revision-7');
  assert.equal(type(restored,'CustomerDeliveryReceipt').props.delivery.totalParts,1);
});
test('stock conflict clears signature for fresh review while preserving the saved delivery', async () => {
  storage.clear();const h=harness({api:{closeCustomerDeliveryRun:async()=>{throw new ApiError('Changed stock',409,{code:'DELIVERY_REVIEW_CHANGED'});}}});
  await sign(h);await click(h,'Sign and close delivery');assert.match(text(h.render()),/Changed stock/);assert.match(text(h.render()),/Scanned and saved/);
  await click(h,'Review and close delivery');assert.deepEqual(type(h,'SignaturePad').props.value,[]);
});
test('changed account cannot view prior receipt or submit a saved scan', async () => {
  storage.clear();let writes=0;const auth={user:account,revalidate:async()=>({id:99,role:{name:'admin'}})};
  const h=harness({auth,api:{scanCustomerDeliveryPart:async()=>{writes++;return run();}}});
  chooseStorage(h);
  await assert.rejects(()=>type(h,'ScanPad').props.onRead('1133926-DOOR','scan'),/account has changed/i);assert.equal(writes,0);
  auth.user={id:99,role:{name:'admin'}};assert.doesNotMatch(text(h.render()),/1133926|Scanned and saved/);assert.match(text(h.render()),/Sign in/);
});
test('browser storage failure sends no signed stock release', async () => {
  storage.clear();let writes=0;const h=harness({api:{closeCustomerDeliveryRun:async()=>{writes++;return run();}}});await sign(h);
  const save=global.localStorage.setItem;global.localStorage.setItem=()=>{throw new Error('Storage unavailable');};
  try{await click(h,'Sign and close delivery');assert.equal(writes,0);assert.match(text(h.render()),/Storage unavailable/);}finally{global.localStorage.setItem=save;}
});
test('uncertain create recovers the same delivery request after leaving and reopening', async () => {
  storage.clear();const calls=[];const api={createCustomerDeliveryRun:async body=>{calls.push(structuredClone(body));throw new Error('Connection lost');}};
  const h=harness({initialRun:null,api});assert.equal(type(h,'StoreSelect'),undefined);await click(h,'Create delivery');assert.ok(button(h,'Check created delivery'));
  const restored=harness({initialRun:null,api});await click(restored,'Check created delivery');assert.deepEqual(calls[0],calls[1]);assert.equal(Object.hasOwn(calls[0],'storeId'),false);
});
test('removing a saved part requires deliberate confirmation and preserves retry identity', async () => {
  storage.clear();const calls=[];const api={removeCustomerDeliveryPart:async(id,body)=>{calls.push(structuredClone(body));throw new Error('Connection lost');}};
  const initialRun=run({multiStore:true,allocations:[{...receipt().items[0],storeId:1,storeName:'Main'},{...receipt().items[0],storeId:2,storeName:'Overflow'}]});
  const h=harness({api,initialRun});click(h,'Remove one panel from Overflow');assert.equal(calls.length,0);click(h,'Keep part');assert.equal(calls.length,0);
  click(h,'Remove one panel from Overflow');await click(h,'Remove one part');assert.equal(calls.length,1);
  const restored=harness({api,initialRun});await click(restored,'Check part correction');assert.deepEqual(calls[0],calls[1]);assert.equal(calls[0].partType,'DOOR');assert.equal(calls[0].storeId,2);assert.equal(Object.hasOwn(calls[0],'storeName'),false);
});
const emptyRun = (changes = {}) => run({ canDelete: true, items: [], allocations: [], totalPieces: 0, totalParts: 0,
  orders: [{ ...run().orders[0], totalPieces: 0, totalParts: 0, canRemove: true }], ...changes });

test('empty delivery deletion requires confirmation and returns to the delivery list', async () => {
  storage.clear(); const deleted = [];
  const h = harness({ initialRun: emptyRun(), api: { deleteCustomerDeliveryRun: async id => { deleted.push(id); return { id, deleted: true }; } } });
  click(h, 'Delete delivery'); assert.equal(deleted.length, 0); assert.equal(type(h, 'ScanPad').props.disabled, true);
  click(h, 'Cancel'); assert.equal(deleted.length, 0);
  click(h, 'Delete delivery'); await click(h, 'Confirm deletion');
  assert.deepEqual(deleted, [7]); assert.equal(type(h, 'ScanPad'), undefined); assert.match(text(h.render()), /Delivery #7 deleted/);
  assert.equal(storage.has('customer-delivery-run:10:management'), false);
});

test('list deletion honors server eligibility and protects unresolved scans stored in this browser', () => {
  storage.clear(); const page = items => ({ items, total: items.length, page: 1, pageSize: 20 });
  const hidden = harness({ initialRun: null, initialList: page([emptyRun({ canDelete: false })]) });
  assert.equal(button(hidden, 'Delete delivery'), undefined);
  const h = harness({ initialRun: null, initialList: page([emptyRun()]) });
  storage.set('warehouse-reading:customer-delivery-run:10:7', JSON.stringify({ requestKey: 'pending', barcode: '1133926-DOOR' }));
  click(h, 'Delete delivery'); assert.match(text(h.render()), /Open delivery #7 and resolve/);
  assert.equal(flatten(h.render(), node => node.type === 'AlertDialog' && node.props.open).length, 0);
});

test('uncertain deletion recovers from the list after reload and reuses the same delivery', async () => {
  storage.clear(); const calls = []; let resolved = false;
  const api = { deleteCustomerDeliveryRun: async id => { calls.push(id); if (!resolved) throw new Error('Connection lost'); return { id, deleted: true }; } };
  const h = harness({ initialRun: emptyRun(), api }); click(h, 'Delete delivery'); await click(h, 'Confirm deletion');
  assert.ok(button(h, 'Check delivery change')); assert.equal(button(h, 'Cancel').props.disabled, true);
  const restored = harness({ initialRun: null, api }); assert.equal(button(restored, 'Create delivery').props.disabled, true);
  resolved = true; await click(restored, 'Check delivery change'); assert.deepEqual(calls, [7, 7]);
  assert.match(text(restored.render()), /Delivery #7 deleted/);
});

test('PO removal requires confirmation and preserves other POs and saved scans', async () => {
  storage.clear(); const other = { ...emptyRun().orders[0], key: 'order:2', poNumber: '293300', source: 'ORDER' };
  const initial = run({ orders: [...run().orders, other] }); const calls = [];
  const h = harness({ initialRun: initial, api: { removeCustomerDeliveryPo: async (id, body) => { calls.push({ id, body }); return run(); } } });
  assert.equal(ariaButton(h, 'Remove PO 293232').props.disabled, true);
  clickAria(h, 'Remove PO 293300'); assert.equal(calls.length, 0); assert.equal(type(h, 'ScanPad').props.disabled, true);
  click(h, 'Cancel'); assert.equal(calls.length, 0);
  clickAria(h, 'Remove PO 293300'); await click(h, 'Remove PO');
  assert.equal(calls.length, 1); assert.equal(calls[0].body.poKey, 'order:2'); assert.equal(calls[0].id, 7);
  assert.equal(ariaButton(h, 'Remove PO 293300'), undefined); assert.ok(ariaButton(h, 'Remove PO 293232'));
  assert.match(text(h.render()), /1 pieces · 1 physical parts/);
});

test('uncertain PO removal retries the exact request after reload even when PO was re-added', async () => {
  storage.clear(); const calls = []; let resolved = false;
  const api = { removeCustomerDeliveryPo: async (id, body) => { calls.push({ id, body }); if (!resolved) throw new Error('Connection lost'); return emptyRun(); } };
  const h = harness({ initialRun: emptyRun(), api }); clickAria(h, 'Remove PO 293232'); await click(h, 'Remove PO');
  const restored = harness({ initialRun: emptyRun(), api }); assert.equal(type(restored, 'ScanPad').props.disabled, true);
  resolved = true; await click(restored, 'Check delivery change'); assert.deepEqual(calls[0], calls[1]);
  assert.ok(ariaButton(restored, 'Remove PO 293232')); assert.equal(storage.has('customer-delivery-run:10:management'), false);
});

test('server rejects stale PO removal and refreshes its recorded parts without losing scans', async () => {
  storage.clear(); const h = harness({ initialRun: emptyRun(), api: {
    removeCustomerDeliveryPo: async () => { throw new ApiError('This PO has recorded parts.', 409); }, customerDeliveryRun: async () => run(),
  } });
  clickAria(h, 'Remove PO 293232'); await click(h, 'Remove PO'); assert.match(text(h.render()), /This PO has recorded parts/);
  assert.equal(ariaButton(h, 'Remove PO 293232').props.disabled, true); assert.equal(storage.has('customer-delivery-run:10:management'), false);
});

test('delivery management honors technician access, offline state, account identity and local persistence', async () => {
  storage.clear(); const technician = { id: 10, role: { name: 'technician' } }; let writes = 0;
  const api = { deleteCustomerDeliveryRun: async id => { writes++; return { id, deleted: true }; } };
  const tech = harness({ initialRun: emptyRun(), api, auth: { user: technician, revalidate: async () => technician }, props: { actorRole: 'technician', technician: true } });
  click(tech, 'Delete delivery'); await click(tech, 'Confirm deletion'); assert.equal(writes, 1);
  const offline = harness({ initialRun: emptyRun(), props: { offline: true } }); assert.equal(button(offline, 'Delete delivery').props.disabled, true);
  const blocked = harness({ initialRun: emptyRun(), props: { blocked: true } }); assert.equal(ariaButton(blocked, 'Remove PO 293232').props.disabled, true);
  const changed = harness({ initialRun: emptyRun(), api, auth: { user: account, revalidate: async () => ({ id: 99, role: account.role }) } });
  click(changed, 'Delete delivery'); await click(changed, 'Confirm deletion'); assert.equal(writes, 1); assert.match(text(changed.render()), /account has changed/);
  const local = harness({ initialRun: emptyRun(), api }); click(local, 'Delete delivery');
  const save = localStorage.setItem; localStorage.setItem = () => { throw new Error('Storage blocked'); };
  try { await click(local, 'Confirm deletion'); assert.equal(writes, 1); } finally { localStorage.setItem = save; }
});

test('rapid duplicate close clicks submit only one signed request', async () => {
  storage.clear();let writes=0,resolveClose;const api={closeCustomerDeliveryRun:async()=>{writes++;return new Promise(resolve=>{resolveClose=resolve;});}};
  const h=harness({api});await sign(h);const confirm=button(h,'Sign and close delivery').props.onClick;
  const first=confirm(),second=confirm();await flush();assert.equal(writes,1);
  resolveClose(run({status:'CLOSED',delivery:{...receipt(),id:77}}));await Promise.all([first,second]);assert.match(text(h.render()),/Signed and delivered/);
});

async function main() {
  for (const { name, run } of tests) { await run(); console.log(`PASS ${name}`); }
  console.log(`${tests.length} saved customer-delivery checks passed.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
