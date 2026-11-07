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
};
