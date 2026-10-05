const assert = require('node:assert/strict');
const React = require('react');

module.exports = function register(ctx) {
  const { test, load, render, panel, resolved, bars, panels, clipFor, assertClippedBars,
    tags, PieceDiagram, PieceReportCard, reportPiece, saved } = ctx;
  const { SlidingGlassDoorDiagram } = load('components/piece-diagram/renderers/sliding-door/sliding-glass-door-diagram.tsx');
  const { SLIDING_GLASS_DOOR_CONFIGURATIONS, resolveSlidingGlassDoorSpec } = load('components/piece-diagram/renderers/sliding-door/sliding-glass-door-spec.ts');
  const { WindowWallDiagram } = load('components/piece-diagram/renderers/window-wall/window-wall-diagram.tsx');
  const { resolveSlidingGlassDoorLayout } = load('components/piece-diagram/renderers/sliding-door/sliding-glass-door-layout.ts');
  const slidePanels = spec => spec.glassDlos.map((dlo, i) => panel(dlo.panelIndex + 1, 2 + i % 2, 2 + i % 3, '', dlo.kind));
  const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
  const rect = value => Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, Number(value[key])]));
  const tuple = ([x, y, width, height]) => ({ x, y, width, height });
  const contains = (outer, inner) => inner.x >= outer.x - 1e-7 && inner.y >= outer.y - 1e-7
    && inner.x + inner.width <= outer.x + outer.width + 1e-7
    && inner.y + inner.height <= outer.y + outer.height + 1e-7;
  function structureSlices(html) {
    // Muntin indicators reuse the same slices later. Inspect the structure copy.
    const structure = html.slice(html.indexOf('data-layer="C139_SCREEN_OFF_STRUCTURE"'),
      html.indexOf('data-layer="SLIDING_DOOR_FINAL_GLASS"'));
    return tags(structure, 'svg').filter(item => item['data-source-slice'] !== undefined)
      .map(item => ({ source: tuple(item.viewBox.split(' ').map(Number)), target: rect(item) }));
  }
  function mappedPoint(slices, x, y) {
    const slice = slices.find(({ source }) => x >= source.x - 1e-7 && x <= source.x + source.width + 1e-7
      && y >= source.y - 1e-7 && y <= source.y + source.height + 1e-7);
    assert.ok(slice, `Source image does not cover ${x},${y}`);
    return { x: slice.target.x + (x - slice.source.x) * slice.target.width / slice.source.width,
      y: slice.target.y + (y - slice.source.y) * slice.target.height / slice.source.height };
  }
  function mappedRect(slices, source) {
    const start = mappedPoint(slices, source.x, source.y);
    const end = mappedPoint(slices, source.x + source.width, source.y + source.height);
    return { ...start, width: end.x - start.x, height: end.y - start.y };
  }
  const sameRect = (actual, expected) => ['x', 'y', 'width', 'height'].forEach(key => near(actual[key], expected[key]));

  for (const brandName of ['ECO', 'NOVO']) for (const configuration of SLIDING_GLASS_DOOR_CONFIGURATIONS) {
    test(`Sliding ${brandName} ${configuration} aligns source slices, glass, grids and screen`, () => {
      const spec = resolveSlidingGlassDoorSpec({ configuration, brandName });
      assert.ok(spec, `Missing ${configuration}`);
      const selection = slidePanels(spec);
      const html = render(SlidingGlassDoorDiagram, { spec, width: 160, height: 84,
        screenEnabled: true, glassTintHex: '#91A4AF', showDimensions: true,
        muntin: resolved([...selection].reverse()) });
      const groups = panels(html);
      assert.equal(groups.length, spec.glassDlos.length);
      const layout = tags(html, 'g').find(g => g['data-layer'] === 'SLIDING_DOOR_LAYOUT');
      assert.ok(layout);
      const frame = Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, Number(layout[`data-frame-${key}`])]));
      const unitsPerInch = Number(layout['data-units-per-inch']);
      near(frame.width / 160, unitsPerInch); near(frame.height / 84, unitsPerInch);
      const dimensionLines = tags(html, 'line').filter(line => line['marker-start'] && line['marker-end']);
      assert.equal(dimensionLines.length, 2);
      near(Number(dimensionLines[0].x2) - Number(dimensionLines[0].x1), frame.width);
      near(Number(dimensionLines[1].y2) - Number(dimensionLines[1].y1), frame.height);
      const finalGlass = tags(html, 'rect').filter(item => item['data-panel-index']);
      const tintedGlass = tags(html, 'rect').filter(item => item['data-glass-effect'] === 'TINT');
      const slices = structureSlices(html);
      assert.ok(slices.length > 0);
      near(slices.reduce((area, slice) => area + slice.source.width * slice.source.height, 0),
        spec.structuralAssetPlacementBox[2] * spec.structuralAssetPlacementBox[3]);
      for (const slice of slices) {
        assert.ok(slice.source.width > 0 && slice.source.height > 0 && slice.target.width > 0 && slice.target.height > 0);
        assert.ok(Object.values(slice.target).every(Number.isFinite));
      }
      assert.equal(finalGlass.length, spec.glassDlos.length); assert.equal(tintedGlass.length, spec.glassDlos.length);
      let previous;
      for (const dlo of spec.glassDlos) {
        const index = dlo.panelIndex + 1;
        const group = groups.find(g => g['data-panel-index'] === String(index));
        const expected = selection.find(p => p.panelIndex === index);
        assert.equal(group['data-horizontal-lites'], String(expected.horizontalLites));
        assert.equal(group['data-vertical-lites'], String(expected.verticalLites));
        const clip = clipFor(html, group);
        const glass = finalGlass.find(item => item['data-panel-index'] === String(index));
        assert.equal(glass['data-panel-code'], dlo.kind); assert.equal(glass['data-direction'], dlo.direction);
        sameRect(clip, rect(glass)); sameRect(clip, mappedRect(slices, dlo));
        sameRect(clip, rect(tintedGlass[spec.glassDlos.indexOf(dlo)]));
        assert.ok(contains(frame, clip)); assert.ok(clip.width > 0 && clip.height > 0);
        if (previous) assert.ok(previous.x + previous.width < clip.x, 'Exterior panel order and separating profiles');
        previous = clip;
        group.bars.forEach(bar => near(Number(bar[bar['data-axis'] === 'vertical' ? 'width' : 'height']), unitsPerInch));
      }
      const meshes = tags(html, 'rect').filter(item => item['data-screen-part'] === 'MESH');
      const visible = tags(html, 'svg')[0]['data-screen-visible'] === 'true';
      assert.equal(meshes.length, visible ? spec.screenPanels.length : 0);
      meshes.forEach((mesh, index) => {
        const source = spec.screenPanels[index];
        sameRect(rect(mesh), mappedRect(slices, source.mesh));
        const screenGroup = tags(html, 'g').find(g => g['data-screen-panel'] === String(index));
        const outer = clipFor(html, screenGroup);
        sameRect(outer, mappedRect(slices, source.outer));
        assert.ok(contains(outer, rect(mesh)));
        assert.equal(spec.glassDlos.find(dlo => dlo.panelIndex === source.panelIndex).kind, 'X');
        assert.ok(rect(mesh).x > outer.x && rect(mesh).y > outer.y, 'Positive screen rails');
      });
      assertClippedBars(html);
    });
  }

  test('Sliding narrow multi-panel doors retain visibly wider profiles without changing the opening size', () => {
    for (const brandName of ['ECO', 'NOVO']) {
      const spec = resolveSlidingGlassDoorSpec({ configuration: 'OXX-XXO', brandName });
      const html = render(SlidingGlassDoorDiagram, { spec, width: 90, height: 80, showDimensions: false });
      const glass = tags(html, 'rect').filter(item => item['data-panel-index']).map(rect);
      const layout = tags(html, 'g').find(g => g['data-layer'] === 'SLIDING_DOOR_LAYOUT');
      const scale = Number(layout['data-units-per-inch']);
      const sourceGap = spec.glassDlos[1].x - spec.glassDlos[0].x - spec.glassDlos[0].width;
      const oldGapInches = sourceGap / spec.dimensionBox[2] * 90;
      const newGapInches = (glass[1].x - glass[0].x - glass[0].width) / scale;
      assert.ok(newGapInches > oldGapInches * 1.5, 'Profiles must improve perceptibly beyond the stretched PNG');
      near(Number(layout['data-frame-width']) / scale, 90); near(Number(layout['data-frame-height']) / scale, 80);
    }
  });

  test('Sliding narrow OX-XO keeps both screens aligned under the actual profile remapping', () => {
    for (const brandName of ['ECO', 'NOVO']) {
      const spec = resolveSlidingGlassDoorSpec({ configuration: 'OX-XO', brandName });
      const html = render(SlidingGlassDoorDiagram, { spec, width: 110, height: 80,
        screenEnabled: true, muntin: resolved(slidePanels(spec)), showDimensions: false });
      const layout = tags(html, 'g').find(g => g['data-layer'] === 'SLIDING_DOOR_LAYOUT');
      assert.equal(layout['data-profile-layout'], 'MULTI_SLICE');
      const slices = structureSlices(html);
      assert.ok(slices.length > 1);
      const meshes = tags(html, 'rect').filter(item => item['data-screen-part'] === 'MESH');
      assert.equal(meshes.length, 2);
      for (let index = 0; index < meshes.length; index++) {
        const source = spec.screenPanels[index];
        const mesh = rect(meshes[index]);
        const screenGroup = tags(html, 'g').find(g => g['data-screen-panel'] === String(index));
        const outer = clipFor(html, screenGroup);
        sameRect(mesh, mappedRect(slices, source.mesh));
        sameRect(outer, mappedRect(slices, source.outer));
        const glass = clipFor(html, panels(html).find(group => group['data-panel-index'] === String(source.panelIndex + 1)));
        assert.ok(contains(outer, mesh) && contains(mesh, glass));
        near(mesh.x - outer.x, outer.x + outer.width - mesh.x - mesh.width);
        near(mesh.y - outer.y, outer.y + outer.height - mesh.y - mesh.height);
      }
      assert.ok(html.indexOf('data-layer="SCREEN"') > html.indexOf('data-layer="SLIDING_DOOR_SOURCE_INDICATORS"'));
      assertClippedBars(html);
    }
  });

  test('Sliding profile thickness varies continuously as the opening width changes', () => {
    for (const configuration of ['OXX-XXO', 'XXXX-XXXX', 'PXX-XXP']) {
      const spec = resolveSlidingGlassDoorSpec({ configuration, brandName: 'ECO' });
      let previous;
      for (let width = 60; width <= 260; width += 0.25) {
        const output = resolveSlidingGlassDoorLayout({ dimension: tuple(spec.dimensionBox),
          asset: tuple(spec.structuralAssetPlacementBox), product: { x: 0, y: 0, width, height: 80 }, glass: spec.glassDlos });
        const first = output.mapRect(spec.glassDlos[0]), second = output.mapRect(spec.glassDlos[1]);
        const gap = second.x - first.x - first.width;
        assert.ok(Number.isFinite(gap) && gap > 0);
        if (previous !== undefined) assert.ok(Math.abs(gap - previous) < 0.05, `${configuration} jumps at width ${width}`);
        previous = gap;
      }
    }
  });

  test('Sliding sliced structure retains custom assets and local unique IDs across repeated diagrams', () => {
    const spec = resolveSlidingGlassDoorSpec({ configuration: 'PXX-XXP', brandName: 'NOVO' });
    const props = { spec, width: 90, height: 80, screenEnabled: false, showDimensions: false,
      assetBasePath: '/custom/sliding/', idNamespace: 'same-requested-id', muntin: resolved(slidePanels(spec)) };
    const html = render('div', { children: [React.createElement(SlidingGlassDoorDiagram, { ...props, key: 'a' }),
      React.createElement(SlidingGlassDoorDiagram, { ...props, key: 'b' })] });
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length);
    const images = tags(html, 'image'); assert.equal(images.length, 2);
    images.forEach(image => assert.equal(image.href, `/custom/sliding/${spec.structuralAsset}`));
    for (const use of tags(html, 'use')) assert.ok(ids.includes(use.href.slice(1)), 'Source slice points to an existing image');
    const source = structureSlices(html);
    const dimension = tuple(spec.dimensionBox), asset = tuple(spec.structuralAssetPlacementBox);
    assert.ok(Math.min(...source.map(slice => slice.source.x)) < dimension.x);
    assert.ok(Math.max(...source.map(slice => slice.source.x + slice.source.width)) > dimension.x + dimension.width);
    near(source.reduce((area, slice) => area + slice.source.width * slice.source.height, 0), asset.width * asset.height);
    assertClippedBars(html);
  });

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
