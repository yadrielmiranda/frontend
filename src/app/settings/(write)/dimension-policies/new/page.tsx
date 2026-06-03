// src/app/settings/dimension-policies/new/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/navigation/back-link";

import { getSystemsWithConfigs } from "@/app/api/systems.api";
import { PolicyForm } from "./policy-form";

export default async function NewPolicyPage() {
  

  const systemsWithConfigs = await getSystemsWithConfigs();

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
          <PolicyForm systemsWithConfigs={systemsWithConfigs} />
        </CardContent>
      </Card>
    </div>
  );
}
