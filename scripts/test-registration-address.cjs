// Public client registration schema and username preview; no network or account creation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const z = require('zod');
const file = path.resolve(__dirname, '../src/components/card-register.tsx');
const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const compile = code => ts.transpileModule(code, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
} }).outputText;
function declaration(name, statements) {
  const node = statements.find(n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(source) === name));
  assert.ok(node, `${name} comes from the real registration component`);
  return node.getText(source);
}
function loadLibrary(name) {
  const exports = {};
  const content = fs.readFileSync(path.resolve(__dirname, '../src/lib', `${name}.ts`), 'utf8');
  new Function('require', 'exports', compile(content))(require, exports);
  return exports;
}
const dependencies = { z, ...loadLibrary('validators-email'), ...loadLibrary('validators-phone'), ...loadLibrary('username-policy') };
const schema = new Function(...Object.keys(dependencies), compile(`${declaration('registerSchema', source.statements)}\nreturn registerSchema;`))(...Object.values(dependencies));
const valid = {
  firstName: 'José', lastName: 'Pérez', email: 'jose@example.test',
  phone: '+13055550111', password: 'Example-password-123',
  serviceConsent: false, promotionsConsent: false,
};
const test = require('node:test');

test('the five public registration fields can create an account without an address or username', () => {
  assert.deepEqual(schema.parse(valid), valid);
  for (const field of ['firstName', 'lastName', 'email', 'phone', 'password']) {
    assert.equal(schema.safeParse({ ...valid, [field]: '' }).success, false, field);
  }
  assert.equal(schema.safeParse({ ...valid, password: 'short' }).success, false);
  assert.equal(schema.safeParse({ ...valid, firstName: ' ' }).success, false);
});

test('a manual username is validated and the automatic suggestion covers accented, short and long names', () => {
  assert.equal(schema.parse({ ...valid, username: 'custom-user' }).username, 'custom-user');
  assert.equal(schema.safeParse({ ...valid, username: 'J' }).success, false);
  assert.equal(schema.safeParse({ ...valid, username: '' }).success, false);
  const { suggestedClientUsername, isValidUsername } = dependencies;
  assert.equal(suggestedClientUsername('José', 'Pérez'), 'JosePerez');
  assert.equal(suggestedClientUsername('María José', "O'Connor"), 'MariaJoseOConnor');
  for (const [first, last] of [['李', '伟'], ['X', 'Li'], ['123', '456'], ['A'.repeat(70), 'B'.repeat(90)]]) {
    assert.ok(isValidUsername(suggestedClientUsername(first, last)));
  }
});
