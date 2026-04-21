import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getSillOption } from "@/app/api/sill-options.api";
import { SillOptionForm } from "../../new/sill-option-form";
import { BackLink } from "@/components/navigation/back-link";

export default async function EditSillOptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sillOptionId = Number(id);

  if (Number.isNaN(sillOptionId)) notFound();

  const sillOption = await getSillOption(sillOptionId);
  if (!sillOption) notFound();

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-lg mx-auto mb-4">
        <BackLink href="/settings/sill-options" label="Back to Sill Options" />
      </div>

      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Edit Sill Option</CardTitle>
          <CardDescription>Update the sill option.</CardDescription>
        </CardHeader>

        <CardContent>
          <SillOptionForm sillOption={sillOption} />
        </CardContent>
      </Card>
    </div>
  );
}