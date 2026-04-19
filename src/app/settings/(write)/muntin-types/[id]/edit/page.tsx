import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getMuntinType } from "@/app/api/muntin-types.api";
import { BackLink } from "@/components/navigation/back-link";
import { MuntinTypeForm } from "../../new/muntin-type-form";

export default async function EditMuntinTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const typeId = Number(id);

  if (Number.isNaN(typeId)) notFound();

  const typeItem = await getMuntinType(typeId);

  if (!typeItem) notFound();

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-lg mx-auto mb-4">
        <BackLink href="/settings/muntin-types" label="Back to Muntin Types" />
      </div>

      <div className="max-w-lg mx-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Edit Muntin Type</CardTitle>
            <CardDescription>Update the muntin type.</CardDescription>
          </CardHeader>

          <CardContent>
            <MuntinTypeForm typeItem={typeItem} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}