import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSystemsWithConfigs } from "@/app/api/systems.api";
import { getCrystals } from "@/app/api/crystals.api";
import { getPolicy } from "@/app/api/dimension-policies.api";
import PolicyForm from "../../new/policy-form";
import RulesEditor from "@/app/settings/dimension-policies/rules-editor";


export default async function EditPolicyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const policyId = Number(id);

  const [systemsWithConfigs, crystals, policy] = await Promise.all([
    getSystemsWithConfigs(),
    getCrystals(),
    getPolicy(policyId),
  ]);

  const crystalOptions = crystals.map((c) => ({
    value: c.id,
    label: c.glass,
  }));

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
            crystals={crystalOptions}
          />
        </CardContent>
      </Card>

      <section>
        <h2 className="text-xl font-semibold mb-3">Rules</h2>
        <RulesEditor
          idPolicy={policy.id}
          initialRows={policy.rules ?? []}   
        />
      </section>
    </div>
  );
}
