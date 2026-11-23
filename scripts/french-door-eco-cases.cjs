const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

const catalogFile = 'components/piece-diagram/renderers/french-door/french-door-designs.json';
const sourceIds = {
  SD: [2, 3, 4, 9, 28, 36, 37, 38, 40, 42, 53, 54, 55, 56, 59, 60, 62, 65, 66, 71, 72, 75, 76, 77, 79, 80, 81, 82, 83, 84, 85, 86, 91, 95, 99, 100, 102, 105, 108, 109, 110],
  DD: [2, 23, 24, 29, 37, 38, 46, 53, 54, 55, 59, 60, 61, 62, 63, 64, 67, 68, 69, 70, 71, 73, 75, 78, 81],
};
const sourceFiles = {
  SD: { name: 'Document.pdf', hash: 'e0cc434f4bfeb2f92a8b8071ee301b8e6506a08ca56f403e90417561db908a74', columns: 5 },
  DD: { name: 'Document-3.pdf', hash: 'fea9eb3a2406743f54b9d46d35f758bf9f7f23374b1c546a317448e8ce51a8e2', columns: 3 },
};
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-7, message + ': ' + actual + ' != ' + expected);

module.exports = function register({ test, load, render, tags, PieceDiagram }) {
  test('ECO adds exactly the approved 41 single and 25 double sources without changing the prior 219 drawings', () => {
    const manifest = require('./data/french-door-eco-additions-20261123.json');
    const catalog = load(catalogFile);
    const expected = Object.entries(sourceIds).flatMap(([prefix, ids]) => ids.map((sourceId, index) => ({
      code: 'AE-' + prefix + '-' + ((prefix === 'SD' ? 111 : 110) + index),
      artworkKey: prefix + ((prefix === 'SD' ? 111 : 110) + index), kind: prefix === 'SD' ? 'SINGLE' : 'DOUBLE',
      sourceCode: (prefix === 'SD' ? 'EWSWH' : 'EWDWH') + String(sourceId).padStart(3, '0'), sourceId,
      sourceFile: sourceFiles[prefix].name, sourceSha256: sourceFiles[prefix].hash,
      page: 2 + Math.floor((sourceId - 1) / sourceFiles[prefix].columns), slot: (sourceId - 1) % sourceFiles[prefix].columns,
    })));
    assert.equal(manifest.entries.length, 66);
    assert.deepEqual(manifest.entries, expected, 'The approved source-to-code order, page, slot and PDF digest are immutable');
    for (const property of ['artworkKey', 'code', 'sourceCode']) assert.equal(new Set(manifest.entries.map(entry => entry[property])).size, 66);
    const old = Object.fromEntries(Object.entries(catalog).filter(([key]) => Number(key.slice(2)) <= (key.startsWith('SD') ? 110 : 109)));
    assert.equal(Object.keys(old).length, 219);
    assert.equal(manifest.baseline219Sha256, '50e6c1fb756079f492b4a55e3e37c126eb95e2864ce95ab547e83cbbf3e748a0');
    assert.equal(createHash('sha256').update(JSON.stringify(old)).digest('hex'), manifest.baseline219Sha256);
    assert.deepEqual(Object.keys(catalog).filter(key => !Object.hasOwn(old, key) && Number(key.slice(2)) <= (key.startsWith('SD') ? 151 : 134)).sort(), expected.map(entry => entry.artworkKey).sort());
    for (const entry of expected) {
      const artwork = catalog[entry.artworkKey];
      assert.equal(artwork.leafCount, entry.kind === 'SINGLE' ? 1 : 2);
      assert.equal(artwork.projection, entry.kind === 'DOUBLE' ? 'leaf' : undefined);
      if (entry.kind === 'DOUBLE') {
        assert.equal(artwork.clips.length, 2);
        for (const path of [...artwork.paths, ...(artwork.details ?? [])]) {
          assert.ok(Number.isInteger(path.clip) && path.clip >= 0 && path.clip < 2, entry.code + ' resolves every path to exactly one leaf');
        }
      }
    }
  });

  registerProjectionCases({ test, load, render, tags, PieceDiagram }, './data/french-door-eco-additions-20261123.json', 66, 'ECO');
};

// The same physical projection guarantees apply to each separately approved batch.
function registerProjectionCases({ test, load, render, tags, PieceDiagram }, manifestFile, count, label) {
  test('All ' + count + ' ' + label + ' motifs preserve paths, leaf centers, source clips and selected finish across dimensions and active sides', () => {
    const manifest = require(manifestFile);
    assert.equal(manifest.entries.length, count);
    const catalog = load(catalogFile);
    for (const entry of manifest.entries) {
      const artwork = catalog[entry.artworkKey];
      const single = entry.kind === 'SINGLE';
      const sizes = single
        ? [['X', { width: 28, height: 96 }], ['OX', { width: 60, height: 72, doorWidth: 42 }]]
        : [['XX', { width: 64, height: 96 }], ['OXXO', { width: 120, height: 72, doorWidth: 84, leftSideliteWidth: 18, rightSideliteWidth: 18 }]];
      for (const [configuration, piece] of sizes) for (const activeOptionName of ['Left Active', 'Right Active'])
        for (const frameColorHex of ['#FFFFFF', '#704A35']) {
          const html = render(PieceDiagram, { diagramFamily: 'FRENCH_DOOR', systemName: 'Serie 600', configuration,
            activeOptionName, preparationOptionName: '2 Holes', frameColorHex, glassTintHex: '#FFFFFF',
            hasCoating: false, hasPrivacy: false, showDimensions: false, variant: 'report',
            piece: { ...piece, doorDesignSnapshot: { artworkKey: entry.artworkKey } } });
          const label = entry.code + ' ' + configuration + ' ' + activeOptionName;
          assert.equal((html.match(/data-layer="FRENCH_DOOR_DESIGN"/g) ?? []).length, 1, label);
          assert.ok(html.includes('data-artwork-key="' + entry.artworkKey + '"'), label);
          assert.equal(tags(html, 'image').length, 0, label + ' stays vector');
          assert.doesNotMatch(html, /NaN|Infinity|data-glass-effect=/);
          const clipMarkup = html.match(/<clipPath id="[^"]*-design-lights">(.*?)<\/clipPath>/s)[1];
          const openings = tags(clipMarkup, 'rect');
          const rects = tags(html, 'rect');
          const glass = rects.filter(rect => rect['data-part'] === (single ? 'single-glass' : 'double-glass'));
          assert.equal(openings.length, artwork.leafCount);
          assert.equal(glass.length, artwork.leafCount);
          openings.forEach((opening, index) => {
            for (const property of ['y', 'width', 'height']) near(Number(opening[property]), Number(glass[index][property]), label + ' clip ' + property);
            if (!single || activeOptionName === 'Right Active') near(Number(opening.x), Number(glass[index].x), label + ' clip x');
          });
          const mask = html.match(/<mask\b[^>]*id="[^"]*-design-mask"[^>]*>(.*?)<\/mask>/s)[1];
          const paths = tags(mask, 'path');
          assert.deepEqual(paths.map(path => path.d), artwork.paths.map(path => path.d), label + ' keeps the complete source path order');
          paths.forEach((path, index) => {
            assert.equal(path.transform, undefined, label + ' never flips the source motif');
            assert.equal(Number(path['stroke-width']), artwork.paths[index].width);
            assert.equal(path.fill, artwork.paths[index].filled ? 'white' : 'none');
            assert.equal(path['fill-rule'], artwork.paths[index].fillRule);
          });
          const viewport = tags(mask, 'svg')[0];
          const [sourceX, sourceY, sourceWidth, sourceHeight] = artwork.viewBox.split(' ').map(Number);
          assert.equal(viewport.viewBox, artwork.viewBox);
          assert.equal(viewport.preserveAspectRatio, 'none');
          const toX = value => Number(viewport.x) + (value - sourceX) * Number(viewport.width) / sourceWidth;
          const toY = value => Number(viewport.y) + (value - sourceY) * Number(viewport.height) / sourceHeight;
          const projections = [...mask.matchAll(/<svg\b([^>]*data-leaf-projection="\d+"[^>]*)>(.*?)<\/svg>/gs)];
          if (single) {
            assert.equal(projections.length, 0);
            near(toX(sourceX + sourceWidth / 2), Number(openings[0].x) + Number(openings[0].width) / 2, label + ' single source center');
            near(toY(sourceY + sourceHeight / 2), Number(openings[0].y) + Number(openings[0].height) / 2, label + ' single source center y');
          } else {
            assert.equal(projections.length, artwork.paths.length, label + ' projects every shape once onto its own leaf');
            projections.forEach((match, index) => {
              const projected = tags('<svg ' + match[1] + '>', 'svg')[0];
              const clipIndex = artwork.paths[index].clip;
              assert.equal(Number(projected['data-leaf-projection']), clipIndex);
              assert.deepEqual(tags(match[2], 'path').map(path => path.d), [artwork.paths[index].d]);
              assert.ok(tags(match[2], 'g').some(group => group['clip-path']?.endsWith('-source-clip-' + clipIndex + ')')), label + ' keeps the source clip');
              const source = artwork.clips[clipIndex];
              assert.equal(projected.viewBox, [source.x, source.y, source.width, source.height].join(' '));
              assert.equal(projected.overflow, 'hidden');
              assert.equal(projected.preserveAspectRatio, 'none');
              const pane = openings[clipIndex];
              near(toX(Number(projected.x)), Number(pane.x), label + ' projected left edge');
              near(toX(Number(projected.x) + Number(projected.width)), Number(pane.x) + Number(pane.width), label + ' projected right edge');
              near(toX(Number(projected.x) + Number(projected.width) / 2), Number(pane.x) + Number(pane.width) / 2, label + ' source leaf center');
              near(toY(Number(projected.y)), Number(pane.y), label + ' projected top edge');
              near(toY(Number(projected.y) + Number(projected.height)), Number(pane.y) + Number(pane.height), label + ' projected bottom edge');
            });
          }
          const finish = rects.find(rect => rect['data-part'] === (single ? 'single-leaf' : 'double-leaf')).fill;
          assert.equal(rects.find(rect => rect.mask?.includes('-design-mask')).fill, finish, label + ' inherits the actual leaf finish');
          const details = artwork.details ?? [];
          const detailMarkup = html.match(/<svg\b[^>]*data-part="design-panel-joints"[^>]*>(.*?)<\/svg>(?=<\/g>)/s)?.[1];
          if (details.length) {
            assert.ok(detailMarkup, label + ' retains board joints');
            assert.deepEqual(tags(detailMarkup, 'path').map(path => path.d), details.map(path => path.d));
            assert.deepEqual(tags(detailMarkup, 'svg').map(svg => Number(svg['data-leaf-projection'])), single ? [] : details.map(path => path.clip));
          }
        }
    }
  });
}
module.exports.registerProjectionCases = registerProjectionCases;
