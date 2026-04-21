import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getPreparationOption } from "@/app/api/preparation-options.api";
import { PreparationOptionForm } from "../../new/preparation-option-form";
import { BackLink } from "@/components/navigation/back-link";

export default async function EditPreparationOptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const preparationOptionId = Number(id);

  if (Number.isNaN(preparationOptionId)) notFound();

  const preparationOption = await getPreparationOption(preparationOptionId);
  if (!preparationOption) notFound();

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-lg mx-auto mb-4">
        <BackLink
          href="/settings/preparation-options"
          label="Back to Preparation Options"
        />
      </div>

      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Edit Preparation Option</CardTitle>
          <CardDescription>Update the preparation option.</CardDescription>
        </CardHeader>

        <CardContent>
          <PreparationOptionForm preparationOption={preparationOption} />
        </CardContent>
      </Card>
    </div>
  );
}