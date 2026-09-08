import Link from 'next/link';
import { getSmsProgram } from '@/app/api/sms.api';
import { REGISTRATION_ENABLED, REGISTRATION_UNAVAILABLE_MESSAGE } from '@/lib/registration-availability';

export async function SmsProgramPage({ kind }: { kind: 'overview' | 'terms' | 'privacy' }) {
  const program = await getSmsProgram();
  const title = kind === 'terms' ? 'Messaging Terms' : kind === 'privacy' ? 'Messaging Privacy Policy' : 'SMS & email notifications';
  const sections = kind === 'privacy' ? program.privacy : program.terms;
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <Link href="/" className="text-sm font-medium text-blue-600 underline-offset-4 hover:underline">{program.companyName}</Link>
      <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
      {kind === 'overview' ? (
        <>
          <p className="mt-4 leading-relaxed text-slate-700">Receive service updates about your estimates, installation appointments, orders, payments, and account activity by SMS and email.</p>
          <section className="mt-7 space-y-4 rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold">When you create an account</h2>
            {!REGISTRATION_ENABLED && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
                {REGISTRATION_UNAVAILABLE_MESSAGE} You can still review the registration form and notification options.
              </p>
            )}
            <ol className="list-decimal space-y-2 pl-5 leading-relaxed text-slate-700">
              <li>Open Create Client Account and enter your phone number and email address.</li>
              <li>Review the messaging terms and select the required service notifications checkbox. Your account cannot be created without accepting service SMS and email.</li>
              <li>Choose whether to select the separate, optional promotions checkbox.</li>
              <li>{REGISTRATION_ENABLED ? 'Select Create Account to save your account and your choices.' : 'Once registration opens, select Create Account to save your account and your choices.'}</li>
            </ol>
            <div className="space-y-3 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-950">Service notifications</p>
              <p className="text-sm leading-relaxed text-slate-700">{program.registration.serviceConsentText}</p>
              <p className="text-sm font-medium text-slate-700">{program.registration.serviceRequirement}</p>
              <p className="border-t pt-3 text-sm font-medium text-slate-950">Promotions</p>
              <p className="text-sm leading-relaxed text-slate-700">{program.registration.promotionsConsentText}</p>
              <p className="text-sm text-slate-600">{program.registration.promotionsDisclosure}</p>
              <p className="text-sm leading-relaxed text-slate-600">{program.disclosure}</p>
              <p className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-blue-600">
                <Link href="/sms/terms" className="underline underline-offset-4">Messaging Terms</Link>
                <Link href="/sms/privacy" className="underline underline-offset-4">Messaging Privacy Policy</Link>
              </p>
            </div>
            <p className="text-sm text-slate-600">Both checkboxes start unchecked. Promotional consent is independent from the required service consent.</p>
            <Link href="/login/register" className="inline-flex rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800">View registration form</Link>
          </section>
          <section className="mt-6 space-y-3 rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold">Service SMS preferences</h2>
            <p className="text-sm leading-relaxed text-slate-700">Sign in to your account and open Profile. Under SMS notifications, review your saved phone number, select or clear the checkbox, and choose Save preference.</p>
            <p className="text-sm leading-relaxed text-slate-700">{program.consentText}</p>
            <p className="text-sm leading-relaxed text-slate-600">This preference controls service SMS only. You can turn off SMS in Profile at any time. Replying STOP also unsubscribes your number.</p>
            <Link href="/profile#sms-notifications" className="inline-flex text-sm font-medium text-blue-600 underline underline-offset-4">Manage SMS preferences</Link>
          </section>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">Effective {program.effectiveDate}</p>
          <div className="mt-8 space-y-7">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-semibold text-slate-950">{section.title}</h2>
                <p className="mt-2 leading-relaxed text-slate-700">{section.text}</p>
              </section>
            ))}
          </div>
        </>
      )}
      {(program.supportEmail || program.supportPhone) && (
        <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t pt-5 text-sm">
          {program.supportEmail && <a href={`mailto:${program.supportEmail}`} className="text-blue-600 underline underline-offset-4">{program.supportEmail}</a>}
          {program.supportPhone && <a href={`tel:${program.supportPhone.replace(/[^+\d]/g, '')}`} className="text-blue-600 underline underline-offset-4">{program.supportPhone}</a>}
        </div>
      )}
      <nav aria-label="Messaging information" className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t pt-5 text-sm text-blue-600">
        <Link href="/sms" className="hover:underline">SMS & email notifications</Link>
        <Link href="/sms/terms" className="hover:underline">Messaging Terms</Link>
        <Link href="/sms/privacy" className="hover:underline">Messaging Privacy Policy</Link>
      </nav>
    </div>
  );
}
