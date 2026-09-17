import type { TermsNode } from './platform-terms-rich-content';

type Line = { text: string; x: number; y: number; size: number };

// Se extrae texto localmente; el archivo original nunca se envía al backend.
export async function importTermsPdf(file: File, progress: (message: string) => void): Promise<TermsNode> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, stopAtErrors: true });
  let passwordRequired = false;
  task.onPassword = () => { passwordRequired = true; void task.destroy(); };
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 100) throw new Error('Import a document with up to 100 pages.');
    const blocks: TermsNode[] = [];
    let totalCharacters = 0;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      progress(`Reading page ${pageNumber} of ${pdf.numPages}...`);
      const page = await pdf.getPage(pageNumber);
      const text = await page.getTextContent();
      const lines: Line[] = [];
      let line: Line | null = null;
      let right = 0;
      const finish = () => { if (line?.text.trim()) lines.push({ ...line, text: line.text.trim() }); line = null; };
      const sizes = new Map<number, number>();
      for (const item of text.items) {
        if (!('str' in item)) continue;
        const size = Math.max(1, Math.hypot(item.transform[2], item.transform[3]));
        const x = item.transform[4];
        const y = item.transform[5];
        if (line && Math.abs(y - line.y) > Math.max(2, size * 0.3)) finish();
        if (!line) line = { text: '', x, y, size };
        if (line.text && item.str && !/\s$/.test(line.text) && !/^\s/.test(item.str) && x - right > size * 0.15) line.text += ' ';
        line.text += item.str;
        line.size = Math.max(line.size, size);
        right = x + item.width;
        sizes.set(Math.round(size), (sizes.get(Math.round(size)) ?? 0) + item.str.length);
        totalCharacters += item.str.length;
        if (totalCharacters > 350000) throw new Error('This document is too long to import.');
        if (item.hasEOL) finish();
      }
      finish();
      if (!lines.length) throw new Error(`Page ${pageNumber} has no selectable text. Import the Word file or export a searchable PDF first.`);
      const bodySize = [...sizes].sort((a, b) => b[1] - a[1])[0]?.[0] || 12;
      const gaps = lines.slice(1).map((item, index) => Math.abs(lines[index].y - item.y)).filter(gap => gap > bodySize * 0.5 && gap < bodySize * 2.5).sort((a, b) => a - b);
      const usualGap = gaps[Math.floor(gaps.length / 2)] ?? bodySize * 1.3;
      let paragraph = '';
      const flush = () => { if (paragraph) blocks.push({ type: 'paragraph', content: [{ type: 'text', text: paragraph }] }); paragraph = ''; };
      for (let index = 0; index < lines.length; index++) {
        const item = lines[index];
        const previous = lines[index - 1];
        const isHeading = item.text.length < 180 && (item.size > bodySize * 1.18 || (/^[A-Z\d\s.,:;&()/'’—–-]+$/.test(item.text) && /[A-Z]{3}/.test(item.text) && item.text.length < 100));
        const listStart = /^(?:[•●▪-]\s+|\d+[.)]\s+)/.test(item.text);
        const gap = previous ? Math.abs(previous.y - item.y) : 0;
        if (isHeading || listStart || gap > usualGap * 1.35 || (previous && Math.abs(item.x - previous.x) > bodySize * 2)) flush();
        if (isHeading) blocks.push({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: item.text }] });
        else paragraph += (paragraph ? ' ' : '') + item.text;
      }
      flush();
      page.cleanup();
    }
    return { type: 'doc', content: blocks };
  } catch (error) {
    if (passwordRequired) throw new Error('Remove the PDF password before importing it.');
    throw error;
  } finally { await task.destroy(); }
}

export async function importTermsWord(file: File) {
  const mammoth = await import('mammoth');
  let omittedImages = false;
  try {
    const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, {
      includeEmbeddedStyleMap: false, externalFileAccess: false,
      styleMap: ['u => u', "p[style-name='Title'] => h1:fresh", "p[style-name='Subtitle'] => h2:fresh"],
      convertImage: mammoth.images.imgElement(async () => { omittedImages = true; return { src: '' }; }),
    });
    return { html: result.value, hasWarnings: omittedImages || result.messages.length > 0 };
  } catch {
    throw new Error('Could not read this Word document. Open it in Word and save it as a new .docx file, then try again.');
  }
}
