import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { TintForm } from "../../new/tint-form";
import { getTint } from "@/app/api/tints.api";

export default async function EditTintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tintId = Number(id);

  if (Number.isNaN(tintId)) notFound();

  const tint = await getTint(tintId);
  if (!tint) notFound();

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-xl mx-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Edit Tint</CardTitle>
            <CardDescription>Update the tint color.</CardDescription>
          </CardHeader>

          <CardContent>
            <TintForm tint={tint} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
