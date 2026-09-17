import { apiFetch } from './_base';

export type PlatformTermsVersion = {
  id: number;
  version: number;
  name: string;
  sizeBytes: number;
  publishedAt: string;
  consentText: string;
};

export type PlatformTermsContent = { version: PlatformTermsVersion; content: string };

export type PlatformTermsStatus = {
  current: PlatformTermsVersion | null;
  applies: boolean;
  required: boolean;
  acceptedAt: string | null;
};

export type PlatformTermsHistory = {
  version: PlatformTermsVersion;
  acceptedAt: string;
};

export type PlatformTermsAdministration = {
  current: PlatformTermsVersion | null;
  versions: Array<PlatformTermsVersion & { acceptanceCount: number }>;
};

export const getCurrentPlatformTerms = () =>
  apiFetch<PlatformTermsVersion | null>('/api/platform-terms/current', { cache: 'no-store', suppressAuthEvent: true });
export const getPlatformTermsStatus = () =>
  apiFetch<PlatformTermsStatus>('/api/platform-terms/status', { cache: 'no-store' });
export const getMyPlatformTermsHistory = () =>
  apiFetch<PlatformTermsHistory[]>('/api/platform-terms/my-history', { cache: 'no-store' });
export const acceptPlatformTerms = (versionId: number) =>
  apiFetch<PlatformTermsStatus>('/api/platform-terms/accept', {
    method: 'POST', body: { accepted: true, versionId },
  });
export const getPlatformTermsAdministration = () =>
  apiFetch<PlatformTermsAdministration>('/api/platform-terms/admin', { cache: 'no-store' });
export const platformTermsPageUrl = () => '/terms';
export const getPlatformTermsAdministrationDocument = (versionId: number) =>
  apiFetch<PlatformTermsContent>(`/api/platform-terms/admin/${versionId}/document`, { cache: 'no-store' });
export const getPlatformTermsDocument = (versionId: number) =>
  apiFetch<PlatformTermsContent>(`/api/platform-terms/${versionId}/document`, { cache: 'no-store', suppressAuthEvent: true });

export function publishPlatformTerms(content: string, currentVersionId: number) {
  const body = new FormData();
  body.append('content', content);
  body.append('currentVersionId', String(currentVersionId));
  return apiFetch<{ current: PlatformTermsVersion; changed: boolean }>('/api/platform-terms/publish-text', {
    method: 'POST', body, timeoutMs: 60000,
  });
}
