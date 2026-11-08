const assert = require('node:assert/strict');

module.exports = function register({ test, load, render, tags, bars, panel, resolved, PieceDiagram }) {
  const { FrenchDoorDesignThumbnail } = load('components/piece-diagram/renderers/french-door/french-door-design-thumbnail.tsx');
  const props = { diagramFamily: 'FRENCH_DOOR', systemName: 'Serie 600', activeOptionName: 'Right Active',
    preparationOptionName: '2 Holes', showDimensions: false, hasCoating: true, glassTintHex: '#70A593' };
  const single = { width: 36, height: 80 };
  const composite = { width: 108, height: 80, doorWidth: 72, leftSideliteWidth: 18, rightSideliteWidth: 18 };
  const muntin = resolved([panel(1, 2, 2, 'Left', 'O'), panel(2, 2, 2, 'Center', 'X'), panel(3, 2, 2, 'Right', 'X'), panel(4, 2, 2, 'Right', 'O')]);

  test('French catalog artwork stays inside the operable glass and inherits the selected leaf finish', () => {
    for (const [configuration, key, count, piece] of [
      ['X', 'SD01', 1, single], ['OX', 'SD01', 1, { width: 70, doorWidth: 36, height: 80 }],
      ['XX', 'DD01', 2, { width: 72, height: 80 }], ['OXXO', 'DD01', 2, composite],
    ]) for (const activeOptionName of ['Left Active', 'Right Active']) for (const frameColorHex of ['#FFFFFF', '#704A35']) {
      const html = render(PieceDiagram, { ...props, configuration, activeOptionName, frameColorHex, piece, frenchDoorDesignKey: key, muntin });
      assert.equal((html.match(/data-layer="FRENCH_DOOR_DESIGN"/g) ?? []).length, 1);
      assert.match(html, new RegExp('data-artwork-key="' + key + '"'));
      const designClip = [...html.matchAll(/<clipPath id="[^"]*-design-lights">(.*?)<\/clipPath>/gs)][0];
      const openings = tags(designClip[1], 'rect');
      assert.equal(openings.length, count);
      const rects = tags(html, 'rect');
      const actualGlass = rects.filter(item => item['data-part'] === (count === 1 ? 'single-glass' : 'double-glass'));
      assert.equal(actualGlass.length, count);
      openings.forEach((opening, i) => {
        for (const prop of ['y', 'width', 'height']) assert.equal(opening[prop], actualGlass[i][prop]);
        if (count === 2 || activeOptionName === 'Right Active') assert.equal(opening.x, actualGlass[i].x);
      });
      const overlay = rects.find(item => item.mask?.includes('-design-mask'));
      assert.equal(overlay.fill, rects.find(item => item['data-part'] === (count === 1 ? 'single-leaf' : 'double-leaf')).fill);
      assert.equal(bars(html).length, 0, 'Design selection suppresses grids on the entire estimate piece');
      assert.equal(tags(html, 'image').length, 0);
    }
  });

  test('Explicitly assigned artwork works on new French series and stale or mismatched artwork is never substituted', () => {
    const saved = { ...single, doorDesignSnapshot: { artworkKey: 'SD01' } };
    assert.match(render(PieceDiagram, { ...props, systemName:'Pilot', configuration:'X', piece:saved, variant:'report' }), /data-artwork-key="SD01"/);
    assert.doesNotMatch(render(PieceDiagram, { ...props, configuration:'X', piece:saved, frenchDoorDesignKey:null }), /data-artwork-key=/);
    for (const [configuration, key] of [['O','SD01'], ['X','DD01'], ['XX','SD01'], ['X','unknown']])
      assert.doesNotMatch(render(PieceDiagram, { ...props, configuration, frenchDoorDesignKey:key, piece:single }), /data-artwork-key=/);
  });

  test('Picker thumbnails preview the same catalog shapes as the piece, without dimension or movement labels', () => {
    for (const artworkKey of ['SD01','DD01']) {
      const html = render(FrenchDoorDesignThumbnail, { artworkKey, frameColorHex:'#674932' });
      assert.match(html, new RegExp('data-artwork-key="' + artworkKey + '"'));
      assert.doesNotMatch(html, /data-indicator-panel=|data-layer="FRENCH_DOOR_DIMENSIONS"/);
    }
    assert.equal(render(FrenchDoorDesignThumbnail, { artworkKey:'unknown' }), '');
  });

  test('An assigned door design on a new series with unspecified hardware remains visible', () => {
    for (const [configuration, key, piece] of [['X','SD01',single], ['OXXO','DD01',composite]]) {
      const html = render(PieceDiagram, { ...props, systemName: 'New Series', activeOptionName: null, configuration, piece, frenchDoorDesignKey: key });
      assert.match(html, new RegExp('data-artwork-key="' + key + '"'));
      assert.doesNotMatch(html, /data-part="(?:lock-bore|barrel-hinge)"|data-indicator-panel=/);
    }
  });

  test('The full catalog renders every single and double motif with the selected frame finish', () => {
    const catalog = load('components/piece-diagram/renderers/french-door/french-door-designs.json');
    assert.equal(Object.keys(catalog).length, 192);
    for (const [prefix, count, leaves] of [['SD', 96, 1], ['DD', 96, 2]]) for (let number = 1; number <= count; number++) {
      const key = prefix + String(number).padStart(2, '0');
      const artwork = catalog[key];
      assert.ok(artwork, `Missing ${key}`);
      assert.equal(artwork.leafCount, leaves);
      assert.ok(artwork.paths.length > 0);
      assert.ok(artwork.viewBox.split(' ').map(Number).every(Number.isFinite));
      const html = render(FrenchDoorDesignThumbnail, { artworkKey: key, frameColorHex: '#674932' });
      assert.match(html, new RegExp(`data-artwork-key="${key}"`));
      assert.equal(tags(html, 'image').length, 0, `${key} must stay vector`);
      assert.doesNotMatch(html, /OLD-(SD|DD)-|#36373d|#e3e3e3/i, `${key} must not retain source labels or colors`);
      const rects = tags(html, 'rect');
      const finish = rects.find(item => item['data-part'] === (leaves === 1 ? 'single-leaf' : 'double-leaf')).fill;
      assert.equal(rects.find(item => item.mask?.includes('-design-mask')).fill, finish);
      for (const path of artwork.paths) {
        assert.ok(path.width > 0 || path.filled, `${key} contains an invisible shape`);
        if (path.clip !== undefined) assert.ok(artwork.clips?.[path.clip], `${key} has an unresolved source clip`);
      }
      const ids = tags(html, 'clipPath').map(item => item.id);
      assert.equal(ids.length, new Set(ids).size, `${key} contains duplicate clip ids`);
    }
  });

  test('Catalog solid motifs keep their filled areas and source cutouts in the door-only mask', () => {
    const catalog = load('components/piece-diagram/renderers/french-door/french-door-designs.json');
    const key = Object.keys(catalog).find(key => catalog[key].paths.some(path => path.filled));
    const html = render(FrenchDoorDesignThumbnail, { artworkKey: key, frameColorHex: '#674932' });
    const mask = html.match(/<mask\b[^>]*>(.*?)<\/mask>/s)[1];
    assert.ok(tags(mask, 'path').some(path => path.fill === 'white'), 'Filled catalog shapes must not turn into outlines');
    for (const key of ['SD40', 'SD54', 'SD55']) {
      const html = render(PieceDiagram, { ...props, configuration: 'OX', piece: { width: 70, height: 80, doorWidth: 36 }, frenchDoorDesignKey: key });
      const clip = html.match(/<clipPath id="[^"]*-design-lights">(.*?)<\/clipPath>/s)[1];
      assert.equal(tags(clip, 'rect').length, 1, 'Sidelites must not receive catalog artwork');
    }
    for (const duplicate of ['SD97', 'SD98', 'SD99']) assert.equal(catalog[duplicate], undefined);
  });

  test('Solid board designs preserve their visible joints without cutting holes into the panel', () => {
    const catalog = load('components/piece-diagram/renderers/french-door/french-door-designs.json');
    for (const key of ['SD69', 'SD70', 'DD61', 'DD62']) {
      const design = catalog[key];
      assert.equal(design.details.length, 3 * design.leafCount);
      assert.ok(design.paths.every(path => path.filled));
      const html = render(FrenchDoorDesignThumbnail, { artworkKey: key, frameColorHex: '#674932' });
      const joints = html.match(/<svg\b[^>]*data-part="design-panel-joints"[^>]*>(.*?)<\/svg>/s)[1];
      assert.equal(tags(joints, 'path').length, 3 * design.leafCount);
      assert.doesNotMatch(html.match(/<mask\b[^>]*>(.*?)<\/mask>/s)[1], /design-panel-joints/);
    }
    for (const key of ['SD30', 'DD40']) assert.equal(catalog[key].details, undefined, 'Plain panels must stay plain');
  });
};
