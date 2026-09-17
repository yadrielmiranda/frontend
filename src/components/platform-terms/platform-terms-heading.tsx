"use client";

import Link from 'next/link';
import { useCompanyBranding } from '@/contexts/CompanyBrandingContext';

export function PlatformTermsHeading() {
  const { companyName } = useCompanyBranding();
  return <header>
    <Link href="/" className="text-sm font-medium text-blue-600 underline-offset-4 hover:underline">{companyName}</Link>
    <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">Terms and Conditions</h1>
  </header>;
}
