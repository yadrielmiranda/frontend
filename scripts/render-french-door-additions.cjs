// Local visual review only. Uses the production React renderer; never contacts an API.
// node scripts/render-french-door-additions.cjs [source-directory] [output-directory]
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sharp = require('sharp');
const frontend = path.resolve(__dirname, '..');
const root = path.join(frontend, 'src');
const sourceRoot = process.argv[2];
if (!sourceRoot) throw new Error('Pass the Este source directory explicitly');
const output = path.resolve(process.argv[3] || path.join(frontend, '../outputs/french-door-catalog/additions-20261123/review'));
const manifest = require('./data/french-door-additions-20261123.json');
const cache = new Map();
function load(filename) {
  filename = path.resolve(root, filename);
  if (cache.has(filename)) return cache.get(filename).exports;
  if (filename.endsWith('.json')) return JSON.parse(fs.readFileSync(filename, 'utf8'));
  const module = { exports: {} }; cache.set(filename, module);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, resolveJsonModule: true } }).outputText;
  new Function('require', 'module', 'exports', code)(id => {
    if (id === 'react' || id === 'react/jsx-runtime') return require(id);
    const target = id.startsWith('@/') ? path.resolve(root, id.slice(2)) : path.resolve(path.dirname(filename), id);
    const candidates = path.extname(target) ? [target] : ['.ts', '.tsx', '.json', '/index.ts', '/index.tsx'].map(ext => target + ext);
    const resolved = candidates.find(file => fs.existsSync(file));
    if (!resolved) throw new Error('Unresolved ' + id);
    return load(resolved);
  }, module, module.exports);
  return module.exports;
}
const { FrenchDoorDesignThumbnail } = load('components/piece-diagram/renderers/french-door/french-door-design-thumbnail.tsx');
const { PieceDiagram } = load('components/piece-diagram/renderers/french-door/series-600-door-diagram.tsx');
const catalog = load('components/piece-diagram/renderers/french-door/french-door-designs.json');
const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const svgFrom = html => html.slice(html.indexOf('<svg'), html.lastIndexOf('</svg>') + 6);
const label = (text, w, h=36) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><text x="${w/2}" y="25" font-family="Arial" font-size="17" text-anchor="middle" fill="#182e3b">${escape(text)}</text></svg>`);
async function main() {
 fs.mkdirSync(output, { recursive: true });
 const rows=[];
 for(const entry of manifest.entries) {
   if(!catalog[entry.artworkKey]) throw new Error('Missing artwork '+entry.artworkKey);
   const original=fs.readFileSync(path.join(sourceRoot,entry.sourceFile));
   const hash=crypto.createHash('sha256').update(original).digest('hex');
   if(hash!==entry.sourceSha256) throw new Error('Source changed: '+entry.sourceFile);
   const sourceName=path.basename(entry.sourceFile);
   const sourcePreview=entry.artworkKey+'-source.png';
   await sharp(original).resize(460,650,{fit:'contain',background:'#ffffff'}).png().toFile(path.join(output,sourcePreview));
   const images=[sourcePreview];
   for(const [name,color] of [['white','#FFFFFF'],['bronze-sample','#704A35']]) {
     const markup=svgFrom(renderToStaticMarkup(React.createElement(FrenchDoorDesignThumbnail,{artworkKey:entry.artworkKey,frameColorHex:color,glassTintHex:'#FFFFFF'})));
     fs.writeFileSync(path.join(output,entry.artworkKey+'-'+name+'.svg'),markup);
     const file=entry.artworkKey+'-'+name+'.png';
     await sharp(Buffer.from(markup)).resize(460,650,{fit:'contain',background:'#ffffff'}).png().toFile(path.join(output,file));
     images.push(file);
   }
   const labels=[sourceName,entry.code+' / blanco / Clear',entry.code+' / bronce muestra / Clear'];
   const composite=images.flatMap((f,i)=>[{input:path.join(output,f),left:i*480+10,top:42},{input:label(labels[i],480),left:i*480,top:0}]);
   const sheet=entry.artworkKey+'-comparison.png';
   await sharp({create:{width:1440,height:700,channels:4,background:'#ffffff'}}).composite(composite).png().toFile(path.join(output,sheet));
   rows.push({entry,images,sheet,sourceName});
 }
 // Boundary report previews include both existing 96 artworks. These are not saved estimates or PDFs.
 for(const key of ['SD96','SD97','SD110','DD96','DD97','DD109']) for(const [name,color] of [['white','#FFFFFF'],['bronze-sample','#704A35']]) for(const [width,height] of [[key.startsWith('SD')?30:60,96],[key.startsWith('SD')?42:84,80]]) {
   const single=key.startsWith('SD');
   const markup=svgFrom(renderToStaticMarkup(React.createElement(PieceDiagram,{diagramFamily:'FRENCH_DOOR',systemName:'Serie 600',configuration:single?'X':'XX',visualTemplate:single?'ECO_SERIES_600_X_EXTERIOR':'ECO_SERIES_600_XX_EXTERIOR',frenchDoorDesignKey:key,piece:{width,height},frameColorHex:color,glassTintHex:'#FFFFFF',showDimensions:true,showMovement:false,variant:'report'})));
   fs.writeFileSync(path.join(output,`${key}-${name}-${width}x${height}-report.svg`),markup);
 }
 const style='body{font:16px system-ui;margin:32px;color:#182e3b;background:#f2f5f7}h1{font-size:28px}section{background:white;padding:20px;margin:24px 0;break-inside:avoid}section img{width:100%;height:auto}nav{display:flex;gap:10px;flex-wrap:wrap}a{color:#135676}p{max-width:1100px;line-height:1.55}code{font-size:14px}';
 const html='<!doctype html><html lang="es"><meta charset="utf-8"><title>French Door: 27 comparaciones</title><style>'+style+'</style><h1>27 dise&ntilde;os French Door: fuentes y render real</h1><p>PNG original a la izquierda; miniaturas del componente real a la derecha. Blanco y bronce de prueba <code>#704A35</code>, vidrio Clear sin tintado, coating ni privacidad. El color bronce del cat&aacute;logo no pudo consultarse porque la base local estaba apagada. Se conserva el acabado existente del renderer, sin reflejos a&ntilde;adidos. Estas l&aacute;minas no prueban persistencia de un estimado ni generaci&oacute;n de su PDF.</p><nav>'+rows.map(r=>`<a href="#${r.entry.artworkKey}">${r.entry.code}</a>`).join('')+'</nav>'+rows.map(r=>`<section id="${r.entry.artworkKey}"><h2>${r.entry.code} &larr; ${r.sourceName}</h2><img src="${r.sheet}" alt="${r.entry.code} comparado con ${r.sourceName}" loading="lazy"><p>Arte inmutable: <code>${r.entry.artworkKey}</code>. <a href="${r.entry.artworkKey}-white.svg">SVG blanco</a> &middot; <a href="${r.entry.artworkKey}-bronze-sample.svg">SVG bronce de prueba</a></p></section>`).join('')+'</html>';
 fs.writeFileSync(path.join(output,'index.html'),html);
 for(const prefix of ['SD','DD']) {
   const group=rows.filter(r=>r.entry.artworkKey.startsWith(prefix));
   const tiles=await Promise.all(group.map(async(r,i)=>({input:await sharp(path.join(output,r.sheet)).resize(960,467).toBuffer(),left:0,top:i*467})));
   await sharp({create:{width:960,height:467*group.length,channels:4,background:'#ffffff'}}).composite(tiles).png().toFile(path.join(output,`all-${prefix}-comparisons.png`));
 }
 for(let start=0;start<rows.length;start+=6) {
   const group=rows.slice(start,start+6);
   const tiles=await Promise.all(group.map(async(r,i)=>({input:await sharp(path.join(output,r.sheet)).resize(720,350).toBuffer(),left:(i%2)*720,top:Math.floor(i/2)*350})));
   await sharp({create:{width:1440,height:Math.ceil(group.length/2)*350,channels:4,background:'#ffffff'}}).composite(tiles).png().toFile(path.join(output,`review-page-${Math.floor(start/6)+1}.png`));
 }
 console.log(JSON.stringify({output,comparisons:rows.length,boundaryReportPreviews:24,sourceHashesVerified:rows.length,actualSavedEstimate:false,actualPdf:false}));
}
main().catch(err=>{console.error(err);process.exitCode=1;});
