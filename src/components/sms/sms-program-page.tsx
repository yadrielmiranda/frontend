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
          <p className="mt-4 leading-relaxed text-slate-700">Receive text updates about your estimates, installation appointments, orders, payments, and account activity.</p>
          <section className="mt-7 space-y-4 rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold">How to subscribe</h2>
            <ol className="list-decimal space-y-2 pl-5 leading-relaxed text-slate-700">
              <li>Sign in to your account and open Profile.</li>
              <li>Under SMS notifications, check your saved phone number.</li>
              <li>Select the optional consent checkbox and choose Save preference.</li>
            </ol>
            <div className="space-y-3 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-950">Consent shown in your profile</p>
              <p className="text-sm leading-relaxed text-slate-700">{program.consentText}</p>
              <p className="text-sm leading-relaxed text-slate-600">{program.disclosure}</p>
              <p className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-blue-600">
                <Link href="/sms/terms" className="underline underline-offset-4">SMS Terms</Link>
                <Link href="/sms/privacy" className="underline underline-offset-4">SMS Privacy Policy</Link>
              </p>
            </div>
            <Link href="/profile#sms-notifications" className="inline-flex rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800">Manage SMS preferences</Link>
          </section>
          <p className="mt-5 text-sm leading-relaxed text-slate-600">The consent checkbox is optional and unchecked for users who have not subscribed. You can turn off SMS in Profile at any time. Replying STOP also unsubscribes your number.</p>
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
