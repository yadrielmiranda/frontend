/* Isolated AuthProvider regression tests. Loads the real provider, profile API,
 * userView, apiFetch and session-transition code through TypeScript transpilation.
 * React hooks/lifecycle and browser I/O are simulated; HTTP endpoints are mocked.
 * No environment files, network, database, builds or generated application files.
 * Run from frontend: node scripts/test-auth-context.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../src');
const forbiddenNetwork = () => { throw new Error('Network access is forbidden in auth-context tests'); };
globalThis.fetch = forbiddenNetwork;
for (const name of ['node:http', 'node:https']) {
  const transport = require(name);
  transport.request = transport.get = forbiddenNetwork;
}
const response = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json' },
});
const account = (id = 7, role = 'dealer') => ({ id, username: `account-${id}`, firstName: 'Test',
  lastName: 'Account', email: null, phone: null, street: null, city: null, state: null,
  postalCode: null, role: { id: 2, name: role }, isTaxExempt: false });
const notifications = [{ id: 31, message: 'Saved notification', isRead: false }];
const denied = () => response({ message: 'Session revoked.' }, 401);
const failure = (status = 503) => response({ message: 'Backend temporarily unavailable.' }, status);
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const flush = async () => { for (let i = 0; i < 8; i++) await new Promise(setImmediate); };
function eventTarget() {
  const handlers = new Map();
  return {
    events: [],
    addEventListener(name, callback) { if (!handlers.has(name)) handlers.set(name, new Set()); handlers.get(name).add(callback); },
    removeEventListener(name, callback) { handlers.get(name)?.delete(callback); },
    dispatchEvent(event) { this.events.push(event.type); for (const callback of [...(handlers.get(event.type) ?? [])]) callback(event); return true; },
  };
}
function fixture() {
  const queues = new Map(), calls = [], dialogs = [], navigations = [], slots = [], pendingEffects = [], cache = new Map();
  let cursor = 0, tree, value, mounted = false, renderQueued = false, timerId = 0;
  const timers = new Map();
  const children = { type: 'test-children', props: {} };
  const window = Object.assign(eventTarget(), {
    location: { pathname: '/estimates/41', search: '', replace: target => navigations.push(target) },
    sessionStorage: { removeItem() {} }, localStorage: { setItem() {} },
  });
  const document = Object.assign(eventTarget(), { visibilityState: 'visible' });
  const enqueue = (endpoint, ...items) => { const queue = queues.get(endpoint) ?? []; queue.push(...items); queues.set(endpoint, queue); };
  const fetchMock = async (url, init = {}) => {
    const endpoint = new URL(url).pathname;
    calls.push({ endpoint, init });
    const queue = queues.get(endpoint);
    const next = queue?.shift();
    if (next !== undefined) return typeof next === 'function' ? next() : next;
    if (endpoint === '/api/notifications') return response(notifications);
    if (endpoint === '/api/platform-terms/status') return response({ current: null, applies: false, required: false, acceptedAt: null });
    throw new Error(`Unexpected mock endpoint call: ${endpoint}`);
  };
  const same = (left, right) => left && right && left.length === right.length && left.every((item, index) => Object.is(item, right[index]));
  const scheduleRender = () => {
    if (!mounted || renderQueued) return;
    renderQueued = true;
    queueMicrotask(() => { renderQueued = false; if (mounted) render(); });
  };
  const React = {
    Fragment: Symbol('Fragment'),
    createElement(type, props, ...content) { return { type, props: { ...props, ...(content.length ? { children: content.length === 1 ? content[0] : content } : {}) } }; },
    createContext() { return { Provider: Symbol('AuthProvider') }; },
    useContext() { return value; },
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) {
        const slot = { state: typeof initial === 'function' ? initial() : initial };
        slot.set = update => {
          const next = typeof update === 'function' ? update(slot.state) : update;
          if (!Object.is(next, slot.state)) { slot.state = next; scheduleRender(); }
        };
        slots[index] = slot;
      }
      return [slots[index].state, slots[index].set];
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useCallback(callback, deps) {
      const index = cursor++, previous = slots[index];
      if (!previous || !same(previous.deps, deps)) slots[index] = { deps, callback };
      return slots[index].callback;
    },
    useEffect(callback, deps) {
      const index = cursor++, previous = slots[index];
      if (!previous || !same(previous.deps, deps)) {
        const slot = { deps, cleanup: previous?.cleanup };
        slots[index] = slot;
        pendingEffects.push(() => { slot.cleanup?.(); slot.cleanup = callback(); });
      }
    },
  };
  const loginDialog = { openLoginDialog: reason => dialogs.push(reason), closeLoginDialog() {} };
  const setTimer = callback => { const id = ++timerId; timers.set(id, callback); return id; };
  const moduleMocks = {
    react: React,
    'socket.io-client': { io: forbiddenNetwork },
    sonner: { toast: { dismiss() {}, info() {}, error() {} } },
    '@/contexts/LoginDialogContext': { useLoginDialog: () => loginDialog },
    '@/components/auth/auth-loading-screen': { AuthLoadingScreen: 'AuthLoadingScreen' },
    '@/components/auth/session-verification-notice': { SessionVerificationNotice: 'SessionVerificationNotice' },
  };
  function load(filename) {
    filename = path.resolve(filename);
    if (!filename.startsWith(root + path.sep)) throw new Error('Module is outside source directory');
    if (!/\.tsx?$/.test(filename)) filename += fs.existsSync(filename + '.ts') ? '.ts' : '.tsx';
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} }; cache.set(filename, module);
    const javascript = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
    } }).outputText;
    const localRequire = name => {
      if (Object.hasOwn(moduleMocks, name)) return moduleMocks[name];
      if (name.startsWith('@/')) return load(path.join(root, name.slice(2)));
      if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name));
      throw new Error(`Unexpected module dependency: ${name}`);
    };
    new Function('require', 'module', 'exports', 'window', 'document', 'fetch', 'process', 'setTimeout', 'clearTimeout',
      'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', javascript)(
      localRequire, module, module.exports, window, document, fetchMock, { env: {} }, setTimer, id => timers.delete(id),
      setTimer, id => timers.delete(id), setTimer, id => timers.delete(id));
    return module.exports;
  }
  const { AuthProvider } = load(path.join(root, 'contexts/AuthContext.tsx'));
  function render() {
    cursor = 0; tree = AuthProvider({ children }); value = tree.props.value;
    for (const effect of pendingEffects.splice(0)) effect();
  }
  const walk = (node, predicate) => {
    if (!node) return null;
    if (Array.isArray(node)) { for (const child of node) { const found = walk(child, predicate); if (found) return found; } return null; }
    return predicate(node) ? node : walk(node.props?.children, predicate);
  };
  return {
    calls, dialogs, navigations, enqueue, window,
    get value() { return value; },
    notice() { return walk(tree, node => node.type === 'SessionVerificationNotice'); },
    hasChildren() { return Boolean(walk(tree, node => node === children)); },
    async mount(first = response(account())) { enqueue('/api/auth/profile', first); mounted = true; render(); await flush(); },
    async probe() { window.dispatchEvent(new Event('focus')); await flush(); },
    reset() { window.dispatchEvent(new Event('auth:session-reset')); },
    async retry() { const notice = this.notice(); assert.ok(notice, 'Technical failure must expose the retry notice'); await notice.props.onRetry(); await flush(); },
    dispose() { mounted = false; for (const slot of slots) slot?.cleanup?.(); timers.clear(); },
  };
}
const tests = [];
const test = (name, run) => tests.push({ name, run });
const using = run => async () => { const f = fixture(); try { await run(f); } finally { f.dispose(); } };
function assertPreserved(f) {
  assert.equal(f.value.isAuthenticated, true, 'Technical failure must not clear last validated identity');
  assert.equal(f.value.user.id, 7);
  assert.deepEqual(f.value.notifications, notifications);
  assert.equal(f.value.unreadCount, 1);
  assert.deepEqual(f.dialogs, [], 'Technical failure must not announce expiration');
  assert.ok(f.notice(), 'Technical failure must expose retry');
  assert.ok(f.hasChildren(), 'Temporary verification failure preserves the mounted children');
  assert.ok(f.value.error);
  assert.doesNotMatch(f.value.error, /expired|sign in again|backend temporarily unavailable/i);
}
test('initial profile success publishes the normalized real profile and notifications', using(async f => {
  await f.mount(); assert.equal(f.value.user.id, 7); assert.equal(f.value.user.email, '');
  assert.equal(f.value.isAuthenticated, true); assert.equal(f.value.isLoading, false);
  assert.deepEqual(f.value.notifications, notifications); assert.equal(f.notice(), null); assert.ok(f.hasChildren());
  assert.deepEqual(f.calls.map(call => call.endpoint), ['/api/auth/profile', '/api/notifications']);
}));
test('expired access refreshes once and publishes the verified profile normally', using(async f => {
  f.enqueue('/api/auth/refresh', response({ message: 'Refreshed' }));
  f.enqueue('/api/auth/profile', denied(), response(account())); await f.mount();
  assert.equal(f.value.user.id, 7); assert.equal(f.value.isAuthenticated, true); assert.deepEqual(f.dialogs, []);
  assert.equal(f.calls.filter(call => call.endpoint === '/api/auth/refresh').length, 1);
}));
test('initial revoked session stays unauthenticated and silent', using(async f => {
  f.enqueue('/api/auth/refresh', denied()); await f.mount(denied());
  assert.equal(f.value.isAuthenticated, false); assert.equal(f.value.user, null);
  assert.deepEqual(f.dialogs, []); assert.equal(f.notice(), null);
}));
test('revocation during a probe clears profile and notifications and requests login', using(async f => {
  await f.mount(); f.enqueue('/api/auth/profile', denied()); f.enqueue('/api/auth/refresh', denied()); await f.probe();
  assert.equal(f.value.user, null); assert.equal(f.value.isAuthenticated, false);
  assert.deepEqual(f.value.notifications, []); assert.deepEqual(f.dialogs, ['expired']); assert.equal(f.notice(), null);
}));
for (const status of [500, 503, 429, 403]) {
  test(`profile ${status} during probe preserves identity and provides retry`, using(async f => {
    await f.mount(); f.enqueue('/api/auth/profile', failure(status)); await f.probe(); assertPreserved(f);
  }));
}
test('network failure during probe preserves identity and provides retry', using(async f => {
  await f.mount(); f.enqueue('/api/auth/profile', () => { throw new TypeError('Failed to fetch'); }); await f.probe(); assertPreserved(f);
}));
test('technical revalidation rejects instead of returning the cached user', using(async f => {
  await f.mount(); f.enqueue('/api/auth/profile', failure());
  await assert.rejects(f.value.revalidate(), error => !/sign in again|expired/i.test(error.message));
  await flush(); assertPreserved(f);
}));
test('initial technical failure grants no authentication and retry can recover', using(async f => {
  await f.mount(failure()); assert.equal(f.value.user, null); assert.equal(f.value.isAuthenticated, false);
  assert.equal(f.value.isLoading, false); assert.deepEqual(f.dialogs, []); assert.ok(f.hasChildren());
  f.enqueue('/api/auth/profile', response(account())); await f.retry();
  assert.equal(f.value.user.id, 7); assert.equal(f.value.isAuthenticated, true); assert.equal(f.notice(), null); assert.equal(f.value.error, null);
}));
test('retry after a temporary probe failure restores verification and keeps child tree', using(async f => {
  await f.mount(); f.enqueue('/api/auth/profile', failure()); await f.probe();
  f.enqueue('/api/auth/profile', response(account())); await f.retry();
  assert.equal(f.value.user.id, 7); assert.equal(f.notice(), null); assert.equal(f.value.error, null); assert.ok(f.hasChildren());
}));
for (const status of [500, 503, 429]) {
  test(`expired access plus refresh ${status} remains a technical failure`, using(async f => {
    await f.mount(); f.enqueue('/api/auth/profile', denied()); f.enqueue('/api/auth/refresh', failure(status)); await f.probe();
    assertPreserved(f); assert.equal(f.calls.filter(call => call.endpoint === '/api/auth/profile').length, 2);
    assert.ok(!f.window.events.includes('auth:login-required'));
  }));
}
test('refresh transport failure remains technical', using(async f => {
  await f.mount(); f.enqueue('/api/auth/profile', denied()); f.enqueue('/api/auth/refresh', () => { throw new TypeError('Failed to fetch'); });
  await f.probe(); assertPreserved(f);
}));
test('successful refresh followed by profile 503 remains technical', using(async f => {
  await f.mount(); f.enqueue('/api/auth/profile', denied(), failure()); f.enqueue('/api/auth/refresh', response({}));
  await f.probe(); assertPreserved(f);
}));
test('successful refresh followed by profile network failure remains technical', using(async f => {
  await f.mount(); f.enqueue('/api/auth/profile', denied(), () => { throw new TypeError('Failed to fetch'); }); f.enqueue('/api/auth/refresh', response({}));
  await f.probe(); assertPreserved(f);
}));
test('successful refresh followed by profile 401 does not accept the cached account', using(async f => {
  await f.mount(); f.enqueue('/api/auth/profile', denied(), denied()); f.enqueue('/api/auth/refresh', response({})); await f.probe();
  assert.equal(f.value.user, null); assert.deepEqual(f.value.notifications, []); assert.deepEqual(f.dialogs, ['expired']);
  assert.equal(f.calls.filter(call => call.endpoint === '/api/auth/refresh').length, 1);
}));
test('an old technical failure cannot replace a newer successful revalidation', using(async f => {
  await f.mount(); const old = deferred(); f.enqueue('/api/auth/profile', old.promise, response(account()));
  const first = f.value.revalidate(); await flush(); await f.value.revalidate(); await flush();
  old.resolve(failure()); await first.catch(() => undefined); await flush();
  assert.equal(f.value.user.id, 7); assert.equal(f.notice(), null); assert.equal(f.value.error, null); assert.deepEqual(f.dialogs, []);
}));
for (const status of [200, 503, 401]) {
  test(`session reset prevents pending profile ${status} from restoring or changing identity`, using(async f => {
    await f.mount(); const old = deferred(); f.enqueue('/api/auth/profile', old.promise); if (status === 401) f.enqueue('/api/auth/refresh', denied());
    const attempt = f.value.revalidate(); await flush(); f.reset(); old.resolve(status === 200 ? response(account()) : failure(status));
    await attempt.catch(() => undefined); await flush();
    assert.equal(f.value.user, null); assert.equal(f.value.isAuthenticated, false); assert.deepEqual(f.value.notifications, []);
    assert.deepEqual(f.dialogs, []); assert.equal(f.notice(), null); assert.equal(f.hasChildren(), false);
  }));
}
test('a changed account navigates and never enters the prior account tree', using(async f => {
  await f.mount(); f.enqueue('/api/auth/profile', response(account(8))); await f.value.revalidate(); await flush();
  assert.deepEqual(f.navigations, ['/']); assert.equal(f.value.user, null); assert.equal(f.value.isAuthenticated, false); assert.equal(f.hasChildren(), false);
}));
test('notifications arriving after session reset cannot restore the old account data', using(async f => {
  await f.mount(); const pending = deferred(); f.enqueue('/api/notifications', pending.promise);
  const request = f.value.refreshNotifications(); await flush(); f.reset(); pending.resolve(response([{ id: 99, message: 'Old response', isRead: false }]));
  await request; await flush(); assert.deepEqual(f.value.notifications, []); assert.equal(f.value.user, null);
}));
test('401 revalidation remains rejected without opening the silent login dialog', using(async f => {
  await f.mount(); f.enqueue('/api/auth/profile', denied()); f.enqueue('/api/auth/refresh', denied());
  await assert.rejects(f.value.revalidate()); await flush(); assert.equal(f.value.user, null); assert.deepEqual(f.dialogs, []);
}));
test('initial technical failure followed by a rejected retry never authenticates', using(async f => {
  await f.mount(failure()); assert.ok(f.notice());
  f.enqueue('/api/auth/profile', denied()); f.enqueue('/api/auth/refresh', denied());
  await f.notice().props.onRetry().catch(() => null); await flush();
  assert.equal(f.value.user, null); assert.equal(f.value.isAuthenticated, false);
  assert.equal(f.notice(), null); assert.deepEqual(f.value.notifications, []); assert.deepEqual(f.dialogs, []);
}));
test('retry after a validated account failure opens login when revocation is confirmed', using(async f => {
  await f.mount(); f.enqueue('/api/auth/profile', failure()); await f.probe(); assert.ok(f.notice());
  f.enqueue('/api/auth/profile', denied()); f.enqueue('/api/auth/refresh', denied());
  await f.notice().props.onRetry().catch(() => null); await flush();
  assert.equal(f.value.user, null); assert.equal(f.value.isAuthenticated, false);
  assert.deepEqual(f.value.notifications, []); assert.equal(f.notice(), null);
  assert.deepEqual(f.dialogs, ['expired'], 'Known account needs a recovery path once its retry confirms revocation');
}));
test('a transport AbortError preserves the current account without expiration', using(async f => {
  await f.mount();
  f.enqueue('/api/auth/profile', () => { throw new DOMException('The operation was aborted.', 'AbortError'); });
  await f.probe(); assertPreserved(f);
}));
test('malformed successful profile JSON is a verification failure, not expiration', using(async f => {
  await f.mount();
  f.enqueue('/api/auth/profile', new Response('{broken', { status: 200, headers: { 'content-type': 'application/json' } }));
  await f.probe(); assertPreserved(f);
}));
test('malformed profile after successful refresh preserves the current identity', using(async f => {
  await f.mount(); f.enqueue('/api/auth/refresh', response({}));
  f.enqueue('/api/auth/profile', denied(), new Response('{broken', { status: 200, headers: { 'content-type': 'application/json' } }));
  await f.probe(); assertPreserved(f);
}));
test('a confirmed refresh 401 still clears the session when its JSON body is malformed', using(async f => {
  await f.mount(); f.enqueue('/api/auth/profile', denied());
  f.enqueue('/api/auth/refresh', new Response('{broken', { status: 401, headers: { 'content-type': 'application/json' } }));
  await f.probe(); assert.equal(f.value.user, null); assert.equal(f.value.isAuthenticated, false);
  assert.deepEqual(f.value.notifications, []); assert.deepEqual(f.dialogs, ['expired']); assert.equal(f.notice(), null);
}));
test('a second technical retry rejects and does not fake a restored session', using(async f => {
  await f.mount(); f.enqueue('/api/auth/profile', failure()); await f.probe();
  f.enqueue('/api/auth/profile', failure(500));
  await assert.rejects(f.notice().props.onRetry(), error => !/sign in again|expired/i.test(error.message));
  await flush(); assertPreserved(f); assert.deepEqual(f.navigations, []);
}));
test('a confirmed revocation after a technical failure still clears the old account', using(async f => {
  await f.mount(); f.enqueue('/api/auth/profile', failure()); await f.probe(); assert.ok(f.notice());
  f.enqueue('/api/auth/profile', denied()); f.enqueue('/api/auth/refresh', denied()); await f.probe();
  assert.equal(f.value.user, null); assert.equal(f.value.isAuthenticated, false);
  assert.deepEqual(f.value.notifications, []); assert.equal(f.notice(), null); assert.deepEqual(f.dialogs, ['expired']);
}));
test('rejected sign-in credentials do not create a global verification notice', using(async f => {
  f.window.location.pathname = '/login'; f.enqueue('/api/auth/refresh', denied()); await f.mount(denied());
  f.enqueue('/api/auth/login', response({ message: 'Invalid credentials.' }, 401));
  await assert.rejects(f.value.signIn({ identifier: 'test', password: 'not-a-real-password' })); await flush();
  assert.equal(f.value.user, null); assert.equal(f.value.isAuthenticated, false); assert.equal(f.notice(), null);
  assert.equal(f.value.error, 'Invalid credentials.'); assert.deepEqual(f.dialogs, []);
  assert.equal(f.calls.filter(call => call.endpoint === '/api/auth/refresh').length, 1);
}));
test('a valid clean-page sign-in clears a preexisting verification notice', using(async f => {
  f.window.location.pathname = '/login'; await f.mount(failure()); assert.ok(f.notice());
  f.enqueue('/api/auth/login', response({ role: 'dealer' })); f.enqueue('/api/auth/profile', response(account()));
  const result = await f.value.signIn({ identifier: 'test', password: 'not-a-real-password' }); await flush();
  assert.equal(result.id, 7); assert.equal(f.value.user.id, 7); assert.equal(f.value.isAuthenticated, true);
  assert.equal(f.notice(), null); assert.equal(f.value.error, null); assert.equal(f.value.loginTerms.userId, 7);
  assert.deepEqual(f.value.notifications, notifications); assert.deepEqual(f.navigations, []);
}));
test('sign-in after a verified identity still navigates instead of reusing the old tree', using(async f => {
  await f.mount(); f.enqueue('/api/auth/profile', failure()); await f.probe(); assert.ok(f.notice());
  f.window.location.pathname = '/login'; f.enqueue('/api/auth/login', response({ role: 'dealer' }));
  const result = await f.value.signIn({ identifier: 'test', password: 'not-a-real-password' }); await flush();
  assert.equal(result, null); assert.deepEqual(f.navigations, ['/']); assert.equal(f.value.user, null);
  assert.equal(f.value.isAuthenticated, false); assert.equal(f.notice(), null); assert.equal(f.hasChildren(), false);
}));
(async () => {
  let failed = 0;
  for (const { name, run } of tests) {
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { failed++; console.error(`FAIL ${name}: ${error.message}`); }
  }
  console.log(`${tests.length - failed}/${tests.length} auth-context tests passed (real provider/API; simulated lifecycle and I/O).`);
  if (failed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
