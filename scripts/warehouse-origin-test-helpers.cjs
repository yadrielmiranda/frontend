// Load the shared PO display with local React markup only; no browser or network.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../src/app/warehouse/unit-origin.tsx');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename,
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const result = { exports: {} };
new Function('require', 'module', 'exports', compiled)(id => {
  if (id === 'next/link') return { __esModule: true, default: 'a' };
  return require(id);
}, result, result.exports);
module.exports = result.exports;
