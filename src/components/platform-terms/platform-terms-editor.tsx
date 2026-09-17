"use client";

import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ListItem } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TERMS_CONTENT_LIMIT, TERMS_TYPOGRAPHY, termsForEditor, writeRichTerms } from './platform-terms-rich-content';
import { importTermsPdf, importTermsWord } from './platform-terms-import';

const NumberedItem = ListItem.extend({
  addAttributes() {
    return { ...this.parent?.(), value: {
      default: null,
      parseHTML: element => element.hasAttribute('value') ? Number(element.getAttribute('value')) : null,
      renderHTML: attributes => attributes.value == null ? {} : { value: attributes.value },
    } };
  },
});

export function PlatformTermsEditor({ value, disabled, onChange, onValidityChange }: {
  value: string;
  disabled: boolean;
  onChange: (content: string) => void;
  onValidityChange: (valid: boolean) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [tooLarge, setTooLarge] = useState(false);
  const callbacks = useRef({ onChange, onValidityChange });
  callbacks.current = { onChange, onValidityChange };
  const emitted = useRef(value);
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions: [StarterKit.configure({ codeBlock: false, code: false, listItem: false,
      link: { openOnClick: false, autolink: false } }), NumberedItem, TableKit.configure({ table: { resizable: false } })],
    content: termsForEditor(value),
    editorProps: { attributes: {
      role: 'textbox', 'aria-label': 'Terms text', 'aria-multiline': 'true',
      class: `${TERMS_TYPOGRAPHY} min-h-96 px-5 py-3 outline-none [&>:first-child]:mt-0`,
    } },
    onUpdate: ({ editor: current }) => {
      setError(null);
      const content = writeRichTerms(current.getJSON());
      const oversize = content.length > TERMS_CONTENT_LIMIT;
      setTooLarge(oversize);
      emitted.current = content;
      callbacks.current.onChange(content);
      callbacks.current.onValidityChange(!oversize && !current.isEmpty);
    },
  });
  const state = useEditorState({ editor, selector: ({ editor: current }) => current ? {
    bold: current.isActive('bold'), italic: current.isActive('italic'), underline: current.isActive('underline'),
    bullet: current.isActive('bulletList'), numbered: current.isActive('orderedList'),
    level: current.isActive('heading') ? String(current.getAttributes('heading').level) : 'paragraph',
    undo: current.can().undo(), redo: current.can().redo(),
  } : null });
  useEffect(() => { editor?.setEditable(!disabled && !importing, false); }, [editor, disabled, importing]);
  useEffect(() => {
    if (!editor || value === emitted.current) return;
    editor.commands.setContent(termsForEditor(value), { emitUpdate: false });
    emitted.current = value;
  }, [editor, value]);
  useEffect(() => {
    if (editor) callbacks.current.onValidityChange(!importing && !tooLarge && !editor.isEmpty);
  }, [editor, importing, tooLarge]);

  async function importFile(file: File) {
    if (!editor || disabled || importing) return;
    if (!/\.(docx|pdf)$/i.test(file.name)) { setError('Choose a Word (.docx) or PDF file.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Import a file up to 10 MB.'); return; }
    setImporting(true); setError(null); setWarning(null); setProgress('Reading document...');
    try {
      const previous = editor.getJSON();
      if (/\.pdf$/i.test(file.name)) {
        const content = await importTermsPdf(file, setProgress);
        if (writeRichTerms(content).length > TERMS_CONTENT_LIMIT) throw new Error('This document is too long to import.');
        editor.commands.setContent(content, { emitUpdate: false });
        setWarning('Review the imported text before publishing. PDF reading order and paragraph formatting can vary.');
      } else {
        const imported = await importTermsWord(file);
        editor.commands.setContent(imported.html, { emitUpdate: false });
        if (imported.hasWarnings) setWarning('Some document elements may not transfer to the web page. Review all sections before publishing.');
      }
      const content = writeRichTerms(editor.getJSON());
      if (editor.isEmpty || content.length > TERMS_CONTENT_LIMIT) {
        editor.commands.setContent(previous, { emitUpdate: false });
        throw new Error('The document has no readable text or is too long to import.');
      }
      setTooLarge(false); emitted.current = content;
      callbacks.current.onChange(content);
      toast.success('Document content imported. Review it before publishing.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not import this document. Try an unencrypted PDF or Word file.');
    } finally { setImporting(false); setProgress(''); }
  }
  const locked = disabled || importing || !editor;
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm font-medium">Terms content</p>
      <Button variant="outline" disabled={locked} onClick={() => fileInput.current?.click()}>Import document</Button>
      <input ref={fileInput} type="file" accept=".docx,.pdf" aria-label="Import terms document" className="sr-only" disabled={locked}
        onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void importFile(file); }} />
    </div>
    <p className="text-sm leading-relaxed text-slate-500">Import a Word or PDF document, or paste formatted text. Importing replaces this draft. Only the content you publish is saved.</p>
    {importing && <p role="status" className="text-sm text-blue-600">{progress}</p>}
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {warning && <p className="text-sm text-amber-800">{warning}</p>}
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b bg-slate-50 p-2" role="group" aria-label="Text formatting">
        <select aria-label="Paragraph style" className="h-8 rounded border bg-white px-2 text-sm" disabled={locked} value={state?.level ?? 'paragraph'}
          onChange={event => event.target.value === 'paragraph' ? editor?.chain().focus().setParagraph().run() : editor?.chain().focus().setHeading({ level: Number(event.target.value) as 1 | 2 | 3 | 4 | 5 | 6 }).run()}>
          <option value="paragraph">Normal text</option><option value="1">Title</option><option value="2">Heading</option><option value="3">Subheading</option>
          <option value="4">Heading 4</option><option value="5">Heading 5</option><option value="6">Heading 6</option>
        </select>
        <Button size="sm" variant={state?.bold ? 'secondary' : 'ghost'} aria-pressed={state?.bold ?? false} disabled={locked} onClick={() => editor?.chain().focus().toggleBold().run()}><strong>Bold</strong></Button>
        <Button size="sm" variant={state?.italic ? 'secondary' : 'ghost'} aria-pressed={state?.italic ?? false} disabled={locked} onClick={() => editor?.chain().focus().toggleItalic().run()}><em>Italic</em></Button>
        <Button size="sm" variant={state?.underline ? 'secondary' : 'ghost'} aria-pressed={state?.underline ?? false} disabled={locked} onClick={() => editor?.chain().focus().toggleUnderline().run()}><u>Underline</u></Button>
        <Button size="sm" variant={state?.bullet ? 'secondary' : 'ghost'} aria-pressed={state?.bullet ?? false} disabled={locked} onClick={() => editor?.chain().focus().toggleBulletList().run()}>Bullets</Button>
        <Button size="sm" variant={state?.numbered ? 'secondary' : 'ghost'} aria-pressed={state?.numbered ?? false} disabled={locked} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>Numbering</Button>
        <Button size="sm" variant="ghost" disabled={locked || !state?.undo} onClick={() => editor?.chain().focus().undo().run()}>Undo</Button>
        <Button size="sm" variant="ghost" disabled={locked || !state?.redo} onClick={() => editor?.chain().focus().redo().run()}>Redo</Button>
      </div>
      <div className="max-h-[65vh] overflow-y-auto">{editor ? <EditorContent editor={editor} /> : <p role="status" className="p-5 text-sm text-slate-500">Loading editor...</p>}</div>
    </div>
    {tooLarge && <p role="alert" className="text-sm text-red-600">This document is too long. Shorten it before publishing.</p>}
  </div>;
}
