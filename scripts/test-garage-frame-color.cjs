/* Exercises the real frame field and captured color display without network or database access. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '../src');
const compile = source => ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
const evaluate = (code, scope = {}) => new Function(...Object.keys(scope), compile(code))(...Object.values(scope));
const selection = { exports: {} };
evaluate(fs.readFileSync(path.join(root, 'components/estimates/piece-garage-design.ts'), 'utf8'), {
  exports: selection.exports,
});
const { pieceFrameColor, pieceGarageDesign, garageDesignFrameSelection } = selection.exports;
const ordinary = { id: 9, color: 'Bronze', hexCode: '#62524A' };
const linked = { id: 56, color: 'Linked Oak', hexCode: '#6A5522', isActive: true };
const color = { id: 42, name: 'Custom finish', hexCode: '#6A5522', isActive: true, idFrameColor: linked.id };
const design = { id: 23, name: 'Custom panels', imageUrl: null, isActive: true };
const system = { id: 10, allowDesign: true, designOptions: [{ idSystem: 10, idDesign: 23, idDesignColor: 42, color, design }] };
const piece = { idSyst: 10, idFC: 9, idDesign: 23, idDesignColor: 42, designSnapshot: null };
const original = structuredClone(piece);
assert.deepEqual(pieceFrameColor(piece, ordinary, system), { color: 'Custom finish', hexCode: '#6A5522' });
assert.deepEqual(piece, original, 'Description resolution remains read-only');
const capturedPiece = { ...piece, designSnapshot: { version: 1, systemId: 10,
  design: { id: 23, name: 'Saved panels' }, color: { id: 42, name: 'Saved finish', hexCode: '#123456' } } };
assert.deepEqual(pieceFrameColor(capturedPiece, ordinary, system), { color: 'Saved finish', hexCode: '#123456' }, 'Saved finish survives catalog changes');
assert.deepEqual(pieceFrameColor(capturedPiece, ordinary, { ...system, allowDesign: false, designOptions: [] }), { color: 'Saved finish', hexCode: '#123456' }, 'Retired designs preserve the captured finish');
assert.deepEqual(pieceFrameColor({ ...capturedPiece, idDesign: null, idDesignColor: null }, ordinary, system), { color: 'Bronze', hexCode: '#62524A' }, 'Removing design restores the ordinary frame even with a stale snapshot');
assert.deepEqual(pieceFrameColor({ ...capturedPiece, designSnapshot: { ...capturedPiece.designSnapshot, systemId: 99 } }, ordinary, system), { color: 'Custom finish', hexCode: '#6A5522' }, 'An unrelated snapshot cannot override the current selection');

const filename = path.join(root, 'components/estimates/piece-form.tsx');
const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'PieceForm');
let frameController;
function visit(node) {
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === 'Controller'
    && node.attributes.properties.some(prop => ts.isJsxAttribute(prop) && prop.name.text === 'name' && prop.initializer?.text === 'idFC')) frameController = node;
  ts.forEachChild(node, visit);
}
visit(component);
assert.ok(frameController);
const fieldMarkup = frameController.parent.getText(source);
const swatchDeclaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'ColorSelectOption').getText(source);
function declaration(name) {
  return component.body.statements.find(node => ts.isVariableStatement(node)
    && node.declarationList.declarations.some(item => item.name.getText(source) === name)).getText(source);
}
function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!React.isValidElement(node)) return [];
  return [node, ...elements(node.props.children)];
}
function field(enabled, currentPiece = piece, catalog = system, frames = [ordinary, linked]) {
  const scope = { require, exports: {}, designEnabled: enabled, selectedGarageDesign: pieceGarageDesign(currentPiece, catalog),
    garageFrameSelection: garageDesignFrameSelection({ enabled, piece: currentPiece, system: catalog, frameColors: frames }),
    pieceValues: currentPiece, availableFrameColors: frames, props: { frameColors: [ordinary] },
    control: {}, errors: {}, isLocked: false, selectedSystem: catalog, fieldLabelClass: '', selectTriggerClass: '',
    Label: 'Label', Controller: 'Controller', Select: 'Select', SelectTrigger: 'SelectTrigger', SelectValue: 'SelectValue',
    SelectContent: 'SelectContent', SelectItem: 'SelectItem' };
  return evaluate([swatchDeclaration, declaration('selectedFrameColor'), declaration('selectedFrameColorHex'),
    `return { tree: (${fieldMarkup}), hex: selectedFrameColorHex };`].join('\n'), scope);
}
let result = field(true);
assert.equal(result.hex, '#6A5522');
let controller = elements(result.tree).find(item => item.type === 'Controller');
assert.ok(controller, 'The frame field remains registered for calculation validation');
let control = controller.props.render({ field: { value: 9, onChange() {} } });
assert.equal(elements(control).some(item => item.type === 'Select'), false, 'Design frame cannot be independently changed');
let summary = elements(result.tree).find(item => item.props['data-frame-color-source'] === 'DESIGN');
let html = renderToStaticMarkup(summary);
assert.match(html, /Custom finish/); assert.match(html, /background-color:#6A5522/); assert.match(html, /Matches Design Color/);
assert.doesNotMatch(html, /base frame color below/);

result = field(false);
assert.equal(result.hex, '#62524A');
assert.equal(elements(result.tree).some(item => item.props['data-frame-color-source'] === 'DESIGN'), false);
controller = elements(result.tree).find(item => item.type === 'Controller');
control = controller.props.render({ field: { value: 9, onChange() {} } });
assert.ok(elements(control).some(item => item.type === 'Select'), 'Turning design off restores the normal editable selector');
assert.equal(elements(control).find(item => item.type === 'Select').props.value, '9');

result = field(true, { ...piece, idFC: 0 }, { ...system, designOptions: [{ ...system.designOptions[0], color: { ...color, idFrameColor: null } }] });
summary = elements(result.tree).find(item => item.props['data-frame-color-source'] === 'DESIGN');
assert.match(renderToStaticMarkup(summary), /Link this Design Color to a Frame Color/);
controller = elements(result.tree).find(item => item.type === 'Controller');
control = controller.props.render({ field: { value: 0, onChange() {} } });
assert.equal(elements(control).some(item => item.type === 'Select'), false, 'An unlinked design cannot select an unrelated pricing frame');
result = field(true, capturedPiece, { ...system, allowDesign: false, designOptions: [] });
assert.equal(result.hex, '#123456', 'Editing an archived design uses its captured frame finish');

const resolveFrame = (value = piece, catalog = system, frames = [ordinary, linked], enabled = true) => garageDesignFrameSelection({ enabled, piece: value, system: catalog, frameColors: frames });
assert.deepEqual(resolveFrame(), { idFrameColor: 56, error: null }, 'An explicit link uses the real Frame Color ID even when names differ');
assert.deepEqual(resolveFrame(piece, system, [ordinary, linked], false), { idFrameColor: null, error: null }, 'Normal Bronze requires no corresponding design');
assert.equal(selection.exports.availableGarageDesignOptions(system).length, 1, 'Normal frame colors do not become design colors');
assert.match(resolveFrame(piece, system, [ordinary]).error, /unavailable for this series/);
assert.match(resolveFrame(piece, system, [ordinary, { ...linked, isActive: false }]).error, /unavailable for this series/);
const unlinkedSystem = { ...system, designOptions: [{ ...system.designOptions[0], color: { ...color, idFrameColor: null } }] };
assert.match(resolveFrame(piece, unlinkedSystem).error, /Link this Design Color/);
assert.deepEqual(resolveFrame(capturedPiece), { idFrameColor: 56, error: null }, 'Legacy snapshots acquire their current explicit catalog link');
const linkedSnapshotPiece = { ...capturedPiece, designSnapshot: { ...capturedPiece.designSnapshot, color: { ...capturedPiece.designSnapshot.color, idFrameColor: 9 } } };
assert.deepEqual(resolveFrame(linkedSnapshotPiece), { idFrameColor: 9, error: null }, 'An existing snapshot keeps its captured mapping after catalog remapping');
assert.deepEqual(resolveFrame({ ...linkedSnapshotPiece, designSnapshot: { ...linkedSnapshotPiece.designSnapshot, systemId: 99 } }), { idFrameColor: 56, error: null }, 'A mismatched snapshot cannot supply a frame ID');

// Execute the real synchronization effect, including invalidating stale prices.
const syncEffect = component.body.statements.find(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)
  && node.expression.expression.getText(source) === 'useLayoutEffect' && node.getText(source).includes('garageFrameSelection.idFrameColor'));
assert.ok(syncEffect);
function sync(enabled, frame, currentId) {
  const result = { idFC: currentId, locked: true, request: 8, items: ['item-results', 'item-frame'] };
  const refs = { current: 3 };
  evaluate(syncEffect.getText(source), { designEnabled: enabled, garageFrameSelection: frame, pieceValues: { idFC: currentId },
    useLayoutEffect: callback => callback(), getValues: () => result.idFC,
    setValue: (name, value) => { assert.equal(name, 'idFC'); result.idFC = value; }, latestCalculationRef: refs,
    setIsLocked: value => { result.locked = value; }, setResultsScrollRequest: value => { result.request = value; },
    setActiveAccordionItems: callback => { result.items = callback(result.items); } });
  return result;
}
assert.deepEqual(sync(true, resolveFrame(), 9), { idFC: 56, locked: false, request: 0, items: ['item-frame'] }, 'Choosing a design writes actual idFC and requires recalculation');
assert.equal(sync(true, resolveFrame(piece, unlinkedSystem), 9).idFC, 0, 'Missing mapping cannot keep the old Bronze pricing ID');
assert.equal(sync(false, { idFrameColor: null }, 56).idFC, 56, 'Removing design keeps its normal frame selection');
assert.equal(sync(true, resolveFrame(), 56).locked, true, 'Matching captured frame leaves current results intact');
console.log('PASS garage frame: real ID synchronization, captured/legacy links, one-way catalog mapping, missing/inactive frame blocking, and normal frame restoration.');
