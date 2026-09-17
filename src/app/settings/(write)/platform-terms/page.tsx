"use client";

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getPlatformTermsAdministration, getPlatformTermsAdministrationDocument, publishPlatformTerms,
  type PlatformTermsAdministration, type PlatformTermsVersion } from '@/app/api/platform-terms.api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlatformTermsDocument } from '@/components/platform-terms/platform-terms-document';
import { PlatformTermsEditor } from '@/components/platform-terms/platform-terms-editor';
import { PlatformTermsHeading } from '@/components/platform-terms/platform-terms-heading';
import { PlatformTermsText } from '@/components/platform-terms/platform-terms-text';

export default function PlatformTermsAdministrationPage() {
  const [data, setData] = useState<PlatformTermsAdministration | null>(null);
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentValid, setContentValid] = useState(false);
  const [viewedVersion, setViewedVersion] = useState<PlatformTermsVersion | null>(null);
  const load = useCallback(async (replaceDraft = false) => {
    setLoading(true);
    try {
      const next = await getPlatformTermsAdministration();
      const document = replaceDraft && next.current
        ? await getPlatformTermsAdministrationDocument(next.current.id) : null;
      setData(next);
      if (replaceDraft) setContent(document?.content ?? '');
      setPreview(null); setConfirmed(false); setError(null);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Could not load terms.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(true); }, [load]);

  function changeContent(value: string) {
    setContent(value); setPreview(null); setConfirmed(false);
  }

  async function publish() {
    if (!data || !confirmed || preview !== content || !contentValid || busy || loading) return;
    setBusy(true); setError(null);
    try {
      const result = await publishPlatformTerms(content, data.current?.id ?? 0);
      toast.success(result.changed ? 'Terms and Conditions published.' : 'This text is already the current version.');
      await load(true);
      window.dispatchEvent(new CustomEvent('platform-terms:required'));
    } catch (err: unknown) {
      // Se conserva el borrador, pero una publicación simultánea exige revisarlo de nuevo.
      await load(false);
      setError(err instanceof Error ? err.message : 'Could not publish terms.');
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <div><h1 className="text-2xl font-semibold">Terms and Conditions</h1>
        <p className="mt-2 text-sm text-slate-500">Platform terms for clients and external dealers. Internal dealers, administrators and operators are exempt.</p></div>
      <section className="space-y-4 rounded-xl border bg-white p-5">
        <h2 className="font-semibold">{data?.current ? 'Publish a new version' : 'Publish your first version'}</h2>
        <p className="text-sm text-slate-500">Import your document or paste its content, review the web page, then publish. Changes stay in this draft until you publish a new version.</p>
        {loading ? <p role="status" className="text-sm text-slate-500">Loading terms...</p> : preview === null ? <>
          <PlatformTermsEditor value={content} disabled={busy || !data} onChange={changeContent} onValidityChange={setContentValid} />
          <Button variant="outline" disabled={busy || !data || !contentValid} onClick={() => { setPreview(content); setConfirmed(false); }}>Preview</Button>
        </> : <>
          <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-600">Preview · Unpublished</p>
            <Button variant="outline" disabled={busy} onClick={() => { setPreview(null); setConfirmed(false); }}>Edit text</Button></div>
          <div className="space-y-8 border-y py-8"><PlatformTermsHeading /><PlatformTermsText content={preview} /></div>
        </>}
        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-black" checked={confirmed}
            disabled={busy || loading || preview === null || preview !== content}
            onChange={event => setConfirmed(event.target.checked)} />
          <span>I reviewed the preview. Publish these terms as the current version and require clients and external dealers to accept them.</span>
        </label>
        <Button disabled={!data || !contentValid || preview !== content || !confirmed || busy || loading} onClick={() => void publish()}>{busy ? 'Publishing...' : 'Publish version'}</Button>
      </section>
      {error && <div className="space-y-2"><p role="alert" className="text-sm text-red-600">{error}</p><Button variant="outline" disabled={busy || loading} onClick={() => void load()}>Refresh</Button></div>}
      {data && <section className="space-y-4 rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Published versions</h2>
        {!data.versions.length && <p className="text-sm text-slate-500">Publish your terms to enable acceptance for clients and external dealers.</p>}
        {data.versions.map(version => <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm">
          <div><p className="font-medium">Version {version.version}{version.id === data.current?.id ? ' · Current' : ''}</p>
            <p className="text-slate-500">{new Date(version.publishedAt).toLocaleString()} · {version.acceptanceCount} acceptances</p></div>
          <button type="button" className="text-blue-600 underline underline-offset-4" onClick={() => setViewedVersion(version)}>View version</button>
        </div>)}
      </section>}
      <Dialog open={viewedVersion !== null} onOpenChange={open => { if (!open) setViewedVersion(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Terms and Conditions · Version {viewedVersion?.version}</DialogTitle></DialogHeader>
          {viewedVersion && <PlatformTermsDocument version={viewedVersion} adminView />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
