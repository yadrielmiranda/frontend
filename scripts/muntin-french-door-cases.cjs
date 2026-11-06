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

  function checkDoorJoints(html, positions) {
    const seams = tags(html, 'line').filter(line => line['data-part'] === 'sidelite-door-seam');
    assert.deepEqual(seams.map(line => Number(line.x1)), positions);
    for (const seam of seams) {
      nearly(Number(seam.x1), Number(seam.x2));
      assert.ok(Number(seam.y2) > Number(seam.y1));
      assert.ok(seam.stroke && seam.stroke !== 'none');
    }
    return seams.map(line => Number(line.x1));
  }

  function visibleDoorFrame(html, configuration) {
    const clipped = tags(html, 'g').filter(group => group['clip-path']?.endsWith('-visible-frame)'));
    assert.equal(clipped.length, 1, 'Only the operable door may be clipped at a sidelite joint');
    assert.ok(html.includes(`<g clip-path="${clipped[0]['clip-path']}"><g data-configuration="${configuration}"`),
      'The mounting clip is applied to the door artwork');
    return clipFor(html, clipped[0]);
  }

  function paintedGradient(html, tag, part, index = 0) {
    const surface = tags(html, tag).filter(element => element['data-part'] === part)[index];
    assert.ok(surface, 'Missing painted surface: ' + part);
    const ref = /^url\(#([^)]+)\)$/.exec(surface.fill);
    assert.ok(ref, 'Missing gradient fill on ' + part);
    const gradient = [...html.matchAll(/<linearGradient\b([^>]*)>([\s\S]*?)<\/linearGradient>/g)]
      .find(match => attrs(match[1]).id === ref[1]);
    assert.ok(gradient, 'Missing gradient definition for ' + part);
    const { id, ...coordinates } = attrs(gradient[1]);
    return { coordinates, stops: tags(gradient[2], 'stop') };
  }

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
    const groups = checkGrid(html, [[2, 3]]);
    checkActualGlassClips(html, groups);
    const glass = rectOf(tags(html, 'rect').find(rect => rect['data-part'] === 'single-glass'));
    const clip = clipFor(html, groups[0]);
    nearly(clip.x, hinge === 'left' ? 36 - glass.x - glass.width : glass.x);
    for (const key of ['y', 'width', 'height']) nearly(clip[key], glass[key]);
    assert.match(html, new RegExp(`data-hinge-side="${hinge}"`));
    assert.equal((html.match(/scale\(-1 1\)/g) ?? []).length, hinge === 'left' ? 1 : 0);
    assert.equal(tags(html, 'g').filter(group => group['data-indicator-panel'] === 'X').length, 1);
  });

  test('Single French Door centers the lower bore and keeps the upper bore the same distance above it', () => {
    for (const hinge of ['left', 'right']) {
      for (const height of [60, 80, 95.5]) {
        const html = render(FrenchDoor, standalone('X', { piece: { width: 36, height }, exteriorHingeSide: hinge }));
        const centers = tags(html, 'circle').filter(circle => circle['data-part'] === 'lock-bore')
          .map(circle => Number(circle.cy)).sort((a, b) => a - b);
        assert.equal(centers.length, 2);
        const [upper, lower] = centers;
        nearly(lower, height / 2);
        nearly(lower - upper, 3.82);
      }
    }
  });

  test('Single French Door and Pivot use the same frame and leaf finishes for White and Bronze', () => {
    let clearGlass;
    for (const frameColorHex of ['#FFFFFF', '#704A35']) {
      const appearance = { frameColorHex, hasCoating: false, glassTintHex: '#FFFFFF' };
      const french = render(FrenchDoor, standalone('X', appearance));
      const pivot = render(PieceDiagram, {
        ...appearance, diagramFamily: 'PIVOT_DOOR', configuration: 'X',
        piece: { width: 36, height: 80 }, showDimensions: false,
      });
      for (const [part, pivotPart] of [['single-frame', 'pivot-door-frame'], ['single-leaf', 'pivot-door-leaf']]) {
        const finish = paintedGradient(french, 'rect', part);
        assert.deepEqual(finish, paintedGradient(pivot, 'path', pivotPart), part + ' at ' + frameColorHex);
        assert.ok(finish.stops.length >= 2 && finish.stops.every(stop => Number(stop['stop-opacity'] ?? 1) === 1));
        if (frameColorHex === '#704A35') assert.ok(finish.stops.some(stop => stop['stop-color'] === frameColorHex));
      }
      const glass = paintedGradient(french, 'rect', 'single-glass');
      if (clearGlass) assert.deepEqual(glass, clearGlass, 'Frame selection must preserve the glass finish');
      clearGlass = glass;
    }
  });

  test('French Door fixed and double panels use the same finishes and glass treatments as the single', () => {
    for (const appearance of [
      { frameColorHex: '#FFFFFF', glassTintHex: '#FFFFFF', hasCoating: false, hasPrivacy: false },
      { frameColorHex: '#704A35', glassTintHex: '#77ABCF', hasCoating: true, hasPrivacy: true },
    ]) {
      const single = render(FrenchDoor, standalone('X', appearance));
      for (const [configuration, prefix, profile, paneCount] of [['O', 'sidelite', 'profile', 1], ['XX', 'double', 'leaf', 2]]) {
        const html = render(FrenchDoor, standalone(configuration, appearance));
        const glassPart = prefix + '-glass';
        const lights = tags(html, 'rect').filter(rect => rect['data-part'] === glassPart).map(rectOf);
        assert.equal(lights.length, paneCount);
        assert.deepEqual(paintedGradient(html, 'rect', prefix + '-frame'), paintedGradient(single, 'rect', 'single-frame'));
        for (let i = 0; i < paneCount; i++) {
          assert.deepEqual(paintedGradient(html, 'rect', prefix + '-' + profile, i), paintedGradient(single, 'rect', 'single-leaf'));
          assert.deepEqual(paintedGradient(html, 'rect', glassPart, i), paintedGradient(single, 'rect', 'single-glass'));
        }
        for (const effect of ['TINT', 'COATING', 'PRIVACY']) {
          const affected = markup => tags(markup, 'rect').filter(rect => rect['data-glass-effect'] === effect);
          const example = affected(single)[0];
          const overlays = affected(html);
          assert.deepEqual(overlays.map(rectOf), example ? lights : []);
          for (const overlay of overlays) {
            for (const key of ['fill', 'fill-opacity', 'style']) assert.equal(overlay[key], example[key]);
          }
        }
      }
    }
  });

  test('Single French Door changes the glass opening while keeping its profiles and bores at the same physical size', () => {
    let reference;
    for (const [width, height] of [[32, 80], [36, 80], [42.5, 96]]) {
      const html = render(FrenchDoor, standalone('X', {
        piece: { width, height }, exteriorHingeSide: 'right', showDimensions: true, hasPrivacy: true,
      }));
      assert.equal(tags(html, 'image').length, 0);
      assert.match(html, new RegExp(`French Door X, ${width} by ${height} inches`));
      assert.match(html, /data-layer="FRENCH_DOOR_DIMENSIONS"/);
      const rects = tags(html, 'rect');
      const glass = rectOf(rects.find(rect => rect['data-part'] === 'single-glass'));
      const margins = [glass.x, width - glass.x - glass.width, glass.y, height - glass.y - glass.height];
      assert.ok(margins.every(margin => margin > 0) && glass.width > 0 && glass.height > 0);
      for (const effect of ['TINT', 'COATING', 'PRIVACY']) {
        const overlay = rects.find(rect => rect['data-glass-effect'] === effect);
        assert.deepEqual(rectOf(overlay), glass);
        if (effect === 'TINT') assert.equal(overlay.fill, base.glassTintHex);
      }
      const bores = tags(html, 'circle').filter(circle => circle['data-part'] === 'lock-bore');
      assert.equal(bores.length, 2);
      const radii = bores.map(circle => Number(circle.r));
      assert.ok(radii.every(radius => radius > 0));
      const hinges = tags(html, 'g').filter(group => group['data-part'] === 'barrel-hinge');
      assert.equal(hinges.length, 3);
      if (!reference) reference = { margins, radii };
      margins.forEach((margin, index) => nearly(margin, reference.margins[index]));
      assert.deepEqual(radii, reference.radii);
    }
  });

  test('French Door standalone O keeps physical profiles, positive glass and a fixed indicator', () => {
    let standardInsets;
    for (const [width, height] of [[12, 60], [18, 80], [24, 96]]) {
      const html = render(FrenchDoor, standalone('O', { piece: { width, height }, muntin: resolved(onePanel('O'), 'ogee') }));
      checkDoorJoints(html, []);
      const glass = rectOf(tags(html, 'rect').find(rect => rect['data-part'] === 'sidelite-glass'));
      const groups = checkGrid(html, [[2, 3]]);
      checkActualGlassClips(html, groups);
      assert.deepEqual(clipFor(html, groups[0]), glass);
      const insets = [glass.x, glass.y, width - glass.x - glass.width, height - glass.y - glass.height];
      assert.ok(insets.every(n => n > 0) && glass.width > 0 && glass.height > 0);
      if (!standardInsets) standardInsets = insets;
      insets.forEach((n, i) => nearly(n, standardInsets[i]));
      assert.match(html, /data-product-role="SIDELITE"/);
      assert.match(html, /data-muntin-profile="ogee"/);
      assert.equal(tags(html, 'image').length, 0);
      assert.doesNotMatch(html, /data-part="(?:lock-bore|barrel-hinge)"/);
      const markers = tags(html, 'g').filter(group => group['data-indicator-panel']);
      assert.deepEqual(markers.map(marker => [marker['data-indicator-panel'], marker['data-indicator-role']]), [['O', 'FIXED']]);
    }
    const small = render(FrenchDoor, standalone('O', { piece: { width: 4, height: 15 } }));
    const opening = rectOf(tags(small, 'rect').find(rect => rect['data-part'] === 'sidelite-glass'));
    assert.ok(opening.x > 0 && opening.y > 0 && opening.width > 0 && opening.height > 0);
    assert.ok(opening.x + opening.width < 4 && opening.y + opening.height < 15);
  });

  test('Joined jamb faces and neighboring rails use the same finish at every height', () => {
    for (const frameColorHex of ['#FFFFFF', '#704A35']) {
      const single = render(FrenchDoor, standalone('X', { frameColorHex }));
      const leafStops = paintedGradient(single, 'rect', 'single-leaf').stops;
      assert.doesNotMatch(single, /data-part="joined-frame-face"/);
      for (const [configuration, doorWidth, width, seams] of [
        ['OX', 36, 70, [34.25]],
        ['XO', 36, 70, [35.75]],
        ['OXXO', 72, 140, [34.25, 105.75]],
      ]) {
        const height = 80;
        const html = render(PieceDiagram, {
          ...base, diagramFamily: 'FRENCH_DOOR', systemName: 'Serie 600', configuration, frameColorHex,
          activeOptionName: 'Left Active', preparationOptionName: '2 Holes', piece: { width, height, doorWidth },
        });
        checkDoorJoints(html, seams);
        const rects = tags(html, 'rect');
        const faces = rects.filter(rect => rect['data-part'] === 'joined-frame-face');
        assert.equal(faces.length, seams.length * 2);
        const rails = rects.filter(rect => ['single-leaf', 'double-leaf', 'sidelite-profile'].includes(rect['data-part']));
        assert.deepEqual(faces.map(rect => rect.fill).sort(), rails.map(rect => rect.fill).sort());

        for (const [index, face] of faces.entries()) {
          nearly(Number(face.width), 3);
          nearly(Number(face.height), height);
          const { coordinates, stops } = paintedGradient(html, 'rect', 'joined-frame-face', index);
          assert.deepEqual(stops, leafStops);
          assert.equal(coordinates.gradientUnits, 'userSpaceOnUse');
          nearly(Number(coordinates.x1), Number(coordinates.x2));
          nearly(Number(coordinates.y1), 0);
          nearly(Number(coordinates.y2), height);
        }
      }
    }
  });

  test('The 70-inch OX opening keeps its 34/36 dimensions and a half-inch overlap between two 3-inch frames', () => {
    for (const hinge of ['left', 'right']) {
      const html = render(PieceDiagram, {
        ...base, diagramFamily: 'FRENCH_DOOR', configuration: 'OX', systemName: 'Serie 600', showDimensions: true,
        activeOptionName: hinge === 'left' ? 'Left Active' : 'Right Active', piece: { width: 70, doorWidth: 36, height: 80 },
        muntin: resolved([panel(1, 2, 2, 'Left', 'O'), panel(2, 2, 3, 'Right', 'X')]),
      });
      assert.match(tags(html, 'svg')[0]['aria-label'], /70 by 80 inches/);
      for (const size of [34, 36, 70]) assert.ok(html.includes(`W. ${size}&quot;`));
      const [seam] = checkDoorJoints(html, [34.25]);

      const rects = tags(html, 'rect');
      const part = name => rects.find(rect => rect['data-part'] === name);
      const fixedWidth = Number(part('sidelite-frame').width);
      const doorWidth = Number(part('single-frame').width);
      const doorLeft = 70 - doorWidth;
      nearly(fixedWidth - doorLeft, 0.5);
      const visible = visibleDoorFrame(html, 'X');
      assert.deepEqual(visible, { x: 0.5, y: 0, width: doorWidth - 0.5, height: 80 });
      nearly(doorLeft + visible.x, seam);
      nearly(seam, fixedWidth);
      const fixedProfile = rectOf(part('sidelite-profile'));
      const fixedProfileEnd = fixedProfile.x + fixedProfile.width;
      const leaf = rectOf(part('single-leaf'));
      const doorLeafStart = doorLeft + (hinge === 'left' ? doorWidth - leaf.x - leaf.width : leaf.x);
      nearly(seam - fixedProfileEnd, 3);
      nearly(doorLeafStart - doorLeft, 3);
      nearly(doorLeafStart - seam, 2.5);
      nearly(doorLeafStart - fixedProfileEnd, 5.5);

      const groups = checkGrid(html, [[2, 2], [2, 3]]);
      checkActualGlassClips(html, groups);
      assert.deepEqual(clipFor(html, groups[0]), rectOf(part('sidelite-glass')));
      const doorGlass = rectOf(part('single-glass'));
      const bores = tags(html, 'circle').filter(circle => circle['data-part'] === 'lock-bore');
      assert.equal(bores.length, 2);
      for (const bore of bores) {
        nearly(Number(bore.cx) - leaf.x, 1.7);
        assert.ok(Number(bore.cx) - Number(bore.r) > leaf.x && Number(bore.cx) + Number(bore.r) < doorGlass.x,
          'The wider jamb keeps both lock bores inside the moving leaf stile');
      }
      const doorClip = clipFor(html, groups[1]);
      nearly(doorClip.x, doorLeft + (hinge === 'left' ? doorWidth - doorGlass.x - doorGlass.width : doorGlass.x));
      nearly(doorClip.width, doorGlass.width);
    }
  });

  test('Unequal sidelites cover half an inch on each side of a single or double door', () => {
    for (const [kind, doorWidth] of [['X', 36], ['XX', 72]]) {
      const width = 14 + doorWidth + 22;
      const html = render(PieceDiagram, {
        ...base, diagramFamily: 'FRENCH_DOOR', configuration: 'O' + kind + 'O', systemName: 'Serie 600',
        showDimensions: true, activeOptionName: 'Right Active', preparationOptionName: '2 Holes',
        piece: { width, doorWidth, height: 80, leftSideliteWidth: 14, rightSideliteWidth: 22 },
      });
      for (const size of [14, doorWidth, 22, width]) assert.ok(html.includes(`W. ${size}&quot;`));
      const [leftSeam, rightSeam] = checkDoorJoints(html, [14.25, 14 + doorWidth - 0.25]);
      const fixed = tags(html, 'rect').filter(rect => rect['data-part'] === 'sidelite-frame');
      nearly(Number(fixed[0].width), leftSeam);
      nearly(width - Number(fixed[1].width), rightSeam);
      assert.deepEqual(visibleDoorFrame(html, kind), { x: 0.5, y: 0, width: rightSeam - leftSeam, height: 80 });
    }
  });

  test('Single French Door and its right sidelite clip their grids to the drawn apertures', () => {
    const html = render(MixedDoor, {
      ...base, configuration: 'XO', pieces: [
        { kind: 'X', width: 42, height: 96, exteriorHingeSide: 'right' },
        { kind: 'O', width: 16, height: 96 },
      ], muntin: resolved([panel(1, 2, 3, 'Left', 'X'), panel(2, 2, 2, 'Right', 'O')]),
    });
    const groups = checkGrid(html, [[2, 3], [2, 2]]);
    checkActualGlassClips(html, groups);
    const [seam] = checkDoorJoints(html, [41.75]);
    const visible = visibleDoorFrame(html, 'X');
    assert.deepEqual(visible, { x: 0, y: 0, width: seam, height: 96 });
    const leaf = rectOf(tags(html, 'rect').find(rect => rect['data-part'] === 'single-leaf'));
    const fixedProfile = rectOf(tags(html, 'rect').find(rect => rect['data-part'] === 'sidelite-profile'));
    nearly(seam - (leaf.x + leaf.width), 2.5);
    nearly(42 - 0.25 + fixedProfile.x - seam, 3);
    const glass = rectOf(tags(html, 'rect').find(rect => rect['data-part'] === 'single-glass'));
    assert.deepEqual(clipFor(html, groups[0]), glass);
    const fixed = rectOf(tags(html, 'rect').find(rect => rect['data-part'] === 'sidelite-glass'));
    const clip = clipFor(html, groups[1]);
    nearly(clip.x, 42 - 0.25 + fixed.x);
    for (const key of ['y', 'width', 'height']) nearly(clip[key], fixed[key]);
    assert.equal(tags(html, 'image').length, 0);
  });

  for (const activeLeaf of ['left', 'right']) for (const boreCount of [2, 3]) {
    test(`French Door XX ${activeLeaf} active ${boreCount}-bore keeps independent leaf grids and hardware`, () => {
      const html = render(FrenchDoor, standalone('XX', {
        activeLeaf, boreCount, muntin: resolved(twoPanels().reverse(), 'ogee'),
      }));
      const groups = checkGrid(html, [[2, 3], [3, 2]]);
      checkActualGlassClips(html, groups);
      const lights = tags(html, 'rect').filter(rect => rect['data-part'] === 'double-glass').map(rectOf);
      assert.deepEqual(groups.map(group => clipFor(html, group)), lights);
      assert.ok(lights[0].x + lights[0].width < lights[1].x);
      const structure = tags(html, 'g').find(group => group['data-structure-id']);
      assert.equal(structure['data-active-leaf'], activeLeaf);
      assert.equal(structure['data-bore-count'], String(boreCount));
      assert.equal(tags(html, 'image').length, 0);
      assert.ok(tags(html, 'g').some(g => g['data-layer'] === 'FRENCH_DOOR_STRUCTURE' && g['data-artwork'] === 'vector'));
      const bores = tags(html, 'circle').filter(circle => circle['data-part'] === 'lock-bore');
      assert.equal(bores.length, boreCount);
      const activeBores = bores.filter(bore => (Number(bore.cx) < 36) === (activeLeaf === 'left'));
      assert.equal(activeBores.length, 2);
      const centers = activeBores.map(circle => Number(circle.cy)).sort((a, b) => a - b);
      nearly(centers[1], 40);
      nearly(centers[1] - centers[0], 3.82);
      if (boreCount === 3) {
        const inactive = bores.find(bore => !activeBores.includes(bore));
        nearly(Number(inactive.cy), centers[1]);
        nearly(Number(inactive.cx), 72 - Number(activeBores[0].cx));
      }
      assert.equal(tags(html, 'g').filter(g => g['data-part'] === 'barrel-hinge').length, 6);
      const active = tags(html, 'g').find(group => group['data-indicator-role'] === 'ACTIVE');
      const secondary = tags(html, 'g').find(group => group['data-indicator-role'] === 'SECONDARY');
      assert.equal(active['data-hinge-side'], activeLeaf);
      assert.equal(active['data-show-arrow'], 'true');
      assert.equal(secondary['data-show-arrow'], 'false');
    });
  }

  test('Double French Door preserves profile widths and bore dimensions as the opening size changes', () => {
    let reference;
    for (const [width, height] of [[64, 60], [72, 80], [84.5, 96]]) {
      const html = render(FrenchDoor, standalone('XX', { piece: { width, height }, activeLeaf: 'right', boreCount: 3 }));
      const [left, right] = tags(html, 'rect').filter(rect => rect['data-part'] === 'double-glass').map(rectOf);
      const active = tags(html, 'circle').filter(circle => circle['data-part'] === 'lock-bore' && Number(circle.cx) > width / 2);
      assert.equal(active.length, 2);
      const centers = active.map(circle => Number(circle.cy)).sort((a, b) => a - b);
      nearly(centers[1], height / 2);
      nearly(centers[1] - centers[0], 3.82);
      const dimensions = [left.x, left.y, height - left.y - left.height, right.x - left.x - left.width,
        width - right.x - right.width, Number(active[0].cx) - width / 2, Number(active[0].r)];
      if (!reference) reference = dimensions;
      dimensions.forEach((value, i) => nearly(value, reference[i]));
    }
  });

  for (const item of mixedCases) test(`French Door ${item.configuration} maps all ${item.codes.length} glass lights from shuffled saved panels`, () => {
    const selection = mixedPanels(item);
    const html = render(MixedDoor, { ...mixedProps(item), muntin: resolved([...selection].reverse(), 'ogee') });
    const groups = checkGrid(html, item.counts);
    checkActualGlassClips(html, groups);
    const clips = groups.map(group => clipFor(html, group));
    clips.forEach((clip, index) => { if (index) assert.ok(clips[index - 1].x < clip.x); });
    assert.equal(tags(html, 'g').filter(group => group['data-part'] === 'muntin-layer').length, 1, 'Mixed assemblies use one complete mapping, not duplicate per-section grids');
    assert.equal(tags(html, 'image').length, 0);
    assert.doesNotMatch(html, /scale\(-1 1\)/, 'Mirroring the right sidelites would reverse the glass reflections');
    const lights = tags(html, 'rect').filter(rect => ['sidelite-glass', 'double-glass'].includes(rect['data-part'])).map(rectOf);
    let width = 0;
    const offsets = mixedProps(item).pieces.flatMap((piece, index) => {
      const origin = width - (index === 0 ? 0 : 0.25);
      width += piece.width;
      return piece.kind === 'XX' ? [origin, origin] : [origin];
    });
    assert.equal(lights.length, offsets.length);
    const doorIndex = item.kinds.indexOf('XX');
    const leftBoundary = doorIndex * 18;
    const [leftSeam, rightSeam] = checkDoorJoints(html, [leftBoundary + 0.25, leftBoundary + 72 - 0.25]);
    const visible = visibleDoorFrame(html, 'XX');
    nearly(visible.x, 0.5);
    nearly(offsets[doorIndex] + visible.x, leftSeam);
    nearly(leftSeam + visible.width, rightSeam);
    const fixedProfiles = tags(html, 'rect').filter(rect => rect['data-part'] === 'sidelite-profile').map(rectOf);
    const leaves = tags(html, 'rect').filter(rect => rect['data-part'] === 'double-leaf').map(rectOf);
    const leftProfileEnd = offsets[doorIndex - 1] + fixedProfiles[doorIndex - 1].x + fixedProfiles[doorIndex - 1].width;
    const rightProfileStart = offsets[doorIndex + 2] + fixedProfiles[doorIndex].x;
    nearly(leftSeam - leftProfileEnd, 3);
    nearly(rightProfileStart - rightSeam, 3);
    nearly((offsets[doorIndex] + leaves[0].x) - leftSeam, 2.5);
    nearly(rightSeam - (offsets[doorIndex + 1] + leaves[1].x + leaves[1].width), 2.5);
    lights.forEach((light, i) => {
      const clip = clips[i];
      nearly(clip.x, light.x + offsets[i]);
      for (const key of ['y', 'width', 'height']) nearly(clip[key], light[key]);
    });
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
      assert.equal(tags(html, 'image').length, 0);
      assert.equal(tags(html, 'rect').filter(rect => rect['data-part'] === 'sidelite-glass').length, item.kinds.filter(kind => kind === 'O').length);
      assert.equal(tags(html, 'rect').filter(rect => rect['data-part'] === 'double-glass').length, 2);
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

  test('French Door muntins preserve glass, hardware, dimensions and movement paths', () => {
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
      const glass = source => tags(source, 'rect').filter(rect => rect['data-part']?.endsWith('-glass'));
      assert.deepEqual(glass(html), glass(baseline));
      assert.deepEqual(tags(html, 'path'), tags(baseline, 'path'), 'Movement, frame tint and dimension paths are unchanged');
      const indicators = source => tags(source, 'g').filter(group => group['data-indicator-panel']);
      assert.deepEqual(indicators(html), indicators(baseline));
      assert.match(html, /data-layer="FRENCH_DOOR_DIMENSIONS"/);
      assert.ok(html.indexOf('data-part="muntin-layer"') < html.indexOf('data-indicator-family="SERIE_600"'), 'Movement stays above the grids');
    }
  });

  test('French Door dispatcher forwards live grids to standalone and mixed templates in both variants', () => {
    const shapes = [
      { configuration: 'O', piece: { width: '16', height: '80' }, selection: onePanel('O'), counts: [[2, 3]] },
      { configuration: 'X', piece: { width: '36', height: '80' }, selection: onePanel('X'), counts: [[2, 3]] },
      { configuration: 'XX', piece: { width: '72', height: '80' }, selection: twoPanels(), counts: [[2, 3], [3, 2]] },
      { configuration: 'OXXO', piece: { width: '108', height: '80', doorWidth: '72', leftSideliteWidth: '18', rightSideliteWidth: '18' },
        selection: mixedPanels(mixedCases[0]), counts: mixedCases[0].counts },
    ];
    for (const variant of ['editor', 'report']) for (const { configuration, piece, selection, counts } of shapes) {
      const html = render(PieceDiagram, {
        diagramFamily: 'FRENCH_DOOR', systemName: 'Serie 600', configuration, variant,
        activeOptionName: 'Left Active', preparationOptionName: '2 Holes', showDimensions: false,
        piece, muntin: resolved(selection),
      });
      assert.match(html, /data-diagram-renderer="SERIES_600_SHARED"/);
      assert.equal(tags(html, 'image').length, 0);
      checkGrid(html, counts);
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
    checkDoorJoints(html, [18.25, 89.75]);
    checkActualGlassClips(html, checkGrid(html, mixedCases[0].counts));
    assert.match(html, /data-diagram-renderer="SERIES_600_SHARED"/);
    assert.match(html, /data-piece-diagram-id="123"/);
    assert.equal(tags(html, 'rect').filter(rect => rect['data-part'] === 'sidelite-glass').length, 2);
    assert.equal(tags(html, 'image').length, 0);
    assert.ok(tags(html, 'g').some(group => group['data-structure-id'] === 'RIGHT_ACTIVE__THREE_BORE'));
    assert.equal(tags(html, 'circle').filter(circle => circle['data-part'] === 'lock-bore').length, 3);
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
