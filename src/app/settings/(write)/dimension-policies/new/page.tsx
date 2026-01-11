// src/app/settings/dimension-policies/new/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/navigation/back-link";

import { getSystemsWithConfigs } from "@/app/api/systems.api";
import { getCrystals } from "@/app/api/crystals.api";
import { PolicyForm } from "./policy-form";

export default async function NewPolicyPage() {
  const [systemsWithConfigs, crystals] = await Promise.all([
    getSystemsWithConfigs(),
    getCrystals(),
  ]);

  const crystalOptions = crystals.map((c) => ({
    value: c.id,
    label: c.glass,
  }));

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-4xl mx-auto mb-4">
        <BackLink
          href="/settings/dimension-policies"
          label="Back to Dimension Policies"
        />
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>New Dimension Policy</CardTitle>
          <CardDescription>
            Select System/Config/Crystal and define rounding + basis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PolicyForm systemsWithConfigs={systemsWithConfigs} crystals={crystalOptions} />
        </CardContent>
      </Card>
    </div>
  );
}
