const test = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const path = require("node:path");
function load(name, injected = {}, env = {}, browser = {}) {
  const input = fs.readFileSync(path.join(__dirname, "../src/lib", name + ".ts"), "utf8");
  const out = ts.transpileModule(input, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021}}).outputText;
  const exports = {};
  new Function("exports", "require", "process", "window", "location", "document", out)(exports, id => injected[id] || require(id), {env}, browser.window, browser.location, browser.document);
  return exports;
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

function simulatePixel({href = landing + tag, referrer = "", gpc = false, existing = false} = {}) {
  const scripts = [];
  const window = {navigator: {globalPrivacyControl: gpc}, setTimeout, clearTimeout};
  if (existing) window.fbq = () => assert.fail("Must not use another pixel installation");
  const location = {href};
  const document = {
    referrer,
    createElement: () => ({remove() {}}),
    head: {appendChild(script) { scripts.push(script); }}
  };
  const pixel = load("registration-pixel", {}, metaEnv, {window, location, document});
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
