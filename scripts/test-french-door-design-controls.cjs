// Exercise the settings screens and the estimate picker using their real event handlers.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "../src");
const jsx = (type, props, key) => ({ type, props, key });
const api = {};
const ui = new Proxy({}, { get: (_, name) => name });
let slots = [], cursor = 0;
const hooks = {
  useState(initial) {
    const slot = cursor++;
    const state = slots;
    if (!(slot in state)) state[slot] = typeof initial === "function" ? initial() : initial;
    return [state[slot], next => { state[slot] = typeof next === "function" ? next(state[slot]) : next; }];
  },
  useRef(initial) { return slots[cursor++] ??= { current: initial }; },
};
const deps = {
  react: hooks, "react/jsx-runtime": { jsx, jsxs: jsx },
  "@/components/ui/input": ui, "@/components/ui/button": ui,
  "@/components/piece-diagram/renderers/french-door/french-door-design-thumbnail": ui,
  "@/app/api/door-designs.api": api,
};
function load(relative) {
  const filename = path.join(root, relative);
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), { fileName: filename, compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  new Function("require", "exports", code)(id => { assert.ok(id in deps, id); return deps[id]; }, exports);
  return exports;
}
function mount(Component, props) {
  const state = [];
  return (nextProps = props) => { slots = state; cursor = 0; return Component(nextProps); };
}
function nodes(tree, type) {
  if (Array.isArray(tree)) return tree.flatMap(item => nodes(item, type));
  if (!tree?.props) return [];
  return [...(type === undefined || tree.type === type ? [tree] : []), ...nodes(tree.props.children, type)];
}
function visibleText(tree) {
  if (Array.isArray(tree)) return tree.map(visibleText).join("");
  if (tree?.props) return visibleText(tree.props.children);
  return typeof tree === "string" || typeof tree === "number" ? String(tree) : "";
}
const catalogDir = "app/settings/(write)/french-door-designs";
const { DoorDesignCatalog } = load(catalogDir + "/door-design-catalog.tsx");
const { FrenchDoorDesignFields } = load("components/estimates/french-door-design-fields.tsx");
const { selectedDoorDesign } = load("lib/door-designs.ts");

async function run() {
  let single = { id: 10, kind: "SINGLE", code:"Single 01", artworkKey:"SD01", unitPrice:null };
  const double = { id: 11, kind: "DOUBLE", code:"Double 01", artworkKey:"DD01", unitPrice:null };
  const changes = [];
  api.updateDoorDesign = async (id, input) => {
    assert.equal(id, single.id); changes.push(input); return single = { ...single, ...input };
  };
  const renderCatalog = mount(DoorDesignCatalog, { designs: [single, double] });
  const filterGroup = () => nodes(renderCatalog()).find(node =>
    node.props.role === "group" && node.props["aria-label"] === "Filter by door type");
  const filters = () => nodes(filterGroup(), "button");
  const chooseKind = label => filters().find(button => visibleText(button) === label).props.onClick();
  const rows = () => nodes(renderCatalog()).filter(node => node.props.initial?.artworkKey);
  const shown = () => rows().filter(node => node.props.visible).map(node => node.props.initial.id);
  const singleRow = () => rows().find(node => node.props.initial.id === single.id);
  assert.deepEqual(filters().map(visibleText), ["All", "Single door", "Double door"]);
  assert.deepEqual(filters().map(button => button.props["aria-pressed"]), [true, false, false]);
  assert.deepEqual(shown(), [single.id, double.id]);
  const row = singleRow();
  const renderEditor = mount(row.type, row.props);
  const edit = () => renderEditor(singleRow().props);
  const update = (index, value) => nodes(edit(), "Input")[index].props.onChange({ target:{ value } });
  const save = () => edit().props.onSubmit({ preventDefault() {} });
  assert.equal(nodes(edit(), "Button")[0].props.disabled, true);
  update(0, "Unsaved code");
  chooseKind("Double door");
  assert.deepEqual(shown(), [double.id]);
  assert.deepEqual(filters().map(button => button.props["aria-pressed"]), [false, false, true]);
  const emptyType = renderCatalog({ designs: [single] });
  assert.ok(nodes(emptyType, "p").some(node => node.props.role === "status" && visibleText(node)));
  assert.equal(singleRow().key, row.key);
  assert.equal(singleRow().type, row.type);
  assert.equal(edit(), null);
  chooseKind("Single door");
  assert.deepEqual(shown(), [single.id]);
  assert.equal(nodes(edit(), "Input")[0].props.value, "Unsaved code");
  update(0, single.code);
  chooseKind("All");
  assert.deepEqual(shown(), [single.id, double.id]);
  assert.deepEqual(changes, []);
  console.log("PASS catalog filters single and double doors and keeps unsaved edits when switching");
  update(1, "-1"); await save(); assert.equal(changes.length, 0);
  update(1, "0"); await save(); assert.deepEqual(changes.pop(), { unitPrice:"0" });
  update(0, "  S-CUSTOM  "); await save(); assert.deepEqual(changes.pop(), { code:"S-CUSTOM" });
  update(1, ""); await save(); assert.deepEqual(changes.pop(), { unitPrice:null });
  update(1, "154.75"); await save(); assert.deepEqual(changes.pop(), { unitPrice:"154.75" });
  console.log("PASS catalog edits codes and prices independently, including zero and pending prices");


  const selections = [];
  const picker = { options:[single], selected:null, selectedId:null, locked:false, frameColorHex:"#4a3627",
    glassTintHex:"#ccddee", highBottom: false, onChange:id => selections.push(id) };
  const render = mount(FrenchDoorDesignFields, picker);
  assert.equal(nodes(render(), "FrenchDoorDesignThumbnail").length, 0);
  nodes(render(), "details")[0].props.onToggle({ currentTarget: { open: true } });
  const buttons = nodes(render(), "button");
  const spanishPicker = render({ ...picker, locale: "es" });
  assert.equal(visibleText(nodes(spanishPicker, "button")[0]), "Sin diseño");
  assert.equal(visibleText(nodes(spanishPicker, "button")[1]), picker.options[0].code);
  assert.equal(buttons[0].props["aria-pressed"], true);
  const thumb = nodes(buttons[1], "FrenchDoorDesignThumbnail")[0].props;
  assert.deepEqual(thumb, { artworkKey:"SD01", frameColorHex:picker.frameColorHex, glassTintHex:picker.glassTintHex, highBottom:false });
  picker.highBottom = true;
  assert.equal(nodes(render(), "FrenchDoorDesignThumbnail")[0].props.highBottom, true);
  buttons[1].props.onClick(); buttons[0].props.onClick(); assert.deepEqual(selections, [10, null]);
  picker.options = []; assert.equal(render(), null);
  picker.selected = single; picker.selectedId = 10; picker.locked = true;
  assert.ok(nodes(render(), "p").some(node => node.props.children === "S-CUSTOM"));
  assert.ok(nodes(render(), "p").some(node => node.props.role === "status"));
  assert.equal(nodes(render(), "button").length, 0);
  console.log("PASS estimate picker uses current materials, allows removing a design and displays a withdrawn selection when reopening");

  // The server supplies standard codes in numeric order and retains custom-code slots.
  // Both consumers must preserve that ordering and the immutable artwork/id association.
  const continuation = [
    { id: 500, code: 'Custom first', artworkKey: 'SD01', kind: 'SINGLE' },
    { id: 501, code: 'AE-SD-98', artworkKey: 'SD98', kind: 'SINGLE' },
    { id: 502, code: 'AE-SD-99', artworkKey: 'SD99', kind: 'SINGLE' },
    { id: 503, code: 'Custom middle', artworkKey: 'SD02', kind: 'SINGLE' },
    { id: 504, code: 'AE-SD-100', artworkKey: 'SD100', kind: 'SINGLE' },
    { id: 505, code: 'AE-SD-101', artworkKey: 'SD101', kind: 'SINGLE' },
  ];
  const continuedCatalog = mount(DoorDesignCatalog, { designs: continuation });
  assert.deepEqual(nodes(continuedCatalog()).filter(node => node.props.initial?.artworkKey).map(node => node.props.initial.code), continuation.map(item => item.code));
  const continuedPicker = mount(FrenchDoorDesignFields, { ...picker, options: continuation, selected: null, selectedId: null, locked: false });
  nodes(continuedPicker(), 'details')[0].props.onToggle({ currentTarget: { open: true } });
  assert.deepEqual(nodes(continuedPicker(), 'button').slice(1).map(visibleText), continuation.map(item => item.code));
  assert.deepEqual(nodes(continuedPicker(), 'FrenchDoorDesignThumbnail').map(node => node.props.artworkKey), continuation.map(item => item.artworkKey));
  console.log('PASS catalog and estimate picker preserve numeric 99-to-100 continuation and custom-code positions from the server');

  for (const [prefix, count, kind] of [['SD', 14, 'SINGLE'], ['DD', 13, 'DOUBLE']]) {
    const options = Array.from({ length: count }, (_, index) => ({
      id: 1000 + (prefix === 'SD' ? 0 : 100) + index, kind,
      artworkKey: prefix + (97 + index), code: 'AE-' + prefix + '-' + (97 + index),
    }));
    const selectedIds = [];
    const newPickerProps = { ...picker, options, selected: null, selectedId: null, locked: false, onChange: id => selectedIds.push(id) };
    const newPicker = mount(FrenchDoorDesignFields, newPickerProps);
    for (let index = 0; index < options.length; index++) {
      nodes(newPicker(), 'details')[0].props.onToggle({ currentTarget: { open: true } });
      const button = nodes(newPicker(), 'button')[index + 1];
      assert.equal(visibleText(button), options[index].code);
      assert.equal(nodes(button, 'FrenchDoorDesignThumbnail')[0].props.artworkKey, options[index].artworkKey);
      button.props.onClick();
      assert.equal(selectedIds.at(-1), options[index].id);
      const selectedView = newPicker({ ...newPickerProps, selected: options[index], selectedId: options[index].id });
      assert.equal(visibleText(nodes(selectedView, 'summary')[0]), options[index].code);
    }
    assert.deepEqual(selectedIds, options.map(item => item.id));
  }
  console.log('PASS all 27 new selections retain the approved display code, artwork key and selected record id');


  for (const [index, artworkKey] of ['SD96', 'SD97', 'SD110', 'SD111', 'SD151', 'SD152', 'SD193', 'DD96', 'DD97', 'DD109', 'DD110', 'DD134', 'DD135', 'DD171'].entries()) {
    const snapshot = { id: 2000 + index, version: 1, systemId: 7, configId: 8, artworkKey,
      code: 'AE-' + artworkKey.slice(0, 2) + '-' + artworkKey.slice(2), kind: artworkKey.startsWith('SD') ? 'SINGLE' : 'DOUBLE' };
    const changedCatalog = [{ ...snapshot, code: 'Custom current ' + index }];
    const reopened = selectedDoorDesign(snapshot.id, 7, 8, changedCatalog, snapshot);
    assert.equal(reopened, snapshot, 'Reopening the same piece retains its quoted code and immutable drawing');
    const reopenedPicker = mount(FrenchDoorDesignFields, { ...picker, options: changedCatalog, selected: reopened, selectedId: snapshot.id, locked: false });
    assert.equal(visibleText(nodes(reopenedPicker(), 'summary')[0]), snapshot.code);
    nodes(reopenedPicker(), 'details')[0].props.onToggle({ currentTarget: { open: true } });
    const selectedButton = nodes(reopenedPicker(), 'button')[1];
    assert.equal(visibleText(selectedButton), snapshot.code);
    assert.equal(selectedButton.props['aria-pressed'], true);
    assert.equal(nodes(selectedButton, 'FrenchDoorDesignThumbnail')[0].props.artworkKey, snapshot.artworkKey);
    assert.equal(selectedDoorDesign(snapshot.id, 7, 9, changedCatalog, snapshot), changedCatalog[0], 'Changing configuration does not reuse a stale quote snapshot');
    assert.equal(selectedDoorDesign(snapshot.id, 7, 8, [], snapshot), snapshot, 'Withdrawn designs remain visible on saved pieces');
  }
  console.log('PASS previous and new boundary designs reopen with the saved code and artwork even after a catalog rename');


  for (const batch of [
    { file: './data/french-door-eco-additions-20261123.json', count: 66, firstId: 3000, ranges: [['SINGLE', 111, 151], ['DOUBLE', 110, 134]] },
    { file: './data/french-door-eco-variants-20261123.json', count: 79, firstId: 4000, ranges: [['SINGLE', 152, 193], ['DOUBLE', 135, 171]] },
  ]) {
    const ecoManifest = require(batch.file);
    assert.equal(ecoManifest.entries.length, batch.count);
    for (const [kind, first, last] of batch.ranges) {
    const options = ecoManifest.entries.filter(entry => entry.kind === kind).map((entry, index) => ({
      id: batch.firstId + (kind === 'SINGLE' ? 0 : 100) + index, kind: entry.kind, artworkKey: entry.artworkKey, code: entry.code,
    }));
    assert.equal(options.length, last - first + 1);
    const selections = [];
    const props = { ...picker, options, selected: null, selectedId: null, locked: false,
      frameColorHex: '#FFFFFF', glassTintHex: '#FFFFFF', highBottom: false, onChange: id => selections.push(id) };
    const renderEcos = mount(FrenchDoorDesignFields, props);
    for (const option of options) {
      nodes(renderEcos(), 'details')[0].props.onToggle({ currentTarget: { open: true } });
      const menu = renderEcos();
      const choices = nodes(menu, 'button').slice(1);
      assert.deepEqual(choices.map(visibleText), options.map(item => item.code));
      const choice = choices.find(button => button.key === option.id);
      assert.ok(choice, 'The estimate picker offers ' + option.code);
      assert.deepEqual(nodes(choice, 'FrenchDoorDesignThumbnail')[0].props, {
        artworkKey: option.artworkKey, frameColorHex: '#FFFFFF', glassTintHex: '#FFFFFF', highBottom: false,
      });
      choice.props.onClick();
      assert.equal(selections.at(-1), option.id);
      const selectedView = renderEcos({ ...props, selected: option, selectedId: option.id });
      assert.equal(visibleText(nodes(selectedView, 'summary')[0]), option.code);
      assert.equal(nodes(selectedView, 'FrenchDoorDesignThumbnail').length, 0, 'Choosing closes the thumbnail grid');
    }
    assert.deepEqual(selections, options.map(item => item.id));
    const settings = mount(DoorDesignCatalog, { designs: options.map(option => ({ ...option, unitPrice: null })) });
    assert.deepEqual(nodes(settings()).filter(node => node.props.initial?.artworkKey).map(node => node.props.initial.artworkKey), options.map(option => option.artworkKey));
  }
    console.log('PASS all ' + batch.count + ' ECO selections use the real estimate picker handlers, ordered codes, thumbnail keys and record IDs');
  }

}
run().catch(error => { console.error(error); process.exitCode = 1; });
