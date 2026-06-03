// src/app/settings/dimension-policies/[id]/edit/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getSystemsWithConfigs } from "@/app/api/systems.api";
import { getPolicy } from "@/app/api/dimension-policies.api";

import { PolicyForm } from "../../new/policy-form";
import { RulesEditor } from "../../rules-editor";

export default async function EditPolicyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const policyId = Number(id);

  const [systemsWithConfigs, policy] = await Promise.all([
    getSystemsWithConfigs(),
    getPolicy(policyId),
  ]);

  return (
    <div className="max-w-5xl mx-auto py-10 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Edit Policy #{policy.id}</CardTitle>
        </CardHeader>
        <CardContent>
          <PolicyForm
            initial={policy}
            systemsWithConfigs={systemsWithConfigs}
          />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Rules</h2>
        <RulesEditor idPolicy={policy.id} initialRows={policy.rules ?? []} />
      </section>
    </div>
  );
}
