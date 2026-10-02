const assert = require('node:assert/strict');

module.exports = function register(ctx) {
  const {
    test, load, render, panel, resolved, bars, panels, clipFor,
    assertClippedBars, attrs, tags, PieceDiagram, PieceReportCard, reportPiece, saved,
  } = ctx;
  const {
    FixedWindowShapeDiagram, FIXED_WINDOW_SHAPE_KEYS, getFixedWindowShapeSpec,
  } = load('components/piece-diagram/renderers/fixed/fixed-window-shape-diagram.tsx');
  const {
    CasementWindowDiagram, CasementFixedWindowDiagram,
  } = load('components/piece-diagram/renderers/casement/casement-window-diagram.tsx');
  const { matchMuntinPanels } = load('components/piece-diagram/renderers/muntin-layer.tsx');
  const { resolveMuntinForDiagram } = load('components/piece-diagram/muntin-data.ts');
  const base = {
    frameColorHex: '#443F3B', glassTintHex: '#808080', hasCoating: true,
    hasPrivacy: true, showDimensions: false, idNamespace: 'fixed-casement-fixture',
  };
  const selection = code => [panel(1, 3, 3, 'Center', code)];
  const fullView = code => saved(selection(code), {
    pattern: { name: 'Full View', requiresLites: false },
  });
  const nearly = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);
  const geometry = html => bars(html).map(bar => [bar.x, bar.y, bar.width, bar.height]);
  const rect = item => Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, Number(item[key])]));
  const fixedProps = shape => ({ ...base, shape, ...getFixedWindowShapeSpec(shape).sampleDimensionsInches });
  const casementComponent = configuration => configuration === 'O' ? CasementFixedWindowDiagram : CasementWindowDiagram;
  const casementProps = configuration => ({ ...base, configuration, width: 36, height: 60, screenEnabled: false });

  function assertGrid(html) {
    assert.equal(panels(html).length, 1, 'Exactly one physical glass light must receive the grid');
    assert.equal(bars(html).length, 4, 'Colonial 3 by 3 requires two vertical and two horizontal bars');
    assert.equal(bars(html).filter(bar => bar['data-axis'] === 'vertical').length, 2);
    assertClippedBars(html);
    assert.match(html, /data-muntin-profile="flat"/);
    assert.ok(tags(html, 'stop').some(stop => stop['stop-color'].toUpperCase() === base.frameColorHex));
  }

  function fixedTransform(html) {
    const transform = tags(html, 'g').find(group => /^translate\([^)]*\) scale\(/.test(group.transform ?? ''));
    assert.ok(transform, 'Fixed grid must map inch coordinates to the original artwork');
    const values = transform.transform.match(/^translate\(([-\d.e+]+) ([-\d.e+]+)\) scale\(([-\d.e+]+) ([-\d.e+]+)\)$/);
    assert.ok(values);
    return values.slice(1).map(Number);
  }

  function fixedPieceData(shape) {
    const { width, height, secondaryHeight } = getFixedWindowShapeSpec(shape).sampleDimensionsInches;
    return { width, height, ...(secondaryHeight === undefined ? {} : { legHeight: secondaryHeight }) };
  }

  for (const shape of FIXED_WINDOW_SHAPE_KEYS) {
    test(`Fixed ${shape} clips Colonial to its exact glass mask, preserves O and leaves Full View unchanged`, () => {
      const props = fixedProps(shape);
      const baseline = render(FixedWindowShapeDiagram, props);
      for (const muntin of [null, resolveMuntinForDiagram(fullView('O'))]) {
        assert.equal(render(FixedWindowShapeDiagram, { ...props, muntin }), baseline);
      }
      const html = render(FixedWindowShapeDiagram, { ...props, muntin: resolved(selection('O')) });
      assertGrid(html);
      const spec = getFixedWindowShapeSpec(shape);
      const maskGroup = tags(html, 'g').find(group => group['data-layer'] === 'MUNTIN_GLASS_MASK');
      assert.ok(maskGroup, 'A rectangular panel clip alone cannot bound a shaped light');
      const maskId = maskGroup.mask.slice(5, -1);
      const mask = [...html.matchAll(/<mask\b([^>]*)>([\s\S]*?)<\/mask>/g)]
        .find(match => attrs(match[1]).id === maskId);
      assert.ok(mask);
      const stem = `${String(spec.index).padStart(2, '0')}-${shape.toLowerCase().replaceAll('_', '-')}`;
      assert.ok(tags(mask[2], 'image')[0].href.endsWith(`/masks/${stem}-glass-mask.png`));
      assert.ok(html.indexOf('data-layer="MUNTIN_GLASS_MASK"') < html.indexOf('data-part="muntin-layer"'));
      const gridEnd = html.indexOf('data-layer="FIXED_INDICATOR"');
      assert.ok(gridEnd > html.indexOf('data-part="muntin-layer"'), 'Original O label must remain above the bars');
      const indicator = tags(html, 'g').find(group => group['data-layer'] === 'FIXED_INDICATOR');
      const indicatorClip = clipFor(html, indicator);
      const [left, top, right, bottom] = spec.frameBBox;
      assert.ok(indicatorClip.width > 0 && indicatorClip.width < (right - left) / 10);
      assert.ok(indicatorClip.height > 0 && indicatorClip.height < (bottom - top) / 5);
      assert.equal(tags(html, 'image').filter(image => image.href.endsWith(spec.structuralAsset)).length, 2);
      const indicatorContent = html.slice(gridEnd);
      assert.ok(indicatorContent.includes(spec.structuralAsset), 'Restore the source O glyph, not a replacement symbol');
      assert.match(indicatorContent, /data-layer="GLASS_APPEARANCE"/, 'The small label area must retain the selected glass finish');

      const [tx, ty, sx, sy] = fixedTransform(html);
      nearly(tx, left); nearly(ty, top);
      nearly(sx, (right - left) / props.width);
      nearly(sy, (bottom - top) / props.height);
      for (const bar of bars(html)) {
        nearly(Number(bar[bar['data-axis'] === 'vertical' ? 'width' : 'height']), 1);
      }
      const doubleSize = { ...props, width: props.width * 2, height: props.height * 2 };
      if (props.secondaryHeight !== undefined) doubleSize.secondaryHeight = props.secondaryHeight * 2;
      const large = render(FixedWindowShapeDiagram, { ...doubleSize, muntin: resolved(selection('O')) });
      const [, , largeSx, largeSy] = fixedTransform(large);
      nearly(largeSx, sx / 2); nearly(largeSy, sy / 2);
      const glass = clipFor(html, panels(html)[0]);
      const largeGlass = clipFor(large, panels(large)[0]);
      for (const key of ['x', 'y', 'width', 'height']) nearly(largeGlass[key], glass[key] * 2);
    });
  }

  for (const configuration of ['O', 'XL', 'XR']) {
    test(`Casement ${configuration} renders a clipped one-inch grid below indicators with unchanged Full View`, () => {
      const Component = casementComponent(configuration);
      const code = configuration === 'O' ? 'O' : 'X';
      const props = casementProps(configuration);
      const baseline = render(Component, props);
      for (const muntin of [null, resolveMuntinForDiagram(fullView(code))]) {
        assert.equal(render(Component, { ...props, muntin }), baseline);
      }
      for (const [width, height] of [[36, 60], [72, 120], [60, 36]]) {
        const html = render(Component, { ...props, width, height, muntin: resolved(selection(code)) });
        assertGrid(html);
        const structural = tags(html, 'svg').find(item => item['data-layer'] === 'STRUCTURAL_BASE');
        const scale = Number(structural.width) / width;
        nearly(scale, Number(structural.height) / height);
        for (const bar of bars(html)) nearly(Number(bar[bar['data-axis'] === 'vertical' ? 'width' : 'height']), scale);
        const glass = clipFor(html, panels(html)[0]);
        const actualGlass = rect(tags(html, 'rect').find(item => item['data-glass-effect'] === 'TINT'));
        assert.deepEqual(glass, actualGlass, 'Muntin uses the existing glass appearance geometry');
        if (configuration !== 'O') {
          assert.ok(html.indexOf('data-layer="MOVEMENT_INDICATOR"') > html.indexOf('data-part="muntin-layer"'));
          assert.match(html, new RegExp(`data-arrow-direction="${configuration === 'XL' ? 'LEFT' : 'RIGHT'}"`));
        }
        assert.match(html, /data-screen-rendered="false"/);
      }
    });
  }

  test('Fixed and all casement profiles share geometry while preserving distinct Flat and Ogee shading', () => {
    const cases = FIXED_WINDOW_SHAPE_KEYS.map(shape => [FixedWindowShapeDiagram, fixedProps(shape), 'O'])
      .concat(['O', 'XL', 'XR'].map(configuration => [casementComponent(configuration), casementProps(configuration), configuration === 'O' ? 'O' : 'X']));
    for (const [Component, props, code] of cases) {
      const flat = render(Component, { ...props, muntin: resolved(selection(code)) });
      const ogee = render(Component, { ...props, muntin: resolved(selection(code), 'ogee') });
      assert.deepEqual(geometry(flat), geometry(ogee));
      assert.match(ogee, /data-muntin-profile="ogee"/);
      assert.equal(tags(flat, 'stop').length, 8);
      assert.equal(tags(ogee, 'stop').length, 14);
    }
  });

  const fixtures = FIXED_WINDOW_SHAPE_KEYS.map(shape => ({
    configuration: shape, family: 'FIXED_SHAPE', renderer: 'FIXED_WINDOW_SHAPE',
    spec: { renderer: 'FIXED_WINDOW_SHAPE', shape }, piece: fixedPieceData(shape), code: 'O',
  })).concat(['O', 'XL', 'XR'].map(configuration => ({
    configuration, family: 'CASEMENT', renderer: 'CASEMENT_WINDOW',
    spec: { renderer: 'CASEMENT_WINDOW', configuration }, piece: { width: 36, height: 60 }, code: configuration === 'O' ? 'O' : 'X',
  })));

  test('PieceDiagram forwards every fixed shape and casement grid through editor and report dispatch', () => {
    for (const fixture of fixtures) for (const variant of ['editor', 'report']) {
      const props = { ...base, variant, diagramFamily: fixture.family, configuration: fixture.configuration,
        diagramSpec: fixture.spec, piece: fixture.piece, muntin: resolved(selection(fixture.code)) };
      const html = render(PieceDiagram, props);
      assert.equal(bars(html).length, 4, `${fixture.configuration} ${variant}`);
      assert.match(html, new RegExp(`data-diagram-renderer="${fixture.renderer}"`));
      const cleared = render(PieceDiagram, { ...props,
        piece: { ...fixture.piece, pieceMuntin: saved(selection(fixture.code)) }, muntin: null });
      assert.equal(bars(cleared).length, 0, 'Cleared live selection must not revive a saved grid');
    }
  });

  test('Saved fixed and casement reports retain their grids, Full View and the PDF capture element', () => {
    for (const fixture of fixtures) {
      const piece = { ...reportPiece(), ...fixture.piece,
        prod: { name: fixture.configuration, diagramFamily: fixture.family },
        conf: { conf: fixture.configuration, diagramSpec: fixture.spec },
        pieceMuntin: saved(selection(fixture.code)),
      };
      const before = JSON.stringify(piece);
      const html = render(PieceReportCard, { piece, displayMark: 'F1', showPrices: false });
      assert.equal(bars(html).length, 4, fixture.configuration);
      assert.match(html, /data-piece-diagram-id="123"/);
      assert.equal(JSON.stringify(piece), before);
      const cleared = render(PieceReportCard, { piece: { ...piece, pieceMuntin: fullView(fixture.code) }, displayMark: 'F1', showPrices: false });
      assert.equal(bars(cleared).length, 0, `${fixture.configuration} saved Full View ignores leftover panels`);
    }
  });

  test('One glass light accepts arbitrary catalog labels but rejects an explicit X/O mismatch', () => {
    for (const code of ['X', 'O']) {
      const glass = [{ panelIndex: 1, panelCode: code, panelLabel: 'Center', rect: { x: 0, y: 0, width: 30, height: 50 } }];
      for (const label of ['Left hinge', 'Right Panel', 'Top Bottom', 'Custom catalog description']) {
        assert.equal(matchMuntinPanels(resolved([panel(7, 3, 3, label, code)]), glass).length, 1);
        assert.equal(matchMuntinPanels(resolved([panel(7, 3, 3, label, code === 'X' ? 'O' : 'X')]), glass).length, 0);
      }
    }
  });
};
