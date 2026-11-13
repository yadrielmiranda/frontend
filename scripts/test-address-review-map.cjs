// Real review/form handlers and Maps loader, with provider/browser boundaries mocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const readFixture = (file, boundary, exports) => new Function('require', '__dirname',
  fs.readFileSync(path.join(__dirname, file), 'utf8').split(boundary)[0] + `\nreturn { ${exports} };`)(require, __dirname);
const { fixture, flush, deferred, resultJob, entered, suggested, text } = readFixture(
  'test-installation-address-confirmation.cjs', '(async () => {', 'fixture, flush, deferred, resultJob, entered, suggested, text');
const { harness } = readFixture('test-address-operations.cjs', "test('warehouse selection", 'harness');
const center = { lat: 25.75, lng: -80.22 };
const point = { lat: 25.7502, lng: -80.2201 };
const location = { status: 'CONFIRM_LOCATION', center, maxAdjustmentMeters: 500 };
const locationError = Object.assign(new Error('Confirm the location.'), { status: 400,
  data: { code: 'ADDRESS_LOCATION_CONFIRMATION_REQUIRED', center, maxAdjustmentMeters: 500 } });
const tests = [], test = (name, run) => tests.push({ name, run });
const selectPin = async f => {
  f.find(node => node.type === 'AddressLocationMap').props.onConfirm(point);
  await flush(); f.render();
};

test('Use this address reviews first without creating an installation or saving its header', async () => {
  let saves = 0;
  const f = await fixture({ beforeRequest: async () => { saves++; return true; }, save: payload => Promise.resolve(resultJob(payload.installationAddress)) });
  assert.equal(f.reviews.length, 1); assert.equal(f.calls.length, 0); assert.equal(saves, 0);
  assert.equal(f.button('Calculate installation').props.disabled, false);
  await f.calculate(); assert.equal(f.calls.length, 1); assert.equal(saves, 1);
});
test('accepting a suggested address reviews it and waits for an explicit calculation', async () => {
  const f = await fixture({ review: (_, address, count) => count === 1
    ? { status: 'CONFIRM_SUGGESTION', suggestedAddress: suggested } : { status: 'VALIDATED', address } });
  assert.equal(f.hasSuggestion(), true); assert.equal(f.calls.length, 0);
  f.click('Use suggested address'); await flush(); f.render();
  assert.equal(f.hasSuggestion(), false); assert.equal(f.calls.length, 0); assert.equal(f.reviews.length, 2);
  assert.equal(f.button('Calculate installation').props.disabled, false);
});
test('ambiguous installation waits for map confirmation and preserves unit and chosen point', async () => {
  const address = { ...entered, addressLine2: 'Apt 4B' };
  const f = await fixture({ suggestedAddress: address, review: (_, a) => a.confirmedLocation
    ? { status: 'VALIDATED', address: a } : location, save: p => Promise.resolve(resultJob(p.installationAddress)) });
  assert.equal(f.button('Calculate installation').props.disabled, true); assert.equal(f.calls.length, 0);
  await selectPin(f); assert.equal(f.calls.length, 0);
  await f.calculate(); assert.deepEqual(f.calls[0].payload.installationAddress, { ...address, confirmedLocation: point });
});
test('installation ZIP correction requires suggestion approval and map confirmation before explicit calculation', async () => {
  const address = { street: '1603 SW 20th Terrace', city: 'Miami', state: 'FL', postalCode: '33175', addressLine2: 'Apt 4B' };
  const corrected = { street: address.street, city: address.city, state: address.state, postalCode: '33145' };
  const correctedWithUnit = { ...corrected, addressLine2: address.addressLine2 };
  let headerSaves = 0;
  const f = await fixture({ suggestedAddress: address,
    beforeRequest: async () => { headerSaves++; return true; },
    review: (_, candidate, count) => {
      if (count === 1) return { status: 'CONFIRM_SUGGESTION', suggestedAddress: corrected };
      if (count === 2) return location;
      assert.equal(count, 3, 'No automatic review loop');
      return { status: 'VALIDATED', address: candidate };
    },
    save: payload => Promise.resolve(resultJob(payload.installationAddress)),
  });
  assert.equal(f.hasSuggestion(), true);
  assert.match(text(f.render()), /33175/); assert.match(text(f.render()), /33145/);
  assert.equal(f.button('Calculate installation').props.disabled, true);
  assert.equal(f.calls.length, 0); assert.equal(headerSaves, 0);

  f.click('Use suggested address'); await flush(); f.render();
  assert.equal(f.hasSuggestion(), false);
  assert.equal(f.control('installation-postalCode').props.value, '33145');
  assert.deepEqual(f.find(node => node.type === 'AddressLocationMap').props.center, center);
  assert.equal(f.button('Calculate installation').props.disabled, true);
  assert.equal(f.calls.length, 0); assert.equal(headerSaves, 0);

  await selectPin(f);
  assert.deepEqual(f.reviews, [address, correctedWithUnit, { ...correctedWithUnit, confirmedLocation: point }]
    .map(candidate => ({ purpose: 'INSTALLATION', address: candidate })));
  assert.equal(f.button('Calculate installation').props.disabled, false);
  assert.equal(f.calls.length, 0); assert.equal(headerSaves, 0);

  await f.calculate();
  assert.equal(f.calls.length, 1); assert.equal(headerSaves, 1);
  assert.deepEqual(f.calls[0].payload.installationAddress, { ...correctedWithUnit, confirmedLocation: point });
  assert.equal(f.calls[0].payload.installationAddressConfirmed, true);
  assert.deepEqual(f.errors, []);
});

test('definitive location rejection returns to the map without an automatic calculation loop', async () => {
  const f = await fixture({ save: (_, count) => count === 1 ? Promise.reject(locationError) : Promise.resolve(resultJob()),
    review: (_, address) => ({ status: 'VALIDATED', address }) });
  await f.calculate(); assert.equal(f.calls.length, 1); assert.equal(f.button('Calculate installation').props.disabled, true);
  await selectPin(f); assert.equal(f.calls.length, 1); assert.equal(f.errors.length, 0);
  await f.calculate(); assert.equal(f.calls.length, 2);
});
test('editing an address removes its pin and invalidates confirmation', async () => {
  const f = await fixture({ suggestedAddress: { ...entered, confirmedLocation: point } });
  f.click('Use a different address'); f.control('installation-street').props.onAddressSelect({ ...entered, confirmedLocation: point }); f.render();
  f.input('installation-city', 'Miami'); f.click('Use this address'); await flush(); f.render();
  assert.equal(f.reviews.at(-1).address.confirmedLocation, undefined);
  assert.equal(f.calls.length, 0);
});
test('stale review is discarded after edits, estimate changes, cancel, and unmount', async () => {
  for (const action of ['edit', 'context', 'cancel', 'unmount']) {
    const pending = deferred();
    const f = await fixture({ review: () => pending.promise });
    if (action === 'edit') { f.click('Use a different address'); f.input('installation-city', 'New city'); }
    if (action === 'context') f.update({ estimateId: 999 });
    if (action === 'cancel') f.click('Cancel');
    if (action === 'unmount') f.unmount();
    pending.resolve({ status: 'CONFIRM_SUGGESTION', suggestedAddress: suggested }); await flush();
    assert.equal(f.hasSuggestion(), false, action); assert.equal(f.calls.length, 0);
  }
});
test('a new address can be reviewed while an older invalidated request is still pending', async () => {
  const pending = deferred();
  const f = await fixture({ review: (_, address, count) => count === 1 ? pending.promise : { status: 'VALIDATED', address } });
  f.click('Use a different address'); f.control('installation-street').props.onAddressSelect(entered); f.render();
  f.click('Use this address'); await flush(); f.render();
  assert.equal(f.reviews.length, 2); assert.equal(f.button('Calculate installation').props.disabled, false);
  pending.resolve(location); await flush(); f.render();
  assert.equal(f.button('Calculate installation').props.disabled, false);
});
test('review double clicks make one request; a provider outage never enables calculation', async () => {
  const pending = deferred(); const f = await fixture({ review: () => pending.promise });
  const use = f.button('Use this address').props.onClick; use(); use(); await flush();
  assert.equal(f.reviews.length, 1);
  pending.reject(new Error('Verification temporarily unavailable')); await flush(); f.render();
  assert.equal(f.button('Calculate installation').props.disabled, true);
  assert.match(text(f.render()), /Verification temporarily unavailable/);
});

function delivery(type, review, create) {
  const calls = [], reviews = [];
  const order = { id: 11, idEst: 10, user: { ...entered, role: { name: 'client' } }, estimate: {},
    status: { name: type === 'REDELIVERY' ? 'Delivered' : 'Preparing for pickup' }, deliveries: [], fulfillmentMethod: null };
  const h = harness('components/orders/order-delivery-panel.tsx', 'OrderDeliveryPanel', {
    order, installation: ['PRE_DELIVERY', 'INSTALLATION_OVERRIDE'].includes(type) ? { status: 'DEPOSIT_PAYMENT_PENDING' } : null,
    isOwner: true, isPrivileged: true, isAdmin: true, cardSurchargeFraction: 0.03, canRecordManualPayment: false, paymentTarget: null,
  }, { '@/app/api/address-confirmations.api': { reviewAddress: (purpose, address) => {
    reviews.push({ purpose, address }); return review ? review(address) : Promise.resolve({ status: 'VALIDATED', address });
  } }, '@/app/api/orders.api': { createOrderDelivery: (id, payload) => { calls.push({ id, payload });
    return create ? create(payload) : Promise.resolve({ id: 99, type, status: 'CANCELED', amount: '100' }); } } });
  const labels = { STANDARD: 'Calculate delivery', PRE_DELIVERY: 'Add separate pre-delivery', INSTALLATION_OVERRIDE: 'Charge delivery with installation', REDELIVERY: 'Add redelivery charge' };
  h.click(labels[type]);
  if (type !== 'STANDARD') h.input('delivery-internal-reason', 'Keep this reason');
  return { ...h, order, calls, reviews,
    controller: () => h.find(node => node.type === 'AddressConfirmationPanel').props.confirmation,
    async verify() { h.click('Use this address'); await flush(); h.render(); },
    async calculate() { h.click('Calculate delivery charge'); await flush(); h.render(); },
  };
}
for (const type of ['STANDARD', 'PRE_DELIVERY', 'INSTALLATION_OVERRIDE', 'REDELIVERY']) {
  test(`${type} delivery confirms a location before creating its charge, preserving details`, async () => {
    const f = delivery(type, async address => address.confirmedLocation ? { status: 'VALIDATED', address } : location);
    f.input('delivery-address-line2', 'Suite 2'); await f.verify();
    assert.equal(f.calls.length, 0); assert.equal(f.controller().state.kind, 'location');
    await f.controller().review({ ...f.reviews[0].address, confirmedLocation: point }); f.render();
    assert.equal(f.calls.length, 0); await f.calculate();
    assert.deepEqual(f.calls[0].payload.confirmedLocation, point); assert.equal(f.calls[0].payload.addressLine2, 'Suite 2');
    assert.equal(f.calls[0].payload.internalReason, type === 'STANDARD' ? undefined : 'Keep this reason');
  });
}
test('delivery context changes discard late review and final create responses', async () => {
  const pending = deferred(); const f = delivery('STANDARD', () => pending.promise); await f.verify();
  f.update({ order: { ...f.order, id: 22 } }); pending.resolve({ status: 'VALIDATED', address: entered }); await flush();
  assert.equal(f.controller().isConfirmed, false); assert.equal(f.calls.length, 0);
  const charge = deferred(); const g = delivery('STANDARD', null, () => charge.promise); await g.verify();
  const click = g.button('Calculate delivery charge').props.onClick; click(); click(); await flush(); assert.equal(g.calls.length, 1);
  g.update({ order: { ...g.order, id: 23 } }); charge.reject(locationError); await flush();
  assert.equal(g.controller().state.kind, 'idle'); assert.deepEqual(g.errors, []);
});

function loaderFixture() {
  const browser = {}, scripts = [], timers = new Map(); let nextTimer = 0;
  const doc = { createElement: () => ({ remove() { this.removed = true; } }), querySelector: () => null,
    head: { appendChild: script => scripts.push(script) } };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/google-address-map.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('module', 'exports', 'window', 'document', 'process', 'setTimeout', 'clearTimeout', code)(module, module.exports,
    browser, doc, { env: { NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'test-only-placeholder', NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: 'test-map' } },
    callback => { timers.set(++nextTimer, callback); return nextTimer; }, id => timers.delete(id));
  return { api: module.exports, browser, scripts, timers };
}
test('map loader is lazy, shared, retryable, and reports authentication failure after loading', async () => {
  const f = loaderFixture(); assert.equal(f.scripts.length, 0);
  const first = f.api.loadAddressMap(), second = f.api.loadAddressMap(); assert.equal(first, second); assert.equal(f.scripts.length, 1);
  f.scripts[0].onerror(); await assert.rejects(first, /could not load/);
  const retry = f.api.loadAddressMap(); assert.equal(f.scripts.length, 2);
  f.browser.google = { maps: { marker: { AdvancedMarkerElement() {} } } }; f.browser.__impactAddressMapReady();
  await retry; let failure; f.api.onAddressMapAuthFailure(message => { failure = message; }); f.browser.gm_authFailure();
  assert.match(failure, /unavailable/); await assert.rejects(f.api.loadAddressMap(), /unavailable/);
});
test('location distance retains the inclusive 500 meter boundary', () => {
  const { locationDistanceMeters } = loaderFixture().api;
  const boundary = { ...center, lat: center.lat + 500 / 6371000 * 180 / Math.PI };
  assert.ok(locationDistanceMeters(center, boundary) <= 500 + 1e-6);
  assert.ok(locationDistanceMeters(center, { ...boundary, lat: center.lat + 500.01 / 6371000 * 180 / Math.PI }) > 500 + 1e-6);
});

function mapFixture() {
  const events = {}, removed = [], confirmed = [];
  let pin, authFailure;
  const api = loaderFixture().api;
  const h = harness('components/address-location-map.tsx', 'AddressLocationMap', {
    center, maxAdjustmentMeters: 500, disabled: false, onConfirm: value => confirmed.push(value),
  }, { '@/lib/google-address-map': {
    ...api,
    onAddressMapAuthFailure: callback => { authFailure = callback; return () => removed.push('auth'); },
    loadAddressMap: async () => ({
      Map: class { addListener(name, callback) { events[name] = callback; return { remove: () => removed.push(name) }; } },
      marker: { AdvancedMarkerElement: class {
        constructor(options) { Object.assign(this, options); pin = this; }
        addListener(name, callback) { events[name] = callback; return { remove: () => removed.push(name) }; }
      } },
    }),
  } });
  h.render();
  h.find(node => node.props?.['aria-label'] === 'Address location map').props.ref.current = {};
  return { ...h, events, removed, confirmed, pin: () => pin, failAuth: () => authFailure('Map authorization failed') };
}
test('map waits for visible tiles, supports click and drag, and removes listeners on unmount', async () => {
  const f = mapFixture(); await flush();
  assert.match(text(f.render()), /Loading location map/);
  assert.doesNotMatch(text(f.render()), /Confirm this location/);
  assert.equal(f.pin().gmpDraggable, false);
  f.events.tilesloaded({}); f.render(); assert.equal(f.pin().gmpDraggable, true);
  f.events.click({ latLng: { lat: () => point.lat, lng: () => point.lng } });
  f.click('Confirm this location'); assert.deepEqual(f.confirmed[0], point);
  f.pin().position = { ...point, lat: point.lat + 0.0001 }; f.events.dragend();
  f.click('Confirm this location'); assert.deepEqual(f.confirmed[1], f.pin().position);
  f.update({ disabled: true }); assert.equal(f.pin().gmpDraggable, false);
  assert.equal(f.button('Confirm this location').props.disabled, true);
  f.unmount(); assert.deepEqual(f.removed.sort(), ['auth', 'click', 'dragend', 'tilesloaded']); assert.equal(f.pin().map, null);
});
test('authentication failure hides confirmation even after a map was displayed', async () => {
  const f = mapFixture(); await flush(); f.events.tilesloaded({}); f.render();
  f.failAuth(); assert.match(text(f.render()), /Map authorization failed/);
  assert.doesNotMatch(text(f.render()), /Confirm this location/); assert.equal(f.pin().gmpDraggable, false);
  f.unmount();
});
test('blocked map tiles time out without enabling confirmation and can be retried', async () => {
  const originalSet = global.setTimeout, originalClear = global.clearTimeout;
  const timers = new Map(); let id = 0;
  global.setTimeout = callback => { timers.set(++id, callback); return id; };
  global.clearTimeout = timer => timers.delete(timer);
  try {
    const f = mapFixture(); await flush(); assert.equal(timers.size, 1);
    [...timers.values()][0](); f.render(); assert.match(text(f.render()), /map could not be displayed/);
    f.events.tilesloaded({}); assert.doesNotMatch(text(f.render()), /Confirm this location/);
    f.click('Retry map'); f.render(); await flush(); f.events.tilesloaded({});
    assert.match(text(f.render()), /Confirm this location/); f.unmount();
  } finally { global.setTimeout = originalSet; global.clearTimeout = originalClear; }
});

(async () => {
  for (const { name, run } of tests) { await run(); console.log(`PASS ${name}`); }
  console.log(`${tests.length} address review and map tests passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
