/* Offline live-progress races. Fake timers/API only; no network, scans or stock writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const navigation = fs.readFileSync(path.join(__dirname, 'test-customer-delivery-navigation.cjs'), 'utf8');
const helpers = { exports: {} };
new Function('require', 'module', '__dirname', `${navigation.slice(0, navigation.indexOf("test('warehouse navigation"))}\nmodule.exports={harness,flush,run,page};`)(require, helpers, __dirname);
const { harness, flush, run, page } = helpers.exports;
const tests = [], test = (name, run) => tests.push({ name, run });
const timers = new Map(); let timerId = 0;
global.setInterval = (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id; };
global.clearInterval = id => timers.delete(id);
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function live({ props = {}, detail = async id => run({ id, revision: 'fresh' }), list = async query => page([run({ revision: 'fresh' })]) } = {}) {
  const calls = [], receivedRuns = [], receivedLists = [];
  const options = { actorId: 10, actorRole: 'admin', run: run(), list: page([run()]), status: 'ACTIVE', paused: false,
    canRefresh: () => true,
    onRun: value => { receivedRuns.push(value); options.run = value; },
    onList: value => { receivedLists.push(value); options.list = value; }, ...props };
  const h = harness('app/warehouse/customer-deliveries/customer-delivery-progress-refresh.ts', 'useCustomerDeliveryProgressRefresh', options, {
    '@/app/api/customer-delivery-runs.api': {
      customerDeliveryRun: async id => { calls.push({ kind: 'detail', id }); return detail(id); },
      customerDeliveryRuns: async query => { calls.push({ kind: 'list', ...query }); return list(query); },
    },
    '../warehouse-shared': { errorMessage: error => error.message },
  });
  return Object.assign(h, { calls, receivedRuns, receivedLists,
    async tick() { for (const { callback } of [...timers.values()]) callback(); await flush(); return h.settle(); },
  });
}

test('active list refreshes every five seconds using the current status and page without an extra initial request', async () => {
  const h = live({ props: { run: null, list: { ...page([run()]), page: 3, pageSize: 20 }, status: 'CLOSED' } });
  await h.settle(); assert.equal(h.calls.length, 0); assert.equal(timers.size, 1); assert.equal([...timers.values()][0].delay, 5000);
  await h.tick(); assert.deepEqual(h.calls, [{ kind: 'list', status: 'CLOSED', page: 3, pageSize: 20 }]);
  assert.equal(h.receivedLists.length, 1); assert.equal(h.receivedRuns.length, 0); h.dispose(); assert.equal(timers.size, 0);
});

test('active detail receives fresh progress and stops polling when another user closes it', async () => {
  let closed = false;
  const h = live({ detail: async id => run({ id, revision: closed ? 'closed' : 'fresh', status: closed ? 'CLOSED' : 'ACTIVE' }) });
  await h.tick(); assert.equal(h.receivedRuns.length, 1); assert.equal(h.receivedRuns[0].revision, 'fresh');
  closed = true; await h.tick(); assert.equal(h.receivedRuns.at(-1).status, 'CLOSED'); assert.equal(timers.size, 0);
  await h.tick(); assert.equal(h.calls.length, 2); h.dispose();
});

test('an already closed receipt is never polled or replaced', async () => {
  const h = live({ props: { run: run({ status: 'CLOSED' }) } });
  await h.tick(); assert.equal(timers.size, 0); assert.equal(h.calls.length, 0); h.dispose();
});

test('a slow request cannot create overlapping requests on later timer ticks', async () => {
  const pending = deferred(); const h = live({ detail: () => pending.promise });
  await h.tick(); await h.tick(); await h.tick(); assert.equal(h.calls.length, 1);
  pending.resolve(run({ revision: 'fresh' })); await h.settle(); assert.equal(h.receivedRuns.length, 1); h.dispose();
});

test('pausing during a read discards its response even if preparation resumes before that response arrives', async () => {
  const pending = deferred(); let first = true;
  const h = live({ detail: () => first ? (first = false, pending.promise) : Promise.resolve(run({ revision: 'resumed' })) });
  await h.tick(); h.props.paused = true; h.render(); assert.equal(timers.size, 0);
  h.props.paused = false; h.render(); await h.tick(); assert.equal(h.calls.length, 1, 'still only one in-flight request');
  pending.resolve(run({ revision: 'before-pause' })); await h.settle(); assert.equal(h.receivedRuns.length, 0);
  await h.tick(); assert.equal(h.receivedRuns.length, 1); assert.equal(h.receivedRuns[0].revision, 'resumed'); h.dispose();
});

test('a synchronous operation invalidation prevents an old read overwriting a just-saved scan', async () => {
  const pending = deferred(); const h = live({ detail: () => pending.promise });
  await h.tick(); h.render().invalidateProgress();
  pending.resolve(run({ revision: 'older-than-scan', totalParts: 1 })); await h.settle();
  assert.equal(h.receivedRuns.length, 0); h.dispose();
});

test('an updated local run snapshot is not overwritten by an older response for the same ID', async () => {
  const pending = deferred(); const h = live({ detail: () => pending.promise });
  await h.tick(); h.props.run = run({ revision: 'saved-scan', totalParts: 2 }); h.render();
  pending.resolve(run({ revision: 'stale', totalParts: 1 })); await h.settle();
  assert.equal(h.receivedRuns.length, 0); assert.equal(h.props.run.revision, 'saved-scan'); h.dispose();
});

test('late detail results cannot take over another delivery or the list', async () => {
  for (const destination of [null, run({ id: 8 })]) {
    const pending = deferred(); const h = live({ detail: () => pending.promise });
    await h.tick(); h.props.run = destination; h.render();
    pending.resolve(run({ revision: 'old-route' })); await h.settle();
    assert.equal(h.receivedRuns.length, 0); assert.equal(h.props.run?.id, destination?.id); h.dispose();
  }
});

test('late list results cannot overwrite a new page, a new status or an opened delivery', async () => {
  for (const destination of [
    h => { h.props.list = { ...h.props.list, page: 2 }; },
    h => { h.props.status = 'CLOSED'; },
    h => { h.props.run = run({ id: 8 }); },
  ]) {
    const pending = deferred(); const h = live({ props: { run: null }, list: () => pending.promise });
    await h.tick(); destination(h); h.render(); pending.resolve(page([run({ id: 99 })])); await h.settle();
    assert.equal(h.receivedLists.length, 0); h.dispose();
  }
});

test('changing the signed-in account or role discards the previous account response', async () => {
  for (const change of [h => { h.props.actorId = 11; }, h => { h.props.actorRole = 'technician'; }]) {
    const pending = deferred(); const h = live({ detail: () => pending.promise });
    await h.tick(); change(h); h.render(); pending.resolve(run({ revision: 'old-account' })); await h.settle();
    assert.equal(h.receivedRuns.length, 0); h.dispose();
  }
});

test('readiness checks stop requests and reject responses when a pending scan or identity change blocks progress', async () => {
  let allowed = false; const pending = deferred(); const h = live({ props: { canRefresh: () => allowed }, detail: () => pending.promise });
  await h.tick(); assert.equal(h.calls.length, 0); allowed = true; await h.tick(); assert.equal(h.calls.length, 1);
  allowed = false; pending.resolve(run({ revision: 'late' })); await h.settle(); assert.equal(h.receivedRuns.length, 0); h.dispose();
});

test('paused signature, dialog or offline contexts make no background read', async () => {
  const h = live({ props: { paused: true } });
  await h.tick(); assert.equal(h.calls.length, 0); assert.equal(timers.size, 0);
  h.props.paused = false; await h.settle(); await h.tick(); assert.equal(h.calls.length, 1); h.dispose();
});

test('browser connectivity prevents technician reads even when the parent does not pass an offline flag', async () => {
  const pending = deferred(); const h = live({ detail: () => pending.promise });
  navigator.onLine = false;
  await h.tick(); assert.equal(h.calls.length, 0);
  navigator.onLine = true; await h.tick(); assert.equal(h.calls.length, 1);
  navigator.onLine = false; pending.resolve(run({ revision: 'arrived-while-offline' })); await h.settle();
  assert.equal(h.receivedRuns.length, 0); navigator.onLine = true; h.dispose();
});

test('failed refresh preserves the visible snapshot and clears its message after the next successful read', async () => {
  let fail = true;
  const h = live({ detail: async () => { if (fail) throw new Error('Temporary outage'); return run({ revision: 'recovered' }); } });
  const original = h.props.run;
  await h.tick(); assert.equal(h.props.run, original); assert.match(h.render().syncError, /could not be refreshed.*Temporary outage/);
  fail = false; await h.tick(); assert.equal(h.props.run.revision, 'recovered'); assert.equal(h.render().syncError, ''); h.dispose();
});

test('unmount cancels the timer and ignores a pending request completion', async () => {
  const pending = deferred(); const h = live({ detail: () => pending.promise });
  await h.tick(); h.dispose(); assert.equal(timers.size, 0); pending.resolve(run({ revision: 'unmounted' })); await flush();
  assert.equal(h.receivedRuns.length, 0);
});

(async () => {
  let failures = 0;
  for (const { name, run } of tests) {
    timers.clear(); navigator.onLine = true;
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack}`); }
  }
  if (failures) throw new Error(`${failures} delivery live-progress checks failed.`);
  console.log(`${tests.length} delivery live-progress checks passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
