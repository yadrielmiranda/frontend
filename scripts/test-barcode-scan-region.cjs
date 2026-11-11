// Run: node --test scripts/test-barcode-scan-region.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(path.resolve(__dirname, '../src/app/warehouse/barcode-scan-region.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const helper = {};
new Function('exports', compiled)(helper);
const { barcodeRegionCrop, readBarcodeRegion } = helper;
const rect = (left, top, width, height) => ({ left, top, width, height });

test('landscape video in a tall preview excludes the top and bottom letterbox', () => {
  assert.deepEqual(barcodeRegionCrop(1920, 1080, rect(10, 20, 400, 600), rect(50, 290, 320, 60)),
    { x: 192, y: 396, width: 1536, height: 288 });
  assert.equal(barcodeRegionCrop(1920, 1080, rect(10, 20, 400, 600), rect(50, 50, 320, 50)), null);
});

test('portrait video in a wide preview excludes side letterboxing', () => {
  assert.deepEqual(barcodeRegionCrop(1080, 1920, rect(100, 50, 640, 360), rect(360, 185, 120, 90)),
    { x: 220, y: 720, width: 640, height: 480 });
  assert.equal(barcodeRegionCrop(1080, 1920, rect(100, 50, 640, 360), rect(110, 120, 100, 90)), null);
});

test('partially overlapping guide crops only its visible video intersection', () => {
  assert.deepEqual(barcodeRegionCrop(800, 600, rect(10, 20, 400, 300), rect(-10, 10, 80, 80)),
    { x: 0, y: 0, width: 120, height: 140 });
});

test('fractional CSS positions round inward and never capture an outside edge pixel', () => {
  assert.deepEqual(barcodeRegionCrop(100, 100, rect(0, 0, 100, 100), rect(10.1, 20.8, 19.8, 20.1)),
    { x: 11, y: 21, width: 18, height: 19 });
  assert.equal(barcodeRegionCrop(100, 100, rect(0, 0, 100, 100), rect(10.1, 20.1, 0.5, 0.5)), null);
});

test('unknown video size and invalid or hidden layout never fall back to the full frame', () => {
  const bounds = rect(0, 0, 100, 100), guide = rect(20, 20, 60, 60);
  for (const size of [0, -1, NaN, Infinity]) {
    assert.equal(barcodeRegionCrop(size, 100, bounds, guide), null);
    assert.equal(barcodeRegionCrop(100, size, bounds, guide), null);
  }
  for (const invalid of [rect(0, 0, 0, 10), rect(0, 0, 10, -1), rect(NaN, 0, 10, 10), rect(0, Infinity, 10, 10)]) {
    assert.equal(barcodeRegionCrop(100, 100, invalid, guide), null);
    assert.equal(barcodeRegionCrop(100, 100, bounds, invalid), null);
  }
  assert.equal(barcodeRegionCrop(100, 100, bounds, rect(101, 0, 10, 10)), null);
});

test('capture refreshes bounds after resize/rotation and copies native pixels with no rescaling', () => {
  let videoBounds = rect(0, 0, 400, 300), guideBounds = rect(40, 120, 320, 60);
  const video = { readyState: 2, videoWidth: 800, videoHeight: 600, getBoundingClientRect: () => videoBounds };
  const region = { getBoundingClientRect: () => guideBounds };
  const draws = [];
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: (...args) => draws.push(args) }) };
  assert.equal(readBarcodeRegion(video, region, canvas), canvas);
  assert.deepEqual(draws[0], [video, 80, 240, 640, 120, 0, 0, 640, 120]);
  assert.deepEqual([canvas.width, canvas.height], [640, 120]);

  video.videoWidth = 600; video.videoHeight = 800;
  videoBounds = rect(15, 30, 300, 400); guideBounds = rect(45, 150, 240, 80);
  assert.equal(readBarcodeRegion(video, region, canvas), canvas);
  assert.deepEqual(draws[1], [video, 60, 240, 480, 160, 0, 0, 480, 160]);
  assert.deepEqual([canvas.width, canvas.height], [480, 160]);

  guideBounds = rect(0, 0, 0, 0);
  assert.equal(readBarcodeRegion(video, region, canvas), null);
  assert.equal(draws.length, 2);
  video.readyState = 1;
  assert.equal(readBarcodeRegion(video, region, canvas), null);
  assert.equal(draws.length, 2);
});

test('unavailable canvas reports an error rather than using the uncropped video', () => {
  const video = { readyState: 2, videoWidth: 100, videoHeight: 100, getBoundingClientRect: () => rect(0, 0, 100, 100) };
  const region = { getBoundingClientRect: () => rect(20, 20, 60, 60) };
  assert.throws(() => readBarcodeRegion(video, region, { getContext: () => null }), /canvas is unavailable/);
});
