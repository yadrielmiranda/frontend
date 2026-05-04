import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { FcolorForm } from "../../new/fcolor-form";
import { getFColor } from "@/app/api/fcolors.api";

export default async function EditFrameColorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const colorId = Number(id);

  if (Number.isNaN(colorId)) notFound();

  const fcolor = await getFColor(colorId);
  if (!fcolor) notFound();

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-xl mx-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Edit Frame Color</CardTitle>
            <CardDescription>Update the frame color name and status.</CardDescription>
          </CardHeader>

          <CardContent>
            <FcolorForm fcolor={fcolor} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
