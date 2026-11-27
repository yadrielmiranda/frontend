"use client";

import { useEffect, useRef, useState, type ComponentProps, type FormEvent } from "react";
import Link from "next/link";
import { API_URL, apiFetch, isApiError } from "@/app/api/_base";
import type { RegistrationLevel } from "@/app/api/dealer-network.api";
import { getSmsProgram, type SmsProgram } from "@/app/api/sms.api";
import { getCurrentPlatformTerms, type PlatformTermsVersion } from "@/app/api/platform-terms.api";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { DealerSubmissionMessage } from "@/components/auth/dealer-submission-message";
import { PortalLanguageSwitch } from "@/components/portal-language-switch";
import { usePortalLanguage } from "@/contexts/PortalLanguageContext";
import type { CompanyLocale } from "@/components/company/company-content";
import { openDealerSubmissionConfirmation } from "@/lib/dealer-submission-confirmation";
import { dealerRegistrationTitle, dealerRegistrationText, dealerRegistrationSmsText, dealerSubmissionError } from "@/lib/dealer-registration-language";
import { registrationText } from "@/lib/registration-language";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { InternationalPhoneInput } from "@/components/international-phone-input";
import { PlatformTermsDocument } from "@/components/platform-terms/platform-terms-document";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { US_STATES } from "@/lib/us-states";
import { isValidUsername, suggestedClientUsername, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH, USERNAME_VALIDATION_MESSAGE } from "@/lib/username-policy";
import { normalizeEmail } from "@/lib/validators-email";
import { isSmsPhoneSupported, normalizePhoneToE164 } from "@/lib/validators-phone";

type Invitation = {
  level: RegistrationLevel;
  inviter: { name: string; logoUrl: string | null } | null;
};
type SubmittedApplication = { id: number; username?: string };
const inputClass = "h-11 border-white/20 bg-black/35 text-white focus-visible:ring-red-600";
const selectClass = "mt-1 h-11 w-full rounded-md border border-white/20 bg-[#121212] px-3 text-base text-white focus-visible:outline-red-600";
const buttonClass = "h-11 w-full bg-red-600 font-semibold text-white hover:bg-red-700";

function Field({ label, name, required = true, ...props }: ComponentProps<"input"> & { label: string; name: string }) {
  return (
    <label className="block min-w-0 space-y-1 text-sm font-medium">
      <span>{label}</span>
      <Input {...props} name={name} required={required} className={inputClass} />
    </label>
  );
}

export function DealerRegistration({ token }: { token: string }) {
  const { locale, saving, changeLanguage } = usePortalLanguage();
  const t = (source: string) => dealerRegistrationText(locale, source);
  const activeLocale = useRef(locale);
  useEffect(() => { activeLocale.current = locale; }, [locale]);
  const endpoint = `/api/dealer-network/invitations/${encodeURIComponent(token)}`;
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [submitted, setSubmitted] = useState<SubmittedApplication | null>(null);

  useEffect(() => {
    let active = true;
    setLoadError("");
    apiFetch<Invitation>(endpoint, { suppressAuthEvent: true, timeoutMs: 15000 })
      .then(result => { if (active) setInvitation(result); })
      .catch(error => {
        if (!active) return;
        setLoadError(isApiError(error) && [400, 403, 404, 410].includes(error.status)
          ? "This invitation is unavailable. Please ask the person who invited you for a current link."
          : "We could not load your invitation. Please try again.");
      });
    return () => { active = false; };
  }, [endpoint, reload]);

  const inviter = invitation?.inviter;
  const logoUrl = inviter?.logoUrl;
  const logoSrc = logoUrl?.startsWith("/") ? `${API_URL.replace(/\/$/, "")}${logoUrl}` : logoUrl;

  return (
    <AuthPageShell
      title={dealerRegistrationTitle(locale, invitation?.level)}
      description={t("Apply for access to the Authentic Evolution dealer network.")}
      locale={locale}
      languageSwitch={<PortalLanguageSwitch locale={locale} onChange={changeLanguage} saving={saving} />}
      contentMaxWidth="max-w-2xl"
    >
      <section className="rounded-3xl border border-red-600/70 bg-black/45 p-5 text-white shadow-xl sm:p-8">
        {inviter && (
          <div className="mb-6 flex items-center gap-4 border-b border-white/15 pb-5">
            {logoSrc && (
              <img src={logoSrc} alt="" referrerPolicy="no-referrer"
                className="h-14 w-20 shrink-0 rounded-md bg-white object-contain p-1.5"
                onError={event => { event.currentTarget.hidden = true; }} />
            )}
            <p className="min-w-0">
              <span className="block text-sm text-white/70">{t("Invited by")}</span>
              <strong className="block break-words text-xl font-semibold">{inviter.name}</strong>
            </p>
          </div>
        )}
        {submitted ? (
          <DealerSubmissionMessage locale={locale} username={submitted.username} />
        ) : invitation ? <RegistrationForm endpoint={endpoint} locale={locale} onSubmitted={result => {
          if (!openDealerSubmissionConfirmation(token, invitation.level, activeLocale.current)) setSubmitted(result);
        }} />
          : loadError ? <div className="space-y-4"><p role="alert">{t(loadError)}</p>
            <Button type="button" className={buttonClass} onClick={() => setReload(value => value + 1)}>{t("Try again")}</Button></div>
          : <p role="status">{t("Loading invitation…")}</p>}
      </section>
    </AuthPageShell>
  );
}

function RegistrationForm({ endpoint, locale, onSubmitted }: {
  endpoint: string; locale: CompanyLocale; onSubmitted: (application: SubmittedApplication) => void;
}) {
  const t = (source: string) => dealerRegistrationText(locale, source);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [chooseUsername, setChooseUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const usernameInput = useRef<HTMLInputElement>(null);
  const suggestedUsername = firstName.trim() && lastName.trim() ? suggestedClientUsername(firstName, lastName, "Dealer") : "";
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState({ street: "", addressLine2: "", city: "", state: "", postalCode: "" });
  const [error, setError] = useState<{ message: string; code?: unknown } | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [smsProgram, setSmsProgram] = useState<SmsProgram | null>(null);
  const [smsError, setSmsError] = useState(false);
  const [smsReload, setSmsReload] = useState(0);
  const [terms, setTerms] = useState<PlatformTermsVersion | null | undefined>(undefined);
  const [termsError, setTermsError] = useState(false);
  const [termsReload, setTermsReload] = useState(0);
  const [acceptedTermsId, setAcceptedTermsId] = useState<number | null>(null);
  const normalizedPhone = normalizePhoneToE164(phone);
  const smsSupported = isSmsPhoneSupported(normalizedPhone);
  const termsReady = terms !== undefined && (!terms || terms.id === acceptedTermsId);

  useEffect(() => {
    if (usernameError && !busy) usernameInput.current?.focus();
  }, [usernameError, busy]);

  useEffect(() => {
    let active = true;
    setSmsError(false);
    getSmsProgram().then(program => {
      if (!program.dealerRegistration?.version) throw new Error("Missing dealer SMS options");
      if (active) setSmsProgram(program);
    }).catch(() => { if (active) setSmsError(true); });
    return () => { active = false; };
  }, [smsReload]);

  useEffect(() => {
    let active = true;
    setTermsError(false);
    getCurrentPlatformTerms().then(current => { if (active) setTerms(current); })
      .catch(() => { if (active) setTermsError(true); });
    return () => { active = false; };
  }, [termsReload]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !termsReady) return;
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    const serviceConsent = smsSupported && !!smsProgram && data.has("serviceConsent");
    const promotionsConsent = smsSupported && !!smsProgram && data.has("promotionsConsent");
    const username = chooseUsername ? value("username") : null;
    if (username !== null && !isValidUsername(username)) { setUsernameError(USERNAME_VALIDATION_MESSAGE); return; }
    if (!normalizedPhone) { setError({ message: "Enter a valid phone number." }); return; }
    const sales = value("estimatedMonthlySales");
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const application = await apiFetch<SubmittedApplication>(endpoint, {
        method: "POST",
        suppressAuthEvent: true,
        body: {
          ...(username !== null ? { username } : {}), password: data.get("password"),
          firstName: value("firstName"), lastName: value("lastName"),
          email: normalizeEmail(value("email")), phone: normalizedPhone,
          street: value("street"), addressLine2: value("addressLine2") || undefined,
          city: value("city"), state: value("state"), postalCode: value("postalCode"),
          companyName: value("companyName") || undefined,
          estimatedMonthlySales: sales === "" ? undefined : Number(sales),
          yearsOfExperience: Number(value("yearsOfExperience")),
          serviceConsent, promotionsConsent,
          ...(smsProgram && (serviceConsent || promotionsConsent) ? { consentVersion: smsProgram.dealerRegistration.version } : {}),
          ...(terms ? { platformTermsAccepted: true, platformTermsVersionId: terms.id } : {}),
        },
      });
      onSubmitted(application);
    } catch (cause) {
      const details = isApiError(cause) ? cause.data : undefined;
      const code = details && typeof details === "object" && "code" in details ? details.code : undefined;
      if (username !== null && code === "USERNAME_TAKEN") {
        setUsernameError("This username is already in use. Choose another username or use an automatic one.");
        return;
      }
      if (code === "PLATFORM_TERMS_CHANGED" || code === "PLATFORM_TERMS_REQUIRED") {
        setTerms(undefined);
        setAcceptedTermsId(null);
        setTermsReload(value => value + 1);
      }
      if (code === "CONSENT_VERSION_CHANGED") {
        setSmsProgram(null);
        setSmsReload(value => value + 1);
      }
      setError({ message: isApiError(cause) ? cause.message : "Could not submit your application. Please try again.", code });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-4 text-xl font-semibold">{t("Account details")}</legend>
        <Field name="firstName" label={t("First name")} autoComplete="given-name" maxLength={100}
          value={firstName} onChange={event => setFirstName(event.target.value)} />
        <Field name="lastName" label={t("Last name")} autoComplete="family-name" maxLength={100}
          value={lastName} onChange={event => setLastName(event.target.value)} />
        <div className="space-y-1.5 text-sm sm:col-span-2">
          {chooseUsername ? <>
            <div className="flex flex-wrap items-center justify-between gap-x-4">
              <label htmlFor="dealer-username" className="font-medium">{t("Username")}</label>
              <button type="button" className="text-xs text-blue-300 underline underline-offset-2"
                onClick={() => { setChooseUsername(false); setUsernameError(""); }}>{t("Use automatic username")}</button>
            </div>
            <Input id="dealer-username" name="username" ref={usernameInput} autoFocus required autoComplete="username"
              autoCapitalize="none" autoCorrect="off" spellCheck={false} minLength={USERNAME_MIN_LENGTH} maxLength={USERNAME_MAX_LENGTH}
              defaultValue={suggestedUsername} onChange={() => setUsernameError("")} className={inputClass}
              aria-invalid={Boolean(usernameError)} aria-describedby={usernameError ? "dealer-username-error" : undefined} />
            {usernameError && <p id="dealer-username-error" role="alert" className="text-xs text-red-300">{t(usernameError)}</p>}
          </> : <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-white/75">{suggestedUsername
              ? <>{t("Suggested username")} · <strong className="break-all text-white">{suggestedUsername}</strong></>
              : t("Suggested username based on your name")}</span>
            <button type="button" className="min-h-9 text-blue-300 underline underline-offset-2"
              onClick={() => setChooseUsername(true)}>{t("Change")}</button>
          </div>}
        </div>
        <Field name="password" label={t("Password")} type="password" autoComplete="new-password" minLength={8} maxLength={255} />
        <Field name="email" label={t("Email")} type="email" autoComplete="email" maxLength={150} />
        <div className="space-y-1 text-sm font-medium">
          <label htmlFor="invite-phone">{t("Phone")}</label>
          <InternationalPhoneInput id="invite-phone" locale={locale} value={phone} onChange={setPhone} appearance="dark" className={inputClass} required disabled={busy} />
        </div>
      </fieldset>
      <fieldset disabled={busy} className="space-y-4">
        <legend className="text-xl font-semibold">{t("Address")}</legend>
        <div className="space-y-1 text-sm font-medium">
          <label htmlFor="invite-street">{t("Street address")}</label>
          <AddressAutocomplete id="invite-street" locale={locale} name="street" className={inputClass} required maxLength={150}
            value={address.street} access="registration" disabled={busy}
            contextKey={JSON.stringify([address.city, address.state, address.postalCode])}
            onChange={event => setAddress({ ...address, street: event.target.value })}
            onAddressSelect={selected => setAddress(current => ({
              street: selected.street, addressLine2: selected.addressLine2 ?? current.addressLine2,
              city: selected.city, state: selected.state, postalCode: selected.postalCode,
            }))} />
        </div>
        <Field name="addressLine2" label={t("Apartment, suite, unit, etc. (optional)")} required={false} maxLength={150} autoComplete="address-line2" value={address.addressLine2} onChange={event => setAddress({ ...address, addressLine2: event.target.value })} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field name="city" label={t("City")} maxLength={100} autoComplete="address-level2" value={address.city} onChange={event => setAddress({ ...address, city: event.target.value })} />
          <label className="block text-sm font-medium">{t("State")}
            <select name="state" autoComplete="address-level1" className={selectClass} required value={address.state} onChange={event => setAddress({ ...address, state: event.target.value })}>
              <option value="" disabled>{t("Select state")}</option>
              {US_STATES.map(state => <option key={state.value} value={state.value}>{state.label}</option>)}
            </select>
          </label>
          <Field name="postalCode" label={t("ZIP code")} autoComplete="postal-code" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} value={address.postalCode} onChange={event => setAddress({ ...address, postalCode: event.target.value })} />
        </div>
      </fieldset>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-4 text-xl font-semibold">{t("Business details")}</legend>
        <Field name="companyName" label={t("Company name (optional)")} required={false} autoComplete="organization" maxLength={150} />
        <Field name="estimatedMonthlySales" label={t("Estimated monthly sales (USD, optional)")} required={false} type="number" min={0} max="999999999999.99" step="0.01" inputMode="decimal" />
        <Field name="yearsOfExperience" label={t("Years of experience")} type="number" min={0} max={2147483647} step={1} inputMode="numeric" />
      </fieldset>
      <fieldset className="min-w-0 space-y-2 rounded-xl border border-white/15 px-3 pb-3">
        <legend className="px-1 text-sm font-semibold">{t("SMS notifications")}</legend>
        {!smsSupported && <p className="text-xs text-white/70">{t(normalizedPhone
          ? "SMS notifications are not available for this phone number. You can still submit your application."
          : "Enter a valid phone number to check SMS availability.")}</p>}
        {smsError ? <div className="space-y-2">
          <p role="alert" className="text-sm text-red-300">{t("Could not load SMS options. You can still submit your application.")}</p>
          <button type="button" className="text-sm text-blue-300 underline" onClick={() => setSmsReload(value => value + 1)}>{t("Retry SMS options")}</button>
        </div> : !smsProgram ? <p role="status" className="text-sm text-white/70">{t("Loading SMS options...")}</p> : <>
          <div key={normalizedPhone + smsProgram.dealerRegistration.version} className="space-y-2">
            <label className="flex min-h-8 items-center gap-2 text-sm">
              <input type="checkbox" name="serviceConsent" disabled={busy || !smsSupported}
                aria-describedby="dealer-service-consent-text dealer-sms-disclosure" className="size-4 shrink-0 accent-emerald-500" />
              {t("Service notifications (optional)")}
            </label>
            <label className="flex min-h-8 items-center gap-2 text-sm">
              <input type="checkbox" name="promotionsConsent" disabled={busy || !smsSupported}
                aria-describedby="dealer-promotions-consent-text dealer-sms-disclosure" className="size-4 shrink-0 accent-emerald-500" />
              {t("Promotional messages (optional)")}
            </label>
          </div>
          <p id="dealer-sms-disclosure" className="text-xs leading-relaxed text-white/75">
            {t("Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe from all SMS or HELP for help.")}
          </p>
          <details className="text-xs leading-relaxed text-white/75">
            <summary className="cursor-pointer text-blue-300 underline">{t("SMS consent details")}</summary>
            <p id="dealer-service-consent-text" className="mt-1">{dealerRegistrationSmsText(locale, smsProgram.dealerRegistration.serviceConsentText, smsProgram.companyName)}</p>
            <p id="dealer-promotions-consent-text" className="mt-1">{dealerRegistrationSmsText(locale, smsProgram.dealerRegistration.promotionsConsentText, smsProgram.companyName)}</p>
            <p className="mt-1">{dealerRegistrationSmsText(locale, smsProgram.disclosure, smsProgram.companyName)}</p>
            {locale === "es" && <details className="mt-1">
              <summary className="cursor-pointer text-blue-300 underline">{t("Original SMS consent text")}</summary>
              <div lang="en" className="mt-1 space-y-1">
                <p>{smsProgram.dealerRegistration.serviceConsentText}</p>
                <p>{smsProgram.dealerRegistration.promotionsConsentText}</p>
                <p>{smsProgram.disclosure}</p>
              </div>
            </details>}
          </details>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-blue-300 underline">
            <Link href="/sms/terms" target="_blank" rel="noopener noreferrer">{t("SMS Terms of Service")}</Link>
            <Link href="/sms/privacy" target="_blank" rel="noopener noreferrer">{t("SMS Privacy Policy")}</Link>
          </div>
        </>}
      </fieldset>
      <fieldset className="min-w-0 space-y-2 rounded-xl border border-white/15 px-3 pb-3">
        <legend className="px-1 text-sm font-semibold">{t("Terms and Conditions")}</legend>
        {termsError ? <div className="space-y-2">
          <p role="alert" className="text-sm text-red-300">{t("Could not load the Terms and Conditions. Please try again.")}</p>
          <button type="button" className="text-sm text-blue-300 underline" onClick={() => setTermsReload(value => value + 1)}>{t("Retry terms")}</button>
        </div> : terms === undefined ? <p role="status" className="text-sm text-white/70">{t("Loading terms...")}</p>
          : terms ? <>
            <label className="flex min-h-8 items-center gap-2 text-sm">
              <input type="checkbox" name="platformTermsAccepted" required disabled={busy} className="size-4 shrink-0 accent-emerald-500"
                checked={acceptedTermsId === terms.id} onChange={event => setAcceptedTermsId(event.target.checked ? terms.id : null)} />
              <span>{registrationText(locale, terms.consentText)}</span>
            </label>
            <Dialog>
              <DialogTrigger asChild><button type="button" className="ml-6 text-xs text-blue-300 underline">{t("Read Terms and Conditions")}</button></DialogTrigger>
              <DialogContent lang={locale} closeLabel={t("Close")} className="flex max-h-[85dvh] flex-col sm:max-w-2xl" aria-describedby={undefined}>
                <DialogTitle>{t("Terms and Conditions")}</DialogTitle>
                <div className="min-h-0 overflow-y-auto"><PlatformTermsDocument version={terms} locale={locale} /></div>
                <DialogClose asChild><Button type="button" variant="outline">{t("Back to registration")}</Button></DialogClose>
              </DialogContent>
            </Dialog>
          </> : <p className="text-sm text-white/70">{t("Terms and Conditions have not been published yet.")}</p>}
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-300">{dealerSubmissionError(locale, error.message, error.code)}</p>}
      <Button type="submit" disabled={busy || !termsReady} className={buttonClass}>{t(busy ? "Submitting…" : "Submit application")}</Button>
    </form>
  );
}
