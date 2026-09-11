import { apiFetch } from './_base';

export type SmsPolicySection = { title: string; text: string };

export type SmsProgram = {
  companyName: string;
  supportEmail: string | null;
  supportPhone: string | null;
  effectiveDate: string;
  consentText: string;
  disclosure: string;
  registration: {
    serviceConsentText: string;
    serviceRequirement: string;
    promotionsConsentText: string;
    promotionsDisclosure: string;
  };
  terms: SmsPolicySection[];
  privacy: SmsPolicySection[];
  version: string;
};

export type SmsPreferences = {
  enabled: boolean;
  promotionsEnabled: boolean;
  phone: string;
  consentedAt: string | null;
  revokedAt: string | null;
  promotionsConsentedAt: string | null;
  promotionsRevokedAt: string | null;
  blockedBySms: boolean;
  program: SmsProgram;
};

export function getSmsPreferences() {
  return apiFetch<SmsPreferences>('/api/sms/preferences', { cache: 'no-store' });
}

export function getSmsProgram() {
  return apiFetch<SmsProgram>('/api/sms/program', { cache: 'no-store', suppressAuthEvent: true });
}

export function updateSmsPreferences(data: { enabled: boolean; promotionsEnabled?: boolean; phone?: string; version?: string }) {
  return apiFetch<SmsPreferences>('/api/sms/preferences', { method: 'PATCH', body: data });
}
