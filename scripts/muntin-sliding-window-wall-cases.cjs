const assert = require('node:assert/strict');

module.exports = function register(ctx) {
  const { test, load, render, panel, resolved, bars, panels, clipFor, assertClippedBars,
    tags, PieceDiagram, PieceReportCard, reportPiece, saved } = ctx;
  const { SlidingGlassDoorDiagram } = load('components/piece-diagram/renderers/sliding-door/sliding-glass-door-diagram.tsx');
  const { SLIDING_GLASS_DOOR_CONFIGURATIONS, resolveSlidingGlassDoorSpec } = load('components/piece-diagram/renderers/sliding-door/sliding-glass-door-spec.ts');
  const { WindowWallDiagram } = load('components/piece-diagram/renderers/window-wall/window-wall-diagram.tsx');
  const slidePanels = spec => spec.glassDlos.map((dlo, i) => panel(dlo.panelIndex + 1, 2 + i % 2, 2 + i % 3, '', dlo.kind));
  const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

  for (const configuration of SLIDING_GLASS_DOOR_CONFIGURATIONS) {
    test(`Sliding ${configuration} maps distinct grids to every catalog glass DLO`, () => {
      const spec = resolveSlidingGlassDoorSpec({ configuration, brandName: 'ECO' });
      assert.ok(spec, `Missing ${configuration}`);
      const selection = slidePanels(spec);
      const html = render(SlidingGlassDoorDiagram, { spec, width: 160, height: 84,
        showDimensions: false, muntin: resolved([...selection].reverse()) });
      const groups = panels(html);
      assert.equal(groups.length, spec.glassDlos.length);
      const [dx, dy, dw, dh] = spec.dimensionBox;
      const baseDlo = spec.glassDlos[0];
      const baseClip = clipFor(html, groups.find(g => g['data-panel-index'] === String(baseDlo.panelIndex + 1)));
      const sx = baseClip.width / baseDlo.width;
      const sy = baseClip.height / baseDlo.height;
      near(sx * dw / 160, sy * dh / 84);
      for (const dlo of spec.glassDlos) {
        const index = dlo.panelIndex + 1;
        const group = groups.find(g => g['data-panel-index'] === String(index));
        const expected = selection.find(p => p.panelIndex === index);
        assert.equal(group['data-horizontal-lites'], String(expected.horizontalLites));
        assert.equal(group['data-vertical-lites'], String(expected.verticalLites));
        const clip = clipFor(html, group);
        near(clip.x - baseClip.x, (dlo.x - baseDlo.x) * sx);
        near(clip.y - baseClip.y, (dlo.y - baseDlo.y) * sy);
        near(clip.width, dlo.width * sx);
        near(clip.height, dlo.height * sy);
        group.bars.forEach(bar => near(Number(bar[bar['data-axis'] === 'vertical' ? 'width' : 'height']), sx * dw / 160));
      }
      assertClippedBars(html);
    });
  }

  test('Sliding Full View is unchanged; indicators and screen remain above the muntin', () => {
    const spec = resolveSlidingGlassDoorSpec({ configuration: 'OX', brandName: 'ECO' });
    const props = { spec, width: 96, height: 84, idNamespace: 'sliding-stable', screenEnabled: true };
    assert.equal(render(SlidingGlassDoorDiagram, props), render(SlidingGlassDoorDiagram, { ...props, muntin: null }));
    const html = render(SlidingGlassDoorDiagram, { ...props, muntin: resolved(slidePanels(spec), 'ogee') });
    const grid = html.indexOf('data-part="muntin-layer"');
    const indicator = html.indexOf('data-layer="SLIDING_DOOR_SOURCE_INDICATORS"');
    assert.ok(grid >= 0 && indicator > grid);
    assert.match(html.slice(indicator), /data-screen/);
    assert.match(html, /data-muntin-profile="ogee"/);
  });

  const wallPanels = () => [panel(1, 2, 3, 'All glass panels', 'O')];
  const wallProps = { width: 120, height: 90, panelCount: 2, horizontalHeights: [30, 60], showDimensions: false };
  const wall = muntin => render(WindowWallDiagram, { ...wallProps, muntin });
  test('Window Wall repeats one H2 V3 setting in all six crystals, clipped away from transoms', () => {
    const html = wall(resolved(wallPanels(), 'ogee'));
    const groups = panels(html);
    assert.equal(groups.length, 6);
    const clips = Array.from({ length: 6 }, (_, index) => {
      const group = groups.find(g => g['data-panel-index'] === String(index + 1));
      assert.equal(group['data-horizontal-lites'], '2');
      assert.equal(group['data-vertical-lites'], '3');
      assert.equal(group.bars.filter(bar => bar['data-axis'] === 'vertical').length, 1);
      assert.equal(group.bars.filter(bar => bar['data-axis'] === 'horizontal').length, 2);
      return clipFor(html, group);
    });
    for (let row = 0; row < 3; row++) {
      const left = clips[row * 2], right = clips[row * 2 + 1];
      assert.ok(left.x + left.width < right.x);
      near(left.y, right.y);
      if (row < 2) assert.ok(left.y + left.height < clips[(row + 1) * 2].y, 'Transoms must remain free of bars');
    }
    assertClippedBars(html);
  });
  test('Window Wall older expanded uniform grids retain their shared setting regardless of saved positions', () => {
    const selection = Array.from({ length: 6 }, (_, index) => panel(index + 1, 2, 3, `Panel ${index + 1}`, `R${Math.floor(index / 2) + 1}C${index % 2 + 1}`));
    const html = wall(resolved(selection.reverse()));
    assert.equal(panels(html).length, 6);
    assertClippedBars(html);
    assert.equal(bars(html).length, 18);
  });
  test('Window Wall differing old settings are left for explicit reconfiguration instead of choosing one', () => {
    for (const selection of [
      [panel(1, 2, 3), panel(2, 3, 3)],
      [panel(1, 2, 3), panel(2, 2, 4)],
    ]) {
      const html = wall(resolved(selection));
      assert.equal(bars(html).length, 0);
      assert.match(html, /data-family="WINDOW_WALL/);
    }
  });
  test('Window Wall Full View keeps the same structure including horizontal transoms', () => {
    assert.equal(wall(null), wall(undefined));
    assert.equal(bars(wall(null)).length, 0);
  });
  test('Window Wall without transoms repeats the single setting across left, center and right glass', () => {
    const html = render(WindowWallDiagram, { ...wallProps, panelCount: 3, horizontalHeights: [],
      muntin: resolved(wallPanels()) });
    assert.equal(panels(html).length, 3);
    assert.equal(bars(html).length, 9);
    assertClippedBars(html);
  });
  test('Window Wall retains the same divisions when adding panels or horizontal cuts', () => {
    const selection = resolved(wallPanels());
    for (const [panelCount, horizontalHeights] of [[1, []], [1, [30]], [2, [30, 60]], [3, [30, 60]]]) {
      const html = render(WindowWallDiagram, { ...wallProps, panelCount, horizontalHeights, muntin: selection });
      assert.equal(panels(html).length, panelCount * (horizontalHeights.length + 1));
      for (const group of panels(html)) {
        assert.equal(group['data-horizontal-lites'], '2');
        assert.equal(group['data-vertical-lites'], '3');
      }
      assertClippedBars(html);
    }
  });

  for (const family of ['SLIDING_DOOR', 'WINDOW_WALL']) {
    test(`${family} editor dispatcher and saved report keep grids and PDF capture target`, () => {
      const isWall = family === 'WINDOW_WALL';
      const configuration = isWall ? 'OO' : 'O-XX';
      const selection = isWall ? wallPanels() : slidePanels(resolveSlidingGlassDoorSpec({ configuration, brandName: 'ECO' }));
      const dimensions = isWall ? wallProps : { width: 120, height: 84 };
      const shared = { diagramFamily: family, configuration, brandName: 'ECO', systemName: isWall ? 'Window Wall' : 'Serie 350',
        dimensionMode: isWall ? 'WINDOW_WALL' : 'STANDARD' };
      const editor = render(PieceDiagram, { ...shared, piece: dimensions, muntin: resolved(selection) });
      const piece = { ...reportPiece(), ...dimensions, prod: { name: family, diagramFamily: family },
        bran: { name: 'ECO' }, syst: { name: shared.systemName }, conf: { conf: configuration },
        diagramMetadata: { dimensionMode: shared.dimensionMode }, pieceMuntin: saved(selection) };
      const report = render(PieceReportCard, { piece, displayMark: 'Grid', showPrices: false });
      for (const html of [editor, report]) assert.equal(panels(html).length, isWall ? 6 : selection.length);
      assert.match(report, /data-piece-diagram-id="123"/);
      assert.doesNotMatch(report, /Unit Price/);
    });
  }
};
