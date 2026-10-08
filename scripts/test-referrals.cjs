const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/lib/referrals.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } }).outputText;
const context = { exports: {}, Intl };
vm.runInNewContext(compiled, context);
const { moneyInCents, validAchRoutingNumber } = context.exports;

assert.equal(moneyInCents('8000'), 800000);
assert.equal(moneyInCents('5320.64'), 532064);
assert.equal(moneyInCents('0.01'), 1);
assert.equal(moneyInCents(' 24.1 '), 2410);
for (const value of ['-1', '0.001', '1e3', 'Infinity', '1,000.00', '', '9007199254740991']) assert.equal(moneyInCents(value), null);
assert.equal(validAchRoutingNumber('021000021'), true);
assert.equal(validAchRoutingNumber('021000022'), false);
assert.equal(validAchRoutingNumber('000000000'), false);
assert.equal(validAchRoutingNumber('21000021'), false);

// Render the same SVG writer used by the page, then decode its actual pixels.
// The minimal DOM collects SVG rects only; no browser, network, or bank data.
global.document = { createElementNS: (_ns, tag) => ({ tag, attributes: {}, children: [],
  setAttribute(name, value) { this.attributes[name] = value; },
  appendChild(child) { this.children.push(child); },
}) };
const { BrowserQRCodeSvgWriter } = require('@zxing/browser');
const { BitMatrix, QRCodeReader, DecodeHintType } = require('@zxing/library');
for (const url of ['https://example.test/login/register?ref=abcdefghijklmnopqrstuvwx', 'http://192.0.2.1:3000/login/register?ref=abc_def-ghi_jkl-mno_pqrst']) {
  const svg = new BrowserQRCodeSvgWriter().write(url, 224, 224);
  const pixels = new BitMatrix(Number(svg.attributes.width), Number(svg.attributes.height));
  for (const rect of svg.children) {
    const { x, y, width, height } = rect.attributes;
    pixels.setRegion(Number(x), Number(y), Number(width), Number(height));
  }
  const decoded = new QRCodeReader().decode({ getBlackMatrix: () => pixels }, new Map([[DecodeHintType.PURE_BARCODE, true]]));
  assert.equal(decoded.getText(), url);
}
delete global.document;
console.log('Referral amount validation, ACH routing validation, and QR roundtrip checks passed.');
