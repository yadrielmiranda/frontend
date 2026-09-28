/* Componentes reales con React, router y API simulados; no modifica estimados.
 * Desde frontend: node scripts/test-estimate-lifecycle.cjs */
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const assert = require("node:assert/strict");
const file = path.resolve(
  __dirname,
  "../src/components/estimates/estimate-lifecycle-actions.tsx",
);
const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;
const jsx = (type, props) => ({ type, props });
const nodes = (value) =>
  Array.isArray(value)
    ? value.flatMap(nodes)
    : value && typeof value === "object"
      ? [value, ...nodes(value.props?.children)]
      : [];
const text = (value) =>
  Array.isArray(value)
    ? value.map(text).join("")
    : value && typeof value === "object"
      ? text(value.props?.children)
      : value == null || typeof value === "boolean"
        ? ""
        : String(value);
const actor = (id = 7, name = "dealer") => ({ id, role: { name } });
function fixture() {
  const calls = [],
    errors = [],
    successes = [],
    navigation = [];
  let closed = 0,
    failure = null;
  const request = async (action, id) => {
    calls.push({ action, id });
    if (failure) throw new Error(failure);
  };
  const mocks = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react: { useState: (initial) => [initial, () => {}] },
    "next/navigation": {
      useRouter: () => ({
        push: (url) => navigation.push(url),
        refresh: () => navigation.push("refresh"),
      }),
    },
    sonner: {
      toast: {
        success: (message) => successes.push(message),
        error: (message) => errors.push(message),
      },
    },
    "@/app/api/estimates.api": {
      cancelEstimate: (id) => request("cancel", id),
      reactivateEstimate: (id) => request("reactivate", id),
    },
    "@/components/ui/button": { Button: "Button" },
    "@/components/ui/dialog": Object.fromEntries(
      [
        "Dialog",
        "DialogContent",
        "DialogHeader",
        "DialogTitle",
        "DialogDescription",
        "DialogFooter",
      ].map((name) => [name, name]),
    ),
  };
  const exports = {};
  new Function("require", "exports", code)((name) => {
    assert.ok(name in mocks, name);
    return mocks[name];
  }, exports);
  const estimate = {
    id: 1,
    number: "190001",
    idUser: 7,
    status: { name: "Active" },
    order: null,
    payments: [],
  };
  const dialog = (action) =>
    exports.EstimateLifecycleDialog({
      estimate,
      action,
      onClose: () => closed++,
    });
  return {
    ...exports,
    estimate,
    dialog,
    calls,
    errors,
    successes,
    navigation,
    closed: () => closed,
    fail: (message) => (failure = message),
  };
}
const tests = [];
const test = (name, fn) => tests.push({ name, fn });
test("exposes cancellation only to the dealer owner and company staff", () => {
  const f = fixture();
  for (const allowed of [actor(), actor(99, "admin"), actor(99, "operator")])
    assert.equal(f.estimateLifecycleAction(f.estimate, allowed), "cancel");
  for (const denied of [null, actor(8), actor(7, "client")])
    assert.equal(f.estimateLifecycleAction(f.estimate, denied), null);
});
test("shows reactivation for canceled estimates and hides actions for orders or paid/refunded estimates", () => {
  const f = fixture();
  f.estimate.status.name = "Canceled";
  assert.equal(f.estimateLifecycleAction(f.estimate, actor()), "reactivate");
  f.estimate.order = { id: 5 };
  assert.equal(f.estimateLifecycleAction(f.estimate, actor()), null);
  f.estimate.order = null;
  for (const payment of [
    { status: "PAID" },
    { status: "REFUNDED" },
    { paidAt: "2026-09-01" },
    { netPaidBaseAmount: "1" },
    { refundedAmount: "10" },
    { refundReviewPending: true },
  ]) {
    f.estimate.payments = [payment];
    assert.equal(f.estimateLifecycleAction(f.estimate, actor()), null);
  }
});
test("allows cancellation with an open checkout so the backend can safely close it", () => {
  const f = fixture();
  f.estimate.payments = [{ status: "PENDING", stripeSessionId: "cs_1" }];
  assert.equal(f.estimateLifecycleAction(f.estimate, actor()), "cancel");
});
test("does not mutate the estimate when opening or dismissing confirmation", () => {
  const f = fixture();
  const tree = f.dialog("cancel");
  nodes(tree)
    .find((n) => n.type === "Button" && text(n) === "Go back")
    .props.onClick();
  assert.equal(f.closed(), 1);
  assert.deepEqual(f.calls, []);
});
test("cancels only after confirmation and refreshes the list", async () => {
  const f = fixture();
  nodes(f.dialog("cancel"))
    .find((n) => n.type === "Button" && text(n) === "Cancel estimate")
    .props.onClick();
  await new Promise(setImmediate);
  assert.deepEqual(f.calls, [{ action: "cancel", id: 1 }]);
  assert.equal(f.closed(), 1);
  assert.deepEqual(f.navigation, ["refresh"]);
});
test("reactivates with explicit recalculation and opens the updated estimate", async () => {
  const f = fixture(),
    tree = f.dialog("reactivate");
  assert.ok(text(tree).includes("current prices"));
  assert.ok(text(tree).includes("new signature"));
  nodes(tree)
    .find(
      (n) => n.type === "Button" && text(n) === "Reactivate and recalculate",
    )
    .props.onClick();
  await new Promise(setImmediate);
  assert.deepEqual(f.calls, [{ action: "reactivate", id: 1 }]);
  assert.deepEqual(f.navigation, ["/estimates/1", "refresh"]);
});
test("keeps the dialog open and reports a payment conflict without claiming success", async () => {
  const f = fixture();
  f.fail("A payment is processing");
  nodes(f.dialog("cancel"))
    .find((n) => n.type === "Button" && text(n) === "Cancel estimate")
    .props.onClick();
  await new Promise(setImmediate);
  assert.deepEqual(f.errors, ["A payment is processing"]);
  assert.deepEqual(f.successes, []);
  assert.equal(f.closed(), 0);
  assert.deepEqual(f.navigation, []);
});
(async () => {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`PASS ${name}`);
  }
  console.log(
    `${tests.length}/${tests.length} isolated lifecycle tests passed.`,
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
