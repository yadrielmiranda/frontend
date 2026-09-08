import type { Metadata } from 'next';
import { SmsProgramPage } from '@/components/sms/sms-program-page';

export const metadata: Metadata = { title: 'SMS & email notifications' };
export const dynamic = 'force-dynamic';
export default function SmsPage() { return <SmsProgramPage kind="overview" />; }
