import type { Metadata } from 'next';
import { SmsProgramPage } from '@/components/sms/sms-program-page';

export const metadata: Metadata = { title: 'SMS Terms of Service' };
export const dynamic = 'force-dynamic';
export default function SmsTermsPage() { return <SmsProgramPage kind="terms" />; }
