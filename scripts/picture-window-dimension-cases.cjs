const assert = require('node:assert/strict');

module.exports = function register({
  test, load, render, attrs, tags, bars, panels, clipFor, assertClippedBars,
  PieceDiagram, PieceReportCard, reportPiece, panel, resolved, saved,
}) {
  const { FixedWindowShapeDiagram } = load('components/piece-diagram/renderers/fixed/fixed-window-shape-diagram.tsx');
  const nearly = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);
  const base = {
    shape: 'PICTURE_WINDOW', frameColorHex: '#443F3B', glassTintHex: '#808080',
    hasCoating: true, hasPrivacy: true, showDimensions: false, idNamespace: 'picture-window-fixture',
  };
  const sizes = [[70, 29], [29, 70], [48, 48], [70.125, 29.375]];
  const rect = item => Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [
    key, Number(item[key] ?? item[`data-${key}`] ?? 0),
  ]));
  const part = (html, name) => [...html.matchAll(/<(?:svg|g|rect)\b([^>]*)>/g)]
    .map(match => attrs(match[1])).find(item => item['data-part'] === name);
  const geometry = (html, width, height) => {
    const framePart = part(html, 'picture-window-frame');
    const glassPart = part(html, 'picture-window-glass');
    assert.ok(framePart, 'Rendered picture window exposes its actual frame geometry');
    assert.ok(glassPart, 'Rendered picture window exposes its actual glass geometry');
    const frame = rect(framePart);
    const glass = rect(glassPart);
    assert.ok(frame.width > 0 && frame.height > 0);
    nearly(frame.width / frame.height, width / height);
    const scale = frame.width / width;
    nearly(scale, frame.height / height);
    assert.ok(glass.x > frame.x && glass.y > frame.y);
    assert.ok(glass.width > 0 && glass.height > 0);
    assert.ok(glass.x + glass.width < frame.x + frame.width);
    assert.ok(glass.y + glass.height < frame.y + frame.height);
    const profile = [
      glass.x - frame.x, glass.y - frame.y,
      frame.x + frame.width - glass.x - glass.width,
      frame.y + frame.height - glass.y - glass.height,
    ].map(value => value / scale);
    return { frame, glass, scale, profile };
  };

  test('Picture Window O follows landscape, portrait, square and fractional dimensions with the same frame profile', () => {
    const referenceHtml = render(FixedWindowShapeDiagram, { ...base, width: 48, height: 60 });
    const reference = geometry(referenceHtml, 48, 60);
    const referenceIndicator = rect(part(referenceHtml, 'picture-window-indicator'));
    for (const [width, height] of sizes) {
      const html = render(FixedWindowShapeDiagram, { ...base, width, height });
      const actual = geometry(html, width, height);
      actual.profile.forEach((depth, index) => nearly(depth, reference.profile[index]));
      assert.match(html, /data-frame-color="#443F3B"/);
      assert.match(html, /data-screen-rendered="false"/);
      const indicator = part(html, 'picture-window-indicator');
      assert.ok(indicator, 'Fixed O indicator is retained');
      const indicatorRect = rect(indicator);
      const [, , sourceWidth, sourceHeight] = indicator.viewBox.split(/\s+/).map(Number);
      nearly(indicatorRect.width / sourceWidth, indicatorRect.height / sourceHeight);
      nearly(indicatorRect.width / actual.scale, referenceIndicator.width / reference.scale);
      nearly(indicatorRect.height / actual.scale, referenceIndicator.height / reference.scale);
      nearly(indicatorRect.x + indicatorRect.width / 2, actual.glass.x + actual.glass.width / 2);
      nearly(indicatorRect.y + indicatorRect.height / 2, actual.glass.y + actual.glass.height / 2);
      const profiles = tags(html, 'svg').filter(item => /^picture-window-profile-/.test(item['data-part'] ?? ''));
      assert.equal(profiles.length, 8, 'The actual artwork contains all four corners and four rails');
      let profileArea = 0;
      for (const row of [0, 1, 2]) for (const column of [0, 1, 2]) {
        if (row === 1 && column === 1) continue;
        const name = `picture-window-profile-${row}-${column}`;
        const crop = part(html, name);
        assert.ok(crop, `${name} is retained`);
        const target = rect(crop);
        const referenceCrop = rect(part(referenceHtml, name));
        const [, , sourceW, sourceH] = crop.viewBox.split(/\s+/).map(Number);
        assert.ok(target.width > 0 && target.height > 0 && sourceW > 0 && sourceH > 0);
        assert.ok(target.x >= actual.frame.x && target.y >= actual.frame.y);
        assert.ok(target.x + target.width <= actual.frame.x + actual.frame.width + 1e-7);
        assert.ok(target.y + target.height <= actual.frame.y + actual.frame.height + 1e-7);
        if (column !== 1) nearly(target.width / actual.scale, referenceCrop.width / reference.scale);
        if (row !== 1) nearly(target.height / actual.scale, referenceCrop.height / reference.scale);
        if (row !== 1 && column !== 1) nearly(target.width / sourceW, target.height / sourceH);
        if (column === 1) {
          nearly(target.x, actual.glass.x);
          nearly(target.width, actual.glass.width);
        }
        if (row === 1) {
          nearly(target.y, actual.glass.y);
          nearly(target.height, actual.glass.height);
        }
        profileArea += target.width * target.height;
      }
      nearly(profileArea, actual.frame.width * actual.frame.height - actual.glass.width * actual.glass.height);
    }
  });

  test('Picture Window incomplete small dimensions show a neutral preview without invalid SVG geometry', () => {
    for (const [width, height] of [[1, 29], [29, 1]]) for (const variant of ['editor', 'report']) {
      const html = render(PieceDiagram, {
        ...base, variant, diagramFamily: 'FIXED_SHAPE', brandName: 'Eco', systemName: 'Serie 300',
        configuration: 'O', piece: { width: String(width), height: String(height) },
      });
      assert.match(html, /data-diagram-state="unavailable"/);
      assert.match(html, /Complete the piece details to see the preview\./);
      assert.equal(tags(html, 'svg').length, 0);
      assert.equal(part(html, 'picture-window-frame'), undefined);
    }
  });

  test('Picture Window dimensions measure the resized frame and fit within the viewport', () => {
    for (const [width, height] of sizes) {
      const html = render(FixedWindowShapeDiagram, { ...base, width, height, showDimensions: true });
      const { frame } = geometry(html, width, height);
      const dimension = axis => {
        const group = [...html.matchAll(/<g\b([^>]*)>([\s\S]*?)<\/g>/g)]
          .find(match => attrs(match[1])['data-axis'] === axis);
        assert.ok(group, `Missing ${axis} dimension`);
        return tags(group[2], 'line')[0];
      };
      const horizontal = dimension('W');
      const vertical = dimension('H');
      nearly(Number(horizontal.x1), frame.x);
      nearly(Number(horizontal.x2), frame.x + frame.width);
      nearly(Number(vertical.y1), frame.y);
      nearly(Number(vertical.y2), frame.y + frame.height);
      const [x, y, w, h] = tags(html, 'svg')[0].viewBox.split(/\s+/).map(Number);
      for (const line of [horizontal, vertical]) {
        for (const end of ['1', '2']) {
          assert.ok(Number(line[`x${end}`]) >= x && Number(line[`x${end}`]) <= x + w);
          assert.ok(Number(line[`y${end}`]) >= y && Number(line[`y${end}`]) <= y + h);
        }
      }
    }
  });

  test('Picture Window Colonial grid follows the glass with equal one-inch bars in every orientation', () => {
    for (const [width, height] of sizes) {
      const props = { ...base, width, height };
      const baseline = render(FixedWindowShapeDiagram, props);
      assert.equal(render(FixedWindowShapeDiagram, { ...props, muntin: null }), baseline);
      const html = render(FixedWindowShapeDiagram, {
        ...props, muntin: resolved([panel(1, 3, 3, 'Center', 'O')]),
      });
      const { glass, scale } = geometry(html, width, height);
      assert.equal(panels(html).length, 1);
      assert.equal(bars(html).length, 4);
      assertClippedBars(html);
      const clip = clipFor(html, panels(html)[0]);
      for (const key of ['x', 'y', 'width', 'height']) nearly(clip[key], glass[key]);
      for (const bar of bars(html)) nearly(Number(bar[bar['data-axis'] === 'vertical' ? 'width' : 'height']), scale);
      assert.ok(html.indexOf('data-part="picture-window-indicator"') > html.indexOf('data-part="muntin-layer"'));
    }
  });

  test('Eco Serie 300 O uses the measured shape in editor and report, including decimal input strings', () => {
    for (const [width, height] of sizes) for (const variant of ['editor', 'report']) {
      const html = render(PieceDiagram, {
        ...base, variant, diagramFamily: 'FIXED_SHAPE', brandName: 'Eco', systemName: 'Serie 300',
        configuration: 'O', piece: { width: String(width), height: String(height) },
      });
      assert.match(html, /data-diagram-renderer="FIXED_WINDOW_SHAPE"/);
      assert.match(html, /data-shape="PICTURE_WINDOW"/);
      geometry(html, width, height);
    }
  });

  test('Saved Eco Serie 300 report and PDF capture contain the same measured picture-window geometry', () => {
    for (const [width, height] of sizes) {
      const piece = {
        ...reportPiece(), width: String(width), height: String(height),
        prod: { name: 'Fixed Window', diagramFamily: 'FIXED_SHAPE' },
        bran: { name: 'Eco' }, syst: { name: 'Serie 300' }, conf: { conf: 'O' },
        pieceMuntin: saved([panel(1, 3, 3, 'Center', 'O')]),
      };
      const before = JSON.stringify(piece);
      const html = render(PieceReportCard, { piece, displayMark: 'W1', showPrices: false });
      assert.match(html, /data-piece-diagram-id="123"/);
      assert.equal(bars(html).length, 4);
      geometry(html, width, height);
      assert.equal(JSON.stringify(piece), before);
    }
  });

  const wallProps = {
    ...base, diagramFamily: 'FIXED_SHAPE', brandName: 'Eco', systemName: 'Serie 300',
    configuration: 'O', dimensionMode: 'WINDOW_WALL',
  };
  const allParts = (html, name) => [...html.matchAll(/<(?:svg|g|rect)\b([^>]*)>/g)]
    .map(match => attrs(match[1])).filter(item => item['data-part'] === name);
  const wallPanels = html => {
    const starts = [...html.matchAll(/<g\b([^>]*data-part="picture-window-panel"[^>]*)>/g)];
    return starts.map((match, index) => ({
      ...attrs(match[1]), html: html.slice(match.index, starts[index + 1]?.index ?? html.length),
    }));
  };
  const assertUniqueClips = html => {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, 'Each panel owns distinct SVG IDs');
    for (const match of html.matchAll(/(?:clip-path|mask)="url\(#([^)]+)\)"/g)) {
      assert.ok(ids.includes(match[1]), `Missing SVG clip or mask ${match[1]}`);
    }
  };
  const assertWall = (html, width, height, count) => {
    const openingPart = part(html, 'picture-window-opening');
    assert.ok(openingPart, 'The opening is rendered');
    assert.equal(Number(openingPart['data-panel-count']), count);
    const opening = rect(openingPart);
    const scale = opening.width / width;
    nearly(scale, opening.height / height);
    nearly(opening.width / opening.height, width / height);
    const groups = wallPanels(html);
    assert.equal(groups.length, count);
    assert.equal(allParts(html, 'picture-window-frame').length, count);
    assert.equal(allParts(html, 'picture-window-glass').length, count);
    assert.equal(allParts(html, 'picture-window-indicator').length, count);
    const reference = geometry(render(FixedWindowShapeDiagram, { ...base, width: 48, height: 60 }), 48, 60);
    let combinedWidth = 0;
    for (const [index, group] of groups.entries()) {
      const measured = geometry(group.html, width / count, height);
      nearly(measured.scale, scale);
      nearly(measured.frame.width / scale, width / count);
      nearly(measured.frame.height / scale, height);
      measured.profile.forEach((depth, side) => nearly(depth, reference.profile[side]));
      assert.equal(Number(group['data-panel-index']), index + 1);
      nearly(Number(group['data-width']), measured.frame.width);
      nearly(Number(group['data-height']), measured.frame.height);
      const translation = group.transform.match(/^translate\(([-\d.e+]+)[ ,]+([-\d.e+]+)\)$/);
      assert.ok(translation, 'Panels use adjacent placements without scaling the frame');
      nearly(Number(translation[1]), combinedWidth);
      nearly(Number(translation[2]), 0);
      const profiles = tags(group.html, 'svg').filter(item => /^picture-window-profile-/.test(item['data-part'] ?? ''));
      assert.equal(profiles.length, 8);
      const leftRail = rect(part(group.html, 'picture-window-profile-1-0'));
      const topRail = rect(part(group.html, 'picture-window-profile-0-1'));
      nearly(leftRail.width / scale, reference.profile[0]);
      nearly(topRail.height / scale, reference.profile[1]);
      combinedWidth += measured.frame.width;
    }
    nearly(combinedWidth, opening.width);
    assertUniqueClips(html);
    return groups;
  };

  test('WINDOW_WALL fixed O divides the total opening into 1, 2 or 3 equal panels in editor and report', () => {
    for (const variant of ['editor', 'report']) {
      for (const [width, count] of [[70, 1], [70, 2], [70, 3], [84.125, 2]]) {
        const piece = { width: String(width), height: '80', panelCount: String(count) };
        const before = JSON.stringify(piece);
        const html = render(PieceDiagram, { ...wallProps, variant, piece });
        assert.match(html, /data-diagram-renderer="FIXED_WINDOW_SHAPE"/);
        assertWall(html, width, 80, count);
        assert.equal(JSON.stringify(piece), before);
      }
    }
  });

  test('STANDARD fixed O ignores incidental panel counts and retains a single full-width picture window', () => {
    for (const variant of ['editor', 'report']) {
      const html = render(PieceDiagram, {
        ...wallProps, variant, dimensionMode: 'STANDARD', piece: { width: '70', height: '80', panelCount: 2 },
      });
      assertWall(html, 70, 80, 1);
    }
  });

  test('WINDOW_WALL fixed O stays neutral while panel count is missing or invalid', () => {
    for (const variant of ['editor', 'report']) {
      for (const panelCount of [undefined, null, '', 0, -1, 1.5, '2.5', 'invalid']) {
        const html = render(PieceDiagram, {
          ...wallProps, variant, piece: { width: '70', height: '80', panelCount },
        });
        assert.match(html, /data-diagram-state="unavailable"/);
        assert.equal(tags(html, 'svg').length, 0, `Invalid panel count ${panelCount} must not invent a drawing`);
      }
    }
  });

  test('WINDOW_WALL fixed O repeats its shared grid with separate clips and rejects ambiguous legacy grids', () => {
    const shared = [panel(1, 3, 2, 'Center', 'O')];
    const legacyEqual = [panel(1, 3, 2, 'Left', 'O'), panel(2, 3, 2, 'Right', 'O')];
    for (const variant of ['editor', 'report']) {
      const props = { ...wallProps, variant, piece: { width: '70', height: '80', panelCount: 3 } };
      for (const selection of [shared, legacyEqual]) {
        const html = render(PieceDiagram, { ...props, muntin: resolved(selection) });
        const groups = assertWall(html, 70, 80, 3);
        assert.equal(bars(html).length, 9);
        assertClippedBars(html);
        for (const group of groups) {
          assert.equal(panels(group.html).length, 1);
          assert.equal(bars(group.html).length, 3);
          const clip = clipFor(html, panels(group.html)[0]);
          const glass = rect(part(group.html, 'picture-window-glass'));
          for (const key of ['x', 'y', 'width', 'height']) nearly(clip[key], glass[key]);
        }
      }
      const ambiguous = render(PieceDiagram, {
        ...props, muntin: resolved([panel(1, 3, 2, 'Left', 'O'), panel(2, 2, 2, 'Right', 'O')]),
      });
      assertWall(ambiguous, 70, 80, 3);
      assert.equal(bars(ambiguous).length, 0, 'Different legacy panel selections cannot be guessed as a shared grid');
    }
  });

  test('Saved WINDOW_WALL metadata preserves fixed O panel geometry and shared grid in the PDF capture element', () => {
    const piece = {
      ...reportPiece(), width: '70', height: '80', panelCount: 2,
      prod: { name: 'Window Wall', diagramFamily: 'FIXED_SHAPE' },
      bran: { name: 'Eco' }, syst: { name: 'Serie 300' }, conf: { conf: 'O' },
      diagramMetadata: { dimensionMode: 'WINDOW_WALL', hasCoating: true, hasPrivacy: true },
      pieceMuntin: saved([panel(1, 3, 2, 'Center', 'O')]),
    };
    const before = JSON.stringify(piece);
    const html = render(PieceReportCard, { piece, displayMark: 'WW1', showPrices: false });
    assert.match(html, /data-piece-diagram-id="123"/);
    assertWall(html, 70, 80, 2);
    assert.equal(bars(html).length, 6);
    assertClippedBars(html);
    assert.equal(JSON.stringify(piece), before);
  });
};
