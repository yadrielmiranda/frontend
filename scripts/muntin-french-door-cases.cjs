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
};
