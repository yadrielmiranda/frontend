const assert = require('node:assert/strict');

module.exports = function register({ test, load, render, tags, attrs }) {
  const { PieceDiagram: FrenchDoor, Series600MixedAssemblyDiagram: MixedDoor } = load('components/piece-diagram/renderers/french-door/series-600-door-diagram.tsx');
  const { HorizontalRollingWindowDiagram: HR } = load('components/piece-diagram/renderers/horizontal-rolling/horizontal-rolling-window-diagram.tsx');
  const { SingleHungWindowDiagram: SH } = load('components/piece-diagram/renderers/single-hung/single-hung-window-diagram.tsx');
  const { SlidingGlassDoorDiagram: Sliding } = load('components/piece-diagram/renderers/sliding-door/sliding-glass-door-diagram.tsx');
  const { resolveSlidingGlassDoorSpec } = load('components/piece-diagram/renderers/sliding-door/sliding-glass-door-spec.ts');
  const { WindowWallDiagram: WW } = load('components/piece-diagram/renderers/window-wall/window-wall-diagram.tsx');
  const { CasementWindowDiagram: Casement, CasementFixedWindowDiagram: FixedCasement } = load('components/piece-diagram/renderers/casement/casement-window-diagram.tsx');
  const { FixedWindowShapeDiagram: Fixed, FIXED_WINDOW_SHAPE_KEYS, getFixedWindowShapeSpec } = load('components/piece-diagram/renderers/fixed/fixed-window-shape-diagram.tsx');
  const { VerticalDimensionText } = load('components/piece-diagram/renderers/dimension-text.tsx');
  const examples = [
    ['French single', FrenchDoor, { configuration: 'X', visualTemplate: 'ECO_SERIES_600_X_EXTERIOR', piece: { width: 38, height: 96 } }],
    ['French mixed', MixedDoor, { configuration: 'XO', pieces: [{ kind: 'X', width: 38, height: 96, exteriorHingeSide: 'left' }, { kind: 'O', width: 18, height: 96 }] }],
    ['Horizontal Rolling', HR, { configuration: 'OX', width: 72, height: 36 }],
    ['Single Hung', SH, { configuration: 'EQUAL_LITES', width: 38, height: 70 }],
    ['SH/FIX', SH, { configuration: 'SH_OVER_FIX_EQUAL_LITES', width: 38, height: 70, windowHeight: 50 }],
    ['Sliding', Sliding, { spec: resolveSlidingGlassDoorSpec({ configuration: 'OXX-XXO', brandName: 'ECO' }), width: 150, height: 80 }],
    ['Window Wall', WW, { width: 100, height: 90, panelCount: 3, horizontalHeights: [30, 60] }],
    ['Casement', Casement, { configuration: 'XL', width: 36, height: 60 }],
    ['Fixed Casement', FixedCasement, { configuration: 'O', width: 36, height: 60 }],
    ...FIXED_WINDOW_SHAPE_KEYS.map(shape => [`Fixed ${shape}`, Fixed, { shape, ...getFixedWindowShapeSpec(shape).sampleDimensionsInches }]),
  ];
  for (const [name, Component, props] of examples) test(`${name} keeps widths horizontal and all height dimensions vertical`, () => {
    const html = render(Component, { ...props, screenEnabled: false, showDimensions: true });
    const texts = [...html.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)]
      .map(match => ({ ...attrs(match[1]), text: match[2] })).filter(item => item['data-screen-font-size']);
    const widths = texts.filter(item => /^W/.test(item.text));
    const heights = texts.filter(item => /^H/.test(item.text));
    assert.ok(widths.length > 0 && heights.length > 0, 'Both dimensions must remain present');
    widths.forEach(item => assert.equal(item.transform, undefined));
    heights.forEach(item => {
      assert.equal(item['data-dimension-orientation'], 'vertical');
      assert.equal(item.transform, `rotate(-90 ${item.x} ${item.y})`);
      assert.equal(item['text-anchor'], 'middle');
    });
    const hidden = render(Component, { ...props, screenEnabled: false, showDimensions: false });
    assert.equal(tags(hidden, 'text').filter(item => item['data-screen-font-size']).length, 0);
  });

  test('Both sides use the same centered vertical measurement style', () => {
    for (const side of ['left', 'right']) {
      const [label] = tags(render(VerticalDimensionText, { x: 10, y: 50, side, fallbackFontSize: 8, children: 'H. 116"' }), 'text');
      assert.equal(label.transform, 'rotate(-90 10 50)');
      assert.equal(label['text-anchor'], 'middle');
      assert.equal(label['data-screen-font-size'], '20');
    }
  });
};
