/* Offline invoice checks. No API writes, real customer orders or payment calls. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '../src');
const tests = [];
const test = (name, run) => tests.push({ name, run });
const Button = ({ children, ...props }) => React.createElement('button', props, children);
const company = { name: 'Authentic Evolution Co', street: '100 Example Avenue', city: 'Miami', state: 'FL', postalCode: '33101', phone: '+1 305 555 0100', email: 'warehouse@example.test', website: 'example.test' };
const line = { id: 1, productId: 1, presentationId: 1, productName: 'Sherwin-Williams 850A White 10.1 fl oz', productCode: 'MAT-000001', presentationName: 'Tube', multiplier: 1, quantity: 3, unitPrice: '15.00', lineTotal: '45.00', storeName: 'PRIVATE STORE' };
const sale = { id: 7, code: 'MS-SAMPLE001', customerName: 'Example Customer', customerEmail: 'customer@example.test', customerPhone: '+1 305 555 0101', status: 'CONFIRMED', currency: 'usd', subtotal: '45.00', discountAmount: '0.00', taxRate: '7', taxAmount: '3.15', total: '48.15', paidAmount: '48.15', balance: '0.00', paymentStatus: 'PAID', createdAt: '2026-10-12T14:00:00Z', lines: [line], payments: [], note: 'PRIVATE NOTE', publicToken: 'PRIVATE TOKEN', publicUrl: 'https://example.test/public/material-sales/SECRET' };

function loader({ hooks, api = {}, branding = async () => company } = {}) {
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', compiled)(id => {
      if (id === 'react') return hooks ? { ...React, ...hooks } : React;
      if (id === 'react/jsx-runtime') return require(id);
      if (id === '@/components/ui/button') return { Button };
      if (id === '@/app/api/materials.api') return api;
      if (id === '@/app/api/brandings.api') return { getPublicCompanyBranding: branding };
      if (id === './materials-shared') return { MaterialNotice: ({ error }) => error ? React.createElement('p', { role: 'alert' }, error) : null, materialPanelClass: 'panel', money: value => `$${Number(value).toFixed(2)}` };
      const target = id.startsWith('@/') ? path.resolve(root, id.slice(2)) : path.resolve(path.dirname(filename), id);
      const file = ['.ts', '.tsx'].map(extension => target + extension).find(file => fs.existsSync(file));
      if (!file) throw new Error(`Unexpected dependency ${id}`);
      return load(path.relative(root, file));
    }, module, module.exports);
    cache.set(filename, module.exports); return module.exports;
  }
  return load;
}

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.attributes = {}; this.value = ''; }
  set textContent(value) { this.children = []; this.value = value; }
  get textContent() { return this.value + this.children.map(child => child.textContent).join(''); }
  set className(value) { this.attributes.class = value; }
  setAttribute(name, value) { this.attributes[name] = value; }
  appendChild(child) { this.children.push(child); return child; }
  replaceChildren(...children) { this.value = ''; this.children = children; }
  get outerHTML() {
    const attrs = Object.entries(this.attributes).map(([key, value]) => ` ${key}="${escape(value)}"`).join('');
    const content = this.tagName === 'style' ? this.value : escape(this.value);
    return `<${this.tagName}${attrs}>${content}${this.children.map(child => child.outerHTML).join('')}</${this.tagName}>`;
  }
}
function document() {
  const head = new Element('head'), body = new Element('body');
  let prints = 0;
  return {
    head, body, documentElement: { lang: '' }, createElement: tag => new Element(tag), defaultView: { print: () => prints++ }, get prints() { return prints; },
    get title() { return head.children.find(child => child.tagName === 'title')?.textContent || ''; },
    set title(value) { let title = head.children.find(child => child.tagName === 'title'); if (!title) { title = new Element('title'); head.appendChild(title); } title.textContent = value; },
  };
}
function nodes(node, predicate, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) { node.forEach(child => nodes(child, predicate, found)); return found; }
  if (predicate(node)) found.push(node);
  nodes(node.children || node.props?.children, predicate, found); return found;
}
const renderInvoice = loader()('app/warehouse/materials/material-invoice.ts').renderMaterialInvoice;
const invoice = (current = sale, seller = company) => { const doc = document(); renderInvoice(doc, current, seller, new Date('2026-10-12T14:30:00Z')); return doc; };

test('invoice uses order reference, real company and customer snapshot with itemized totals and currency', () => {
  const doc = invoice();
  assert.equal(doc.title, 'Invoice MS-SAMPLE001');
  for (const value of ['Authentic Evolution Co', '100 Example Avenue', 'Miami, FL 33101', 'customer@example.test', 'Sherwin-Williams 850A', 'Tube · MAT-000001', '$15.00', '$45.00', 'Sales tax (7%)', '$3.15', '$48.15', 'Balance due', '$0.00', 'Currency: USD', 'Ready for pickup', 'Payment: Paid']) assert.ok(doc.body.textContent.includes(value), value);
  assert.equal(nodes(doc.body, node => node.tagName === 'h1').length, 1);
  assert.equal(nodes(doc.body, node => node.tagName === 'thead').length, 1);
});

test('discount is visible when present, omitted otherwise and values follow recorded currency', () => {
  assert.ok(!invoice().body.textContent.includes('Discount'));
  const doc = invoice({ ...sale, currency: 'eur', discountAmount: '5.00', taxAmount: '2.80', total: '42.80', balance: '42.80', paidAmount: '0', paymentStatus: 'UNPAID' });
  for (const value of ['Discount', '-€5.00', '€2.80', '€42.80', 'Currency: EUR', 'Payment: Unpaid', 'Pending payment', 'Full payment is required']) assert.ok(doc.body.textContent.includes(value), value);
});

test('canceled and draft orders render summaries, delivered and refunded states never imply pickup approval', () => {
  for (const status of ['CANCELED', 'DRAFT']) {
    const doc = invoice({ ...sale, status });
    assert.equal(doc.title, 'Order summary MS-SAMPLE001');
    assert.ok(!doc.body.textContent.includes('Ready for pickup'));
    assert.ok(!doc.body.textContent.includes('Show order number'));
  }
  const delivered = invoice({ ...sale, status: 'DELIVERED', deliveredAt: '2026-10-12T15:00:00Z' });
  assert.match(delivered.body.textContent, /already been delivered/);
  assert.doesNotMatch(delivered.body.textContent, /Ready for pickup/);
  const refunded = invoice({ ...sale, paidAmount: '0', balance: '48.15', paymentStatus: 'UNPAID' });
  assert.match(refunded.body.textContent, /Pending payment/);
  assert.doesNotMatch(refunded.body.textContent, /Payment: Paid/);
});

test('printed document has pickup lookup instructions without staff notes, store details or bearer link', () => {
  const text = invoice().body.textContent;
  assert.match(text, /Show order number MS-SAMPLE001/);
  assert.match(text, /verify the current payment and delivery status/);
  for (const privateValue of ['PRIVATE NOTE', 'PRIVATE STORE', 'PRIVATE TOKEN', 'SECRET', '/public/material-sales/']) assert.ok(!text.includes(privateValue), privateValue);
});

test('untrusted product, customer and company values are text and never active HTML', () => {
  const attack = '<img src=x onerror=alert(1)><script>alert(2)</script>';
  const doc = invoice({ ...sale, customerName: attack, lines: [{ ...line, productName: attack }] }, { ...company, name: attack });
  assert.equal(nodes(doc.body, node => ['img', 'script', 'iframe'].includes(node.tagName)).length, 0);
  assert.ok(doc.body.textContent.includes(attack));
  assert.ok(doc.body.outerHTML.includes('&lt;script&gt;'));
  assert.ok(!doc.body.outerHTML.includes('<script>'));
});

test('large orders retain every item and print styles repeat headers without clipping rows or totals', () => {
  const doc = invoice({ ...sale, lines: Array.from({ length: 80 }, (_, index) => ({ ...line, id: index + 1, productName: `Material ${index + 1}` })) });
  assert.equal(nodes(doc.body, node => node.tagName === 'tr').length, 81);
  const css = doc.head.textContent;
  for (const rule of ['table-header-group', 'break-inside: avoid', '@media print', '@page', 'overflow-wrap: anywhere']) assert.ok(css.includes(rule), rule);
  assert.doesNotMatch(css, /overflow:\s*hidden|height:\s*\d+px/);
  const print = nodes(doc.body, node => node.tagName === 'button')[0];
  print.onclick(); assert.equal(doc.prints, 1);
});

function summaryHarness({ initial = sale, api = {}, loadSale, branding } = {}) {
  const states = [], refs = []; let stateIndex = 0, refIndex = 0;
  const hooks = { useState(value) { const index = stateIndex++; if (!(index in states)) states[index] = value; return [states[index], next => states[index] = next]; }, useRef(value) { const index = refIndex++; return refs[index] ||= { current: value }; } };
  const summary = loader({ hooks, api: { materialSale: async () => initial, ...api }, branding })('app/warehouse/materials/material-sale-summary.tsx').MaterialSaleSummary;
  return { render() { stateIndex = refIndex = 0; return summary({ sale: initial, publicView: Boolean(loadSale), loadSale }); }, states };
}
const printButton = tree => nodes(tree, node => node.type === Button)[0];
const popup = () => ({ document: document(), closed: false, focus() {}, close() { this.closed = true; } });

test('staff and customer summaries expose print action; canceled summary is named accurately', () => {
  const summary = loader()('app/warehouse/materials/material-sale-summary.tsx').MaterialSaleSummary;
  for (const props of [{ sale }, { sale, publicView: true, loadSale: async () => sale }]) assert.match(renderToStaticMarkup(React.createElement(summary, props)), /Print invoice/);
  assert.match(renderToStaticMarkup(React.createElement(summary, { sale: { ...sale, status: 'CANCELED' } })), /Print order summary/);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(summary, { sale, publicView: true })), /Print invoice/);
});

test('printing refreshes the sale first and repeated clicks do not open duplicate invoices', async () => {
  let release, reads = 0, opens = 0;
  const opened = popup(); global.window = { open: () => { opens++; return opened; } };
  const h = summaryHarness({ api: { materialSale: async id => { reads++; assert.equal(id, sale.id); await new Promise(resolve => release = resolve); return { ...sale, status: 'CANCELED' }; } } });
  const action = printButton(h.render()).props.onClick;
  const first = action(), duplicate = action();
  assert.equal(reads, 1); assert.equal(opens, 1);
  assert.equal(printButton(h.render()).props.disabled, true);
  release(); await Promise.all([first, duplicate]);
  assert.equal(opened.document.title, 'Order summary MS-SAMPLE001');
  assert.equal(opened.opener, null);
  assert.match(opened.document.body.textContent, /canceled and cannot be collected/);
});

test('customer print uses supplied read route and does not request staff-only sale access', async () => {
  let customerReads = 0, staffReads = 0;
  const opened = popup(); global.window = { open: () => opened };
  const h = summaryHarness({ loadSale: async () => { customerReads++; return sale; }, api: { materialSale: async () => { staffReads++; throw new Error('Forbidden'); } } });
  await printButton(h.render()).props.onClick();
  assert.equal(customerReads, 1); assert.equal(staffReads, 0);
  assert.equal(opened.document.title, 'Invoice MS-SAMPLE001');
});

test('failed reads and wrong sale close loading window without generating stale invoice', async () => {
  for (const read of [async () => { throw new Error('Offline'); }, async () => ({ ...sale, id: 99 })]) {
    const opened = popup(); global.window = { open: () => opened };
    const h = summaryHarness({ loadSale: read });
    await printButton(h.render()).props.onClick();
    assert.equal(opened.closed, true);
    assert.equal(opened.document.title, 'Preparing order document');
    assert.ok(h.states[0]);
  }
});

test('blocked popups do not read order data and show actionable feedback', async () => {
  let reads = 0; global.window = { open: () => null };
  const h = summaryHarness({ api: { materialSale: async () => { reads++; return sale; } } });
  await printButton(h.render()).props.onClick();
  assert.equal(reads, 0); assert.match(h.states[0], /Allow pop-ups/);
});

test('a failed company profile lookup closes the popup and can be retried without stale company details', async () => {
  let reads = 0; const opened = [];
  global.window = { open: () => { const next = popup(); opened.push(next); return next; } };
  const h = summaryHarness({ branding: async () => { if (++reads === 1) throw new Error('Company information unavailable'); return company; } });
  await printButton(h.render()).props.onClick();
  assert.equal(opened[0].closed, true);
  assert.match(h.states[0], /Company information unavailable/);
  await printButton(h.render()).props.onClick();
  assert.equal(opened[1].closed, false);
  assert.equal(opened[1].document.title, 'Invoice MS-SAMPLE001');
  assert.equal(h.states[0], '');
});

(async () => {
  const oldWindow = global.window; let failures = 0;
  try { for (const { name, run } of tests) { try { await run(); console.log(`PASS ${name}`); } catch (error) { failures++; console.error(`FAIL ${name}`, error); } } }
  finally { global.window = oldWindow; }
  console.log(`${tests.length - failures}/${tests.length} material invoice checks passed.`);
  const previewIndex = process.argv.indexOf('--preview-dir');
  if (previewIndex >= 0) {
    const target = path.resolve(process.argv[previewIndex + 1]); fs.mkdirSync(target, { recursive: true });
    for (const [name, value] of [['invoice', sale], ['invoice-many', { ...sale, lines: Array.from({ length: 65 }, (_, index) => ({ ...line, id: index + 1, productName: `${line.productName} / Item ${index + 1}` })) }]]) {
      const doc = invoice(value); fs.writeFileSync(path.join(target, `${name}.html`), `<!doctype html><html lang="en">${doc.head.outerHTML}${doc.body.outerHTML}</html>`);
    }
  }
  if (failures) process.exitCode = 1;
})();
