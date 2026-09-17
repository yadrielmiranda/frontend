import type { ReactNode } from 'react';
import { readRichTerms } from './platform-terms-rich-content';
import { PlatformTermsRichText } from './platform-terms-rich-text';

// El contenido se renderiza como texto de React; nunca se interpreta HTML pegado.
function inline(text: string) {
  return text.split(/(\*\*[^*\n]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong> : part);
}

export function PlatformTermsText({ content }: { content: string }) {
  const rich = readRichTerms(content);
  if (rich) return <PlatformTermsRichText document={rich} />;
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  const heading = (line: string) => line.match(/^(#{1,3})\s+(.+)$/);
  const bullet = (line: string) => line.match(/^\s*[-*•]\s+(.+)$/);
  const numbered = (line: string) => line.match(/^\s*(\d+)[.)]\s+(.+)$/);
  for (let index = 0; index < lines.length;) {
    const key = index;
    if (!lines[index].trim()) { index++; continue; }
    const title = heading(lines[index]);
    if (title) {
      const Heading = title[1].length === 3 ? 'h3' : 'h2';
      blocks.push(<Heading key={key} className="pt-3 text-lg font-semibold text-slate-950">{inline(title[2])}</Heading>);
      index++; continue;
    }
    if (bullet(lines[index]) || numbered(lines[index])) {
      const ordered = Boolean(numbered(lines[index]));
      const items: ReactNode[] = [];
      while (index < lines.length) {
        const match = ordered ? numbered(lines[index]) : bullet(lines[index]);
        if (!match) break;
        items.push(<li key={index} value={ordered ? Number(match[1]) : undefined}>{inline(match[ordered ? 2 : 1])}</li>);
        index++;
      }
      blocks.push(ordered
        ? <ol key={key} className="list-decimal space-y-2 pl-6">{items}</ol>
        : <ul key={key} className="list-disc space-y-2 pl-6">{items}</ul>);
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !heading(lines[index]) && !bullet(lines[index]) && !numbered(lines[index])) {
      paragraph.push(lines[index++]);
    }
    blocks.push(<p key={key} className="whitespace-pre-line">{inline(paragraph.join('\n'))}</p>);
  }
  return <article aria-label="Terms and Conditions text" className="space-y-5 break-words leading-relaxed text-slate-700 [overflow-wrap:anywhere]">{blocks}</article>;
}
