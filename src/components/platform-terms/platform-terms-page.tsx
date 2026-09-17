"use client";

import { useEffect, useState } from 'react';
import { getCurrentPlatformTerms, type PlatformTermsVersion } from '@/app/api/platform-terms.api';
import { PlatformTermsDocument } from '@/components/platform-terms/platform-terms-document';
import { Button } from '@/components/ui/button';
import { PlatformTermsHeading } from './platform-terms-heading';

export function PlatformTermsPage() {
  const [version, setVersion] = useState<PlatformTermsVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCurrentPlatformTerms().then(current => {
      if (!cancelled) setVersion(current);
    }).catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load terms.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reload]);
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-5 py-10 sm:px-8 sm:py-14">
      <PlatformTermsHeading />
      {loading ? <p role="status">Loading terms...</p> : error ? (
        <div className="space-y-3"><p role="alert" className="text-sm text-red-600">{error}</p><Button onClick={() => setReload(value => value + 1)}>Try again</Button></div>
      ) : version ? <PlatformTermsDocument version={version} /> : <p className="text-sm text-slate-500">Terms and Conditions have not been published yet.</p>}
    </div>
  );
}
