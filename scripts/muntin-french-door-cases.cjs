const assert = require('node:assert/strict');

module.exports = function register(ctx) {
  const {
    test, load, render, panel, resolved, bars, panels, clipFor,
    assertClippedBars, attrs, tags, PieceDiagram, PieceReportCard, reportPiece, saved,
  } = ctx;
  const {
    PieceDiagram: FrenchDoor,
    Series600MixedAssemblyDiagram: MixedDoor,
  } = load('components/piece-diagram/renderers/french-door/series-600-door-diagram.tsx');
  const { resolveMuntinForDiagram } = load('components/piece-diagram/muntin-data.ts');
  const base = {
    frameColorHex: '#2468AC', glassTintHex: '#345678', hasCoating: true,
    showDimensions: false, idNamespace: 'french-muntin-fixture',
  };
  const templates = {
    X: 'ECO_SERIES_600_X_EXTERIOR',
    XX: 'ECO_SERIES_600_XX_EXTERIOR',
    O: 'ECO_SERIES_600_O_SIDELITE_EXTERIOR',
  };
  const standalone = (configuration, extra = {}) => ({
    ...base, configuration, visualTemplate: templates[configuration],
    piece: { width: configuration === 'XX' ? 72 : configuration === 'O' ? 18 : 36, height: 80 },
    ...extra,
  });
  const onePanel = kind => [panel(1, 2, 3, 'Glass', kind)];
  const twoPanels = () => [panel(1, 2, 3, 'Left', 'X'), panel(2, 3, 2, 'Right', 'X')];
  const mixedCases = [
    { configuration: 'OXXO', kinds: ['O', 'XX', 'O'], codes: ['O', 'X', 'X', 'O'], counts: [[1, 3], [2, 2], [3, 2], [2, 4]] },
    { configuration: 'OOXXOO', kinds: ['O', 'O', 'XX', 'O', 'O'], codes: ['O', 'O', 'X', 'X', 'O', 'O'], counts: [[1, 3], [2, 2], [3, 2], [2, 4], [1, 2], [2, 3]] },
  ];
  const mixedProps = item => ({
    ...base, configuration: item.configuration,
    pieces: item.kinds.map(kind => kind === 'XX'
      ? { kind, width: 72, height: 80, activeLeaf: 'right', boreCount: 3 }
      : { kind, width: 18, height: 80 }),
  });
  const mixedPanels = item => item.codes.map((code, index) => panel(
    index + 1, ...item.counts[index],
    index === 0 ? 'Left' : index === item.codes.length - 1 ? 'Right' : `Panel ${index + 1}`, code,
  ));
  const sortedGroups = html => panels(html).sort((a, b) => Number(a['data-panel-index']) - Number(b['data-panel-index']));
  const rectOf = rect => Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, Number(rect[key])]));
  const nearly = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

  function checkGrid(html, counts) {
    const groups = sortedGroups(html);
    assert.equal(groups.length, counts.length, 'Every physical glass light must receive its own grid');
    assert.equal(new Set(groups.map(group => group['data-panel-index'])).size, counts.length);
    assert.equal(new Set(groups.map(group => group['clip-path'])).size, counts.length);
    groups.forEach((group, index) => {
      const [horizontal, vertical] = counts[index];
      assert.equal(group['data-panel-index'], String(index + 1));
      assert.equal(group['data-horizontal-lites'], String(horizontal));
      assert.equal(group['data-vertical-lites'], String(vertical));
      assert.equal(group.bars.filter(bar => bar['data-axis'] === 'vertical').length, horizontal - 1);
      assert.equal(group.bars.filter(bar => bar['data-axis'] === 'horizontal').length, vertical - 1);
    });
    assert.equal(bars(html).length, counts.reduce((sum, [h, v]) => sum + h + v - 2, 0));
    assertClippedBars(html);
    return groups;
  }

  function checkActualGlassClips(html, groups) {
    // The existing movement layer already clips to the real glass, including
    // mirrored doors and the mixed assembly's translated/overlapped sections.
    // Compare rendered SVG coordinates instead of rebuilding renderer geometry.
    const movementClips = [...html.matchAll(/<clipPath\b([^>]*)>([\s\S]*?)<\/clipPath>/g)]
      .filter(match => /-door-\d+-clip$/.test(attrs(match[1]).id ?? ''))
      .map(match => rectOf(tags(match[2], 'rect')[0]))
      .sort((a, b) => a.x - b.x);
    const gridClips = groups.map(group => clipFor(html, group)).sort((a, b) => a.x - b.x);
    assert.equal(movementClips.length, groups.length, 'Existing indicators must describe the same glass lights');
    gridClips.forEach((clip, index) => {
      for (const key of ['x', 'y', 'width', 'height']) nearly(clip[key], movementClips[index][key]);
      if (index) assert.ok(gridClips[index - 1].x + gridClips[index - 1].width < clip.x, 'Door stiles and mullions remain outside every grid');
    });
    const ids = [...html.matchAll(/\bid="([^"]*)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, 'Clip and gradient IDs must be unique within the diagram');
  }

  for (const hinge of ['left', 'right']) test(`French Door X ${hinge} hinge clips Colonial to its mirrored glass`, () => {
    const html = render(FrenchDoor, standalone('X', { exteriorHingeSide: hinge, muntin: resolved(onePanel('X')) }));
    checkActualGlassClips(html, checkGrid(html, [[2, 3]]));
    assert.match(html, new RegExp(`data-hinge-side="${hinge}"`));
    assert.equal((html.match(/scale\(-1 1\)/g) ?? []).length, hinge === 'left' ? 1 : 0);
    assert.equal(tags(html, 'g').filter(group => group['data-indicator-panel'] === 'X').length, 1);
  });

  test('French Door standalone O keeps its sidelite glass and fixed indicator', () => {
    const html = render(FrenchDoor, standalone('O', { muntin: resolved(onePanel('O'), 'ogee') }));
    checkActualGlassClips(html, checkGrid(html, [[2, 3]]));
    assert.match(html, /data-product-role="SIDELITE"/);
    assert.match(html, /data-muntin-profile="ogee"/);
    assert.equal(tags(html, 'g').filter(group => group['data-indicator-panel'] === 'O').length, 1);
  });

  for (const activeLeaf of ['left', 'right']) for (const boreCount of [2, 3]) {
    test(`French Door XX ${activeLeaf} active ${boreCount}-bore keeps independent leaf grids and hardware`, () => {
      const html = render(FrenchDoor, standalone('XX', {
        activeLeaf, boreCount, muntin: resolved(twoPanels().reverse(), 'ogee'),
      }));
      const groups = checkGrid(html, [[2, 3], [3, 2]]);
      checkActualGlassClips(html, groups);
      assert.ok(clipFor(html, groups[0]).x < clipFor(html, groups[1]).x);
      const structure = tags(html, 'g').find(group => group['data-structure-id']);
      assert.equal(structure['data-active-leaf'], activeLeaf);
      assert.equal(structure['data-bore-count'], String(boreCount));
      const active = tags(html, 'g').find(group => group['data-indicator-role'] === 'ACTIVE');
      const secondary = tags(html, 'g').find(group => group['data-indicator-role'] === 'SECONDARY');
      assert.equal(active['data-hinge-side'], activeLeaf);
      assert.equal(active['data-show-arrow'], 'true');
      assert.equal(secondary['data-show-arrow'], 'false');
    });
  }

  for (const item of mixedCases) test(`French Door ${item.configuration} maps all ${item.codes.length} glass lights from shuffled saved panels`, () => {
    const selection = mixedPanels(item);
    const html = render(MixedDoor, { ...mixedProps(item), muntin: resolved([...selection].reverse(), 'ogee') });
    const groups = checkGrid(html, item.counts);
    checkActualGlassClips(html, groups);
    const clips = groups.map(group => clipFor(html, group));
    clips.forEach((clip, index) => { if (index) assert.ok(clips[index - 1].x < clip.x); });
    assert.equal(tags(html, 'g').filter(group => group['data-part'] === 'muntin-layer').length, 1, 'Mixed assemblies use one complete mapping, not duplicate per-section grids');
    assert.equal(tags(html, 'image').filter(image => image['data-layer'] === 'FRENCH_DOOR_STRUCTURE').length, item.kinds.length);
    assert.equal(tags(html, 'g').filter(group => group['data-indicator-panel']).length, item.codes.length);
  });

  test('French Door Full View, null and missing muntin remain clear in standalone and mixed assemblies', () => {
    const fullView = resolveMuntinForDiagram(saved(mixedPanels(mixedCases[0]), {
      pattern: { name: 'Full View', requiresLites: false },
    }));
    assert.equal(fullView, null);
    for (const muntin of [undefined, null, fullView]) {
      for (const configuration of ['X', 'XX', 'O']) {
        const html = render(FrenchDoor, standalone(configuration, { muntin }));
        assert.equal(bars(html).length, 0);
        assert.match(html, /data-layer="FRENCH_DOOR_STRUCTURE"/);
      }
      assert.equal(bars(render(MixedDoor, { ...mixedProps(mixedCases[0]), muntin })).length, 0);
    }
  });

  test('French Door mixed layouts omit incomplete or conflicting grids while retaining the whole assembly', () => {
    const item = mixedCases[1];
    const selection = mixedPanels(item);
    for (const invalid of [selection.slice(0, -1), selection.map((entry, index) => index === 2 ? { ...entry, panelCode: 'O' } : entry)]) {
      const html = render(MixedDoor, { ...mixedProps(item), muntin: resolved(invalid) });
      assert.equal(bars(html).length, 0);
      assert.equal(tags(html, 'image').filter(image => image['data-layer'] === 'FRENCH_DOOR_STRUCTURE').length, item.kinds.length);
      assert.equal(tags(html, 'g').filter(group => group['data-indicator-panel']).length, item.codes.length);
    }
  });

  test('French Door bars remain exactly one physical inch at different door dimensions', () => {
    for (const [width, height] of [[36, 80], [48, 96], [72, 160]]) {
      const html = render(FrenchDoor, standalone('X', { piece: { width, height }, muntin: resolved(onePanel('X')) }));
      checkGrid(html, [[2, 3]]);
      for (const bar of bars(html)) nearly(Number(bar[bar['data-axis'] === 'vertical' ? 'width' : 'height']), 1);
      checkActualGlassClips(html, panels(html));
    }
  });

  test('French Door muntins preserve structural assets, hardware, dimensions and movement paths', () => {
    const examples = [
      [FrenchDoor, standalone('X', { exteriorHingeSide: 'left' }), onePanel('X')],
      [FrenchDoor, standalone('XX', { activeLeaf: 'right', boreCount: 3 }), twoPanels()],
      [FrenchDoor, standalone('O'), onePanel('O')],
      [MixedDoor, mixedProps(mixedCases[0]), mixedPanels(mixedCases[0])],
    ];
    for (const [Component, props, selection] of examples) {
      const baseline = render(Component, { ...props, showDimensions: true });
      const html = render(Component, { ...props, showDimensions: true, muntin: resolved(selection) });
      assert.ok(bars(html).length > 0);
      assert.deepEqual(tags(html, 'image'), tags(baseline, 'image'), 'Raster structures with hardware and thresholds are unchanged');
      assert.deepEqual(tags(html, 'path'), tags(baseline, 'path'), 'Movement, frame tint and dimension paths are unchanged');
      const indicators = source => tags(source, 'g').filter(group => group['data-indicator-panel']);
      assert.deepEqual(indicators(html), indicators(baseline));
      assert.match(html, /data-layer="FRENCH_DOOR_DIMENSIONS"/);
      assert.ok(html.indexOf('data-part="muntin-layer"') < html.indexOf('data-indicator-family="SERIE_600"'), 'Movement stays above the grids');
    }
  });

  test('French Door dispatcher forwards live grids to standalone and mixed templates in both variants', () => {
    for (const variant of ['editor', 'report']) for (const configuration of ['X', 'OXXO']) {
      const selection = configuration === 'X' ? onePanel('X') : mixedPanels(mixedCases[0]);
      const html = render(PieceDiagram, {
        diagramFamily: 'FRENCH_DOOR', systemName: 'Serie 600', configuration, variant,
        activeOptionName: 'Left Active', preparationOptionName: '2 Holes', showDimensions: false,
        piece: configuration === 'X' ? { width: '36', height: '80' }
          : { width: '108', height: '80', doorWidth: '72', leftSideliteWidth: '18', rightSideliteWidth: '18' },
        muntin: resolved(selection),
      });
      assert.match(html, /data-diagram-renderer="SERIES_600_SHARED"/);
      checkGrid(html, configuration === 'X' ? [[2, 3]] : mixedCases[0].counts);
    }
  });

  const doorReport = pieceMuntin => ({
    ...reportPiece(), width: '108', height: '80', doorWidth: '72', leftSideliteWidth: '18', rightSideliteWidth: '18',
    prod: { name: 'French Door', diagramFamily: 'FRENCH_DOOR' }, syst: { name: 'Serie 600' },
    conf: { conf: 'OXXO', diagramSpec: null }, activeOption: { name: 'Right Active' },
    preparationOption: { name: '3 Holes' }, pieceMuntin,
  });
  test('Saved French Door report includes every mixed grid and preserves the PDF capture element', () => {
    const piece = doorReport(saved(mixedPanels(mixedCases[0]).reverse()));
    const before = JSON.stringify(piece);
    const html = render(PieceReportCard, { piece, displayMark: 'FD1', showPrices: false });
    checkActualGlassClips(html, checkGrid(html, mixedCases[0].counts));
    assert.match(html, /data-diagram-renderer="SERIES_600_SHARED"/);
    assert.match(html, /data-piece-diagram-id="123"/);
    assert.match(html, /Colonial/);
    assert.equal(JSON.stringify(piece), before, 'Rendering never mutates the saved piece');
  });

  test('Saved French Door Full View report ignores leftover panel counts without losing PDF capture', () => {
    const fullView = saved(mixedPanels(mixedCases[0]), { pattern: { name: 'Full View', requiresLites: false } });
    for (const pieceMuntin of [null, fullView]) {
      const html = render(PieceReportCard, { piece: doorReport(pieceMuntin), displayMark: 'FD1', showPrices: false });
      assert.equal(bars(html).length, 0);
      assert.match(html, /data-diagram-renderer="SERIES_600_SHARED"/);
      assert.match(html, /data-piece-diagram-id="123"/);
    }
  });

  test('French Door dimensions fit all four clipped preview edges after screen font sizing', () => {
    const {
      DIMENSION_SCREEN_FONT_SIZE_PX, DIMENSION_LABEL_ABOVE_LINE_PX,
      DIMENSION_LABEL_BELOW_LINE_PX, DIMENSION_LABEL_OUTWARD_GAP_PX,
    } = load('components/piece-diagram/renderers/dimension-text.tsx');
    const examples = [
      { configuration: 'XO', pieces: [{ kind: 'X', width: 39, height: 80, exteriorHingeSide: 'left' }, { kind: 'O', width: 16, height: 80 }] },
      { configuration: 'OX', pieces: [{ kind: 'O', width: 16, height: 80 }, { kind: 'X', width: 39, height: 80, exteriorHingeSide: 'right' }] },
      { configuration: 'OX', pieces: [{ kind: 'O', width: 14, height: 80 }, { kind: 'X', width: 41, height: 80, exteriorHingeSide: 'right' }] },
      { configuration: 'XO', pieces: [{ kind: 'X', width: 39.375, height: 120.125, exteriorHingeSide: 'left' }, { kind: 'O', width: 16.5, height: 120.125 }] },
      mixedProps(mixedCases[0]),
      mixedProps(mixedCases[1]),
    ];
    for (const example of examples) for (const variant of ['editor', 'report']) {
      const html = render(MixedDoor, { ...example, showDimensions: true, variant });
      const container = tags(html, 'div').find(item => item['data-diagram-family'] === 'FRENCH_DOOR');
      const padding = Object.fromEntries(['top', 'bottom', 'left', 'right'].map(side =>
        [side, Number(new RegExp(`(?:^|;)padding-${side}:([\\d.]+)px`).exec(container.style)?.[1] ?? 0)]));
      const [minX, minY, viewWidth, viewHeight] = tags(html, 'svg')[0].viewBox.split(' ').map(Number);
      const labels = [...html.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)]
        .map(match => ({ ...attrs(match[1]), value: match[2].replace(/&quot;/g, '"') }))
        .filter(label => label['data-screen-font-size']);
      const upperLabels = labels.filter(label => Number(label.y) < 0);
      assert.equal(labels.length, example.pieces.length + 2);
      assert.equal(upperLabels.length, example.pieces.length);
      assert.deepEqual(upperLabels.map(label => label.value), example.pieces.map(piece => `W. ${piece.width}"`));
      for (const [width, height] of [[180, 240], [300, 280], [320, 280], [640, 380]]) {
        // Model SVG xMidYMid meet and the browser's fixed pixel labels. Glyph
        // widths round up Arial bold measurements (W. 16" ≈61.4px, H. 80"
        // ≈57.3px at 20px). Vertical bounds also exceed its 22.4px text box.
        const contentWidth = width - padding.left - padding.right;
        const contentHeight = height - padding.top - padding.bottom;
        assert.ok(contentWidth > 0 && contentHeight > 0, 'Reserves leave a drawable viewport');
        const scale = Math.min(contentWidth / viewWidth, contentHeight / viewHeight);
        const left = padding.left + (contentWidth - viewWidth * scale) / 2;
        const top = padding.top + (contentHeight - viewHeight * scale) / 2;
        const upperBounds = [];
        for (const label of labels) {
          const isHeight = label.value.startsWith('H.');
          const textWidth = [...label.value].reduce((sum, char) => sum +
            (char === 'W' ? 0.95 : char === 'H' ? 0.73 : /[0-9]/.test(char) ? 0.56 : char === '"' ? 0.48 : 0.28), 0) * DIMENSION_SCREEN_FONT_SIZE_PX;
          const x = left + (Number(label.x) - minX) * scale +
            (isHeight ? DIMENSION_LABEL_OUTWARD_GAP_PX + DIMENSION_SCREEN_FONT_SIZE_PX / 2 : 0);
          const y = top + (Number(label.y) - minY) * scale +
            (isHeight ? 0 : Number(label.y) < 0 ? DIMENSION_LABEL_ABOVE_LINE_PX : DIMENSION_LABEL_BELOW_LINE_PX);
          const bounds = {
            left: isHeight ? x - DIMENSION_SCREEN_FONT_SIZE_PX * 0.6 : x - textWidth / 2,
            right: isHeight ? x + DIMENSION_SCREEN_FONT_SIZE_PX * 0.6 : x + textWidth / 2,
            top: y - (isHeight ? textWidth / 2 : DIMENSION_SCREEN_FONT_SIZE_PX),
            bottom: y + (isHeight ? textWidth / 2 : DIMENSION_SCREEN_FONT_SIZE_PX * 0.3),
          };
          const description = `${example.configuration} ${variant} ${width}x${height} ${label.value}`;
          assert.ok(bounds.left >= 0, `${description}: left label edge crosses the clipped card`);
          assert.ok(bounds.right <= width, `${description}: right label edge crosses the clipped card`);
          assert.ok(bounds.top >= 0, `${description}: top label edge crosses the clipped card`);
          assert.ok(bounds.bottom <= height, `${description}: bottom label edge crosses the clipped card`);
          if (Number(label.y) < 0) upperBounds.push(bounds);
        }
        if (width >= 300 && example.pieces.length === 2 && example.pieces[0].height === 80) {
          assert.ok(upperBounds[0].right + 2 <= upperBounds[1].left,
            `${example.configuration} ${variant} ${width}x${height}: ordinary door/sidelite labels need a visible gap`);
        }
      }
      assert.match(container.style, /(?:^|;)box-sizing:border-box(?:;|$)/,
        'The pixel reserve must remain inside the existing full-height flex container');
      const noDimensions = render(MixedDoor, { ...example, showDimensions: false, variant });
      assert.equal(tags(noDimensions, 'text').filter(item => item['data-screen-font-size']).length, 0);
      assert.doesNotMatch(tags(noDimensions, 'div')[0].style, /padding-(?:top|bottom|left|right):/,
        'Reports without dimensions keep the entire viewport for the product');
    }
  });
};
