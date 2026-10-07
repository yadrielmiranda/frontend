const assert = require('node:assert/strict');

module.exports = function register({ test, load, render, tags, PieceDiagram, PieceReportCard, reportPiece }) {
  const { resolveSharedFrenchDoor: resolve } = load('components/piece-diagram/renderers/french-door/series-600-door-resolver.ts');
  const { Series600MixedAssemblyDiagram: MixedDoor } = load('components/piece-diagram/renderers/french-door/series-600-door-diagram.tsx');
  const fixture = {
    diagramFamily: 'FRENCH_DOOR', systemName: 'Serie 675', configuration: 'OXXO',
    dimensionMode: 'ECO_NOVO_DOOR', activeOptionName: 'Left Active',
    preparationOptionName: 'ACTV HDL+DEADBOLT 4 FB (2 HOLES)', frameColorHex: '#FFFFFF',
    piece: { width: null, doorWidth: '68', height: '116', leftSideliteWidth: '34',
      rightSideliteWidth: '34', leftPanels: 3, rightPanels: 3 },
  };
  const structures = html => tags(html, 'image').filter(item => item['data-layer'] === 'FRENCH_DOOR_STRUCTURE');
  const indicators = html => tags(html, 'g').filter(item => item['data-indicator-panel']);

  test('Novo OXXO with three sidelites per side renders its actual eight glass panels at 272 by 116', () => {
    const before = JSON.stringify(fixture);
    const result = resolve(fixture);
    assert.equal(result?.kind, 'MIXED');
    assert.equal(result.configuration, 'OOOXXOOO');
    assert.deepEqual(result.pieces.map(piece => piece.kind), ['O', 'O', 'O', 'XX', 'O', 'O', 'O']);
    assert.deepEqual(result.pieces.map(piece => piece.width), [34, 34, 34, 68, 34, 34, 34]);
    for (const variant of ['editor', 'report']) {
      const html = render(PieceDiagram, { ...fixture, variant });
      assert.match(html, /data-diagram-renderer="SERIES_600_SHARED"/);
      assert.match(html, /272 by 116 inches/);
      assert.equal(structures(html).length, 7);
      assert.equal(indicators(html).length, 8);
      assert.ok(structures(html).some(image => image.href.endsWith('/double-left-active-two-bore.png')));
      const dimensionLabels = [...html.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)]
        .filter(match => /data-screen-font-size/.test(match[1]));
      assert.deepEqual(dimensionLabels.map(match => match[2].replace(/&quot;/g, '"')),
        ['3 × 34"', 'W. 68"', '3 × 34"', 'W. 272"', 'H. 116"']);
    }
    assert.equal(JSON.stringify(fixture), before, 'Drawing never changes saved dimensions');
  });

  test('Novo counts drive single and double assemblies with unequal, one-sided and larger sidelite groups', () => {
    for (const door of ['X', 'XX']) for (const [left, right] of [[0, 3], [3, 0], [1, 2], [3, 4], [4, 1], [5, 3]]) {
      const configuration = `${left ? 'O' : ''}${door}${right ? 'O' : ''}`;
      const props = { ...fixture, configuration, piece: { ...fixture.piece,
        width: '999', doorWidth: door === 'X' ? '36' : '68', leftPanels: left, rightPanels: right,
        leftSideliteWidth: '12', rightSideliteWidth: '14' } };
      const result = resolve(props);
      assert.equal(result?.kind, 'MIXED', `${configuration} ${left}/${right}`);
      assert.equal(result.configuration, `${'O'.repeat(left)}${door}${'O'.repeat(right)}`);
      const total = (door === 'X' ? 36 : 68) + left * 12 + right * 14;
      const html = render(PieceDiagram, props);
      assert.match(html, new RegExp(`${total} by 116 inches`));
      assert.equal(structures(html).length, left + right + 1);
      assert.equal(indicators(html).length, left + right + door.length);
    }
  });

  test('Existing standard French Door combinations retain their sections and total dimensions', () => {
    for (const door of ['X', 'XX']) for (let left = 0; left <= 2; left++) for (let right = 0; right <= 2; right++) {
      if (!left && !right) continue;
      const configuration = `${'O'.repeat(left)}${door}${'O'.repeat(right)}`;
      const width = 68 + left * 34 + right * 34;
      const result = resolve({ ...fixture, configuration, dimensionMode: 'STANDARD', piece: { ...fixture.piece, width } });
      assert.equal(result?.configuration, configuration);
      assert.equal(result.pieces.length, left + right + 1);
      assert.equal(result.pieces.reduce((sum, piece) => sum + piece.width, 0), width);
    }
  });

  test('Incomplete counts and unsupported door layouts remain unresolved instead of drawing an incorrect assembly', () => {
    for (const invalid of [undefined, null, 0, -1, 1.5, 'abc', Infinity]) {
      assert.equal(resolve({ ...fixture, piece: { ...fixture.piece, leftPanels: invalid } }), null);
    }
    for (const configuration of ['OXOXO', 'OXXXO', 'OO', 'QXXO']) {
      assert.equal(resolve({ ...fixture, configuration }), null);
      assert.throws(() => render(MixedDoor, { configuration, pieces: [] }), /Invalid French Door/);
    }
    assert.throws(() => render(MixedDoor, { configuration: 'OOOXXOOO', pieces: [{ kind: 'O', width: 34, height: 116 }] }), /Invalid French Door/);
  });

  test('Excessive French Door counts and configuration lengths stay neutral without allocating huge previews', () => {
    const { mixedDoorPattern, MAX_FRENCH_DOOR_RENDER_SECTIONS: limit } = load('components/piece-diagram/renderers/french-door/mixed-door-pattern.ts');
    for (const count of [limit, 1000000, Number.MAX_SAFE_INTEGER]) {
      for (const field of ['leftPanels', 'rightPanels']) {
        assert.equal(resolve({ ...fixture, piece: { ...fixture.piece, [field]: count } }), null);
      }
    }
    assert.equal(resolve({ ...fixture, piece: { ...fixture.piece, leftPanels: 64, rightPanels: 64 } }), null);
    for (const door of ['X', 'XX']) {
      const atLimit = `${'O'.repeat(limit - 1)}${door}`;
      assert.equal(mixedDoorPattern(atLimit).length, limit);
      assert.equal(mixedDoorPattern(`${'O'.repeat(limit)}${door}`), null);
      assert.equal(mixedDoorPattern(`${'O'.repeat(10000)}${door}`), null);
      const result = resolve({ ...fixture, configuration: `O${door}`, piece: { ...fixture.piece, leftPanels: limit - 1, rightPanels: 0 } });
      assert.equal(result?.pieces.length, limit);
    }
  });

  test('Saved Novo report renders all sidelites without changing the piece or its PDF capture identifier', () => {
    const piece = { ...reportPiece(), ...fixture.piece,
      prod: { name: 'French Door', diagramFamily: 'FRENCH_DOOR' },
      syst: { name: 'Serie 675' }, conf: { conf: 'OXXO', diagramSpec: null },
      diagramMetadata: { dimensionMode: 'ECO_NOVO_DOOR' }, activeOption: { name: fixture.activeOptionName },
      preparationOption: { name: fixture.preparationOptionName }, pieceMuntin: null };
    const before = JSON.stringify(piece);
    const html = render(PieceReportCard, { piece, displayMark: '104', showPrices: false });
    assert.match(html, /data-piece-diagram-id="123"/);
    assert.match(html, /272 by 116 inches/);
    assert.equal(indicators(html).length, 8);
    assert.equal(JSON.stringify(piece), before);
  });
};
