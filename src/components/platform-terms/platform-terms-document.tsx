"use client";

import { useEffect, useState } from 'react';
import { getPlatformTermsDocument, getPlatformTermsAdministrationDocument, type PlatformTermsContent, type PlatformTermsVersion } from '@/app/api/platform-terms.api';
import { Button } from '@/components/ui/button';
import { PlatformTermsText } from './platform-terms-text';

export function PlatformTermsDocument({ version, onReady, adminView = false }: {
  version: PlatformTermsVersion;
  onReady?: (versionId: number | null) => void;
  adminView?: boolean;
}) {
  const [document, setDocument] = useState<PlatformTermsContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setDocument(null); setError(null); onReady?.(null);
    const loadDocument = adminView ? getPlatformTermsAdministrationDocument : getPlatformTermsDocument;
    loadDocument(version.id).then(result => {
      if (!cancelled) { setDocument(result); onReady?.(version.id); }
    }).catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load terms.');
    });
    return () => { cancelled = true; };
  }, [version.id, onReady, reload, adminView]);
  const loaded = document?.version.id === version.id;
  return (
    <div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
        <span>Last updated {new Date(version.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
      </div>
      <div className="mt-8">
        {error ? <div className="space-y-3"><p role="alert" className="text-sm text-red-600">{error}</p>
          <Button variant="outline" onClick={() => setReload(value => value + 1)}>Try again</Button></div>
        : !loaded ? <p role="status" className="text-sm text-slate-500">Loading terms...</p>
        : <PlatformTermsText content={document.content} />}
      </div>
    </div>
  );
}
