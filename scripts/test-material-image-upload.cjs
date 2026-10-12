/* Browser image preparation checks. No upload, server or application-data writes. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.resolve(__dirname, '../src/lib/material-image-upload.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const target = { exports: {} };
new Function('module', 'exports', compiled)(target, target.exports);
const { prepareMaterialImage } = target.exports;
let width = 4000, height = 3000, decodeError = false, output = new Blob(['optimized'], { type: 'image/webp' });
let created = 0, revoked = 0, canvas;
globalThis.Image = class {
  constructor() { this.naturalWidth = width; this.naturalHeight = height; }
  async decode() { if (decodeError) throw new Error('Unreadable'); }
};
globalThis.document = { createElement: () => (canvas = { width: 0, height: 0, getContext: () => ({ drawImage() {} }), toBlob: fn => fn(output) }) };
const createUrl = URL.createObjectURL, revokeUrl = URL.revokeObjectURL;
URL.createObjectURL = () => { created++; return 'blob:test-image'; };
URL.revokeObjectURL = () => { revoked++; };
const photo = () => new File(['image'], 'photo.jpg', { type: 'image/jpeg' });
(async () => {
  try {
    await assert.rejects(prepareMaterialImage(new File(['<svg/>'], 'image.svg', { type: 'image/svg+xml' })), /JPG, PNG or WebP/);
    await assert.rejects(prepareMaterialImage(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'photo.jpg', { type: 'image/jpeg' })), /5 MB/);
    assert.equal(created, 0, 'invalid files must not be decoded');
    const optimized = await prepareMaterialImage(photo());
    assert.equal(optimized.type, 'image/webp'); assert.equal(optimized.name, 'product.webp');
    assert.equal(canvas.width, 1600); assert.equal(canvas.height, 1200);
    assert.equal(created, revoked, 'decoded image URL must be released');
    width = 600; height = 800;
    await prepareMaterialImage(photo()); assert.equal(canvas.width, 600); assert.equal(canvas.height, 800);
    output = new Blob(['png fallback'], { type: 'image/png' });
    assert.equal((await prepareMaterialImage(photo())).name, 'product.png');
    decodeError = true;
    await assert.rejects(prepareMaterialImage(photo()), /could not be opened/);
    decodeError = false; output = null;
    await assert.rejects(prepareMaterialImage(photo()), /could not be prepared/);
    width = 9000; height = 9000;
    await assert.rejects(prepareMaterialImage(photo()), /40 million pixels/);
    assert.equal(created, revoked, 'failed image URL must also be released');
    process.stdout.write('Image preparation checks passed: type/size, resize, no upscaling, PNG fallback and failure cleanup.\n');
  } finally {
    URL.createObjectURL = createUrl; URL.revokeObjectURL = revokeUrl;
    delete globalThis.Image; delete globalThis.document;
  }
})().catch(error => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
