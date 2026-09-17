export const TERMS_RICH_TEXT_PREFIX = 'PLATFORM_TERMS_RICH_TEXT_V1\n';
export const TERMS_CONTENT_LIMIT = 500000;

export type TermsNode = {
  type: string;
  text?: string;
  attrs?: Record<string, any>;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
  content?: TermsNode[];
};

export function readRichTerms(content: string): TermsNode | null {
  if (!content.startsWith(TERMS_RICH_TEXT_PREFIX)) return null;
  const value = JSON.parse(content.slice(TERMS_RICH_TEXT_PREFIX.length)) as TermsNode;
  if (value.type !== 'doc' || !Array.isArray(value.content)) throw new Error('Invalid terms document.');
  return value;
}

export function writeRichTerms(document: TermsNode) {
  return TERMS_RICH_TEXT_PREFIX + JSON.stringify(document);
}

function inline(text: string): TermsNode[] {
  return text.split(/(\*\*[^*\n]+\*\*)/g).filter(Boolean).map(part =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? { type: 'text', text: part.slice(2, -2), marks: [{ type: 'bold' }] }
      : { type: 'text', text: part });
}

// Las versiones anteriores se abren visualmente sin cambiar lo que está publicado.
export function termsForEditor(content: string): TermsNode {
  const rich = readRichTerms(content);
  if (rich) return rich;
  const blocks: TermsNode[] = [];
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const heading = (line: string) => line.match(/^(#{1,3})\s+(.+)$/);
  const bullet = (line: string) => line.match(/^\s*[-*•]\s+(.+)$/);
  const numbered = (line: string) => line.match(/^\s*(\d+)[.)]\s+(.+)$/);
  for (let index = 0; index < lines.length;) {
    if (!lines[index].trim()) { index++; continue; }
    const title = heading(lines[index]);
    if (title) {
      blocks.push({ type: 'heading', attrs: { level: title[1].length === 3 ? 3 : 2 }, content: inline(title[2]) });
      index++; continue;
    }
    if (bullet(lines[index]) || numbered(lines[index])) {
      const first = numbered(lines[index]);
      const ordered = Boolean(first);
      const items: TermsNode[] = [];
      while (index < lines.length) {
        const match = ordered ? numbered(lines[index]) : bullet(lines[index]);
        if (!match) break;
        items.push({ type: 'listItem', ...(ordered ? { attrs: { value: Number(match[1]) } } : {}),
          content: [{ type: 'paragraph', content: inline(match[ordered ? 2 : 1]) }] });
        index++;
      }
      blocks.push({ type: ordered ? 'orderedList' : 'bulletList', ...(ordered ? { attrs: { start: Number(first![1]) } } : {}), content: items });
      continue;
    }
    const paragraph: TermsNode[] = [];
    while (index < lines.length && lines[index].trim() && !heading(lines[index]) && !bullet(lines[index]) && !numbered(lines[index])) {
      if (paragraph.length) paragraph.push({ type: 'hardBreak' });
      paragraph.push(...inline(lines[index++]));
    }
    blocks.push({ type: 'paragraph', content: paragraph });
  }
  return { type: 'doc', content: blocks.length ? blocks : [{ type: 'paragraph' }] };
}

export const TERMS_TYPOGRAPHY = 'break-words leading-relaxed text-slate-700 [overflow-wrap:anywhere] [&_p]:my-3 [&_h1]:mt-8 [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:mt-5 [&_h4]:font-semibold [&_h5]:font-semibold [&_h6]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_li_p]:my-1 [&_strong]:font-semibold [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_table]:my-5 [&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:bg-slate-50 [&_th]:p-2 [&_hr]:my-6 [&_ol[type=a]]:[list-style-type:lower-alpha] [&_ol[type=A]]:[list-style-type:upper-alpha] [&_ol[type=i]]:[list-style-type:lower-roman] [&_ol[type=I]]:[list-style-type:upper-roman]';
