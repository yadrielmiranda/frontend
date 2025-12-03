import { getSystemsWithConfigs } from "@/app/api/systems.api";
import { getCrystals } from "@/app/api/crystals.api";
import PolicyForm from "./policy-form";

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
    <div className="max-w-4xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">New Dimension Policy</h1>
      <PolicyForm
        systemsWithConfigs={systemsWithConfigs}
        crystals={crystalOptions}
      />
    </div>
  );
}
