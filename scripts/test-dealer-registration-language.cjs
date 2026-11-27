// Offline browser regression for switching languages in a dealer invitation.
// Run from frontend: node scripts/test-dealer-registration-language.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("../../backend/node_modules/puppeteer");
const compiler = require("next/dist/compiled/webpack/webpack");

const root = path.resolve(__dirname, "..");
const scratch = path.join(root, "coverage");
fs.mkdirSync(scratch, { recursive: true });
const temp = fs.mkdtempSync(path.join(scratch, "dealer-registration-language-"));
const token = "b".repeat(64);
const origin = "http://invitation.test";

async function bundle() {
  // Use the real registration, dropdown and global language provider. Replace only Next's
  // routing/back-end transport, so no account, message or network connection is created.
  fs.writeFileSync(path.join(temp, "entry.js"), `
    import React from "react";
    import {createRoot} from "react-dom/client";
    import {CompanyBrandingProvider} from "@/contexts/CompanyBrandingContext";
    import {PortalLanguageProvider} from "@/contexts/PortalLanguageContext";
    import {DealerRegistration} from "@/app/login/dealer-registration/[token]/registration";
    const make = React.createElement;
    createRoot(document.getElementById("app")).render(make(CompanyBrandingProvider, null,
      make(PortalLanguageProvider, { initialLocale: "es" }, make(DealerRegistration, {token: "${token}"}))));
  `);
  fs.writeFileSync(path.join(temp, "framework.js"), `
    export const usePathname = () => window.location.pathname;
    export const API_URL = window.location.origin;
    export const isApiError = err => Number.isInteger(err?.status);
    export async function apiFetch(url, opts = {}) {
      const res = await fetch(url, {method: opts.method ?? "GET", body: opts.body && JSON.stringify(opts.body)});
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.message), {status: res.status, data});
      return data;
    }
  `);
  fs.writeFileSync(path.join(temp, "loader.cjs"), `const ts = require("typescript");
    module.exports = function(source) { return ts.transpileModule(source, { fileName: this.resourcePath,
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText; };`);
  compiler.init();
  const stub = path.join(temp, "framework.js");
  await new Promise((resolve, reject) => compiler.webpack({
    mode: "development", devtool: false, entry: path.join(temp, "entry.js"),
    output: { path: temp, filename: "browser.js", publicPath: "/" },
    resolve: { extensions: [".tsx", ".ts", ".js"], alias: {
      "@": path.join(root, "src"), "next/navigation$": stub,
      [path.join(root, "src/app/api/_base")]: stub, "@/app/api/_base$": stub,
    } },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(temp, "loader.cjs") }] },
  }, (err, stats) => err || stats.hasErrors() ? reject(err || Error(stats.toString({ all: false, errors: true }))) : resolve()));
}

async function run(page) {
  const requests = [], posts = [], errors = [];
  let invitationRequest;
  const sms = { companyName: "Demo", disclosure: "Published disclosure", dealerRegistration: {
    serviceConsentText: "Published service consent", promotionsConsentText: "Published promotions consent", version: "demo-sms" } };
  const terms = { id: 8, version: 3, consentText: "Custom published text", name: "Test terms", publishedAt: "2026-01-01" };
  const respond = (req, data, status = 200) => req.respond({ status, contentType: "application/json", body: JSON.stringify(data) });
  await page.setRequestInterception(true);
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", req => {
    const url = new URL(req.url()), path = url.pathname;
    if (url.origin !== origin) return req.abort();
    if (req.resourceType() === "document") return req.respond({ status: 200, contentType: "text/html",
      body: '<!doctype html><html lang="en"><body><div id="app"></div></body></html>' });
    if (path.startsWith("/api/")) requests.push([req.method(), path]);
    if (path === "/api/dealer-network/invitations/" + token) {
      if (req.method() === "GET") { invitationRequest = req; return; }
      posts.push(JSON.parse(req.postData()));
      return respond(req, posts.length === 1 ? { code: "USERNAME_TAKEN", message: "Username already in use" } : { id: 12, username: "WindowDemo" }, posts.length === 1 ? 409 : 201);
    }
    if (path === "/api/platform-terms/current") return respond(req, terms);
    if (path === "/api/platform-terms/8/document") return respond(req, { version: terms, content: "Custom legal paragraph" });
    if (path === "/api/brandings/company/public") return respond(req, { name: "Test company" });
    if (path === "/api/sms/program") return respond(req, sms);
    if (path.startsWith("/api/") && path.includes("autocomplete")) return respond(req, { suggestions: [] });
    if (path.startsWith("/company/language")) return respond(req, { locale: "en", hasPreference: false });
    return req.abort();
  });
  const waitText = async value => {
    try { await page.waitForFunction(v => document.body.innerText.includes(v), {}, value); }
    catch (error) { throw Error(`Missing "${value}". Page errors: ${errors.join(", ")}. Visible text: ${await page.evaluate(() => document.body.innerText)}`, { cause: error }); }
  };
  const clickText = (selector, label) => page.$$eval(selector, (items, text) => items.find(x => x.textContent.trim() === text).click(), label);
  async function choose(code) {
    const trigger = await page.waitForSelector("nav button[aria-haspopup=menu]");
    await trigger.focus(); await page.keyboard.press("Enter");
    const selector = `[role=menuitemradio] span[lang=${code}]`;
    await page.waitForSelector(selector);
    await page.$eval(selector, span => span.closest("[role=menuitemradio]").click());
    await page.waitForFunction(c => document.documentElement.lang === c && document.querySelector("nav")?.closest("[lang]")?.lang === c, {}, code);
  }
  async function release(data, status = 200) {
    for (let i = 0; i < 200 && !invitationRequest; i++) await new Promise(r => setTimeout(r, 10));
    assert.ok(invitationRequest, "The public invitation was requested");
    const req = invitationRequest; invitationRequest = null; await respond(req, data, status);
  }
  async function openInvitation() {
    await page.goto(origin + "/login/dealer-registration/" + token);
    await page.evaluate(() => { window.process = { env: { NODE_ENV: "development" } }; });
    await page.addScriptTag({ path: path.join(temp, "browser.js") });
  }
  await openInvitation();
  await waitText("Cargando la invitación");
  await choose("en"); await waitText("Loading invitation");
  await release({ message: "Unavailable" }, 503);
  await waitText("We could not load your invitation");
  await choose("es"); await waitText("No pudimos cargar tu invitación");
  await page.$eval("section button", b => b.click());
  await release({ level: "Subdealer", inviter: { name: "First name", logoUrl: null } });
  await waitText("Registro de subdistribuidores");
  assert.equal(await page.$eval("section strong", el => el.textContent), "First name");
  await page.waitForSelector("input[name=serviceConsent]");
  const values = { firstName: "María", lastName: "Sol", email: "test@example.test", password: "Example1234",
    street: "515 Demo Avenue", city: "Demo City", postalCode: "33000", companyName: "First name", yearsOfExperience: "0" };
  for (const [key, value] of Object.entries(values)) await page.type(`[name=${key}]`, value);
  await page.type("#invite-phone", "3055550100");
  await page.select("select[name=state]", "FL");
  await page.click("input[name=serviceConsent]"); await page.click("input[name=platformTermsAccepted]");
  await clickText("form button", "Leer los términos y condiciones"); await waitText("Custom legal paragraph");
  await clickText("[role=dialog] button", "Volver al registro");
  await choose("en"); await waitText("Subdealer registration");
  const formValues = await page.$eval("form", f => Object.fromEntries(new FormData(f)));
  for (const [key, value] of Object.entries(values)) assert.equal(formValues[key], value, key);
  assert.ok(formValues.serviceConsent && formValues.platformTermsAccepted);
  assert.equal(formValues.promotionsConsent, undefined);
  await clickText("form button", "Change");
  await page.$eval("input[name=username]", el => el.select());
  await page.keyboard.type("WindowDemo");
  await page.click("button[type=submit]"); await waitText("This username is already in use");
  await choose("es");
  await page.waitForFunction(() => /uso|ocupad[oa]/i.test(document.querySelector("#dealer-username-error")?.textContent ?? ""));
  await waitText("Enviar solicitud");
  await page.click("button[type=submit]"); await waitText("Solicitud enviada");
  await choose("en"); await waitText("Application submitted");
  assert.equal(await page.$eval("[role=status] strong", e => e.textContent), "WindowDemo");
  assert.equal(posts.length, 2);
  assert.deepEqual(posts[1], posts[0]);
  assert.deepEqual(posts[0], { username: "WindowDemo", ...values, phone: "+13055550100", state: "FL", yearsOfExperience: 0,
    serviceConsent: true, promotionsConsent: false, consentVersion: "demo-sms", platformTermsAccepted: true, platformTermsVersionId: 8 });
  assert.equal(requests.filter(([method, path]) => method === "GET" && path.endsWith(token)).length, 2, "Only explicit retry reloads the invitation");
  for (const [level, spanish] of [["Dealer", "Registro de distribuidores"], ["Distributor", "Registro de distribuidores finales"]]) {
    await openInvitation();
    await release({ level, inviter: null });
    await waitText(spanish);
    await choose("en"); await waitText(level + " registration");
    assert.equal(new URL(page.url()).pathname, "/login/dealer-registration/" + token);
  }
  assert.deepEqual(errors, []);
}

(async () => {
  let browser;
  try {
    await bundle();
    browser = await puppeteer.launch({ headless: "shell", pipe: true,
      ...(process.env.PUPPETEER_EXECUTABLE_PATH ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH } : {}) });
    const page = await browser.newPage();
    page.setDefaultTimeout(8000);
    await run(page);
    console.log("PASS dealer invitation loading, retry, global EN/ES, preserved inputs and consent, submission errors and confirmation");
  } finally {
    if (browser) await browser.close();
    if (path.dirname(temp) === scratch) fs.rmSync(temp, {recursive: true, force: true});
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
