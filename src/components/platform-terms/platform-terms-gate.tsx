"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { logoutUser } from '@/app/api/auth/me/auth.api';
import { navigateAfterSessionChange } from '@/lib/auth-session';
import { acceptPlatformTerms, getMyPlatformTermsHistory, getPlatformTermsDocument, getPlatformTermsStatus,
  platformTermsPageUrl, type PlatformTermsStatus } from '@/app/api/platform-terms.api';
import { Button } from '@/components/ui/button';

export function PlatformTermsGate({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const userId = isAuthenticated ? user?.id : undefined;
  const publicPage = pathname.startsWith('/public/') || pathname.startsWith('/login') ||
    pathname === '/reset-password' || pathname === '/sms' || pathname.startsWith('/sms/') ||
    pathname === '/terms' || pathname.startsWith('/terms/');
  const [state, setState] = useState<{ userId: number; status: PlatformTermsStatus } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptedVersion, setAcceptedVersion] = useState<number | null>(null);
  const [documentState, setDocumentState] = useState<{
    userId: number; versionId: number; ready: boolean; updated: boolean; error: string | null;
  } | null>(null);
  const [documentReload, setDocumentReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    if (!userId || publicPage) return;
    const request = ++requestId.current;
    try {
      const status = await getPlatformTermsStatus();
      if (request !== requestId.current) return;
      setState({ userId, status });
      setError(null);
    } catch (err: unknown) {
      if (request !== requestId.current) return;
      // Una sesión vencida o un fallo temporal no desmonta el editor ya autorizado.
      // Los permisos de cada operación siguen siendo comprobados por el backend.
      setError(err instanceof Error ? err.message : 'Could not load the Terms and Conditions.');
    }
  }, [userId, publicPage]);

  useEffect(() => {
    // Conservar la comprobación anterior al bloquear y restaurar la misma cuenta.
    // Una identidad diferente nunca puede reutilizarla.
    setState(previous => !userId || previous?.userId === userId ? previous : null);
    setAcceptedVersion(null);
    setError(null);
    void refresh();
    const onRefresh = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('focus', onRefresh);
    document.addEventListener('visibilitychange', onRefresh);
    window.addEventListener('platform-terms:required', onRefresh);
    const timer = setInterval(onRefresh, 30000);
    return () => {
      requestId.current++;
      window.removeEventListener('focus', onRefresh);
      document.removeEventListener('visibilitychange', onRefresh);
      window.removeEventListener('platform-terms:required', onRefresh);
      clearInterval(timer);
    };
  }, [refresh]);

  const status = state && state.userId === userId ? state.status : null;
  const current = status?.current;
  const pendingVersionId = status?.required ? current?.id : undefined;
  const review = documentState?.userId === userId && documentState?.versionId === pendingVersionId ? documentState : null;

  useEffect(() => {
    if (!userId || !pendingVersionId || publicPage) return;
    let cancelled = false;
    const base = { userId, versionId: pendingVersionId, ready: false, updated: false, error: null };
    setDocumentState(base);
    // El documento se comprueba sin incrustarlo en la tarjeta. Solo se acepta si está disponible.
    void getPlatformTermsDocument(pendingVersionId).then(result => {
      if (result.version.id !== pendingVersionId || !result.content?.trim()) throw new Error('Could not load the Terms and Conditions.');
      if (!cancelled) setDocumentState(previous => ({ ...base, updated: previous?.updated ?? false, ready: true }));
    }).catch((err: unknown) => {
      if (!cancelled) setDocumentState(previous => ({ ...base, updated: previous?.updated ?? false,
        error: err instanceof Error ? err.message : 'Could not load the Terms and Conditions.' }));
    });
    // El historial solo determina el mensaje; nunca se muestran sus versiones al usuario.
    void getMyPlatformTermsHistory().then(history => {
      if (!cancelled) setDocumentState(previous => previous ? { ...previous,
        updated: history.some(record => record.version.id !== pendingVersionId) } : previous);
    }).catch(() => { /* Si falla el historial, se mantiene el título general. */ });
    return () => { cancelled = true; };
  }, [userId, pendingVersionId, publicPage, documentReload]);

  async function accept() {
    if (!current || !review?.ready || acceptedVersion !== current.id || !userId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await acceptPlatformTerms(current.id);
      setAcceptedVersion(null);
      // Una publicación simultánea se vuelve a comprobar después de guardar.
      await refresh();
      router.refresh();
    } catch (err: unknown) {
      setAcceptedVersion(null);
      await refresh();
      setError(err instanceof Error ? err.message : 'Could not save your acceptance.');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      window.dispatchEvent(new Event('auth:manual-logout'));
      await logoutUser();
      navigateAfterSessionChange('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not sign out.');
    } finally { setBusy(false); }
  }

  if (publicPage || (!isLoading && !isAuthenticated)) return <>{children}</>;
  // Esperar la comprobación antes de mostrar una solicitud de aceptación.
  if (isLoading || (!status && !error)) return <p role="status" className="p-8 text-center text-sm text-slate-500">Loading account...</p>;
  if (!status) return (
    <main className="flex min-h-dvh items-center justify-center bg-white px-4 py-8">
      <section className="w-full max-w-sm space-y-4 text-center">
        <p role="alert" className="text-sm text-slate-700">Could not load your account. Please try again.</p>
        <div className="flex justify-center gap-3">
          <Button disabled={busy} onClick={() => { setError(null); void refresh(); }}>Try again</Button>
          <Button variant="ghost" disabled={busy} onClick={() => void signOut()}>Sign out</Button>
        </div>
      </section>
    </main>
  );
  if (!status.required) return <>{children}</>;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-red-50/40 px-4 py-8 sm:px-6">
      <section aria-labelledby="platform-terms-title" className="w-full max-w-lg space-y-6 rounded-2xl border border-red-200 border-t-4 border-t-red-600 bg-white p-6 shadow-sm sm:p-8">
        <header className="text-center">
          {/* Esta pantalla usa la identidad del portal, independiente del branding comercial. */}
          <Image src="/branding/authentic-login-logo.png" alt="Authentic Evolution Co"
            width={180} height={96} unoptimized className="mx-auto h-20 w-auto max-w-44 object-contain" />
          <h1 id="platform-terms-title" className="mt-6 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[1.75rem]">
            {review?.updated ? 'We’ve updated our Terms' : 'Terms and Conditions'}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">Please review and accept our Terms and Conditions to continue.</p>
        </header>
        {current ? (
          <>
            <a className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50/50 px-3 py-3 text-sm font-medium text-red-700 transition-colors hover:border-red-300 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
              href={platformTermsPageUrl()} target="_blank" rel="noopener noreferrer">
              Read Terms and Conditions<ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-700">
              <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 rounded accent-red-600" disabled={busy || !review?.ready}
                checked={acceptedVersion === current.id}
                onChange={(event) => setAcceptedVersion(event.target.checked ? current.id : null)} />
              <span>{current.consentText}</span>
            </label>
            {!review?.ready && !review?.error && <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Loading terms...</p>}
            <div className="flex flex-col gap-2 border-t border-red-100 pt-5 sm:flex-row-reverse sm:items-center">
              <Button className="h-11 rounded-lg bg-red-600 px-5 text-white hover:bg-red-700 focus-visible:ring-red-600/25 sm:flex-1" disabled={busy || !review?.ready || acceptedVersion !== current.id} onClick={() => void accept()}>
                {busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}Accept and continue
              </Button>
              <Button className="h-11 rounded-lg text-slate-600" variant="ghost" disabled={busy} onClick={() => void signOut()}>Sign out</Button>
            </div>
          </>
        ) : error ? (
          <div className="flex justify-center gap-3">
            <Button className="bg-red-600 text-white hover:bg-red-700" onClick={() => void refresh()}>Try again</Button>
            <Button variant="ghost" disabled={busy} onClick={() => void signOut()}>Sign out</Button>
          </div>
        ) : <p role="status" className="flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Loading terms...</p>}
        {(error || review?.error) && <div className="space-y-3 rounded-lg bg-red-50 p-3">
          <p role="alert" className="text-sm text-red-700">{error || review?.error}</p>
          {review?.error && <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" disabled={busy} onClick={() => { setDocumentReload(value => value + 1); void refresh(); }}>Try again</Button>}
        </div>}
      </section>
    </main>
  );
}
