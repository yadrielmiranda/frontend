const test = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const path = require("node:path");
function load(name, injected = {}, env = {}, browser = {}) {
  const cache = new Map();
  function fromFile(file) {
    if (cache.has(file)) return cache.get(file);
    const input = fs.readFileSync(file, "utf8");
    const out = ts.transpileModule(input, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021}}).outputText;
    const exports = {};
    cache.set(file, exports);
    function resolve(id) {
      if (Object.hasOwn(injected, id)) return injected[id];
      if (id.startsWith(".")) return fromFile(path.resolve(path.dirname(file), id + ".ts"));
      return require(id);
    }
    new Function("exports", "require", "process", "window", "location", "document", out)(exports, resolve, {env}, browser.window, browser.location, browser.document);
    return exports;
  }
  return fromFile(path.join(__dirname, "../src/lib", name + ".ts"));
}
test("existing ES and EN ads and future IDs remain separate", () => {
  const {readCampaign} = load("registration-measurement", {"@/app/api/_base": {}});
  assert.deepEqual(readCampaign("?utm_campaign=registros_web&utm_content=eva_es"), {campaign:"registros_web",ad:"eva_es"});
  assert.deepEqual(readCampaign("?utm_campaign=registros_web&utm_content=eva_en"), {campaign:"registros_web",ad:"eva_en"});
  assert.notEqual(readCampaign("?utm_campaign=9007199254740992").campaign, readCampaign("?utm_campaign=9007199254740993").campaign);
  assert.equal(readCampaign("?utm_campaign=old&utm_campaign=new"), null);
});
test("untagged visits are separate from real campaigns", () => {
  const {readRegistrationSource} = load("registration-measurement", {"@/app/api/_base": {}});
  assert.deepEqual(readRegistrationSource(""), {campaign:"",ad:""});
  assert.deepEqual(readRegistrationSource("?utm_content=orphan"), {campaign:"",ad:""});
  assert.deepEqual(readRegistrationSource("?utm_campaign=no_campaign&utm_content=eva_es"), {campaign:"no_campaign",ad:"eva_es"});
  assert.equal(readRegistrationSource("?utm_campaign=a&utm_campaign=b"), null);
});
test("the same tab keeps the ad through a language change and a guide, and clears it on a new organic visit", () => {
  const base = "https://authenticevolutionco.com";
  const stored = new Map();
  const sessionStorage = {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
    removeItem: key => stored.delete(key),
  };
  function open(route, referrer) {
    const location = new URL(route, base);
    return load("company-campaign", {}, {}, {window: {location, sessionStorage}, document: {referrer}});
  }
  const campaign = "?utm_source=facebook&utm_campaign=company&utm_content=video_es&fbclid=example-click";
  open("/company" + campaign, "https://m.facebook.com/").captureCompanyCampaign();
  open("/es/company" + campaign, base + "/company" + campaign).captureCompanyCampaign();
  const guide = "/es/resources/prepare-your-quote";
  assert.equal(open(guide, base + "/es/company" + campaign).readCompanyCampaign().get("fbclid"), "example-click");
  const registration = open("/login/register?lang=es", base + guide);
  const {readRegistrationSource} = load("registration-measurement", {"@/app/api/_base": {}});
  assert.deepEqual(readRegistrationSource("?lang=es", registration.readCompanyCampaign()), {campaign: "company", ad: "video_es"});
  open("/company", "").captureCompanyCampaign();
  assert.equal(open("/login/register", base + "/company").readCompanyCampaign(), null);
});
test("Pixel path excludes referral, private URLs and unknown metadata", () => {
  const {safeRegistrationContext} = load("registration-pixel");
  const base = "https://authenticevolutionco.com";
  assert.equal(safeRegistrationContext(base + "/login/register?utm_source=facebook&utm_campaign=registros_web&fbclid=ExampleClickId", "https://www.facebook.com/"), true);
  const localized = base + "/login/register?utm_source=facebook&utm_campaign=registros_web&lang=";
  for (const language of ["es", "en"]) assert.equal(safeRegistrationContext(localized + language, ""), true);
  for (const language of ["unknown", "es&lang=en", "es&ref=private"]) assert.equal(safeRegistrationContext(localized + language, ""), false);
  assert.equal(safeRegistrationContext(base + "/login/register?utm_source=facebook&utm_campaign=registros_web&ref=synthetic", ""), false);
  assert.equal(safeRegistrationContext(base + "/login/register?utm_source=google&utm_campaign=example", ""), false);
  assert.equal(safeRegistrationContext(base + "/login/register", ""), false);
  assert.equal(safeRegistrationContext(base + "/login/register?email=a%40b.test", ""), false);
  assert.equal(safeRegistrationContext(base + "/login/register", base + "/estimates/123"), false);
  assert.equal(safeRegistrationContext(base + "/estimates", ""), false);
});
test("default config does not even access the browser or transmit", async () => {
  const {registrationPixelEnabled, sendCompletedRegistration, sendRegistrationPageView} = load("registration-pixel");
  assert.equal(registrationPixelEnabled, false);
  assert.doesNotThrow(sendRegistrationPageView);
  assert.equal(await sendCompletedRegistration(), false);
});

const metaEnv = {
  NEXT_PUBLIC_META_REGISTRATION_PIXEL_ENABLED: "true",
  NEXT_PUBLIC_META_REGISTRATION_PIXEL_ID: "12345"
};
const landing = "https://authenticevolutionco.com/login/register";
const tag = "?utm_source=facebook&utm_medium=cpc&utm_campaign=registros_web&utm_content=eva_es";

function simulatePixel({href = landing + tag, referrer = "", gpc = false, existing = false, savedTags, dealerHandoff = false} = {}) {
  const scripts = [];
  const window = {navigator: {globalPrivacyControl: gpc}, setTimeout, clearTimeout};
  if (existing) window.fbq = () => assert.fail("Must not use another pixel installation");
  const location = {href};
  window.location = location;
  const stored = new Map();
  window.sessionStorage = {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
    removeItem: key => stored.delete(key)
  };
  if (savedTags) stored.set("impact-company-campaign-v1", JSON.stringify({query: new URLSearchParams(savedTags).toString(), since: Date.now()}));
  const document = {
    referrer,
    createElement: () => ({remove() {}}),
    head: {appendChild(script) { scripts.push(script); }}
  };
  const handoff = {dealerSubmittedPath: "/login/dealer-registration/submitted", consumeDealerConversionHandoff() {
    const pending = dealerHandoff;
    dealerHandoff = false;
    return pending;
  }};
  const pixel = load("registration-pixel", {"./dealer-submission-receipt": handoff}, metaEnv, {window, location, document});
  return {pixel, window, location, scripts};
}

test("campaign opens send one PageView; success adds exactly one CompleteRegistration", async () => {
  const {pixel, window, scripts} = simulatePixel();
  pixel.sendRegistrationPageView();
  pixel.sendRegistrationPageView();
  assert.equal(scripts.length, 1);
  assert.equal(pixel.hasRegistrationPixel(), true);
  assert.deepEqual(window.fbq.queue, [
    ["set","autoConfig",false,"12345"],["init","12345"],["trackSingle","12345","PageView"]
  ]);
  scripts[0].onload();
  assert.equal(await pixel.sendCompletedRegistration(), true);
  assert.equal(await pixel.sendCompletedRegistration(), true);
  assert.deepEqual(window.fbq.queue.slice(3), [["trackSingle","12345","CompleteRegistration"]]);
  assert.equal(scripts.length, 1);
});
test("organic, non-Meta, opted-out, referrals, unrelated routes and other pixels send no events", async () => {
  for (const state of [
    {href: landing},
    {href: landing + tag.replace("facebook", "google")},
    {href: landing + tag + "&ref=referral"},
    {href: landing + tag + "&email=a%40b.test"},
    {href: landing.replace("/login/register","/estimates") + tag},
    {referrer: "https://authenticevolutionco.com/estimates"},
    {gpc: true},
    {existing: true}
  ]) {
    const {pixel, scripts} = simulatePixel(state);
    pixel.sendRegistrationPageView();
    assert.equal(await pixel.sendCompletedRegistration(), false);
    assert.equal(scripts.length, 0);
  }
});
test("a successful registration is queued even before the script loads; leaving the allowed route sends nothing else", async () => {
  const {pixel, window, location, scripts} = simulatePixel();
  const completion = pixel.sendCompletedRegistration();
  assert.equal(scripts.length, 1);
  assert.deepEqual(window.fbq.queue.slice(2), [
    ["trackSingle","12345","PageView"],["trackSingle","12345","CompleteRegistration"]
  ]);
  scripts[0].onerror();
  assert.equal(await completion, true);
  location.href = landing.replace("/login/register","/estimates");
  pixel.sendRegistrationPageView();
  assert.equal(await pixel.sendCompletedRegistration(), false);
  assert.equal(scripts.length, 1);
});

const origin = new URL(landing).origin;
const successPage = origin + "/login/dealer-registration/submitted";
const invitation = load("company-public-routes").dealerRegistrationUrl;

test("only campaign landing pages in either language on a production host send the Company PageView", () => {
  for (const hostname of ["authenticevolutionco.com", "www.authenticevolutionco.com"]) {
    for (const path of ["/company", "/es/company"]) {
      const state = simulatePixel({href: "https://" + hostname + path + tag, referrer: "https://www.facebook.com/"});
      state.pixel.sendCompanyPageView();
      state.pixel.sendCompanyPageView();
      state.pixel.sendRegistrationPageView();
      assert.equal(state.scripts.length, 1);
      assert.deepEqual(state.window.fbq.queue.slice(2), [["trackSingle","12345","PageView"]]);
    }
  }
  for (const href of [
    origin + "/company", origin + "/for-ai" + tag, origin + "/resources/prepare-your-quote" + tag,
    origin + "/estimates" + tag, invitation + tag, origin + "/company" + tag + "#token",
    origin + "/company" + tag + "&event=unknown", "http://localhost:3000/company" + tag,
    "https://www.authenticevolutionco.com.fake.test/company" + tag,
    "https://person:secret@authenticevolutionco.com/company" + tag
  ]) {
    const state = simulatePixel({href});
    state.pixel.sendCompanyPageView();
    assert.equal(state.scripts.length, 0);
  }
});

test("public landing and guide referrers keep valid client attribution while explicit non-Meta, private and stale journeys are rejected", async () => {
  const savedTags = "utm_source=facebook&utm_campaign=registros_web&utm_content=eva_es";
  const referrer = origin + "/es/resources/prepare-your-quote?lang=es";
  for (const state of [
    simulatePixel({href: landing + "?lang=es", referrer, savedTags}),
    simulatePixel({href: landing + tag, referrer: origin + "/company" + tag}),
    simulatePixel({href: landing + tag, referrer: "https://www.authenticevolutionco.com/"})
  ]) {
    const done = state.pixel.sendCompletedRegistration();
    assert.equal(state.scripts.length, 1);
    state.scripts[0].onload();
    assert.equal(await done, true);
    assert.deepEqual(state.window.fbq.queue.slice(2), [
      ["trackSingle","12345","PageView"], ["trackSingle","12345","CompleteRegistration"]
    ]);
  }
  for (const values of [
    {href: landing + "?lang=es", referrer: "", savedTags},
    {href: landing + "?utm_source=google", referrer, savedTags},
    {href: landing + "?utm_source=facebook&utm_campaign=a&utm_campaign=b", referrer, savedTags},
    {href: landing + tag, referrer: invitation},
    {href: landing + tag, referrer: origin + "/company?ref=proprietary"},
    {href: landing + tag, referrer: origin + "/company?user_id=999"},
    {href: landing + tag, referrer: "https://www.facebook.com/private"},
    {href: landing + "?lang=es", referrer, savedTags: "utm_source=google&utm_campaign=non_meta"}
  ]) {
    const state = simulatePixel(values);
    assert.equal(await state.pixel.sendCompletedRegistration(), false);
    assert.equal(state.scripts.length, 0);
  }
});

test("the official dealer invitation checks attribution locally and never installs a pixel on the token", async () => {
  for (const [href, expected] of [
    [invitation + tag, true], [invitation + "?lang=es", false],
    [invitation + tag.replace("facebook", "google"), false],
    [invitation + tag + "&ref=secret", false],
    [origin + "/login/dealer-registration/other-token" + tag, false],
    [successPage + tag, false]
  ]) {
    const state = simulatePixel({href});
    assert.equal(state.pixel.hasEligibleDealerCampaign(), expected);
    state.pixel.sendCompanyPageView();
    state.pixel.sendRegistrationPageView();
    assert.equal(await state.pixel.sendDealerApplication(), false);
    assert.equal(await state.pixel.sendCompletedRegistration(), false);
    assert.equal(state.scripts.length, 0);
  }
  const savedTags = "utm_source=instagram&utm_campaign=dealer";
  const cached = simulatePixel({href: invitation, referrer: origin + "/company", savedTags});
  assert.equal(cached.pixel.hasEligibleDealerCampaign(), true);
  assert.equal(cached.scripts.length, 0);
});

test("SubmitApplication runs only once on the clean confirmation with a successful campaign handoff", async () => {
  const success = simulatePixel({href: successPage, dealerHandoff: true});
  const sent = success.pixel.sendDealerApplication();
  assert.equal(success.scripts.length, 1);
  assert.equal(success.scripts[0].referrerPolicy, "no-referrer");
  assert.deepEqual(success.window.fbq.queue.slice(2), [["trackSingle","12345","SubmitApplication"]]);
  success.scripts[0].onload();
  assert.equal(await sent, true);
  assert.equal(await success.pixel.sendDealerApplication(), false);
  for (const [href, overrides] of [
    [successPage, {dealerHandoff:false}], [successPage, {gpc:true}], [successPage, {existing:true}],
    [successPage, {referrer:invitation}], [successPage, {referrer:origin + "/settings"}],
    [successPage + "?utm_source=facebook", {}], [successPage + "#result", {}],
    [successPage + "/other", {}], [invitation + tag, {}], [landing + tag, {}],
    ["https://unrelated.example/login/dealer-registration/submitted", {}]
  ]) {
    const state = simulatePixel({href, dealerHandoff:true, ...overrides});
    assert.equal(await state.pixel.sendDealerApplication(), false);
    assert.equal(state.scripts.length, 0);
  }
});
