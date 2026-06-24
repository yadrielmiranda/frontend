// src/app/settings/dimension-policies/[id]/edit/page.tsx
import { FormPageShell } from "@/components/layout/form-page-shell";

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
    <FormPageShell
      backHref="/settings/dimension-policies"
      backLabel="Back to Dimension Policies"
      title={`Edit Policy #${policy.id}`}
      description="Update the selected System, Config, Crystal, Reinforcement, rounding, and rules."
      maxWidth="max-w-5xl"
    >
      <div className="space-y-8">
        <PolicyForm initial={policy} systemsWithConfigs={systemsWithConfigs} />

        <section className="space-y-3 border-t pt-6">
          <h2 className="text-xl font-semibold">Rules</h2>
          <RulesEditor idPolicy={policy.id} initialRows={policy.rules ?? []} />
        </section>
      </div>
    </FormPageShell>
  );
}
