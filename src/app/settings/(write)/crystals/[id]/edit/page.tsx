import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { CrystalForm } from "../../new/crystal-form";
import { getCrystal } from "@/app/api/crystals.api";

export default async function EditCrystalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const crystalId = Number(id);

  if (Number.isNaN(crystalId)) notFound();

  const crystal = await getCrystal(crystalId);
  if (!crystal) notFound();

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-xl mx-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Edit Crystal</CardTitle>
            <CardDescription>Update the glass option.</CardDescription>
          </CardHeader>

          <CardContent>
            <CrystalForm crystal={crystal} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
