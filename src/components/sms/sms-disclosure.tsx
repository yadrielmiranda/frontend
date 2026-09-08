import Link from 'next/link';
import type { SmsProgram } from '@/app/api/sms.api';

export function SmsDisclosure({ program }: { program: SmsProgram }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
      <p id="sms-disclosure">{program.disclosure}</p>
      <p className="flex flex-wrap gap-x-4 gap-y-1">
        <Link href="/sms/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline underline-offset-4 hover:text-blue-800">Messaging Terms</Link>
        <Link href="/sms/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline underline-offset-4 hover:text-blue-800">Messaging Privacy Policy</Link>
      </p>
    </div>
  );
}
