/* Exact-PO installation modal ownership checks. Synthetic inventory; no release writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const navigation = fs.readFileSync(path.join(__dirname, 'test-customer-delivery-navigation.cjs'), 'utf8');
const helpers = { exports: {} };
new Function('require', 'module', '__dirname', `${navigation.slice(0, navigation.indexOf("test('warehouse navigation"))}\nmodule.exports={harness,nodes,text,ofType};`)(require, helpers, __dirname);
const { harness, nodes, ofType } = helpers.exports;
const unit = { lineNumber: '1133926', barcode: 'I1133926', source: 'EXTERNAL', externalPoId: 1,
  poNumber: '293232', orderNumber: '', description: 'Sample door', onHand: 2, inTransit: 0,
  released: 0, unassigned: 0, stores: [{id: 1, name: 'Storage 1', onHand: 2}], state: 'PARTIAL' };
const group = { ...unit, key: 'external:1', units: [unit] };
const page = items => ({ items, total: items.length, page: 1, pageSize: 20, activeCountId: null,
  summary: { onHand: items.length * 2, unassigned: 0, inTransit: 0, released: 0 } });
function setup({ pending = null, initial = page([group]) } = {}) {
  let latest = initial; const auth = { user: { id: 10, role: { name: 'admin' } } };
  const h = harness('app/warehouse/inventory-client.tsx', 'InventoryClient', {
    initial, initialSearch: '', initialView: 'on_hand', initialSource: 'all', initialStores: [], initialStoreId: 'all', admin: true,
  }, {
    '@/contexts/AuthContext': { useAuth: () => auth },
    '@/app/api/warehouse.api': { warehouseInventoryByPo: async () => latest, warehouseStores: async () => [] },
    './releases/po-installation-release-dialog': { PoInstallationReleaseDialog: 'PoInstallationReleaseDialog', pendingPoInstallationRelease: () => pending },
    './store-select': { StoreSelect: 'StoreSelect' }, './transfer-form': { TransferForm: 'TransferForm' },
    './release-actions': { WarehouseReleaseActions: 'WarehouseReleaseActions' },
    './unit-origin': { UnitOrigin: 'UnitOrigin', unitOriginLabel: () => 'External PO' },
    './warehouse-shared': { errorMessage: e => e.message, Pagination: 'Pagination', CountNotice: 'CountNotice', storeBreakdown: () => '', dateLabel: () => '' },
  });
  return Object.assign(h, { auth, empty: () => { latest = page([]); } });
}
async function main() {
  const h = setup(); await h.settle();
  const table = nodes(h.render(), n => n.type?.name === 'PoInventoryTable')[0]; assert(table);
  const rows = table.type(table.props);
  const actions = nodes(rows, n => n.type === 'WarehouseReleaseActions'); assert.equal(actions.length, 2);
  actions[0].props.onInstallationRelease(); await h.settle();
  let modal = ofType(h, 'PoInstallationReleaseDialog'); assert(modal); assert.equal(modal.props.poKey, 'external:1'); assert.equal(modal.props.storeId, 'all');
  h.empty(); modal.props.onComplete(); await h.settle();
  assert.equal(nodes(h.render(), n => n.type?.name === 'PoInventoryTable').length, 0);
  modal = ofType(h, 'PoInstallationReleaseDialog'); assert(modal, 'Released PO leaving inventory must not unmount receipt/retry modal');
  modal.props.onOpenChange(false); await h.settle(); assert.equal(ofType(h, 'PoInstallationReleaseDialog'), undefined); h.dispose();
  const recovered = setup({ initial: page([]), pending: { poKey: 'external:1', poLabel: '293232', storeId: 'unassigned' } });
  await recovered.settle(); assert.equal(ofType(recovered, 'PoInstallationReleaseDialog').props.storeId, 'unassigned');
  recovered.auth.user = null; await recovered.settle(); assert.equal(ofType(recovered, 'PoInstallationReleaseDialog'), undefined); recovered.dispose();
  console.log('PASS exact PO opens one inventory-owned modal from desktop/mobile actions');
  console.log('PASS successful refresh keeps the modal mounted after its PO leaves inventory');
  console.log('PASS uncertain release recovers with empty inventory and closes on account change');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
