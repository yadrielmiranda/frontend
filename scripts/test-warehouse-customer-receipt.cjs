/* Synthetic, offline delivery receipt checks. No servers, API calls or stock writes.
 * Run: node scripts/test-warehouse-customer-receipt.cjs
 * Optional visual/print checks using the existing backend Puppeteer install: append --browser.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sourceRoot = path.resolve(__dirname, '../src');
const receiptFile = path.join(sourceRoot, 'app/warehouse/customer-deliveries/customer-delivery-receipt.tsx');
const clientFile = path.join(sourceRoot, 'app/warehouse/customer-deliveries/[id]/receipt-client.tsx');
const tests = [];
const test = (name, run) => tests.push({ name, run });
function compile(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => {
    if (Object.hasOwn(dependencies, id)) return dependencies[id];
    if (id === 'react' || id === 'react/jsx-runtime') return require(id);
    throw new Error(`Unexpected dependency: ${id}`);
  }, module, module.exports);
  return module.exports;
}
const { CustomerDeliveryReceipt } = compile(receiptFile, { '../factory-parts': compile(path.join(sourceRoot, 'app/warehouse/factory-parts.ts')) });
const renderReceipt = (delivery, showSignature = true) => renderToStaticMarkup(React.createElement(CustomerDeliveryReceipt, { delivery, showSignature }));
const item = (lineNumber, poNumber, quantity, overrides = {}) => ({ lineNumber, barcode: `I${lineNumber}`, poNumber,
  source: 'EXTERNAL', orderNumber: '', mark: '', description: 'French door bronze', product: '', system: '', configuration: '', quantity, ...overrides });
const fixture = {
  id: 71, source: 'TRANSIT', storeId: null, storeName: null,
  firstName: 'Synthetic', lastName: 'Recipient', actor: 'Warehouse Operator', createdAt: '2026-10-14T16:00:00Z',
  signatureStrokes: [[{ x: .1, y: .7 }, { x: .2, y: .15 }, { x: .3, y: .65 }, { x: .4, y: .2 }, { x: .6, y: .6 }], [{ x: .4, y: .8 }, { x: .8, y: .8 }]],
  items: [item('1126830', '292427', 1), item('1126831', '292427', 1, { description: 'Horizontal rolling window' }),
    item('1126900', '292759', 2, { source: 'ORDER', orderNumber: 'ORD-TEST-004', description: '', product: 'Sliding door', system: 'Series 600', configuration: 'OXO' })],
  totalPieces: 3, totalParts: 4,
};
test('new receipt includes its saved panel/frame breakdown without adding it to old receipts', () => {
  const typed = structuredClone(fixture);
  typed.items[0].parts = { FRAME: 1 };
  assert.match(renderReceipt(typed), /1 frame/);
  assert.doesNotMatch(renderReceipt(fixture), /type not recorded|1 frame/);
});
function renderClient(delivery = fixture) {
  const states = [delivery, '', false, 0]; let state = 0;
  const { CustomerDeliveryReceiptClient } = compile(clientFile, {
    react: { ...React, useState: initial => [state < states.length ? states[state++] : initial, () => {}], useEffect() {} },
    'next/link': { __esModule: true, default: ({ href, children }) => React.createElement('a', { href }, children) },
    'lucide-react': { Printer: () => null, RefreshCw: () => null },
    '@/components/ui/button': { Button: ({ asChild, children, ...props }) => asChild ? children : React.createElement('button', props, children) },
    '@/contexts/AuthContext': { useAuth: () => ({ user: { id: 1, role: { name: 'admin' } }, isLoading: false }) },
    '@/app/api/_base': { isApiError: () => false },
    '@/app/api/warehouse.api': { warehouseCustomerDelivery: () => { throw new Error('No API calls allowed'); } },
    '../customer-delivery-receipt': { CustomerDeliveryReceipt },
  });
  return renderToStaticMarkup(React.createElement(CustomerDeliveryReceiptClient, { id: fixture.id, initialIdentity: { id: 1, role: 'admin' } }));
}

test('groups multiple PO contents and distinguishes external PO from system order', () => {
  const html = renderReceipt(fixture);
  assert.equal((html.match(/class="delivery-po-group"/g) || []).length, 2);
  assert.equal((html.match(/>PO 292427<\/h3>/g) || []).length, 1);
  assert.equal((html.match(/>PO 292759<\/h3>/g) || []).length, 1);
  assert.match(html, /External PO/); assert.match(html, /Order ORD-TEST-004/);
  assert.ok(html.indexOf('1126831') < html.indexOf('PO 292759'));
  assert.ok(html.indexOf('1126900') > html.indexOf('PO 292759'));
});
test('partial handover shows actual quantities and distinct piece/physical-part totals', () => {
  const html = renderReceipt(fixture);
  const rows = [...html.matchAll(/<tr class="border-b align-top">(.*?)<\/tr>/g)].map(match => match[1]);
  assert.equal(rows.length, 3);
  assert.match(rows[0], /1126830/); assert.match(rows[0], /tabular-nums">1<\/td>/);
  assert.match(rows[2], /tabular-nums">2<\/td>/);
  assert.match(html, /Total pieces<\/dt><dd[^>]*>3<\/dd>/);
  assert.match(html, /Total physical parts<\/dt><dd[^>]*>4<\/dd>/);
  assert.doesNotMatch(html, /Expected|On hand|In transit/);
});
test('same PO number in separate origins does not merge unrelated pieces', () => {
  const html = renderReceipt({ ...fixture, items: [fixture.items[0], { ...fixture.items[2], poNumber: '292427' }], totalPieces: 2, totalParts: 3 });
  assert.equal((html.match(/class="delivery-po-group"/g) || []).length, 2);
});
test('internal item fallback displays product, system and configuration; optional mark remains visible', () => {
  const html = renderReceipt({ ...fixture, items: [{ ...fixture.items[2], mark: 'Kitchen 2' }] });
  assert.match(html, /Sliding door · Series 600 · OXO/); assert.match(html, /Mark: Kitchen 2/);
});
test('recipient and item text cannot inject HTML, scripts or signature markup', () => {
  const hostile = '<img src=x onerror="alert(1)"><script>bad()</script>';
  const html = renderReceipt({ ...fixture, firstName: hostile, lastName: 'O\'Neil & Sons', items: [item('1126830', hostile, 1, { description: hostile, mark: hostile })] });
  assert.doesNotMatch(html, /<img|<script/); assert.match(html, /&lt;img/); assert.match(html, /O&#x27;Neil &amp; Sons/);
  assert.equal((html.match(/<polyline /g) || []).length, 2);
});
test('normalized signature is drawn as local SVG strokes with recipient identity', () => {
  const html = renderReceipt(fixture);
  assert.match(html, /viewBox="0 0 1000 300"/); assert.match(html, /100,210 200,45 300,195 400,60 600,180/);
  assert.match(html, /aria-label="Signature of Synthetic Recipient"/);
  assert.match(html, /I acknowledge receipt/); assert.doesNotMatch(html, /<image|data:image|https?:\/\//);
});
test('pre-signing preview shows the same receipt rows and totals without fabricated signature or document metadata', () => {
  const { id, actor, createdAt, ...preview } = fixture;
  const saved = renderReceipt(fixture), html = renderReceipt(preview, false);
  assert.match(html, /Review your delivery/); assert.doesNotMatch(html, /Goods received|Delivery #|Recorded on|Recorded by|Recipient signature|<svg/);
  assert.deepEqual([...html.matchAll(/<tbody>(.*?)<\/tbody>/g)].map(m => m[1]), [...saved.matchAll(/<tbody>(.*?)<\/tbody>/g)].map(m => m[1]));
  assert.match(html, /Total physical parts<\/dt><dd[^>]*>4<\/dd>/);
});
test('saved receipt retains date, operator and exact source location', () => {
  const transit = renderReceipt(fixture);
  assert.match(transit, /Direct from factory/); assert.match(transit, /Warehouse Operator/); assert.match(transit, /datetime="2026-10-14T16:00:00Z"/i);
  assert.match(renderReceipt({ ...fixture, source: 'WAREHOUSE', storeId: 2, storeName: 'Storage #2 (1035)' }), /Storage #2 \(1035\)/);
  assert.match(renderReceipt({ ...fixture, source: 'WAREHOUSE' }), /Unassigned warehouse stock/);
});
test('saved-page print action and receipt isolation selector are present without a public link', () => {
  const html = renderClient();
  assert.match(html, /Print \/ Save PDF/); assert.match(html, /data-customer-delivery-print/); assert.match(html, /@media print/);
  assert.doesNotMatch(html, /href="\/public\//);
});

async function browserChecks() {
  const puppeteer = require(require.resolve('puppeteer', { paths: [path.resolve(__dirname, '../../backend')] }));
  const tailwind = require('@tailwindcss/node');
  const compiler = await tailwind.compile(fs.readFileSync(path.join(sourceRoot, 'app/globals.css'), 'utf8'), { base: path.join(sourceRoot, 'app'), onDependency() {} });
  const longFixture = { ...fixture, items: Array.from({ length: 42 }, (_, index) => item(String(1200000 + index), `TEST-${1 + Math.floor(index / 9)}`, index % 4 === 0 ? 2 : 1,
    { description: `${index + 1}. French door with a long synthetic description, bronze finish, right active, and separately supplied physical parts for receipt layout verification.`, source: index > 26 ? 'ORDER' : 'EXTERNAL', orderNumber: index > 26 ? 'ORD-SYNTHETIC-2' : '' })), totalPieces: 42, totalParts: 53 };
  const markup = renderClient(longFixture);
  const classes = [...new Set([...markup.matchAll(/class="([^"]*)"/g)].flatMap(match => match[1].split(/\s+/)))];
  const css = compiler.build(classes);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'warehouse-receipt-'));
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', request => request.abort());
    await page.setViewport({ width: 1100, height: 900, deviceScaleFactor: 1 });
    await page.setContent(`<html><head><style>${css}</style></head><body><header id="app-navigation">PRIVATE APP NAVIGATION</header><main style="padding:60px"><nav id="warehouse-nav">Warehouse navigation</nav>${markup}</main><footer id="app-footer">PRIVATE APP FOOTER</footer></body></html>`);
    await page.screenshot({ path: path.join(directory, 'receipt-screen.png'), fullPage: true });
    await page.emulateMediaType('print');
    const styles = await page.evaluate(() => ({
      navigation: getComputedStyle(document.getElementById('app-navigation')).display,
      warehouse: getComputedStyle(document.getElementById('warehouse-nav')).display,
      footer: getComputedStyle(document.getElementById('app-footer')).display,
      visibleButtons: [...document.querySelectorAll('button')].filter(button => button.getBoundingClientRect().height > 0).length,
      receipt: document.querySelector('[data-customer-delivery-print]').getBoundingClientRect().height,
      signature: document.querySelector('.delivery-signature svg').getBoundingClientRect().height,
      signatureBreak: getComputedStyle(document.querySelector('.delivery-signature')).breakInside,
      headers: getComputedStyle(document.querySelector('thead')).display,
      text: document.querySelector('[data-customer-delivery-print]').innerText,
    }));
    assert.equal(styles.navigation, 'none'); assert.equal(styles.warehouse, 'none'); assert.equal(styles.footer, 'none');
    assert.equal(styles.visibleButtons, 0); assert.ok(styles.receipt > 1000); assert.ok(styles.signature > 0);
    assert.equal(styles.signatureBreak, 'avoid'); assert.equal(styles.headers, 'table-header-group');
    assert.match(styles.text, /1200041/); assert.match(styles.text, /Synthetic/); assert.match(styles.text, /TEST-5/);
    await page.pdf({ path: path.join(directory, 'receipt-long.pdf'), format: 'Letter', printBackground: true, preferCSSPageSize: true });
    await page.screenshot({ path: path.join(directory, 'receipt-print.png'), fullPage: true });
    await page.emulateMediaType('screen'); await page.setViewport({ width: 390, height: 844 });
    await page.setContent(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body style="padding:12px">${renderClient()}</body></html>`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'mobile receipt should not overflow horizontally');
    await page.screenshot({ path: path.join(directory, 'receipt-mobile.png'), fullPage: true });
    console.log(`PASS browser print isolation, long receipt and mobile layout; visual artifacts: ${directory}`);
  } finally { await browser.close(); }
}

(async () => {
  for (const { name, run } of tests) { await run(); console.log(`PASS ${name}`); }
  if (process.argv.includes('--browser')) await browserChecks();
  console.log(`${tests.length} receipt rendering checks passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
