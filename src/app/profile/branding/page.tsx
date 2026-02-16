// src/app/profile/branding/page.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/session";
import { notFound } from "next/navigation";

import { BrandingForm } from "@/components/branding/branding-form";
import { getDealerBranding } from "@/app/api/brandings.api";
import { isDealerRole } from "@/lib/rbac";

export default async function DealerBrandingPage() {
  const user = await getCurrentUser();
  if (!user) notFound();

  const role = user?.role?.name ?? null;
  // Si tiene sesión pero no es dealer, fuera
  if (!isDealerRole(role)) notFound();

  // Trae el branding del dealer (puede ser null)
  const branding = await getDealerBranding();

  return (
    <div className="container mx-auto py-10 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>My Branding</CardTitle>
          <CardDescription>
            This information will appear on estimates and reports sent to your
            customers.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <BrandingForm mode="dealer" branding={branding ?? undefined} />
        </CardContent>
      </Card>
    </div>
  );
}
