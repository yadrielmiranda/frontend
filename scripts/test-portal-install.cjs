// Exercise the real browser controller, provider, worker and manifest without a network.
/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node regression suite. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const tests = [];
const test = (name, run) => tests.push({ name, run });
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
global.fetch = () => { throw new Error('External network is forbidden in this suite'); };

function load(relative, mocks = {}) {
  const filename = path.join(root, relative);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', source)(id => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id === '@/lib/portal-install') return load('src/lib/portal-install.ts');
    if (id.startsWith('@/')) throw new Error(`Unmocked application dependency: ${id}`);
    return require(id);
  }, loaded, loaded.exports);
  return loaded.exports;
}
const api = load('src/lib/portal-install.ts');
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
function events() {
  const listeners = new Map();
  return {
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
    },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
    emit(type, event = {}) { for (const callback of [...(listeners.get(type) ?? [])]) callback(event); },
    count(type) { return listeners.get(type)?.size ?? 0; },
  };
}
function browser(options = {}) {
  const registrations = [];
  const display = { ...events(), matches: !!options.standalone };
  const navigator = {
    userAgent: options.userAgent ?? 'Mozilla/5.0 Windows Chrome/130',
    maxTouchPoints: options.maxTouchPoints ?? 0,
    standalone: !!options.iosStandalone,
    serviceWorker: { register(...args) { registrations.push(args); return Promise.resolve({}); } },
    ...(options.navigator ?? {}),
  };
  const window = {
    ...events(), navigator,
    isSecureContext: options.secure !== false,
    location: { pathname: options.pathname ?? '/' },
    matchMedia(query) { assert.equal(query, '(display-mode: standalone)'); return display; },
  };
  return { window, display, registrations, controller: api.createPortalInstallController(window) };
}
function installEvent(options = {}) {
  const choice = deferred();
  let prompts = 0, prevented = 0;
  const event = {
    preventDefault() { prevented++; },
    prompt() { prompts++; return options.prompt ? options.prompt() : Promise.resolve(); },
    userChoice: choice.promise,
  };
  return { event, choice, prompts: () => prompts, prevented: () => prevented };
}
const snapshot = f => f.controller.getSnapshot();

test('start is passive, idempotent and registers only the root worker without storage', () => {
  const f = browser();
  assert.deepEqual(snapshot(f), api.INITIAL_PORTAL_INSTALL_STATE);
  const stop = f.controller.start(); f.controller.start();
  assert.deepEqual(f.registrations, [['/portal-sw.js', { scope: '/', updateViaCache: 'none' }]]);
  assert.equal(f.window.count('beforeinstallprompt'), 1);
  assert.equal(f.window.count('appinstalled'), 1);
  assert.equal(f.display.count('change'), 1);
  assert.deepEqual(snapshot(f), { ready: true, installed: false, installing: false, help: null });
  stop();
  assert.equal(f.window.count('beforeinstallprompt'), 0);
  assert.equal(f.window.count('appinstalled'), 0);
  assert.equal(f.display.count('change'), 0);
  assert.deepEqual(snapshot(f), api.INITIAL_PORTAL_INSTALL_STATE);
});

test('login and menu cannot consume the same prompt twice, and invocation retains user activation', async () => {
  const f = browser(), prompt = installEvent(); f.controller.start();
  f.window.emit('beforeinstallprompt', prompt.event);
  assert.equal(prompt.prevented(), 1); assert.equal(prompt.prompts(), 0);
  const clicked = f.controller.requestInstall();
  assert.equal(prompt.prompts(), 1, 'Prompt must be called synchronously in the user gesture');
  assert.equal(snapshot(f).installing, true);
  await f.controller.requestInstall();
  assert.equal(prompt.prompts(), 1);
  prompt.choice.resolve({ outcome: 'accepted' }); await clicked;
  assert.equal(snapshot(f).installed, true); assert.equal(snapshot(f).installing, false);
  await f.controller.requestInstall(); assert.equal(prompt.prompts(), 1);
});

test('dismissal consumes its prompt, stays uninstalled and waits for a fresh event', async () => {
  const f = browser(), first = installEvent(); f.controller.start();
  f.window.emit('beforeinstallprompt', first.event);
  const clicked = f.controller.requestInstall(); first.choice.resolve({ outcome: 'dismissed' }); await clicked;
  assert.deepEqual(snapshot(f), { ready: true, installed: false, installing: false, help: null });
  await f.controller.requestInstall();
  assert.equal(first.prompts(), 1); assert.deepEqual(snapshot(f).help, { kind: 'desktop', failed: false });
  f.controller.closeHelp(); assert.equal(snapshot(f).help, null);
  const next = installEvent(); f.window.emit('beforeinstallprompt', next.event);
  const retried = f.controller.requestInstall(); next.choice.resolve({ outcome: 'accepted' }); await retried;
  assert.equal(next.prompts(), 1); assert.equal(snapshot(f).installed, true);
});

test('a rejected prompt is never retried and genuine failures provide a manual guide', async () => {
  for (const name of ['AbortError', 'NotAllowedError', 'Error']) {
    const f = browser(); f.controller.start();
    const prompt = installEvent({ prompt: () => Promise.reject(Object.assign(new Error('Rejected'), { name })) });
    f.window.emit('beforeinstallprompt', prompt.event); await f.controller.requestInstall();
    assert.equal(snapshot(f).installed, false); assert.equal(snapshot(f).installing, false);
    assert.deepEqual(snapshot(f).help, name === 'Error' ? { kind: 'desktop', failed: true } : null);
    await f.controller.requestInstall(); assert.equal(prompt.prompts(), 1);
  }
});

test('native install is called with its navigator, once per gesture, ahead of the legacy prompt', async () => {
  const result = deferred(), receivers = []; let calls = 0;
  const f = browser({ navigator: { install() { calls++; receivers.push(this); return result.promise; } } });
  f.controller.start(); const prompt = installEvent(); f.window.emit('beforeinstallprompt', prompt.event);
  const clicked = f.controller.requestInstall();
  assert.equal(calls, 1); assert.equal(receivers[0], f.window.navigator); assert.equal(prompt.prompts(), 0);
  await f.controller.requestInstall(); assert.equal(calls, 1);
  result.resolve(); await clicked; assert.equal(snapshot(f).installed, true);
});

test('native cancellation and failure never claim installation and release the click guard', async () => {
  for (const name of ['AbortError', 'NotAllowedError', 'Error']) {
    let calls = 0;
    const f = browser({ navigator: { install() { calls++; return Promise.reject(Object.assign(new Error('Rejected'), { name })); } } });
    f.controller.start(); await f.controller.requestInstall();
    assert.equal(snapshot(f).installed, false); assert.equal(snapshot(f).installing, false);
    assert.equal(snapshot(f).help?.failed ?? false, name === 'Error');
    await f.controller.requestInstall(); assert.equal(calls, 2);
  }
});

test('existing standalone installations and appinstalled or display events hide installation', async () => {
  for (const options of [{ standalone: true }, { iosStandalone: true }]) {
    const f = browser(options); f.controller.start();
    const prompt = installEvent(); f.window.emit('beforeinstallprompt', prompt.event);
    await f.controller.requestInstall();
    assert.equal(snapshot(f).installed, true); assert.equal(prompt.prevented(), 0); assert.equal(prompt.prompts(), 0);
  }
  for (const event of ['appinstalled', 'display']) {
    const f = browser(); f.controller.start(); await f.controller.requestInstall();
    assert.ok(snapshot(f).help);
    if (event === 'display') { f.display.matches = true; f.display.emit('change'); }
    else f.window.emit('appinstalled');
    assert.equal(snapshot(f).installed, true); assert.equal(snapshot(f).help, null);
  }
});

test('appinstalled wins over a late dismissal or failure from an outstanding prompt', async () => {
  for (const outcome of ['dismissed', 'error']) {
    const f = browser(), prompt = installEvent(); f.controller.start();
    f.window.emit('beforeinstallprompt', prompt.event); const clicked = f.controller.requestInstall();
    await Promise.resolve(); f.window.emit('appinstalled');
    if (outcome === 'error') prompt.choice.reject(new Error('Late failure'));
    else prompt.choice.resolve({ outcome });
    await clicked;
    assert.equal(snapshot(f).installed, true); assert.equal(snapshot(f).help, null); assert.equal(snapshot(f).installing, false);
  }
});

test('stop and restart invalidate old asynchronous outcomes and do not replace a new prompt', async () => {
  for (const outcome of ['accepted', 'error']) {
    const f = browser(), old = installEvent(); f.controller.start();
    f.window.emit('beforeinstallprompt', old.event); const oldClick = f.controller.requestInstall();
    await Promise.resolve(); f.controller.stop(); f.controller.start();
    const current = installEvent(); f.window.emit('beforeinstallprompt', current.event);
    const currentClick = f.controller.requestInstall();
    if (outcome === 'error') old.choice.reject(new Error('Obsolete result'));
    else old.choice.resolve({ outcome });
    await oldClick;
    assert.equal(snapshot(f).installed, false); assert.equal(snapshot(f).installing, true); assert.equal(snapshot(f).help, null);
    current.choice.resolve({ outcome: 'accepted' }); await currentClick;
    assert.equal(snapshot(f).installed, true); assert.equal(current.prompts(), 1);
  }
});

test('manual guidance identifies iPhone, desktop-mode iPad, Android, Mac Safari and desktop', async () => {
  const cases = [
    [{ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18) AppleWebKit Safari' }, 'ios'],
    [{ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit Safari', maxTouchPoints: 5 }, 'ios'],
    [{ userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/130' }, 'android'],
    [{ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit Version/17 Safari' }, 'mac-safari'],
    [{ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit Chrome/130 Safari' }, 'desktop'],
    [{ userAgent: 'Mozilla/5.0 Windows Firefox/130' }, 'desktop'],
  ];
  for (const [options, kind] of cases) {
    const f = browser(options); f.controller.start(); await f.controller.requestInstall();
    assert.deepEqual(snapshot(f).help, { kind, failed: false });
    assert.equal(snapshot(f).installed, false);
  }
});

test('insecure contexts never register or prompt and receive HTTPS guidance', async () => {
  let nativeCalls = 0;
  const f = browser({ secure: false, navigator: { install() { nativeCalls++; return Promise.resolve(); } } });
  f.controller.start(); const prompt = installEvent(); f.window.emit('beforeinstallprompt', prompt.event);
  await f.controller.requestInstall();
  assert.equal(f.registrations.length, 0); assert.equal(nativeCalls, 0); assert.equal(prompt.prompts(), 0); assert.equal(prompt.prevented(), 0);
  assert.deepEqual(snapshot(f).help, { kind: 'secure-site', failed: false });
});

test('a browser without worker support or with registration denied retains installation guidance', async () => {
  for (const serviceWorker of [undefined, { register: () => Promise.reject(new Error('Policy denied')) }]) {
    const f = browser();
    if (serviceWorker) f.window.navigator.serviceWorker = serviceWorker;
    else delete f.window.navigator.serviceWorker;
    f.controller.start(); await f.controller.requestInstall();
    assert.equal(snapshot(f).ready, true); assert.deepEqual(snapshot(f).help, { kind: 'desktop', failed: false });
  }
});

test('technical, public and company routes neither consume portal prompts nor invoke installation', async () => {
  for (const pathname of ['/technician', '/technician/jobs/1', '/public/estimates/token', '/company']) {
    assert.equal(api.isPortalInstallPath(pathname), false);
    const f = browser({ pathname }); f.controller.start(); const prompt = installEvent();
    f.window.emit('beforeinstallprompt', prompt.event); await f.controller.requestInstall();
    assert.equal(f.registrations.length, 0); assert.equal(prompt.prevented(), 0); assert.equal(prompt.prompts(), 0); assert.equal(snapshot(f).help, null);
    f.controller.stop();
  }
  for (const pathname of ['/', '/login', '/estimates/1', '/technician-notes']) assert.equal(api.isPortalInstallPath(pathname), true);
  const f = browser(); f.controller.start(); const prompt = installEvent();
  f.window.emit('beforeinstallprompt', prompt.event); f.window.location.pathname = '/technician';
  await f.controller.requestInstall(); assert.equal(prompt.prompts(), 0);
});

test('external-store subscriptions are removable and stopping clears an unconsumed prompt', async () => {
  const f = browser(); let notifications = 0;
  const unsubscribe = f.controller.subscribe(() => notifications++);
  f.controller.start(); assert.equal(notifications, 1);
  const prompt = installEvent(); f.window.emit('beforeinstallprompt', prompt.event); f.controller.stop();
  unsubscribe(); const previous = notifications; f.controller.start(); await f.controller.requestInstall();
  assert.equal(notifications, previous); assert.equal(prompt.prompts(), 0); assert.ok(snapshot(f).help);
});

const ui = new Proxy({}, { get: (_, name) => name });
const jsx = (type, props) => ({ type, props });
function providerFixture(pathname = '/') {
  const f = browser({ pathname }), stateSlots = [], effects = [];
  let stateIndex = 0, effectIndex = 0, pendingEffects = [];
  const hooks = {
    createContext: value => ({ Provider: 'InstallContext', value }),
    useContext: context => context.value,
    useState(initial) { const slot = stateIndex++; if (!(slot in stateSlots)) stateSlots[slot] = initial(); return [stateSlots[slot], () => {}]; },
    useSyncExternalStore: (_, getSnapshot) => getSnapshot(),
    useEffect(callback, deps) {
      const slot = effectIndex++, previous = effects[slot];
      if (!previous || deps.some((value, index) => value !== previous.deps[index])) {
        pendingEffects.push(() => { previous?.cleanup?.(); effects[slot] = { deps, cleanup: callback() }; });
      }
    },
  };
  const { PortalInstallProvider } = load('src/components/pwa/portal-install-provider.tsx', {
    react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { usePathname: () => f.window.location.pathname },
    'lucide-react': ui, '@/components/ui/button': ui, '@/components/ui/dialog': ui,
    '@/lib/portal-install': { ...api, createPortalInstallController: () => f.controller },
  });
  function render() {
    const previousWindow = global.window; global.window = f.window;
    try {
      let tree;
      for (let pass = 0; pass < 2; pass++) {
        stateIndex = effectIndex = 0; pendingEffects = [];
        tree = PortalInstallProvider({ children: 'Portal content' }); pendingEffects.forEach(effect => effect());
      }
      return tree;
    } finally { if (previousWindow === undefined) delete global.window; else global.window = previousWindow; }
  }
  return { ...f, render, route(next) { f.window.location.pathname = next; return render(); }, unmount() { effects.forEach(effect => effect.cleanup?.()); } };
}

test('global provider shares one controller across portal navigation and detaches completely for technicians', async () => {
  const f = providerFixture(); assert.equal(f.render().props.value.visible, true);
  const prompt = installEvent(); f.window.emit('beforeinstallprompt', prompt.event);
  assert.equal(f.route('/estimates/1').props.value.visible, true); assert.equal(f.registrations.length, 1);
  assert.equal(f.route('/technician').props.value.visible, false);
  assert.equal(f.window.count('beforeinstallprompt'), 0); assert.equal(f.window.count('appinstalled'), 0);
  const technicianPrompt = installEvent(); f.window.emit('beforeinstallprompt', technicianPrompt.event);
  assert.equal(technicianPrompt.prevented(), 0);
  const portal = f.route('/login'); await portal.props.value.requestInstall();
  assert.equal(prompt.prompts(), 0, 'Returning to portal must not reuse an old captured event');
  assert.deepEqual(snapshot(f).help, { kind: 'desktop', failed: false });
  f.unmount(); assert.equal(f.window.count('beforeinstallprompt'), 0);
});

test('provider starts inactive for technician, public document and company entry points', () => {
  for (const pathname of ['/technician', '/technician/jobs', '/public/estimates/token', '/company']) {
    const f = providerFixture(pathname); assert.equal(f.render().props.value.visible, false);
    assert.equal(f.registrations.length, 0); assert.equal(f.window.count('beforeinstallprompt'), 0); f.unmount();
  }
});

test('the actual manual guide renders Safari steps, offline limits and safe non-submitting dismissal', () => {
  const components = { Button: 'button' };
  for (const name of ['Dialog', 'DialogContent', 'DialogDescription', 'DialogFooter', 'DialogHeader', 'DialogTitle']) {
    components[name] = ({ children }) => React.createElement('div', null, children);
  }
  const { PortalInstallProvider } = load('src/components/pwa/portal-install-provider.tsx', {
    'next/navigation': { usePathname: () => '/' },
    'lucide-react': { Download: () => null }, '@/components/ui/button': components, '@/components/ui/dialog': components,
    '@/lib/portal-install': { ...api, INITIAL_PORTAL_INSTALL_STATE: { ready: true, installed: false, installing: false, help: { kind: 'ios', failed: false } } },
  });
  const html = renderToStaticMarkup(React.createElement(PortalInstallProvider, null, 'Portal content'));
  for (const text of ['Safari', 'Share', 'Add to Home Screen', 'Open as Web App', 'internet connection is required', 'usual account']) assert.ok(html.includes(text));
  assert.match(html, /<button type="button"[^>]*>Got it<\/button>/);
});

test('login and menu buttons invoke the shared controller, do not submit forms and suppress duplicate clicks', async () => {
  let calls = 0, selections = 0;
  const state = { visible: true, installing: false, requestInstall: async () => { calls++; } };
  const { PortalInstallButton, PortalInstallMenuItem } = load('src/components/pwa/portal-install-button.tsx', {
    'lucide-react': ui, '@/components/ui/button': ui, '@/components/ui/dropdown-menu': ui,
    '@/components/pwa/portal-install-provider': { usePortalInstall: () => state },
  });
  const button = PortalInstallButton({}).props.children[0];
  assert.equal(button.props.type, 'button'); button.props.onClick(); assert.equal(calls, 1);
  const menu = PortalInstallMenuItem({ onSelected: () => selections++ });
  assert.equal(menu.props.children.props.type, 'button'); menu.props.onSelect(); assert.equal(calls, 2); assert.equal(selections, 1);
  assert.ok(menu.props.children.props.children.includes('Install app'));
  assert.ok(PortalInstallMenuItem({ locale: 'es' }).props.children.props.children.includes('Instalar aplicación'));
  state.installing = true;
  const busyButton = PortalInstallButton({}).props.children[0], busyMenu = PortalInstallMenuItem({ onSelected: () => selections++ });
  assert.equal(busyButton.props.disabled, true); assert.equal(busyButton.props['aria-busy'], true); assert.equal(busyMenu.props.disabled, true);
  assert.ok(PortalInstallMenuItem({ locale: 'es' }).props.children.props.children.includes('Instalando…'));
  busyButton.props.onClick(); busyMenu.props.onSelect(); assert.equal(calls, 2); assert.equal(selections, 1);
  state.visible = false; assert.equal(PortalInstallButton({}), null); assert.equal(PortalInstallMenuItem({}), null);
});

function worker(fetchResult = () => Promise.resolve(new Response('online'))) {
  const listeners = new Map(), calls = [];
  const forbidden = new Proxy({}, { get() { throw new Error('Worker must not cache, claim clients or mutate browser state'); } });
  vm.runInNewContext(read('public/portal-sw.js'), {
    URL, Response,
    self: { location: { origin: 'https://portal.example' }, clients: forbidden,
      skipWaiting() { throw new Error('Worker must not replace the active technician worker'); },
      addEventListener(name, callback) { assert.equal(listeners.has(name), false); listeners.set(name, callback); } },
    caches: forbidden,
    fetch(...args) { calls.push(args); return fetchResult(...args); },
  }, { filename: 'portal-sw.js' });
  function navigate(url = '/', overrides = {}) {
    let response;
    const request = { method: 'GET', mode: 'navigate', url: new URL(url, 'https://portal.example').href, ...overrides };
    listeners.get('fetch')({ request, respondWith(value) { assert.equal(response, undefined); response = Promise.resolve(value); } });
    return { request, response };
  }
  return { listeners, calls, navigate };
}

test('the worker forwards authenticated navigations without caching and preserves all HTTP results', async () => {
  for (const status of [200, 401, 403, 404, 500]) {
    const response = new Response('Actual server response', { status });
    const f = worker(() => Promise.resolve(response)); const nav = f.navigate('/estimates/123');
    assert.equal(await nav.response, response); assert.equal(f.calls.length, 1);
    assert.equal(f.calls[0][0], nav.request); assert.equal(f.calls[0][1].cache, 'no-store');
    assert.deepEqual([...f.listeners.keys()], ['fetch'], 'No activation claiming or precache installation handlers');
  }
});

test('worker never intercepts APIs, technicians, public documents, assets, mutations or downloads', () => {
  const f = worker(() => { throw new Error('Excluded requests must bypass this worker'); });
  const urls = ['/api', '/api/auth/me', '/%61pi/orders', '/technician', '/technician/jobs/1', '/%74echnician',
    '/public/estimates/token', '/company', '/company/about', '/_next/static/app.js', '/uploads/photo',
    '/portal-icon-192.png', '/file%2Epdf', '/estimates/1/pdf', '/orders/export', '/orders/attachments/1',
    '/estimates/1?download=1', '/orders?attachment', '/orders?pdf=true', '/orders?format=PDF', '/orders?format=xlsx',
    '/orders?format=csv', '/orders?format=zip', '/%E0%A4%A', 'https://backend.example/api/orders'];
  for (const url of urls) assert.equal(f.navigate(url).response, undefined, url);
  assert.equal(f.navigate('/orders', { method: 'POST' }).response, undefined);
  assert.equal(f.navigate('/api/orders', { mode: 'cors' }).response, undefined);
  assert.equal(f.navigate('/orders', { mode: 'same-origin' }).response, undefined);
  assert.equal(f.calls.length, 0);
});

test('offline navigation gives a non-cacheable 503 and does not pretend changes were saved', async () => {
  const f = worker(() => Promise.reject(new TypeError('Offline')));
  const response = await f.navigate('/orders').response;
  assert.equal(response.status, 503); assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.match(response.headers.get('Content-Type'), /^text\/html/);
  const html = await response.text();
  assert.match(html, /No connection/); assert.match(html, /check the latest status of any pending changes/);
  assert.match(html, /href="\/"/); assert.doesNotMatch(html, /<script|<form|cached|saved successfully/i);
});

test('root manifest has a separate stable application identity and real correctly sized PNG icons', async () => {
  const response = load('src/app/manifest.webmanifest/route.ts').GET();
  assert.equal(response.status, 200); assert.match(response.headers.get('Content-Type'), /application\/manifest\+json/);
  assert.match(response.headers.get('Cache-Control'), /max-age=0/);
  const manifest = await response.json();
  assert.equal(manifest.id, '/'); assert.equal(manifest.start_url, '/'); assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone'); assert.equal(manifest.name, 'Authentic Evolution');
  assert.ok(manifest.short_name); assert.ok(manifest.theme_color); assert.ok(manifest.background_color);
  for (const size of [192, 512]) {
    const icon = manifest.icons.find(value => value.sizes === `${size}x${size}`);
    assert.ok(icon); assert.equal(icon.type, 'image/png'); assert.equal(icon.purpose, 'any');
    assert.ok(icon.src.startsWith('/portal-icon-'));
    const buffer = fs.readFileSync(path.join(root, 'public', icon.src));
    assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(buffer.toString('ascii', 12, 16), 'IHDR');
    assert.equal(buffer.readUInt32BE(16), size); assert.equal(buffer.readUInt32BE(20), size);
  }
  const technician = await load('src/app/technician/manifest.webmanifest/route.ts').GET().json();
  assert.equal(technician.id, '/technician'); assert.equal(technician.start_url, '/technician'); assert.equal(technician.scope, '/technician');
  assert.notEqual(manifest.id, technician.id);
});

test('worker headers permit only root script scope and force revalidation without modifying other routes', async () => {
  const config = load('next.config.ts').default;
  const entries = await config.headers();
  const workerHeaders = entries.find(entry => entry.source === '/portal-sw.js');
  assert.ok(workerHeaders);
  const headers = Object.fromEntries(workerHeaders.headers.map(({ key, value }) => [key.toLowerCase(), value]));
  assert.equal(headers['service-worker-allowed'], '/'); assert.match(headers['content-type'], /javascript/);
  assert.match(headers['cache-control'], /no-store/); assert.match(headers['cache-control'], /must-revalidate/);
  assert.ok(entries.every(entry => entry.source === '/portal-sw.js'));
});

test('root layout mounts the portal once while technician metadata keeps its own manifest', () => {
  const layout = read('src/app/layout.tsx');
  assert.match(layout, /manifest:\s*["']\/manifest\.webmanifest["']/);
  assert.equal((layout.match(/<SiteShell\b/g) ?? []).length, 1);
  assert.equal((read('src/components/site-shell.tsx').match(/<PortalInstallProvider\b/g) ?? []).length, 1);
  assert.match(read('src/app/technician/layout.tsx'), /manifest:\s*["']\/technician\/manifest\.webmanifest["']/);
  assert.match(read('src/app/technician/install-app.tsx'), /register\("\/technician-sw\.js",\s*\{\s*scope:\s*"\/technician"/);
});

(async () => {
  let failures = 0;
  for (const { name, run } of tests) {
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack ?? error}`); }
  }
  console.log(`\n${tests.length - failures}/${tests.length} portal installation tests passed`);
  if (failures) process.exitCode = 1;
})();
