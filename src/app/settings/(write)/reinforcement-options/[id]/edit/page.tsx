import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getReinforcementOption } from "@/app/api/reinforcement-options.api";
import { ReinforcementOptionForm } from "../../new/reinforcement-option-form";
import { BackLink } from "@/components/navigation/back-link";

export default async function EditReinforcementOptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const reinforcementOptionId = Number(id);

  if (Number.isNaN(reinforcementOptionId)) notFound();

  const reinforcementOption = await getReinforcementOption(
    reinforcementOptionId
  );
  if (!reinforcementOption) notFound();

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-lg mx-auto mb-4">
        <BackLink
          href="/settings/reinforcement-options"
          label="Back to Reinforcement Options"
        />
      </div>

      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Edit Reinforcement Option</CardTitle>
          <CardDescription>Update the reinforcement option.</CardDescription>
        </CardHeader>

        <CardContent>
          <ReinforcementOptionForm
            reinforcementOption={reinforcementOption}
          />
        </CardContent>
      </Card>
    </div>
  );
}