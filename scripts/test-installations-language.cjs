// Run: node --test scripts/test-installations-language.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const root = path.resolve(__dirname, "../src");
const jsx = (type, props) => ({ type, props });
const ui = new Proxy({}, { get: (_, name) => name });

function load(filename, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  new Function("require", "exports", code)(id => {
    if (id in mocks) return mocks[id];
    if (id === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (id === "next/link") return { default: "Link" };
    if (id === "lucide-react" || id.startsWith("@/components/")) return ui;
    if (id.startsWith("@/lib/")) return load(path.join(root, id.slice(2) + ".ts"));
    if (id.startsWith("./")) return load(path.resolve(path.dirname(filename), id + ".ts"));
    throw new Error("Unexpected dependency: " + id);
  }, exports);
  return exports;
}

function descendants(node) {
  if (Array.isArray(node)) return node.flatMap(descendants);
  if (node && typeof node === "object") return [node, ...descendants(node.props.children)];
  return node == null ? [] : [node];
}

const flow = load(path.join(root, "lib/installation-flow.ts"));
test("switching languages in a job preserves appointment notes and the response sent to the API", () => {
  const calls = [];
  let locale = "en";
  let index = 0;
  const states = [];
  const initialJob = {
    id: 7, estimateId: 12, status: "MEASUREMENT_SCHEDULED", requestedAt: "2026-01-01",
    measurements: [], quotes: [], payments: [], permit: null,
    estimate: { idUser: 4, number: "EST-8", customerFirstName: "April", customerLastName: "Green", user: { role: { name: "client" } } },
    appointments: [{ id: 31, type: "REMEASUREMENT", status: "PROPOSED", startsAt: "2026-02-02T18:00:00Z", note: "Use the side door" }],
  };
  const { InstallationDetailClient } = load(path.join(root, "app/installations/[id]/installation-detail-client.tsx"), {
    "@/contexts/PortalLanguageContext": { usePortalLanguage: () => ({ locale }) },
    "next/navigation": { useRouter: () => ({}) },
    sonner: { toast: { success() {}, error: assert.fail } },
    "@/app/api/installations.api": { async respondInstallationAppointment(...args) { calls.push(args); return initialJob; } },
    react: {
      useEffect() {},
      useMemo: calculate => calculate(),
      useCallback: callback => callback,
      useState(initial) {
        const key = index++;
        if (!(key in states)) states[key] = typeof initial === "function" ? initial() : initial;
        return [states[key], value => { states[key] = typeof value === "function" ? value(states[key]) : value; }];
      },
    },
  });
  const render = () => {
    index = 0;
    return descendants(InstallationDetailClient({ initialJob, services: [], userId: 4, userRole: "client", returnHref: "/installations" }));
  };
  const english = render();
  assert.ok(english.includes("Appointments"));
  const note = "I prefer Friday / después de las tres";
  english.find(node => node?.props?.placeholder === "Optional response").props.onChange({ target: { value: note } });
  locale = "es";
  const spanish = render();
  assert.ok(spanish.includes("Citas"));
  assert.ok(spanish.includes("Use the side door"));
  assert.ok(spanish.includes("April"));
  assert.equal(spanish.find(node => node?.props?.placeholder === "Respuesta opcional").props.value, note);
  spanish.find(node => node?.type === "Button" && node.props.children === "Aceptar la fecha").props.onClick();
  assert.deepEqual(calls, [[31, "ACCEPT", note]]);
});

test("all installation stages and revision reasons have English and Spanish labels", () => {
  for (const status of flow.INSTALLATION_JOB_STATUSES) {
    for (const reason of ["FIELD_CHANGE", "PERMIT_REVISION", "DEALER_MEASUREMENTS", "REMEASUREMENT"]) {
      const english = flow.installationStageLabelFromStatus(status, reason, "en");
      const spanish = flow.installationStageLabelFromStatus(status, reason, "es");
      assert.ok(english && spanish, status);
      assert.notEqual(spanish, english, status);
    }
  }
});

const job = {
  id: 54, status: "QUOTE_DRAFT", updatedAt: "2026-01-29T20:45:00Z",
  estimate: { number: "EST999", order: { number: "ORD999" }, user: {
    firstName: "Real", lastName: "Name", username: "PrivateUser", role: { name: "dealer" },
  } },
  unitCount: 3,
  latestQuote: { version: 3, total: "130.85", approvalReason: "PERMIT_REVISION" },
  nextAppointment: { type: "REMEASUREMENT", status: "ACCEPTED", startsAt: "2026-01-29T20:45:00Z" },
};

for (const locale of ["en", "es"]) {
  test("installation list in " + locale + " preserves customer data, visibility and filter URLs", () => {
    let target;
    const { InstallationsHeader, InstallationsTable } = load(path.join(root, "app/installations/installations-table.tsx"), {
      "@/contexts/PortalLanguageContext": { usePortalLanguage: () => ({ locale }) },
      "next/navigation": { useRouter: () => ({ push: href => { target = href; } }) },
      react: { useEffect() {}, useState: initial => [initial, () => {}], useTransition: () => [false, fn => fn()] },
    });
    const query = { scope: "active", page: 2, pageSize: 25, search: "Client 9" };
    const result = { items: [job], total: 44, page: 2, pageSize: 25, totalPages: 2 };
    const render = isAdmin => descendants(InstallationsTable({ result, query, isAdmin }));
    const spanish = locale === "es";
    const nodes = render(true);
    const copy = nodes.filter(value => typeof value === "string").join("");
    for (const label of ["Real Name", "PrivateUser", "$130.85", spanish ? "Orden #ORD999" : "Order #ORD999",
      spanish ? "Nueva medición" : "Remeasurement", spanish ? "Aceptada" : "Accepted",
      spanish ? "Revisión por cambios del permiso en curso" : "Permit revision in progress"]) {
      assert.ok(copy.includes(label), label);
    }
    assert.ok(descendants(InstallationsHeader({ isAdmin: false })).includes(spanish ? "Instalaciones" : "Installations"));
    assert.ok(!render(false).includes("PrivateUser"));
    const link = nodes.find(node => node?.type === "Link");
    assert.deepEqual(link.props.href, { pathname: "/installations/54", query: { returnTo: "/installations?page=2&search=Client+9" } });
    const stage = nodes.find(node => node?.type === "Select" && node.props.value === "ALL");
    stage.props.onValueChange("COMPLETED");
    assert.equal(target, "/installations?scope=completed&status=COMPLETED&search=Client+9");
  });
}
