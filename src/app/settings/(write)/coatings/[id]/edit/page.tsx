import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { CoatingForm } from "../../new/coating-form";
import { getCoating } from "@/app/api/coatings.api";

export default async function EditCoatingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const coatingId = Number(id);

  // Validación simple
  if (Number.isNaN(coatingId)) notFound();

  const coating = await getCoating(coatingId);

  if (!coating) notFound();

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-xl mx-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Edit Coating</CardTitle>
            <CardDescription>Update the coating name.</CardDescription>
          </CardHeader>

          <CardContent>
            <CoatingForm coating={coating} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
