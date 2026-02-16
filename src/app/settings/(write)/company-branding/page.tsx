// src/app/settings/(write)/company-branding/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { BrandingForm } from "@/components/branding/branding-form";
import { getCompanyBranding } from "@/app/api/brandings.api";

export default async function CompanyBrandingPage() {
  const branding = await getCompanyBranding(); // puede ser null

  return (
    <div className="container mx-auto py-10 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Company Branding</CardTitle>
          <CardDescription>
            This branding will be used by default in system reports and estimates.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <BrandingForm mode="company" branding={branding ?? undefined} />
        </CardContent>
      </Card>
    </div>
  );
}
