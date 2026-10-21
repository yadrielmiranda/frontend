/* Estimate detail quantity and pricing-privacy regressions. Synthetic data only.
 * Run from frontend: node scripts/test-estimate-details-summary.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const root = path.resolve(__dirname, '../src');
const cache = new Map();
global.fetch = () => { throw new Error('Network forbidden in estimate detail tests'); };

function load(relative) {
  const file = path.resolve(root, relative);
  assert.ok(file.startsWith(root + path.sep));
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    },
  }).outputText;
  new Function('require', 'module', 'exports', source)((id) => {
    if (['react', 'react/jsx-runtime', 'clsx', 'tailwind-merge', '@radix-ui/react-label'].includes(id)) return require(id);
    if (id === '@/components/piece-diagram') return { PieceDiagram: () => null };
    if (id === '../parts/report-financial-summary') return {
      ReportFinancialSummary: () => React.createElement('section', { 'data-financial-summary': true }),
    };
    const target = id.startsWith('@/') ? path.resolve(root, id.slice(2))
      : id.startsWith('.') ? path.resolve(path.dirname(file), id) : null;
    assert.ok(target, `Unexpected dependency ${id}`);
    const resolved = ['.ts', '.tsx'].map(ext => target + ext)
      .find(candidate => fs.existsSync(candidate));
    assert.ok(resolved, `Cannot resolve ${id}`);
    return load(resolved);
  }, module, module.exports);
  return module.exports;
}

const { PiecesTable } = load('components/estimates/estimate-details/parts/pieces-table.tsx');
const { PieceReportCard } = load('components/estimates/estimate-details/parts/piece-report-card.tsx');
const { EstimateViewAdmin } = load('components/estimates/estimate-details/views/estimate-view-admin.tsx');
const { EstimateViewDealerInternal } = load('components/estimates/estimate-details/views/estimate-view-dealer-internal.tsx');
const { EstimateViewDealerPublic } = load('components/estimates/estimate-details/views/estimate-view-dealer-public.tsx');
const { EstimateViewClient } = load('components/estimates/estimate-details/views/estimate-view-client.tsx');

const piece = {
  id: 1, mark: 'W1', width: 36, height: 60, qty: 3, screen: false,
  prod: { name: 'Single Hung', kind: 'GLAZED_UNIT' },
  syst: { name: '100' }, bran: { name: 'Eco' }, conf: { conf: 'Equal Lites' },
  fColor: { color: 'White' }, cryst: { glass: '7/16 Laminated' },
  tin: { color: 'Clear' }, price: '100', subtotal: '300',
  customerPrice: '125', customerSubtotal: '375', dealerMarkup: '0.25',
};
const pieces = [piece, {
  ...piece, id: 2, mark: 'M1', qty: 4, width: 120, height: null,
  prod: { name: 'Mullion', kind: 'LINEAR_MATERIAL' },
  subtotal: '400', customerPrice: '112.34', customerSubtotal: '449.36',
  dealerMarkup: '0.1234',
}];
const estimate = {
  id: 10, user: { role: { name: 'dealer' }, dealerMode: 'EXTERNAL' },
  status: { name: 'Active' }, pieces,
};
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const text = html => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const count = (html, label) => (html.match(new RegExp(label, 'g')) ?? []).length;
const assertTotal = (html, total) => {
  const inputs = [...html.matchAll(/<input\b[^>]*>/g)].map(match => match[0]);
  const totalInputs = inputs.filter(input => /aria-label="Total pieces"/.test(input));
  assert.equal(totalInputs.length, 1, 'One accessible total quantity field');
  assert.match(totalInputs[0], new RegExp(`\\bvalue="${total}"`));
  assert.match(totalInputs[0], /\breadOnly=""/);
  assert.doesNotMatch(text(html), /Total Pieces/i, 'Old total pill is removed from the product heading');
  assert.equal(count(html, 'Pieces Breakdown'), 1);
};
const assertNoMarkup = html => {
  assert.doesNotMatch(html, /Markup|25\.00%|12\.34%/i);
};

const original = JSON.stringify(estimate);
const internal = render(EstimateViewDealerInternal, { estimate });
assertTotal(internal, 7);
assert.equal(count(internal, 'data-estimate-piece-card='), 2, 'Seven pieces are represented by two product lines');
assert.equal(count(internal, 'Markup'), 2);
assert.match(internal, /25\.00%/);
assert.match(internal, /12\.34%/);
assert.match(internal, /\$100\.00/);
assert.match(internal, /\$300\.00/);
assert.match(internal, /\$400\.00/);
assert.match(text(internal), /Single Hung: 3 \| Mullion: 4/);
assert.ok(internal.indexOf('Pieces Breakdown') > internal.lastIndexOf('</article>'), 'Breakdown follows the last product card');
assert.ok(internal.indexOf('Pieces Breakdown') < internal.indexOf('data-financial-summary'), 'Breakdown precedes the pricing summary');
assert.equal(JSON.stringify(estimate), original, 'Displaying quantities and markups preserves saved pricing');
console.log('PASS internal report: sums quantities including linear items, per-piece markup percentages, unchanged prices');

const grouped = render(PiecesTable, {
  pieces: [...pieces,
    { ...piece, id: 3, qty: 2, prod: { ...piece.prod, name: ' Single Hung ' } },
    { ...piece, id: 4, qty: 1, prod: null },
  ],
  showPrices: false,
});
assertTotal(grouped, 10);
assert.match(text(grouped), /Single Hung: 5 \| Mullion: 4 \| Product: 1/);
assert.equal(count(grouped, 'Single Hung: 5'), 1, 'Repeated product lines share one grouped quantity');
console.log('PASS pieces breakdown: repeated product names combine quantities and unnamed products have a fallback');

for (const isAdmin of [true, false]) {
  const admin = render(EstimateViewAdmin, { estimate, isAdmin });
  assertTotal(admin, 7);
  assert.equal(count(admin, 'Markup'), 2, 'Both admin and operator internal reports show dealer markup');
  assertNoMarkup(render(EstimateViewAdmin, {
    estimate: { ...estimate, user: { role: { name: 'client' } } }, isAdmin,
  }));
}
console.log('PASS admin report: dealer-owned estimates show markups; client-owned estimates do not');

for (const dealerMode of ['INTERNAL', 'EXTERNAL']) {
  const customerEstimate = { ...estimate, user: { ...estimate.user, dealerMode } };
  for (const pricingMode of ['detailed', 'total']) {
    const customer = render(EstimateViewDealerPublic, { estimate: customerEstimate, pricingMode });
    assertTotal(customer, 7);
    assertNoMarkup(customer);
    if (pricingMode === 'detailed') {
      assert.match(customer, /\$125\.00/);
      assert.match(customer, /\$112\.34/);
    } else {
      assert.doesNotMatch(customer, /Unit Price|Subtotal|\$125\.00|\$112\.34/);
    }
  }
}
const client = render(EstimateViewClient, { estimate });
assertTotal(client, 7);
assertNoMarkup(client);
console.log('PASS customer reports: totals visible, markups absent in detailed, project-total, and client views');

const baseCardProps = { piece, displayMark: 'W1', unitPrice: 100, subtotal: 300 };
assertNoMarkup(render(PieceReportCard, baseCardProps));
assertNoMarkup(render(PiecesTable, {
  pieces, getUnitPrice: p => Number(p.price), getSubtotal: p => Number(p.subtotal),
}));
assertNoMarkup(render(PiecesTable, { pieces, showPrices: false, showDealerMarkup: true }));
const zeroMarkup = render(PieceReportCard, {
  ...baseCardProps, piece: { ...piece, dealerMarkup: 0 }, showDealerMarkup: true,
});
assert.match(zeroMarkup, /Markup/);
assert.match(zeroMarkup, /0\.00%/);
console.log('PASS safe defaults: shared components hide markup unless explicitly enabled; zero markup stays visible internally');

for (const dealerMarkup of [null, undefined, 'NaN', Infinity]) {
  const unavailable = render(PieceReportCard, {
    ...baseCardProps, piece: { ...piece, dealerMarkup }, showDealerMarkup: true,
  });
  assert.match(text(unavailable), /Markup\s+—/);
  assert.doesNotMatch(unavailable, /0\.00%|NaN%|Infinity%/);
}
console.log('PASS unavailable markup: missing and invalid values are not presented as zero');

const empty = render(PiecesTable, { pieces: [], showPrices: false });
assertTotal(empty, 0);
assert.match(empty, /No products included/);
assert.match(empty, /No calculated pieces yet/);
console.log('PASS empty estimate: zero pieces and existing empty state');
