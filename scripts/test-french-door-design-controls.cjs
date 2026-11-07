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
    glassTintHex:"#ccddee", onChange:id => selections.push(id) };
  const render = mount(FrenchDoorDesignFields, picker);
  assert.equal(nodes(render(), "FrenchDoorDesignThumbnail").length, 0);
  nodes(render(), "details")[0].props.onToggle({ currentTarget: { open: true } });
  const buttons = nodes(render(), "button");
  assert.equal(buttons[0].props["aria-pressed"], true);
  const thumb = nodes(buttons[1], "FrenchDoorDesignThumbnail")[0].props;
  assert.deepEqual(thumb, { artworkKey:"SD01", frameColorHex:picker.frameColorHex, glassTintHex:picker.glassTintHex });
  buttons[1].props.onClick(); buttons[0].props.onClick(); assert.deepEqual(selections, [10, null]);
  picker.options = []; assert.equal(render(), null);
  picker.selected = single; picker.selectedId = 10; picker.locked = true;
  assert.ok(nodes(render(), "p").some(node => node.props.children === "S-CUSTOM"));
  assert.ok(nodes(render(), "p").some(node => node.props.role === "status"));
  assert.equal(nodes(render(), "button").length, 0);
  console.log("PASS estimate picker uses current materials, allows removing a design and displays a withdrawn selection when reopening");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
