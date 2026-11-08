/* Import the supplied vector catalog, without labels, source colors, or raster data.
 * Run: node scripts/import-french-door-artwork.cjs <source DD directory> <manifest.json>
 * The manifest is an array of { key: 'SD02', source: 'SD-B/OLD-SD-B02.svg' }.
 * Optional panels selects door-only artwork from a source including a sidelite.
 * Optional panelJoints restores the solid board seams visible in the original PDF.
 * Existing approved 01 artwork is deliberately preserved byte for byte as data.
 * Bronze (B) is the canonical catalog numbering: white (W) sources renumber or
 * mirror some motifs. Color variants are not separate designs. SD97/98/99 are
 * excluded because their door-only artwork repeats SD55/54/40 after removing
 * the sidelites, which never receive decorative artwork in this application.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { DOMParser } = require('@xmldom/xmldom');

const round = number => Number(Number(number).toFixed(3));
const numberPattern = /[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g;
const children = node => Array.from(node.childNodes).filter(child => child.nodeType === 1);
function clipRectangle(node) {
  const shapes = children(node);
  assert.equal(shapes.length, 1, 'Only rectangular source clips are supported');
  const shape = shapes[0];
  if (shape.localName === 'rect') return Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, Number(shape.getAttribute(key) || 0)]));
  assert.equal(shape.localName, 'path');
  const d = shape.getAttribute('d');
  assert.match(d, /^[MLZmlz\s\d.,+-]+$/, 'A new clip shape requires an explicit importer update');
  const values = (d.match(numberPattern) || []).map(Number);
  assert.equal(values.length % 2, 0);
  const points = [];
  for (let i = 0; i < values.length; i += 2) points.push([values[i], values[i + 1]]);
  const xs = [...new Set(points.map(point => point[0]))];
  const ys = [...new Set(points.map(point => point[1]))];
  assert.equal(xs.length, 2); assert.equal(ys.length, 2);
  for (let i = 1; i < points.length; i++) assert.ok(points[i][0] === points[i - 1][0] || points[i][1] === points[i - 1][1]);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}
function intersection(a, b) {
  if (!a) return b;
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  return { x, y, width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - x), height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - y) };
}
function importSvg(filename, leafCount, panelIndexes) {
  const source = fs.readFileSync(filename, 'utf8');
  assert.doesNotMatch(source, /<!DOCTYPE|<!ENTITY|<image\b|<script\b|<foreignObject\b|\bon\w+=/i);
  const document = new DOMParser({ errorHandler: { warning: error => { throw new Error(error); }, error: error => { throw new Error(error); }, fatalError: error => { throw new Error(error); } } }).parseFromString(source, 'image/svg+xml');
  const root = document.documentElement;
  const byId = new Map();
  for (const node of Array.from(root.getElementsByTagName('*'))) if (node.hasAttribute('id')) {
    assert.ok(!byId.has(node.getAttribute('id')), `Duplicate source id in ${filename}`);
    byId.set(node.getAttribute('id'), node);
  }
  const sourcePanels = children(root).filter(node => /^artwork_panel_\d+$/.test(node.getAttribute('id')));
  const panels = panelIndexes ? panelIndexes.map(index => {
    const panel = sourcePanels.find(node => node.getAttribute('id') === `artwork_panel_${index}`);
    assert.ok(panel, `Missing specified source panel in ${filename}`);
    return panel;
  }) : sourcePanels;
  assert.equal(panels.length, leafCount, `Unexpected source leaf count in ${filename}`);
  const clipFor = node => {
    const reference = node.getAttribute('clip-path');
    if (!reference) return null;
    const match = /^url\(#([\w-]+)\)$/.exec(reference);
    assert.ok(match, `Invalid source clip in ${filename}`);
    const clip = byId.get(match[1]);
    assert.ok(clip && clip.localName === 'clipPath');
    return clipRectangle(clip);
  };
  const paneRects = panels.map(clipFor);
  assert.ok(paneRects.every(Boolean));
  const x = Math.min(...paneRects.map(rect => rect.x)), y = Math.min(...paneRects.map(rect => rect.y));
  const width = Math.max(...paneRects.map(rect => rect.x + rect.width)) - x;
  const height = Math.max(...paneRects.map(rect => rect.y + rect.height)) - y;
  const design = { leafCount, viewBox: [x, y, width, height].map(round).join(' '), paths: [], clips: [] };
  const clipIndexes = new Map();
  function visit(node, inheritedClip) {
    assert.ok(!node.hasAttribute('transform'), `Source transforms need explicit support in ${filename}`);
    if (node.localName === 'defs') return;
    const ownClip = clipFor(node);
    const clip = ownClip ? intersection(inheritedClip, ownClip) : inheritedClip;
    if (node.localName === 'g') { children(node).forEach(child => visit(child, clip)); return; }
    assert.equal(node.localName, 'path', `Unexpected artwork shape in ${filename}`);
    const fill = node.getAttribute('fill');
    const stroke = node.getAttribute('stroke');
    assert.ok(fill && stroke, `Explicit source paint required in ${filename}`);
    const drawable = { width: stroke === 'none' ? 0 : round(node.getAttribute('stroke-width')), d: node.getAttribute('d').replace(numberPattern, value => String(round(value))) };
    assert.ok(drawable.d && Number.isFinite(drawable.width));
    if (fill !== 'none') drawable.filled = true;
    assert.ok(drawable.filled || drawable.width > 0, `Invisible source artwork in ${filename}`);
    if (node.getAttribute('fill-rule') === 'evenodd') drawable.fillRule = 'evenodd';
    for (const [attribute, target, defaultValue] of [['stroke-linecap', 'lineCap', 'butt'], ['stroke-linejoin', 'lineJoin', 'miter']]) {
      const value = node.getAttribute(attribute);
      if (value && value !== defaultValue) drawable[target] = value;
    }
    if (node.hasAttribute('stroke-miterlimit')) drawable.miterLimit = Number(node.getAttribute('stroke-miterlimit'));
    if (clip) {
      const normalized = Object.fromEntries(Object.entries(clip).map(([key, value]) => [key, round(value)]));
      const key = JSON.stringify(normalized);
      if (!clipIndexes.has(key)) { clipIndexes.set(key, design.clips.length); design.clips.push(normalized); }
      drawable.clip = clipIndexes.get(key);
    }
    design.paths.push(drawable);
  }
  panels.forEach(panel => visit(panel, null));
  assert.ok(design.paths.length);
  return design;
}

function main() {
  const [sourceDirectory, manifestFile] = process.argv.slice(2);
  assert.ok(sourceDirectory && manifestFile, 'Provide source directory and verified manifest');
  const target = path.resolve(__dirname, '../src/components/piece-diagram/renderers/french-door/french-door-designs.json');
  const approved = JSON.parse(fs.readFileSync(target, 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const result = {};
  for (const row of manifest) {
    assert.match(row.key, /^(SD|DD)\d{2,3}$/);
    assert.ok(!Object.hasOwn(result, row.key), `Duplicate artwork key ${row.key}`);
    const leafCount = row.key.startsWith('SD') ? 1 : 2;
    result[row.key] = row.key === 'SD01' || row.key === 'DD01' ? approved[row.key] : importSvg(path.resolve(sourceDirectory, row.source), leafCount, row.panels);
    assert.ok(result[row.key]);
    if (row.panelJoints) {
      const design = result[row.key];
      assert.equal(design.paths.length, leafCount);
      design.details = [];
      for (const shape of design.paths) {
        assert.ok(shape.filled && shape.width === 0);
        const coordinates = shape.d.match(numberPattern).map(Number);
        const xs = coordinates.filter((_, i) => i % 2 === 0), ys = coordinates.filter((_, i) => i % 2 === 1);
        const left = Math.min(...xs), top = Math.min(...ys), right = Math.max(...xs), bottom = Math.max(...ys);
        const rail = round(top + (bottom - top) * row.panelJoints.railFraction);
        design.details.push({ d: `M ${left},${rail} L ${right},${rail}`, width: row.panelJoints.width });
        for (const fraction of row.panelJoints.verticalFractions) {
          const x = round(left + (right - left) * fraction);
          design.details.push({ d: `M ${x},${rail} L ${x},${bottom}`, width: row.panelJoints.width });
        }
      }
    }
  }
  assert.ok(result.SD01 && result.DD01);
  fs.writeFileSync(target, JSON.stringify(result, null, 2) + '\n');
  console.log(`Imported ${Object.keys(result).length} designs (${fs.statSync(target).size} bytes).`);
}
if (require.main === module) main();
module.exports = { importSvg };
