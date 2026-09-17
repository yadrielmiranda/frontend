import { createElement, type ReactNode } from 'react';
import { TERMS_TYPOGRAPHY, type TermsNode } from './platform-terms-rich-content';

// Se generan únicamente elementos permitidos de React, sin insertar HTML recibido.
export function PlatformTermsRichText({ document }: { document: TermsNode }) {
  function render(node: TermsNode, key: number, depth = 0): ReactNode {
    if (depth > 20) return null;
    const children = node.content?.map((child, index) => render(child, index, depth + 1));
    const attrs = node.attrs ?? {};
    if (node.type === 'text') {
      let result: ReactNode = node.text;
      for (const mark of node.marks ?? []) {
        const tags: Record<string, string> = { bold: 'strong', italic: 'em', underline: 'u', strike: 's' };
        if (tags[mark.type]) result = createElement(tags[mark.type], {}, result);
        else if (mark.type === 'link' && typeof mark.attrs?.href === 'string' && /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(mark.attrs.href.trim()))
          result = <a href={mark.attrs.href} target="_blank" rel="noopener noreferrer">{result}</a>;
      }
      return <span key={key}>{result}</span>;
    }
    switch (node.type) {
      case 'doc': return <div key={key}>{children}</div>;
      case 'paragraph': return <p key={key}>{children?.length ? children : <br />}</p>;
      case 'heading': return createElement(`h${Math.min(6, Math.max(2, Number(attrs.level) || 2))}`, { key }, children);
      case 'hardBreak': return <br key={key} />;
      case 'horizontalRule': return <hr key={key} />;
      case 'bulletList': return <ul key={key}>{children}</ul>;
      case 'orderedList': {
        const styles: Record<string, 'decimal' | 'lower-alpha' | 'upper-alpha' | 'lower-roman' | 'upper-roman'> = {
          '1': 'decimal', a: 'lower-alpha', A: 'upper-alpha', i: 'lower-roman', I: 'upper-roman',
        };
        return <ol key={key} start={attrs.start ?? 1} style={{ listStyleType: styles[attrs.type] ?? 'decimal' }}>{children}</ol>;
      }
      case 'listItem': return <li key={key} value={attrs.value ?? undefined}>{children}</li>;
      case 'blockquote': return <blockquote key={key}>{children}</blockquote>;
      case 'table': return <table key={key}><tbody>{children}</tbody></table>;
      case 'tableRow': return <tr key={key}>{children}</tr>;
      case 'tableCell': return <td key={key} colSpan={attrs.colspan ?? 1} rowSpan={attrs.rowspan ?? 1}>{children}</td>;
      case 'tableHeader': return <th key={key} colSpan={attrs.colspan ?? 1} rowSpan={attrs.rowspan ?? 1}>{children}</th>;
      default: return null;
    }
  }
  return <article aria-label="Terms and Conditions text" className={TERMS_TYPOGRAPHY}>{render(document, 0)}</article>;
}
