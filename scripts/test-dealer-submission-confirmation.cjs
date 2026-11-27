const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const company = "https://authenticevolutionco.com";
const invitation = company + "/login/dealer-registration/example";
const destination = "/login/dealer-registration/submitted";

function fixture({ url = invitation, eligible = true } = {}) {
  const storage = new Map();
  let navigationType = "navigate";
  const location = new URL(url);
  location.replace = href => { location.href = new URL(href, location).href; };
  const browser = {
    location, name: "", crypto: { randomUUID: () => "fixture-nonce" },
    performance: { getEntriesByType: () => [{ type: navigationType }] },
    history: { state: { next: true }, replaceState(value) { this.state = value; } },
    sessionStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
  };
  function load(file, imports) {
    const source = fs.readFileSync(path.join(__dirname, "../src/lib", file + ".ts"), "utf8");
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    const exports = {};
    new Function("exports", "require", "window", outputText)(exports, id => {
      assert.ok(Object.hasOwn(imports, id), id);
      return imports[id];
    }, browser);
    return exports;
  }
  const receipt = load("dealer-submission-receipt", {});
  const form = load("dealer-submission-confirmation", {
    "@/components/company/company-content": { dealerRegistrationUrl: invitation },
    "./registration-pixel": { hasEligibleDealerCampaign: () => eligible },
    "./dealer-submission-receipt": receipt,
  });
  return { receipt, form, browser, storage, navigation: type => { navigationType = type; } };
}

test("a saved public dealer application transfers only a generic receipt and reports once", () => {
  const { receipt, form, browser, storage } = fixture({ url: invitation + "?lang=es&utm_source=facebook&utm_campaign=fall" });
  assert.ok(form.openDealerSubmissionConfirmation("example", "Dealer", "es"));
  assert.equal(browser.location.href, company + destination);
  const stored = JSON.parse([...storage.values()][0]);
  assert.deepEqual(Object.keys(stored).sort(), ["issuedAt", "locale", "nonce"]);
  assert.equal(receipt.consumeDealerConversionHandoff(), false);
  assert.deepEqual(receipt.takeDealerSubmissionReceipt(), { locale: "es", fresh: true });
  assert.equal(storage.size, 0);
  assert.equal(browser.name, "");
  assert.ok(receipt.consumeDealerConversionHandoff());
  assert.equal(receipt.consumeDealerConversionHandoff(), false);
  assert.deepEqual(receipt.takeDealerSubmissionReceipt(), { locale: "es", fresh: false });
  assert.equal(receipt.consumeDealerConversionHandoff(), false);
  assert.ok(browser.history.state.next);
});

test("partner, organic and wrong-token submissions stay in their existing form", () => {
  for (const [token, level, opts] of [
    ["example", "Subdealer", {}], ["example", "Distributor", {}], ["personal", "Dealer", {}],
    ["example", "Dealer", { eligible: false }], ["example", "Dealer", { url: invitation.replace("example", "personal") }],
    ["example", "Dealer", { url: invitation.replace(company, "https://example.org") }],
  ]) {
    const { form, storage } = fixture(opts);
    assert.equal(form.openDealerSubmissionConfirmation(token, level, "en"), false);
    assert.equal(storage.size, 0);
  }
});

test("direct visits, copied URLs, refreshes and history traversal cannot report a conversion", () => {
  const direct = fixture({ url: company + destination });
  assert.equal(direct.receipt.takeDealerSubmissionReceipt(), null);
  assert.equal(direct.receipt.consumeDealerConversionHandoff(), false);
  for (const type of ["reload", "back_forward", "copied-tab"]) {
    const { form, navigation, browser, receipt } = fixture();
    assert.ok(form.openDealerSubmissionConfirmation("example", "Dealer", "en"));
    if (type === "copied-tab") browser.name = "";
    else navigation(type);
    assert.ok(!receipt.takeDealerSubmissionReceipt()?.fresh);
    assert.equal(receipt.consumeDealerConversionHandoff(), false);
  }
});

test("blocked storage falls back to the same successful registration page", () => {
  const { form, browser } = fixture();
  browser.sessionStorage.setItem = () => { throw Error("blocked"); };
  assert.equal(form.openDealerSubmissionConfirmation("example", "Dealer", "es"), false);
  assert.equal(browser.location.href, invitation);
});
