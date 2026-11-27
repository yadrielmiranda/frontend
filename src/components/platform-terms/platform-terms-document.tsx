"use client";

import { useEffect, useState } from 'react';
import { getPlatformTermsDocument, getPlatformTermsAdministrationDocument, type PlatformTermsContent, type PlatformTermsVersion } from '@/app/api/platform-terms.api';
import { Button } from '@/components/ui/button';
import { PlatformTermsText } from './platform-terms-text';

const labels = {
  en: { updated: 'Last updated', error: 'Could not load terms.', retry: 'Try again', loading: 'Loading terms...', document: 'Terms and Conditions text' },
  es: { updated: 'Última actualización', error: 'No se pudieron cargar los términos.', retry: 'Reintentar', loading: 'Cargando los términos…', document: 'Texto de los términos y condiciones' },
};

export function PlatformTermsDocument({ version, onReady, adminView = false, locale = 'en' }: {
  version: PlatformTermsVersion;
  onReady?: (versionId: number | null) => void;
  adminView?: boolean;
  locale?: keyof typeof labels;
}) {
  const copy = labels[locale];
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
      if (!cancelled) setError(err instanceof Error ? err.message : '');
    });
    return () => { cancelled = true; };
  }, [version.id, onReady, reload, adminView]);
  const loaded = document?.version.id === version.id;
  return (
    <div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
        <span>{copy.updated} {new Date(version.publishedAt).toLocaleDateString(locale === 'es' ? 'es' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
      </div>
      <div className="mt-8">
        {error !== null ? <div className="space-y-3"><p role="alert" className="text-sm text-red-600">{locale === 'en' && error ? error : copy.error}</p>
          <Button variant="outline" type="button" onClick={() => setReload(value => value + 1)}>{copy.retry}</Button></div>
        : !loaded ? <p role="status" className="text-sm text-slate-500">{copy.loading}</p>
        : <PlatformTermsText content={document.content} label={copy.document} />}
      </div>
    </div>
  );
}
