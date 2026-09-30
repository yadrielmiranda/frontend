/* Isolated session regression tests: execute the real route, SSR session helper
 * and apiFetch with simulated HTTP/Next/React. No environment files, network,
 * database or application server. Run: node scripts/test-session-errors.cjs */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const tests = [];
const test = (name, run) => tests.push({ name, run });
const user = { id: 7, username: "fixture-user", role: { name: "dealer" } };
const baseUrl = "https://session-fixture.invalid";
const authCookies = { access_token: "fixture-access", refresh_token: "fixture-refresh" };
const renewedCookies = ["access_token=fixture-renewed-access; Path=/; HttpOnly; Secure; SameSite=Lax",
  "refresh_token=fixture-renewed-refresh; Path=/; HttpOnly; Secure; SameSite=Lax"];
const deletedCookies = ["access_token=; Path=/; Max-Age=0; HttpOnly", "refresh_token=; Path=/; Max-Age=0; HttpOnly"];

function headerStore(values = {}, cookies = []) {
  const entries = new Map(Object.entries(values).map(([key, value]) => [key.toLowerCase(), String(value)]));
  const allCookies = [...cookies];
  return {
    get(name) { return name.toLowerCase() === "set-cookie" ? allCookies.join(", ") || null : entries.get(name.toLowerCase()) ?? null; },
    getSetCookie() { return [...allCookies]; },
    append(name, value) {
      if (name.toLowerCase() === "set-cookie") allCookies.push(value);
      else entries.set(name.toLowerCase(), value);
    },
  };
}
function response(status = 200, body = {}, options = {}) {
  return { status, ok: status >= 200 && status < 300,
    headers: headerStore({ "content-type": "application/json", ...options.headers }, options.cookies),
    async json() { if (options.malformed) throw new SyntaxError("Simulated invalid JSON"); return body; },
    async text() { return options.malformed ? "invalid-json" : JSON.stringify(body); },
  };
}
function transport(replies) {
  const queue = [...replies], calls = [];
  const fetch = async (url, init = {}) => {
    assert.equal(new URL(url).origin, baseUrl, "Only the fictitious origin may be used");
    const endpoint = new URL(url).pathname;
    calls.push({ endpoint, init });
    assert.ok(queue.length, `Unexpected simulated request: ${endpoint}`);
    const reply = queue.shift();
    if (reply.endpoint) assert.equal(endpoint, reply.endpoint);
    if (reply.error) throw reply.error;
    return reply.response ?? reply;
  };
  return { fetch, calls, remaining: () => queue.length };
}
function load(file, mocks, globals = {}) {
  const fullPath = path.resolve(__dirname, "../src", file);
  const compiled = ts.transpileModule(fs.readFileSync(fullPath, "utf8"), {
    fileName: fullPath, compilerOptions: { target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const scope = { process: { env: { NEXT_PUBLIC_API_URL: baseUrl, NEXT_PUBLIC_APP_URL: baseUrl } },
    fetch: () => { throw new Error("Unmocked network access is forbidden"); },
    window: undefined, console: { error() {}, warn() {}, log() {} }, ...globals };
  const exported = {};
  new Function("require", "exports", ...Object.keys(scope), compiled)(name => {
    assert.ok(Object.hasOwn(mocks, name), `Missing explicit mock: ${file} -> ${name}`);
    return mocks[name];
  }, exported, ...Object.values(scope));
  return exported;
}

function routeFixture(replies, cookieValues = authCookies) {
  const http = transport(replies);
  const route = load("app/api/auth/me/route.ts", {
    "next/headers": { cookies: async () => ({ get: name => cookieValues[name] ? { value: cookieValues[name] } : undefined }) },
    "next/server": { NextResponse: { json: (body, options = {}) => response(options.status ?? 200, body) } },
  }, { fetch: http.fetch });
  return { ...route, ...http };
}
async function expectTechnical(result, expectedStatus) {
  if (expectedStatus == null) assert.ok(result.status >= 500, "Invalid upstream data must produce a technical failure");
  else assert.equal(result.status, expectedStatus);
  const body = await result.json();
  assert.notEqual(body.isAuthenticated, false, "A non-authentication failure must not assert that the session is invalid");
  assert.ok(typeof body.message === "string" && body.message.length > 0, "Errors include a usable message");
}

test("proxy: no cookies returns 401 without contacting the backend", async () => {
  const f = routeFixture([], {}), res = await f.GET();
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { isAuthenticated: false, user: null });
  assert.equal(f.calls.length, 0);
});
test("proxy: valid profile preserves user, no-store and clean auth-cookie forwarding", async () => {
  const f = routeFixture([response(200, user)], { ...authCookies, analytics: "not-an-auth-cookie" });
  const res = await f.GET();
  assert.equal(res.status, 200); assert.deepEqual(await res.json(), { isAuthenticated: true, user });
  assert.equal(f.calls[0].endpoint, "/api/auth/profile");
  assert.equal(f.calls[0].init.headers.Cookie, "access_token=fixture-access; refresh_token=fixture-refresh");
  assert.equal(f.calls[0].init.cache, "no-store");
});
test("proxy: expired access renews once, retries with new cookies and forwards every Set-Cookie", async () => {
  const f = routeFixture([response(401), response(200, {}, { cookies: renewedCookies }), response(200, user)]);
  const res = await f.GET();
  assert.equal(res.status, 200); assert.deepEqual(await res.json(), { isAuthenticated: true, user });
  assert.deepEqual(f.calls.map(call => call.endpoint), ["/api/auth/profile", "/api/auth/refresh", "/api/auth/profile"]);
  assert.equal(f.calls[1].init.method, "POST");
  assert.equal(f.calls[1].init.headers.Cookie, "access_token=fixture-access; refresh_token=fixture-refresh");
  assert.equal(f.calls[2].init.headers.Cookie, "access_token=fixture-renewed-access; refresh_token=fixture-renewed-refresh");
  assert.ok(f.calls.every(call => call.init.cache === "no-store"));
  assert.deepEqual(res.headers.getSetCookie(), renewedCookies);
});
test("proxy: actual refresh rejection closes the session and forwards cookie deletion", async () => {
  const f = routeFixture([response(401), response(401, {}, { cookies: deletedCookies })]);
  const res = await f.GET(); assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { isAuthenticated: false, user: null });
  assert.deepEqual(res.headers.getSetCookie(), deletedCookies);
});
test("proxy: access rejection without refresh stays unauthorized and makes one request", async () => {
  const f = routeFixture([response(401)], { access_token: "fixture-access" });
  assert.equal((await f.GET()).status, 401); assert.equal(f.calls.length, 1);
});
for (const status of [403, 429, 500, 503]) {
  test(`proxy: profile ${status} remains a non-authentication HTTP rejection, not invalid session`, async () => {
    const f = routeFixture([response(status, { message: "Simulated upstream failure" })]);
    await expectTechnical(await f.GET(), status); assert.equal(f.calls.length, 1);
  });
  test(`proxy: profile401 followed by refresh${status} preserves the actual failure`, async () => {
    const f = routeFixture([response(401), response(status, { message: "Simulated refresh failure" })]);
    await expectTechnical(await f.GET(), status); assert.equal(f.calls.length, 2);
  });
}
for (const stage of ["profile", "refresh", "retried profile"]) {
  test(`proxy: network failure at ${stage} returns 503 without false logout`, async () => {
    const failure = { error: new TypeError("Simulated network failure") };
    const replies = stage === "profile" ? [failure] : stage === "refresh" ? [response(401), failure]
      : [response(401), response(200, {}, { cookies: renewedCookies }), failure];
    const f = routeFixture(replies), res = await f.GET();
    await expectTechnical(res, 503);
    if (stage === "retried profile") assert.deepEqual(res.headers.getSetCookie(), renewedCookies);
  });
}
test("proxy: refreshed cookies survive a technical retried-profile response", async () => {
  const f = routeFixture([response(401), response(200, {}, { cookies: renewedCookies }), response(503)]);
  const res = await f.GET(); await expectTechnical(res, 503);
  assert.deepEqual(res.headers.getSetCookie(), renewedCookies);
});
test("proxy: malformed successful profile is a technical response", async () => {
  const f = routeFixture([response(200, {}, { malformed: true })]);
  await expectTechnical(await f.GET());
});
test("proxy: malformed profile after renewal preserves every refreshed cookie", async () => {
  const f = routeFixture([response(401), response(200, {}, { cookies: renewedCookies }), response(200, {}, { malformed: true })]);
  const res = await f.GET();
  await expectTechnical(res, 503);
  assert.deepEqual(res.headers.getSetCookie(), renewedCookies);
});

function sessionFixture(replies, headerError) {
  const http = transport(replies);
  const originalCookies = "access_token=fixture-access; refresh_token=fixture-refresh; preferences=fixture";
  const session = load("lib/session.ts", {
    react: { cache: fn => fn },
    "next/headers": { headers: async () => {
      if (headerError) throw headerError;
      return headerStore({ cookie: originalCookies });
    } },
  }, { fetch: http.fetch });
  return { ...session, ...http, originalCookies };
}
test("SSR session: valid user and complete incoming cookie header are preserved", async () => {
  const f = sessionFixture([response(200, { isAuthenticated: true, user })]);
  assert.deepEqual(await f.getCurrentUser(), user);
  assert.equal(f.calls[0].endpoint, "/api/auth/me");
  assert.equal(f.calls[0].init.headers.cookie, f.originalCookies);
  assert.equal(f.calls[0].init.cache, "no-store");
});
test("SSR session: only confirmed401 resolves to null", async () => {
  const f = sessionFixture([response(401, { isAuthenticated: false, user: null })]);
  assert.equal(await f.getCurrentUser(), null);
});
for (const status of [403, 429, 500, 503]) {
  test(`SSR session: HTTP${status} rejects instead of impersonating anonymous state`, async () => {
    const f = sessionFixture([response(status, { message: "Simulated service failure" })]);
    await assert.rejects(f.getCurrentUser());
  });
}
test("SSR session: network failure rejects, then a new lookup can recover", async () => {
  const f = sessionFixture([{ error: new TypeError("Simulated network failure") }, response(200, { user })]);
  await assert.rejects(f.getCurrentUser());
  assert.deepEqual(await f.getCurrentUser(), user);
});
test("SSR session: malformed successful JSON rejects", async () => {
  const f = sessionFixture([response(200, {}, { malformed: true })]);
  await assert.rejects(f.getCurrentUser());
});
test("SSR session: successful response without a user is not anonymous authentication", async () => {
  const f = sessionFixture([response(200, {})]);
  await assert.rejects(f.getCurrentUser());
});
test("SSR session: Next request-context exception is propagated unchanged", async () => {
  const sentinel = Object.assign(new Error("Simulated framework control flow"), { digest: "DYNAMIC_SERVER_USAGE" });
  const f = sessionFixture([], sentinel);
  await assert.rejects(f.getCurrentUser(), error => error === sentinel);
  assert.equal(f.calls.length, 0);
});

function apiFixture(replies, server = false) {
  const http = transport(replies), events = [];
  const redirectSentinel = Object.assign(new Error("Simulated terms redirect"), { digest: "NEXT_REDIRECT;/terms" });
  const api = load("app/api/_base.ts", {
    "next/headers": { cookies: async () => ({ getAll: () => Object.entries(authCookies).map(([name, value]) => ({ name, value })) }) },
    "next/navigation": { redirect(url) { assert.equal(url, "/terms"); throw redirectSentinel; } },
  }, { fetch: http.fetch, window: server ? undefined : { dispatchEvent: event => events.push(event.type) },
    CustomEvent: class { constructor(type) { this.type = type; } } });
  return { ...http, ...api, events, redirectSentinel };
}
for (const server of [false, true]) {
  const side = server ? "SSR" : "browser";
  test(`apiFetch ${side}: real401 with successful renewal returns profile`, async () => {
    const f = apiFixture([response(401), response(200, {}, { cookies: renewedCookies }), response(200, user)], server);
    assert.deepEqual(await f.apiFetch("/api/auth/profile"), user);
    assert.equal(f.calls.length, 3); assert.equal(f.calls[1].endpoint, "/api/auth/refresh");
    assert.deepEqual(f.events, []);
    if (server) assert.equal(f.calls[2].init.headers.Cookie, "access_token=fixture-renewed-access; refresh_token=fixture-renewed-refresh");
    else assert.ok(f.calls.every(call => call.init.credentials === "include"));
  });
  for (const status of [429, 500, 503]) {
    test(`apiFetch ${side}: refresh${status} must not reuse the original401`, async () => {
      const f = apiFixture([response(401), response(status, { message: "Simulated refresh unavailable" })], server);
      await assert.rejects(f.apiFetch("/api/auth/profile"), error => error instanceof f.ApiError && error.status === status);
      assert.deepEqual(f.events, []);
    });
  }
  test(`apiFetch ${side}: network failure during renewal remains technical`, async () => {
    const failure = new TypeError("Simulated refresh connection failure");
    const f = apiFixture([response(401), { error: failure }], server);
    await assert.rejects(f.apiFetch("/api/auth/profile"), error => error === failure);
    assert.deepEqual(f.events, []);
  });
  test(`apiFetch ${side}: actual rejected refresh stays401`, async () => {
    const f = apiFixture([response(401), response(401)], server);
    await assert.rejects(f.apiFetch("/api/auth/profile"), error => error instanceof f.ApiError && error.status === 401);
    assert.deepEqual(f.events, server ? [] : ["auth:login-required"]);
  });
  test(`apiFetch ${side}: malformed refresh401 body preserves unauthorized status with a real stream`, async () => {
    const malformed = new Response("{broken", { status: 401, headers: { "content-type": "application/json" } });
    const f = apiFixture([response(401), malformed], server);
    await assert.rejects(f.apiFetch("/api/auth/profile"), error => error instanceof f.ApiError && error.status === 401);
    assert.deepEqual(f.events, server ? [] : ["auth:login-required"]);
  });
  test(`apiFetch ${side}: refresh403 preserves permission rejection without requesting login`, async () => {
    const f = apiFixture([response(401), response(403, { message: "Simulated permission denial" })], server);
    await assert.rejects(f.apiFetch("/api/auth/profile"), error => error instanceof f.ApiError && error.status === 403);
    assert.deepEqual(f.events, []);
  });
  test(`apiFetch ${side}: malformed error body does not erase HTTP503`, async () => {
    const malformed = new Response("{broken", { status: 503, headers: { "content-type": "application/json" } });
    const f = apiFixture([malformed], server);
    await assert.rejects(f.apiFetch("/api/auth/profile"), error => error instanceof f.ApiError && error.status === 503);
    assert.deepEqual(f.events, []);
  });
  test(`apiFetch ${side}: existing403 terms behavior is preserved`, async () => {
    const f = apiFixture([response(403, { code: "PLATFORM_TERMS_REQUIRED", message: "Terms required" })], server);
    await assert.rejects(f.apiFetch("/api/estimates"), error => server ? error === f.redirectSentinel : error.status === 403);
    assert.deepEqual(f.events, server ? [] : ["platform-terms:required"]);
  });
}
test("apiFetch browser: silent profile retains401 without dispatching the login event", async () => {
  const f = apiFixture([response(401), response(401)]);
  await assert.rejects(f.apiFetch("/api/auth/profile", { suppressAuthEvent: true }), error => error.status === 401);
  assert.deepEqual(f.events, []);
});

const jsx = (type, props) => ({ type, props: props || {} });
const jsxRuntime = { jsx, jsxs: jsx };
const nodes = value => Array.isArray(value) ? value.flatMap(nodes)
  : value && typeof value === "object" ? [value, ...nodes(value.props?.children)] : [];
const nodeText = value => Array.isArray(value) ? value.map(nodeText).join("")
  : value && typeof value === "object" ? nodeText(value.props?.children)
    : value == null || typeof value === "boolean" ? "" : String(value);
const retryButton = tree => {
  assert.ok(nodes(tree).some(node => node.props.role === "alert"), "Failure is announced with an alert");
  const button = nodes(tree).find(node => node.type === "Button");
  assert.ok(button, "The user can explicitly retry");
  return button;
};
function profileFixture(replies) {
  const session = sessionFixture(replies), redirects = [];
  const sentinel = new Error("Simulated login redirect");
  const page = load("app/profile/page.tsx", {
    "react/jsx-runtime": jsxRuntime,
    "@/lib/session": session,
    "./profile-client": { ProfileClient: "ProfileClient" },
    "next/navigation": { redirect(target) { redirects.push(target); throw sentinel; } },
  });
  return { render: page.default, redirects, sentinel };
}
for (const kind of ["HTTP503", "network"]) {
  test(`ProfilePage: ${kind} follows the error boundary rather than redirecting to login`, async () => {
    const f = profileFixture([kind === "HTTP503" ? response(503) : { error: new TypeError("Simulated connection failure") }]);
    await assert.rejects(f.render(), error => error !== f.sentinel);
    assert.deepEqual(f.redirects, []);
  });
}
test("ProfilePage: a genuine401 still redirects to login", async () => {
  const f = profileFixture([response(401)]);
  await assert.rejects(f.render(), error => error === f.sentinel);
  assert.deepEqual(f.redirects, ["/login"]);
});
test("ProfilePage: a valid SSR session still hydrates the profile", async () => {
  const f = profileFixture([response(200, { user })]), tree = await f.render();
  assert.equal(tree.type, "ProfileClient");
  assert.deepEqual(tree.props.initialAuthUser, user);
  assert.deepEqual(f.redirects, []);
});

for (const outcome of ["success", "failure"]) {
  test(`SessionVerificationNotice: ${outcome} retry is disabled while pending and settles`, async () => {
    let state, calls = 0, resolve, reject;
    const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
    const Notice = load("components/auth/session-verification-notice.tsx", {
      "react/jsx-runtime": jsxRuntime,
      react: { useState(initial) {
        if (state === undefined) state = initial;
        return [state, value => { state = typeof value === "function" ? value(state) : value; }];
      } },
      "@/components/ui/button": { Button: "Button" },
    }).SessionVerificationNotice;
    const render = () => Notice({ onRetry: () => { calls++; return pending; } });
    assert.equal(retryButton(render()).props.disabled, false);
    retryButton(render()).props.onClick();
    assert.equal(calls, 1);
    assert.equal(retryButton(render()).props.disabled, true);
    assert.equal(nodeText(retryButton(render())), "Retrying...");
    if (outcome === "success") resolve(user); else reject(new Error("Simulated retry failure"));
    await new Promise(setImmediate);
    assert.equal(retryButton(render()).props.disabled, false);
    assert.equal(nodeText(retryButton(render())), "Try again");
    assert.equal(calls, 1);
  });
}
test("page error boundary: retry refreshes server data and resets the boundary in a transition", () => {
  let pending = false, transition;
  const calls = [];
  const PageError = load("app/error.tsx", {
    "react/jsx-runtime": jsxRuntime,
    react: { useTransition: () => [pending, callback => { pending = true; transition = callback; }] },
    "next/navigation": { useRouter: () => ({ refresh: () => calls.push("refresh") }) },
    "@/components/ui/button": { Button: "Button" },
  }).default;
  const render = () => PageError({ reset: () => calls.push("reset") });
  retryButton(render()).props.onClick();
  assert.equal(retryButton(render()).props.disabled, true);
  assert.equal(nodeText(retryButton(render())), "Retrying...");
  assert.deepEqual(calls, []);
  transition(); pending = false;
  assert.deepEqual(calls, ["refresh", "reset"]);
  assert.equal(retryButton(render()).props.disabled, false);
});

(async () => {
  let failures = 0;
  for (const { name, run } of tests) {
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
  }
  console.log(`${tests.length - failures}/${tests.length} isolated session tests passed (simulated HTTP/framework).`);
  if (failures) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
