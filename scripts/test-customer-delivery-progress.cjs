/* Offline delivery preparation progress checks. No network, accounts, stock or database writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderToStaticMarkup } = require('react-dom/server');
const React = require('react');
const navigation = fs.readFileSync(path.join(__dirname, 'test-customer-delivery-navigation.cjs'), 'utf8');
const helpers = { exports: {} };
new Function('require', 'module', '__dirname', `${navigation.slice(0, navigation.indexOf("test('warehouse navigation"))}\nmodule.exports={harness,load,nodes,text,button};`)(require, helpers, __dirname);
const { harness, load, nodes, text, button } = helpers.exports;
const directory = 'app/warehouse/customer-deliveries/';
const tests = [], test = (name, run) => tests.push({ name, run });
const order = (extra = {}) => ({ key: 'external:1', source: 'EXTERNAL', poNumber: '293232', poName: 'Synthetic Project', orderNumber: '',
  totalPieces: 0, totalParts: 0, pendingPieces: 0, pendingParts: 0, unknownPending: false, canRemove: false, ...extra });
const item = (lineNumber, quantity, extra = {}) => ({ lineNumber, barcode: `I${lineNumber}`, source: 'EXTERNAL', poNumber: '293232', poName: 'Synthetic Project', orderNumber: '',
  mark: `M${lineNumber}`, description: 'Single Hung Window - 36 W x 48 H', product: 'Window', system: '175', configuration: 'Single hung', quantity, parts: { WINDOW: quantity }, ...extra });
const run = (extra = {}) => ({ id: 7, status: 'ACTIVE', storeId: 1, storeName: 'Main', multiStore: false,
  createdById: 10, createdBy: 'Synthetic Admin', createdAt: '2026-11-17T12:00:00Z', updatedAt: '2026-11-17T12:00:00Z', closedAt: null, revision: 'r7',
  orders: [order()], items: [], pendingItems: [], totalPieces: 0, totalParts: 0, pendingPieces: 0, pendingParts: 0, hasPending: false,
  deliveryId: null, delivery: null, ...extra });
const mixed = () => run({
  orders: [order({ totalPieces: 2, totalParts: 2, pendingPieces: 2, pendingParts: 5 })],
  items: [item('1001', 1), item('1002', 1)], pendingItems: [item('1001', 2), item('1003', 3)],
  totalPieces: 2, totalParts: 2, pendingPieces: 2, pendingParts: 5, hasPending: true,
});
const data = () => load(directory + 'customer-delivery-progress-data.ts');

test('a partially scanned piece is counted once while scanned and remaining quantities form its expected total', () => {
  const { deliveryPieceProgress, deliveryPoProgress, deliveryProgressTotals } = data();
  const current = mixed(), pieces = deliveryPieceProgress(current);
  assert.equal(pieces.length, 3);
  const partial = pieces.find(piece => piece.item.lineNumber === '1001');
  assert.equal(partial.scanned, 1); assert.equal(partial.pending, 2); assert.equal(partial.expected, 3); assert.equal(partial.state, 'PARTIAL');
  assert.equal(pieces.find(piece => piece.item.lineNumber === '1002').state, 'COMPLETE');
  assert.equal(pieces.find(piece => piece.item.lineNumber === '1003').state, 'PENDING');
  const totals = deliveryProgressTotals(current);
  assert.equal(totals.pieces, 3); assert.equal(totals.scanned, 2); assert.equal(totals.pending, 5); assert.equal(totals.expected, 7); assert.equal(totals.unknown, false);
  const [po] = deliveryPoProgress(current);
  assert.equal(po.pieces.length, 3); assert.equal(po.scanned, 2); assert.equal(po.pending, 5); assert.equal(po.expected, 7);
});

test('unknown remaining quantities never turn a scanned or unscanned piece into Complete', () => {
  const { deliveryPieceProgress, deliveryProgressTotals } = data();
  for (const scanned of [0, 1]) {
    const current = run({ orders: [order({ totalParts: scanned, unknownPending: true, pendingPieces: 1 })],
      items: scanned ? [item('1001', scanned)] : [], pendingItems: [item('1001', 0, { parts: {}, unknownQuantity: true })], totalParts: scanned, pendingPieces: 1, hasPending: true });
    const [piece] = deliveryPieceProgress(current), totals = deliveryProgressTotals(current);
    assert.equal(piece.unknown, true); assert.equal(piece.expected, null); assert.notEqual(piece.state, 'COMPLETE');
    assert.equal(totals.expected, null); assert.equal(totals.unknown, true); assert.equal(totals.pieces, 1);
  }
});

test('internal and external POs sharing a number retain separate piece quantities', () => {
  const { deliveryPoProgress, deliveryPieceProgress } = data();
  const internal = { source: 'ORDER', orderNumber: 'SO-12' };
  const current = run({ orders: [order(), order({ key: 'order:12', ...internal })],
    items: [item('1001', 2), item('1001', 3, internal)], pendingItems: [item('1001', 1, internal)], totalParts: 5, pendingParts: 1 });
  assert.equal(deliveryPieceProgress(current).length, 2);
  const pos = deliveryPoProgress(current);
  assert.equal(pos.find(po => po.order.key === 'external:1').scanned, 2);
  const internalPo = pos.find(po => po.order.key === 'order:12');
  assert.equal(internalPo.scanned, 3); assert.equal(internalPo.pending, 1); assert.equal(internalPo.expected, 4);
});

test('parts from two storages remain one piece and do not double-count the preparation total', () => {
  const { deliveryPieceProgress, deliveryProgressTotals } = data();
  const main = { storeId: 1, storeName: 'Main', quantity: 1, parts: { DOOR: 1 } };
  const overflow = { storeId: 2, storeName: 'Overflow', quantity: 1, parts: { FRAME: 1 } };
  const scanned = item('1001', 2, { parts: { DOOR: 1, FRAME: 1 }, origins: [main, overflow] });
  const current = run({ multiStore: true, storeId: null, storeName: 'Multiple locations', items: [scanned],
    allocations: [{ ...scanned, ...main }, { ...scanned, ...overflow }], totalParts: 2, totalPieces: 1 });
  const [piece] = deliveryPieceProgress(current);
  assert.equal(piece.allocations.length, 2); assert.equal(piece.scanned, 2); assert.equal(piece.state, 'COMPLETE');
  const totals = deliveryProgressTotals(current); assert.equal(totals.scanned, 2); assert.equal(totals.expected, 2); assert.equal(totals.pieces, 1);
});

test('legacy unassigned scans retain their original location for corrections', () => {
  const { deliveryPieceProgress } = data();
  const current = run({ storeId: null, storeName: 'Unassigned', items: [item('1001', 1)], totalParts: 1 });
  const [piece] = deliveryPieceProgress(current);
  assert.equal(piece.allocations.length, 1); assert.equal(piece.allocations[0].storeId, null); assert.equal(piece.allocations[0].storeName, 'Unassigned');
});

test('an empty PO stays visible and unknown PO totals are not labeled as fully prepared', () => {
  const { deliveryPoProgress, deliveryProgressTotals } = data();
  const current = run({ orders: [order({ unknownPending: true })], hasPending: true });
  const [po] = deliveryPoProgress(current);
  assert.equal(po.order.key, 'external:1'); assert.equal(po.pieces.length, 0); assert.equal(po.unknown, true); assert.equal(po.expected, null);
  assert.equal(deliveryProgressTotals(current).expected, null);
});

test('summary describes active scans, manual preparation and closed delivery without changing recorded values', () => {
  const { DeliveryProgressSummary } = load(directory + 'customer-delivery-progress.tsx');
  const current = mixed();
  const active = renderToStaticMarkup(React.createElement(DeliveryProgressSummary, { run: current }));
  assert.match(active, /scanned/i); assert.match(active, /pending/i); assert.doesNotMatch(active, /delivered/i);
  const manual = renderToStaticMarkup(React.createElement(DeliveryProgressSummary, { run: current, manual: true }));
  assert.doesNotMatch(manual, /scanned/i);
  const closed = renderToStaticMarkup(React.createElement(DeliveryProgressSummary, { run: { ...current, status: 'CLOSED' } }));
  assert.match(closed, /delivered/i); assert.match(closed, /pending/i);
});

function progress(current = mixed(), props = {}) {
  const removedPos = [], removedParts = [];
  const h = harness(directory + 'customer-delivery-progress.tsx', 'DeliveryPoProgress', {
    run: current, removePoDisabled: false, removePartDisabled: false,
    onRemovePo: value => removedPos.push(value), onRemovePart: (...values) => removedParts.push(values), ...props,
  });
  // Expand pure presentation children; the stateful accordion itself uses the hook harness.
  const expand = element => {
    if (Array.isArray(element)) return element.map(expand);
    if (!element || typeof element !== 'object') return element;
    if (typeof element.type === 'function') return expand(element.type(element.props));
    return { ...element, props: { ...element.props, children: expand(element.props?.children) } };
  };
  const render = h.render; h.render = () => expand(render());
  return Object.assign(h, { removedPos, removedParts });
}
const toggles = h => nodes(h.render(), node => ['Button', 'button'].includes(node.type) && typeof node.props['aria-expanded'] === 'boolean');

test('PO panels start collapsed, expose all piece states on expansion and retain expansion when progress updates', () => {
  const h = progress();
  assert.equal(toggles(h).length, 1); assert.equal(toggles(h)[0].props['aria-expanded'], false);
  toggles(h)[0].props.onClick();
  assert.equal(toggles(h)[0].props['aria-expanded'], true);
  const shown = text(h.render());
  assert.match(shown, /M1001/); assert.match(shown, /M1002/); assert.match(shown, /M1003/);
  assert.match(shown, /complete/i); assert.match(shown, /partial/i); assert.match(shown, /pending/i);
  h.props.run = { ...mixed(), revision: 'new-progress' }; h.render(); assert.equal(toggles(h)[0].props['aria-expanded'], true);
  h.dispose();
});

test('PO deletion and physical-part correction keep the exact source and respect operation locks', () => {
  const source = { storeId: 2, storeName: 'Overflow', quantity: 1, parts: { DOOR: 1 } };
  const scanned = item('1001', 1, { parts: { DOOR: 1 }, origins: [source] });
  const current = run({ multiStore: true, orders: [order({ canRemove: false }), order({ key: 'external:2', poNumber: '293233', canRemove: true })],
    items: [scanned], allocations: [{ ...scanned, ...source }], totalParts: 1 });
  const h = progress(current); toggles(h)[0].props.onClick();
  const remove = nodes(h.render(), node => ['Button', 'button'].includes(node.type) && /Remove one/i.test(text(node)))[0];
  assert(remove && !remove.props.disabled); remove.props.onClick();
  assert.equal(h.removedParts[0][0].lineNumber, '1001'); assert.equal(h.removedParts[0][1].storeId, 2); assert.equal(h.removedParts[0][2], 'DOOR');
  const removePos = nodes(h.render(), node => ['Button', 'button'].includes(node.type) && /^Remove PO /.test(node.props['aria-label'] ?? ''));
  assert.equal(removePos.length, 2); assert.equal(removePos[0].props.disabled, true); assert.equal(removePos[1].props.disabled, false);
  removePos[1].props.onClick(); assert.equal(h.removedPos[0].key, 'external:2');
  h.props.removePartDisabled = true; h.props.removePoDisabled = true;
  assert(nodes(h.render(), node => ['Button', 'button'].includes(node.type) && /Remove one/i.test(text(node))).every(node => node.props.disabled));
  assert(nodes(h.render(), node => ['Button', 'button'].includes(node.type) && /^Remove PO /.test(node.props['aria-label'] ?? '')).every(node => node.props.disabled));
  h.dispose();
});

(async () => {
  let failures = 0;
  for (const { name, run } of tests) {
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack}`); }
  }
  if (failures) throw new Error(`${failures} delivery progress checks failed.`);
  console.log(`${tests.length} delivery progress checks passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
