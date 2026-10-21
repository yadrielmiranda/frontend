// Render the real report shell and public route without a running server.
// Run from frontend: node scripts/test-estimate-external-branding.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '../src');
const cache = new Map();
let publicEstimate;
const mocks = {
  'next/navigation': { notFound() { throw new Error('Not found'); } },
  '@/app/api/estimates.api': { getPublicEstimate: async () => publicEstimate },
  '@/app/api/contracts.api': {
    getAgreementSnapshot: async () => publicEstimate,
    getPublicAgreement: async () => ({ paymentsEnabled: false }),
  },
  '@/app/api/payments.api': { getPublicPaymentContext: async () => { throw new Error('Unexpected payment request'); } },
  '@/components/estimates/agreements/public-agreement-panel': {
    PublicAgreementPanel: () => React.createElement('div', null, 'Agreement details'),
  },
  '@/app/api/_base': { isApiError: () => false },
  '@/components/estimates/estimate-details/views/estimate-view-dealer-public': {
    EstimateViewDealerPublic: () => React.createElement('div', null, 'Product details'),
  },
};
function load(relative) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  cache.set(filename, exports);
  new Function('require', 'exports', code)(name => {
    if (name in mocks) return mocks[name];
    if (!name.startsWith('@/')) return require(name);
    for (const extension of ['.ts', '.tsx']) {
      const relativeName = name.slice(2) + extension;
      if (fs.existsSync(path.resolve(root, relativeName))) return load(relativeName);
    }
    throw new Error(`Unknown dependency: ${name}`);
  }, exports);
  return exports;
}
const Shell = load('components/estimates/estimate-details/parts/estimate-report-shell.tsx').EstimateReportShell;
const PublicPage = load('app/public/estimates/[token]/page.tsx').default;
const AgreementPage = load('app/public/estimates/[token]/agreements/[agreementId]/page.tsx').default;
const fixture = () => ({
  id: 10, number: '190936', name: 'Project', date: '2026-09-22', status: { name: 'Active' },
  customerFirstName: 'Customer', customerLastName: 'Example', customerPhone: 'customer-phone',
  customerEmail: 'customer@example.test', customerPromotionsVisible: false,
  branding: { type: 'COMPANY', name: 'Platform company', phone: 'platform-phone',
    email: 'platform@example.test', street: 'Platform address', website: 'platform.example.test',
    logoUrl: 'data:image/png;base64,AA==', brandingColor: '#CC0000' },
  externalDealerPresentation: { name: 'Pepe Ernandez', phone: 'issuer-phone', email: 'issuer@example.test' },
});
const render = (estimate, extra = {}) => renderToStaticMarkup(React.createElement(Shell, {
  estimate, showExternalDealerPresentation: true, ...extra,
}, 'Product details'));

async function main() {
  const estimate = fixture();
  const html = render(estimate);
  for (const expected of ['Pepe Ernandez', 'issuer-phone', 'issuer@example.test', 'Independent Distributor',
    'Generated with Authentic Evolution', 'This estimate is issued by Pepe Ernandez, an independent distributor.',
    'href="http://www.authenticevolutionco.com"', 'customer-phone', 'customer@example.test', 'Thank you for your business.']) {
    assert.ok(html.includes(expected), expected);
  }
  for (const forbidden of ['Platform company', 'platform-phone', 'platform@example.test', 'Platform address', 'platform.example.test', 'Platform support']) {
    assert.ok(!html.includes(forbidden), forbidden);
  }
  assert.match(html, /class="h-40 w-72 object-contain"/);
  const footer = html.slice(html.indexOf('<footer'));
  assert.ok(footer.indexOf('This estimate is issued by') < footer.indexOf('border-t'));
  assert.ok(footer.indexOf('border-t') < footer.indexOf('Generated with'));
  assert.equal(render(estimate, { internal: true }).includes('Independent Distributor'), true);

  // The server omits the issuer for internal accounts and accounts with their own branding.
  for (const type of ['COMPANY', 'DEALER']) {
    const legacy = { ...fixture(), branding: { ...fixture().branding, type }, externalDealerPresentation: null };
    assert.equal(render(legacy), render(legacy, { showExternalDealerPresentation: false }));
    assert.ok(render(legacy).includes('platform-phone'));
    assert.ok(!render(legacy).includes('Generated with'));
  }
  // Other shell consumers cannot opt in merely by receiving the new metadata.
  assert.equal(render(estimate, { showExternalDealerPresentation: false }),
    render({ ...estimate, externalDealerPresentation: null }, { showExternalDealerPresentation: false }));

  const missing = render({ ...estimate, externalDealerPresentation: { name: 'Dealer', phone: null, email: null } });
  assert.ok(!missing.includes('platform-phone'));
  assert.ok(!missing.includes('platform@example.test'));
  const escaped = render({ ...estimate, externalDealerPresentation: { name: '<script>bad()</script>', phone: null, email: null } });
  assert.ok(escaped.includes('&lt;script&gt;bad()&lt;/script&gt;'));
  assert.ok(!escaped.includes('<script>'));

  publicEstimate = estimate;
  const publicHtml = renderToStaticMarkup(await PublicPage({ params: Promise.resolve({ token: 'test-token' }) }));
  assert.ok(publicHtml.includes('Independent Distributor'));
  assert.ok(publicHtml.includes('href="http://www.authenticevolutionco.com"'));
  assert.ok(!publicHtml.includes('platform@example.test'));
  for (const renderOnly of [false, true]) {
    const agreementHtml = renderToStaticMarkup(await AgreementPage({
      params: Promise.resolve({ token: 'test-token', agreementId: 'agreement-1' }),
      searchParams: Promise.resolve(renderOnly ? { render: '1' } : {}),
    }));
    assert.ok(agreementHtml.includes('Independent Distributor'));
    assert.ok(agreementHtml.includes('href="http://www.authenticevolutionco.com"'));
    assert.ok(!agreementHtml.includes('platform@example.test'));
  }
  // Old snapshots retain their saved presentation without consulting the current owner.
  publicEstimate = { ...estimate, externalDealerPresentation: undefined };
  const oldAgreementHtml = renderToStaticMarkup(await AgreementPage({
    params: Promise.resolve({ token: 'test-token', agreementId: 'old-signed-agreement' }),
    searchParams: Promise.resolve({ render: '1' }),
  }));
  assert.ok(oldAgreementHtml.includes('platform@example.test'));
  assert.ok(!oldAgreementHtml.includes('Independent Distributor'));
  console.log('Passed: hybrid report, public and agreement routes, legacy/own branding, old snapshots, missing contacts, escaping.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
