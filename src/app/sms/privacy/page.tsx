import type { Metadata } from 'next';
import { SmsProgramPage } from '@/components/sms/sms-program-page';

export const metadata: Metadata = { title: 'SMS Privacy Policy' };
export const dynamic = 'force-dynamic';
export default function SmsPrivacyPage() { return <SmsProgramPage kind="privacy" />; }
