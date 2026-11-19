"use client";

import { useEffect, useRef, useState, type ComponentProps, type FormEvent } from "react";
import Link from "next/link";
import { API_URL, apiFetch, isApiError } from "@/app/api/_base";
import type { RegistrationLevel } from "@/app/api/dealer-network.api";
import { getSmsProgram, type SmsProgram } from "@/app/api/sms.api";
import { getCurrentPlatformTerms, platformTermsPageUrl, type PlatformTermsVersion } from "@/app/api/platform-terms.api";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { InternationalPhoneInput } from "@/components/international-phone-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { US_STATES } from "@/lib/us-states";
import { isValidUsername, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH, USERNAME_VALIDATION_MESSAGE } from "@/lib/username-policy";
import { normalizeEmail } from "@/lib/validators-email";
import { isSmsPhoneSupported, normalizePhoneToE164 } from "@/lib/validators-phone";

type Invitation = {
  level: RegistrationLevel;
  inviter: { name: string; logoUrl: string | null } | null;
};
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
  const endpoint = `/api/dealer-network/invitations/${encodeURIComponent(token)}`;
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [submitted, setSubmitted] = useState(false);

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
      title={invitation ? `${invitation.level} registration` : "Dealer network registration"}
      description="Apply for access to the Authentic Evolution dealer network."
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
              <span className="block text-sm text-white/70">Invited by</span>
              <strong className="block break-words text-xl font-semibold">{inviter.name}</strong>
            </p>
          </div>
        )}
        {submitted ? (
          <div role="status" className="space-y-3">
            <h2 className="text-2xl font-semibold">Application submitted</h2>
            <p>Your request is pending approval. You can sign in once your account is approved.</p>
            <Link href="/login" className="inline-block underline underline-offset-4">Go to sign in</Link>
          </div>
        ) : invitation ? <RegistrationForm endpoint={endpoint} onSubmitted={() => setSubmitted(true)} />
          : loadError ? <div className="space-y-4"><p role="alert">{loadError}</p>
            <Button type="button" className={buttonClass} onClick={() => setReload(value => value + 1)}>Try again</Button></div>
          : <p role="status">Loading invitation…</p>}
      </section>
    </AuthPageShell>
  );
}

function RegistrationForm({ endpoint, onSubmitted }: { endpoint: string; onSubmitted: () => void }) {
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState({ street: "", addressLine2: "", city: "", state: "", postalCode: "" });
  const [error, setError] = useState("");
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
    const username = value("username");
    if (!isValidUsername(username)) { setError(USERNAME_VALIDATION_MESSAGE); return; }
    if (!normalizedPhone) { setError("Enter a valid phone number."); return; }
    const sales = value("estimatedMonthlySales");
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await apiFetch(endpoint, {
        method: "POST",
        suppressAuthEvent: true,
        body: {
          username, password: data.get("password"),
          firstName: value("firstName"), lastName: value("lastName"),
          email: normalizeEmail(value("email")), phone: normalizedPhone,
          street: value("street"), addressLine2: value("addressLine2") || undefined,
          city: value("city"), state: value("state"), postalCode: value("postalCode"),
          companyName: value("companyName") || undefined,
          estimatedMonthlySales: sales === "" ? undefined : Number(sales),
          yearsOfExperience: Number(value("yearsOfExperience")), preferredLanguage: value("preferredLanguage"),
          serviceConsent, promotionsConsent,
          ...(smsProgram && (serviceConsent || promotionsConsent) ? { consentVersion: smsProgram.dealerRegistration.version } : {}),
          ...(terms ? { platformTermsAccepted: true, platformTermsVersionId: terms.id } : {}),
        },
      });
      onSubmitted();
    } catch (cause) {
      const details = isApiError(cause) ? cause.data : undefined;
      const code = details && typeof details === "object" && "code" in details ? details.code : undefined;
      if (code === "PLATFORM_TERMS_CHANGED" || code === "PLATFORM_TERMS_REQUIRED") {
        setTerms(undefined);
        setAcceptedTermsId(null);
        setTermsReload(value => value + 1);
      }
      if (code === "CONSENT_VERSION_CHANGED") {
        setSmsProgram(null);
        setSmsReload(value => value + 1);
      }
      setError(isApiError(cause) ? cause.message : "Could not submit your application. Please try again.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-4 text-xl font-semibold">Account details</legend>
        <Field name="firstName" label="First name" autoComplete="given-name" maxLength={100} />
        <Field name="lastName" label="Last name" autoComplete="family-name" maxLength={100} />
        <Field name="username" label="Username" autoComplete="username" autoCapitalize="none" spellCheck={false} minLength={USERNAME_MIN_LENGTH} maxLength={USERNAME_MAX_LENGTH} />
        <Field name="password" label="Password" type="password" autoComplete="new-password" minLength={8} maxLength={255} />
        <Field name="email" label="Email" type="email" autoComplete="email" maxLength={150} />
        <div className="space-y-1 text-sm font-medium">
          <label htmlFor="invite-phone">Phone</label>
          <InternationalPhoneInput id="invite-phone" value={phone} onChange={setPhone} appearance="dark" className={inputClass} required disabled={busy} />
        </div>
      </fieldset>
      <fieldset disabled={busy} className="space-y-4">
        <legend className="text-xl font-semibold">Address</legend>
        <div className="space-y-1 text-sm font-medium">
          <label htmlFor="invite-street">Street address</label>
          <AddressAutocomplete id="invite-street" name="street" className={inputClass} required maxLength={150}
            value={address.street} access="registration" disabled={busy}
            contextKey={JSON.stringify([address.city, address.state, address.postalCode])}
            onChange={event => setAddress({ ...address, street: event.target.value })}
            onAddressSelect={selected => setAddress(current => ({
              street: selected.street, addressLine2: selected.addressLine2 ?? current.addressLine2,
              city: selected.city, state: selected.state, postalCode: selected.postalCode,
            }))} />
        </div>
        <Field name="addressLine2" label="Apartment, suite, unit, etc. (optional)" required={false} maxLength={150} autoComplete="address-line2" value={address.addressLine2} onChange={event => setAddress({ ...address, addressLine2: event.target.value })} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field name="city" label="City" maxLength={100} autoComplete="address-level2" value={address.city} onChange={event => setAddress({ ...address, city: event.target.value })} />
          <label className="block text-sm font-medium">State
            <select name="state" autoComplete="address-level1" className={selectClass} required value={address.state} onChange={event => setAddress({ ...address, state: event.target.value })}>
              <option value="" disabled>Select state</option>
              {US_STATES.map(state => <option key={state.value} value={state.value}>{state.label}</option>)}
            </select>
          </label>
          <Field name="postalCode" label="ZIP code" autoComplete="postal-code" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} value={address.postalCode} onChange={event => setAddress({ ...address, postalCode: event.target.value })} />
        </div>
      </fieldset>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-4 text-xl font-semibold">Business details</legend>
        <Field name="companyName" label="Company name (optional)" required={false} autoComplete="organization" maxLength={150} />
        <Field name="estimatedMonthlySales" label="Estimated monthly sales (USD, optional)" required={false} type="number" min={0} max="999999999999.99" step="0.01" inputMode="decimal" />
        <Field name="yearsOfExperience" label="Years of experience" type="number" min={0} max={2147483647} step={1} inputMode="numeric" />
        <label className="block text-sm font-medium">Preferred language
          <select name="preferredLanguage" className={selectClass} required defaultValue="">
            <option value="" disabled>Select language</option>
            <option value="English">English</option>
            <option value="Spanish">Spanish</option>
          </select>
        </label>
      </fieldset>
      <section aria-labelledby="dealer-sms-heading" className="space-y-4 rounded-xl border border-white/15 p-4">
        <h3 id="dealer-sms-heading" className="font-semibold">SMS notifications</h3>
        {!smsSupported && <p className="text-sm text-white/70">{normalizedPhone
          ? "SMS notifications are not available for this phone number. You can still submit your application."
          : "Enter a valid phone number to check SMS availability."}</p>}
        {smsError ? <div className="space-y-2">
          <p role="alert" className="text-sm text-red-300">Could not load SMS options. You can still submit your application.</p>
          <button type="button" className="text-sm text-blue-300 underline" onClick={() => setSmsReload(value => value + 1)}>Retry SMS options</button>
        </div> : !smsProgram ? <p role="status" className="text-sm text-white/70">Loading SMS options...</p> : <>
          <fieldset key={normalizedPhone + smsProgram.dealerRegistration.version} disabled={busy || !smsSupported}
            aria-labelledby="dealer-sms-heading" aria-describedby="dealer-sms-disclosure" className="space-y-3">
            <label className="flex items-start gap-3 text-sm leading-relaxed">
              <input type="checkbox" name="serviceConsent" className="mt-1 h-4 w-4 shrink-0 accent-red-600" />
              <span>{smsProgram.dealerRegistration.serviceConsentText}</span>
            </label>
            <label className="flex items-start gap-3 text-sm leading-relaxed">
              <input type="checkbox" name="promotionsConsent" className="mt-1 h-4 w-4 shrink-0 accent-red-600" />
              <span>{smsProgram.dealerRegistration.promotionsConsentText}</span>
            </label>
          </fieldset>
          <div className="space-y-2 border-t border-white/10 pt-3 text-xs leading-relaxed text-white/70">
            <p id="dealer-sms-disclosure">{smsProgram.disclosure}</p>
            <p className="flex flex-wrap gap-x-4 gap-y-2">
              <Link href="/sms/terms" target="_blank" rel="noopener noreferrer" className="text-blue-300 underline">SMS Terms of Service</Link>
              <Link href="/sms/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-300 underline">SMS Privacy Policy</Link>
            </p>
          </div>
        </>}
      </section>
      <section aria-labelledby="dealer-terms-heading" className="space-y-3 rounded-xl border border-white/15 p-4">
        <h3 id="dealer-terms-heading" className="font-semibold">Terms and Conditions</h3>
        {termsError ? <div className="space-y-2">
          <p role="alert" className="text-sm text-red-300">Could not load the Terms and Conditions. Please try again.</p>
          <button type="button" className="text-sm text-blue-300 underline" onClick={() => setTermsReload(value => value + 1)}>Retry terms</button>
        </div> : terms === undefined ? <p role="status" className="text-sm text-white/70">Loading terms...</p>
          : terms ? <>
            <Link href={platformTermsPageUrl()} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-300 underline">Read terms</Link>
            <label className="flex items-start gap-3 text-sm leading-relaxed">
              <input type="checkbox" name="platformTermsAccepted" required disabled={busy} className="mt-1 h-4 w-4 shrink-0 accent-red-600"
                checked={acceptedTermsId === terms.id} onChange={event => setAcceptedTermsId(event.target.checked ? terms.id : null)} />
              <span>{terms.consentText}</span>
            </label>
          </> : <p className="text-sm text-white/70">Terms and Conditions have not been published yet.</p>}
      </section>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <Button type="submit" disabled={busy || !termsReady} className={buttonClass}>{busy ? "Submitting…" : "Submit application"}</Button>
    </form>
  );
}
