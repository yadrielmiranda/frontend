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
  let failure = null, release, hold = false, result = { sent: true };
  const props = {
    estimate: { id: 1, number: "190001", idUser: 7, customerEmail: "customer@example.com", customerPhone: "(786) 555-0123", status: { name: "Active" }, user: { role: { name: "dealer" }, dealerMode: "EXTERNAL" }, dealerNetwork: { canAssist: false } },
    userRole: "dealer", currentUserId: 7, currentUserDealerMode: "INTERNAL", initialPublicView: true,
    ...overrides,
  };
  const { EstimateDetails } = load("components/estimates/estimate-details/estimate-details.tsx", {
    ...ui, react: react.react,
    "lucide-react": Object.fromEntries(["Printer", "Copy", "Share2", "Mail", "Send", "MessageSquare"].map(name => [name, name])),
    "@/components/estimates/material-revisions/material-revision-access": { MaterialRevisionAccess: "MaterialRevisionAccess" },
    "../agreements/dealer-agreement-panel": { DealerAgreementPanel: "DealerAgreementPanel" },
    "../estimate-lifecycle-actions": { EstimateLifecycleButton: "EstimateLifecycleButton" },
    "../estimate-internal-note": { EstimateInternalNote: "EstimateInternalNote" },
    "../estimate-product-approvals": { EstimateProductApprovals: "EstimateProductApprovals" },
    "@/components/navigation/back-link": { BackLink: "BackLink" },
    "./parts/estimate-report-shell": { EstimateReportShell: "EstimateReportShell" },
    "./estimate-email-recipients": load("components/estimates/estimate-details/estimate-email-recipients.ts", {}),
    "./estimate-send-result": load("components/estimates/estimate-details/estimate-send-result.ts", {}),
    "@/lib/validators-phone": load("lib/validators-phone.ts", { "libphonenumber-js/max": require("libphonenumber-js/max") }),
    "@/app/api/_base": { isApiError: error => error?.name === "ApiError" && typeof error.status === "number" },
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
      sendEstimateShare: async (id, data) => {
        calls.push({ action: "email", id, data });
        if (hold) await new Promise(resolve => { release = resolve; });
        if (failure) throw failure;
        return result;
      },
    },
  });
  const render = () => nodes(react.render(() => EstimateDetails(props)));
  const button = label => render().find(node => node.type === "Button" && text(node) === label);
  const panel = () => render().find(node => node.type === "DealerAgreementPanel");
  const input = () => render().find(node => node.type === "Input" && node.props.id === "estimate-email-recipient");
  const ccInput = () => render().find(node => node.type === "Input" && node.props.id === "estimate-email-cc");
  const phoneInput = () => render().find(node => node.type === "Input" && node.props.id === "estimate-sms-phone");
  const channel = value => render().find(node => node.type === "input" && node.props.name === "estimate-send-channel" && node.props.value === value);
  const submit = () => render().find(node => node.type === "form").props.onSubmit({ preventDefault() {} });
  const browser = () => {
    Object.defineProperty(global, "navigator", { configurable: true, value: {
      clipboard: { writeText: async value => copied.push(value) }, share: async value => shared.push(value),
    } });
    global.window = { location: { origin: "https://app.example.com", href: "" } };
  };
  return { props, calls, successes, errors, copied, shared, render, button, panel, input, ccInput, phoneInput, channel, submit, browser,
    includeContract(value) {
      panel().props.onStatusChange({ defaultContract: { id: "owner-contract" }, current: null, history: [] });
      render().find(node => node.type === "input" && node.props.type === "checkbox").props.onChange({ target: { checked: value } });
      render();
    },
    setFailure(value) { failure = value ? (value instanceof Error ? value : new Error(value)) : null; },
    setResult(value) { result = value; },
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
test("direct Send follows the actual actor's mode, including internal ancestors and admins", () => {
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
    assert.equal(Boolean(f.button("Send")), expected, `${role} ${mode}`);
  }
});
test("opening and canceling only shows an editable, prefilled required email form", () => {
  const f = fixture(); f.button("Send").props.onClick();
  assert.equal(f.input().props.value, "customer@example.com");
  assert.equal(f.input().props.type, "email");
  assert.notEqual(f.input().props.multiple, true);
  assert.equal(f.input().props.required, true);
  assert.equal(f.input().props.maxLength, 254);
  assert.equal(f.ccInput().props.value, "");
  assert.equal(f.ccInput().props.type, "email");
  assert.equal(f.ccInput().props.multiple, true);
  assert.notEqual(f.ccInput().props.required, true);
  assert.equal(f.ccInput().props.maxLength, 4096);
  assert.ok(f.render().some(node => node.type === "label" && text(node) === "To"));
  assert.ok(f.render().some(node => node.type === "label" && /CC\s*\(optional\)/.test(text(node))));
  assert.match(text(f.render()), /commas/i);
  assert.match(text(f.render()), /10 recipients/i);
  assert.deepEqual(f.calls, []);
  f.input().props.onChange({ target: { value: "someone@example.com" } });
  f.ccInput().props.onChange({ target: { value: "copy@example.com" } });
  assert.equal(f.input().props.value, "someone@example.com");
  f.button("Cancel").props.onClick();
  assert.deepEqual(f.calls, []);
  assert.equal(f.input(), undefined);
  f.button("Send").props.onClick();
  assert.equal(f.input().props.value, "customer@example.com");
  assert.equal(f.ccInput().props.value, "");
});
test("invalid or absent recipients never submit", async () => {
  const f = fixture(); f.button("Send").props.onClick();
  for (const value of ["", "   ", "invalid", "a@", "a@b", "a b@example.com",
    "valid@example.com, invalid", "valid@example.com,other@example.com", "valid@example.com,", ",valid@example.com",
    "valid@example.com,,other@example.com", "valid@example.com;other@example.com",
    `valid@example.com, ${"a".repeat(255)}@example.com`]) {
    f.input().props.onChange({ target: { value } });
    assert.equal(f.button("Send").props.disabled, true);
    await f.submit();
  }
  assert.deepEqual(f.calls, []);
  assert.ok(f.render().some(node => node.props.role === "alert"));
});

test("one invalid CC address or empty comma segment prevents the entire send", async () => {
  const f = fixture(); f.button("Send").props.onClick();
  for (const value of ["invalid", "valid@example.com, invalid", "valid@example.com,", ",valid@example.com",
    "valid@example.com,,other@example.com", "valid@example.com;other@example.com", `${"a".repeat(255)}@example.com`]) {
    f.ccInput().props.onChange({ target: { value } });
    assert.equal(f.button("Send").props.disabled, true); await f.submit();
  }
  assert.deepEqual(f.calls, []);
  assert.equal(f.input().props.value, "customer@example.com");
});
test("Send uses the selected prices and contract flag and trims the edited recipient", async () => {
  for (const pricingMode of ["detailed", "total"]) for (const includeContract of [false, true]) {
    const f = fixture();
    f.button(pricingMode === "total" ? "Customer Project Total" : "Customer Detailed Prices").props.onClick();
    f.includeContract(includeContract);
    f.button("Send").props.onClick();
    f.input().props.onChange({ target: { value: "  chosen@example.com  " } });
    await f.submit();
    assert.deepEqual(f.calls, [{ action: "email", id: 1, data: { channel: "email", to: "chosen@example.com", pricingMode, includeContract } }]);
    assert.equal(f.input(), undefined);
    assert.deepEqual(f.successes, ["Estimate email sent."]);
    assert.equal(f.panel().props.refreshKey, includeContract ? 1 : 0);
  }
});

test("To stays separate from normalized comma-separated CC addresses without duplicates", async () => {
  const f = fixture(); f.button("Send").props.onClick();
  f.input().props.onChange({ target: { value: " Primary@Example.com " } });
  f.ccInput().props.onChange({ target: { value: " Copy@Example.com , second@example.com, PRIMARY@example.com, copy@example.com " } });
  assert.equal(f.button("Send").props.disabled, false);
  await f.submit();
  assert.deepEqual(f.calls, [{ action: "email", id: 1, data: {
    channel: "email", to: "primary@example.com", cc: "copy@example.com, second@example.com", pricingMode: "detailed", includeContract: false,
  } }]);
  assert.equal(f.input(), undefined); assert.deepEqual(f.successes, ["Estimate email sent."]);
});

test("optional empty CC or a CC duplicate of To omits CC from the request", async () => {
  for (const cc of ["", "   ", " CUSTOMER@EXAMPLE.COM, customer@example.com "]) {
    const f = fixture(); f.button("Send").props.onClick();
    f.ccInput().props.onChange({ target: { value: cc } });
    assert.equal(f.button("Send").props.disabled, false); await f.submit();
    assert.deepEqual(f.calls[0].data, { channel: "email", to: "customer@example.com", pricingMode: "detailed", includeContract: false });
  }
});

test("SMS is editable, accepts formatted +1 numbers, and ignores unused email fields and account preferences", async () => {
  const f = fixture();
  f.props.estimate.customerEmail = "not-an-email";
  f.props.estimate.user.smsOptIn = false;
  f.button("Send").props.onClick(); f.channel("sms").props.onChange();
  assert.equal(f.input(), undefined); assert.equal(f.ccInput(), undefined);
  assert.equal(f.phoneInput().props.value, "(786) 555-0123");
  assert.equal(f.phoneInput().props.type, "tel"); assert.equal(f.phoneInput().props.maxLength, 80);
  f.phoneInput().props.onChange({ target: { value: "1 (305) 555-0123" } });
  assert.equal(f.button("Send").props.disabled, false);
  await f.submit();
  assert.deepEqual(f.calls, [{ action: "email", id: 1, data: { channel: "sms", phone: "+13055550123", pricingMode: "detailed", includeContract: false } }]);
  assert.deepEqual(f.successes, ["Estimate SMS sent."]); assert.equal(f.phoneInput(), undefined);
});

test("SMS rejects missing, invalid, unsupported country codes and extensions before any send", async () => {
  const f = fixture(); f.button("Send").props.onClick(); f.channel("sms").props.onChange();
  for (const value of ["", "   ", "123", "not a phone", "+442079460958", "+17865550123 ext 2", "+10000000000"]) {
    f.phoneInput().props.onChange({ target: { value } });
    assert.equal(f.button("Send").props.disabled, true, value); await f.submit();
  }
  assert.deepEqual(f.calls, []);
});

test("Both sends one request with the same pricing and contract selection used by Copy and Share", async () => {
  for (const pricingMode of ["detailed", "total"]) for (const includeContract of [false, true]) {
    const f = fixture();
    f.button(pricingMode === "total" ? "Customer Project Total" : "Customer Detailed Prices").props.onClick();
    f.includeContract(includeContract); f.button("Send").props.onClick(); f.channel("both").props.onChange();
    f.ccInput().props.onChange({ target: { value: " Copy@Example.com " } });
    await f.submit();
    assert.deepEqual(f.calls, [{ action: "email", id: 1, data: {
      channel: "both", to: "customer@example.com", cc: "copy@example.com", phone: "+17865550123", pricingMode, includeContract,
    } }]);
    assert.deepEqual(f.successes, ["Estimate sent by email and SMS."]);
    assert.equal(f.panel().props.refreshKey, includeContract ? 1 : 0);
  }
});

test("Both requires valid recipients for each channel, while Email ignores an invalid phone", async () => {
  const f = fixture(); f.props.estimate.customerPhone = "invalid";
  f.button("Send").props.onClick(); f.channel("both").props.onChange();
  assert.equal(f.button("Send").props.disabled, true); await f.submit();
  f.phoneInput().props.onChange({ target: { value: "+17865550123" } });
  f.input().props.onChange({ target: { value: "invalid" } });
  assert.equal(f.button("Send").props.disabled, true); await f.submit(); assert.deepEqual(f.calls, []);
  f.input().props.onChange({ target: { value: "customer@example.com" } });
  f.phoneInput().props.onChange({ target: { value: "invalid" } });
  f.channel("email").props.onChange(); assert.equal(f.phoneInput(), undefined);
  assert.equal(f.button("Send").props.disabled, false); await f.submit();
  assert.equal(f.calls[0].data.channel, "email"); assert.equal(f.calls[0].data.phone, undefined);
});

test("Both shows each outcome and retries only the definitely failed channel", async () => {
  for (const failed of ["email", "sms"]) {
    const f = fixture(); f.button("Send").props.onClick(); f.channel("both").props.onChange();
    f.setResult({ sent: false, email: { status: failed === "email" ? "failed" : "sent" }, sms: { status: failed === "sms" ? "failed" : "sent" } });
    await f.submit();
    assert.deepEqual(f.successes, []); assert.equal(f.calls.length, 1);
    assert.equal(f.channel(failed).props.checked, true); assert.equal(f.channel("both").props.disabled, true);
    assert.equal(f.channel(failed === "email" ? "sms" : "email").props.disabled, true);
    assert.match(text(f.render()), failed === "email" ? /SMS sent/ : /Email sent/);
    assert.match(text(f.render()), failed === "email" ? /Only email will be retried/ : /Only SMS will be retried/);
    f.setResult({ sent: true, [failed]: { status: "sent" } }); await f.submit();
    assert.equal(f.calls.length, 2); assert.equal(f.calls[1].data.channel, failed);
    assert.equal(f.calls[1].data[failed === "email" ? "phone" : "to"], undefined);
  }
});

test("unknown outcomes remain visible and cannot be submitted again from the same dialog", async () => {
  const f = fixture(); f.button("Send").props.onClick(); f.channel("both").props.onChange();
  f.setResult({ sent: false, email: { status: "sent" }, sms: { status: "unknown" } });
  await f.submit();
  assert.deepEqual(f.successes, []); assert.match(text(f.render()), /SMS delivery was not confirmed/);
  assert.match(text(f.render()), /Check whether it arrived/); assert.equal(f.button("Send").props.disabled, true);
  await f.submit(); assert.equal(f.calls.length, 1);
  f.button("Close").props.onClick(); f.button("Send").props.onClick();
  assert.equal(f.channel("email").props.checked, true); assert.equal(f.channel("both").props.disabled, false);
});

test("closing or changing estimate context clears the phone, channel and outcomes", async () => {
  const f = fixture(); f.button("Send").props.onClick(); f.channel("sms").props.onChange();
  f.phoneInput().props.onChange({ target: { value: "+13055550123" } });
  f.button("Cancel").props.onClick(); f.button("Send").props.onClick();
  assert.equal(f.channel("email").props.checked, true); f.channel("sms").props.onChange();
  assert.equal(f.phoneInput().props.value, "(786) 555-0123");
  f.props.estimate = { ...f.props.estimate, customerPhone: "+13055550123" };
  assert.equal(f.phoneInput(), undefined);
  f.button("Send").props.onClick(); f.channel("sms").props.onChange();
  assert.equal(f.phoneInput().props.value, "+13055550123");
  f.props.estimate.status.name = "Canceled"; assert.equal(f.phoneInput(), undefined);
  assert.equal(f.button("Send"), undefined);
});

test("up to ten unique recipients are allowed while an eleventh prevents any send", async () => {
  const recipients = Array.from({ length: 11 }, (_, index) => `person${index}@example.com`);
  const f = fixture(); f.button("Send").props.onClick();
  f.input().props.onChange({ target: { value: recipients[0] } });
  f.ccInput().props.onChange({ target: { value: recipients.slice(1).join(", ") } });
  assert.equal(f.button("Send").props.disabled, true); await f.submit();
  assert.deepEqual(f.calls, []); assert.match(text(f.render()), /10/);
  f.ccInput().props.onChange({ target: { value: [...recipients.slice(1, 10), recipients[0].toUpperCase(), recipients[1]].join(", ") } });
  assert.equal(f.button("Send").props.disabled, false); await f.submit();
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].data.to, recipients[0]);
  assert.equal(f.calls[0].data.cc, recipients.slice(1, 10).join(", "));
});

test("partial email acceptance offers only the rejected addresses for an explicit retry", async () => {
  const f = fixture(); f.includeContract(true); f.button("Send").props.onClick();
  f.input().props.onChange({ target: { value: "rejected@example.com" } });
  f.ccInput().props.onChange({ target: { value: "accepted@example.com" } });
  f.setResult({ sent: false, email: { status: "partial", accepted: ["accepted@example.com"], rejected: ["rejected@example.com"], unconfirmed: [] } });
  await f.submit(); await flush();
  assert.equal(f.calls.length, 1); assert.deepEqual(f.successes, []);
  assert.equal(f.input().props.value, "rejected@example.com");
  assert.equal(f.ccInput().props.value, "");
  const alert = f.render().filter(node => node.props.role === "status").map(text).join(" ");
  assert.match(alert, /accepted@example\.com/); assert.match(alert, /rejected@example\.com/);
  assert.match(alert, /accepted|sent/i); assert.match(alert, /reject/i);
  assert.match(alert, /retry|retried/i);
  assert.equal(f.panel().props.refreshKey, 1);
  f.setResult({ sent: true }); await f.submit();
  assert.equal(f.calls.length, 2); assert.equal(f.calls[1].data.to, "rejected@example.com");
  assert.equal(f.calls[1].data.cc, undefined);
  assert.equal(f.calls[1].data.includeContract, true); assert.deepEqual(f.successes, ["Estimate email sent."]);
});

test("unconfirmed recipients keep original To and CC for manual checking without any automatic resend", async () => {
  const f = fixture(); f.button("Send").props.onClick();
  f.input().props.onChange({ target: { value: "accepted@example.com" } });
  f.ccInput().props.onChange({ target: { value: "rejected@example.com, unknown@example.com" } });
  f.setResult({ sent: false, email: { status: "partial", accepted: ["accepted@example.com"], rejected: ["rejected@example.com"], unconfirmed: ["unknown@example.com"] } });
  await f.submit(); await flush();
  assert.equal(f.calls.length, 1); assert.deepEqual(f.successes, []);
  assert.equal(f.input().props.value, "accepted@example.com");
  assert.equal(f.ccInput().props.value, "rejected@example.com, unknown@example.com");
  const alert = f.render().filter(node => node.props.role === "status").map(text).join(" ");
  assert.match(alert, /accepted@example\.com/); assert.match(alert, /rejected@example\.com/); assert.match(alert, /unknown@example\.com/);
  assert.match(alert, /confirm/i); assert.match(alert, /check/i);
  assert.equal(f.button("Send").props.disabled, true);
  await f.submit(); assert.equal(f.calls.length, 1);
  assert.equal(f.panel().props.refreshKey, 0);
});

test("a partial result for an old estimate cannot replace recipients or show errors on the current estimate", async () => {
  const f = fixture(); f.button("Send").props.onClick();
  f.input().props.onChange({ target: { value: "accepted@example.com" } });
  f.ccInput().props.onChange({ target: { value: "rejected@example.com" } });
  f.setResult({ sent: false, email: { status: "partial", accepted: ["accepted@example.com"], rejected: ["rejected@example.com"], unconfirmed: [] } });
  f.hold(); const sending = f.submit();
  f.props.estimate = { ...f.props.estimate, id: 2, customerEmail: "current@example.com" };
  assert.equal(f.input(), undefined); f.release(); await sending;
  assert.deepEqual(f.successes, []); assert.equal(f.render().some(node => node.props.role === "alert"), false);
  f.button("Send").props.onClick(); assert.equal(f.input().props.value, "current@example.com");
  assert.equal(f.ccInput().props.value, "");
});
test("failed sends stay open for an explicit retry and never claim success", async () => {
  const f = fixture(); f.button("Send").props.onClick(); f.setFailure(Object.assign(new Error("Email delivery unavailable."), { name: "ApiError", status: 400 }));
  await f.submit();
  assert.equal(f.calls.length, 1);
  assert.ok(f.render().some(node => node.props.role === "alert" && text(node).includes("Email delivery unavailable.")));
  assert.equal(f.button("Send").props.disabled, false);
  assert.deepEqual(f.successes, []);
  f.setFailure(null); await f.submit();
  assert.equal(f.calls.length, 2);
  assert.deepEqual(f.successes, ["Estimate email sent."]);
  const timedOut = fixture(); timedOut.button("Send").props.onClick();
  timedOut.setFailure(Object.assign(new Error("aborted"), { name: "AbortError" }));
  await timedOut.submit();
  assert.equal(timedOut.calls.length, 1);
  assert.ok(timedOut.render().some(node => node.props.role === "alert" && text(node).includes("Check whether the selected messages arrived")));
  assert.equal(timedOut.button("Send").props.disabled, true);
  await timedOut.submit(); assert.equal(timedOut.calls.length, 1);
});
test("a synchronous busy guard prevents double submits and locks sharing choices until completion", async () => {
  const f = fixture(); f.includeContract(true); f.button("Send").props.onClick(); f.hold();
  const submit = f.render().find(node => node.type === "form").props.onSubmit;
  const first = submit({ preventDefault() {} });
  await submit({ preventDefault() {} });
  assert.equal(f.calls.length, 1);
  for (const label of ["Preparing…", "Share", "Send", "Customer Detailed Prices", "Customer Project Total", "Cancel"])
    assert.equal(f.button(label).props.disabled, true, label);
  assert.equal(f.input().props.disabled, true);
  assert.equal(f.ccInput().props.disabled, true);
  assert.equal(f.render().find(node => node.type === "input" && node.props.type === "checkbox").props.disabled, true);
  f.render().find(node => node.type === "Dialog" && node.props.open).props.onOpenChange(false);
  assert.ok(f.input());
  f.release(); await first;
  assert.equal(f.input(), undefined);
});

test("network loss and ambiguous server failures do not offer a duplicate send", async () => {
  for (const error of [new TypeError("Failed to fetch"), new Error("Connection closed"),
    Object.assign(new Error("Internal server error"), { name: "ApiError", status: 500 }),
    Object.assign(new Error("Request timed out"), { name: "ApiError", status: 408 })]) {
    const f = fixture(); f.button("Send").props.onClick(); f.channel("both").props.onChange();
    f.setFailure(error); await f.submit();
    assert.equal(f.calls.length, 1); assert.deepEqual(f.successes, []);
    assert.equal(f.button("Send").props.disabled, true); assert.match(text(f.render()), /Check whether the selected messages arrived/);
    await f.submit(); assert.equal(f.calls.length, 1);
  }
});

test("explicit readiness failure shows its explanation without implying a message was sent", async () => {
  const f = fixture(); f.button("Send").props.onClick(); f.channel("both").props.onChange();
  f.setFailure(Object.assign(new Error("Message delivery is disabled in development."), {
    name: "ApiError", status: 503, data: { code: "ESTIMATE_SHARE_NOT_SENT" },
  }));
  await f.submit();
  assert.equal(f.calls.length, 1); assert.deepEqual(f.successes, []);
  assert.match(text(f.render()), /Message delivery is disabled in development/);
  assert.equal(f.button("Send").props.disabled, false);
  assert.equal(f.render().some(node => node.props.role === "status"), false);
});
test("contract removal while the email dialog is open preserves the explicit choice and shows the server error", async () => {
  const f = fixture(); f.includeContract(true); f.button("Send").props.onClick();
  f.panel().props.onStatusChange({ defaultContract: null, current: null, history: [] });
  assert.ok(f.input());
  f.setFailure(Object.assign(new Error("The estimate owner has no contract uploaded."), { name: "ApiError", status: 400 }));
  await f.submit();
  assert.equal(f.calls[0].data.includeContract, true);
  assert.ok(f.input());
  assert.ok(f.render().some(node => node.props.role === "alert" && text(node).includes("owner has no contract")));
  assert.deepEqual(f.successes, []);
});
test("prop changes cannot reuse a stale recipient, estimate or in-flight result", async () => {
  const f = fixture(); f.button("Send").props.onClick();
  f.input().props.onChange({ target: { value: "edited@example.com" } });
  const staleSubmit = f.render().find(node => node.type === "form").props.onSubmit;
  f.props.estimate = { ...f.props.estimate, id: 2, number: "190002", customerEmail: "next@example.com" };
  assert.equal(f.input(), undefined);
  await staleSubmit({ preventDefault() {} });
  assert.deepEqual(f.calls, []);
  f.button("Send").props.onClick();
  assert.equal(f.input().props.value, "next@example.com");
  f.hold(); const pending = f.submit();
  f.props.estimate = { ...f.props.estimate, id: 3, customerEmail: "third@example.com" };
  assert.equal(f.input(), undefined);
  f.release(); await pending;
  assert.deepEqual(f.calls, [{ action: "email", id: 2, data: { channel: "email", to: "next@example.com", pricingMode: "detailed", includeContract: false } }]);
  assert.deepEqual(f.successes, []);
  f.button("Send").props.onClick();
  assert.equal(f.input().props.value, "third@example.com");
  f.props.estimate = { ...f.props.estimate, customerEmail: "updated@example.com" };
  assert.equal(f.input(), undefined);
  f.button("Send").props.onClick();
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
  assert.equal(f.button("Send"), undefined);
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

test("Send API helper preserves independent outcomes and does not supply its own link", async () => {
  const calls = [], result = { sent: false, email: { status: "sent" }, sms: { status: "failed", message: "SMS unavailable." } };
  const { sendEstimateShare } = load("app/api/estimates.api.ts", { "./_base": { apiFetch: async (...args) => { calls.push(args); return result; } } });
  const data = { channel: "both", to: "customer@example.com", phone: "+17865550123", pricingMode: "total", includeContract: true };
  assert.deepEqual(await sendEstimateShare(15, data), result);
  assert.deepEqual(calls, [["/api/estimates/15/share-message", { method: "POST", body: data, timeoutMs: 120000 }]]);
});

test("email API helper preserves a multi-recipient partial result without converting it to success", async () => {
  const calls = [], result = { sent: false, accepted: ["one@example.com"], rejected: ["two@example.com"], unconfirmed: [] };
  const { emailEstimateShare } = load("app/api/estimates.api.ts", { "./_base": { apiFetch: async (...args) => { calls.push(args); return result; } } });
  const data = { to: "one@example.com", cc: "two@example.com", pricingMode: "detailed", includeContract: false };
  assert.deepEqual(await emailEstimateShare(15, data), result);
  assert.equal(calls.length, 1); assert.deepEqual(calls[0][1].body, data);
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

function detailPageFixture({ user = { id: 99, role: { name: "admin" } }, status = "Pending order review", ownerRole = "dealer", canAssist = false } = {}) {
  const estimate = { id: 215, idUser: 7, user: { role: { name: ownerRole } }, status: { name: status }, dealerNetwork: { canAssist } };
  const { default: page } = load("app/estimates/[id]/page.tsx", {
    "react/jsx-runtime": ui["react/jsx-runtime"],
    "next/navigation": {
      notFound: () => { throw new Error("not found"); },
      redirect: url => { throw new Error(`redirect:${url}`); },
    },
    "@/app/api/estimates.api": { getEstimate: async () => estimate },
    "@/lib/session": { getCurrentUser: async () => user },
    "@/components/estimates/estimate-details": { EstimateDetails: "EstimateDetails" },
    "@/app/api/_base": { isApiError: () => false },
    "@/lib/rbac": load("lib/rbac.ts", {}),
  });
  return query => page({ params: Promise.resolve({ id: "215" }), searchParams: Promise.resolve(query) });
}

test("pending review opens explicit details from the editor or list for authorized actors", async () => {
  for (const user of [
    { id: 99, role: { name: "admin" } }, { id: 99, role: { name: "operator" } },
    { id: 7, role: { name: "dealer" } }, { id: 7, role: { name: "client" } },
  ]) {
    const page = detailPageFixture({ user, ownerRole: user.role.name === "client" ? "client" : "dealer" });
    for (const query of [{ from: "edit" }, { view: "details" }, { from: "edit", view: "details" }]) {
      const tree = await page(query);
      assert.equal(tree.type, "EstimateDetails");
      assert.equal(tree.props.returnToEdit, query.from === "edit");
      assert.equal(tree.props.initialPublicView, false);
      assert.equal(tree.props.currentUserId, user.id);
    }
  }
  const assisted = await detailPageFixture({ user: { id: 8, role: { name: "dealer" } }, canAssist: true })({ view: "details" });
  assert.equal(assisted.type, "EstimateDetails");
});

test("pending review keeps default navigation in the editor and preserves customer reports", async () => {
  const page = detailPageFixture();
  for (const query of [{}, { from: "list" }, { view: "unknown" }, { pricing: "total" }]) {
    await assert.rejects(page(query), /^Error: redirect:\/estimates\/215\/edit$/);
  }
  const publicReport = await page({ view: "public", pricing: "total" });
  assert.equal(publicReport.props.initialPublicView, true);
  assert.equal(publicReport.props.initialCustomerPricingMode, "total");
  assert.equal(publicReport.props.returnToEdit, false);
});

test("explicit details never bypass authentication or estimate ownership checks", async () => {
  for (const user of [null, { id: 8, role: { name: "dealer" } }, { id: 8, role: { name: "client" } }]) {
    const page = detailPageFixture({ user });
    for (const query of [{ from: "edit" }, { view: "details" }, { from: "edit", view: "details" }]) {
      await assert.rejects(page(query), /^Error: not found$/);
    }
  }
});

test("active and ordered estimates retain default report navigation", async () => {
  for (const status of ["Active", "Ordered"]) {
    const tree = await detailPageFixture({ status })({});
    assert.equal(tree.type, "EstimateDetails");
    assert.equal(tree.props.returnToEdit, false);
    assert.equal(tree.props.initialPublicView, false);
  }
});

test("report and pricing toggles preserve the explicit return to the estimate editor", () => {
  const f = fixture({ userRole: "admin", currentUserId: 99, initialPublicView: false, returnToEdit: true });
  f.props.estimate.status.name = "Pending order review";
  for (const label of ["Dealer Report", "Customer Detailed Prices", "Customer Project Total", "Admin Report"]) {
    f.button(label).props.onClick();
    const back = f.render().find(node => node.type === "BackLink");
    assert.equal(back.props.href, "/estimates/1/edit", label);
    assert.equal(back.props.label, "Back to Edit Estimate", label);
  }
  const listView = fixture({ returnToEdit: false });
  assert.equal(listView.render().find(node => node.type === "BackLink").props.href, "/estimates");
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
