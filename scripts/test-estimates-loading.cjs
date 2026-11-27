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

function errorView(tree, retryLabel = "Try again") {
  const component = nodes(tree).find(node => typeof node.type === "function" && node.type.name === "EstimatesLoadError");
  assert.ok(component, "A failed load must show EstimatesLoadError, not empty data or zero metrics");
  const rendered = component.type(component.props);
  assert.ok(nodes(rendered).some(node => node.props?.role === "alert"), "Loading error is announced as an alert");
  const retry = nodes(rendered).find(node => node.type === "Button" && text(node) === retryLabel);
  assert.ok(retry, "Loading error provides a retry button");
  return { rendered, retry };
}

function pageFixture(http, currentUser = user) {
  let refreshes = 0, sessionCalls = 0;
  let selectedLocale, client;
  const runtime = hooks();
  const mocks = componentMocks(http.nav, () => refreshes++);
  const formatters = load("lib/formatters.ts");
  const costs = load("components/estimates/estimate-cost-columns.tsx", { "@/lib/formatters": formatters });
  const actionLanguage = load("lib/estimate-action-language.ts");
  const lifecycle = load("components/estimates/estimate-lifecycle-actions.tsx", {
    ...mocks, react: runtime.react, sonner: {}, "@/app/api/estimates.api": {}, "@/components/ui/dialog": {},
    "@/lib/estimate-action-language": actionLanguage,
  });
  const columns = load("components/estimates/estimates-columns.tsx", {
    ...mocks, react: runtime.react, sonner: {}, "lucide-react": {},
    "@/components/ui/tooltip": {}, "@/components/ui/dropdown-menu": {},
    "@/components/delete-conf-dialog": {}, "@/app/api/estimates.api": {}, "@/app/api/payments.api": {},
    "@/components/estimates/estimate-payment-link-actions": {}, "./duplicate-estimate-dialog": {},
    "./estimate-lifecycle-actions": lifecycle, "./estimate-cost-columns": costs,
    "@/lib/estimate-action-language": actionLanguage,
    "@/lib/estimate-status": load("lib/estimate-status.ts"), "@/lib/formatters": formatters,
  });
  Object.assign(mocks, {
    react: runtime.react,
    "@/components/data-table": { DataTable: "DataTable" },
    "./estimates-columns": columns,
    "./estimates-load-error": mocks[errorModuleName],
    "@/components/promotions/promotion-banner": { PromotionBanner: "PromotionBanner" },
    "@/contexts/PortalLanguageContext": { usePortalLanguage: initial => ({ locale: selectedLocale ?? initial }) },
    "@/lib/public-language-server": { requestPortalLanguage: async lang => lang ?? "en" },
    "@/app/api/estimates.api": { getEstimates: http.getEstimates },
    "@/app/api/_base": http,
    "@/lib/session": { getCurrentUser: async () => { sessionCalls++; return currentUser; } },
  });
  const listModule = load("components/estimates/estimates-client.tsx", mocks);
  mocks["@/components/estimates/estimates-client"] = listModule;
  const Page = load("app/estimates/page.tsx", mocks).default;
  const renderClient = () => runtime.render(() => listModule.EstimatesClient(client.props));
  return { async render(query = { owner: "12" }) {
      const page = await Page({ searchParams: Promise.resolve(query) });
      client = nodes(page).find(node => node.type === listModule.EstimatesClient);
      assert.ok(client, "The SSR response connects its data to the estimate list");
      return renderClient();
    },
    changeLanguage(next) { selectedLocale = next; return renderClient(); },
    props: () => client.props,
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

function dashboardFixture(http, orders = async () => [], initialLocale = "en") {
  const runtime = hooks();
  let auth = { isAuthenticated: true, isLoading: false, user };
  let selectedLocale;
  const mocks = componentMocks(http.nav);
  Object.assign(mocks, {
    react: runtime.react,
    "next/image": { __esModule: true, default: "Image" },
    "@/contexts/AuthContext": { useAuth: () => auth },
    "@/contexts/PortalLanguageContext": { usePortalLanguage: initial => ({ locale: selectedLocale ?? initial ?? "en" }) },
    "@/lib/dashboard-language": load("lib/dashboard-language.ts"),
    "@/contexts/CompanyBrandingContext": { useCompanyBranding: () => ({ companyName: "Test" }) },
    "@/components/auth/public-auth-screen": { PublicAuthScreen: "PublicAuthScreen" },
    "@/app/api/estimates.api": { getEstimates: http.getEstimates },
    "@/app/api/orders.api": { getOrders: orders },
    "@/lib/formatters": { formatMoney: value => `$${Number(value).toFixed(2)}` },
    "@/lib/order-po": load("lib/order-po.ts"),
    "lucide-react": Object.fromEntries(["ArrowRight", "BadgeDollarSign", "Building2", "ClipboardCheck", "FileText",
      "Loader2", "Ruler", "Settings", "ShoppingBag", "ShieldCheck", "UserRound", "Users"].map(name => [name, name])),
  });
  const Home = load("app/home-client.tsx", mocks).default;
  const Page = () => Home({ initialLocale });
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
    changeLanguage(next) { selectedLocale = next; },
    cleanup: () => runtime.cleanup(),
  };
}

function metricCard(tree, title) {
  return nodes(tree).find(node => node.key != null && text(nodes(node).find(child => child.type === "p")) === title);
}

function metric(tree, title) {
  const card = metricCard(tree, title);
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
    const page = pageFixture(f);
    const tree = await page.render({ owner: "12", lang: "es" });
    assert.deepEqual(page.props().initialEstimates, data);
    assert.equal(page.props().currentUser, user);
    assert.equal(page.props().ownerId, 12);
    assert.equal(text(nodes(tree).find(node => node.type === "h1")), "Cotizaciones");
    assert.equal(page.sessionCalls(), 1);
  });
}

for (const kind of ["500", "network"]) {
  test(`SSR shows ${kind}, then refreshes and recovers to the returned list`, async () => {
    const f = httpFixture({ server: true, replies: [kind === "500" ? { status: 500, body: {} }
      : { error: new TypeError("Simulated connection failure") }, { body: sample }] });
    const page = pageFixture(f), tree = await page.render({});
    assert.equal(nodes(tree).some(node => node.type === "DataTable"), false);
    const error = errorView(tree);
    assert.match(text(error.rendered), /Could not load estimates/);
    const spanish = page.changeLanguage("es");
    assert.doesNotMatch(text(spanish), /Crear mi primera cotización/);
    const translated = errorView(spanish, "Reintentar");
    assert.match(text(translated.rendered), /cargar las cotizaciones/);
    assert.equal(f.calls.length, 1);
    translated.retry.props.onClick();
    assert.equal(page.refreshes(), 1);
    const recovered = await page.render({});
    assert.deepEqual(nodes(recovered).find(node => node.type === "DataTable")?.props.data, sample);
  });
}

test("The empty list offers a single first-estimate link only to eligible clients", async () => {
  for (const [role, blocked, canCreate] of [
    ["client", false, true], ["client", true, false], ["dealer", false, true], ["admin", false, false],
  ]) {
    const page = pageFixture(httpFixture({ replies: [{ body: [] }] }), {
      ...user, role: { name: role }, networkSalesBlocked: blocked,
    });
    const tree = await page.render({ lang: "es" });
    const links = nodes(tree).filter(node => node.type === "Link" && node.props.href.startsWith("/estimates/new"));
    assert.equal(links.length, Number(canCreate), `Creation links for ${role}, blocked=${blocked}`);
    assert.equal(links.some(link => text(link).includes("Crear mi primera cotización")), canCreate && role === "client");
    if (canCreate && role === "client") assert.equal(links[0].props.href, "/estimates/new?welcome=1");
  }
});

test("Language changes preserve raw filter values, scoped rows, role access and prices", async () => {
  const owner = { id: 12, username: "Ana", role: { name: "client" } };
  const estimates = [
    { ...sample[0], id: 41, idUser: owner.id, user: owner, name: "Eco Windows", priceT: "125.50" },
    { ...sample[0], id: 42, idUser: owner.id, user: owner, status: { name: "Project hold" } },
    { ...sample[0], id: 43, idUser: 9, user: { ...owner, id: 9, username: "Luis" } },
  ];
  const http = httpFixture({ replies: [{ body: estimates }] });
  const page = pageFixture(http, { ...user, role: { name: "admin" } });
  const table = tree => nodes(tree).find(node => node.type === "DataTable").props;
  const english = table(await page.render({ owner: String(owner.id) }));
  const spanishTree = page.changeLanguage("es");
  const spanish = table(spanishTree);
  const ids = props => props.columns.map(col => col.id ?? col.accessorKey);
  assert.deepEqual(ids(spanish), ids(english));
  assert.deepEqual(spanish.data, estimates.slice(0, 2));
  assert.deepEqual(spanish.data, english.data);
  const filter = (props, id) => props.filters.find(item => item.columnId === id);
  const options = (props, id) => filter(props, id).options;
  assert.deepEqual(options(english, "status").map(item => item.value), options(spanish, "status").map(item => item.value));
  assert.deepEqual(options(spanish, "status").find(item => item.value === "Active"), { value: "Active", label: "Activa" });
  assert.deepEqual(options(spanish, "status").find(item => item.value === "Project hold"), { value: "Project hold", label: "Project hold" });
  assert.deepEqual(options(spanish, "createdByRole"), [{ value: "client", label: "Cliente" }]);
  assert.deepEqual(options(spanish, "createdBy"), options(english, "createdBy"));
  const { createTable, getCoreRowModel, getFilteredRowModel } = require("@tanstack/react-table");
  const selected = options(spanish, "status").find(item => item.label === "Activa").value;
  const grid = createTable({
    columns: spanish.columns, data: spanish.data, state: { columnFilters: [{ id: "status", value: selected }] },
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), autoResetPageIndex: false,
  });
  const matches = () => grid.getFilteredRowModel().rows.map(row => row.original.id);
  assert.deepEqual(matches(), [41]);
  grid.setOptions(previous => ({ ...previous, columns: english.columns, data: english.data }));
  assert.deepEqual(matches(), [41]);
  const column = (props, id) => props.columns.find(col => (col.id ?? col.accessorKey) === id);
  for (const props of [spanish, english]) {
    assert.equal(column(props, "status").accessorFn(estimates[0]), "Active");
    assert.equal(column(props, "priceT").accessorFn(estimates[0]), 125.5);
    assert.equal(props.filterStorageKey, "estimates");
  }
  assert.equal(spanish.locale, "es");
  assert.equal(english.locale, "en");
  assert.doesNotMatch(text(spanishTree), /Crear mi primera cotización/);
  assert.deepEqual(options(table(page.changeLanguage("en")), "status"), options(english, "status"));
  assert.equal(http.calls.length, 1);
  assert.equal(page.sessionCalls(), 1);
});

test("An owner filter with no matching estimates never offers a first-estimate link", async () => {
  const page = pageFixture(httpFixture({ replies: [{ body: sample }] }), { ...user, role: { name: "client" } });
  const tree = await page.render({ owner: "12", lang: "es" });
  assert.deepEqual(nodes(tree).find(node => node.type === "DataTable")?.props.data, []);
  assert.doesNotMatch(text(tree), /Crear mi primera cotización/);
});

test("Financial columns, actions and estimate destinations respect each viewer in both languages", async () => {
  for (const role of ["admin", "operator", "dealer", "client"]) {
    const owner = role === "dealer" || role === "client";
    const estimate = { ...sample[0], number: "E-41", idUser: owner ? 7 : 12, totalPayable: "125.50" };
    const page = pageFixture(httpFixture({ replies: [{ body: [estimate] }] }), { ...user, role: { name: role } });
    const english = await page.render({});
    const spanish = page.changeLanguage("es");
    for (const tree of [english, spanish]) {
      const { columns, locale } = nodes(tree).find(node => node.type === "DataTable").props;
      const ids = columns.map(column => column.id ?? column.accessorKey);
      assert.equal(ids.includes("createdBy"), role !== "client");
      assert.equal(ids.includes("netProfit"), ["admin", "operator"].includes(role));
      assert.equal(ids.includes("netProfitD"), role !== "client");
      const numberCell = columns.find(column => column.accessorKey === "number").cell({ row: { original: estimate } });
      const link = nodes(numberCell).find(node => node.type === "Link");
      assert.equal(link.props.href, "/estimates/41/edit");
      assert.equal(text(link), "E-41");
      const action = columns.find(column => column.id === "actions");
      const menu = action.cell({ row: { original: estimate }, column: { columnDef: action } });
      assert.equal(text(menu).includes(locale === "en" ? "Pay now" : "Pagar ahora"), owner);
      assert.equal(text(menu).includes(locale === "en" ? "Cancel estimate" : "Cancelar cotización"), role !== "client");
      assert.equal(text(menu).includes(locale === "en" ? "Delete Estimate" : "Eliminar cotización"), role !== "operator");
      const destinations = nodes(menu).filter(node => node.type === "Link").map(node => node.props.href);
      assert.equal(destinations.includes("/estimates/41?view=public"), role === "dealer");
    }
  }
});

test("SSR still rejects a missing session before requesting estimates", async () => {
  const f = httpFixture({ server: true });
  await assert.rejects(pageFixture(f, null).render(), error => error.digest === "NEXT_HTTP_ERROR_FALLBACK;404");
  assert.equal(f.calls.length, 0);
});

test("The new estimate dialog resolves each role's language and only requests client delivery coverage for clients", async () => {
  let role = "client";
  const preferences = [];
  const coverageRoles = [];
  const coverage = { canAddProfileAddress: true, address: null };
  const { default: render } = load("app/estimates/new/page.tsx", {
    "next/navigation": {},
    "@/lib/session": { getCurrentUser: async () => ({ role: { name: role } }) },
    "@/lib/rbac": { isClientRole: value => value === "client" },
    "@/lib/public-language-server": { requestPortalLanguage: async hint => { preferences.push(hint); return hint ?? "es"; } },
    "@/app/api/client-delivery.api": { getClientDeliveryCoverage: async () => { coverageRoles.push(role); return coverage; } },
    "@/components/estimates/initialize-estimate-dialog": { InitializeEstimateDialog: "InitializeEstimateDialog" },
  });
  const propsFor = async query => {
    const page = await render({ searchParams: Promise.resolve(query) });
    return nodes(page).find(item => item.type === "InitializeEstimateDialog").props;
  };
  assert.deepEqual(await propsFor({ welcome: "1" }), { initialLocale: "es", showWelcome: true, coverage });
  assert.deepEqual(await propsFor({ lang: "en" }), { initialLocale: "en", showWelcome: false, coverage });
  for (role of ["dealer", "admin"]) {
    assert.deepEqual(await propsFor({ welcome: "1", lang: "es" }), { initialLocale: "es", showWelcome: false, coverage: null });
  }
  assert.deepEqual(preferences, [undefined, "en", "es", "es"]);
  assert.deepEqual(coverageRoles, ["client", "client"]);
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

test("The portal home resolves its language and offers the localized sign-in only to guests", async () => {
  const { default: render } = load("app/page.tsx", {
    "./home-client": { __esModule: true, default: "Home" },
    "@/lib/public-language-server": { requestPortalLanguage: async hint => hint ?? "es" },
  });
  for (const [query, locale] of [[{}, "es"], [{ lang: "en" }, "en"]]) {
    const home = await render({ searchParams: Promise.resolve(query) });
    assert.equal(home.type, "Home");
    assert.equal(home.props.initialLocale, locale);
    const http = httpFixture({ replies: [{ body: [] }] });
    const fixture = dashboardFixture(http, async () => [], home.props.initialLocale);
    fixture.changeUser(null);
    const guest = nodes(await fixture.settle()).find(node => node.type === "PublicAuthScreen");
    assert.equal(guest?.props.mode, "login");
    assert.equal(guest.props.initialLocale, locale);
    assert.equal(http.calls.length, 0, "Guests never request private estimates");
    fixture.changeUser(user);
    const dashboard = await fixture.settle();
    assert.equal(nodes(dashboard).some(node => node.type === "PublicAuthScreen"), false);
    assert.equal(metric(dashboard, locale === "es" ? "Cotizaciones activas" : "Active Estimates"), "0");
    fixture.cleanup();
  }
});

test("Dashboard shows genuine zero metrics after successful empty responses", async () => {
  const f = dashboardFixture(httpFixture({ replies: [{ body: [] }] }));
  const tree = await f.settle();
  assert.equal(metric(tree, "Active Estimates"), "0");
  assert.equal(metric(tree, "Orders"), "0");
  assert.equal(metric(tree, "Estimates Value"), "$0.00");
  f.cleanup();
});

for (const role of ["admin", "operator", "dealer", "client", "custom"]) {
  test(`Dashboard switches languages in place with the same ${role} actions and totals`, async () => {
    const http = httpFixture({ replies: [{ body: sample }] });
    let orderRequests = 0;
    const fixture = dashboardFixture(http, async () => {
      orderRequests++;
      return [{ id: 1 }, { id: 2, poNumber: "PO-42" }, { id: 3, status: { name: "Delivered" } }];
    });
    fixture.changeUser({ ...user, firstName: "María", role: { name: role } });
    const english = await fixture.settle();
    const links = tree => nodes(tree).filter(node => node.type === "Link").map(node => node.props.href);
    const staff = role === "admin" || role === "operator";
    const destinations = ["/estimates", "/orders", "/profile"];
    if (role === "client" || role === "dealer") destinations.push("/materials");
    if (role === "dealer") destinations.push("/profile/branding");
    if (staff) destinations.push("/orders?po=pending", "/settings", "/settings/pricing-rules", "/settings/dimension-policies");
    if (role === "admin") destinations.push("/settings/users");
    assert.deepEqual(new Set(links(english)), new Set(destinations));
    assert.match(text(english), /Welcome back, María!/);
    const client = role === "client";
    assert.equal(metric(english, client ? "My Estimates" : "Active Estimates"), "1");
    assert.equal(metric(english, client ? "My Orders" : "Orders"), "3");

    fixture.changeLanguage("es");
    const spanish = await fixture.settle();
    assert.equal(spanish.props.lang, "es");
    assert.match(text(spanish), /¡Hola de nuevo, María!/);
    assert.match(text(spanish), /Ir a cotizaciones/);
    assert.match(text(spanish), /Accesos rápidos/);
    assert.doesNotMatch(text(spanish), /Welcome back|Go to Estimates|Quick Actions|workspace|Total orders/);
    assert.deepEqual(links(spanish), links(english));
    assert.equal(metric(spanish, client ? "Mis cotizaciones" : "Cotizaciones activas"), "1");
    assert.equal(metric(spanish, client ? "Mis órdenes" : "Órdenes"), "3");
    if (staff) {
      assert.equal(metric(english, "Pending PO"), "1");
      assert.equal(metric(spanish, "Órdenes pendientes de PO de fábrica"), "1");
    }
    if (!client) {
      assert.equal(metric(english, "Estimates Value"), "$125.50");
      assert.equal(metric(spanish, "Valor de las cotizaciones"), "$125.50");
    }
    fixture.changeLanguage("en");
    assert.equal(text(await fixture.settle()), text(english));
    assert.equal(http.calls.length, 1, "Language switches preserve loaded estimates");
    assert.equal(orderRequests, 1, "Language switches preserve loaded orders");
    fixture.cleanup();
  });
}

test("Dashboard shows a Spanish greeting for an account without a display name", async () => {
  const fixture = dashboardFixture(httpFixture({ replies: [{ body: [] }] }), async () => [], "es");
  fixture.changeUser({ id: user.id, role: { name: "custom" } });
  const tree = await fixture.settle();
  const heading = text(nodes(tree).find(node => node.type === "h1"));
  assert.equal(heading, "¡Hola de nuevo!");
  fixture.changeLanguage("en");
  assert.equal(text(nodes(await fixture.settle()).find(node => node.type === "h1")), "Welcome back!");
  fixture.cleanup();
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
    assert.equal(metricCard(tree, "Active Estimates"), undefined);
    f.changeLanguage("es");
    const spanish = errorView(await f.settle(), "Reintentar");
    assert.match(text(spanish.rendered), /panel/i);
    assert.doesNotMatch(text(spanish.rendered), /Could not load/);
    spanish.retry.props.onClick();
    const recovered = await f.settle();
    assert.equal(metric(recovered, "Cotizaciones activas"), "1");
    assert.equal(metric(recovered, "Órdenes"), "1");
    assert.equal(metric(recovered, "Valor de las cotizaciones"), "$125.50");
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
