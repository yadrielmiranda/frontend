/* Isolated regression tests for estimate loading. Real source, simulated React,
 * Next navigation and HTTP; no browser, database, environment files or network.
 * Run from frontend: node scripts/test-estimates-loading.cjs */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "../src");
const tests = [];
const test = (name, run) => tests.push({ name, run });
const jsx = (type, props, key) => ({ type, props: props || {}, key });
const nodes = value => Array.isArray(value) ? value.flatMap(nodes)
  : value && typeof value === "object" ? [value, ...nodes(value.props?.children)] : [];
const text = value => Array.isArray(value) ? value.map(text).join("")
  : value && typeof value === "object" ? text(value.props?.children)
    : value == null || typeof value === "boolean" ? "" : String(value);
const deniedFetch = () => { throw new Error("Unmocked HTTP is forbidden in this test"); };
const silentConsole = { error() {}, warn() {}, log() {} };

function load(relative, mocks = {}, scope = {}) {
  const file = path.join(root, relative);
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const globals = { fetch: deniedFetch, window: undefined,
    process: { env: { NEXT_PUBLIC_API_URL: "https://isolated-api.invalid" } },
    console: silentConsole, ...scope };
  const exported = {};
  new Function("require", "exports", ...Object.keys(globals), source)(name => {
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
    assert.ok(Object.hasOwn(mocks, name), `Missing explicit mock: ${relative} -> ${name}`);
    return mocks[name];
  }, exported, ...Object.values(globals));
  return exported;
}

function navigation() {
  const sentinel = kind => Object.assign(new Error(kind), { nextControlFlow: true, digest: kind });
  return {
    notFound() { throw sentinel("NEXT_HTTP_ERROR_FALLBACK;404"); },
    redirect(url) { throw sentinel(`NEXT_REDIRECT;${url}`); },
    unstable_rethrow(error) { if (error?.nextControlFlow) throw error; },
  };
}

function httpFixture({ server = false, replies = [], responder } = {}) {
  const calls = [], events = [], nav = navigation();
  const fetch = async (url, init = {}) => {
    const endpoint = new URL(url).pathname;
    assert.equal(new URL(url).origin, "https://isolated-api.invalid");
    calls.push({ endpoint, init });
    const reply = responder ? await responder(endpoint, init) : replies.shift();
    assert.ok(reply, `Unexpected mocked request: ${endpoint}`);
    if (reply.endpoint) assert.equal(endpoint, reply.endpoint);
    if (reply.error) throw reply.error;
    const status = reply.status ?? 200;
    const headers = new Headers({ "content-type": "application/json", ...reply.headers });
    return { ok: status >= 200 && status < 300, status, headers,
      json: async () => reply.body, text: async () => JSON.stringify(reply.body) };
  };
  const api = load("app/api/_base.ts", {
    "next/headers": { cookies: async () => ({ getAll: () => [
      { name: "access_token", value: "test-access" }, { name: "refresh_token", value: "test-refresh" },
    ] }) },
    "next/navigation": nav,
  }, { fetch, window: server ? undefined : { dispatchEvent: event => events.push(event.type) },
    CustomEvent: class { constructor(type) { this.type = type; } } });
  const estimates = load("app/api/estimates.api.ts", { "./_base": api });
  return { ...api, ...estimates, calls, events, nav };
}

const rbac = load("lib/rbac.ts");
const user = { id: 7, firstName: "Test", role: { name: "dealer" } };
const sample = [{ id: 41, status: { name: "Active" }, customerTotalPayable: "125.50" }];
const errorModuleName = "@/components/estimates/estimates-load-error";

function componentMocks(nav, onRefresh = () => {}) {
  const mocks = {
    "next/link": { __esModule: true, default: "Link" },
    "@/components/ui/button": { Button: "Button" },
    "@/lib/rbac": rbac,
    "next/navigation": { ...nav, useRouter: () => ({ refresh: onRefresh }) },
  };
  // Lazy: baseline failures must be behavioral, not a missing new component.
  Object.defineProperty(mocks, errorModuleName, { enumerable: true, get() {
    return load("components/estimates/estimates-load-error.tsx", {
      react: { useTransition: () => [false, callback => callback()] },
      "next/navigation": mocks["next/navigation"],
      "@/components/ui/button": mocks["@/components/ui/button"],
    });
  } });
  return mocks;
}

function errorView(tree) {
  const component = nodes(tree).find(node => typeof node.type === "function" && node.type.name === "EstimatesLoadError");
  assert.ok(component, "A failed load must show EstimatesLoadError, not empty data or zero metrics");
  const rendered = component.type(component.props);
  assert.ok(nodes(rendered).some(node => node.props?.role === "alert"), "Loading error is announced as an alert");
  const retry = nodes(rendered).find(node => node.type === "Button" && text(node).includes("Try again"));
  assert.ok(retry, "Loading error provides a retry button");
  return { rendered, retry };
}

function pageFixture(http, currentUser = user) {
  let refreshes = 0, sessionCalls = 0;
  const mocks = componentMocks(http.nav, () => refreshes++);
  Object.assign(mocks, {
    "@/components/promotions/promotion-banner": { PromotionBanner: "PromotionBanner" },
    "@/app/api/estimates.api": { getEstimates: http.getEstimates },
    "@/app/api/_base": http,
    "@/lib/session": { getCurrentUser: async () => { sessionCalls++; return currentUser; } },
    "@/components/estimates/estimates-client": { EstimatesClient: "EstimatesClient" },
  });
  const Page = load("app/estimates/page.tsx", mocks).default;
  return { render: () => Page({ searchParams: Promise.resolve({ owner: "12" }) }),
    refreshes: () => refreshes, sessionCalls: () => sessionCalls };
}

function hooks() {
  const state = [], effects = [];
  let cursor = 0, effectCursor = 0, pending = [], dirty = false;
  return {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
        return [state[index], next => {
          const value = typeof next === "function" ? next(state[index]) : next;
          if (!Object.is(state[index], value)) { state[index] = value; dirty = true; }
        }];
      },
      useMemo: fn => fn(),
      useEffect(fn, deps) {
        const index = effectCursor++, previous = effects[index];
        if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
          pending.push(() => {
            previous?.cleanup?.();
            effects[index] = { deps, cleanup: fn() };
          });
        }
      },
    },
    render(Component) {
      cursor = 0; effectCursor = 0; pending = []; dirty = false;
      const tree = Component();
      pending.forEach(effect => effect());
      return tree;
    },
    dirty: () => dirty,
    cleanup() { effects.forEach(effect => effect?.cleanup?.()); },
  };
}

function dashboardFixture(http, orders = async () => []) {
  const runtime = hooks();
  let auth = { isAuthenticated: true, isLoading: false, user };
  const mocks = componentMocks(http.nav);
  Object.assign(mocks, {
    react: runtime.react,
    "next/image": { __esModule: true, default: "Image" },
    "@/contexts/AuthContext": { useAuth: () => auth },
    "@/contexts/CompanyBrandingContext": { useCompanyBranding: () => ({ companyName: "Test" }) },
    "@/components/card-login": { CardLogin: "CardLogin" },
    "@/components/auth/auth-page-shell": { AuthPageShell: "AuthPageShell" },
    "@/app/api/estimates.api": { getEstimates: http.getEstimates },
    "@/app/api/orders.api": { getOrders: orders },
    "@/lib/formatters": { formatMoney: value => `$${Number(value).toFixed(2)}` },
    "@/lib/order-po": load("lib/order-po.ts"),
    "lucide-react": Object.fromEntries(["ArrowRight", "BadgeDollarSign", "Building2", "ClipboardCheck", "FileText",
      "Loader2", "Ruler", "Settings", "ShoppingBag", "ShieldCheck", "UserRound", "Users"].map(name => [name, name])),
  });
  const Page = load("app/page.tsx", mocks).default;
  let tree;
  return {
    async settle() {
      tree = runtime.render(Page);
      for (let i = 0; i < 6; i++) {
        await new Promise(setImmediate);
        if (runtime.dirty()) tree = runtime.render(Page);
      }
      assert.equal(runtime.dirty(), false, "Effects settle without a render loop");
      return tree;
    },
    changeUser(next) { auth = { ...auth, user: next, isAuthenticated: Boolean(next) }; },
    cleanup: () => runtime.cleanup(),
  };
}

function metric(tree, title) {
  const card = nodes(tree).find(node => node.key === title);
  assert.ok(card, `Metric ${title} is visible after a successful load`);
  return nodes(card).filter(node => node.type === "p").map(text)[1];
}

test("API preserves a successful empty collection and authenticated request options", async () => {
  const f = httpFixture({ replies: [{ body: [] }] });
  assert.deepEqual(await f.getEstimates(), []);
  assert.equal(f.calls[0].endpoint, "/api/estimates");
  assert.equal(f.calls[0].init.cache, "no-store");
  assert.equal(f.calls[0].init.credentials, "include");
});

for (const kind of ["500", "network"]) {
  test(`API propagates ${kind} instead of converting it to an empty collection`, async () => {
    const failure = new TypeError("Simulated connection failure");
    const f = httpFixture({ replies: [kind === "500" ? { status: 500, body: { message: "Failure" } } : { error: failure }] });
    await assert.rejects(f.getEstimates(), error => kind === "500" ? error instanceof f.ApiError && error.status === 500 : error === failure);
  });
}

for (const server of [false, true]) {
  test(`API preserves ${server ? "SSR" : "browser"} refresh and retry on 401`, async () => {
    const f = httpFixture({ server, replies: [
      { endpoint: "/api/estimates", status: 401, body: {} },
      { endpoint: "/api/auth/refresh", body: {}, headers: { "set-cookie": "access_token=renewed; Path=/; HttpOnly" } },
      { endpoint: "/api/estimates", body: sample },
    ] });
    assert.deepEqual(await f.getEstimates(), sample);
    assert.equal(f.calls.length, 3);
    assert.equal(f.calls[1].init.method, "POST");
    assert.deepEqual(f.events, []);
    if (server) {
      assert.match(f.calls[0].init.headers.Cookie, /access_token=test-access/);
      assert.equal(f.calls[2].init.headers.Cookie, "access_token=renewed");
    }
  });
}

test("API retains the login event and propagates 401 after a failed refresh", async () => {
  const f = httpFixture({ replies: [{ status: 401, body: {} }, { status: 401, body: {} }] });
  await assert.rejects(f.getEstimates(), error => error.status === 401);
  assert.deepEqual(f.events, ["auth:login-required"]);
});

test("API retains the browser platform-terms event and rejection", async () => {
  const f = httpFixture({ replies: [{ status: 403, body: { code: "PLATFORM_TERMS_REQUIRED" } }] });
  await assert.rejects(f.getEstimates(), error => error.status === 403);
  assert.deepEqual(f.events, ["platform-terms:required"]);
});

for (const data of [[], sample]) {
  test(`SSR preserves the ${data.length ? "populated" : "empty"} list, user and owner filter`, async () => {
    const f = httpFixture({ server: true, replies: [{ body: data }] });
    const page = pageFixture(f), tree = await page.render();
    const client = nodes(tree).find(node => node.type === "EstimatesClient");
    assert.deepEqual(client?.props.initialEstimates, data);
    assert.equal(client.props.currentUser, user);
    assert.equal(client.props.ownerId, 12);
    assert.equal(page.sessionCalls(), 1);
  });
}

for (const kind of ["500", "network"]) {
  test(`SSR shows ${kind}, then refreshes and recovers to the returned list`, async () => {
    const f = httpFixture({ server: true, replies: [kind === "500" ? { status: 500, body: {} }
      : { error: new TypeError("Simulated connection failure") }, { body: sample }] });
    const page = pageFixture(f), tree = await page.render();
    assert.equal(nodes(tree).some(node => node.type === "EstimatesClient"), false);
    const error = errorView(tree);
    assert.match(text(error.rendered), /Could not load estimates/);
    error.retry.props.onClick();
    assert.equal(page.refreshes(), 1);
    const recovered = await page.render();
    assert.deepEqual(nodes(recovered).find(node => node.type === "EstimatesClient").props.initialEstimates, sample);
  });
}

test("SSR still rejects a missing session before requesting estimates", async () => {
  const f = httpFixture({ server: true });
  await assert.rejects(pageFixture(f, null).render(), error => error.digest === "NEXT_HTTP_ERROR_FALLBACK;404");
  assert.equal(f.calls.length, 0);
});

for (const status of [401, 403, 404]) {
  test(`SSR propagates HTTP ${status} instead of displaying a retryable data error`, async () => {
    const replies = [{ status, body: {} }];
    if (status === 401) replies.push({ status: 401, body: {} });
    const f = httpFixture({ server: true, replies });
    await assert.rejects(pageFixture(f).render(), error => error.status === status);
  });
}

test("SSR preserves the platform-terms redirect control flow", async () => {
  const f = httpFixture({ server: true, replies: [{ status: 403, body: { code: "PLATFORM_TERMS_REQUIRED" } }] });
  await assert.rejects(pageFixture(f).render(), error => error.digest === "NEXT_REDIRECT;/terms");
});

test("Dashboard shows genuine zero metrics after successful empty responses", async () => {
  const f = dashboardFixture(httpFixture({ replies: [{ body: [] }] }));
  const tree = await f.settle();
  assert.equal(metric(tree, "Active Estimates"), "0");
  assert.equal(metric(tree, "Orders"), "0");
  assert.equal(metric(tree, "Estimates Value"), "$0.00");
  f.cleanup();
});

for (const kind of ["500", "network", "orders"]) {
  test(`Dashboard shows ${kind} failure without false zero metrics and retry restores data`, async () => {
    const replies = kind === "orders" ? [{ body: sample }, { body: sample }]
      : [kind === "500" ? { status: 500, body: {} } : { error: new TypeError("Simulated connection failure") }, { body: sample }];
    let attempts = 0;
    const f = dashboardFixture(httpFixture({ replies }), async () => {
      if (kind === "orders" && attempts++ === 0) throw new TypeError("Simulated order failure");
      return [{ id: 1 }];
    });
    const tree = await f.settle(), error = errorView(tree);
    assert.match(text(error.rendered), /Could not load dashboard data/);
    assert.equal(nodes(tree).some(node => node.key === "Active Estimates"), false);
    error.retry.props.onClick();
    const recovered = await f.settle();
    assert.equal(metric(recovered, "Active Estimates"), "1");
    assert.equal(metric(recovered, "Orders"), "1");
    assert.equal(metric(recovered, "Estimates Value"), "$125.50");
    f.cleanup();
  });
}

test("Dashboard cleanup ignores a previous user's delayed failure", async () => {
  let release, requests = 0;
  const pending = new Promise(resolve => { release = resolve; });
  const http = httpFixture({ responder: async () => ++requests === 1 ? await pending : { body: sample } });
  const f = dashboardFixture(http);
  await f.settle();
  f.changeUser({ ...user, id: 8 });
  assert.equal(metric(await f.settle(), "Active Estimates"), "1");
  release({ status: 500, body: {} });
  const tree = await f.settle();
  assert.equal(metric(tree, "Active Estimates"), "1");
  assert.equal(nodes(tree).some(node => node.type?.name === "EstimatesLoadError"), false);
  f.cleanup();
});

(async () => {
  let failures = 0;
  for (const { name, run } of tests) {
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
  }
  console.log(`${tests.length - failures}/${tests.length} isolated estimate-loading tests passed (mock HTTP/React/Next).`);
  if (failures) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
