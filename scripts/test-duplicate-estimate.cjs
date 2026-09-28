/* Ejecuta el diálogo real con estado React, router y API simulados.
 * Desde frontend: node scripts/test-duplicate-estimate.cjs */
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const assert = require("node:assert/strict");
const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname,
  "../src/components/estimates/duplicate-estimate-dialog.tsx"), "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const jsx = (type, props) => ({ type, props });
const nodes = value => Array.isArray(value) ? value.flatMap(nodes)
  : value && typeof value === "object" ? [value, ...nodes(value.props?.children)] : [];
const flush = () => new Promise(resolve => setImmediate(resolve));
const actor = (id = 7, name = "dealer") => ({ id, role: { name } });

function fixture(installation = null) {
  const state = [], calls = [], navigation = [], successes = [];
  let cursor = 0, closed = 0, failure = null, release = null, hold = false;
  class ApiError extends Error { constructor(message, data) { super(message); this.data = data; } }
  const mocks = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react: {
      useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], v => { state[i] = v; }]; },
      useRef(initial) { const i = cursor++; if (!(i in state)) state[i] = { current: initial }; return state[i]; },
    },
    "next/navigation": { useRouter: () => ({ push: value => navigation.push(value), refresh: () => navigation.push("refresh") }) },
    "lucide-react": { Copy: "Copy", Loader2: "Loader2" },
    sonner: { toast: { success: value => successes.push(value) } },
    "@/app/api/_base": { isApiError: error => error instanceof ApiError },
    "@/app/api/estimates.api": { duplicateEstimate: async (id, data) => {
      calls.push({ id, data });
      if (hold) await new Promise(resolve => { release = resolve; });
      if (failure) throw failure;
      return { id: 900, number: "191000" };
    } },
    "@/components/ui/button": { Button: "Button" },
    "@/components/ui/input": { Input: "Input" },
    "@/components/ui/dialog": Object.fromEntries(["Dialog", "DialogContent", "DialogHeader", "DialogTitle", "DialogDescription", "DialogFooter"].map(n => [n, n])),
  };
  const exports = {};
  new Function("require", "exports", code)(name => { assert.ok(name in mocks, name); return mocks[name]; }, exports);
  const estimate = { id: 1, number: "190001", name: "Customer project", idUser: 7, user: { role: { name: "dealer" } }, installationJob: installation };
  const render = () => { cursor = 0; return nodes(exports.DuplicateEstimateDialog({ estimate, onClose: () => closed++ })); };
  const radio = () => render().filter(n => n.type === "input" && n.props.type === "radio");
  const submitButton = () => render().find(n => n.type === "Button" && n.props.type === "submit");
  const submit = () => render().find(n => n.type === "form").props.onSubmit({ preventDefault() {} });
  return { ...exports, estimate, calls, navigation, successes, render, radio, submitButton, submit,
    choose: include => { radio()[include ? 1 : 0].props.onChange(); },
    closed: () => closed, setFailure: (message, data) => { failure = message ? new ApiError(message, data) : null; },
    hold: () => { hold = true; }, release: () => release(),
  };
}

(async () => {
  for (const installation of [null, { status: "CANCELED" }]) {
    const f = fixture(installation);
    assert.equal(f.radio().length, 0, "Sin instalación no hay selector");
    assert.equal(f.submitButton().props.disabled, false);
    assert.equal(f.calls.length, 0, "Abrir el diálogo no crea registros");
    f.submit(); await flush();
    assert.deepEqual(f.calls, [{ id: 1, data: { name: "Customer project (copy)", includeInstallation: false } }]);
    assert.deepEqual(f.navigation, ["/estimates/900/edit", "refresh"]);
    assert.equal(f.closed(), 1);
  }
  for (const include of [true, false]) {
    const f = fixture({ status: "APPROVED" });
    assert.equal(f.radio().length, 2);
    assert.equal(f.submitButton().props.disabled, true, "Se exige elegir antes de crear");
    f.submit(); await flush(); assert.equal(f.calls.length, 0);
    f.choose(include); f.submit(); await flush();
    assert.equal(f.calls[0].data.includeInstallation, include);
    assert.deepEqual(f.navigation, ["/estimates/900/edit", "refresh"]);
  }
  {
    const f = fixture(); f.hold();
    const submit = f.render().find(n => n.type === "form").props.onSubmit;
    submit({ preventDefault() {} }); submit({ preventDefault() {} });
    assert.equal(f.calls.length, 1, "La referencia bloquea doble envío antes de renderizar");
    f.render().find(n => n.type === "Dialog").props.onOpenChange(false);
    assert.equal(f.closed(), 0);
    f.release(); await flush(); assert.equal(f.closed(), 1);
  }
  {
    const f = fixture({ status: "APPROVED" }); f.choose(true);
    f.setFailure("Unavailable", { code: "INSTALLATION_OUTSIDE_COVERAGE" });
    f.submit(); await flush();
    assert.equal(f.calls.length, 1, "No se omite instalación automáticamente");
    assert.equal(f.navigation.length, 0); assert.equal(f.closed(), 0);
    assert.ok(f.render().some(n => n.props?.role === "alert"));
    assert.equal(f.radio()[1].props.disabled, true);
    assert.equal(f.submitButton().props.disabled, true);
    f.setFailure(null); f.choose(false); f.submit(); await flush();
    assert.equal(f.calls.length, 2); assert.equal(f.calls[1].data.includeInstallation, false);
  }
  {
    const f = fixture({ status: "APPROVED" }); f.choose(true);
    f.setFailure("Address verification is temporarily unavailable."); f.submit(); await flush();
    assert.equal(f.radio()[1].props.disabled, false, "Una caída temporal no equivale a falta de cobertura");
    assert.equal(f.submitButton().props.disabled, false);
    assert.equal(f.navigation.length, 0);
    f.render().find(n => n.type === "Button" && n.props.type === "button").props.onClick();
    assert.equal(f.closed(), 1); assert.equal(f.calls.length, 1);
  }
  {
    const f = fixture();
    for (const role of ["admin", "operator"]) assert.equal(f.canDuplicateEstimate(f.estimate, actor(99, role)), true);
    assert.equal(f.canDuplicateEstimate(f.estimate, actor()), true);
    assert.equal(f.canDuplicateEstimate(f.estimate, actor(8)), false);
    assert.equal(f.canDuplicateEstimate(f.estimate, actor(7, "technician")), false);
    f.render().find(n => n.type === "Input").props.onChange({ target: { value: "   " } });
    assert.equal(f.submitButton().props.disabled, true);
  }
  console.log("Estimate duplication UI: choice, absence of installation, coverage, cancellation, permissions and double-submit checks passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
