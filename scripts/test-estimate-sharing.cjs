/* Real frontend components with isolated React hooks, browser and request mocks.
 * From frontend: node scripts/test-estimate-sharing.cjs */
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const assert = require("node:assert/strict");
const jsx = (type, props) => ({ type, props });
const text = value => Array.isArray(value) ? value.map(text).join("")
  : value && typeof value === "object" ? text(value.props?.children)
  : value == null || typeof value === "boolean" ? "" : String(value);
const nodes = value => Array.isArray(value) ? value.flatMap(nodes)
  : value && typeof value === "object"
    ? [value, ...(value.type === "Dialog" && !value.props.open ? [] : nodes(value.props?.children))] : [];
const flush = () => new Promise(setImmediate);
function load(file, mocks) {
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, "../src", file), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  new Function("require", "exports", code)(name => {
    assert.ok(name in mocks, `Unexpected dependency: ${name}`);
    return mocks[name];
  }, exports);
  return exports;
}
function hooks() {
  const state = [];
  let cursor = 0, dirty = false, effects = [];
  const changed = (before, after) => !before || after.some((value, i) => !Object.is(before[i], value));
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in state)) {
        state[i] = { value: typeof initial === "function" ? initial() : initial };
        state[i].set = value => {
          const next = typeof value === "function" ? value(state[i].value) : value;
          if (!Object.is(next, state[i].value)) { state[i].value = next; dirty = true; }
        };
      }
      return [state[i].value, state[i].set];
    },
    useRef(initial) { const i = cursor++; return state[i] ??= { current: initial }; },
    useMemo(fn, deps) {
      const i = cursor++;
      if (changed(state[i]?.deps, deps)) state[i] = { value: fn(), deps };
      return state[i].value;
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (changed(state[i]?.deps, deps)) {
        effects.push(() => { state[i]?.cleanup?.(); state[i] = { deps, cleanup: fn() }; });
      }
    },
  };
  return { react, render(component) {
    let tree;
    for (let i = 0; i < 20; i++) {
      cursor = 0; dirty = false; effects = [];
      tree = component();
      effects.forEach(effect => effect());
      if (!dirty) return tree;
    }
    throw new Error("Component did not settle");
  }, unmount() { state.forEach(item => item?.cleanup?.()); } };
}
const ui = {
  "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
  "@/components/ui/button": { Button: "Button" },
  "@/components/ui/input": { Input: "Input" },
  "@/components/ui/dialog": Object.fromEntries(["Dialog", "DialogContent", "DialogHeader", "DialogTitle", "DialogDescription", "DialogFooter"].map(name => [name, name])),
};
function fixture(overrides = {}) {
  const react = hooks(), calls = [], successes = [], errors = [], copied = [], shared = [];
  let failure = null, release, hold = false;
  const props = {
    estimate: { id: 1, number: "190001", idUser: 7, customerEmail: "customer@example.com", status: { name: "Active" }, user: { role: { name: "dealer" }, dealerMode: "EXTERNAL" }, dealerNetwork: { canAssist: false } },
    userRole: "dealer", currentUserId: 7, currentUserDealerMode: "INTERNAL", initialPublicView: true,
    ...overrides,
  };
  const { EstimateDetails } = load("components/estimates/estimate-details/estimate-details.tsx", {
    ...ui, react: react.react,
    "lucide-react": Object.fromEntries(["Printer", "Copy", "Share2", "Mail"].map(name => [name, name])),
    "@/components/estimates/material-revisions/material-revision-access": { MaterialRevisionAccess: "MaterialRevisionAccess" },
    "../agreements/dealer-agreement-panel": { DealerAgreementPanel: "DealerAgreementPanel" },
    "../estimate-lifecycle-actions": { EstimateLifecycleButton: "EstimateLifecycleButton" },
    "@/components/navigation/back-link": { BackLink: "BackLink" },
    "./parts/estimate-report-shell": { EstimateReportShell: "EstimateReportShell" },
    ...Object.fromEntries([
      ["client", "EstimateViewClient"], ["dealer-internal", "EstimateViewDealerInternal"],
      ["admin", "EstimateViewAdmin"], ["dealer-public", "EstimateViewDealerPublic"],
    ].map(([file, name]) => [`./views/estimate-view-${file}`, { [name]: name }])),
    "@/lib/rbac": load("lib/rbac.ts", {}),
    sonner: { toast: { success: message => successes.push(message), error: message => errors.push(message) } },
    "@/app/api/contracts.api": { prepareEstimateAgreement: async (...args) => {
      calls.push({ action: "contract", args }); return { current: { id: "owner-agreement" } };
    } },
    "@/app/api/estimates.api": {
      getOrCreateEstimatePublicToken: async (...args) => { calls.push({ action: "token", args }); return { token: "owner-token" }; },
      emailEstimateShare: async (id, data) => {
        calls.push({ action: "email", id, data });
        if (hold) await new Promise(resolve => { release = resolve; });
        if (failure) throw failure;
        return { sent: true };
      },
    },
  });
  const render = () => nodes(react.render(() => EstimateDetails(props)));
  const button = label => render().find(node => node.type === "Button" && text(node) === label);
  const panel = () => render().find(node => node.type === "DealerAgreementPanel");
  const input = () => render().find(node => node.type === "Input");
  const submit = () => render().find(node => node.type === "form").props.onSubmit({ preventDefault() {} });
  const browser = () => {
    Object.defineProperty(global, "navigator", { configurable: true, value: {
      clipboard: { writeText: async value => copied.push(value) }, share: async value => shared.push(value),
    } });
    global.window = { location: { origin: "https://app.example.com", href: "" } };
  };
  return { props, calls, successes, errors, copied, shared, render, button, panel, input, submit, browser,
    includeContract(value) {
      panel().props.onStatusChange({ defaultContract: { id: "owner-contract" }, current: null, history: [] });
      render().find(node => node.type === "input" && node.props.type === "checkbox").props.onChange({ target: { checked: value } });
      render();
    },
    setFailure(value) { failure = value ? (value instanceof Error ? value : new Error(value)) : null; },
    hold() { hold = true; }, release() { hold = false; release(); },
  };
}
const tests = [];
const test = (name, run) => tests.push({ name, run });
test("owner, ancestor dealers and administrators can share; unrelated dealers and operators cannot", () => {
  for (const [role, id, assist, expected] of [
    ["dealer", 7, false, true], ["dealer", 8, true, true], ["admin", 99, false, true],
    ["dealer", 8, false, false], ["operator", 99, true, false], ["operator", 7, true, false], ["client", 7, true, false],
  ]) {
    const f = fixture({ userRole: role, currentUserId: id });
    f.props.estimate.dealerNetwork.canAssist = assist;
    assert.equal(Boolean(f.button("Share")), expected, `${role}, owner ${id === 7}, assist ${assist}`);
    assert.equal(Boolean(f.button("Copy link")), expected);
    assert.equal(f.panel()?.props.canShare, expected);
  }
  const canceled = fixture(); canceled.props.estimate.status.name = "Canceled";
  assert.equal(Boolean(canceled.button("Share")), false);
  const customer = fixture(); customer.props.estimate.user.role.name = "client";
  assert.equal(Boolean(customer.button("Share")), false);
  const dealerView = fixture({ initialPublicView: false });
  assert.equal(Boolean(dealerView.button("Share")), false);
  dealerView.button("Customer Detailed Prices").props.onClick();
  assert.ok(dealerView.button("Share"));
});
test("direct email follows the actual actor's mode, including internal ancestors and admins", () => {
  for (const [role, id, mode, ownerMode, expected] of [
    ["dealer", 7, "INTERNAL", "EXTERNAL", true], ["dealer", 8, "INTERNAL", "EXTERNAL", true],
    ["dealer", 7, "EXTERNAL", "INTERNAL", false], ["dealer", 8, "EXTERNAL", "INTERNAL", false],
    ["dealer", 7, null, "INTERNAL", false], ["admin", 99, null, "EXTERNAL", true],
    ["operator", 99, "INTERNAL", "INTERNAL", false],
  ]) {
    const f = fixture({ userRole: role, currentUserId: id, currentUserDealerMode: mode });
    f.props.estimate.dealerNetwork.canAssist = true;
    f.props.estimate.user.dealerMode = ownerMode;
    f.props.estimate.dealerModeSnapshot = ownerMode;
    assert.equal(Boolean(f.button("Email")), expected, `${role} ${mode}`);
  }
});
test("opening and canceling only shows an editable, prefilled required email form", () => {
  const f = fixture(); f.button("Email").props.onClick();
  assert.equal(f.input().props.value, "customer@example.com");
  assert.equal(f.input().props.type, "email");
  assert.equal(f.input().props.required, true);
  assert.deepEqual(f.calls, []);
  f.input().props.onChange({ target: { value: "someone@example.com" } });
  assert.equal(f.input().props.value, "someone@example.com");
  f.button("Cancel").props.onClick();
  assert.deepEqual(f.calls, []);
  assert.equal(f.input(), undefined);
  f.button("Email").props.onClick();
  assert.equal(f.input().props.value, "customer@example.com");
});
test("invalid or absent recipients never submit", async () => {
  const f = fixture(); f.button("Email").props.onClick();
  for (const value of ["", "   ", "invalid", "a@", "a@b", "a b@example.com"]) {
    f.input().props.onChange({ target: { value } });
    assert.equal(f.button("Send").props.disabled, true);
    await f.submit();
  }
  assert.deepEqual(f.calls, []);
  assert.ok(f.render().some(node => node.props.role === "alert"));
});
test("Send uses the selected prices and contract flag and trims the edited recipient", async () => {
  for (const pricingMode of ["detailed", "total"]) for (const includeContract of [false, true]) {
    const f = fixture();
    f.button(pricingMode === "total" ? "Customer Project Total" : "Customer Detailed Prices").props.onClick();
    f.includeContract(includeContract);
    f.button("Email").props.onClick();
    f.input().props.onChange({ target: { value: "  chosen@example.com  " } });
    await f.submit();
    assert.deepEqual(f.calls, [{ action: "email", id: 1, data: { to: "chosen@example.com", pricingMode, includeContract } }]);
    assert.equal(f.input(), undefined);
    assert.deepEqual(f.successes, ["Estimate email sent."]);
    assert.equal(f.panel().props.refreshKey, includeContract ? 1 : 0);
  }
});
test("failed sends stay open for an explicit retry and never claim success", async () => {
  const f = fixture(); f.button("Email").props.onClick(); f.setFailure("Email delivery unavailable.");
  await f.submit();
  assert.equal(f.calls.length, 1);
  assert.ok(f.render().some(node => node.props.role === "alert" && text(node).includes("Email delivery unavailable.")));
  assert.equal(f.button("Send").props.disabled, false);
  assert.deepEqual(f.successes, []);
  f.setFailure(null); await f.submit();
  assert.equal(f.calls.length, 2);
  assert.deepEqual(f.successes, ["Estimate email sent."]);
  const timedOut = fixture(); timedOut.button("Email").props.onClick();
  timedOut.setFailure(Object.assign(new Error("aborted"), { name: "AbortError" }));
  await timedOut.submit();
  assert.equal(timedOut.calls.length, 1);
  assert.ok(timedOut.render().some(node => node.props.role === "alert" && text(node).includes("Check whether the email arrived")));
});
test("a synchronous busy guard prevents double submits and locks sharing choices until completion", async () => {
  const f = fixture(); f.includeContract(true); f.button("Email").props.onClick(); f.hold();
  const submit = f.render().find(node => node.type === "form").props.onSubmit;
  const first = submit({ preventDefault() {} });
  await submit({ preventDefault() {} });
  assert.equal(f.calls.length, 1);
  for (const label of ["Preparing…", "Share", "Email", "Customer Detailed Prices", "Customer Project Total", "Cancel"])
    assert.equal(f.button(label).props.disabled, true, label);
  assert.equal(f.input().props.disabled, true);
  assert.equal(f.render().find(node => node.type === "input" && node.props.type === "checkbox").props.disabled, true);
  f.render().find(node => node.type === "Dialog" && node.props.open).props.onOpenChange(false);
  assert.ok(f.input());
  f.release(); await first;
  assert.equal(f.input(), undefined);
});
test("contract removal while the email dialog is open preserves the explicit choice and shows the server error", async () => {
  const f = fixture(); f.includeContract(true); f.button("Email").props.onClick();
  f.panel().props.onStatusChange({ defaultContract: null, current: null, history: [] });
  assert.ok(f.input());
  f.setFailure("The estimate owner has no contract uploaded.");
  await f.submit();
  assert.equal(f.calls[0].data.includeContract, true);
  assert.ok(f.input());
  assert.ok(f.render().some(node => node.props.role === "alert" && text(node).includes("owner has no contract")));
  assert.deepEqual(f.successes, []);
});
test("prop changes cannot reuse a stale recipient, estimate or in-flight result", async () => {
  const f = fixture(); f.button("Email").props.onClick();
  f.input().props.onChange({ target: { value: "edited@example.com" } });
  const staleSubmit = f.render().find(node => node.type === "form").props.onSubmit;
  f.props.estimate = { ...f.props.estimate, id: 2, number: "190002", customerEmail: "next@example.com" };
  assert.equal(f.input(), undefined);
  await staleSubmit({ preventDefault() {} });
  assert.deepEqual(f.calls, []);
  f.button("Email").props.onClick();
  assert.equal(f.input().props.value, "next@example.com");
  f.hold(); const pending = f.submit();
  f.props.estimate = { ...f.props.estimate, id: 3, customerEmail: "third@example.com" };
  assert.equal(f.input(), undefined);
  f.release(); await pending;
  assert.deepEqual(f.calls, [{ action: "email", id: 2, data: { to: "next@example.com", pricingMode: "detailed", includeContract: false } }]);
  assert.deepEqual(f.successes, []);
  f.button("Email").props.onClick();
  assert.equal(f.input().props.value, "third@example.com");
  f.props.estimate = { ...f.props.estimate, customerEmail: "updated@example.com" };
  assert.equal(f.input(), undefined);
  f.button("Email").props.onClick();
  assert.equal(f.input().props.value, "updated@example.com");
});
test("only the estimate owner gets Upload contract; ancestors and admins see owner guidance", () => {
  for (const [role, id] of [["dealer", 7], ["dealer", 8], ["admin", 99]]) {
    const f = fixture({ userRole: role, currentUserId: id }); f.props.estimate.dealerNetwork.canAssist = true;
    f.panel().props.onStatusChange({ defaultContract: null, current: null, history: [] });
    const tree = f.render();
    assert.equal(tree.some(node => node.type === "a" && text(node) === "Upload contract"), id === 7);
    assert.equal(tree.some(node => node.type === "span" && text(node).includes("owner has no contract")), id !== 7);
    assert.equal(tree.find(node => node.type === "input" && node.props.type === "checkbox").props.disabled, true);
  }
});
test("external dealer copy and native/mailto sharing retain contract and pricing choices", async () => {
  const f = fixture({ currentUserDealerMode: "EXTERNAL" }); f.browser();
  assert.equal(f.button("Email"), undefined);
  await f.button("Copy link").props.onClick();
  assert.deepEqual(f.copied, ["https://app.example.com/public/estimates/owner-token"]);
  assert.deepEqual(f.calls, [{ action: "token", args: [1, "detailed"] }]);
  f.button("Customer Project Total").props.onClick(); f.includeContract(true);
  await f.button("Share").props.onClick();
  assert.deepEqual(f.calls.slice(1), [{ action: "token", args: [1, "total"] }, { action: "contract", args: [1, "total", true] }]);
  assert.equal(f.shared[0].url, "https://app.example.com/public/estimates/owner-token/agreements/owner-agreement");
  delete global.navigator.share;
  await f.button("Share").props.onClick();
  assert.ok(global.window.location.href.startsWith("mailto:?subject="));
  assert.ok(decodeURIComponent(global.window.location.href).includes("/agreements/owner-agreement"));
  assert.equal(f.calls.some(call => call.action === "email"), false);
});
test("agreement panel gives sharing instructions only to authorized actors", async () => {
  for (const canShare of [true, false]) {
    const h = hooks(), observed = [];
    const { DealerAgreementPanel } = load("components/estimates/agreements/dealer-agreement-panel.tsx", {
      ...ui, react: h.react,
      "@/app/api/contracts.api": {
        getEstimateAgreement: async () => ({ pendingMaterialRevisionId: 3, history: [], current: { state: "REQUIRES_NEW_SIGNATURE", invalidatedAt: "today", kind: "AGREEMENT" } }),
        ownerAgreementPdfUrl: () => "/signed.pdf",
      },
    });
    const props = { estimateId: 1, pricingMode: "detailed", refreshKey: 0, onStatusChange: value => observed.push(value), canShare };
    const render = () => h.render(() => DealerAgreementPanel(props));
    render(); await flush();
    const body = text(render());
    assert.equal(body.includes("Select Include contract"), canShare);
    assert.equal(body.includes("authorized dealer or administrator"), !canShare);
    assert.equal(observed.length, 1);
    h.unmount();
  }
});
test("email API helper uses one POST, no browser URL, and a two-minute timeout", async () => {
  const calls = [];
  const { emailEstimateShare } = load("app/api/estimates.api.ts", { "./_base": { apiFetch: async (...args) => { calls.push(args); return { sent: true }; } } });
  const data = { to: "customer@example.com", pricingMode: "total", includeContract: true };
  assert.deepEqual(await emailEstimateShare(15, data), { sent: true });
  assert.deepEqual(calls, [["/api/estimates/15/share-email", { method: "POST", body: data, timeoutMs: 120000 }]]);
});
test("server detail page supplies the actor's dealer mode rather than the owner's", async () => {
  const user = { id: 99, role: { name: "admin" }, dealerMode: "INTERNAL" };
  const estimate = { id: 1, idUser: 7, user: { role: { name: "dealer" }, dealerMode: "EXTERNAL" }, status: { name: "Active" } };
  const { default: page } = load("app/estimates/[id]/page.tsx", {
    "react/jsx-runtime": ui["react/jsx-runtime"],
    "next/navigation": { notFound: () => { throw new Error("not found"); }, redirect: () => { throw new Error("redirect"); } },
    "@/app/api/estimates.api": { getEstimate: async () => estimate },
    "@/lib/session": { getCurrentUser: async () => user },
    "@/components/estimates/estimate-details": { EstimateDetails: "EstimateDetails" },
    "@/app/api/_base": { isApiError: () => false },
    "@/lib/rbac": load("lib/rbac.ts", {}),
  });
  const tree = await page({ params: Promise.resolve({ id: "1" }), searchParams: Promise.resolve({ view: "public" }) });
  assert.equal(tree.props.currentUserDealerMode, "INTERNAL");
  assert.equal(tree.props.currentUserId, 99);
});
(async () => {
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(global, "navigator"), previousWindow = global.window;
  try {
    for (const { name, run } of tests) { await run(); console.log(`PASS ${name}`); }
    console.log(`${tests.length}/${tests.length} isolated estimate sharing tests passed.`);
  } finally {
    if (navigatorDescriptor) Object.defineProperty(global, "navigator", navigatorDescriptor); else delete global.navigator;
    if (previousWindow === undefined) delete global.window; else global.window = previousWindow;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
