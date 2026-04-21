import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getActiveOption } from "@/app/api/active-options.api";
import { ActiveOptionForm } from "../../new/active-option-form";
import { BackLink } from "@/components/navigation/back-link";

export default async function EditActiveOptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const activeOptionId = Number(id);

  if (Number.isNaN(activeOptionId)) notFound();

  const activeOption = await getActiveOption(activeOptionId);
  if (!activeOption) notFound();

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-lg mx-auto mb-4">
        <BackLink
          href="/settings/active-options"
          label="Back to Active Options"
        />
      </div>

      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Edit Active Option</CardTitle>
          <CardDescription>Update the active option.</CardDescription>
        </CardHeader>

        <CardContent>
          <ActiveOptionForm activeOption={activeOption} />
        </CardContent>
      </Card>
    </div>
  );
}