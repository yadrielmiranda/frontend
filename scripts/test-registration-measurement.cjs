const test = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const path = require("node:path");
function load(name, injected = {}) {
  const input = fs.readFileSync(path.join(__dirname, "../src/lib", name + ".ts"), "utf8");
  const out = ts.transpileModule(input, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021}}).outputText;
  const exports = {};
  new Function("exports", "require", "process", out)(exports, id => injected[id] || require(id), {env: {}});
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
  const {safeRegistrationContext, dispatchRegistrationToPixel} = load("registration-pixel");
  const base = "https://authenticevolutionco.com";
  assert.equal(safeRegistrationContext(base + "/login/register?utm_source=facebook&utm_campaign=registros_web&fbclid=ExampleClickId", "https://www.facebook.com/"), true);
  assert.equal(safeRegistrationContext(base + "/login/register?utm_source=facebook&utm_campaign=registros_web&ref=synthetic", ""), false);
  assert.equal(safeRegistrationContext(base + "/login/register?utm_source=google&utm_campaign=example", ""), false);
  assert.equal(safeRegistrationContext(base + "/login/register", ""), false);
  assert.equal(safeRegistrationContext(base + "/login/register?email=a%40b.test", ""), false);
  assert.equal(safeRegistrationContext(base + "/login/register", base + "/estimates/123"), false);
  assert.equal(safeRegistrationContext(base + "/estimates", ""), false);
  const calls = [];
  dispatchRegistrationToPixel((...args) => calls.push(args), "12345");
  assert.deepEqual(calls, [["set","autoConfig",false,"12345"],["init","12345"],["trackSingle","12345","CompleteRegistration"]]);
});
test("default config does not even access the browser or transmit", async () => {
  const {registrationPixelEnabled, sendCompletedRegistration} = load("registration-pixel");
  assert.equal(registrationPixelEnabled, false);
  assert.equal(await sendCompletedRegistration(), false);
});
