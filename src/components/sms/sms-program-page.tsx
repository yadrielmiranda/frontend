import Link from 'next/link';
import { getSmsProgram } from '@/app/api/sms.api';

export async function SmsProgramPage({ kind }: { kind: 'overview' | 'terms' | 'privacy' }) {
  const program = await getSmsProgram();
  const title = kind === 'terms' ? 'SMS Terms' : kind === 'privacy' ? 'SMS Privacy Policy' : 'SMS notifications';
  const sections = kind === 'privacy' ? program.privacy : program.terms;
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <Link href="/" className="text-sm font-medium text-blue-600 underline-offset-4 hover:underline">{program.companyName}</Link>
      <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
      {kind === 'overview' ? (
        <>
          <p className="mt-4 leading-relaxed text-slate-700">Choose optional service SMS about estimates, installation appointments, orders, payments, and account activity, and optional promotional SMS.</p>
          <section className="mt-7 space-y-4 rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold">When you create an account</h2>
            <ol className="list-decimal space-y-2 pl-5 leading-relaxed text-slate-700">
              <li>When account registration is available, open Create Client Account and complete your account information.</li>
              <li>Review the SMS terms and choose whether to select the optional service SMS checkbox.</li>
              <li>Choose whether to select the separate, optional promotions checkbox.</li>
              <li>Select Create Account to save your account and your choices.</li>
            </ol>
            <div className="space-y-3 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-950">Service SMS</p>
              <p className="text-sm leading-relaxed text-slate-700">{program.registration.serviceConsentText}</p>
              <p className="text-sm font-medium text-slate-700">{program.registration.serviceRequirement}</p>
              <p className="border-t pt-3 text-sm font-medium text-slate-950">Promotional SMS</p>
              <p className="text-sm leading-relaxed text-slate-700">{program.registration.promotionsConsentText}</p>
              <p className="text-sm text-slate-600">{program.registration.promotionsDisclosure}</p>
              <p className="text-sm leading-relaxed text-slate-600">{program.disclosure}</p>
              <p className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-blue-600">
                <Link href="/sms/terms" className="underline underline-offset-4">SMS Terms</Link>
                <Link href="/sms/privacy" className="underline underline-offset-4">SMS Privacy Policy</Link>
              </p>
            </div>
            <p className="text-sm text-slate-600">Both checkboxes start unchecked and are independent. You may select either, both, or neither. SMS consent is not required to create an account, use the service, or make a purchase.</p>
          </section>
          <section className="mt-6 space-y-3 rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold">SMS preferences</h2>
            <p className="text-sm leading-relaxed text-slate-700">Sign in to your account and open Profile. Under SMS notifications, review your saved phone number, select or clear each checkbox independently, and choose Save preferences.</p>
            <p className="text-sm leading-relaxed text-slate-700">{program.consentText}</p>
            <p className="text-sm leading-relaxed text-slate-600">You can turn off service SMS, promotional SMS, or both in Profile at any time. Replying STOP unsubscribes your number from all SMS in this program.</p>
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
      <nav aria-label="SMS information" className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t pt-5 text-sm text-blue-600">
        <Link href="/sms" className="hover:underline">SMS notifications</Link>
        <Link href="/sms/terms" className="hover:underline">SMS Terms</Link>
        <Link href="/sms/privacy" className="hover:underline">SMS Privacy Policy</Link>
      </nav>
    </div>
  );
}
