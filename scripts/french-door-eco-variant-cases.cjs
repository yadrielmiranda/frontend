const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { registerProjectionCases } = require('./french-door-eco-cases.cjs');

const catalogFile = 'components/piece-diagram/renderers/french-door/french-door-designs.json';
const sourceIds = {
  SD: [5, 15, 16, 17, 18, 19, 20, 23, 24, 25, 27, 29, 31, 32, 34, 35, 39, 41, 45, 51, 57, 58, 61, 63, 64, 67, 68, 69, 70, 73, 74, 78, 88, 89, 90, 92, 93, 96, 98, 104, 106, 107],
  DD: [5, 7, 10, 14, 16, 18, 19, 20, 22, 26, 27, 28, 31, 32, 34, 35, 36, 39, 40, 42, 43, 44, 45, 47, 48, 52, 56, 57, 58, 65, 66, 72, 74, 77, 79, 80, 85],
};
const sourceFiles = {
  SD: { name: 'Document.pdf', hash: 'e0cc434f4bfeb2f92a8b8071ee301b8e6506a08ca56f403e90417561db908a74', columns: 5 },
  DD: { name: 'Document-3.pdf', hash: 'fea9eb3a2406743f54b9d46d35f758bf9f7f23374b1c546a317448e8ce51a8e2', columns: 3 },
};
const mirrored = ['SD153', 'SD155', 'SD165', 'SD171'];


// Sample the real vector mask, not a screenshot or a final catalog bitmap.
// The test runner is synchronous, so Sharp executes in a bounded child process.
function sampleMask({ load, render }, key, samples) {
  const { spawnSync } = require('node:child_process');
  const artwork = load(catalogFile)[key];
  const { FrenchDoorDesignArtwork } = load('components/piece-diagram/renderers/french-door/french-door-design-artwork.tsx');
  const [x, y, width, height] = artwork.viewBox.split(' ').map(Number);
  const React = require('react');
  const IsolatedArtwork = props => React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg' }, React.createElement(FrenchDoorDesignArtwork, props));
  const html = render(IsolatedArtwork, { artworkKey: key, panes: [{ x, y, width, height }],
    frameColor: '#FFFFFF', finishId: 'test-finish', idNamespace: 'semantic-' + key });
  const mask = html.match(/<mask\b[^>]*>(.*?)<\/mask>/s)[1];
  const clips = [...html.matchAll(/<clipPath\b[^>]*>.*?<\/clipPath>/gs)].map(match => match[0]).join('');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="1800" viewBox="' + artwork.viewBox + '" preserveAspectRatio="none">' +
    '<defs>' + clips + '</defs><rect x="' + x + '" y="' + y + '" width="' + width + '" height="' + height + '" fill="black"/>' + mask + '</svg>';
  const program = [
    "let input = ''; process.stdin.setEncoding('utf8'); process.stdin.on('data', chunk => input += chunk);",
    "process.stdin.on('end', async () => { try { const payload = JSON.parse(input);",
    "const { data, info } = await require('sharp')(Buffer.from(payload.svg)).removeAlpha().raw().toBuffer({ resolveWithObject: true });",
    "const samples = payload.samples.map(point => { const x = Math.min(info.width - 1, Math.floor(point.x * info.width));",
    "const y = Math.min(info.height - 1, Math.floor(point.y * info.height)); return data[(y * info.width + x) * info.channels]; });",
    "let solid = 0; for (let p = 0; p < data.length; p += info.channels) if (data[p] > 127) solid++;",
    "process.stdout.write(JSON.stringify({ samples, solidFraction: solid / (info.width * info.height) }));",
    "} catch (error) { console.error(error); process.exitCode = 1; } });",
  ].join('\n');
  const result = spawnSync(process.execPath, ['-e', program], {
    cwd: require('node:path').resolve(__dirname, '..'), input: JSON.stringify({ svg, samples }), encoding: 'utf8', timeout: 15000,
  });
  assert.equal(result.status, 0, key + ': isolated mask sampling failed: ' + (result.error?.message ?? result.stderr));
  return JSON.parse(result.stdout);
}

function assertFixedExteriorOrientation({ load, render, tags, PieceDiagram }, key) {
  const catalog = load(catalogFile);
  const ancestorsOfDesign = html => {
    const stack = [];
    for (const match of html.matchAll(/<(\/?)g\b([^>]*)>/g)) {
      if (match[1]) stack.pop();
      else {
        const attributes = tags('<g ' + match[2] + '>', 'g')[0];
        if (attributes['data-layer'] === 'FRENCH_DOOR_DESIGN') return stack.filter(Boolean);
        stack.push(attributes.transform);
      }
    }
    assert.fail('Missing exterior design layer');
  };
  const views = ['Left Active', 'Right Active'].map(activeOptionName => {
    const html = render(PieceDiagram, { diagramFamily: 'FRENCH_DOOR', systemName: 'Serie 600', configuration: 'X',
      activeOptionName, preparationOptionName: '2 Holes', frameColorHex: '#FFFFFF', glassTintHex: '#FFFFFF',
      showDimensions: false, piece: { width: 36, height: 80 }, frenchDoorDesignKey: key });
    const mask = html.match(/<mask\b[^>]*id="[^"]*-design-mask"[^>]*>(.*?)<\/mask>/s)[1];
    assert.deepEqual(tags(mask, 'path').map(path => path.d), catalog[key].paths.map(path => path.d));
    assert.ok([...tags(mask, 'path'), ...tags(mask, 'svg')].every(shape => shape.transform === undefined), 'The source geometry is never mirrored or rotated');
    return ancestorsOfDesign(html);
  });
  assert.deepEqual(views[0], views[1], 'Changing active hardware must not mirror the exterior design ancestors');
}

module.exports = function register({ test, load, render, tags, PieceDiagram }) {
  test('ECO variants add exactly 42 single and 37 double sources while preserving every prior 285 drawing', () => {
    const manifest = require('./data/french-door-eco-variants-20261123.json');
    const catalog = load(catalogFile);
    const expected = Object.entries(sourceIds).flatMap(([prefix, ids]) => ids.map((sourceId, index) => {
      const artworkKey = prefix + ((prefix === 'SD' ? 152 : 135) + index);
      return { code: 'AE-' + prefix + '-' + ((prefix === 'SD' ? 152 : 135) + index), artworkKey,
        kind: prefix === 'SD' ? 'SINGLE' : 'DOUBLE',
        sourceCode: (prefix === 'SD' ? 'EWSWH' : 'EWDWH') + String(sourceId).padStart(3, '0'), sourceId,
        sourceFile: sourceFiles[prefix].name, sourceSha256: sourceFiles[prefix].hash,
        page: 2 + Math.floor((sourceId - 1) / sourceFiles[prefix].columns), slot: (sourceId - 1) % sourceFiles[prefix].columns,
        classification: mirrored.includes(artworkKey) ? 'M' : 'D',
      };
    }));
    assert.equal(manifest.entries.length, 79);
    assert.deepEqual(manifest.entries.map(({ observation, ...entry }) => entry), expected,
      'The approved source-to-code mapping, source digest, position and D/M classification are immutable');
    assert.ok(manifest.entries.every(entry => typeof entry.observation === 'string' && entry.observation.trim().length > 0));
    for (const property of ['artworkKey', 'code', 'sourceCode']) assert.equal(new Set(manifest.entries.map(entry => entry[property])).size, 79);
    const previous = Object.fromEntries(Object.entries(catalog).filter(([key]) => Number(key.slice(2)) <= (key.startsWith('SD') ? 151 : 134)));
    assert.equal(Object.keys(previous).length, 285);
    assert.equal(manifest.baseline285Sha256, 'cc6449d9955f238db2fc061943a98d18982cba748f024592b25eca367b9848d1');
    assert.equal(createHash('sha256').update(JSON.stringify(previous)).digest('hex'), manifest.baseline285Sha256);
    assert.deepEqual(Object.keys(catalog).filter(key => !Object.hasOwn(previous, key)).sort(), expected.map(entry => entry.artworkKey).sort());
    assert.equal(createHash('sha256').update(JSON.stringify(catalog.SD11)).digest('hex'),
      '7b0bbaebdf3c2443330389d9a44ba7bd34f7e939a93412610591457fa3e9e84d', 'The existing SD11 must not be mirrored or replaced');
    for (const entry of expected) {
      const artwork = catalog[entry.artworkKey];
      assert.equal(artwork.leafCount, entry.kind === 'SINGLE' ? 1 : 2);
      assert.equal(artwork.projection, entry.kind === 'DOUBLE' ? 'leaf' : undefined);
      if (entry.kind === 'DOUBLE') {
        assert.equal(artwork.clips.length, 2);
        for (const path of [...artwork.paths, ...(artwork.details ?? [])]) {
          assert.ok(Number.isInteger(path.clip) && path.clip >= 0 && path.clip < 2, entry.code + ' resolves each shape to one leaf');
        }
      }
    }
  });


  test('EWSWH093 opens to the right in exterior view independently of the active hardware side', () => {
    // Measured in the original EWSWH093-door.png opening, normalized to its glass.
    // These points sit well inside glass/metal regions rather than on blurred source edges.
    const samples = [
      { x: 0.05, y: 0.11, solid: false }, { x: 0.05, y: 0.90, solid: false },
      { x: 0.95, y: 0.50, solid: false }, { x: 0.95, y: 0.11, solid: true },
      { x: 0.95, y: 0.90, solid: true }, { x: 0.95, y: 0.25, solid: true },
    ];
    const raster = sampleMask({ load, render }, 'SD188', samples);
    raster.samples.forEach((value, index) => assert.ok(samples[index].solid ? value >= 230 : value <= 25,
      'EWSWH093 source anchor ' + JSON.stringify(samples[index]) + ' must remain ' + (samples[index].solid ? 'metal' : 'glass') + ', got ' + value));
    assertFixedExteriorOrientation({ load, render, tags, PieceDiagram }, 'SD188');
  });


  test('Negative EWSWH089 and EWSWH096 keep their source glass cutouts inside predominantly solid panels', () => {
    // Anchors were measured independently in the original 4108-pixel source openings.
    // They are deliberately inside the branch/slot or panel, away from source-edge blur.
    const cases = [
      { key: 'SD185', source: 'EWSWH089',
        glass: [[.14, .152], [.5, .285], [.236, .594], [.694, .509], [.694, .760]],
        metal: [[.111, .285], [.833, .380], [.556, .608], [.778, .951], [.333, .057]] },
      { key: 'SD189', source: 'EWSWH096',
        glass: [[.167, .38], [.394, .428], [.833, .333], [.667, .50], [.50, .0665]],
        metal: [[.278, .333], [.506, .475], [.936, .095], [.50, .903]] },
    ];
    for (const entry of cases) {
      const samples = [
        ...entry.glass.map(([x, y]) => ({ x, y, solid: false })),
        ...entry.metal.map(([x, y]) => ({ x, y, solid: true })),
      ];
      const raster = sampleMask({ load, render }, entry.key, samples);
      raster.samples.forEach((value, index) => assert.ok(samples[index].solid ? value >= 230 : value <= 25,
        entry.source + ' source anchor ' + JSON.stringify(samples[index]) + ' must remain ' + (samples[index].solid ? 'metal' : 'glass') + ', got ' + value));
      assert.ok(raster.solidFraction > .55, entry.source + ' preserves negative polarity; solid fraction=' + raster.solidFraction);
    }
  });


  test('The four approved mirror variants retain their source-side anchors when hardware changes active side', () => {
    // Normalized anchors independently checked against the original PDF crops and vector review:
    // sd-a-orientation.json / sd-a-orientation-check.json in ECO-WH-79-20261123.
    // Each pair deliberately occupies opposite horizontal positions to catch an accidental mirror.
    const cases = [
  {
    "artworkKey": "SD153",
    "sourceCode": "EWSWH015",
    "pairs": [
      {
        "ink": [
          0.164804469273743,
          0.1520912547528517
        ],
        "clear": [
          0.835195530726257,
          0.1520912547528517
        ]
      },
      {
        "ink": [
          0.4581005586592179,
          0.49809885931558934
        ],
        "clear": [
          0.5418994413407822,
          0.49809885931558934
        ]
      }
    ]
  },
  {
    "artworkKey": "SD155",
    "sourceCode": "EWSWH017",
    "pairs": [
      {
        "ink": [
          0.2916666666666667,
          0.5
        ],
        "clear": [
          0.7083333333333334,
          0.5
        ]
      },
      {
        "ink": [
          0.5416666666666666,
          0.5
        ],
        "clear": [
          0.4583333333333333,
          0.5
        ]
      }
    ]
  },
  {
    "artworkKey": "SD165",
    "sourceCode": "EWSWH032",
    "pairs": [
      {
        "ink": [
          0.825,
          0.1482889733840304
        ],
        "clear": [
          0.175,
          0.1482889733840304
        ]
      },
      {
        "ink": [
          0.17777777777777778,
          0.38593155893536124
        ],
        "clear": [
          0.8222222222222222,
          0.38593155893536124
        ]
      }
    ]
  },
  {
    "artworkKey": "SD171",
    "sourceCode": "EWSWH051",
    "pairs": [
      {
        "ink": [
          0.2777777777777778,
          0.5
        ],
        "clear": [
          0.7222222222222222,
          0.5
        ]
      },
      {
        "ink": [
          0.2222222222222222,
          0.19011406844106463
        ],
        "clear": [
          0.7777777777777778,
          0.19011406844106463
        ]
      }
    ]
  }
];
    for (const entry of cases) {
      const samples = entry.pairs.flatMap(pair => [
        { x: pair.ink[0], y: pair.ink[1], solid: true },
        { x: pair.clear[0], y: pair.clear[1], solid: false },
      ]);
      const raster = sampleMask({ load, render }, entry.artworkKey, samples);
      raster.samples.forEach((value, index) => assert.ok(samples[index].solid ? value >= 230 : value <= 25,
        entry.sourceCode + ' source anchor ' + JSON.stringify(samples[index]) + ' must remain ' + (samples[index].solid ? 'metal' : 'glass') + ', got ' + value));
      assertFixedExteriorOrientation({ load, render, tags, PieceDiagram }, entry.artworkKey);
    }
  });

  registerProjectionCases({ test, load, render, tags, PieceDiagram }, './data/french-door-eco-variants-20261123.json', 79, 'ECO variant');
};
