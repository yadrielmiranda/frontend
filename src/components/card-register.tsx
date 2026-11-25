"use client";

import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlatformTermsDocument } from "@/components/platform-terms/platform-terms-document";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InternationalPhoneInput } from "@/components/international-phone-input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff, Loader2, UserPlus } from "lucide-react";

import { loginUser, registerUser, type LoginData } from "@/app/api/auth/me/auth.api";
import { isApiError } from "@/app/api/_base";
import { useRegistrationMeasurement } from "@/lib/registration-measurement";
import { hasRegistrationPixel, sendCompletedRegistration, sendRegistrationPageView } from "@/lib/registration-pixel";
import { useAuth } from "@/contexts/AuthContext";
import { navigateAfterSessionChange } from "@/lib/auth-session";
import { resolveReferral } from "@/app/api/referrals.api";
import { getSmsProgram, type SmsProgram } from "@/app/api/sms.api";
import { getCurrentPlatformTerms, type PlatformTermsVersion } from "@/app/api/platform-terms.api";
import { isValidEmail, normalizeEmail } from "@/lib/validators-email";
import { isValidPhone, normalizePhoneToE164, isSmsPhoneSupported } from "@/lib/validators-phone";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
  USERNAME_VALIDATION_MESSAGE,
  suggestedClientUsername,
} from "@/lib/username-policy";

// El registro público queda habilitado si es true. Si es false, se oculta el formulario y se muestra un mensaje de que el registro no está disponible.
const REGISTRATION_ENABLED = true;

const registerSchema = z.object({
  firstName: z.string().trim().min(1, {
    message: "First name is required.",
  }),

  lastName: z.string().trim().min(1, {
    message: "Last name is required.",
  }),

  email: z
    .string()
    .transform((v) => normalizeEmail(v) ?? "")
    .refine((v) => isValidEmail(v), {
      message: "Please enter a valid email address.",
    }),

  phone: z
    .string()
    .transform((v) => normalizePhoneToE164(v) ?? "")
    .refine((v) => isValidPhone(v), {
      message: "Please enter a valid phone number.",
    }),

  username: z
    .string()
    .trim()
    .regex(USERNAME_PATTERN, { message: USERNAME_VALIDATION_MESSAGE })
    .optional(),

  password: z.string().min(8, {
    message: "Password must be at least 8 characters long.",
  }),
  serviceConsent: z.boolean(),
  promotionsConsent: z.boolean(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function CardRegister({ referralCode }: { referralCode?: string } = {}) {
  const router = useRouter();
  const [referral, setReferral] = useState<{ code: string } | null>(null);
  const [referralLoading, setReferralLoading] = useState(Boolean(referralCode));
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referralRetry, setReferralRetry] = useState(0);
  const registrationEnabled = REGISTRATION_ENABLED && (!referralCode || Boolean(referral && referral.code === referralCode));
  const measurement = useRegistrationMeasurement(registrationEnabled && !referralCode);
  const [showPassword, setShowPassword] = useState(false);
  const [chooseUsername, setChooseUsername] = useState(false);
  const { isAuthenticated, isLoading: sessionLoading } = useAuth();
  const requestPending = useRef(false);
  const [createdLogin, setCreatedLogin] = useState<LoginData | null>(null);
  const [entryFailed, setEntryFailed] = useState(false);
  const pixelEligible = registrationEnabled && !referralCode && !sessionLoading && !isAuthenticated;
  useEffect(() => {
    if (pixelEligible) sendRegistrationPageView();
  }, [pixelEligible]);
  const [consentProgram, setConsentProgram] = useState<SmsProgram | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [consentReload, setConsentReload] = useState(0);
  const [platformTerms, setPlatformTerms] = useState<PlatformTermsVersion | null>(null);
  const [platformTermsLoaded, setPlatformTermsLoaded] = useState(false);
  const [platformTermsError, setPlatformTermsError] = useState<string | null>(null);
  const [platformTermsAccepted, setPlatformTermsAccepted] = useState<number | null>(null);
  const [platformTermsReload, setPlatformTermsReload] = useState(0);

  useEffect(() => {
    let canceled = false;
    setReferral(null);
    setReferralError(null);
    if (!referralCode) { setReferralLoading(false); return; }
    setReferralLoading(true);
    if (!/^[A-Za-z0-9_-]{20,40}$/.test(referralCode)) {
      setReferralError("This registration link is invalid. Please request a new link.");
      setReferralLoading(false);
      return;
    }
    resolveReferral(referralCode).then(result => {
      if (!canceled && result.valid) setReferral({ code: referralCode });
    }).catch(() => {
      if (!canceled) setReferralError("This registration link could not be verified. Try again or request a new link.");
    }).finally(() => { if (!canceled) setReferralLoading(false); });
    return () => { canceled = true; };
  }, [referralCode, referralRetry]);

  useEffect(() => {
    let cancelled = false;
    setPlatformTermsLoaded(false);
    setPlatformTermsAccepted(null);
    setPlatformTermsError(null);
    getCurrentPlatformTerms().then(terms => {
      if (!cancelled) { setPlatformTerms(terms); setPlatformTermsLoaded(true); }
    }).catch(() => {
      if (!cancelled) setPlatformTermsError('Could not load the Terms and Conditions. Please try again.');
    });
    return () => { cancelled = true; };
  }, [platformTermsReload]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    unregister,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      serviceConsent: false,
      promotionsConsent: false,
    },
  });

  const phone = useWatch({ control, name: "phone" });
  const firstName = useWatch({ control, name: "firstName" });
  const lastName = useWatch({ control, name: "lastName" });
  const suggestedUsername = firstName?.trim() && lastName?.trim()
    ? suggestedClientUsername(firstName, lastName)
    : "";
  const smsSupported = isSmsPhoneSupported(phone);
  const internationalSmsUnavailable = isValidPhone(phone) && !smsSupported;

  useEffect(() => {
    if (!smsSupported) {
      setValue("serviceConsent", false);
      setValue("promotionsConsent", false);
    }
  }, [smsSupported, setValue]);

  useEffect(() => {
    let cancelled = false;
    setConsentProgram(null);
    setConsentError(null);
    // Un cambio de condiciones requiere una nueva selección expresa.
    setValue("serviceConsent", false);
    setValue("promotionsConsent", false);
    getSmsProgram().then((program) => {
      if (!program.registration || !program.version) throw new Error("Messaging terms are unavailable.");
      if (!cancelled) setConsentProgram(program);
    }).catch(() => {
      if (!cancelled) setConsentError("Could not load the messaging terms. Please try again.");
    });
    return () => { cancelled = true; };
  }, [consentReload, setValue]);

  async function openFirstEstimate(credentials: LoginData) {
    if (requestPending.current) return;
    requestPending.current = true;
    setEntryFailed(false);
    try {
      await loginUser(credentials);
    } catch {
      requestPending.current = false;
      setEntryFailed(true);
      return;
    }
    navigateAfterSessionChange("/estimates/new?welcome=1");
  }

  const handleRegister = async (data: RegisterFormData) => {
    const serviceConsent = isSmsPhoneSupported(data.phone) && data.serviceConsent;
    const promotionsConsent = isSmsPhoneSupported(data.phone) && data.promotionsConsent;
    const wantsSms = serviceConsent || promotionsConsent;
    if (sessionLoading || requestPending.current || createdLogin || !registrationEnabled || (wantsSms && !consentProgram)) return;
    if (!platformTermsLoaded || (platformTerms && platformTermsAccepted !== platformTerms.id)) return;
    requestPending.current = true;
    try {
      await registerUser({ ...data, serviceConsent, promotionsConsent, ...(consentProgram ? { consentVersion: consentProgram.version } : {}),
        ...(referral ? { referralCode: referral.code } : {}),
        ...(platformTerms ? { platformTermsAccepted: true, platformTermsVersionId: platformTerms.id } : {}),
      }, measurement.header());
    } catch (err) {
      requestPending.current = false;
      const payload = isApiError(err) ? err.data : null;
      const code = payload && typeof payload === "object" && "code" in payload ? payload.code : undefined;
      const conflictFields = { USERNAME_TAKEN: "username", EMAIL_TAKEN: "email", PHONE_TAKEN: "phone" } as const;
      const conflictField = typeof code === "string" && Object.hasOwn(conflictFields, code)
        ? conflictFields[code as keyof typeof conflictFields] : undefined;
      if (conflictField && err instanceof Error) {
        setError(conflictField, { type: "server", message: err.message }, { shouldFocus: true });
        return;
      }
      if (code === 'PLATFORM_TERMS_CHANGED' || code === 'PLATFORM_TERMS_REQUIRED') {
        setPlatformTermsAccepted(null);
        setPlatformTermsReload(value => value + 1);
      }
      if (code === "CONSENT_VERSION_CHANGED") {
        setConsentProgram(null);
        setValue("serviceConsent", false);
        setValue("promotionsConsent", false);
        setConsentReload((value) => value + 1);
      }
      toast.error("Registration failed", {
        description:
          err instanceof Error ? err.message : "Please review your information and try again.",
      });
      return;
    }

    if (pixelEligible) await sendCompletedRegistration().catch(() => false);
    if (isAuthenticated) {
      toast.success("Client account created.");
      handleBackToSignIn();
      return;
    }
    const credentials = { identifier: data.email, password: data.password };
    setCreatedLogin(credentials);
    requestPending.current = false;
    await openFirstEstimate(credentials);
  };

  const handleBackToSignIn = () => {
    if (hasRegistrationPixel()) window.location.assign("/");
    else router.push("/");
  };

  const RequiredMark = () => <span className="ml-0.5 text-red-500">*</span>;

  const labelClass = "text-xs font-medium text-white";
  const inputClass =
    "h-11 border-white/15 bg-black/35 text-white placeholder:text-white/35 focus-visible:ring-red-600";
  const errorClass = "text-xs text-red-400";

  if (createdLogin) {
    return (
      <Card className="w-full max-w-2xl border-white/15 bg-black/45 text-white">
        <CardHeader aria-live="polite">
          <CardTitle>Your account is ready</CardTitle>
          <CardDescription className="text-white/75">
            {entryFailed
              ? "We couldn’t sign you in automatically. Try again to open your first estimate."
              : "Opening your first estimate…"}
          </CardDescription>
        </CardHeader>
        {entryFailed && (
          <CardFooter className="flex-col gap-3">
            <Button type="button" className="w-full bg-red-600 text-white hover:bg-red-700"
              onClick={() => void openFirstEstimate(createdLogin)}>
              Continue to my first estimate
            </Button>
            <a href="/login?firstEstimate=1" className="text-sm underline">Sign in manually</a>
          </CardFooter>
        )}
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl rounded-3xl border border-red-600/70 bg-black/45 text-white shadow-[0_0_45px_rgba(220,38,38,0.12)] backdrop-blur-xl">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-semibold text-white">
          Create Client Account
        </CardTitle>

        <CardDescription className="text-sm text-white/45">
          Client account details and notification preferences.
        </CardDescription>
        {referralLoading && <p role="status" className="text-sm text-white/70">Checking your link…</p>}
        {referralError && <div role="alert" className="space-y-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"><p>{referralError}</p><button type="button" className="underline" onClick={() => setReferralRetry(value => value + 1)}>Try again</button></div>}
      </CardHeader>

      <form onChangeCapture={() => measurement.record("started")} onSubmit={(event) => {
        measurement.record("submitted");
        return handleSubmit(handleRegister, () => measurement.record("invalid"))(event);
      }}>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName" className={labelClass}>
              First Name
              <RequiredMark />
            </Label>

            <Input
              id="firstName"
              autoComplete="given-name"
              maxLength={100}
              placeholder="Enter your first name"
              className={inputClass}
              {...register("firstName")}
            />

            {errors.firstName && (
              <p className={errorClass}>{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName" className={labelClass}>
              Last Name
              <RequiredMark />
            </Label>

            <Input
              id="lastName"
              autoComplete="family-name"
              maxLength={100}
              placeholder="Enter your last name"
              className={inputClass}
              {...register("lastName")}
            />

            {errors.lastName && (
              <p className={errorClass}>{errors.lastName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className={labelClass}>
              Email
              <RequiredMark />
            </Label>

            <Input
              id="email"
              type="email"
              maxLength={150}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              autoComplete="email"
              placeholder="name@example.com"
              className={inputClass}
              {...register("email")}
            />

            {errors.email && (
              <p id="email-error" role="alert" className={errorClass}>{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className={labelClass}>
              Phone
              <RequiredMark />
            </Label>

            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <InternationalPhoneInput
                  {...field}
                  id="phone"
                  autoComplete="tel"
                  placeholder="Enter your phone number"
                  className={inputClass}
                  appearance="dark"
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? "phone-sms-choice phone-error" : "phone-sms-choice"}
                />
              )}
            />

            <p id="phone-sms-choice" className="text-xs leading-relaxed text-white/60">
              Providing a phone number does not enroll you in SMS.
            </p>
            {errors.phone && (
              <p id="phone-error" role="alert" className={errorClass}>{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            {chooseUsername ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-x-4">
                  <Label htmlFor="username" className={labelClass}>Username</Label>
                  <button
                    type="button"
                    className="text-xs text-blue-300 underline underline-offset-2"
                    disabled={isSubmitting}
                    onClick={() => { unregister("username"); setChooseUsername(false); }}
                  >
                    Use automatic username
                  </button>
                </div>
                <Input
                  id="username"
                  autoFocus
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  minLength={USERNAME_MIN_LENGTH}
                  maxLength={USERNAME_MAX_LENGTH}
                  placeholder="Choose your username"
                  aria-invalid={Boolean(errors.username)}
                  aria-describedby={errors.username ? "username-error" : undefined}
                  className={inputClass}
                  {...register("username")}
                />
                {errors.username && <p id="username-error" role="alert" className={errorClass}>{errors.username.message}</p>}
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="text-white/75">
                  Suggested username{suggestedUsername ? <> · <strong className="break-all text-white">{suggestedUsername}</strong></> : " based on your name"}
                </span>
                <button
                  type="button"
                  disabled={isSubmitting}
                  className="min-h-9 text-blue-300 underline underline-offset-2"
                  onClick={() => { setValue("username", suggestedUsername); setChooseUsername(true); }}
                >
                  Change
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="password" className={labelClass}>
              Password
              <RequiredMark />
            </Label>

            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                aria-describedby="password-hint"
                placeholder="Create a password"
                className={`${inputClass} pr-10`}
                {...register("password")}
              />

              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/45 hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <p id="password-hint" className="text-xs text-white/65">Use at least 8 characters.</p>
            {errors.password && (
              <p className={errorClass}>{errors.password.message}</p>
            )}
          </div>
          <fieldset className="min-w-0 space-y-2 rounded-xl border border-white/15 px-3 pb-3 md:col-span-2">
            <legend className="px-1 text-sm font-semibold">SMS notifications</legend>
            {internationalSmsUnavailable && <p role="status" className="text-xs text-white/70">SMS notifications are not available for this phone number. You can still create your account.</p>}
            {consentError ? (
              <div className="text-xs text-white/75">
                <span role="status">SMS options could not load. You can still register. </span>
                <button type="button" onClick={() => setConsentReload(value => value + 1)} className="text-blue-300 underline">Retry</button>
              </div>
            ) : !consentProgram ? (
              <p role="status" className="text-xs text-white/70">Loading SMS options…</p>
            ) : (
              <>
                <label className="flex min-h-8 items-center gap-2 text-sm">
                  <input id="service-consent" type="checkbox" disabled={isSubmitting || !smsSupported} aria-describedby="service-consent-text registration-disclosure" className="size-4 shrink-0 accent-emerald-500" {...register("serviceConsent")} />
                  Service notifications (optional)
                </label>
                <label className="flex min-h-8 items-center gap-2 text-sm">
                  <input id="promotions-consent" type="checkbox" disabled={isSubmitting || !smsSupported} aria-describedby="promotions-consent-text registration-disclosure" className="size-4 shrink-0 accent-emerald-500" {...register("promotionsConsent")} />
                  Promotional messages (optional)
                </label>
                <p id="registration-disclosure" className="text-xs leading-relaxed text-white/75">
                  Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe from all SMS or HELP for help.
                </p>
                <details className="text-xs leading-relaxed text-white/75">
                  <summary className="cursor-pointer text-blue-300 underline">SMS consent details</summary>
                  <p id="service-consent-text" className="mt-1">{consentProgram.registration.serviceConsentText}</p>
                  <p id="promotions-consent-text" className="mt-1">{consentProgram.registration.promotionsConsentText}</p>
                  <p className="mt-1">{consentProgram.disclosure}</p>
                </details>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-blue-300 underline">
                  <Link href="/sms/terms" target="_blank" rel="noopener noreferrer">SMS Terms of Service</Link>
                  <Link href="/sms/privacy" target="_blank" rel="noopener noreferrer">SMS Privacy Policy</Link>
                </div>
              </>
            )}
          </fieldset>
          <fieldset className="min-w-0 rounded-xl border border-white/15 px-3 pb-3 md:col-span-2">
            <legend className="px-1 text-sm font-semibold">Terms and Conditions</legend>
            {platformTermsError ? (
              <p role="alert" className={errorClass}>
                {platformTermsError} <button type="button" className="text-blue-300 underline" onClick={() => setPlatformTermsReload(value => value + 1)}>Try again</button>
              </p>
            ) : !platformTermsLoaded ? (
              <p role="status" className="text-xs text-white/70">Loading terms…</p>
            ) : platformTerms ? (
              <>
                <label className="flex items-start gap-2 py-1.5 text-sm">
                  <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-emerald-500" disabled={isSubmitting}
                    checked={platformTermsAccepted === platformTerms.id}
                    onChange={event => setPlatformTermsAccepted(event.target.checked ? platformTerms.id : null)} />
                  {platformTerms.consentText}
                </label>
                <Dialog>
                  <DialogTrigger asChild><button type="button" className="ml-6 text-xs text-blue-300 underline">Read Terms and Conditions</button></DialogTrigger>
                  <DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-2xl" aria-describedby={undefined}>
                    <DialogTitle>Terms and Conditions</DialogTitle>
                    <div className="min-h-0 overflow-y-auto"><PlatformTermsDocument version={platformTerms} /></div>
                    <DialogClose asChild><Button type="button" variant="outline">Back to registration</Button></DialogClose>
                  </DialogContent>
                </Dialog>
              </>
            ) : <p className="text-xs text-white/70">Terms and Conditions have not been published yet.</p>}
          </fieldset>
        </CardContent>

        <CardFooter className="flex-col gap-3 pt-5">
          {!REGISTRATION_ENABLED && (
            <p id="registration-availability" role="status" className="w-full rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm leading-relaxed text-amber-100">
              Account registration is not available yet. Please check back later.
            </p>
          )}
          <Button
            type="submit"
            className="h-11 w-full rounded-xl bg-red-600 font-semibold text-white shadow-lg shadow-red-950/40 hover:bg-red-700"
            disabled={sessionLoading || !registrationEnabled || isSubmitting || !platformTermsLoaded || Boolean(platformTerms && platformTermsAccepted !== platformTerms.id)}
            aria-describedby={!REGISTRATION_ENABLED ? "registration-availability" : undefined}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            {isSubmitting ? "Creating account..." : "Create Account"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full border-white/15 bg-black/20 text-white hover:bg-white/10 hover:text-white"
            onClick={handleBackToSignIn}
            disabled={isSubmitting}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
